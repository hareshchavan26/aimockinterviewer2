import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UnauthorizedError } from '../../types';
export class TestJWTTokenService {
    config;
    constructor(config) {
        this.config = config;
    }
    generateAccessToken(userId, email, sessionId) {
        const payload = {
            userId,
            email,
            sessionId,
            type: 'access',
        };
        return jwt.sign(payload, this.config.jwtSecret, {
            expiresIn: this.config.jwtAccessTokenExpiresIn,
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
        return jwt.sign(payload, this.config.jwtSecret, {
            expiresIn: this.config.jwtRefreshTokenExpiresIn,
            issuer: 'ai-interview-platform',
            audience: 'ai-interview-platform-users',
        });
    }
    verifyAccessToken(token) {
        try {
            const payload = jwt.verify(token, this.config.jwtSecret, {
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
            throw new UnauthorizedError('Invalid or expired token');
        }
    }
    verifyRefreshToken(token) {
        try {
            const payload = jwt.verify(token, this.config.jwtSecret, {
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
            throw new UnauthorizedError('Invalid or expired refresh token');
        }
    }
    generateSecureToken() {
        return crypto.randomBytes(32).toString('hex');
    }
}
