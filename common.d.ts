export declare const capitalize: (str: string) => string;
export declare const camelCase: (str: string) => string;
export declare const kebabCase: (str: string) => string;
export declare const snakeCase: (str: string) => string;
export declare const truncate: (str: string, length: number, suffix?: string) => string;
export declare const chunk: <T>(array: T[], size: number) => T[][];
export declare const unique: <T>(array: T[]) => T[];
export declare const groupBy: <T, K extends keyof any>(array: T[], key: (item: T) => K) => Record<K, T[]>;
export declare const sortBy: <T>(array: T[], key: keyof T | ((item: T) => any), direction?: "asc" | "desc") => T[];
export declare const pick: <T extends object, K extends keyof T>(obj: T, keys: K[]) => Pick<T, K>;
export declare const omit: <T, K extends keyof T>(obj: T, keys: K[]) => Omit<T, K>;
export declare const deepClone: <T>(obj: T) => T;
export declare const isEmpty: (value: any) => boolean;
export declare const formatDate: (date: Date, format?: string) => string;
export declare const addDays: (date: Date, days: number) => Date;
export declare const addHours: (date: Date, hours: number) => Date;
export declare const addMinutes: (date: Date, minutes: number) => Date;
export declare const isToday: (date: Date) => boolean;
export declare const daysBetween: (date1: Date, date2: Date) => number;
export declare const clamp: (value: number, min: number, max: number) => number;
export declare const round: (value: number, decimals?: number) => number;
export declare const randomInt: (min: number, max: number) => number;
export declare const randomFloat: (min: number, max: number) => number;
export declare const delay: (ms: number) => Promise<void>;
export declare const timeout: <T>(promise: Promise<T>, ms: number) => Promise<T>;
export declare const retry: <T>(fn: () => Promise<T>, maxAttempts?: number, delayMs?: number) => Promise<T>;
export declare const getEnvVar: (name: string, defaultValue?: string) => string;
export declare const getEnvVarAsNumber: (name: string, defaultValue?: number) => number;
export declare const getEnvVarAsBoolean: (name: string, defaultValue?: boolean) => boolean;
export declare enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
}
export interface Logger {
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
}
export declare const createLogger: (level?: LogLevel) => Logger;
