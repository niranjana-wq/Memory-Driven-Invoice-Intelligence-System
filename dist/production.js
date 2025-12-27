#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startProduction = startProduction;
const server_1 = require("./api/server");
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
async function startProduction() {
    try {
        // Load and validate configuration
        const config = (0, config_1.getConfig)();
        const configErrors = (0, config_1.validateConfig)(config);
        if (configErrors.length > 0) {
            logger_1.logger.error('Configuration validation failed', { errors: configErrors });
            process.exit(1);
        }
        logger_1.logger.info('Starting Memory-Driven Invoice Intelligence System', {
            version: process.env.npm_package_version || '1.0.0',
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development'
        });
        // Initialize API server
        const api = new server_1.InvoiceIntelligenceAPI(config.server.port, config.database.path);
        // Graceful shutdown handling
        const shutdown = async (signal) => {
            logger_1.logger.info(`Received ${signal}, shutting down gracefully`);
            try {
                await api.stop();
                logger_1.logger.info('Application stopped successfully');
                process.exit(0);
            }
            catch (error) {
                logger_1.logger.error('Error during shutdown', { error: error instanceof Error ? error.message : error });
                process.exit(1);
            }
        };
        // Register signal handlers
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('Uncaught exception', { error: error.message, stack: error.stack });
            process.exit(1);
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('Unhandled rejection', { reason, promise });
            process.exit(1);
        });
        // Start the server
        await api.start();
        logger_1.logger.info('System started successfully', {
            port: config.server.port,
            database: config.database.path,
            thresholds: config.intelligence.thresholds
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start application', {
            error: error instanceof Error ? error.message : error
        });
        process.exit(1);
    }
}
// Start the application if this file is run directly
if (require.main === module) {
    startProduction();
}
//# sourceMappingURL=production.js.map