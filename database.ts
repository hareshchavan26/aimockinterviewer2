// Database connection utilities
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

export const createDatabaseUrl = (config: DatabaseConfig): string => {
  const { host, port, database, username, password, ssl } = config;
  const sslParam = ssl ? '?sslmode=require' : '';
  return `postgresql://${username}:${password}@${host}:${port}/${database}${sslParam}`;
};

// Query utilities
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

export const buildPaginationQuery = (
  baseQuery: string,
  options: PaginationOptions
): { query: string; offset: number } => {
  const { page, limit, sortBy, sortOrder = 'ASC' } = options;
  const offset = (page - 1) * limit;
  
  let query = baseQuery;
  
  if (sortBy) {
    query += ` ORDER BY ${sortBy} ${sortOrder}`;
  }
  
  query += ` LIMIT ${limit} OFFSET ${offset}`;
  
  return { query, offset };
};

export const createPaginatedResult = <T>(
  data: T[],
  total: number,
  options: PaginationOptions
): PaginatedResult<T> => {
  const { page, limit } = options;
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

// Transaction utilities
export type TransactionCallback<T> = (client: any) => Promise<T>;

export interface TransactionOptions {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  timeout?: number;
}

// Migration utilities
export interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
  createdAt: Date;
}

export const createMigrationId = (): string => {
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  return timestamp;
};

// Connection pool utilities
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

export const defaultPoolConfig: PoolConfig = {
  min: 2,
  max: 10,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200,
};

// Error handling utilities
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public constraint?: string,
    public detail?: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export const handleDatabaseError = (error: any): DatabaseError => {
  // PostgreSQL error codes
  switch (error.code) {
    case '23505': // unique_violation
      return new DatabaseError(
        'Duplicate entry found',
        error.code,
        error.constraint,
        error.detail
      );
    case '23503': // foreign_key_violation
      return new DatabaseError(
        'Referenced record not found',
        error.code,
        error.constraint,
        error.detail
      );
    case '23502': // not_null_violation
      return new DatabaseError(
        'Required field is missing',
        error.code,
        error.constraint,
        error.detail
      );
    case '42P01': // undefined_table
      return new DatabaseError(
        'Table does not exist',
        error.code,
        undefined,
        error.detail
      );
    default:
      return new DatabaseError(
        error.message || 'Database operation failed',
        error.code,
        error.constraint,
        error.detail
      );
  }
};

// Query builder utilities
export class QueryBuilder {
  private query: string = '';
  private params: any[] = [];
  private paramCount: number = 0;

  select(columns: string | string[]): this {
    const cols = Array.isArray(columns) ? columns.join(', ') : columns;
    this.query += `SELECT ${cols}`;
    return this;
  }

  from(table: string): this {
    this.query += ` FROM ${table}`;
    return this;
  }

  where(condition: string, value?: any): this {
    const prefix = this.query.includes('WHERE') ? ' AND' : ' WHERE';
    
    if (value !== undefined) {
      this.paramCount++;
      this.query += `${prefix} ${condition.replace('?', `$${this.paramCount}`)}`;
      this.params.push(value);
    } else {
      this.query += `${prefix} ${condition}`;
    }
    
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.query += ` ORDER BY ${column} ${direction}`;
    return this;
  }

  limit(count: number): this {
    this.query += ` LIMIT ${count}`;
    return this;
  }

  offset(count: number): this {
    this.query += ` OFFSET ${count}`;
    return this;
  }

  build(): { query: string; params: any[] } {
    return {
      query: this.query,
      params: this.params,
    };
  }
}