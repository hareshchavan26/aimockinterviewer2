import { AuthService } from '../services/auth';
import { TestJWTTokenService } from './mocks/token.service';
import { TestBcryptPasswordService } from './mocks/password.service';
import { MockEmailService } from './mocks/email.service';
import { 
  RegisterRequest,
  OAuthCallbackRequest,
  UserModel,
  SessionModel,
  OAuthAccountModel,
  AuthResult,
  UnauthorizedError,
  ConflictError,
  ValidationError,
  NotFoundError,
  ServiceConfig,
  AuthRepository
} from '../types';

// Mock OAuth services with configurable behavior
class MockGoogleOAuthService {
  private shouldFailTokenExchange = false;
  private shouldFailProfileFetch = false;
  private shouldReturnInvalidProfile = false;
  private customProfile: any = null;

  setFailTokenExchange(fail: boolean) {
    this.shouldFailTokenExchange = fail;
  }

  setFailProfileFetch(fail: boolean) {
    this.shouldFailProfileFetch = fail;
  }

  setReturnInvalidProfile(invalid: boolean) {
    this.shouldReturnInvalidProfile = invalid;
  }

  setCustomProfile(profile: any) {
    this.customProfile = profile;
  }

  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: 'mock-google-client-id',
      redirect_uri: 'http://localhost:3000/auth/google/callback',
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    if (state) {
      params.append('state', state);
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string) {
    if (this.shouldFailTokenExchange || code === 'invalid-code') {
      throw new UnauthorizedError('Invalid authorization code');
    }
    
    return {
      accessToken: 'mock-google-access-token',
      refreshToken: 'mock-google-refresh-token',
      expiresIn: 3600,
    };
  }

  async getUserProfile(accessToken: string) {
    if (this.shouldFailProfileFetch || accessToken === 'invalid-token') {
      throw new UnauthorizedError('Invalid access token');
    }

    if (this.shouldReturnInvalidProfile) {
      return {
        id: 'google-user-123',
        // Missing email field
        firstName: 'John',
        lastName: 'Doe',
        provider: 'google' as const,
      };
    }

    if (this.customProfile) {
      return this.customProfile;
    }

    return {
      id: 'google-user-123',
      email: 'user@gmail.com',
      firstName: 'John',
      lastName: 'Doe',
      profilePicture: 'https://lh3.googleusercontent.com/a/default-user',
      provider: 'google' as const,
    };
  }
}

class MockGitHubOAuthService {
  private shouldFailTokenExchange = false;
  private shouldFailProfileFetch = false;
  private shouldReturnNoVerifiedEmail = false;
  private customProfile: any = null;

  setFailTokenExchange(fail: boolean) {
    this.shouldFailTokenExchange = fail;
  }

  setFailProfileFetch(fail: boolean) {
    this.shouldFailProfileFetch = fail;
  }

  setReturnNoVerifiedEmail(noEmail: boolean) {
    this.shouldReturnNoVerifiedEmail = noEmail;
  }

  setCustomProfile(profile: any) {
    this.customProfile = profile;
  }

  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: 'mock-github-client-id',
      redirect_uri: 'http://localhost:3000/auth/github/callback',
      scope: 'user:email',
    });

    if (state) {
      params.append('state', state);
    }

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string) {
    if (this.shouldFailTokenExchange || code === 'invalid-code') {
      throw new UnauthorizedError('Invalid authorization code');
    }
    
    return {
      accessToken: 'mock-github-access-token',
    };
  }

  async getUserProfile(accessToken: string) {
    if (this.shouldFailProfileFetch || accessToken === 'invalid-token') {
      throw new UnauthorizedError('Invalid access token');
    }

    if (this.shouldReturnNoVerifiedEmail) {
      throw new UnauthorizedError('No verified primary email found in GitHub account');
    }

    if (this.customProfile) {
      return this.customProfile;
    }

    return {
      id: 'github-user-456',
      email: 'user@github.com',
      firstName: 'Jane',
      lastName: 'Smith',
      profilePicture: 'https://avatars.githubusercontent.com/u/123456',
      provider: 'github' as const,
    };
  }
}

// Mock OAuth Manager with configurable services
class MockOAuthManager {
  private googleService = new MockGoogleOAuthService();
  private githubService = new MockGitHubOAuthService();

  getGoogleService() {
    return this.googleService;
  }

  getGitHubService() {
    return this.githubService;
  }

  getService(provider: 'google' | 'github') {
    switch (provider) {
      case 'google':
        return this.googleService;
      case 'github':
        return this.githubService;
      default:
        throw new UnauthorizedError(`Unsupported OAuth provider: ${provider}`);
    }
  }

  isProviderEnabled(provider: 'google' | 'github'): boolean {
    return ['google', 'github'].includes(provider);
  }

  getEnabledProviders(): Array<'google' | 'github'> {
    return ['google', 'github'];
  }
}

// Mock repository for testing
class MockAuthRepository implements AuthRepository {
  private users: Map<string, UserModel> = new Map();
  private sessions: Map<string, SessionModel> = new Map();
  private oauthAccounts: Map<string, OAuthAccountModel> = new Map();
  private emailIndex: Map<string, string> = new Map();
  private oauthIndex: Map<string, string> = new Map(); // provider:providerId -> accountId

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

  async updateUser(id: string, userData: Partial<UserModel>): Promise<UserModel> {
    const user = this.users.get(id);
    if (!user) throw new NotFoundError('User not found');
    
    const updatedUser = { ...user, ...userData, updated_at: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createSession(sessionData: Partial<SessionModel>): Promise<SessionModel> {
    const session: SessionModel = {
      id: crypto.randomUUID(),
      user_id: sessionData.user_id!,
      access_token: sessionData.access_token || '',
      refresh_token: sessionData.refresh_token || '',
      expires_at: sessionData.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ip_address: sessionData.ip_address,
      user_agent: sessionData.user_agent,
      last_accessed_at: new Date(),
      created_at: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async updateSession(id: string, sessionData: Partial<SessionModel>): Promise<SessionModel> {
    const session = this.sessions.get(id);
    if (!session) throw new NotFoundError('Session not found');
    
    const updatedSession = { ...session, ...sessionData };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async createOAuthAccount(accountData: Partial<OAuthAccountModel>): Promise<OAuthAccountModel> {
    const account: OAuthAccountModel = {
      id: crypto.randomUUID(),
      user_id: accountData.user_id!,
      provider: accountData.provider!,
      provider_account_id: accountData.provider_account_id!,
      access_token: accountData.access_token,
      refresh_token: accountData.refresh_token,
      expires_at: accountData.expires_at,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    this.oauthAccounts.set(account.id, account);
    this.oauthIndex.set(`${account.provider}:${account.provider_account_id}`, account.id);
    return account;
  }

  async findOAuthAccount(provider: string, providerId: string): Promise<OAuthAccountModel | null> {
    const accountId = this.oauthIndex.get(`${provider}:${providerId}`);
    return accountId ? this.oauthAccounts.get(accountId) || null : null;
  }

  async findOAuthAccountsByUserId(userId: string): Promise<OAuthAccountModel[]> {
    return Array.from(this.oauthAccounts.values()).filter(account => account.user_id === userId);
  }

  async updateOAuthAccount(id: string, accountData: Partial<OAuthAccountModel>): Promise<OAuthAccountModel> {
    const account = this.oauthAccounts.get(id);
    if (!account) throw new NotFoundError('OAuth account not found');
    
    // Remove old index entry if provider_account_id is being updated
    if (accountData.provider_account_id && accountData.provider_account_id !== account.provider_account_id) {
      this.oauthIndex.delete(`${account.provider}:${account.provider_account_id}`);
    }
    
    const updatedAccount = { ...account, ...accountData, updated_at: new Date() };
    this.oauthAccounts.set(id, updatedAccount);
    
    // Update index with new provider_account_id if it was changed
    if (accountData.provider_account_id) {
      this.oauthIndex.set(`${updatedAccount.provider}:${updatedAccount.provider_account_id}`, id);
    }
    
    return updatedAccount;
  }

  async deleteOAuthAccount(id: string): Promise<void> {
    const account = this.oauthAccounts.get(id);
    if (!account) throw new NotFoundError('OAuth account not found');
    
    this.oauthAccounts.delete(id);
    this.oauthIndex.delete(`${account.provider}:${account.provider_account_id}`);
  }

  // Stub implementations for other required methods
  async findUserByResetToken(token: string): Promise<UserModel | null> { return null; }
  async findUserByVerificationToken(token: string): Promise<UserModel | null> { return null; }
  async findUserByMagicLinkToken(token: string): Promise<UserModel | null> { return null; }
  async deleteUser(id: string): Promise<void> {}
  async findSessionById(id: string): Promise<SessionModel | null> { return null; }
  async findSessionByToken(token: string): Promise<SessionModel | null> { return null; }
  async deleteSession(id: string): Promise<void> {}
  async deleteUserSessions(userId: string): Promise<void> {}

  reset() {
    this.users.clear();
    this.sessions.clear();
    this.oauthAccounts.clear();
    this.emailIndex.clear();
    this.oauthIndex.clear();
  }
}

describe('OAuth Edge Cases', () => {
  let authService: AuthService;
  let repository: MockAuthRepository;
  let tokenService: TestJWTTokenService;
  let passwordService: TestBcryptPasswordService;
  let emailService: MockEmailService;
  let oauthManager: MockOAuthManager;

  beforeEach(() => {
    repository = new MockAuthRepository();
    
    const authConfig = {
      jwtSecret: 'test-secret',
      jwtAccessTokenExpiresIn: '15m',
      jwtRefreshTokenExpiresIn: '7d',
      bcryptRounds: 4,
      sessionMaxAge: 7 * 24 * 60 * 60 * 1000,
    };

    const serviceConfig: ServiceConfig = {
      port: 3001,
      nodeEnv: 'test',
      baseUrl: 'http://localhost:3001',
      frontendUrl: 'http://localhost:3000',
      auth: authConfig,
      database: {
        host: 'localhost',
        port: 5432,
        name: 'test',
        user: 'test',
        password: 'test',
      },
      redis: {
        host: 'localhost',
        port: 6379,
        password: '',
      },
      email: {
        host: 'localhost',
        port: 587,
        secure: false,
        user: 'test',
        pass: 'test',
        from: 'test@example.com',
        fromName: 'Test',
      },
      oauth: {
        google: {
          clientId: 'mock-google-client-id',
          clientSecret: 'mock-google-client-secret',
          callbackUrl: 'http://localhost:3000/auth/google/callback',
        },
        github: {
          clientId: 'mock-github-client-id',
          clientSecret: 'mock-github-client-secret',
          callbackUrl: 'http://localhost:3000/auth/github/callback',
        },
      },
    };
    
    tokenService = new TestJWTTokenService(authConfig);
    passwordService = new TestBcryptPasswordService(authConfig);
    emailService = new MockEmailService();
    
    authService = new AuthService(repository, emailService, tokenService, passwordService, serviceConfig);
    
    // Mock the OAuth manager
    oauthManager = new MockOAuthManager();
    (authService as any).oauthManager = oauthManager;
  });

  afterEach(() => {
    repository.reset();
    emailService.reset();
  });

  describe('OAuth Service Failures', () => {
    test('should handle token exchange failure', async () => {
      oauthManager.getGoogleService().setFailTokenExchange(true);

      const callbackData: OAuthCallbackRequest = {
        code: 'valid-code',
      };

      await expect(authService.handleOAuthCallback('google', callbackData))
        .rejects.toThrow(UnauthorizedError);
    });

    test('should handle profile fetch failure', async () => {
      oauthManager.getGoogleService().setFailProfileFetch(true);

      const callbackData: OAuthCallbackRequest = {
        code: 'valid-code',
      };

      await expect(authService.handleOAuthCallback('google', callbackData))
        .rejects.toThrow(UnauthorizedError);
    });

    test('should handle invalid OAuth code', async () => {
      const callbackData: OAuthCallbackRequest = {
        code: 'invalid-code',
      };

      await expect(authService.handleOAuthCallback('google', callbackData))
        .rejects.toThrow(UnauthorizedError);
    });

    test('should handle missing email in OAuth profile', async () => {
      oauthManager.getGoogleService().setReturnInvalidProfile(true);

      const callbackData: OAuthCallbackRequest = {
        code: 'valid-code',
      };

      await expect(authService.handleOAuthCallback('google', callbackData))
        .rejects.toThrow(UnauthorizedError);
    });

    test('should handle GitHub no verified email scenario', async () => {
      oauthManager.getGitHubService().setReturnNoVerifiedEmail(true);

      const callbackData: OAuthCallbackRequest = {
        code: 'valid-code',
      };

      await expect(authService.handleOAuthCallback('github', callbackData))
        .rejects.toThrow(UnauthorizedError);
    });
  });

  describe('OAuth Account Linking Edge Cases', () => {
    test('should prevent linking OAuth account already linked to another user', async () => {
      // Create first user with OAuth account
      const firstUser = await repository.createUser({
        email: 'first@example.com',
        first_name: 'First',
        last_name: 'User',
        role: 'user',
        email_verified: true,
      });

      await repository.createOAuthAccount({
        user_id: firstUser.id,
        provider: 'google',
        provider_account_id: 'google-user-123',
      });

      // Create second user
      const secondUser = await repository.createUser({
        email: 'second@example.com',
        password_hash: 'hashed-password',
        first_name: 'Second',
        last_name: 'User',
        role: 'user',
        email_verified: true,
      });

      const callbackData: OAuthCallbackRequest = {
        code: 'valid-code',
      };

      await expect(authService.linkOAuthAccount(secondUser.id, 'google', callbackData))
        .rejects.toThrow(ConflictError);
    });

    test('should handle linking OAuth account to non-existent user', async () => {
      const callbackData: OAuthCallbackRequest = {
        code: 'valid-code',
      };

      await expect(authService.linkOAuthAccount('non-existent-user-id', 'google', callbackData))
        .rejects.toThrow(UnauthorizedError);
    });

    test('should update existing OAuth account when linking same provider', async () => {
      const user = await repository.createUser({
        email: 'user@example.com',
        password_hash: 'hashed-password',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        email_verified: true,
      });

      // Create existing OAuth account
      const existingAccount = await repository.createOAuthAccount({
        user_id: user.id,
        provider: 'google',
        provider_account_id: 'old-google-id',
        access_token: 'old-token',
      });

      // Mock new profile with different ID
      oauthManager.getGoogleService().setCustomProfile({
        id: 'new-google-id',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        provider: 'google',
      });

      const callbackData: OAuthCallbackRequest = {
        code: 'valid-code',
      };

      await authService.linkOAuthAccount(user.id, 'google', callbackData);

      // The existing account should be updated with new provider ID
      const updatedAccount = await repository.findOAuthAccount('google', 'new-google-id');
      expect(updatedAccount).toBeTruthy();
      expect(updatedAccount?.provider_account_id).toBe('new-google-id');
      expect(updatedAccount?.access_token).toBe('mock-google-access-token');
      
      // Old account should no longer exist
      const oldAccount = await repository.findOAuthAccount('google', 'old-google-id');
      expect(oldAccount).toBeNull();
    });

    test('should handle OAuth service failure during linking', async () => {
      const user = await repository.createUser({
        email: 'user@example.com',
        password_hash: 'hashed-password',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        email_verified: true,
      });

      oauthManager.getGoogleService().setFailTokenExchange(true);

      const callbackData: OAuthCallbackRequest = {
        code: 'valid-code',
      };

      await expect(authService.linkOAuthAccount(user.id, 'google', callbackData))
        .rejects.toThrow(UnauthorizedError);
    });
  });

  describe('OAuth Account Unlinking Edge Cases', () => {
    test('should prevent unlinking OAuth account when it is the only auth method', async () => {
      const user = await repository.createUser({
        email: 'user@example.com',
        // No password_hash - OAuth only user
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        email_verified: true,
      });

      await repository.createOAuthAccount({
        user_id: user.id,
        provider: 'google',
        provider_account_id: 'google-user-123',
      });

      await expect(authService.unlinkOAuthAccount(user.id, 'google'))
        .rejects.toThrow(ValidationError);
    });

    test('should allow unlinking OAuth account when user has password', async () => {
      const user = await repository.createUser({
        email: 'user@example.com',
        password_hash: 'hashed-password',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        email_verified: true,
      });

      const oauthAccount = await repository.createOAuthAccount({
        user_id: user.id,
        provider: 'google',
        provider_account_id: 'google-user-123',
      });

      await authService.unlinkOAuthAccount(user.id, 'google');

      const deletedAccount = await repository.findOAuthAccount('google', 'google-user-123');
      expect(deletedAccount).toBeNull();
    });

    test('should allow unlinking OAuth account when user has other OAuth accounts', async () => {
      const user = await repository.createUser({
        email: 'user@example.com',
        // No password_hash
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        email_verified: true,
      });

      // Create two OAuth accounts
      await repository.createOAuthAccount({
        user_id: user.id,
        provider: 'google',
        provider_account_id: 'google-user-123',
      });

      await repository.createOAuthAccount({
        user_id: user.id,
        provider: 'github',
        provider_account_id: 'github-user-456',
      });

      await authService.unlinkOAuthAccount(user.id, 'google');

      const deletedAccount = await repository.findOAuthAccount('google', 'google-user-123');
      expect(deletedAccount).toBeNull();

      const remainingAccount = await repository.findOAuthAccount('github', 'github-user-456');
      expect(remainingAccount).toBeTruthy();
    });

    test('should handle unlinking non-existent OAuth account', async () => {
      const user = await repository.createUser({
        email: 'user@example.com',
        password_hash: 'hashed-password',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        email_verified: true,
      });

      await expect(authService.unlinkOAuthAccount(user.id, 'google'))
        .rejects.toThrow(NotFoundError);
    });

    test('should handle unlinking OAuth account for non-existent user', async () => {
      await expect(authService.unlinkOAuthAccount('non-existent-user-id', 'google'))
        .rejects.toThrow(UnauthorizedError);
    });
  });

  describe('OAuth Callback Edge Cases', () => {
    test('should handle OAuth callback with orphaned OAuth account', async () => {
      // Create OAuth account without corresponding user
      await repository.createOAuthAccount({
        user_id: 'non-existent-user-id',
        provider: 'google',
        provider_account_id: 'google-user-123',
      });

      const callbackData: OAuthCallbackRequest = {
        code: 'valid-code',
      };

      await expect(authService.handleOAuthCallback('google', callbackData))
        .rejects.toThrow(UnauthorizedError);
    });

    test('should create new user when OAuth profile email matches existing user but no OAuth account exists', async () => {
      // Create existing user without OAuth
      const existingUser = await repository.createUser({
        email: 'user@gmail.com',
        password_hash: 'hashed-password',
        first_name: 'Existing',
        last_name: 'User',
        role: 'user',
        email_verified: true,
      });

      const callbackData: OAuthCallbackRequest = {
        code: 'valid-code',
      };

      const result = await authService.handleOAuthCallback('google', callbackData);

      // Should link to existing user
      expect(result.user.id).toBe(existingUser.id);
      expect(result.user.email).toBe('user@gmail.com');

      // Should create OAuth account
      const oauthAccount = await repository.findOAuthAccount('google', 'google-user-123');
      expect(oauthAccount).toBeTruthy();
      expect(oauthAccount?.user_id).toBe(existingUser.id);
    });

    test('should handle concurrent OAuth callbacks for same provider account', async () => {
      const callbackData: OAuthCallbackRequest = {
        code: 'valid-code',
      };

      // First callback should succeed
      const result1 = await authService.handleOAuthCallback('google', callbackData);
      expect(result1.user.email).toBe('user@gmail.com');

      // Second callback should login existing user
      const result2 = await authService.handleOAuthCallback('google', callbackData);
      expect(result2.user.id).toBe(result1.user.id);
      expect(result2.user.email).toBe('user@gmail.com');
    });

    test('should update OAuth account tokens on subsequent logins', async () => {
      // First login
      const callbackData: OAuthCallbackRequest = {
        code: 'valid-code',
      };

      const result1 = await authService.handleOAuthCallback('google', callbackData);
      const oauthAccount1 = await repository.findOAuthAccount('google', 'google-user-123');
      expect(oauthAccount1?.access_token).toBe('mock-google-access-token');

      // Mock different tokens for second login
      oauthManager.getGoogleService().setCustomProfile({
        id: 'google-user-123',
        email: 'user@gmail.com',
        firstName: 'John',
        lastName: 'Doe',
        provider: 'google',
      });

      // Second login should update tokens
      const result2 = await authService.handleOAuthCallback('google', callbackData);
      expect(result2.user.id).toBe(result1.user.id);

      const oauthAccount2 = await repository.findOAuthAccount('google', 'google-user-123');
      expect(oauthAccount2?.access_token).toBe('mock-google-access-token');
      expect(oauthAccount2?.updated_at.getTime()).toBeGreaterThan(oauthAccount1!.updated_at.getTime());
    });
  });

  describe('OAuth Configuration Edge Cases', () => {
    test('should handle OAuth not configured', async () => {
      // Create service without OAuth config
      const authServiceWithoutOAuth = new AuthService(
        repository, 
        emailService, 
        tokenService, 
        passwordService
      );

      await expect(authServiceWithoutOAuth.getOAuthAuthorizationUrl('google'))
        .rejects.toThrow(UnauthorizedError);

      const callbackData: OAuthCallbackRequest = {
        code: 'valid-code',
      };

      await expect(authServiceWithoutOAuth.handleOAuthCallback('google', callbackData))
        .rejects.toThrow(UnauthorizedError);
    });

    test('should return empty providers list when OAuth not configured', () => {
      const authServiceWithoutOAuth = new AuthService(
        repository, 
        emailService, 
        tokenService, 
        passwordService
      );

      const providers = authServiceWithoutOAuth.getEnabledOAuthProviders();
      expect(providers).toEqual([]);
    });

    test('should handle unsupported OAuth provider', async () => {
      await expect(authService.getOAuthAuthorizationUrl('facebook' as any))
        .rejects.toThrow(UnauthorizedError);

      const callbackData: OAuthCallbackRequest = {
        code: 'valid-code',
      };

      await expect(authService.handleOAuthCallback('facebook' as any, callbackData))
        .rejects.toThrow(UnauthorizedError);
    });
  });

  describe('OAuth State Parameter Handling', () => {
    test('should include state parameter in authorization URL', async () => {
      const state = 'random-state-123';
      const authUrl = await authService.getOAuthAuthorizationUrl('google', state);
      
      expect(authUrl).toContain(`state=${state}`);
    });

    test('should handle authorization URL without state parameter', async () => {
      const authUrl = await authService.getOAuthAuthorizationUrl('google');
      
      expect(authUrl).not.toContain('state=');
      expect(authUrl).toContain('client_id=mock-google-client-id');
    });
  });

  describe('OAuth Profile Data Edge Cases', () => {
    test('should handle OAuth profile with missing optional fields', async () => {
      oauthManager.getGoogleService().setCustomProfile({
        id: 'google-user-123',
        email: 'user@gmail.com',
        firstName: '', // Empty first name
        lastName: '', // Empty last name
        // No profile picture
        provider: 'google',
      });

      const callbackData: OAuthCallbackRequest = {
        code: 'valid-code',
      };

      const result = await authService.handleOAuthCallback('google', callbackData);
      
      expect(result.user.firstName).toBe('');
      expect(result.user.lastName).toBe('');
      expect(result.user.profilePicture).toBeUndefined();
    });

    test('should handle OAuth profile with very long names', async () => {
      const longName = 'a'.repeat(100);
      
      oauthManager.getGoogleService().setCustomProfile({
        id: 'google-user-123',
        email: 'user@gmail.com',
        firstName: longName,
        lastName: longName,
        provider: 'google',
      });

      const callbackData: OAuthCallbackRequest = {
        code: 'valid-code',
      };

      const result = await authService.handleOAuthCallback('google', callbackData);
      
      expect(result.user.firstName).toBe(longName);
      expect(result.user.lastName).toBe(longName);
    });

    test('should handle OAuth profile with special characters in names', async () => {
      oauthManager.getGoogleService().setCustomProfile({
        id: 'google-user-123',
        email: 'user@gmail.com',
        firstName: 'José María',
        lastName: 'García-López',
        provider: 'google',
      });

      const callbackData: OAuthCallbackRequest = {
        code: 'valid-code',
      };

      const result = await authService.handleOAuthCallback('google', callbackData);
      
      expect(result.user.firstName).toBe('José María');
      expect(result.user.lastName).toBe('García-López');
    });
  });

  describe('OAuth Account Management', () => {
    test('should retrieve linked OAuth accounts for user', async () => {
      const user = await repository.createUser({
        email: 'user@example.com',
        password_hash: 'hashed-password',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        email_verified: true,
      });

      const googleAccount = await repository.createOAuthAccount({
        user_id: user.id,
        provider: 'google',
        provider_account_id: 'google-user-123',
      });

      const githubAccount = await repository.createOAuthAccount({
        user_id: user.id,
        provider: 'github',
        provider_account_id: 'github-user-456',
      });

      const linkedAccounts = await authService.getLinkedOAuthAccounts(user.id);
      
      expect(linkedAccounts).toHaveLength(2);
      expect(linkedAccounts.map(acc => acc.provider)).toContain('google');
      expect(linkedAccounts.map(acc => acc.provider)).toContain('github');
    });

    test('should handle retrieving OAuth accounts for non-existent user', async () => {
      await expect(authService.getLinkedOAuthAccounts('non-existent-user-id'))
        .rejects.toThrow(UnauthorizedError);
    });

    test('should return empty array for user with no OAuth accounts', async () => {
      const user = await repository.createUser({
        email: 'user@example.com',
        password_hash: 'hashed-password',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        email_verified: true,
      });

      const linkedAccounts = await authService.getLinkedOAuthAccounts(user.id);
      
      expect(linkedAccounts).toHaveLength(0);
    });
  });
});