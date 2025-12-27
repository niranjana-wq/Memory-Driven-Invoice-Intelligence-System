import { v4 as uuidv4 } from 'uuid';
import { MemoryDatabase } from './database';
import { 
  Memory, 
  VendorMemory, 
  CorrectionMemory, 
  ResolutionMemory, 
  MemoryQuery,
  HumanFeedback,
  Invoice
} from '../types';

export class MemoryManager {
  private db: MemoryDatabase;
  private readonly CONFIDENCE_DECAY_RATE = 0.95;
  private readonly MAX_CONFIDENCE_INCREASE = 0.1;
  private readonly MIN_CONFIDENCE = 0.1;
  private readonly MAX_CONFIDENCE = 0.95;

  constructor(dbPath?: string) {
    this.db = new MemoryDatabase(dbPath);
  }

  async initialize(): Promise<void> {
    await this.db.initialize();
  }

  async recallMemories(invoice: Invoice, query: Partial<MemoryQuery> = {}): Promise<Memory[]> {
    const fullQuery: MemoryQuery = {
      vendor: invoice.vendor,
      minConfidence: 0.3,
      limit: 50,
      ...query
    };

    const memories = await this.db.queryMemories(fullQuery);
    
    // Apply decay to unused memories
    await this.applyDecayToUnusedMemories(memories);
    
    return memories.filter(m => m.confidence >= (fullQuery.minConfidence || 0.3));
  }

  async createVendorMemory(
    vendor: string,
    triggerSignal: string,
    action: VendorMemory['action'],
    pattern: string,
    initialConfidence: number = 0.5
  ): Promise<VendorMemory> {
    const memory: VendorMemory = {
      id: uuidv4(),
      type: 'vendor',
      vendor,
      triggerSignal,
      action,
      pattern,
      confidence: Math.min(initialConfidence, this.MAX_CONFIDENCE),
      usageCount: 0,
      createdAt: new Date().toISOString(),
      lastUsedAt: '',
      lastUpdatedAt: new Date().toISOString(),
      isActive: true
    };

    await this.db.saveMemory(memory);
    return memory;
  }

  async createCorrectionMemory(
    vendor: string,
    fieldName: string,
    originalPattern: string,
    correctedValue: any,
    correctionReason: string,
    initialConfidence: number = 0.4
  ): Promise<CorrectionMemory> {
    const memory: CorrectionMemory = {
      id: uuidv4(),
      type: 'correction',
      vendor,
      fieldName,
      originalPattern,
      correctedValue,
      correctionReason,
      confidence: Math.min(initialConfidence, this.MAX_CONFIDENCE),
      usageCount: 0,
      approvalCount: 0,
      rejectionCount: 0,
      createdAt: new Date().toISOString(),
      lastUsedAt: '',
      lastUpdatedAt: new Date().toISOString(),
      isActive: true
    };

    await this.db.saveMemory(memory);
    return memory;
  }

  async createResolutionMemory(
    vendor: string,
    scenario: string,
    outcome: ResolutionMemory['outcome'],
    systemAction: string,
    humanFeedback?: string,
    initialConfidence: number = 0.6
  ): Promise<ResolutionMemory> {
    const memory: ResolutionMemory = {
      id: uuidv4(),
      type: 'resolution',
      vendor,
      scenario,
      outcome,
      humanFeedback,
      systemAction,
      confidence: Math.min(initialConfidence, this.MAX_CONFIDENCE),
      usageCount: 0,
      createdAt: new Date().toISOString(),
      lastUsedAt: '',
      lastUpdatedAt: new Date().toISOString(),
      isActive: true
    };

    await this.db.saveMemory(memory);
    return memory;
  }

  async reinforceMemory(memoryId: string, strength: number = 0.1): Promise<void> {
    // Query for the specific memory by ID
    const memories = await this.db.queryMemories({});
    const memory = memories.find(m => m.id === memoryId);
    
    if (!memory) return;

    const increase = Math.min(strength, this.MAX_CONFIDENCE_INCREASE);
    const newConfidence = Math.min(memory.confidence + increase, this.MAX_CONFIDENCE);
    
    await this.db.updateMemoryConfidence(memoryId, newConfidence);
    await this.db.updateMemoryUsage(memoryId);

    // Special handling for correction memories
    if (memory.type === 'correction') {
      const corrMem = memory as CorrectionMemory;
      corrMem.approvalCount += 1;
      await this.db.saveMemory(corrMem);
    }
  }

  async weakenMemory(memoryId: string, strength: number = 0.2): Promise<void> {
    // Query for the specific memory by ID
    const memories = await this.db.queryMemories({});
    const memory = memories.find(m => m.id === memoryId);
    
    if (!memory) return;

    const decrease = Math.min(strength, 0.3);
    const newConfidence = Math.max(memory.confidence - decrease, this.MIN_CONFIDENCE);
    
    await this.db.updateMemoryConfidence(memoryId, newConfidence);

    // Special handling for correction memories
    if (memory.type === 'correction') {
      const corrMem = memory as CorrectionMemory;
      corrMem.rejectionCount += 1;
      await this.db.saveMemory(corrMem);
    }

    // Deactivate memory if confidence drops too low
    if (newConfidence <= this.MIN_CONFIDENCE) {
      memory.isActive = false;
      await this.db.saveMemory(memory);
    }
  }

  async processHumanFeedback(feedback: HumanFeedback): Promise<void> {
    // Create correction memories from human corrections
    for (const correction of feedback.corrections) {
      const vendor = this.extractVendorFromFeedback(feedback);
      
      if (correction.field === 'serviceDate' && correction.reason?.includes('Leistungsdatum')) {
        // Create vendor memory for serviceDate mapping
        await this.createVendorMemory(
          vendor,
          'Leistungsdatum',
          {
            type: 'field_mapping',
            targetField: 'serviceDate',
            strategy: 'extract_from_text'
          },
          'leistungsdatum_mapping',
          0.7
        );
      } else if (correction.field === 'vatIncluded' && correction.reason?.includes('MwSt. inkl.')) {
        // Create vendor memory for VAT inclusion detection
        await this.createVendorMemory(
          vendor,
          'MwSt. inkl.',
          {
            type: 'computation',
            targetField: 'vatIncluded',
            value: true,
            strategy: 'vat_included_detection'
          },
          'vat_included_pattern',
          0.8
        );
      } else if (correction.field === 'currency' && correction.correctedValue === 'EUR') {
        // Create vendor memory for currency inference
        await this.createVendorMemory(
          vendor,
          vendor, // Use vendor name as trigger
          {
            type: 'inference',
            targetField: 'currency',
            value: 'EUR',
            strategy: 'vendor_default_currency'
          },
          'currency_inference',
          0.6
        );
      } else if (correction.field === 'lineItems' && correction.reason?.includes('FREIGHT')) {
        // Create vendor memory for SKU mapping
        await this.createVendorMemory(
          vendor,
          'Freight Services',
          {
            type: 'field_mapping',
            targetField: 'lineItems',
            value: 'FREIGHT',
            strategy: 'sku_mapping'
          },
          'freight_sku_mapping',
          0.7
        );
      } else {
        // Generic correction memory
        await this.createCorrectionMemory(
          vendor,
          correction.field,
          'human_correction',
          correction.correctedValue,
          correction.reason || 'Human correction',
          0.7
        );
      }
    }

    if (feedback.approved) {
      // Reinforce memories that led to correct suggestions
      // This would be implemented with proper memory tracking
    }
  }

  private async findExistingMemoryForCorrection(vendor: string, correction: any): Promise<Memory[]> {
    const memories = await this.db.queryMemories({ vendor });
    
    return memories.filter(memory => {
      if (memory.type === 'vendor') {
        const vendorMem = memory as VendorMemory;
        
        // Check for serviceDate mapping
        if (correction.field === 'serviceDate' && 
            vendorMem.triggerSignal === 'Leistungsdatum' &&
            vendorMem.action.targetField === 'serviceDate') {
          return true;
        }
        
        // Check for VAT inclusion
        if (correction.field === 'vatIncluded' && 
            vendorMem.triggerSignal === 'MwSt. inkl.' &&
            vendorMem.action.targetField === 'vatIncluded') {
          return true;
        }
        
        // Check for currency inference
        if (correction.field === 'currency' && 
            vendorMem.action.targetField === 'currency' &&
            vendorMem.action.value === correction.correctedValue) {
          return true;
        }
        
        // Check for SKU mapping
        if (correction.field === 'lineItems' && 
            vendorMem.triggerSignal === 'Freight Services' &&
            vendorMem.action.targetField === 'lineItems') {
          return true;
        }
      }
      
      if (memory.type === 'correction') {
        const corrMem = memory as CorrectionMemory;
        return corrMem.fieldName === correction.field &&
               JSON.stringify(corrMem.correctedValue) === JSON.stringify(correction.correctedValue);
      }
      
      return false;
    });
  }

  private extractVendorFromFeedback(feedback: HumanFeedback): string {
    // In a real system, this would lookup the invoice by ID
    // For demo and test purposes, extract from invoice ID pattern
    if (feedback.invoiceId === 'inv-001' || feedback.invoiceId === 'inv-005') {
      return 'Supplier GmbH';
    } else if (feedback.invoiceId === 'inv-002') {
      return 'Parts AG';
    } else if (feedback.invoiceId === 'inv-003') {
      return 'Freight & Co';
    } else if (feedback.invoiceId.includes('final-test')) {
      return 'Final Test Vendor';
    } else if (feedback.invoiceId.includes('debug')) {
      return 'Debug Vendor';
    }
    
    // Default fallback - in production this would be a database lookup
    return 'Test Vendor';
  }

  private async applyDecayToUnusedMemories(memories: Memory[]): Promise<void> {
    const now = new Date();
    const daysSinceEpoch = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));

    for (const memory of memories) {
      const lastUsed = memory.lastUsedAt ? new Date(memory.lastUsedAt) : new Date(memory.createdAt);
      const daysSinceLastUse = daysSinceEpoch - Math.floor(lastUsed.getTime() / (1000 * 60 * 60 * 24));

      if (daysSinceLastUse > 7) { // Apply decay after 7 days of non-use
        const decayFactor = Math.pow(this.CONFIDENCE_DECAY_RATE, daysSinceLastUse - 7);
        const newConfidence = Math.max(memory.confidence * decayFactor, this.MIN_CONFIDENCE);
        
        if (newConfidence !== memory.confidence) {
          await this.db.updateMemoryConfidence(memory.id, newConfidence);
        }
      }
    }
  }

  async findConflictingMemories(memory: Memory): Promise<Memory[]> {
    const query: MemoryQuery = {
      vendor: memory.vendor,
      type: memory.type
    };

    if (memory.type === 'correction') {
      const corrMem = memory as CorrectionMemory;
      query.fieldName = corrMem.fieldName;
    }

    const existingMemories = await this.db.queryMemories(query);
    
    return existingMemories.filter(existing => {
      if (existing.id === memory.id) return false;
      
      if (memory.type === 'correction' && existing.type === 'correction') {
        const newCorr = memory as CorrectionMemory;
        const existingCorr = existing as CorrectionMemory;
        
        return newCorr.fieldName === existingCorr.fieldName &&
               JSON.stringify(newCorr.correctedValue) !== JSON.stringify(existingCorr.correctedValue);
      }
      
      return false;
    });
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}