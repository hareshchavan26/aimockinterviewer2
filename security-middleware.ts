import { Request, Response, NextFunction } from 'express';
import { DefaultSecurityService } from '../services/security-service';
import { logger } from '../utils/logger';

export interface SecurityMiddlewareOptions {
  enableAuditLogging?: boolean;
  enableEncryption?: boolean;
  sensitiveFields?: string[];
  excludePaths?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  securityContext?: {
    auditId: string;
    encrypted: boolean;
  };
}

export class SecurityMiddleware {
  private securityService: DefaultSecurityService;
  private options: SecurityMiddlewareOptions;

  constructor(options: SecurityMiddlewareOptions = {}) {
    this.securityService = new DefaultSecurityService();
    this.options = {
      enableAuditLogging: true,
      enableEncryption: false,
      sensitiveFields: ['password', 'token', 'ssn', 'creditCard'],
      excludePaths: ['/health', '/metrics'],
      ...options,
    };
  }

  // Audit logging middleware
  auditLogger() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!this.options.enableAuditLogging) {
        return next();
      }

      // Skip excluded paths
      if (this.options.excludePaths?.some(path => req.path.startsWith(path))) {
        return next();
      }

      const startTime = Date.now();
      const auditId = this.securityService.generateSecureToken();
      
      // Add audit ID to request context
      req.securityContext = {
        ...req.securityContext,
        auditId,
        encrypted: false,
      };

      // Override res.json to capture response data
      const originalJson = res.json;
      let responseData: any;
      
      res.json = function(data: any) {
        responseData = data;
        return originalJson.call(this, data);
      };

      // Log the request
      const requestAudit = {
        userId: req.user?.id || 'anonymous',
        action: `${req.method} ${req.path}`,
        resource: 'api_endpoint',
        resourceId: req.params.id || undefined,
        metadata: {
          method: req.method,
          path: req.path,
          query: req.query,
          body: this.sanitizeRequestBody(req.body),
          userAgent: req.get('User-Agent'),
          auditId,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: true, // Will be updated in response handler
      };

      // Handle response completion
      res.on('finish', async () => {
        const duration = Date.now() - startTime;
        const success = res.statusCode < 400;

        try {
          await this.securityService.logAuditEvent({
            ...requestAudit,
            success,
            metadata: {
              ...requestAudit.metadata,
              statusCode: res.statusCode,
              duration,
              responseSize: res.get('Content-Length') || 0,
            },
            errorMessage: success ? undefined : responseData?.error?.message,
          });
        } catch (error) {
          logger.error('Failed to log audit event', { error, auditId });
        }
      });

      next();
    };
  }

  // Data encryption middleware for sensitive responses
  encryptionMiddleware() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!this.options.enableEncryption) {
        return next();
      }

      // Override res.json to encrypt sensitive data
      const originalJson = res.json;
      
      res.json = async function(data: any) {
        try {
          const encryptedData = await this.encryptSensitiveFields(data);
          
          if (req.securityContext) {
            req.securityContext.encrypted = true;
          }

          return originalJson.call(this, encryptedData);
        } catch (error) {
          logger.error('Failed to encrypt response data', { error });
          return originalJson.call(this, data);
        }
      }.bind(this);

      next();
    };
  }

  // Rate limiting middleware
  rateLimiter(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const key = req.user?.id || req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean up old entries
      for (const [k, v] of requests.entries()) {
        if (v.resetTime < windowStart) {
          requests.delete(k);
        }
      }

      const userRequests = requests.get(key);
      
      if (!userRequests) {
        requests.set(key, { count: 1, resetTime: now + windowMs });
        return next();
      }

      if (userRequests.count >= maxRequests) {
        // Log rate limit violation
        this.securityService.logAuditEvent({
          userId: req.user?.id || 'anonymous',
          action: 'RATE_LIMIT_EXCEEDED',
          resource: 'api_endpoint',
          metadata: {
            path: req.path,
            method: req.method,
            currentCount: userRequests.count,
            maxRequests,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          success: false,
          errorMessage: 'Rate limit exceeded',
        });

        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
            retryAfter: Math.ceil((userRequests.resetTime - now) / 1000),
          },
        });
      }

      userRequests.count++;
      next();
    };
  }

  // Input validation and sanitization
  inputSanitizer() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      // Sanitize request body
      if (req.body) {
        req.body = this.sanitizeObject(req.body);
      }

      // Sanitize query parameters
      if (req.query) {
        req.query = this.sanitizeObject(req.query);
      }

      next();
    };
  }

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    
    // Remove or mask sensitive fields
    this.options.sensitiveFields?.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeObject(obj: any): any {
    if (!obj) {
      return obj;
    }

    if (typeof obj === 'string') {
      // Basic XSS prevention for strings
      return obj.replace(/[<>\"'&]/g, '');
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Remove potentially dangerous characters from keys
      const cleanKey = key.replace(/[<>\"'&]/g, '');
      
      if (typeof value === 'string') {
        // Basic XSS prevention
        sanitized[cleanKey] = value.replace(/[<>\"'&]/g, '');
      } else if (typeof value === 'object') {
        sanitized[cleanKey] = this.sanitizeObject(value);
      } else {
        sanitized[cleanKey] = value;
      }
    }

    return sanitized;
  }

  private async encryptSensitiveFields(data: any): Promise<any> {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return Promise.all(data.map(item => this.encryptSensitiveFields(item)));
    }

    const result: any = { ...data };

    for (const field of this.options.sensitiveFields || []) {
      if (result[field] && typeof result[field] === 'string') {
        try {
          const encrypted = await this.securityService.encrypt(result[field]);
          result[field] = {
            encrypted: true,
            data: encrypted.encryptedData,
            iv: encrypted.iv,
            tag: encrypted.tag,
          };
        } catch (error) {
          logger.error('Failed to encrypt field', { field, error });
        }
      }
    }

    return result;
  }
}

// Export middleware factory functions
export const createSecurityMiddleware = (options?: SecurityMiddlewareOptions) => {
  return new SecurityMiddleware(options);
};

export const auditLogger = (options?: SecurityMiddlewareOptions) => {
  return createSecurityMiddleware(options).auditLogger();
};

export const encryptionMiddleware = (options?: SecurityMiddlewareOptions) => {
  return createSecurityMiddleware(options).encryptionMiddleware();
};

export const rateLimiter = (maxRequests?: number, windowMs?: number, options?: SecurityMiddlewareOptions) => {
  return createSecurityMiddleware(options).rateLimiter(maxRequests, windowMs);
};

export const inputSanitizer = (options?: SecurityMiddlewareOptions) => {
  return createSecurityMiddleware(options).inputSanitizer();
};