import { MemoryManager } from './memory/manager';
import { InvoiceProcessor } from './intelligence/processor';
import { Invoice, ProcessingResult, HumanFeedback } from './types';

export class MemoryDrivenInvoiceIntelligence {
  private memoryManager: MemoryManager;
  private processor: InvoiceProcessor;

  constructor(dbPath?: string) {
    this.memoryManager = new MemoryManager(dbPath);
    this.processor = new InvoiceProcessor(this.memoryManager);
  }

  async initialize(): Promise<void> {
    await this.memoryManager.initialize();
  }

  async processInvoice(invoice: Invoice): Promise<ProcessingResult> {
    return await this.processor.processInvoice(invoice);
  }

  async provideFeedback(feedback: HumanFeedback): Promise<void> {
    await this.processor.processHumanFeedback(feedback);
  }

  async close(): Promise<void> {
    await this.memoryManager.close();
  }
}

export * from './types';
export { MemoryManager } from './memory/manager';
export { InvoiceProcessor } from './intelligence/processor';