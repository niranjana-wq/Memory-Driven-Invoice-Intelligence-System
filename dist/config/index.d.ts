import { DecisionThresholds } from '../types';
export interface AppConfig {
    server: {
        port: number;
        host: string;
        cors: {
            origins: string[];
        };
    };
    database: {
        path: string;
        maxConnections: number;
        timeout: number;
    };
    intelligence: {
        thresholds: DecisionThresholds;
        memoryConfig: {
            confidenceDecayRate: number;
            maxConfidenceIncrease: number;
            minConfidence: number;
            maxConfidence: number;
            decayAfterDays: number;
        };
    };
    security: {
        rateLimit: {
            windowMs: number;
            max: number;
        };
        maxRequestSize: string;
        maxBatchSize: number;
    };
    logging: {
        level: 'error' | 'warn' | 'info' | 'debug';
        format: 'json' | 'text';
    };
}
export declare function getConfig(): AppConfig;
export declare function validateConfig(config: AppConfig): string[];
//# sourceMappingURL=index.d.ts.map