import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { MemoryDrivenInvoiceIntelligence } from '../index';
import { Invoice, HumanFeedback, ProcessingResult } from '../types';

export class InvoiceIntelligenceAPI {
  private app: express.Application;
  private intelligence: MemoryDrivenInvoiceIntelligence;
  private port: number;

  constructor(port: number = 3000, dbPath?: string) {
    this.app = express();
    this.port = port;
    this.intelligence = new MemoryDrivenInvoiceIntelligence(dbPath);
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // Process invoice
    this.app.post('/api/invoices/process', async (req, res) => {
      try {
        const invoice: Invoice = req.body;
        
        // Validate invoice structure
        if (!this.validateInvoice(invoice)) {
          return res.status(400).json({
            error: 'Invalid invoice structure',
            message: 'Invoice must contain id, vendor, rawText, extractedData, and metadata'
          });
        }

        const result: ProcessingResult = await this.intelligence.processInvoice(invoice);
        
        res.json({
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Invoice processing error:', error);
        res.status(500).json({
          error: 'Processing failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Submit human feedback
    this.app.post('/api/feedback', async (req, res) => {
      try {
        const feedback: HumanFeedback = req.body;
        
        if (!this.validateFeedback(feedback)) {
          return res.status(400).json({
            error: 'Invalid feedback structure',
            message: 'Feedback must contain invoiceId, corrections, approved, and timestamp'
          });
        }

        await this.intelligence.provideFeedback(feedback);
        
        res.json({
          success: true,
          message: 'Feedback processed successfully',
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Feedback processing error:', error);
        res.status(500).json({
          error: 'Feedback processing failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get system metrics
    this.app.get('/api/metrics', async (req, res) => {
      try {
        // In a real system, this would query actual metrics from the database
        const metrics = {
          totalInvoicesProcessed: 0,
          automationRate: 0,
          averageConfidence: 0,
          memoryCount: 0,
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        };

        res.json({
          success: true,
          data: metrics,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Metrics error:', error);
        res.status(500).json({
          error: 'Failed to retrieve metrics',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Batch processing endpoint
    this.app.post('/api/invoices/batch', async (req, res) => {
      try {
        const invoices: Invoice[] = req.body.invoices;
        
        if (!Array.isArray(invoices) || invoices.length === 0) {
          return res.status(400).json({
            error: 'Invalid batch request',
            message: 'Request must contain an array of invoices'
          });
        }

        if (invoices.length > 50) {
          return res.status(400).json({
            error: 'Batch too large',
            message: 'Maximum 50 invoices per batch'
          });
        }

        const results: ProcessingResult[] = [];
        const errors: any[] = [];

        for (let i = 0; i < invoices.length; i++) {
          const invoice = invoices[i];
          try {
            if (this.validateInvoice(invoice)) {
              const result = await this.intelligence.processInvoice(invoice);
              results.push(result);
            } else {
              errors.push({
                invoiceId: (invoice as any)?.id || `invoice_${i}`,
                error: 'Invalid invoice structure'
              });
            }
          } catch (error) {
            errors.push({
              invoiceId: (invoice as any)?.id || `invoice_${i}`,
              error: error instanceof Error ? error.message : 'Processing failed'
            });
          }
        }

        res.json({
          success: true,
          data: {
            processed: results.length,
            errorCount: errors.length,
            results,
            processingErrors: errors
          },
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Batch processing error:', error);
        res.status(500).json({
          error: 'Batch processing failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not found',
        message: `Route ${req.originalUrl} not found`
      });
    });

    // Error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      });
    });
  }

  private validateInvoice(invoice: any): invoice is Invoice {
    return invoice &&
           typeof invoice.id === 'string' &&
           typeof invoice.vendor === 'string' &&
           typeof invoice.rawText === 'string' &&
           invoice.extractedData &&
           invoice.metadata &&
           typeof invoice.metadata.source === 'string' &&
           typeof invoice.metadata.extractedAt === 'string' &&
           typeof invoice.metadata.processingId === 'string';
  }

  private validateFeedback(feedback: any): feedback is HumanFeedback {
    return feedback &&
           typeof feedback.invoiceId === 'string' &&
           Array.isArray(feedback.corrections) &&
           typeof feedback.approved === 'boolean' &&
           typeof feedback.timestamp === 'string';
  }

  async start(): Promise<void> {
    await this.intelligence.initialize();
    
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`🚀 Invoice Intelligence API running on port ${this.port}`);
        console.log(`📊 Health check: http://localhost:${this.port}/health`);
        console.log(`📄 API docs: http://localhost:${this.port}/api/docs`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    await this.intelligence.close();
  }
}