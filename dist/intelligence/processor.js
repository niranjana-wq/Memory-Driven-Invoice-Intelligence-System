"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceProcessor = void 0;
class InvoiceProcessor {
    constructor(memoryManager) {
        this.thresholds = {
            autoAccept: 0.85,
            autoCorrect: 0.65,
            escalate: 0.4,
            memoryApplication: 0.5
        };
        this.memoryManager = memoryManager;
    }
    async processInvoice(invoice) {
        const auditTrail = [];
        const proposedCorrections = [];
        const memoryUpdates = [];
        let overallConfidence = 1.0;
        let reasoning = '';
        // Step 1: Recall relevant memories
        const recallStart = new Date().toISOString();
        const relevantMemories = await this.recallMemories(invoice);
        auditTrail.push({
            step: 'recall',
            timestamp: recallStart,
            details: `Retrieved ${relevantMemories.length} relevant memories for vendor ${invoice.vendor}`,
            memoryReferences: relevantMemories.map(m => m.id)
        });
        // Step 2: Apply memories to propose corrections
        const applyStart = new Date().toISOString();
        const { corrections, confidence, updates } = await this.applyMemories(invoice, relevantMemories);
        proposedCorrections.push(...corrections);
        memoryUpdates.push(...updates);
        overallConfidence = confidence;
        auditTrail.push({
            step: 'apply',
            timestamp: applyStart,
            details: `Applied ${corrections.length} corrections with overall confidence ${confidence.toFixed(3)}`,
            confidence: confidence,
            memoryReferences: corrections.map(c => c.memorySource)
        });
        // Step 3: Make decision
        const decisionStart = new Date().toISOString();
        const { requiresReview, decisionReasoning } = this.makeDecision(overallConfidence, proposedCorrections);
        reasoning = decisionReasoning;
        auditTrail.push({
            step: 'decide',
            timestamp: decisionStart,
            details: `Decision: ${requiresReview ? 'ESCALATE' : 'AUTO-PROCESS'} - ${decisionReasoning}`,
            confidence: overallConfidence
        });
        // Step 4: Learn (prepare for future learning)
        const learnStart = new Date().toISOString();
        const learningOpportunities = this.identifyLearningOpportunities(invoice, proposedCorrections);
        auditTrail.push({
            step: 'learn',
            timestamp: learnStart,
            details: `Identified ${learningOpportunities.length} learning opportunities for future feedback`
        });
        // Apply the corrections to create normalized invoice
        const normalizedInvoice = this.applyCorrections(invoice, proposedCorrections);
        return {
            normalizedInvoice,
            proposedCorrections,
            requiresHumanReview: requiresReview,
            reasoning,
            confidenceScore: overallConfidence,
            memoryUpdates,
            auditTrail
        };
    }
    async recallMemories(invoice) {
        const memories = [];
        // Recall vendor-specific memories
        const vendorMemories = await this.memoryManager.recallMemories(invoice, { type: 'vendor' });
        memories.push(...vendorMemories);
        // Recall correction memories for specific fields that might have issues
        const fieldIssues = this.detectFieldIssues(invoice);
        for (const field of fieldIssues) {
            const correctionMemories = await this.memoryManager.recallMemories(invoice, {
                type: 'correction',
                fieldName: field
            });
            memories.push(...correctionMemories);
        }
        // Recall resolution memories for similar scenarios
        const scenario = this.categorizeInvoiceScenario(invoice);
        const resolutionMemories = await this.memoryManager.recallMemories(invoice, {
            type: 'resolution'
        });
        memories.push(...resolutionMemories.filter(m => m.type === 'resolution' && m.scenario.includes(scenario)));
        return memories;
    }
    async applyMemories(invoice, memories) {
        const corrections = [];
        const updates = [];
        let totalConfidence = 1.0;
        let appliedCount = 0;
        for (const memory of memories) {
            if (memory.confidence < this.thresholds.memoryApplication)
                continue;
            const correction = await this.applyMemory(invoice, memory);
            if (correction) {
                corrections.push(correction);
                appliedCount++;
                // Update memory usage
                await this.memoryManager.reinforceMemory(memory.id, 0.02);
                updates.push({
                    type: 'reinforce',
                    memoryId: memory.id,
                    details: `Applied memory for ${correction.field} correction`
                });
                // Adjust overall confidence based on memory confidence
                totalConfidence *= memory.confidence;
            }
        }
        // Penalize conflicting memories
        const conflicts = await this.detectMemoryConflicts(corrections, memories);
        if (conflicts.length > 0) {
            totalConfidence *= 0.7; // Reduce confidence for conflicts
        }
        return {
            corrections,
            confidence: appliedCount > 0 ? totalConfidence : 0.9, // Default high confidence if no memories applied
            updates
        };
    }
    deduplicateMemories(memories) {
        const seen = new Set();
        const unique = [];
        for (const memory of memories) {
            let key = '';
            if (memory.type === 'vendor') {
                const vendorMem = memory;
                key = `${memory.vendor}-${vendorMem.triggerSignal}-${vendorMem.action.targetField}`;
            }
            else if (memory.type === 'correction') {
                const corrMem = memory;
                key = `${memory.vendor}-${corrMem.fieldName}-${JSON.stringify(corrMem.correctedValue)}`;
            }
            else {
                key = memory.id; // Fallback to unique ID
            }
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(memory);
            }
        }
        return unique;
    }
    async applyMemory(invoice, memory) {
        switch (memory.type) {
            case 'vendor':
                return this.applyVendorMemory(invoice, memory);
            case 'correction':
                return this.applyCorrectionMemory(invoice, memory);
            default:
                return null;
        }
    }
    applyVendorMemory(invoice, memory) {
        const { action } = memory;
        let proposedValue;
        // Check if trigger signal matches
        const triggerFound = invoice.rawText.includes(memory.triggerSignal) ||
            memory.triggerSignal === invoice.vendor;
        if (!triggerFound) {
            return null;
        }
        switch (action.type) {
            case 'field_mapping':
                if (action.strategy === 'extract_from_text' && memory.triggerSignal === 'Leistungsdatum') {
                    // Extract serviceDate from Leistungsdatum pattern
                    const match = invoice.rawText.match(/Leistungsdatum:\s*(\d{4}-\d{2}-\d{2})/);
                    if (match) {
                        proposedValue = match[1];
                    }
                }
                else if (action.sourceField && invoice.extractedData[action.sourceField]) {
                    proposedValue = invoice.extractedData[action.sourceField];
                }
                else if (action.value !== undefined) {
                    proposedValue = action.value;
                }
                else {
                    return null;
                }
                break;
            case 'inference':
                proposedValue = this.performInference(invoice, action);
                break;
            case 'computation':
                if (action.strategy === 'vat_included_detection') {
                    // Check for VAT inclusion patterns
                    const vatIncludedPatterns = /MwSt\.\s*inkl\.|Prices\s*incl\.\s*VAT/i;
                    if (vatIncludedPatterns.test(invoice.rawText)) {
                        proposedValue = true;
                    }
                }
                else {
                    proposedValue = this.performComputation(invoice, action);
                }
                break;
            default:
                return null;
        }
        if (proposedValue === undefined || proposedValue === invoice.extractedData[action.targetField]) {
            return null;
        }
        return {
            field: action.targetField,
            originalValue: invoice.extractedData[action.targetField],
            proposedValue,
            confidence: memory.confidence,
            memorySource: memory.id,
            reasoning: `Vendor memory: ${memory.triggerSignal} → ${action.targetField} (${action.type})`
        };
    }
    applyCorrectionMemory(invoice, memory) {
        const currentValue = invoice.extractedData[memory.fieldName];
        // Check if the pattern matches current situation
        if (memory.originalPattern === 'human_correction' ||
            this.matchesPattern(currentValue, memory.originalPattern)) {
            return {
                field: memory.fieldName,
                originalValue: currentValue,
                proposedValue: memory.correctedValue,
                confidence: memory.confidence,
                memorySource: memory.id,
                reasoning: `Correction memory: ${memory.correctionReason} (approved ${memory.approvalCount}x)`
            };
        }
        return null;
    }
    performInference(invoice, action) {
        // Example inference strategies
        switch (action.strategy) {
            case 'po_from_items':
                // Infer PO number from line items if missing
                if (!invoice.extractedData.poNumber && invoice.extractedData.lineItems) {
                    const poPattern = /PO[:\s]*(\w+)/i;
                    for (const item of invoice.extractedData.lineItems) {
                        const match = item.description.match(poPattern);
                        if (match)
                            return match[1];
                    }
                }
                break;
            case 'currency_from_text':
                // Infer currency from raw text
                const currencyPatterns = {
                    'EUR': /€|EUR|euro/i,
                    'USD': /\$|USD|dollar/i,
                    'GBP': /£|GBP|pound/i
                };
                for (const [currency, pattern] of Object.entries(currencyPatterns)) {
                    if (pattern.test(invoice.rawText)) {
                        return currency;
                    }
                }
                break;
        }
        return undefined;
    }
    performComputation(invoice, action) {
        switch (action.strategy) {
            case 'vat_included_adjustment':
                // Recalculate amounts when VAT is included
                if (invoice.extractedData.vatIncluded && invoice.extractedData.amount) {
                    const vatRate = invoice.extractedData.vatAmount || 0.19; // Default 19%
                    const netAmount = invoice.extractedData.amount / (1 + vatRate);
                    return Math.round(netAmount * 100) / 100;
                }
                break;
            case 'total_from_items':
                // Calculate total from line items
                if (invoice.extractedData.lineItems) {
                    return invoice.extractedData.lineItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
                }
                break;
        }
        return undefined;
    }
    makeDecision(confidence, corrections) {
        if (confidence >= this.thresholds.autoAccept && corrections.length === 0) {
            return {
                requiresReview: false,
                decisionReasoning: `High confidence (${confidence.toFixed(3)}) with no corrections needed - AUTO-ACCEPT`
            };
        }
        if (confidence >= this.thresholds.autoCorrect && corrections.every(c => c.confidence >= 0.7)) {
            return {
                requiresReview: false,
                decisionReasoning: `Good confidence (${confidence.toFixed(3)}) with reliable corrections - AUTO-CORRECT`
            };
        }
        if (confidence < this.thresholds.escalate) {
            return {
                requiresReview: true,
                decisionReasoning: `Low confidence (${confidence.toFixed(3)}) - ESCALATE for human review`
            };
        }
        const riskFactors = this.assessRiskFactors(corrections);
        if (riskFactors.length > 0) {
            return {
                requiresReview: true,
                decisionReasoning: `Risk factors detected: ${riskFactors.join(', ')} - ESCALATE`
            };
        }
        return {
            requiresReview: true,
            decisionReasoning: `Medium confidence (${confidence.toFixed(3)}) - ESCALATE for safety`
        };
    }
    detectFieldIssues(invoice) {
        const issues = [];
        const data = invoice.extractedData;
        // Check for missing serviceDate when we have date
        if (!data.serviceDate && data.date) {
            issues.push('serviceDate');
        }
        // Check for missing currency
        if (!data.currency) {
            issues.push('currency');
        }
        // Check for missing PO number
        if (!data.poNumber) {
            issues.push('poNumber');
        }
        // Check for undefined VAT inclusion status
        if (data.vatIncluded === undefined) {
            issues.push('vatIncluded');
        }
        // Check for missing VAT amount when we have total amount
        if (!data.vatAmount && data.amount) {
            issues.push('vatAmount');
        }
        // Check for line items without SKU
        if (data.lineItems) {
            const hasItemsWithoutSku = data.lineItems.some(item => !item.sku);
            if (hasItemsWithoutSku) {
                issues.push('lineItems');
            }
        }
        return issues;
    }
    categorizeInvoiceScenario(invoice) {
        const scenarios = [];
        if (!invoice.extractedData.poNumber)
            scenarios.push('missing_po');
        if (!invoice.extractedData.serviceDate)
            scenarios.push('missing_service_date');
        if (invoice.extractedData.vatIncluded)
            scenarios.push('vat_included');
        if (!invoice.extractedData.currency)
            scenarios.push('missing_currency');
        return scenarios.join('_') || 'standard';
    }
    async detectMemoryConflicts(corrections, memories) {
        const conflicts = [];
        const fieldCorrections = new Map();
        // Group corrections by field
        for (const correction of corrections) {
            if (!fieldCorrections.has(correction.field)) {
                fieldCorrections.set(correction.field, []);
            }
            fieldCorrections.get(correction.field).push(correction);
        }
        // Check for conflicting corrections on same field
        for (const [field, fieldCorrs] of fieldCorrections) {
            if (fieldCorrs.length > 1) {
                const values = new Set(fieldCorrs.map(c => JSON.stringify(c.proposedValue)));
                if (values.size > 1) {
                    conflicts.push(`Conflicting corrections for ${field}`);
                }
            }
        }
        return conflicts;
    }
    matchesPattern(value, pattern) {
        if (pattern === 'human_correction')
            return true;
        const valueStr = String(value || '');
        try {
            const regex = new RegExp(pattern, 'i');
            return regex.test(valueStr);
        }
        catch {
            return valueStr.includes(pattern);
        }
    }
    assessRiskFactors(corrections) {
        const risks = [];
        // High-value corrections are risky
        const amountCorrections = corrections.filter(c => ['amount', 'vatAmount', 'totalPrice'].includes(c.field));
        if (amountCorrections.length > 0) {
            risks.push('financial_impact');
        }
        // Low confidence corrections
        const lowConfidenceCorrections = corrections.filter(c => c.confidence < 0.6);
        if (lowConfidenceCorrections.length > 0) {
            risks.push('low_confidence_corrections');
        }
        // Too many corrections might indicate data quality issues
        if (corrections.length > 3) {
            risks.push('multiple_corrections');
        }
        return risks;
    }
    identifyLearningOpportunities(invoice, corrections) {
        const opportunities = [];
        if (corrections.length === 0) {
            opportunities.push('successful_processing');
        }
        for (const correction of corrections) {
            opportunities.push(`correction_${correction.field}`);
        }
        return opportunities;
    }
    applyCorrections(invoice, corrections) {
        const normalizedInvoice = JSON.parse(JSON.stringify(invoice)); // Deep clone
        for (const correction of corrections) {
            normalizedInvoice.extractedData[correction.field] = correction.proposedValue;
        }
        return normalizedInvoice;
    }
    async processHumanFeedback(feedback) {
        await this.memoryManager.processHumanFeedback(feedback);
    }
}
exports.InvoiceProcessor = InvoiceProcessor;
//# sourceMappingURL=processor.js.map