export interface Invoice {
    id: string;
    vendor: string;
    rawText: string;
    extractedData: {
        invoiceNumber?: string;
        date?: string;
        serviceDate?: string;
        amount?: number;
        currency?: string;
        vatAmount?: number;
        vatIncluded?: boolean;
        poNumber?: string;
        lineItems?: LineItem[];
        [key: string]: any;
    };
    metadata: {
        source: string;
        extractedAt: string;
        processingId: string;
    };
}
export interface LineItem {
    description: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
    sku?: string;
    vatRate?: number;
}
export interface ProcessingResult {
    normalizedInvoice: Invoice;
    proposedCorrections: Correction[];
    requiresHumanReview: boolean;
    reasoning: string;
    confidenceScore: number;
    memoryUpdates: MemoryUpdate[];
    auditTrail: AuditEntry[];
}
export interface Correction {
    field: string;
    originalValue: any;
    proposedValue: any;
    confidence: number;
    memorySource: string;
    reasoning: string;
}
export interface MemoryUpdate {
    type: 'create' | 'reinforce' | 'weaken' | 'decay';
    memoryId?: string;
    details: string;
}
export interface AuditEntry {
    step: 'recall' | 'apply' | 'decide' | 'learn';
    timestamp: string;
    details: string;
    confidence?: number;
    memoryReferences?: string[];
}
export interface BaseMemory {
    id: string;
    type: 'vendor' | 'correction' | 'resolution';
    vendor: string;
    confidence: number;
    usageCount: number;
    createdAt: string;
    lastUsedAt: string;
    lastUpdatedAt: string;
    isActive: boolean;
}
export interface VendorMemory extends BaseMemory {
    type: 'vendor';
    triggerSignal: string;
    action: {
        type: 'field_mapping' | 'computation' | 'inference';
        sourceField?: string;
        targetField: string;
        value?: any;
        strategy?: string;
    };
    pattern: string;
}
export interface CorrectionMemory extends BaseMemory {
    type: 'correction';
    fieldName: string;
    originalPattern: string;
    correctedValue: any;
    correctionReason: string;
    approvalCount: number;
    rejectionCount: number;
}
export interface ResolutionMemory extends BaseMemory {
    type: 'resolution';
    scenario: string;
    outcome: 'approved' | 'rejected' | 'escalated';
    humanFeedback?: string;
    systemAction: string;
}
export type Memory = VendorMemory | CorrectionMemory | ResolutionMemory;
export interface HumanFeedback {
    invoiceId: string;
    corrections: {
        field: string;
        correctedValue: any;
        reason?: string;
    }[];
    approved: boolean;
    comments?: string;
    timestamp: string;
}
export interface MemoryQuery {
    vendor?: string;
    fieldName?: string;
    pattern?: string;
    type?: Memory['type'];
    minConfidence?: number;
    limit?: number;
}
export interface DecisionThresholds {
    autoAccept: number;
    autoCorrect: number;
    escalate: number;
    memoryApplication: number;
}
//# sourceMappingURL=index.d.ts.map