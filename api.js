// API Response utilities
export const createSuccessResponse = (data, message) => {
    return {
        success: true,
        data,
        message,
    };
};
export const createErrorResponse = (error, message) => {
    return {
        success: false,
        error,
        message,
    };
};
export const createApiError = (code, message, details) => {
    return {
        code,
        message,
        details,
    };
};
// HTTP Status codes
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
};
// Error codes
export const ERROR_CODES = {
    // Authentication errors
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    UNAUTHORIZED: 'UNAUTHORIZED',
    // Validation errors
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
    INVALID_FORMAT: 'INVALID_FORMAT',
    // Resource errors
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
    RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
    // Permission errors
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE',
    USAGE_LIMIT_EXCEEDED: 'USAGE_LIMIT_EXCEEDED',
    // System errors
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    DATABASE_ERROR: 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
};
export const validateRequest = (body, options) => {
    const errors = [];
    // Check required fields
    if (options.requiredFields) {
        for (const field of options.requiredFields) {
            if (!body[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        }
    }
    // Check allowed fields
    if (options.allowedFields) {
        const bodyFields = Object.keys(body);
        for (const field of bodyFields) {
            if (!options.allowedFields.includes(field)) {
                errors.push(`Unexpected field: ${field}`);
            }
        }
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
};
export const defaultRateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    keyGenerator: (req) => req.ip || 'unknown',
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
};
export const defaultCorsConfig = {
    origin: process.env.NODE_ENV === 'production' ? false : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400, // 24 hours
};
export const createRequestLog = (req, res, responseTime, userId) => {
    return {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId,
        timestamp: new Date(),
    };
};
// API versioning utilities
export const parseApiVersion = (acceptHeader) => {
    const versionMatch = acceptHeader.match(/application\/vnd\.ai-interview\.v(\d+)\+json/);
    return versionMatch ? `v${versionMatch[1]}` : 'v1';
};
export const createVersionedResponse = (data, version) => {
    return {
        version,
        data,
    };
};
export const createPaginatedResponse = (data, meta, message) => {
    return {
        success: true,
        data,
        meta,
        message,
    };
};
// Content type utilities
export const CONTENT_TYPES = {
    JSON: 'application/json',
    XML: 'application/xml',
    HTML: 'text/html',
    TEXT: 'text/plain',
    PDF: 'application/pdf',
    CSV: 'text/csv',
    FORM_DATA: 'multipart/form-data',
    URL_ENCODED: 'application/x-www-form-urlencoded',
};
// Security headers utilities
export const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'",
};
export const applySecurityHeaders = (res) => {
    Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
        res.setHeader(header, value);
    });
};
