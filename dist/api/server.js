"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceIntelligenceAPI = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const index_1 = require("../index");
class InvoiceIntelligenceAPI {
    constructor(port = 3000, dbPath) {
        this.app = (0, express_1.default)();
        this.port = port;
        this.intelligence = new index_1.MemoryDrivenInvoiceIntelligence(dbPath);
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        // Security middleware
        this.app.use((0, helmet_1.default)());
        this.app.use((0, cors_1.default)({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true
        }));
        // Rate limiting
        const limiter = (0, express_rate_limit_1.default)({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP, please try again later.'
        });
        this.app.use('/api/', limiter);
        // Body parsing
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true }));
        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }
    setupRoutes() {
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
                const invoice = req.body;
                // Validate invoice structure
                if (!this.validateInvoice(invoice)) {
                    return res.status(400).json({
                        error: 'Invalid invoice structure',
                        message: 'Invoice must contain id, vendor, rawText, extractedData, and metadata'
                    });
                }
                const result = await this.intelligence.processInvoice(invoice);
                res.json({
                    success: true,
                    data: result,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
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
                const feedback = req.body;
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
            }
            catch (error) {
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
            }
            catch (error) {
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
                const invoices = req.body.invoices;
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
                const results = [];
                const errors = [];
                for (let i = 0; i < invoices.length; i++) {
                    const invoice = invoices[i];
                    try {
                        if (this.validateInvoice(invoice)) {
                            const result = await this.intelligence.processInvoice(invoice);
                            results.push(result);
                        }
                        else {
                            errors.push({
                                invoiceId: invoice?.id || `invoice_${i}`,
                                error: 'Invalid invoice structure'
                            });
                        }
                    }
                    catch (error) {
                        errors.push({
                            invoiceId: invoice?.id || `invoice_${i}`,
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
            }
            catch (error) {
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
        this.app.use((error, req, res, next) => {
            console.error('Unhandled error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'An unexpected error occurred'
            });
        });
    }
    validateInvoice(invoice) {
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
    validateFeedback(feedback) {
        return feedback &&
            typeof feedback.invoiceId === 'string' &&
            Array.isArray(feedback.corrections) &&
            typeof feedback.approved === 'boolean' &&
            typeof feedback.timestamp === 'string';
    }
    async start() {
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
    async stop() {
        await this.intelligence.close();
    }
}
exports.InvoiceIntelligenceAPI = InvoiceIntelligenceAPI;
//# sourceMappingURL=server.js.map