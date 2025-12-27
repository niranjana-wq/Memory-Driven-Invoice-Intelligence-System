# Memory-Driven Invoice Intelligence System

A production-grade AI system for enterprise invoice automation that learns from human corrections and improves over time without ML training.

## 🎯 Product Objective

Build a Persistent Memory Layer that increases invoice automation rates by:
- Remembering vendor-specific and pattern-specific corrections
- Applying learnings cautiously and explainably to new invoices
- Deciding when to auto-accept, auto-correct, or escalate
- Learning continuously from human feedback without bad memory dominance

## 🏗️ System Architecture & Design

### Memory as First-Class System
The system treats memory as a persistent, queryable subsystem, not logs or configs. Memory persists across application restarts and tracks confidence, frequency, decay, and audit metadata.

#### 1. Vendor Memory
Captures stable, vendor-specific conventions:
- **Supplier GmbH**: "Leistungsdatum" → serviceDate mapping
- **Parts AG**: "MwSt. inkl." detection for VAT-included prices  
- **Freight & Co**: Description → SKU FREIGHT mapping

**Attributes stored:**
- Trigger signal (text phrase, missing field, description)
- Action (field mapping, computation strategy)
- Confidence score (0.0-1.0)
- Usage count and last applied timestamp

#### 2. Correction Memory
Learns from repeated human corrections:
- Tracks how often the same correction occurs
- Increases confidence with repetition
- Decreases confidence when rejected
- Prevents incorrect heuristics from dominating

#### 3. Resolution Memory
Tracks outcomes, not just actions:
- Human approved auto-suggested correction
- Human rejected system suggestion
- Invoice escalated despite memory available
- Influences future decision thresholds

### Decision Pipeline (Mandatory Architecture)

Each invoice passes through 4 explicit stages, each logged in audit trail:

#### Step 1: RECALL
Retrieve relevant memories by:
- Vendor name matching
- Field anomalies detection
- Raw text signal matching
- Structural similarities (same SKU, PO, issue type)

#### Step 2: APPLY
Propose corrections using memory only if confidence ≥ threshold:
- Never overwrite original values silently
- Attach memory references to each proposed action
- Apply gradual confidence reinforcement
- Penalize conflicting memories

#### Step 3: DECIDE
Choose exactly one outcome based on deterministic rules:
- **Auto-accept** (≥85% confidence, no corrections needed)
- **Auto-correct** (≥65% confidence, explainable corrections)
- **Escalate** (<40% confidence or conflicting memory)

Decision rules:
- Prefer escalation over incorrect automation
- Penalize conflicting memories
- Be deterministic and explainable

#### Step 4: LEARN
After human feedback:
- Reinforce memory if approved
- Weaken or decay memory if rejected
- Prevent duplicate invoices from polluting memory
- Create new memories for novel patterns

## 🧠 Intelligence Logic

### Confidence & Safety Design

**Confidence Calculation:**
```typescript
// Gradual reinforcement
newConfidence = Math.min(currentConfidence + 0.1, 0.95);

// Decay for unused memories
decayedConfidence = confidence * Math.pow(0.95, daysSinceLastUse - 7);

// Conflict penalty
conflictAdjustedConfidence = confidence * 0.7;
```

**Safety Mechanisms:**
- Track confidence numerically (0.0–1.0)
- Increase confidence gradually (no instant certainty)
- Apply decay to unused memories
- Cap influence of any single memory
- Block learning from duplicate invoices

### Memory Application Logic

**Vendor Memory Application:**
```typescript
// Field mapping example
if (triggerSignal === 'Leistungsdatum' && action.type === 'field_mapping') {
  const match = rawText.match(/Leistungsdatum:\s*(\d{4}-\d{2}-\d{2})/);
  if (match) proposedValue = match[1];
}

// VAT inclusion detection
if (action.strategy === 'vat_included_detection') {
  const vatPattern = /MwSt\.\s*inkl\.|Prices\s*incl\.\s*VAT/i;
  if (vatPattern.test(rawText)) proposedValue = true;
}
```

**Decision Thresholds:**
- **Auto-Accept**: ≥85% confidence, no corrections needed
- **Auto-Correct**: ≥65% confidence, reliable corrections
- **Escalate**: <40% confidence or risk factors detected

**Risk Assessment:**
- High-value corrections (financial impact)
- Low confidence corrections (<60%)
- Multiple corrections (>3 changes)
- Conflicting memory patterns

## 🔄 Learning Mechanism

### Memory Creation
```typescript
// Create vendor memory from human correction
const vendorMemory: VendorMemory = {
  id: generateId(),
  type: 'vendor',
  vendor: 'Supplier GmbH',
  triggerSignal: 'Leistungsdatum',
  action: {
    type: 'field_mapping',
    targetField: 'serviceDate',
    strategy: 'extract_from_text'
  },
  confidence: 0.7, // Initial confidence
  usageCount: 1,
  createdAt: new Date().toISOString()
};
```

### Memory Reinforcement
```typescript
// Successful application increases confidence
await memoryManager.reinforceMemory(memoryId, 0.02);

// Rejection decreases confidence
await memoryManager.weakenMemory(memoryId, 0.05);

// Automatic decay over time
if (daysSinceLastUse > 7) {
  confidence *= Math.pow(0.95, daysSinceLastUse - 7);
}
```

### Duplicate Prevention
```typescript
// Check for duplicate invoices
const isDuplicate = await checkDuplicate(invoice.vendor, invoice.extractedData.invoiceNumber);
if (isDuplicate) {
  return { requiresHumanReview: true, reasoning: 'Duplicate invoice detected' };
}
```

## 📊 Explainability & Auditability

Every invoice produces fully explainable output:

```json
{
  "normalizedInvoice": { "serviceDate": "2024-01-10", "..." : "..." },
  "proposedCorrections": [
    {
      "field": "serviceDate",
      "originalValue": null,
      "proposedValue": "2024-01-10",
      "confidence": 0.85,
      "memorySource": "mem-123",
      "reasoning": "Vendor memory: Leistungsdatum → serviceDate (field_mapping)"
    }
  ],
  "requiresHumanReview": false,
  "reasoning": "Good confidence (0.850) with reliable corrections - AUTO-CORRECT",
  "confidenceScore": 0.85,
  "memoryUpdates": [
    {
      "type": "reinforce",
      "memoryId": "mem-123", 
      "details": "Applied memory for serviceDate correction"
    }
  ],
  "auditTrail": [
    {
      "step": "recall",
      "timestamp": "2024-01-15T10:00:00Z",
      "details": "Retrieved 2 relevant memories for vendor Supplier GmbH",
      "memoryReferences": ["mem-123", "mem-124"]
    },
    {
      "step": "apply",
      "timestamp": "2024-01-15T10:00:01Z", 
      "details": "Applied 1 corrections with overall confidence 0.850",
      "confidence": 0.85
    },
    {
      "step": "decide",
      "timestamp": "2024-01-15T10:00:02Z",
      "details": "Decision: AUTO-PROCESS - Good confidence with reliable corrections",
      "confidence": 0.85
    },
    {
      "step": "learn",
      "timestamp": "2024-01-15T10:00:03Z",
      "details": "Reinforced memory mem-123 due to successful application"
    }
  ]
}
```

## 🚀 Quick Start

### Basic Usage
```bash
# Install and build
npm install
npm run build

# Run demonstration
npm run demo

# Start production server
npm start

# Development mode
npm run dev
```

### Demo Results
The demo demonstrates learning progression:

**Invoice #1 (Supplier GmbH)**
- Initial: Missing serviceDate field flagged
- Human Correction: "Leistungsdatum" → serviceDate mapping
- Learning: Vendor memory created with 70% confidence

**Invoice #2 (Parts AG)**
- Initial: VAT inclusion unclear
- Human Correction: "MwSt. inkl." → vatIncluded=true
- Learning: Text pattern recognition established

**Subsequent Processing**
- Automatic serviceDate correction applied (85% confidence)
- Auto-correct decision with full explainability
- Memory reinforcement increases future confidence

## 🔧 API Endpoints

### Core Processing
```bash
# Process single invoice
POST /api/invoices/process
Content-Type: application/json
{
  "invoice": {
    "id": "inv-001",
    "vendor": "Supplier GmbH", 
    "rawText": "Rechnung Nr: 2024-001...",
    "extractedData": { "invoiceNumber": "2024-001", "..." }
  }
}

# Process multiple invoices
POST /api/invoices/batch
{
  "invoices": [...],
  "maxBatchSize": 50
}

# Submit human feedback
POST /api/feedback
{
  "invoiceId": "inv-001",
  "corrections": [
    {
      "field": "serviceDate",
      "correctedValue": "2024-01-10",
      "reason": "Leistungsdatum should map to serviceDate"
    }
  ],
  "approved": false,
  "comments": "Vendor-specific pattern"
}
```

### Monitoring
```bash
# System health
GET /health
# Returns: {"status":"healthy","version":"1.0.0","uptime":3600}

# Processing metrics  
GET /api/metrics
# Returns: automation rates, confidence scores, memory effectiveness

# Vendor-specific metrics
GET /api/metrics/vendor/Supplier%20GmbH
```

## 🐳 Docker Deployment

```bash
# Build and run with Docker
docker build -t invoice-intelligence .
docker run -p 3000:3000 invoice-intelligence

# Or use Docker Compose
docker-compose up -d
```

### Environment Configuration
```bash
# Server settings
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://yourdomain.com

# Database
DB_PATH=/app/data/production_memory.db

# Intelligence thresholds
THRESHOLD_AUTO_ACCEPT=0.85
THRESHOLD_AUTO_CORRECT=0.65
THRESHOLD_ESCALATE=0.4
THRESHOLD_MEMORY_APPLICATION=0.5

# Security
RATE_LIMIT_MAX=100
MAX_BATCH_SIZE=50

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## 📝 Technical Specifications

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js 16+
- **Database**: SQLite (production-ready)
- **Architecture**: Memory-centric decision system
- **Determinism**: 100% reproducible results
- **Explainability**: Complete reasoning chain for every decision
- **Security**: Rate limiting, CORS, input validation, Helmet.js
- **Monitoring**: Structured logging, health checks, metrics collection
- **Scalability**: Horizontal scaling support, stateless design

## 🏢 Enterprise Features

### Production Readiness
- **RESTful API** with comprehensive endpoints
- **Docker containerization** for easy deployment
- **Configuration management** via environment variables
- **Structured logging** with correlation IDs
- **Health monitoring** and metrics collection
- **Security middleware** (CORS, rate limiting, helmet)
- **Graceful shutdown** handling

### Compliance & Auditability
- **Full audit trails** for regulatory requirements
- **Deterministic decisions** (no black box AI)
- **Data retention policies** configurable
- **GDPR compliance** ready
- **Complete explainability** for every decision

### Integration & Scalability
- **Horizontal scaling** with load balancers
- **Database clustering** (PostgreSQL support)
- **Container orchestration** (Kubernetes ready)
- **Microservice architecture** compatible
- **Webhook support** for real-time notifications
- **Export capabilities** for reporting

This system is designed as a product-grade solution for enterprise invoice automation, providing continuous improvement while maintaining full explainability and safety through its memory-driven approach.