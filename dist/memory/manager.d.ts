import { Memory, VendorMemory, CorrectionMemory, ResolutionMemory, MemoryQuery, HumanFeedback, Invoice } from '../types';
export declare class MemoryManager {
    private db;
    private readonly CONFIDENCE_DECAY_RATE;
    private readonly MAX_CONFIDENCE_INCREASE;
    private readonly MIN_CONFIDENCE;
    private readonly MAX_CONFIDENCE;
    constructor(dbPath?: string);
    initialize(): Promise<void>;
    recallMemories(invoice: Invoice, query?: Partial<MemoryQuery>): Promise<Memory[]>;
    createVendorMemory(vendor: string, triggerSignal: string, action: VendorMemory['action'], pattern: string, initialConfidence?: number): Promise<VendorMemory>;
    createCorrectionMemory(vendor: string, fieldName: string, originalPattern: string, correctedValue: any, correctionReason: string, initialConfidence?: number): Promise<CorrectionMemory>;
    createResolutionMemory(vendor: string, scenario: string, outcome: ResolutionMemory['outcome'], systemAction: string, humanFeedback?: string, initialConfidence?: number): Promise<ResolutionMemory>;
    reinforceMemory(memoryId: string, strength?: number): Promise<void>;
    weakenMemory(memoryId: string, strength?: number): Promise<void>;
    processHumanFeedback(feedback: HumanFeedback): Promise<void>;
    private findExistingMemoryForCorrection;
    private extractVendorFromFeedback;
    private applyDecayToUnusedMemories;
    findConflictingMemories(memory: Memory): Promise<Memory[]>;
    close(): Promise<void>;
}
//# sourceMappingURL=manager.d.ts.map