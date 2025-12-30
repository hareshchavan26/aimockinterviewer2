import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UnauthorizedError } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
export class JWTTokenService {
    generateAccessToken(userId, email, sessionId) {
        const payload = {
            userId,
            email,
            sessionId,
            type: 'access',
        };
        return jwt.sign(payload, config.auth.jwtSecret, {
            expiresIn: config.auth.jwtAccessTokenExpiresIn,
            issuer: 'ai-interview-platform',
            audience: 'ai-interview-platform-users',
        });
    }
    generateRefreshToken(userId, email, sessionId) {
        const payload = {
            userId,
            email,
            sessionId,
            type: 'refresh',
        };
        return jwt.sign(payload, config.auth.jwtSecret, {
            expiresIn: config.auth.jwtRefreshTokenExpiresIn,
            issuer: 'ai-interview-platform',
            audience: 'ai-interview-platform-users',
        });
    }
    verifyAccessToken(token) {
        try {
            const payload = jwt.verify(token, config.auth.jwtSecret, {
                issuer: 'ai-interview-platform',
                audience: 'ai-interview-platform-users',
            });
            if (payload.type !== 'access') {
                throw new UnauthorizedError('Invalid token type');
            }
            return {
                userId: payload.userId,
                email: payload.email,
                sessionId: payload.sessionId,
            };
        }
        catch (error) {
            logger.debug('Token verification failed', { error: error instanceof Error ? error.message : error });
            throw new UnauthorizedError('Invalid or expired token');
        }
    }
    verifyRefreshToken(token) {
        try {
            const payload = jwt.verify(token, config.auth.jwtSecret, {
                issuer: 'ai-interview-platform',
                audience: 'ai-interview-platform-users',
            });
            if (payload.type !== 'refresh') {
                throw new UnauthorizedError('Invalid token type');
            }
            return {
                userId: payload.userId,
                email: payload.email,
                sessionId: payload.sessionId,
            };
        }
        catch (error) {
            logger.debug('Refresh token verification failed', { error: error instanceof Error ? error.message : error });
            throw new UnauthorizedError('Invalid or expired refresh token');
        }
    }
    generateSecureToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    // Utility method to decode token without verification (for debugging)
    decodeToken(token) {
        try {
            return jwt.decode(token);
        }
        catch (error) {
            return null;
        }
    }
    // Check if token is expired without throwing
    isTokenExpired(token) {
        try {
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.exp) {
                return true;
            }
            return Date.now() >= decoded.exp * 1000;
        }
        catch {
            return true;
        }
    }
    // Get token expiration time
    getTokenExpirationTime(token) {
        try {
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.exp) {
                return null;
            }
            return new Date(decoded.exp * 1000);
        }
        catch {
            return null;
        }
    }
}
