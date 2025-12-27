import { MemoryDrivenInvoiceIntelligence } from './index';
import { Invoice, HumanFeedback } from './types';

// Sample invoice data based on the requirements
const sampleInvoices: Invoice[] = [
  // Invoice #1 - Supplier GmbH with serviceDate issue
  {
    id: 'inv-001',
    vendor: 'Supplier GmbH',
    rawText: `
      Rechnung Nr: 2024-001
      Datum: 2024-01-15
      Leistungsdatum: 2024-01-10
      
      Artikel: Software License
      Menge: 1
      Preis: 1000.00 EUR
      
      Gesamt: 1000.00 EUR
      MwSt (19%): 190.00 EUR
      Endbetrag: 1190.00 EUR
    `,
    extractedData: {
      invoiceNumber: '2024-001',
      date: '2024-01-15',
      // serviceDate missing - this should be learned
      amount: 1190.00,
      currency: 'EUR',
      vatAmount: 190.00,
      vatIncluded: false,
      lineItems: [{
        description: 'Software License',
        quantity: 1,
        unitPrice: 1000.00,
        totalPrice: 1000.00
      }]
    },
    metadata: {
      source: 'email_attachment',
      extractedAt: '2024-01-15T10:00:00Z',
      processingId: 'proc-001'
    }
  },

  // Invoice #2 - Parts AG with VAT included issue
  {
    id: 'inv-002',
    vendor: 'Parts AG',
    rawText: `
      Invoice: PAG-2024-002
      Date: 2024-01-16
      
      Description: Hardware Components
      Qty: 5
      Price: 500.00 (MwSt. inkl.)
      
      Total: 2500.00
      Prices incl. VAT
    `,
    extractedData: {
      invoiceNumber: 'PAG-2024-002',
      date: '2024-01-16',
      amount: 2500.00,
      // currency missing - should be inferred
      // vatIncluded should be detected from "MwSt. inkl." and "Prices incl. VAT"
      lineItems: [{
        description: 'Hardware Components',
        quantity: 5,
        unitPrice: 500.00,
        totalPrice: 2500.00
      }]
    },
    metadata: {
      source: 'api_upload',
      extractedAt: '2024-01-16T11:00:00Z',
      processingId: 'proc-002'
    }
  },

  // Invoice #3 - Freight & Co with SKU and Skonto learning
  {
    id: 'inv-003',
    vendor: 'Freight & Co',
    rawText: `
      Invoice No: FRT-003
      Date: 2024-01-17
      
      Freight Services - Standard Delivery
      Amount: 150.00 USD
      
      Payment terms: 2% Skonto bei Zahlung binnen 10 Tagen
      Net payment: 30 days
    `,
    extractedData: {
      invoiceNumber: 'FRT-003',
      date: '2024-01-17',
      amount: 150.00,
      currency: 'USD',
      lineItems: [{
        description: 'Freight Services - Standard Delivery',
        quantity: 1,
        totalPrice: 150.00
        // SKU should be mapped to 'FREIGHT'
      }]
    },
    metadata: {
      source: 'manual_entry',
      extractedAt: '2024-01-17T12:00:00Z',
      processingId: 'proc-003'
    }
  },

  // Invoice #4 - Duplicate of Invoice #1 (should be detected)
  {
    id: 'inv-004',
    vendor: 'Supplier GmbH',
    rawText: `
      Rechnung Nr: 2024-001
      Datum: 2024-01-15
      Leistungsdatum: 2024-01-10
      
      Artikel: Software License
      Menge: 1
      Preis: 1000.00 EUR
    `,
    extractedData: {
      invoiceNumber: '2024-001', // Same as inv-001
      date: '2024-01-15',
      amount: 1190.00,
      currency: 'EUR'
    },
    metadata: {
      source: 'email_attachment',
      extractedAt: '2024-01-17T14:00:00Z',
      processingId: 'proc-004'
    }
  },

  // Invoice #5 - Second Supplier GmbH invoice (should apply learned serviceDate mapping)
  {
    id: 'inv-005',
    vendor: 'Supplier GmbH',
    rawText: `
      Rechnung Nr: 2024-005
      Datum: 2024-01-20
      Leistungsdatum: 2024-01-18
      
      Artikel: Consulting Services
      Menge: 8
      Preis: 125.00 EUR
    `,
    extractedData: {
      invoiceNumber: '2024-005',
      date: '2024-01-20',
      // serviceDate missing again - should be auto-corrected from memory
      amount: 1000.00,
      currency: 'EUR',
      lineItems: [{
        description: 'Consulting Services',
        quantity: 8,
        unitPrice: 125.00,
        totalPrice: 1000.00
      }]
    },
    metadata: {
      source: 'email_attachment',
      extractedAt: '2024-01-20T09:00:00Z',
      processingId: 'proc-005'
    }
  }
];

// Human feedback for learning
const humanFeedbacks: HumanFeedback[] = [
  // Feedback for Invoice #1 - Teach serviceDate mapping
  {
    invoiceId: 'inv-001',
    corrections: [
      {
        field: 'serviceDate',
        correctedValue: '2024-01-10',
        reason: 'Leistungsdatum should map to serviceDate field'
      }
    ],
    approved: false, // This was a correction, not approval
    comments: 'Supplier GmbH always uses "Leistungsdatum" for service date',
    timestamp: '2024-01-15T10:30:00Z'
  },

  // Feedback for Invoice #2 - Teach VAT included detection
  {
    invoiceId: 'inv-002',
    corrections: [
      {
        field: 'vatIncluded',
        correctedValue: true,
        reason: 'MwSt. inkl. and Prices incl. VAT indicate VAT is included'
      },
      {
        field: 'currency',
        correctedValue: 'EUR',
        reason: 'Parts AG typically uses EUR, infer from context'
      }
    ],
    approved: false,
    comments: 'Parts AG always includes VAT in their prices',
    timestamp: '2024-01-16T11:30:00Z'
  },

  // Feedback for Invoice #3 - Teach SKU mapping and Skonto detection
  {
    invoiceId: 'inv-003',
    corrections: [
      {
        field: 'lineItems',
        correctedValue: [{
          description: 'Freight Services - Standard Delivery',
          quantity: 1,
          totalPrice: 150.00,
          sku: 'FREIGHT'
        }],
        reason: 'Freight services should always map to SKU FREIGHT'
      }
    ],
    approved: false,
    comments: 'Freight & Co descriptions should map to FREIGHT SKU, and Skonto terms noted',
    timestamp: '2024-01-17T12:30:00Z'
  }
];

async function runDemo(): Promise<void> {
  console.log('🚀 Memory-Driven Invoice Intelligence Demo');
  console.log('==========================================\n');

  // Clear existing database for consistent demo results
  try {
    const fs = require('fs');
    if (fs.existsSync('./demo_memory.db')) {
      fs.unlinkSync('./demo_memory.db');
    }
  } catch (error) {
    // Ignore if file doesn't exist
  }

  const intelligence = new MemoryDrivenInvoiceIntelligence('./demo_memory.db');
  await intelligence.initialize();

  try {
    // Process invoices and show learning progression
    for (let i = 0; i < sampleInvoices.length; i++) {
      const invoice = sampleInvoices[i];
      
      console.log(`📄 Processing Invoice #${i + 1}: ${invoice.id} (${invoice.vendor})`);
      console.log(`Raw text preview: ${invoice.rawText.substring(0, 100).trim()}...`);
      
      const result = await intelligence.processInvoice(invoice);
      
      console.log(`\n📊 Processing Result:`);
      console.log(`   Requires Human Review: ${result.requiresHumanReview ? '❌ YES' : '✅ NO'}`);
      console.log(`   Confidence Score: ${(result.confidenceScore * 100).toFixed(1)}%`);
      console.log(`   Proposed Corrections: ${result.proposedCorrections.length}`);
      console.log(`   Reasoning: ${result.reasoning}`);
      
      if (result.proposedCorrections.length > 0) {
        console.log(`\n🔧 Proposed Corrections:`);
        result.proposedCorrections.forEach(correction => {
          console.log(`   • ${correction.field}: ${correction.originalValue} → ${correction.proposedValue}`);
          console.log(`     Confidence: ${(correction.confidence * 100).toFixed(1)}% | Reason: ${correction.reasoning}`);
        });
      }

      console.log(`\n📝 Audit Trail:`);
      result.auditTrail.forEach(entry => {
        const confidenceStr = entry.confidence ? ` (${(entry.confidence * 100).toFixed(1)}%)` : '';
        console.log(`   ${entry.step.toUpperCase()}${confidenceStr}: ${entry.details}`);
      });

      // Apply human feedback for first 3 invoices to teach the system
      if (i < 3 && humanFeedbacks[i]) {
        console.log(`\n👤 Applying Human Feedback...`);
        await intelligence.provideFeedback(humanFeedbacks[i]);
        
        console.log(`   Corrections applied:`);
        humanFeedbacks[i].corrections.forEach(correction => {
          console.log(`   • ${correction.field}: ${correction.correctedValue} (${correction.reason})`);
        });
      }

      console.log('\n' + '='.repeat(80) + '\n');
    }

    // Demonstrate learning by processing a similar invoice
    console.log('🧠 LEARNING DEMONSTRATION');
    console.log('=========================\n');
    
    console.log('Processing Invoice #5 again to show learned behavior...\n');
    
    const learningResult = await intelligence.processInvoice(sampleInvoices[4]);
    
    console.log(`📊 Learning Result:`);
    console.log(`   Requires Human Review: ${learningResult.requiresHumanReview ? '❌ YES' : '✅ NO'}`);
    console.log(`   Confidence Score: ${(learningResult.confidenceScore * 100).toFixed(1)}%`);
    console.log(`   Proposed Corrections: ${learningResult.proposedCorrections.length}`);
    
    if (learningResult.proposedCorrections.length > 0) {
      console.log(`\n🎯 Learned Corrections Applied:`);
      learningResult.proposedCorrections.forEach(correction => {
        console.log(`   • ${correction.field}: ${correction.originalValue} → ${correction.proposedValue}`);
        console.log(`     Memory Source: ${correction.memorySource}`);
        console.log(`     Reasoning: ${correction.reasoning}`);
      });
    }

    console.log('\n✅ Demo completed successfully!');
    console.log('\nKey Learning Outcomes:');
    console.log('• Supplier GmbH: "Leistungsdatum" → serviceDate mapping learned');
    console.log('• Parts AG: VAT included detection from German text');
    console.log('• Freight & Co: SKU mapping and Skonto term recognition');
    console.log('• Duplicate detection prevents memory pollution');
    console.log('• Confidence increases with successful pattern recognition');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await intelligence.close();
  }
}

// Run the demo
if (require.main === module) {
  runDemo().catch(console.error);
}

export { runDemo };