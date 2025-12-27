"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceProcessor = exports.MemoryManager = exports.MemoryDrivenInvoiceIntelligence = void 0;
const manager_1 = require("./memory/manager");
const processor_1 = require("./intelligence/processor");
class MemoryDrivenInvoiceIntelligence {
    constructor(dbPath) {
        this.memoryManager = new manager_1.MemoryManager(dbPath);
        this.processor = new processor_1.InvoiceProcessor(this.memoryManager);
    }
    async initialize() {
        await this.memoryManager.initialize();
    }
    async processInvoice(invoice) {
        return await this.processor.processInvoice(invoice);
    }
    async provideFeedback(feedback) {
        await this.processor.processHumanFeedback(feedback);
    }
    async close() {
        await this.memoryManager.close();
    }
}
exports.MemoryDrivenInvoiceIntelligence = MemoryDrivenInvoiceIntelligence;
__exportStar(require("./types"), exports);
var manager_2 = require("./memory/manager");
Object.defineProperty(exports, "MemoryManager", { enumerable: true, get: function () { return manager_2.MemoryManager; } });
var processor_2 = require("./intelligence/processor");
Object.defineProperty(exports, "InvoiceProcessor", { enumerable: true, get: function () { return processor_2.InvoiceProcessor; } });
//# sourceMappingURL=index.js.map