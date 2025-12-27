export declare class InvoiceIntelligenceAPI {
    private app;
    private intelligence;
    private port;
    constructor(port?: number, dbPath?: string);
    private setupMiddleware;
    private setupRoutes;
    private validateInvoice;
    private validateFeedback;
    start(): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=server.d.ts.map