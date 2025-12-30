import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, AuthResult } from '@ai-interview/types';

// Password hashing utilities
export const hashPassword = async (password: string, rounds: number = 12): Promise<string> => {
  return bcrypt.hash(password, rounds);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// JWT token utilities
export interface JWTPayload {
  userId: string;
  email: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export const generateAccessToken = (
  userId: string,
  email: string,
  sessionId: string,
  secret: string,
  expiresIn: string = '15m'
): string => {
  const payload: JWTPayload = {
    userId,
    email,
    sessionId,
  };
  
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

export const generateRefreshToken = (
  userId: string,
  email: string,
  sessionId: string,
  secret: string,
  expiresIn: string = '7d'
): string => {
  const payload: JWTPayload = {
    userId,
    email,
    sessionId,
  };
  
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

export const verifyToken = (token: string, secret: string): JWTPayload => {
  try {
    return jwt.verify(token, secret) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
};

// Session utilities
export const generateSessionId = (): string => {
  return crypto.randomUUID();
};

export const generateSecureToken = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// OAuth utilities
export interface OAuthProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  provider: 'google' | 'github';
}

export const extractGoogleProfile = (googleUser: any): OAuthProfile => {
  return {
    id: googleUser.id,
    email: googleUser.email,
    firstName: googleUser.given_name || '',
    lastName: googleUser.family_name || '',
    profilePicture: googleUser.picture,
    provider: 'google',
  };
};

export const extractGitHubProfile = (githubUser: any): OAuthProfile => {
  const [firstName, ...lastNameParts] = (githubUser.name || '').split(' ');
  return {
    id: githubUser.id.toString(),
    email: githubUser.email,
    firstName: firstName || '',
    lastName: lastNameParts.join(' ') || '',
    profilePicture: githubUser.avatar_url,
    provider: 'github',
  };
};

// Magic link utilities
export const generateMagicLinkToken = (): string => {
  return generateSecureToken(64);
};

export const createMagicLinkUrl = (
  baseUrl: string,
  token: string,
  email: string
): string => {
  const params = new URLSearchParams({
    token,
    email,
  });
  return `${baseUrl}/auth/magic-link?${params.toString()}`;
};

// Password reset utilities
export const generatePasswordResetToken = (): string => {
  return generateSecureToken(64);
};

export const createPasswordResetUrl = (
  baseUrl: string,
  token: string
): string => {
  return `${baseUrl}/auth/reset-password?token=${token}`;
};

// Email verification utilities
export const generateEmailVerificationToken = (): string => {
  return generateSecureToken(64);
};

export const createEmailVerificationUrl = (
  baseUrl: string,
  token: string
): string => {
  return `${baseUrl}/auth/verify-email?token=${token}`;
};

// Auth result creation
export const createAuthResult = (
  user: User,
  accessToken: string,
  refreshToken: string,
  expiresIn: number = 900 // 15 minutes in seconds
): AuthResult => {
  return {
    user,
    accessToken,
    refreshToken,
    expiresIn,
  };
};

// Token expiration utilities
export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }
  
  return Date.now() >= decoded.exp * 1000;
};

export const getTokenExpirationTime = (token: string): Date | null => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return null;
  }
  
  return new Date(decoded.exp * 1000);
};