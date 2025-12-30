import { ApiResponse, ApiError } from '@ai-interview/types';

// API Response utilities
export const createSuccessResponse = <T>(
  data: T,
  message?: string
): ApiResponse<T> => {
  return {
    success: true,
    data,
    message,
  };
};

export const createErrorResponse = (
  error: ApiError,
  message?: string
): ApiResponse => {
  return {
    success: false,
    error,
    message,
  };
};

export const createApiError = (
  code: string,
  message: string,
  details?: Record<string, any>
): ApiError => {
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
} as const;

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
} as const;

// Request validation utilities
export interface RequestValidationOptions {
  requireAuth?: boolean;
  requiredFields?: string[];
  allowedFields?: string[];
  maxBodySize?: number;
}

export const validateRequest = (
  body: any,
  options: RequestValidationOptions
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
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

// Rate limiting utilities
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export const defaultRateLimitConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  keyGenerator: (req) => req.ip || 'unknown',
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
};

// CORS utilities
export interface CorsConfig {
  origin: string | string[] | boolean;
  methods: string[];
  allowedHeaders: string[];
  credentials: boolean;
  maxAge?: number;
}

export const defaultCorsConfig: CorsConfig = {
  origin: process.env.NODE_ENV === 'production' ? false : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

// Request logging utilities
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

export const createRequestLog = (
  req: any,
  res: any,
  responseTime: number,
  userId?: string
): RequestLog => {
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
export const parseApiVersion = (acceptHeader: string): string => {
  const versionMatch = acceptHeader.match(/application\/vnd\.ai-interview\.v(\d+)\+json/);
  return versionMatch ? `v${versionMatch[1]}` : 'v1';
};

export const createVersionedResponse = (data: any, version: string): any => {
  return {
    version,
    data,
  };
};

// Pagination utilities for API responses
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

export const createPaginatedResponse = <T>(
  data: T[],
  meta: ApiPaginationMeta,
  message?: string
): PaginatedApiResponse<T> => {
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
} as const;

// Security headers utilities
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'",
} as const;

export const applySecurityHeaders = (res: any): void => {
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
};