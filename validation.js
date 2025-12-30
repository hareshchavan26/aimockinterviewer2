import { z } from 'zod';
import { ValidationError } from '../types';
// Validation schemas
export const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain uppercase, lowercase, number, and special character'),
    firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
});
export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});
export const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email format'),
});
export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain uppercase, lowercase, number, and special character'),
});
export const magicLinkSchema = z.object({
    email: z.string().email('Invalid email format'),
});
export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});
export const verifyEmailSchema = z.object({
    token: z.string().min(1, 'Verification token is required'),
});
// Validation helper functions
export const validateRequest = (schema, data) => {
    try {
        return schema.parse(data);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            const firstError = error.errors[0];
            throw new ValidationError(firstError.message, firstError.path.join('.'));
        }
        throw error;
    }
};
// Individual field validators
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
export const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};
export const validateUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};
export const validateName = (name) => {
    return name.length >= 1 && name.length <= 50 && /^[a-zA-Z\s'-]+$/.test(name);
};
// Sanitization functions
export const sanitizeString = (input) => {
    return input.trim().replace(/[<>]/g, '');
};
export const sanitizeEmail = (email) => {
    return email.toLowerCase().trim();
};
export const sanitizeName = (name) => {
    return name.trim().replace(/\s+/g, ' ');
};
// Rate limiting validation
export const validateRateLimit = (attempts, maxAttempts, windowMs, lastAttempt) => {
    if (!lastAttempt) {
        return attempts < maxAttempts;
    }
    const now = new Date();
    const timeDiff = now.getTime() - lastAttempt.getTime();
    if (timeDiff > windowMs) {
        // Window has expired, reset attempts
        return true;
    }
    return attempts < maxAttempts;
};
// Token validation
export const validateToken = (token) => {
    return token.length >= 32 && /^[a-zA-Z0-9]+$/.test(token);
};
// IP address validation
export const validateIPAddress = (ip) => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};
// User agent validation
export const validateUserAgent = (userAgent) => {
    return userAgent.length > 0 && userAgent.length <= 500;
};
// Custom validation error class
export class ValidationErrorWithDetails extends ValidationError {
    errors;
    constructor(message, errors) {
        super(message);
        this.errors = errors;
        this.name = 'ValidationErrorWithDetails';
    }
}
// Batch validation helper
export const validateMultipleFields = (validations) => {
    const errors = [];
    validations.forEach(({ field, value, validator, message }) => {
        if (!validator(value)) {
            errors.push({ field, message });
        }
    });
    if (errors.length > 0) {
        throw new ValidationErrorWithDetails('Validation failed', errors);
    }
};
// Password strength validation
export const getPasswordStrengthScore = (password) => {
    let score = 0;
    // Length
    if (password.length >= 8)
        score += 25;
    if (password.length >= 12)
        score += 25;
    // Character variety
    if (/[a-z]/.test(password))
        score += 12.5;
    if (/[A-Z]/.test(password))
        score += 12.5;
    if (/\d/.test(password))
        score += 12.5;
    if (/[@$!%*?&]/.test(password))
        score += 12.5;
    return Math.min(100, score);
};
