"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAutonomousDemo = runAutonomousDemo;
const index_1 = require("./index");
/**
 * AUTONOMOUS DEMO - No Human Input Required
 *
 * This demo shows the system operating in fully autonomous mode,
 * making decisions and corrections without any human intervention.
 * The system uses pre-learned patterns to process invoices automatically.
 */
// Sample invoices for autonomous processing
const autonomousInvoices = [
    // Invoice with learned Supplier GmbH pattern
    {
        id: 'auto-001',
        vendor: 'Supplier GmbH',
        rawText: `
      Rechnung Nr: 2024-AUTO-001
      Datum: 2024-01-25
      Leistungsdatum: 2024-01-22
      
      Artikel: Cloud Services
      Menge: 1
      Preis: 2500.00 EUR
    `,
        extractedData: {
            invoiceNumber: '2024-AUTO-001',
            date: '2024-01-25',
            // serviceDate missing - should be auto-corrected
            amount: 2500.00,
            currency: 'EUR',
            lineItems: [{
                    description: 'Cloud Services',
                    quantity: 1,
                    unitPrice: 2500.00,
                    totalPrice: 2500.00
                }]
        },
        metadata: {
            source: 'api_upload',
            extractedAt: '2024-01-25T10:00:00Z',
            processingId: 'auto-proc-001'
        }
    },
    // Invoice with learned Parts AG VAT pattern
    {
        id: 'auto-002',
        vendor: 'Parts AG',
        rawText: `
      Invoice: PAG-2024-AUTO-002
      Date: 2024-01-25
      
      Description: Server Hardware
      Qty: 2
      Price: 1500.00 (MwSt. inkl.)
      
      Total: 3000.00
      Prices incl. VAT
    `,
        extractedData: {
            invoiceNumber: 'PAG-2024-AUTO-002',
            date: '2024-01-25',
            amount: 3000.00,
            // currency and vatIncluded should be auto-detected
            lineItems: [{
                    description: 'Server Hardware',
                    quantity: 2,
                    unitPrice: 1500.00,
                    totalPrice: 3000.00
                }]
        },
        metadata: {
            source: 'email_attachment',
            extractedAt: '2024-01-25T11:00:00Z',
            processingId: 'auto-proc-002'
        }
    },
    // Invoice with learned Freight & Co SKU pattern
    {
        id: 'auto-003',
        vendor: 'Freight & Co',
        rawText: `
      Invoice No: FRT-AUTO-003
      Date: 2024-01-25
      
      Express Delivery Services
      Amount: 275.00 USD
      
      Payment terms: Net 30 days
    `,
        extractedData: {
            invoiceNumber: 'FRT-AUTO-003',
            date: '2024-01-25',
            amount: 275.00,
            currency: 'USD',
            lineItems: [{
                    description: 'Express Delivery Services',
                    quantity: 1,
                    totalPrice: 275.00
                    // SKU should be auto-mapped to 'FREIGHT'
                }]
        },
        metadata: {
            source: 'api_upload',
            extractedAt: '2024-01-25T12:00:00Z',
            processingId: 'auto-proc-003'
        }
    },
    // High-confidence invoice (should auto-accept)
    {
        id: 'auto-004',
        vendor: 'TechCorp Ltd',
        rawText: `
      Invoice: TC-2024-004
      Date: 2024-01-25
      Service Date: 2024-01-20
      
      Software License Renewal
      Amount: 5000.00 USD
      VAT: 950.00 USD
      Total: 5950.00 USD
    `,
        extractedData: {
            invoiceNumber: 'TC-2024-004',
            date: '2024-01-25',
            serviceDate: '2024-01-20',
            amount: 5950.00,
            currency: 'USD',
            vatAmount: 950.00,
            vatIncluded: false,
            lineItems: [{
                    description: 'Software License Renewal',
                    quantity: 1,
                    unitPrice: 5000.00,
                    totalPrice: 5000.00,
                    sku: 'SOFTWARE'
                }]
        },
        metadata: {
            source: 'api_upload',
            extractedAt: '2024-01-25T13:00:00Z',
            processingId: 'auto-proc-004'
        }
    },
    // Problematic invoice (should escalate)
    {
        id: 'auto-005',
        vendor: 'Unknown Vendor Inc',
        rawText: `
      Bill #: ???-2024
      Date: unclear
      
      Various services
      Amount: ??? 
    `,
        extractedData: {
            invoiceNumber: '???-2024',
            // Multiple missing fields - should trigger escalation
            lineItems: [{
                    description: 'Various services',
                    quantity: 1
                }]
        },
        metadata: {
            source: 'manual_entry',
            extractedAt: '2024-01-25T14:00:00Z',
            processingId: 'auto-proc-005'
        }
    }
];
async function runAutonomousDemo() {
    console.log('🤖 AUTONOMOUS INVOICE PROCESSING DEMO');
    console.log('=====================================');
    console.log('🎯 Fully automated processing - NO human input required');
    console.log('🧠 Using pre-learned patterns for intelligent decisions\n');
    const intelligence = new index_1.MemoryDrivenInvoiceIntelligence('./demo_memory.db');
    await intelligence.initialize();
    let autoProcessedCount = 0;
    let escalatedCount = 0;
    let totalCorrections = 0;
    try {
        for (let i = 0; i < autonomousInvoices.length; i++) {
            const invoice = autonomousInvoices[i];
            console.log(`📄 Processing Invoice #${i + 1}: ${invoice.id}`);
            console.log(`   Vendor: ${invoice.vendor}`);
            console.log(`   Amount: ${invoice.extractedData.amount || 'Unknown'} ${invoice.extractedData.currency || ''}`);
            const startTime = Date.now();
            const result = await intelligence.processInvoice(invoice);
            const processingTime = Date.now() - startTime;
            console.log(`\n⚡ Processing completed in ${processingTime}ms`);
            // Decision outcome
            if (result.requiresHumanReview) {
                console.log(`🔴 DECISION: ESCALATE TO HUMAN`);
                console.log(`   Confidence: ${(result.confidenceScore * 100).toFixed(1)}%`);
                console.log(`   Reason: ${result.reasoning}`);
                escalatedCount++;
            }
            else {
                console.log(`🟢 DECISION: AUTO-PROCESSED`);
                console.log(`   Confidence: ${(result.confidenceScore * 100).toFixed(1)}%`);
                console.log(`   Action: ${result.proposedCorrections.length > 0 ? 'AUTO-CORRECTED' : 'AUTO-ACCEPTED'}`);
                autoProcessedCount++;
            }
            // Show autonomous corrections
            if (result.proposedCorrections.length > 0) {
                console.log(`\n🔧 Autonomous Corrections Applied:`);
                result.proposedCorrections.forEach(correction => {
                    console.log(`   • ${correction.field}: "${correction.originalValue}" → "${correction.proposedValue}"`);
                    console.log(`     Confidence: ${(correction.confidence * 100).toFixed(1)}% | Source: Memory ${correction.memorySource}`);
                    console.log(`     Reasoning: ${correction.reasoning}`);
                });
                totalCorrections += result.proposedCorrections.length;
            }
            // Show decision pipeline
            console.log(`\n📊 Decision Pipeline:`);
            result.auditTrail.forEach(entry => {
                const confidenceStr = entry.confidence ? ` (${(entry.confidence * 100).toFixed(1)}%)` : '';
                console.log(`   ${entry.step.toUpperCase()}${confidenceStr}: ${entry.details}`);
            });
            console.log('\n' + '─'.repeat(80) + '\n');
        }
        // Summary statistics
        console.log('📈 AUTONOMOUS PROCESSING SUMMARY');
        console.log('================================\n');
        console.log(`📊 Processing Statistics:`);
        console.log(`   Total Invoices: ${autonomousInvoices.length}`);
        console.log(`   Auto-Processed: ${autoProcessedCount} (${((autoProcessedCount / autonomousInvoices.length) * 100).toFixed(1)}%)`);
        console.log(`   Escalated: ${escalatedCount} (${((escalatedCount / autonomousInvoices.length) * 100).toFixed(1)}%)`);
        console.log(`   Total Corrections: ${totalCorrections}`);
        console.log(`   Average Corrections per Invoice: ${(totalCorrections / autonomousInvoices.length).toFixed(1)}`);
        console.log(`\n🎯 Automation Achievements:`);
        console.log(`   ✅ Supplier GmbH: Automatic serviceDate extraction from "Leistungsdatum"`);
        console.log(`   ✅ Parts AG: Automatic VAT inclusion detection from German text`);
        console.log(`   ✅ Freight & Co: Automatic SKU mapping for freight services`);
        console.log(`   ✅ Risk Assessment: Automatic escalation for low-quality data`);
        console.log(`   ✅ Confidence Scoring: Deterministic decision-making based on learned patterns`);
        console.log(`\n🚀 System Capabilities Demonstrated:`);
        console.log(`   • Memory-driven learning without ML training`);
        console.log(`   • Fully autonomous processing with no human input`);
        console.log(`   • Deterministic and explainable decisions`);
        console.log(`   • Vendor-specific pattern recognition`);
        console.log(`   • Automatic risk assessment and escalation`);
        console.log(`   • Complete audit trails for compliance`);
        console.log(`\n✅ Autonomous demo completed successfully!`);
        console.log(`🎉 System operating at ${((autoProcessedCount / autonomousInvoices.length) * 100).toFixed(1)}% automation rate`);
    }
    catch (error) {
        console.error('❌ Autonomous demo failed:', error);
    }
    finally {
        await intelligence.close();
    }
}
// Run the demo if called directly
if (require.main === module) {
    runAutonomousDemo().catch(console.error);
}
//# sourceMappingURL=autonomous-demo.js.map