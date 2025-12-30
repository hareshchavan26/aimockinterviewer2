import { AuthService } from '../services/auth';
import { TestJWTTokenService } from './mocks/token.service';
import { TestBcryptPasswordService } from './mocks/password.service';
import { MockEmailService } from './mocks/email.service';
import { 
  RegisterRequest, 
  ForgotPasswordRequest,
  ResetPasswordRequest,
  MagicLinkRequest,
  UserModel,
  AuthResult,
  UnauthorizedError,
  AuthConfig
} from '../types';

// Mock repository for testing
class MockAuthRepository {
  private users: Map<string, UserModel> = new Map();
  private sessions: Map<string, any> = new Map();
  private emailIndex: Map<string, string> = new Map();

  async createUser(userData: Partial<UserModel>): Promise<UserModel> {
    const user: UserModel = {
      id: crypto.randomUUID(),
      email: userData.email!,
      password_hash: userData.password_hash,
      first_name: userData.first_name!,
      last_name: userData.last_name!,
      profile_picture: userData.profile_picture,
      role: userData.role || 'user',
      email_verified: userData.email_verified || false,
      email_verification_token: userData.email_verification_token,
      email_verification_expires_at: userData.email_verification_expires_at,
      password_reset_token: userData.password_reset_token,
      password_reset_expires_at: userData.password_reset_expires_at,
      magic_link_token: userData.magic_link_token,
      magic_link_expires_at: userData.magic_link_expires_at,
      last_login_at: userData.last_login_at,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    this.users.set(user.id, user);
    this.emailIndex.set(user.email, user.id);
    return user;
  }

  async findUserByEmail(email: string): Promise<UserModel | null> {
    const userId = this.emailIndex.get(email);
    return userId ? this.users.get(userId) || null : null;
  }

  async findUserById(id: string): Promise<UserModel | null> {
    return this.users.get(id) || null;
  }

  async findUserByResetToken(token: string): Promise<UserModel | null> {
    for (const user of this.users.values()) {
      if (user.password_reset_token === token) {
        return user;
      }
    }
    return null;
  }

  async findUserByVerificationToken(token: string): Promise<UserModel | null> {
    for (const user of this.users.values()) {
      if (user.email_verification_token === token) {
        return user;
      }
    }
    return null;
  }

  async findUserByMagicLinkToken(token: string): Promise<UserModel | null> {
    for (const user of this.users.values()) {
      if (user.magic_link_token === token) {
        return user;
      }
    }
    return null;
  }

  async updateUser(id: string, userData: Partial<UserModel>): Promise<UserModel> {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found');
    
    const updatedUser = { ...user, ...userData, updated_at: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createSession(sessionData: any): Promise<any> {
    const session = {
      id: crypto.randomUUID(),
      ...sessionData,
      created_at: new Date(),
      last_accessed_at: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async deleteUserSessions(userId: string): Promise<void> {
    for (const [id, session] of this.sessions.entries()) {
      if (session.user_id === userId) {
        this.sessions.delete(id);
      }
    }
  }

  reset() {
    this.users.clear();
    this.sessions.clear();
    this.emailIndex.clear();
  }
}

describe('Email-Based Authentication Flows', () => {
  let authService: AuthService;
  let repository: MockAuthRepository;
  let tokenService: TestJWTTokenService;
  let passwordService: TestBcryptPasswordService;
  let emailService: MockEmailService;

  beforeEach(() => {
    repository = new MockAuthRepository();
    
    const authConfig: AuthConfig = {
      jwtSecret: 'test-secret',
      jwtAccessTokenExpiresIn: '15m',
      jwtRefreshTokenExpiresIn: '7d',
      bcryptRounds: 4,
      sessionMaxAge: 7 * 24 * 60 * 60 * 1000,
    };
    
    tokenService = new TestJWTTokenService(authConfig);
    passwordService = new TestBcryptPasswordService(authConfig);
    emailService = new MockEmailService();
    
    authService = new AuthService(repository, emailService, tokenService, passwordService);
  });

  afterEach(() => {
    repository.reset();
    emailService.reset();
  });

  describe('Email Registration and Verification Flow', () => {
    test('should register user and send verification email', async () => {
      const registerData: RegisterRequest = {
        email: 'test@example.com',
        password: 'TestPass123@',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await authService.register(registerData);

      // Verify user was created
      expect(result.user.email).toBe(registerData.email);
      expect(result.user.firstName).toBe(registerData.firstName);
      expect(result.user.lastName).toBe(registerData.lastName);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      // Verify verification email was sent
      const sentEmails = emailService.getEmailsByType('verification');
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].email).toBe(registerData.email);
      expect(sentEmails[0].token).toBeDefined();

      // Verify user is not yet verified
      const user = await repository.findUserByEmail(registerData.email);
      expect(user?.email_verified).toBe(false);
      expect(user?.email_verification_token).toBeDefined();
      expect(user?.email_verification_expires_at).toBeDefined();
    });

    test('should verify email with valid token', async () => {
      // Register user
      const registerData: RegisterRequest = {
        email: 'test@example.com',
        password: 'TestPass123@',
        firstName: 'John',
        lastName: 'Doe',
      };

      await authService.register(registerData);

      // Get verification token from sent email
      const sentEmails = emailService.getEmailsByType('verification');
      const verificationToken = sentEmails[0].token;

      // Verify email
      await authService.verifyEmail(verificationToken);

      // Check user is now verified
      const user = await repository.findUserByEmail(registerData.email);
      expect(user?.email_verified).toBe(true);
      expect(user?.email_verification_token).toBeUndefined();
      expect(user?.email_verification_expires_at).toBeUndefined();
    });

    test('should reject invalid verification token', async () => {
      await expect(authService.verifyEmail('invalid-token'))
        .rejects.toThrow(UnauthorizedError);
    });

    test('should reject expired verification token', async () => {
      // Register user
      const registerData: RegisterRequest = {
        email: 'test@example.com',
        password: 'TestPass123@',
        firstName: 'John',
        lastName: 'Doe',
      };

      await authService.register(registerData);

      // Manually expire the verification token
      const user = await repository.findUserByEmail(registerData.email);
      await repository.updateUser(user!.id, {
        email_verification_expires_at: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      const sentEmails = emailService.getEmailsByType('verification');
      const verificationToken = sentEmails[0].token;

      await expect(authService.verifyEmail(verificationToken))
        .rejects.toThrow(UnauthorizedError);
    });
  });

  describe('Password Reset Flow', () => {
    test('should send password reset email for existing user', async () => {
      // Register user first
      const registerData: RegisterRequest = {
        email: 'test@example.com',
        password: 'TestPass123@',
        firstName: 'John',
        lastName: 'Doe',
      };

      await authService.register(registerData);
      emailService.reset(); // Clear registration emails

      // Request password reset
      const forgotPasswordData: ForgotPasswordRequest = {
        email: registerData.email,
      };

      await authService.forgotPassword(forgotPasswordData);

      // Verify reset email was sent
      const sentEmails = emailService.getEmailsByType('passwordReset');
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].email).toBe(registerData.email);
      expect(sentEmails[0].token).toBeDefined();

      // Verify user has reset token
      const user = await repository.findUserByEmail(registerData.email);
      expect(user?.password_reset_token).toBeDefined();
      expect(user?.password_reset_expires_at).toBeDefined();
    });

    test('should not reveal if email does not exist', async () => {
      const forgotPasswordData: ForgotPasswordRequest = {
        email: 'nonexistent@example.com',
      };

      // Should not throw error even for non-existent email
      await expect(authService.forgotPassword(forgotPasswordData))
        .resolves.not.toThrow();

      // Should not send any emails
      const sentEmails = emailService.getEmailsByType('passwordReset');
      expect(sentEmails).toHaveLength(0);
    });

    test('should reset password with valid token', async () => {
      // Register user and request password reset
      const registerData: RegisterRequest = {
        email: 'test@example.com',
        password: 'TestPass123@',
        firstName: 'John',
        lastName: 'Doe',
      };

      await authService.register(registerData);
      
      const forgotPasswordData: ForgotPasswordRequest = {
        email: registerData.email,
      };

      await authService.forgotPassword(forgotPasswordData);

      // Get reset token
      const sentEmails = emailService.getEmailsByType('passwordReset');
      const resetToken = sentEmails[0].token;

      // Reset password
      const resetPasswordData: ResetPasswordRequest = {
        token: resetToken,
        newPassword: 'NewPass456@',
      };

      await authService.resetPassword(resetPasswordData);

      // Verify password was changed
      const user = await repository.findUserByEmail(registerData.email);
      expect(user?.password_reset_token).toBeUndefined();
      expect(user?.password_reset_expires_at).toBeUndefined();

      // Verify can login with new password
      const loginResult = await authService.login({
        email: registerData.email,
        password: resetPasswordData.newPassword,
      });

      expect(loginResult.user.email).toBe(registerData.email);
    });

    test('should reject invalid reset token', async () => {
      const resetPasswordData: ResetPasswordRequest = {
        token: 'invalid-token',
        newPassword: 'NewPass456@',
      };

      await expect(authService.resetPassword(resetPasswordData))
        .rejects.toThrow(UnauthorizedError);
    });

    test('should reject expired reset token', async () => {
      // Register user and request password reset
      const registerData: RegisterRequest = {
        email: 'test@example.com',
        password: 'TestPass123@',
        firstName: 'John',
        lastName: 'Doe',
      };

      await authService.register(registerData);
      await authService.forgotPassword({ email: registerData.email });

      // Manually expire the reset token
      const user = await repository.findUserByEmail(registerData.email);
      await repository.updateUser(user!.id, {
        password_reset_expires_at: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      const sentEmails = emailService.getEmailsByType('passwordReset');
      const resetToken = sentEmails[0].token;

      const resetPasswordData: ResetPasswordRequest = {
        token: resetToken,
        newPassword: 'NewPass456@',
      };

      await expect(authService.resetPassword(resetPasswordData))
        .rejects.toThrow(UnauthorizedError);
    });
  });

  describe('Magic Link Authentication Flow', () => {
    test('should send magic link for existing user', async () => {
      // Register user first
      const registerData: RegisterRequest = {
        email: 'test@example.com',
        password: 'TestPass123@',
        firstName: 'John',
        lastName: 'Doe',
      };

      await authService.register(registerData);
      emailService.reset(); // Clear registration emails

      // Request magic link
      const magicLinkData: MagicLinkRequest = {
        email: registerData.email,
      };

      await authService.sendMagicLink(magicLinkData);

      // Verify magic link email was sent
      const sentEmails = emailService.getEmailsByType('magicLink');
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].email).toBe(registerData.email);
      expect(sentEmails[0].token).toBeDefined();

      // Verify user has magic link token
      const user = await repository.findUserByEmail(registerData.email);
      expect(user?.magic_link_token).toBeDefined();
      expect(user?.magic_link_expires_at).toBeDefined();
    });

    test('should not reveal if email does not exist for magic link', async () => {
      const magicLinkData: MagicLinkRequest = {
        email: 'nonexistent@example.com',
      };

      // Should not throw error even for non-existent email
      await expect(authService.sendMagicLink(magicLinkData))
        .resolves.not.toThrow();

      // Should not send any emails
      const sentEmails = emailService.getEmailsByType('magicLink');
      expect(sentEmails).toHaveLength(0);
    });

    test('should authenticate with valid magic link', async () => {
      // Register user and request magic link
      const registerData: RegisterRequest = {
        email: 'test@example.com',
        password: 'TestPass123@',
        firstName: 'John',
        lastName: 'Doe',
      };

      await authService.register(registerData);
      
      const magicLinkData: MagicLinkRequest = {
        email: registerData.email,
      };

      await authService.sendMagicLink(magicLinkData);

      // Get magic link token
      const sentEmails = emailService.getEmailsByType('magicLink');
      const magicToken = sentEmails[0].token;

      // Verify magic link
      const result = await authService.verifyMagicLink(magicToken, registerData.email);

      expect(result.user.email).toBe(registerData.email);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      // Verify magic link token was cleared
      const user = await repository.findUserByEmail(registerData.email);
      expect(user?.magic_link_token).toBeUndefined();
      expect(user?.magic_link_expires_at).toBeUndefined();
    });

    test('should reject invalid magic link token', async () => {
      await expect(authService.verifyMagicLink('invalid-token', 'test@example.com'))
        .rejects.toThrow(UnauthorizedError);
    });

    test('should reject magic link with wrong email', async () => {
      // Register user and request magic link
      const registerData: RegisterRequest = {
        email: 'test@example.com',
        password: 'TestPass123@',
        firstName: 'John',
        lastName: 'Doe',
      };

      await authService.register(registerData);
      await authService.sendMagicLink({ email: registerData.email });

      const sentEmails = emailService.getEmailsByType('magicLink');
      const magicToken = sentEmails[0].token;

      // Try to verify with wrong email
      await expect(authService.verifyMagicLink(magicToken, 'wrong@example.com'))
        .rejects.toThrow(UnauthorizedError);
    });

    test('should reject expired magic link', async () => {
      // Register user and request magic link
      const registerData: RegisterRequest = {
        email: 'test@example.com',
        password: 'TestPass123@',
        firstName: 'John',
        lastName: 'Doe',
      };

      await authService.register(registerData);
      await authService.sendMagicLink({ email: registerData.email });

      // Manually expire the magic link token
      const user = await repository.findUserByEmail(registerData.email);
      await repository.updateUser(user!.id, {
        magic_link_expires_at: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      const sentEmails = emailService.getEmailsByType('magicLink');
      const magicToken = sentEmails[0].token;

      await expect(authService.verifyMagicLink(magicToken, registerData.email))
        .rejects.toThrow(UnauthorizedError);
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete user journey with email flows', async () => {
      // 1. Register user
      const registerData: RegisterRequest = {
        email: 'journey@example.com',
        password: 'TestPass123@',
        firstName: 'Journey',
        lastName: 'User',
      };

      const registerResult = await authService.register(registerData);
      expect(registerResult.user.email).toBe(registerData.email);

      // 2. Verify email
      const verificationEmails = emailService.getEmailsByType('verification');
      await authService.verifyEmail(verificationEmails[0].token);

      const verifiedUser = await repository.findUserByEmail(registerData.email);
      expect(verifiedUser?.email_verified).toBe(true);

      // 3. Reset password
      emailService.reset();
      await authService.forgotPassword({ email: registerData.email });
      
      const resetEmails = emailService.getEmailsByType('passwordReset');
      await authService.resetPassword({
        token: resetEmails[0].token,
        newPassword: 'NewPass456@',
      });

      // 4. Login with new password
      const loginResult = await authService.login({
        email: registerData.email,
        password: 'NewPass456@',
      });
      expect(loginResult.user.email).toBe(registerData.email);

      // 5. Use magic link
      emailService.reset();
      await authService.sendMagicLink({ email: registerData.email });
      
      const magicEmails = emailService.getEmailsByType('magicLink');
      const magicResult = await authService.verifyMagicLink(
        magicEmails[0].token, 
        registerData.email
      );
      expect(magicResult.user.email).toBe(registerData.email);
    });
  });
});