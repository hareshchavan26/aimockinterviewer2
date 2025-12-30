import { Pool } from 'pg';
import { createClient } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';
// PostgreSQL connection
export class DatabaseConnection {
    pool;
    static instance;
    constructor() {
        this.pool = new Pool({
            host: config.database.host,
            port: config.database.port,
            database: config.database.database,
            user: config.database.username,
            password: config.database.password,
            ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        this.pool.on('error', (err) => {
            logger.error('Unexpected error on idle client', err);
        });
    }
    static getInstance() {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }
    async getClient() {
        return this.pool.connect();
    }
    async query(text, params) {
        const start = Date.now();
        try {
            const res = await this.pool.query(text, params);
            const duration = Date.now() - start;
            logger.debug('Executed query', { text, duration, rows: res.rowCount });
            return res;
        }
        catch (error) {
            logger.error('Database query error', { text, params, error });
            throw error;
        }
    }
    async transaction(callback) {
        const client = await this.getClient();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async close() {
        await this.pool.end();
    }
}
// Redis connection
export class RedisConnection {
    client;
    static instance;
    constructor() {
        this.client = createClient({
            socket: {
                host: config.redis.host,
                port: config.redis.port,
            },
            password: config.redis.password,
            database: config.redis.db,
        });
        this.client.on('error', (err) => {
            logger.error('Redis client error', err);
        });
        this.client.on('connect', () => {
            logger.info('Redis client connected');
        });
        this.client.on('ready', () => {
            logger.info('Redis client ready');
        });
        this.client.on('end', () => {
            logger.info('Redis client disconnected');
        });
    }
    static getInstance() {
        if (!RedisConnection.instance) {
            RedisConnection.instance = new RedisConnection();
        }
        return RedisConnection.instance;
    }
    async connect() {
        if (!this.client.isOpen) {
            await this.client.connect();
        }
    }
    getClient() {
        return this.client;
    }
    async set(key, value, ttl) {
        if (ttl) {
            await this.client.setEx(key, ttl, value);
        }
        else {
            await this.client.set(key, value);
        }
    }
    async get(key) {
        return this.client.get(key);
    }
    async del(key) {
        await this.client.del(key);
    }
    async exists(key) {
        const result = await this.client.exists(key);
        return result === 1;
    }
    async close() {
        if (this.client.isOpen) {
            await this.client.quit();
        }
    }
}
// Initialize connections
export const db = DatabaseConnection.getInstance();
export const redis = RedisConnection.getInstance();
