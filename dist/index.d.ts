import { Invoice, ProcessingResult, HumanFeedback } from './types';
export declare class MemoryDrivenInvoiceIntelligence {
    private memoryManager;
    private processor;
    constructor(dbPath?: string);
    initialize(): Promise<void>;
    processInvoice(invoice: Invoice): Promise<ProcessingResult>;
    provideFeedback(feedback: HumanFeedback): Promise<void>;
    close(): Promise<void>;
}
export * from './types';
export { MemoryManager } from './memory/manager';
export { InvoiceProcessor } from './intelligence/processor';
//# sourceMappingURL=index.d.ts.map