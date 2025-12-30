// Common utility functions
// String utilities
export const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
export const camelCase = (str) => {
    return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
        .replace(/\s+/g, '');
};
export const kebabCase = (str) => {
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
};
export const snakeCase = (str) => {
    return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
};
export const truncate = (str, length, suffix = '...') => {
    if (str.length <= length)
        return str;
    return str.substring(0, length - suffix.length) + suffix;
};
// Array utilities
export const chunk = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};
export const unique = (array) => {
    return [...new Set(array)];
};
export const groupBy = (array, key) => {
    return array.reduce((groups, item) => {
        const groupKey = key(item);
        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(item);
        return groups;
    }, {});
};
export const sortBy = (array, key, direction = 'asc') => {
    const getValue = typeof key === 'function' ? key : (item) => item[key];
    return [...array].sort((a, b) => {
        const aVal = getValue(a);
        const bVal = getValue(b);
        if (aVal < bVal)
            return direction === 'asc' ? -1 : 1;
        if (aVal > bVal)
            return direction === 'asc' ? 1 : -1;
        return 0;
    });
};
// Object utilities
export const pick = (obj, keys) => {
    const result = {};
    keys.forEach(key => {
        if (key in obj) {
            result[key] = obj[key];
        }
    });
    return result;
};
export const omit = (obj, keys) => {
    const result = { ...obj };
    keys.forEach(key => {
        delete result[key];
    });
    return result;
};
export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object')
        return obj;
    if (obj instanceof Date)
        return new Date(obj.getTime());
    if (obj instanceof Array)
        return obj.map(item => deepClone(item));
    const cloned = {};
    Object.keys(obj).forEach(key => {
        cloned[key] = deepClone(obj[key]);
    });
    return cloned;
};
export const isEmpty = (value) => {
    if (value == null)
        return true;
    if (typeof value === 'string')
        return value.trim().length === 0;
    if (Array.isArray(value))
        return value.length === 0;
    if (typeof value === 'object')
        return Object.keys(value).length === 0;
    return false;
};
// Date utilities
export const formatDate = (date, format = 'YYYY-MM-DD') => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return format
        .replace('YYYY', year.toString())
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
};
export const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};
export const addHours = (date, hours) => {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
};
export const addMinutes = (date, minutes) => {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
};
export const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
};
export const daysBetween = (date1, date2) => {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
};
// Number utilities
export const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};
export const round = (value, decimals = 0) => {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
};
export const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
export const randomFloat = (min, max) => {
    return Math.random() * (max - min) + min;
};
// Promise utilities
export const delay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
export const timeout = (promise, ms) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), ms)),
    ]);
};
export const retry = async (fn, maxAttempts = 3, delayMs = 1000) => {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
                await delay(delayMs * attempt);
            }
        }
    }
    throw lastError;
};
// Environment utilities
export const getEnvVar = (name, defaultValue) => {
    const value = process.env[name];
    if (value === undefined) {
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        throw new Error(`Environment variable ${name} is required`);
    }
    return value;
};
export const getEnvVarAsNumber = (name, defaultValue) => {
    const value = process.env[name];
    if (value === undefined) {
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        throw new Error(`Environment variable ${name} is required`);
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        throw new Error(`Environment variable ${name} must be a number`);
    }
    return parsed;
};
export const getEnvVarAsBoolean = (name, defaultValue) => {
    const value = process.env[name];
    if (value === undefined) {
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        throw new Error(`Environment variable ${name} is required`);
    }
    return value.toLowerCase() === 'true';
};
// Logging utilities
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (LogLevel = {}));
export const createLogger = (level = LogLevel.INFO) => {
    const log = (logLevel, levelName, message, meta) => {
        if (logLevel <= level) {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] ${levelName}: ${message}`;
            if (meta) {
                console.log(logMessage, meta);
            }
            else {
                console.log(logMessage);
            }
        }
    };
    return {
        error: (message, meta) => log(LogLevel.ERROR, 'ERROR', message, meta),
        warn: (message, meta) => log(LogLevel.WARN, 'WARN', message, meta),
        info: (message, meta) => log(LogLevel.INFO, 'INFO', message, meta),
        debug: (message, meta) => log(LogLevel.DEBUG, 'DEBUG', message, meta),
    };
};
