import { MemoryManager } from '../memory/manager';
import { Invoice, ProcessingResult, HumanFeedback } from '../types';
export declare class InvoiceProcessor {
    private memoryManager;
    private thresholds;
    constructor(memoryManager: MemoryManager);
    processInvoice(invoice: Invoice): Promise<ProcessingResult>;
    private recallMemories;
    private applyMemories;
    private deduplicateMemories;
    private applyMemory;
    private applyVendorMemory;
    private applyCorrectionMemory;
    private performInference;
    private performComputation;
    private makeDecision;
    private detectFieldIssues;
    private categorizeInvoiceScenario;
    private detectMemoryConflicts;
    private matchesPattern;
    private assessRiskFactors;
    private identifyLearningOpportunities;
    private applyCorrections;
    processHumanFeedback(feedback: HumanFeedback): Promise<void>;
}
//# sourceMappingURL=processor.d.ts.map