import { User, AuthResult } from '@ai-interview/types';
export declare const hashPassword: (password: string, rounds?: number) => Promise<string>;
export declare const comparePassword: (password: string, hashedPassword: string) => Promise<boolean>;
export interface JWTPayload {
    userId: string;
    email: string;
    sessionId: string;
    iat?: number;
    exp?: number;
}
export declare const generateAccessToken: (userId: string, email: string, sessionId: string, secret: string, expiresIn?: string) => string;
export declare const generateRefreshToken: (userId: string, email: string, sessionId: string, secret: string, expiresIn?: string) => string;
export declare const verifyToken: (token: string, secret: string) => JWTPayload;
export declare const decodeToken: (token: string) => JWTPayload | null;
export declare const generateSessionId: () => string;
export declare const generateSecureToken: (length?: number) => string;
export interface OAuthProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
    provider: 'google' | 'github';
}
export declare const extractGoogleProfile: (googleUser: any) => OAuthProfile;
export declare const extractGitHubProfile: (githubUser: any) => OAuthProfile;
export declare const generateMagicLinkToken: () => string;
export declare const createMagicLinkUrl: (baseUrl: string, token: string, email: string) => string;
export declare const generatePasswordResetToken: () => string;
export declare const createPasswordResetUrl: (baseUrl: string, token: string) => string;
export declare const generateEmailVerificationToken: () => string;
export declare const createEmailVerificationUrl: (baseUrl: string, token: string) => string;
export declare const createAuthResult: (user: User, accessToken: string, refreshToken: string, expiresIn?: number) => AuthResult;
export declare const isTokenExpired: (token: string) => boolean;
export declare const getTokenExpirationTime: (token: string) => Date | null;
