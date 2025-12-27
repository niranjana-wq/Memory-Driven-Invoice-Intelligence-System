"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsCollector = exports.MetricsCollector = void 0;
class MetricsCollector {
    constructor() {
        this.processingStats = new Map();
        this.vendorStats = new Map();
        this.startTime = new Date();
    }
    recordInvoiceProcessing(invoiceId, vendor, confidence, requiresReview, correctionsCount, processingTimeMs, memoriesApplied) {
        const key = `${vendor}_${new Date().toISOString().split('T')[0]}`;
        if (!this.processingStats.has(key)) {
            this.processingStats.set(key, {
                vendor,
                date: new Date().toISOString().split('T')[0],
                totalProcessed: 0,
                autoAccepted: 0,
                autoCorrected: 0,
                escalated: 0,
                totalConfidence: 0,
                totalProcessingTime: 0,
                totalMemoriesApplied: 0,
                errors: 0
            });
        }
        const stats = this.processingStats.get(key);
        stats.totalProcessed++;
        stats.totalConfidence += confidence;
        stats.totalProcessingTime += processingTimeMs;
        stats.totalMemoriesApplied += memoriesApplied;
        if (!requiresReview) {
            if (correctionsCount > 0) {
                stats.autoCorrected++;
            }
            else {
                stats.autoAccepted++;
            }
        }
        else {
            stats.escalated++;
        }
    }
    recordError(vendor, errorType) {
        const key = `${vendor}_${new Date().toISOString().split('T')[0]}`;
        if (this.processingStats.has(key)) {
            this.processingStats.get(key).errors++;
        }
    }
    recordMemoryOperation(operation, memoryType, vendor) {
        const key = `memory_${vendor}_${new Date().toISOString().split('T')[0]}`;
        if (!this.vendorStats.has(key)) {
            this.vendorStats.set(key, {
                vendor,
                date: new Date().toISOString().split('T')[0],
                memoriesCreated: 0,
                memoriesApplied: 0,
                memoriesReinforced: 0,
                memoriesWeakened: 0
            });
        }
        const stats = this.vendorStats.get(key);
        switch (operation) {
            case 'created':
                stats.memoriesCreated++;
                break;
            case 'applied':
                stats.memoriesApplied++;
                break;
            case 'reinforced':
                stats.memoriesReinforced++;
                break;
            case 'weakened':
                stats.memoriesWeakened++;
                break;
        }
    }
    getProcessingMetrics() {
        let totalProcessed = 0;
        let totalAutoAccepted = 0;
        let totalAutoCorrected = 0;
        let totalEscalated = 0;
        let totalConfidence = 0;
        let totalProcessingTime = 0;
        let totalMemoriesApplied = 0;
        let totalErrors = 0;
        for (const stats of this.processingStats.values()) {
            totalProcessed += stats.totalProcessed;
            totalAutoAccepted += stats.autoAccepted;
            totalAutoCorrected += stats.autoCorrected;
            totalEscalated += stats.escalated;
            totalConfidence += stats.totalConfidence;
            totalProcessingTime += stats.totalProcessingTime;
            totalMemoriesApplied += stats.totalMemoriesApplied;
            totalErrors += stats.errors;
        }
        return {
            totalInvoicesProcessed: totalProcessed,
            autoAcceptedCount: totalAutoAccepted,
            autoCorrectedCount: totalAutoCorrected,
            escalatedCount: totalEscalated,
            averageConfidence: totalProcessed > 0 ? totalConfidence / totalProcessed : 0,
            averageProcessingTime: totalProcessed > 0 ? totalProcessingTime / totalProcessed : 0,
            memoryApplicationRate: totalProcessed > 0 ? totalMemoriesApplied / totalProcessed : 0,
            errorRate: totalProcessed > 0 ? totalErrors / totalProcessed : 0
        };
    }
    getVendorMetrics() {
        const vendorMap = new Map();
        for (const stats of this.processingStats.values()) {
            if (!vendorMap.has(stats.vendor)) {
                vendorMap.set(stats.vendor, {
                    vendor: stats.vendor,
                    invoiceCount: 0,
                    autoProcessedCount: 0,
                    totalConfidence: 0,
                    lastProcessed: stats.date
                });
            }
            const vendorStats = vendorMap.get(stats.vendor);
            vendorStats.invoiceCount += stats.totalProcessed;
            vendorStats.autoProcessedCount += (stats.autoAccepted + stats.autoCorrected);
            vendorStats.totalConfidence += stats.totalConfidence;
            if (stats.date > vendorStats.lastProcessed) {
                vendorStats.lastProcessed = stats.date;
            }
        }
        return Array.from(vendorMap.values()).map(stats => ({
            vendor: stats.vendor,
            invoiceCount: stats.invoiceCount,
            automationRate: stats.invoiceCount > 0 ? stats.autoProcessedCount / stats.invoiceCount : 0,
            averageConfidence: stats.invoiceCount > 0 ? stats.totalConfidence / stats.invoiceCount : 0,
            memoryCount: 0, // Would be populated from database query
            lastProcessed: stats.lastProcessed
        }));
    }
    getSystemUptime() {
        return Date.now() - this.startTime.getTime();
    }
    reset() {
        this.processingStats.clear();
        this.vendorStats.clear();
        this.startTime = new Date();
    }
}
exports.MetricsCollector = MetricsCollector;
// Global metrics collector
exports.metricsCollector = new MetricsCollector();
//# sourceMappingURL=metrics.js.map