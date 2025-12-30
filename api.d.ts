import { ApiResponse, ApiError } from '@ai-interview/types';
export declare const createSuccessResponse: <T>(data: T, message?: string) => ApiResponse<T>;
export declare const createErrorResponse: (error: ApiError, message?: string) => ApiResponse;
export declare const createApiError: (code: string, message: string, details?: Record<string, any>) => ApiError;
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly SERVICE_UNAVAILABLE: 503;
};
export declare const ERROR_CODES: {
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly TOKEN_INVALID: "TOKEN_INVALID";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD";
    readonly INVALID_FORMAT: "INVALID_FORMAT";
    readonly RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND";
    readonly RESOURCE_ALREADY_EXISTS: "RESOURCE_ALREADY_EXISTS";
    readonly RESOURCE_CONFLICT: "RESOURCE_CONFLICT";
    readonly INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS";
    readonly FEATURE_NOT_AVAILABLE: "FEATURE_NOT_AVAILABLE";
    readonly USAGE_LIMIT_EXCEEDED: "USAGE_LIMIT_EXCEEDED";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
    readonly DATABASE_ERROR: "DATABASE_ERROR";
    readonly EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR";
};
export interface RequestValidationOptions {
    requireAuth?: boolean;
    requiredFields?: string[];
    allowedFields?: string[];
    maxBodySize?: number;
}
export declare const validateRequest: (body: any, options: RequestValidationOptions) => {
    isValid: boolean;
    errors: string[];
};
export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (req: any) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
}
export declare const defaultRateLimitConfig: RateLimitConfig;
export interface CorsConfig {
    origin: string | string[] | boolean;
    methods: string[];
    allowedHeaders: string[];
    credentials: boolean;
    maxAge?: number;
}
export declare const defaultCorsConfig: CorsConfig;
export interface RequestLog {
    method: string;
    url: string;
    statusCode: number;
    responseTime: number;
    userAgent?: string;
    ip?: string;
    userId?: string;
    timestamp: Date;
}
export declare const createRequestLog: (req: any, res: any, responseTime: number, userId?: string) => RequestLog;
export declare const parseApiVersion: (acceptHeader: string) => string;
export declare const createVersionedResponse: (data: any, version: string) => any;
export interface ApiPaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
    meta: ApiPaginationMeta;
}
export declare const createPaginatedResponse: <T>(data: T[], meta: ApiPaginationMeta, message?: string) => PaginatedApiResponse<T>;
export declare const CONTENT_TYPES: {
    readonly JSON: "application/json";
    readonly XML: "application/xml";
    readonly HTML: "text/html";
    readonly TEXT: "text/plain";
    readonly PDF: "application/pdf";
    readonly CSV: "text/csv";
    readonly FORM_DATA: "multipart/form-data";
    readonly URL_ENCODED: "application/x-www-form-urlencoded";
};
export declare const SECURITY_HEADERS: {
    readonly 'X-Content-Type-Options': "nosniff";
    readonly 'X-Frame-Options': "DENY";
    readonly 'X-XSS-Protection': "1; mode=block";
    readonly 'Strict-Transport-Security': "max-age=31536000; includeSubDomains";
    readonly 'Referrer-Policy': "strict-origin-when-cross-origin";
    readonly 'Content-Security-Policy': "default-src 'self'";
};
export declare const applySecurityHeaders: (res: any) => void;
