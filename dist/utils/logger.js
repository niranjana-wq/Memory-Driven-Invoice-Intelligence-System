"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor(level = 'info', format = 'json') {
        this.level = this.parseLevel(level);
        this.format = format;
    }
    parseLevel(level) {
        switch (level.toLowerCase()) {
            case 'error': return LogLevel.ERROR;
            case 'warn': return LogLevel.WARN;
            case 'info': return LogLevel.INFO;
            case 'debug': return LogLevel.DEBUG;
            default: return LogLevel.INFO;
        }
    }
    shouldLog(level) {
        return level <= this.level;
    }
    formatMessage(level, message, metadata, correlationId) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...(metadata && { metadata }),
            ...(correlationId && { correlationId })
        };
        if (this.format === 'json') {
            return JSON.stringify(entry);
        }
        else {
            const metaStr = metadata ? ` | ${JSON.stringify(metadata)}` : '';
            const corrStr = correlationId ? ` [${correlationId}]` : '';
            return `${entry.timestamp} [${level.toUpperCase()}]${corrStr}: ${message}${metaStr}`;
        }
    }
    error(message, metadata, correlationId) {
        if (this.shouldLog(LogLevel.ERROR)) {
            console.error(this.formatMessage('error', message, metadata, correlationId));
        }
    }
    warn(message, metadata, correlationId) {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(this.formatMessage('warn', message, metadata, correlationId));
        }
    }
    info(message, metadata, correlationId) {
        if (this.shouldLog(LogLevel.INFO)) {
            console.log(this.formatMessage('info', message, metadata, correlationId));
        }
    }
    debug(message, metadata, correlationId) {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.log(this.formatMessage('debug', message, metadata, correlationId));
        }
    }
    // Specialized logging methods for invoice processing
    invoiceProcessed(invoiceId, vendor, confidence, requiresReview, correlationId) {
        this.info('Invoice processed', {
            invoiceId,
            vendor,
            confidence,
            requiresReview,
            action: requiresReview ? 'escalated' : 'auto-processed'
        }, correlationId);
    }
    memoryCreated(memoryType, vendor, confidence, correlationId) {
        this.info('Memory created', {
            memoryType,
            vendor,
            confidence
        }, correlationId);
    }
    memoryApplied(memoryId, field, confidence, correlationId) {
        this.debug('Memory applied', {
            memoryId,
            field,
            confidence
        }, correlationId);
    }
    feedbackProcessed(invoiceId, correctionsCount, approved, correlationId) {
        this.info('Human feedback processed', {
            invoiceId,
            correctionsCount,
            approved
        }, correlationId);
    }
    apiRequest(method, path, statusCode, duration, correlationId) {
        this.info('API request', {
            method,
            path,
            statusCode,
            duration
        }, correlationId);
    }
}
exports.Logger = Logger;
// Global logger instance
exports.logger = new Logger(process.env.LOG_LEVEL || 'info', process.env.LOG_FORMAT || 'json');
//# sourceMappingURL=logger.js.map