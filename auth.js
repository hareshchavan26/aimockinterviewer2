import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// Password hashing utilities
export const hashPassword = async (password, rounds = 12) => {
    return bcrypt.hash(password, rounds);
};
export const comparePassword = async (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword);
};
export const generateAccessToken = (userId, email, sessionId, secret, expiresIn = '15m') => {
    const payload = {
        userId,
        email,
        sessionId,
    };
    return jwt.sign(payload, secret, { expiresIn });
};
export const generateRefreshToken = (userId, email, sessionId, secret, expiresIn = '7d') => {
    const payload = {
        userId,
        email,
        sessionId,
    };
    return jwt.sign(payload, secret, { expiresIn });
};
export const verifyToken = (token, secret) => {
    try {
        return jwt.verify(token, secret);
    }
    catch (error) {
        throw new Error('Invalid or expired token');
    }
};
export const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    }
    catch {
        return null;
    }
};
// Session utilities
export const generateSessionId = () => {
    return crypto.randomUUID();
};
export const generateSecureToken = (length = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
export const extractGoogleProfile = (googleUser) => {
    return {
        id: googleUser.id,
        email: googleUser.email,
        firstName: googleUser.given_name || '',
        lastName: googleUser.family_name || '',
        profilePicture: googleUser.picture,
        provider: 'google',
    };
};
export const extractGitHubProfile = (githubUser) => {
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
export const generateMagicLinkToken = () => {
    return generateSecureToken(64);
};
export const createMagicLinkUrl = (baseUrl, token, email) => {
    const params = new URLSearchParams({
        token,
        email,
    });
    return `${baseUrl}/auth/magic-link?${params.toString()}`;
};
// Password reset utilities
export const generatePasswordResetToken = () => {
    return generateSecureToken(64);
};
export const createPasswordResetUrl = (baseUrl, token) => {
    return `${baseUrl}/auth/reset-password?token=${token}`;
};
// Email verification utilities
export const generateEmailVerificationToken = () => {
    return generateSecureToken(64);
};
export const createEmailVerificationUrl = (baseUrl, token) => {
    return `${baseUrl}/auth/verify-email?token=${token}`;
};
// Auth result creation
export const createAuthResult = (user, accessToken, refreshToken, expiresIn = 900 // 15 minutes in seconds
) => {
    return {
        user,
        accessToken,
        refreshToken,
        expiresIn,
    };
};
// Token expiration utilities
export const isTokenExpired = (token) => {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
        return true;
    }
    return Date.now() >= decoded.exp * 1000;
};
export const getTokenExpirationTime = (token) => {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
        return null;
    }
    return new Date(decoded.exp * 1000);
};
