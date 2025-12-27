import { Memory, MemoryQuery } from '../types';
export declare class MemoryDatabase {
    private db;
    private dbRun;
    private dbGet;
    private dbAll;
    constructor(dbPath?: string);
    initialize(): Promise<void>;
    private createTables;
    saveMemory(memory: Memory): Promise<void>;
    queryMemories(query: MemoryQuery): Promise<Memory[]>;
    private rowToMemory;
    updateMemoryUsage(memoryId: string): Promise<void>;
    updateMemoryConfidence(memoryId: string, newConfidence: number): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=database.d.ts.map