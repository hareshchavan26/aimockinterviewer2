export const createDatabaseUrl = (config) => {
    const { host, port, database, username, password, ssl } = config;
    const sslParam = ssl ? '?sslmode=require' : '';
    return `postgresql://${username}:${password}@${host}:${port}/${database}${sslParam}`;
};
export const buildPaginationQuery = (baseQuery, options) => {
    const { page, limit, sortBy, sortOrder = 'ASC' } = options;
    const offset = (page - 1) * limit;
    let query = baseQuery;
    if (sortBy) {
        query += ` ORDER BY ${sortBy} ${sortOrder}`;
    }
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    return { query, offset };
};
export const createPaginatedResult = (data, total, options) => {
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
export const createMigrationId = () => {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    return timestamp;
};
export const defaultPoolConfig = {
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
    code;
    constraint;
    detail;
    constructor(message, code, constraint, detail) {
        super(message);
        this.code = code;
        this.constraint = constraint;
        this.detail = detail;
        this.name = 'DatabaseError';
    }
}
export const handleDatabaseError = (error) => {
    // PostgreSQL error codes
    switch (error.code) {
        case '23505': // unique_violation
            return new DatabaseError('Duplicate entry found', error.code, error.constraint, error.detail);
        case '23503': // foreign_key_violation
            return new DatabaseError('Referenced record not found', error.code, error.constraint, error.detail);
        case '23502': // not_null_violation
            return new DatabaseError('Required field is missing', error.code, error.constraint, error.detail);
        case '42P01': // undefined_table
            return new DatabaseError('Table does not exist', error.code, undefined, error.detail);
        default:
            return new DatabaseError(error.message || 'Database operation failed', error.code, error.constraint, error.detail);
    }
};
// Query builder utilities
export class QueryBuilder {
    query = '';
    params = [];
    paramCount = 0;
    select(columns) {
        const cols = Array.isArray(columns) ? columns.join(', ') : columns;
        this.query += `SELECT ${cols}`;
        return this;
    }
    from(table) {
        this.query += ` FROM ${table}`;
        return this;
    }
    where(condition, value) {
        const prefix = this.query.includes('WHERE') ? ' AND' : ' WHERE';
        if (value !== undefined) {
            this.paramCount++;
            this.query += `${prefix} ${condition.replace('?', `$${this.paramCount}`)}`;
            this.params.push(value);
        }
        else {
            this.query += `${prefix} ${condition}`;
        }
        return this;
    }
    orderBy(column, direction = 'ASC') {
        this.query += ` ORDER BY ${column} ${direction}`;
        return this;
    }
    limit(count) {
        this.query += ` LIMIT ${count}`;
        return this;
    }
    offset(count) {
        this.query += ` OFFSET ${count}`;
        return this;
    }
    build() {
        return {
            query: this.query,
            params: this.params,
        };
    }
}
