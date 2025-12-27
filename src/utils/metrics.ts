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

export class MetricsCollector {
  private processingStats: Map<string, any> = new Map();
  private vendorStats: Map<string, any> = new Map();
  private startTime: Date = new Date();

  recordInvoiceProcessing(
    invoiceId: string,
    vendor: string,
    confidence: number,
    requiresReview: boolean,
    correctionsCount: number,
    processingTimeMs: number,
    memoriesApplied: number
  ): void {
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
      } else {
        stats.autoAccepted++;
      }
    } else {
      stats.escalated++;
    }
  }

  recordError(vendor: string, errorType: string): void {
    const key = `${vendor}_${new Date().toISOString().split('T')[0]}`;
    
    if (this.processingStats.has(key)) {
      this.processingStats.get(key).errors++;
    }
  }

  recordMemoryOperation(operation: 'created' | 'applied' | 'reinforced' | 'weakened', memoryType: string, vendor: string): void {
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

  getProcessingMetrics(): ProcessingMetrics {
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

  getVendorMetrics(): VendorMetrics[] {
    const vendorMap = new Map<string, any>();

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

  getSystemUptime(): number {
    return Date.now() - this.startTime.getTime();
  }

  reset(): void {
    this.processingStats.clear();
    this.vendorStats.clear();
    this.startTime = new Date();
  }
}

// Global metrics collector
export const metricsCollector = new MetricsCollector();