import { UnauthorizedError, ConflictError } from '../types';
import { validateRequest, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, magicLinkSchema, refreshTokenSchema, sanitizeEmail, sanitizeName } from '../utils/validation';
import { logger, logAuthEvent, logSecurityEvent } from '../utils/logger';
export class AuthService {
    repository;
    emailService;
    tokenService;
    passwordService;
    constructor(repository, emailService, tokenService, passwordService) {
        this.repository = repository;
        this.emailService = emailService;
        this.tokenService = tokenService;
        this.passwordService = passwordService;
    }
    async register(data, ipAddress, userAgent) {
        // Validate input
        const validatedData = validateRequest(registerSchema, data);
        // Sanitize input
        const email = sanitizeEmail(validatedData.email);
        const firstName = sanitizeName(validatedData.firstName);
        const lastName = sanitizeName(validatedData.lastName);
        // Check if user already exists
        const existingUser = await this.repository.findUserByEmail(email);
        if (existingUser) {
            logSecurityEvent('Registration attempt with existing email', undefined, { email, ipAddress });
            throw new ConflictError('User with this email already exists');
        }
        // Hash password
        const passwordHash = await this.passwordService.hashPassword(validatedData.password);
        // Generate email verification token
        const emailVerificationToken = this.tokenService.generateSecureToken();
        const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        // Create user
        const userData = {
            email,
            password_hash: passwordHash,
            first_name: firstName,
            last_name: lastName,
            role: 'user',
            email_verified: false,
            email_verification_token: emailVerificationToken,
            email_verification_expires_at: emailVerificationExpiresAt,
        };
        const user = await this.repository.createUser(userData);
        // Send verification email
        try {
            await this.emailService.sendVerificationEmail(email, emailVerificationToken);
        }
        catch (error) {
            logger.error('Failed to send verification email', { userId: user.id, email, error });
            // Don't fail registration if email fails
        }
        // Create session
        const sessionId = crypto.randomUUID();
        const accessToken = this.tokenService.generateAccessToken(user.id, user.email, sessionId);
        const refreshToken = this.tokenService.generateRefreshToken(user.id, user.email, sessionId);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        const sessionData = {
            user_id: user.id,
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: expiresAt,
            ip_address: ipAddress,
            user_agent: userAgent,
        };
        await this.repository.createSession(sessionData);
        logAuthEvent('User registered', user.id, user.email, { ipAddress, userAgent });
        return {
            user: this.mapUserModelToUser(user),
            accessToken,
            refreshToken,
            expiresIn: 15 * 60, // 15 minutes in seconds
        };
    }
    async login(data, ipAddress, userAgent) {
        // Validate input
        const validatedData = validateRequest(loginSchema, data);
        // Sanitize email
        const email = sanitizeEmail(validatedData.email);
        // Find user
        const user = await this.repository.findUserByEmail(email);
        if (!user || !user.password_hash) {
            logSecurityEvent('Login attempt with invalid email', undefined, { email, ipAddress });
            throw new UnauthorizedError('Invalid email or password');
        }
        // Verify password
        const isPasswordValid = await this.passwordService.comparePassword(validatedData.password, user.password_hash);
        if (!isPasswordValid) {
            logSecurityEvent('Login attempt with invalid password', user.id, { email, ipAddress });
            throw new UnauthorizedError('Invalid email or password');
        }
        // Update last login
        await this.repository.updateUser(user.id, {
            last_login_at: new Date(),
        });
        // Create session
        const sessionId = crypto.randomUUID();
        const accessToken = this.tokenService.generateAccessToken(user.id, user.email, sessionId);
        const refreshToken = this.tokenService.generateRefreshToken(user.id, user.email, sessionId);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        const sessionData = {
            user_id: user.id,
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: expiresAt,
            ip_address: ipAddress,
            user_agent: userAgent,
        };
        await this.repository.createSession(sessionData);
        logAuthEvent('User logged in', user.id, user.email, { ipAddress, userAgent });
        return {
            user: this.mapUserModelToUser(user),
            accessToken,
            refreshToken,
            expiresIn: 15 * 60, // 15 minutes in seconds
        };
    }
    async logout(sessionId, userId) {
        try {
            await this.repository.deleteSession(sessionId);
            logAuthEvent('User logged out', userId, undefined, { sessionId });
        }
        catch (error) {
            // Session might not exist, which is fine
            logger.debug('Session not found during logout', { sessionId, userId });
        }
    }
    async logoutAll(userId) {
        await this.repository.deleteUserSessions(userId);
        logAuthEvent('User logged out from all sessions', userId);
    }
    async refreshToken(data, ipAddress) {
        // Validate input
        const validatedData = validateRequest(refreshTokenSchema, data);
        // Verify refresh token
        let tokenPayload;
        try {
            tokenPayload = this.tokenService.verifyRefreshToken(validatedData.refreshToken);
        }
        catch (error) {
            logSecurityEvent('Invalid refresh token used', undefined, { ipAddress });
            throw new UnauthorizedError('Invalid refresh token');
        }
        // Find session
        const session = await this.repository.findSessionByToken(validatedData.refreshToken);
        if (!session || session.expires_at < new Date()) {
            logSecurityEvent('Expired or non-existent session', tokenPayload.userId, { ipAddress });
            throw new UnauthorizedError('Session expired');
        }
        // Find user
        const user = await this.repository.findUserById(tokenPayload.userId);
        if (!user) {
            logSecurityEvent('Refresh token for non-existent user', tokenPayload.userId, { ipAddress });
            throw new UnauthorizedError('User not found');
        }
        // Generate new tokens
        const newAccessToken = this.tokenService.generateAccessToken(user.id, user.email, session.id);
        const newRefreshToken = this.tokenService.generateRefreshToken(user.id, user.email, session.id);
        // Update session
        await this.repository.updateSession(session.id, {
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
            last_accessed_at: new Date(),
        });
        logAuthEvent('Token refreshed', user.id, user.email, { ipAddress });
        return {
            user: this.mapUserModelToUser(user),
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: 15 * 60, // 15 minutes in seconds
        };
    }
    async forgotPassword(data, ipAddress) {
        // Validate input
        const validatedData = validateRequest(forgotPasswordSchema, data);
        // Sanitize email
        const email = sanitizeEmail(validatedData.email);
        // Find user
        const user = await this.repository.findUserByEmail(email);
        if (!user) {
            // Don't reveal if email exists or not
            logger.info('Password reset requested for non-existent email', { email, ipAddress });
            return;
        }
        // Generate reset token
        const resetToken = this.tokenService.generateSecureToken();
        const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        // Update user with reset token
        await this.repository.updateUser(user.id, {
            password_reset_token: resetToken,
            password_reset_expires_at: resetExpiresAt,
        });
        // Send reset email
        try {
            await this.emailService.sendPasswordResetEmail(email, resetToken);
            logAuthEvent('Password reset requested', user.id, user.email, { ipAddress });
        }
        catch (error) {
            logger.error('Failed to send password reset email', { userId: user.id, email, error });
            throw new Error('Failed to send password reset email');
        }
    }
    async resetPassword(data, ipAddress) {
        // Validate input
        const validatedData = validateRequest(resetPasswordSchema, data);
        // Find user by reset token
        const user = await this.repository.findUserByResetToken(validatedData.token);
        if (!user || !user.password_reset_expires_at || user.password_reset_expires_at < new Date()) {
            logSecurityEvent('Invalid or expired reset token used', undefined, { token: validatedData.token, ipAddress });
            throw new UnauthorizedError('Invalid or expired reset token');
        }
        // Hash new password
        const newPasswordHash = await this.passwordService.hashPassword(validatedData.newPassword);
        // Update user
        await this.repository.updateUser(user.id, {
            password_hash: newPasswordHash,
            password_reset_token: undefined,
            password_reset_expires_at: undefined,
        });
        // Invalidate all sessions
        await this.repository.deleteUserSessions(user.id);
        logAuthEvent('Password reset completed', user.id, user.email, { ipAddress });
    }
    async sendMagicLink(data, ipAddress) {
        // Validate input
        const validatedData = validateRequest(magicLinkSchema, data);
        // Sanitize email
        const email = sanitizeEmail(validatedData.email);
        // Find user
        const user = await this.repository.findUserByEmail(email);
        if (!user) {
            // Don't reveal if email exists or not
            logger.info('Magic link requested for non-existent email', { email, ipAddress });
            return;
        }
        // Generate magic link token
        const magicToken = this.tokenService.generateSecureToken();
        const magicExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        // Update user with magic link token
        await this.repository.updateUser(user.id, {
            magic_link_token: magicToken,
            magic_link_expires_at: magicExpiresAt,
        });
        // Send magic link email
        try {
            await this.emailService.sendMagicLinkEmail(email, magicToken);
            logAuthEvent('Magic link requested', user.id, user.email, { ipAddress });
        }
        catch (error) {
            logger.error('Failed to send magic link email', { userId: user.id, email, error });
            throw new Error('Failed to send magic link email');
        }
    }
    async verifyMagicLink(token, email, ipAddress, userAgent) {
        // Sanitize email
        const sanitizedEmail = sanitizeEmail(email);
        // Find user by magic link token
        const user = await this.repository.findUserByMagicLinkToken(token);
        if (!user || user.email !== sanitizedEmail || !user.magic_link_expires_at || user.magic_link_expires_at < new Date()) {
            logSecurityEvent('Invalid or expired magic link used', user?.id, { token, email: sanitizedEmail, ipAddress });
            throw new UnauthorizedError('Invalid or expired magic link');
        }
        // Clear magic link token
        await this.repository.updateUser(user.id, {
            magic_link_token: undefined,
            magic_link_expires_at: undefined,
            last_login_at: new Date(),
        });
        // Create session
        const sessionId = crypto.randomUUID();
        const accessToken = this.tokenService.generateAccessToken(user.id, user.email, sessionId);
        const refreshToken = this.tokenService.generateRefreshToken(user.id, user.email, sessionId);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        const sessionData = {
            user_id: user.id,
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: expiresAt,
            ip_address: ipAddress,
            user_agent: userAgent,
        };
        await this.repository.createSession(sessionData);
        logAuthEvent('Magic link login successful', user.id, user.email, { ipAddress, userAgent });
        return {
            user: this.mapUserModelToUser(user),
            accessToken,
            refreshToken,
            expiresIn: 15 * 60, // 15 minutes in seconds
        };
    }
    async verifyEmail(token) {
        // Find user by verification token
        const user = await this.repository.findUserByVerificationToken(token);
        if (!user || !user.email_verification_expires_at || user.email_verification_expires_at < new Date()) {
            throw new UnauthorizedError('Invalid or expired verification token');
        }
        // Update user as verified
        await this.repository.updateUser(user.id, {
            email_verified: true,
            email_verification_token: undefined,
            email_verification_expires_at: undefined,
        });
        logAuthEvent('Email verified', user.id, user.email);
    }
    // Helper methods
    mapUserModelToUser(userModel) {
        return {
            id: userModel.id,
            email: userModel.email,
            firstName: userModel.first_name,
            lastName: userModel.last_name,
            profilePicture: userModel.profile_picture,
            preferences: {
                defaultIndustry: undefined,
                defaultRole: undefined,
                notificationSettings: {
                    emailNotifications: true,
                    pushNotifications: true,
                    progressUpdates: true,
                    marketingEmails: false,
                },
                privacySettings: {
                    profileVisibility: 'private',
                    dataSharing: false,
                    analyticsOptOut: false,
                },
            },
            subscription: {
                id: '',
                userId: userModel.id,
                planId: '',
                status: 'active',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(),
                usage: {
                    interviewsThisMonth: 0,
                    interviewsLimit: 3,
                    featuresUsed: [],
                    lastResetDate: new Date(),
                },
                stripeSubscriptionId: '',
            },
            createdAt: userModel.created_at,
            updatedAt: userModel.updated_at,
        };
    }
}
