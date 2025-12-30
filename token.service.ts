import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { TokenService, UnauthorizedError, AuthConfig } from '../../types';

export class TestJWTTokenService implements TokenService {
  constructor(private config: AuthConfig) {}

  generateAccessToken(userId: string, email: string, sessionId: string): string {
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
    } as jwt.SignOptions);
  }

  generateRefreshToken(userId: string, email: string, sessionId: string): string {
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
    } as jwt.SignOptions);
  }

  verifyAccessToken(token: string): { userId: string; email: string; sessionId: string } {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret, {
        issuer: 'ai-interview-platform',
        audience: 'ai-interview-platform-users',
      }) as any;

      if (payload.type !== 'access') {
        throw new UnauthorizedError('Invalid token type');
      }

      return {
        userId: payload.userId,
        email: payload.email,
        sessionId: payload.sessionId,
      };
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  verifyRefreshToken(token: string): { userId: string; email: string; sessionId: string } {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret, {
        issuer: 'ai-interview-platform',
        audience: 'ai-interview-platform-users',
      }) as any;

      if (payload.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }

      return {
        userId: payload.userId,
        email: payload.email,
        sessionId: payload.sessionId,
      };
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}