"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryDatabase = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const util_1 = require("util");
class MemoryDatabase {
    constructor(dbPath = './memory.db') {
        this.db = new sqlite3_1.default.Database(dbPath);
        this.dbRun = (0, util_1.promisify)(this.db.run.bind(this.db));
        this.dbGet = (0, util_1.promisify)(this.db.get.bind(this.db));
        this.dbAll = (0, util_1.promisify)(this.db.all.bind(this.db));
    }
    async initialize() {
        await this.createTables();
    }
    async createTables() {
        // Base memory table
        await this.dbRun(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        vendor TEXT NOT NULL,
        confidence REAL NOT NULL,
        usage_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        last_used_at TEXT,
        last_updated_at TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1
      )
    `);
        // Vendor-specific memory
        await this.dbRun(`
      CREATE TABLE IF NOT EXISTS vendor_memories (
        memory_id TEXT PRIMARY KEY,
        trigger_signal TEXT NOT NULL,
        action_type TEXT NOT NULL,
        source_field TEXT,
        target_field TEXT NOT NULL,
        value TEXT,
        strategy TEXT,
        pattern TEXT NOT NULL,
        FOREIGN KEY (memory_id) REFERENCES memories (id)
      )
    `);
        // Correction memory
        await this.dbRun(`
      CREATE TABLE IF NOT EXISTS correction_memories (
        memory_id TEXT PRIMARY KEY,
        field_name TEXT NOT NULL,
        original_pattern TEXT NOT NULL,
        corrected_value TEXT NOT NULL,
        correction_reason TEXT NOT NULL,
        approval_count INTEGER DEFAULT 0,
        rejection_count INTEGER DEFAULT 0,
        FOREIGN KEY (memory_id) REFERENCES memories (id)
      )
    `);
        // Resolution memory
        await this.dbRun(`
      CREATE TABLE IF NOT EXISTS resolution_memories (
        memory_id TEXT PRIMARY KEY,
        scenario TEXT NOT NULL,
        outcome TEXT NOT NULL,
        human_feedback TEXT,
        system_action TEXT NOT NULL,
        FOREIGN KEY (memory_id) REFERENCES memories (id)
      )
    `);
        // Create indexes for performance
        await this.dbRun('CREATE INDEX IF NOT EXISTS idx_memories_vendor ON memories (vendor)');
        await this.dbRun('CREATE INDEX IF NOT EXISTS idx_memories_type ON memories (type)');
        await this.dbRun('CREATE INDEX IF NOT EXISTS idx_memories_confidence ON memories (confidence)');
        await this.dbRun('CREATE INDEX IF NOT EXISTS idx_vendor_trigger ON vendor_memories (trigger_signal)');
        await this.dbRun('CREATE INDEX IF NOT EXISTS idx_correction_field ON correction_memories (field_name)');
    }
    async saveMemory(memory) {
        const baseData = [
            memory.id,
            memory.type,
            memory.vendor,
            memory.confidence,
            memory.usageCount,
            memory.createdAt,
            memory.lastUsedAt,
            memory.lastUpdatedAt,
            memory.isActive ? 1 : 0
        ];
        await this.dbRun(`
      INSERT OR REPLACE INTO memories 
      (id, type, vendor, confidence, usage_count, created_at, last_used_at, last_updated_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, baseData);
        switch (memory.type) {
            case 'vendor':
                const vendorMem = memory;
                await this.dbRun(`
          INSERT OR REPLACE INTO vendor_memories
          (memory_id, trigger_signal, action_type, source_field, target_field, value, strategy, pattern)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
                    vendorMem.id,
                    vendorMem.triggerSignal,
                    vendorMem.action.type,
                    vendorMem.action.sourceField,
                    vendorMem.action.targetField,
                    JSON.stringify(vendorMem.action.value),
                    vendorMem.action.strategy,
                    vendorMem.pattern
                ]);
                break;
            case 'correction':
                const corrMem = memory;
                await this.dbRun(`
          INSERT OR REPLACE INTO correction_memories
          (memory_id, field_name, original_pattern, corrected_value, correction_reason, approval_count, rejection_count)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
                    corrMem.id,
                    corrMem.fieldName,
                    corrMem.originalPattern,
                    JSON.stringify(corrMem.correctedValue),
                    corrMem.correctionReason,
                    corrMem.approvalCount,
                    corrMem.rejectionCount
                ]);
                break;
            case 'resolution':
                const resMem = memory;
                await this.dbRun(`
          INSERT OR REPLACE INTO resolution_memories
          (memory_id, scenario, outcome, human_feedback, system_action)
          VALUES (?, ?, ?, ?, ?)
        `, [
                    resMem.id,
                    resMem.scenario,
                    resMem.outcome,
                    resMem.humanFeedback,
                    resMem.systemAction
                ]);
                break;
        }
    }
    async queryMemories(query) {
        let sql = `
      SELECT m.*, 
             vm.trigger_signal, vm.action_type, vm.source_field, vm.target_field, vm.value, vm.strategy, vm.pattern,
             cm.field_name, cm.original_pattern, cm.corrected_value, cm.correction_reason, cm.approval_count, cm.rejection_count,
             rm.scenario, rm.outcome, rm.human_feedback, rm.system_action
      FROM memories m
      LEFT JOIN vendor_memories vm ON m.id = vm.memory_id
      LEFT JOIN correction_memories cm ON m.id = cm.memory_id  
      LEFT JOIN resolution_memories rm ON m.id = rm.memory_id
      WHERE m.is_active = 1
    `;
        const params = [];
        if (query.vendor) {
            sql += ' AND m.vendor = ?';
            params.push(query.vendor);
        }
        if (query.type) {
            sql += ' AND m.type = ?';
            params.push(query.type);
        }
        if (query.fieldName) {
            sql += ' AND cm.field_name = ?';
            params.push(query.fieldName);
        }
        if (query.pattern) {
            sql += ' AND (vm.pattern LIKE ? OR cm.original_pattern LIKE ?)';
            params.push(`%${query.pattern}%`, `%${query.pattern}%`);
        }
        if (query.minConfidence) {
            sql += ' AND m.confidence >= ?';
            params.push(query.minConfidence);
        }
        sql += ' ORDER BY m.confidence DESC, m.usage_count DESC';
        if (query.limit) {
            sql += ' LIMIT ?';
            params.push(query.limit);
        }
        const rows = await this.dbAll(sql, params);
        return rows.map(row => this.rowToMemory(row));
    }
    rowToMemory(row) {
        const base = {
            id: row.id,
            vendor: row.vendor,
            confidence: row.confidence,
            usageCount: row.usage_count,
            createdAt: row.created_at,
            lastUsedAt: row.last_used_at,
            lastUpdatedAt: row.last_updated_at,
            isActive: row.is_active === 1
        };
        switch (row.type) {
            case 'vendor':
                return {
                    ...base,
                    type: 'vendor',
                    triggerSignal: row.trigger_signal,
                    action: {
                        type: row.action_type,
                        sourceField: row.source_field,
                        targetField: row.target_field,
                        value: row.value ? JSON.parse(row.value) : undefined,
                        strategy: row.strategy
                    },
                    pattern: row.pattern
                };
            case 'correction':
                return {
                    ...base,
                    type: 'correction',
                    fieldName: row.field_name,
                    originalPattern: row.original_pattern,
                    correctedValue: JSON.parse(row.corrected_value),
                    correctionReason: row.correction_reason,
                    approvalCount: row.approval_count,
                    rejectionCount: row.rejection_count
                };
            case 'resolution':
                return {
                    ...base,
                    type: 'resolution',
                    scenario: row.scenario,
                    outcome: row.outcome,
                    humanFeedback: row.human_feedback,
                    systemAction: row.system_action
                };
            default:
                throw new Error(`Unknown memory type: ${row.type}`);
        }
    }
    async updateMemoryUsage(memoryId) {
        const now = new Date().toISOString();
        await this.dbRun(`
      UPDATE memories 
      SET usage_count = usage_count + 1, last_used_at = ?, last_updated_at = ?
      WHERE id = ?
    `, [now, now, memoryId]);
    }
    async updateMemoryConfidence(memoryId, newConfidence) {
        const now = new Date().toISOString();
        await this.dbRun(`
      UPDATE memories 
      SET confidence = ?, last_updated_at = ?
      WHERE id = ?
    `, [newConfidence, now, memoryId]);
    }
    async close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
}
exports.MemoryDatabase = MemoryDatabase;
//# sourceMappingURL=database.js.map