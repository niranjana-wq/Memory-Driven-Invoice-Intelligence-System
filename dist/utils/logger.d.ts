export declare enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
}
export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    metadata?: any;
    correlationId?: string;
}
export declare class Logger {
    private level;
    private format;
    constructor(level?: string, format?: 'json' | 'text');
    private parseLevel;
    private shouldLog;
    private formatMessage;
    error(message: string, metadata?: any, correlationId?: string): void;
    warn(message: string, metadata?: any, correlationId?: string): void;
    info(message: string, metadata?: any, correlationId?: string): void;
    debug(message: string, metadata?: any, correlationId?: string): void;
    invoiceProcessed(invoiceId: string, vendor: string, confidence: number, requiresReview: boolean, correlationId?: string): void;
    memoryCreated(memoryType: string, vendor: string, confidence: number, correlationId?: string): void;
    memoryApplied(memoryId: string, field: string, confidence: number, correlationId?: string): void;
    feedbackProcessed(invoiceId: string, correctionsCount: number, approved: boolean, correlationId?: string): void;
    apiRequest(method: string, path: string, statusCode: number, duration: number, correlationId?: string): void;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map