export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
    maxConnections?: number;
    connectionTimeout?: number;
}
export declare const createDatabaseUrl: (config: DatabaseConfig) => string;
export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
    command: string;
}
export interface PaginationOptions {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}
export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
export declare const buildPaginationQuery: (baseQuery: string, options: PaginationOptions) => {
    query: string;
    offset: number;
};
export declare const createPaginatedResult: <T>(data: T[], total: number, options: PaginationOptions) => PaginatedResult<T>;
export type TransactionCallback<T> = (client: any) => Promise<T>;
export interface TransactionOptions {
    isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
    timeout?: number;
}
export interface Migration {
    id: string;
    name: string;
    up: string;
    down: string;
    createdAt: Date;
}
export declare const createMigrationId: () => string;
export interface PoolConfig {
    min: number;
    max: number;
    acquireTimeoutMillis: number;
    createTimeoutMillis: number;
    destroyTimeoutMillis: number;
    idleTimeoutMillis: number;
    reapIntervalMillis: number;
    createRetryIntervalMillis: number;
}
export declare const defaultPoolConfig: PoolConfig;
export declare class DatabaseError extends Error {
    code?: string | undefined;
    constraint?: string | undefined;
    detail?: string | undefined;
    constructor(message: string, code?: string | undefined, constraint?: string | undefined, detail?: string | undefined);
}
export declare const handleDatabaseError: (error: any) => DatabaseError;
export declare class QueryBuilder {
    private query;
    private params;
    private paramCount;
    select(columns: string | string[]): this;
    from(table: string): this;
    where(condition: string, value?: any): this;
    orderBy(column: string, direction?: 'ASC' | 'DESC'): this;
    limit(count: number): this;
    offset(count: number): this;
    build(): {
        query: string;
        params: any[];
    };
}
