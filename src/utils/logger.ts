export enum LogLevel {
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

export class Logger {
  private level: LogLevel;
  private format: 'json' | 'text';

  constructor(level: string = 'info', format: 'json' | 'text' = 'json') {
    this.level = this.parseLevel(level);
    this.format = format;
  }

  private parseLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  private formatMessage(level: string, message: string, metadata?: any, correlationId?: string): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(metadata && { metadata }),
      ...(correlationId && { correlationId })
    };

    if (this.format === 'json') {
      return JSON.stringify(entry);
    } else {
      const metaStr = metadata ? ` | ${JSON.stringify(metadata)}` : '';
      const corrStr = correlationId ? ` [${correlationId}]` : '';
      return `${entry.timestamp} [${level.toUpperCase()}]${corrStr}: ${message}${metaStr}`;
    }
  }

  error(message: string, metadata?: any, correlationId?: string): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('error', message, metadata, correlationId));
    }
  }

  warn(message: string, metadata?: any, correlationId?: string): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('warn', message, metadata, correlationId));
    }
  }

  info(message: string, metadata?: any, correlationId?: string): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('info', message, metadata, correlationId));
    }
  }

  debug(message: string, metadata?: any, correlationId?: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('debug', message, metadata, correlationId));
    }
  }

  // Specialized logging methods for invoice processing
  invoiceProcessed(invoiceId: string, vendor: string, confidence: number, requiresReview: boolean, correlationId?: string): void {
    this.info('Invoice processed', {
      invoiceId,
      vendor,
      confidence,
      requiresReview,
      action: requiresReview ? 'escalated' : 'auto-processed'
    }, correlationId);
  }

  memoryCreated(memoryType: string, vendor: string, confidence: number, correlationId?: string): void {
    this.info('Memory created', {
      memoryType,
      vendor,
      confidence
    }, correlationId);
  }

  memoryApplied(memoryId: string, field: string, confidence: number, correlationId?: string): void {
    this.debug('Memory applied', {
      memoryId,
      field,
      confidence
    }, correlationId);
  }

  feedbackProcessed(invoiceId: string, correctionsCount: number, approved: boolean, correlationId?: string): void {
    this.info('Human feedback processed', {
      invoiceId,
      correctionsCount,
      approved
    }, correlationId);
  }

  apiRequest(method: string, path: string, statusCode: number, duration: number, correlationId?: string): void {
    this.info('API request', {
      method,
      path,
      statusCode,
      duration
    }, correlationId);
  }
}

// Global logger instance
export const logger = new Logger(
  process.env.LOG_LEVEL || 'info',
  (process.env.LOG_FORMAT as 'json' | 'text') || 'json'
);