export interface ProcessingMetrics {
    totalInvoicesProcessed: number;
    autoAcceptedCount: number;
    autoCorrectedCount: number;
    escalatedCount: number;
    averageConfidence: number;
    averageProcessingTime: number;
    memoryApplicationRate: number;
    errorRate: number;
}
export interface VendorMetrics {
    vendor: string;
    invoiceCount: number;
    automationRate: number;
    averageConfidence: number;
    memoryCount: number;
    lastProcessed: string;
}
export interface MemoryMetrics {
    totalMemories: number;
    vendorMemories: number;
    correctionMemories: number;
    resolutionMemories: number;
    averageConfidence: number;
    activeMemories: number;
    decayedMemories: number;
}
export declare class MetricsCollector {
    private processingStats;
    private vendorStats;
    private startTime;
    recordInvoiceProcessing(invoiceId: string, vendor: string, confidence: number, requiresReview: boolean, correctionsCount: number, processingTimeMs: number, memoriesApplied: number): void;
    recordError(vendor: string, errorType: string): void;
    recordMemoryOperation(operation: 'created' | 'applied' | 'reinforced' | 'weakened', memoryType: string, vendor: string): void;
    getProcessingMetrics(): ProcessingMetrics;
    getVendorMetrics(): VendorMetrics[];
    getSystemUptime(): number;
    reset(): void;
}
export declare const metricsCollector: MetricsCollector;
//# sourceMappingURL=metrics.d.ts.map