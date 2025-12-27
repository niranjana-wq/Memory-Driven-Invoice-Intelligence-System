"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
exports.validateConfig = validateConfig;
const defaultConfig = {
    server: {
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || 'localhost',
        cors: {
            origins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
        }
    },
    database: {
        path: process.env.DB_PATH || './production_memory.db',
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
        timeout: parseInt(process.env.DB_TIMEOUT || '30000')
    },
    intelligence: {
        thresholds: {
            autoAccept: parseFloat(process.env.THRESHOLD_AUTO_ACCEPT || '0.85'),
            autoCorrect: parseFloat(process.env.THRESHOLD_AUTO_CORRECT || '0.65'),
            escalate: parseFloat(process.env.THRESHOLD_ESCALATE || '0.4'),
            memoryApplication: parseFloat(process.env.THRESHOLD_MEMORY_APPLICATION || '0.5')
        },
        memoryConfig: {
            confidenceDecayRate: parseFloat(process.env.MEMORY_DECAY_RATE || '0.95'),
            maxConfidenceIncrease: parseFloat(process.env.MEMORY_MAX_INCREASE || '0.1'),
            minConfidence: parseFloat(process.env.MEMORY_MIN_CONFIDENCE || '0.1'),
            maxConfidence: parseFloat(process.env.MEMORY_MAX_CONFIDENCE || '0.95'),
            decayAfterDays: parseInt(process.env.MEMORY_DECAY_AFTER_DAYS || '7')
        }
    },
    security: {
        rateLimit: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX || '100')
        },
        maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
        maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE || '50')
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json'
    }
};
function getConfig() {
    return defaultConfig;
}
function validateConfig(config) {
    const errors = [];
    if (config.server.port < 1 || config.server.port > 65535) {
        errors.push('Server port must be between 1 and 65535');
    }
    if (config.intelligence.thresholds.autoAccept < 0 || config.intelligence.thresholds.autoAccept > 1) {
        errors.push('Auto-accept threshold must be between 0 and 1');
    }
    if (config.intelligence.thresholds.autoCorrect < 0 || config.intelligence.thresholds.autoCorrect > 1) {
        errors.push('Auto-correct threshold must be between 0 and 1');
    }
    if (config.intelligence.thresholds.escalate < 0 || config.intelligence.thresholds.escalate > 1) {
        errors.push('Escalate threshold must be between 0 and 1');
    }
    if (config.intelligence.memoryConfig.minConfidence >= config.intelligence.memoryConfig.maxConfidence) {
        errors.push('Min confidence must be less than max confidence');
    }
    return errors;
}
//# sourceMappingURL=index.js.map