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
  ConflictError,
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

  reset() {
    this.users.clear();
    this.sessions.clear();
    this.emailIndex.clear();
  }
}

describe('Email Authentication', () => {
  let authService: AuthService;
  let repository: MockAuthRepository;
  let tokenService: TestJWTTokenService;
  let passwordService: TestBcryptPasswordService;
  let emailService: MockEmailService;

  beforeEach(() => {
    repository = new MockAuthRepository();
    
    const authConfig = {
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

  describe('User Registration', () => {
    test('should register a new user successfully', async () => {
      const registerData: RegisterRequest = {
        email: 'test@example.com',
        password: 'TestPass123@',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await authService.register(registerData);

      expect(result.user.email).toBe(registerData.email);
      expect(result.user.firstName).toBe(registerData.firstName);
      expect(result.user.lastName).toBe(registerData.lastName);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(emailService.getLastEmailSent()).toBeTruthy();
      expect(emailService.getLastEmailSent()?.type).toBe('verification');
    });

    test('should prevent duplicate email registration', async () => {
      const registerData: RegisterRequest = {
        email: 'test@example.com',
        password: 'TestPass123@',
        firstName: 'John',
        lastName: 'Doe',
      };

      await authService.register(registerData);

      // Try to register with same email
      await expect(authService.register(registerData))
        .rejects.toThrow(ConflictError);
    });
  });

  describe('Password Reset', () => {
    test('should send password reset email for existing user', async () => {
      // First register a user
      const registerData: RegisterRequest = {
        email: 'reset-test@example.com',
        password: 'TestPass123@',
        firstName: 'John',
        lastName: 'Doe',
      };

      await authService.register(registerData);
      emailService.reset(); // Clear registration email

      // Request password reset
      const resetData: ForgotPasswordRequest = {
        email: 'reset-test@example.com',
      };

      await authService.forgotPassword(resetData);

      expect(emailService.getLastEmailSent()).toBeTruthy();
      expect(emailService.getLastEmailSent()?.email).toBe('reset-test@example.com');
      expect(emailService.getLastEmailSent()?.type).toBe('passwordReset');
    });

    test('should handle password reset for non-existent user gracefully', async () => {
      const resetData: ForgotPasswordRequest = {
        email: 'nonexistent@example.com',
      };

      // Should not throw error for security reasons
      await expect(authService.forgotPassword(resetData)).resolves.not.toThrow();
      
      // Should not send email (or should send fewer emails than for existing user)
      const emailCount = emailService.sentEmails.length;
      expect(emailCount).toBe(0);
    });
  });

  describe('Magic Link Authentication', () => {
    test('should send magic link for existing user', async () => {
      // First register a user
      const registerData: RegisterRequest = {
        email: 'magic-test@example.com',
        password: 'TestPass123@',
        firstName: 'John',
        lastName: 'Doe',
      };

      await authService.register(registerData);
      emailService.reset(); // Clear registration email

      // Request magic link
      const magicLinkData: MagicLinkRequest = {
        email: 'magic-test@example.com',
      };

      await authService.sendMagicLink(magicLinkData);

      expect(emailService.getLastEmailSent()).toBeTruthy();
      expect(emailService.getLastEmailSent()?.email).toBe('magic-test@example.com');
      expect(emailService.getLastEmailSent()?.type).toBe('magicLink');
    });

    test('should handle magic link for non-existent user gracefully', async () => {
      const magicLinkData: MagicLinkRequest = {
        email: 'nonexistent@example.com',
      };

      // Should not throw error for security reasons
      await expect(authService.sendMagicLink(magicLinkData)).resolves.not.toThrow();
      
      // Should not send email (or should send fewer emails than for existing user)
      const emailCount = emailService.sentEmails.length;
      expect(emailCount).toBe(0);
    });
  });
});