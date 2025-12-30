import fc from 'fast-check';
import { AuthService } from '../services/auth';
import { TestJWTTokenService } from './mocks/token.service';
import { TestBcryptPasswordService } from './mocks/password.service';
import { MockEmailService } from './mocks/email.service';
import { 
  RegisterRequest, 
  LoginRequest, 
  RefreshTokenRequest,
  UserModel,
  AuthResult,
  UnauthorizedError,
  AuthConfig
} from '../types';

// Mock implementations for testing
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

  async findSessionById(id: string): Promise<any> {
    return this.sessions.get(id) || null;
  }

  async findSessionByToken(token: string): Promise<any> {
    for (const session of this.sessions.values()) {
      if (session.access_token === token || session.refresh_token === token) {
        return session;
      }
    }
    return null;
  }

  async updateSession(id: string, sessionData: any): Promise<any> {
    const session = this.sessions.get(id);
    if (!session) throw new Error('Session not found');
    
    const updatedSession = { ...session, ...sessionData };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async deleteUserSessions(userId: string): Promise<void> {
    for (const [id, session] of this.sessions.entries()) {
      if (session.user_id === userId) {
        this.sessions.delete(id);
      }
    }
  }

  // Test helpers
  getAllSessions(): any[] {
    return Array.from(this.sessions.values());
  }

  getSessionsByUserId(userId: string): any[] {
    return Array.from(this.sessions.values()).filter(s => s.user_id === userId);
  }

  reset() {
    this.users.clear();
    this.sessions.clear();
    this.emailIndex.clear();
  }
}

describe('Session Management Properties', () => {
  let authService: AuthService;
  let repository: MockAuthRepository;
  let tokenService: TestJWTTokenService;
  let passwordService: TestBcryptPasswordService;
  let emailService: MockEmailService;

  beforeEach(() => {
    repository = new MockAuthRepository();
    repository.reset();
    
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
    emailService.reset();
    
    authService = new AuthService(repository, emailService, tokenService, passwordService);
  });

  afterEach(() => {
    repository.reset();
  });

  /**
   * Property 2: Session Lifecycle Management
   * 
   * This property validates that session management maintains security and consistency:
   * 1. Sessions are created correctly on login/registration
   * 2. Sessions can be refreshed with valid refresh tokens
   * 3. Sessions are properly invalidated on logout
   * 4. Expired sessions cannot be used
   * 5. Session isolation between users
   * 6. Session cleanup works correctly
   */
  describe('Property 2: Session Lifecycle Management', () => {
    // Arbitraries for generating test data
    const validEmailArb = fc.constant(null)
      .map(() => {
        // Use UUID for guaranteed uniqueness
        const uuid = crypto.randomUUID();
        return `user${uuid}@test.com`;
      });
    
    const validPasswordArb = fc.string({ minLength: 8, maxLength: 128 })
      .map(base => {
        let result = 'Aa1@'; // Ensure requirements
        const remaining = Math.max(4, 8 - result.length);
        for (let i = 0; i < remaining && i < base.length; i++) {
          result += base[i];
        }
        while (result.length < 8) {
          result += 'a';
        }
        return result;
      });
    
    const validNameArb = fc.string({ minLength: 1, maxLength: 50 })
      .filter(name => /^[a-zA-Z\s'-]+$/.test(name) && name.trim().length > 0)
      .map(name => name.trim());

    const registerRequestArb = fc.record({
      email: validEmailArb,
      password: validPasswordArb,
      firstName: validNameArb,
      lastName: validNameArb,
    });

    test('Property: Session creation and validation', async () => {
      await fc.assert(
        fc.asyncProperty(registerRequestArb, async (registerData) => {
          // Register user
          const authResult = await authService.register(registerData);
          
          // Verify session was created
          const sessions = repository.getSessionsByUserId(authResult.user.id);
          expect(sessions).toHaveLength(1);
          
          const session = sessions[0];
          expect(session.user_id).toBe(authResult.user.id);
          expect(session.access_token).toBe(authResult.accessToken);
          expect(session.refresh_token).toBe(authResult.refreshToken);
          expect(session.expires_at).toBeInstanceOf(Date);
          expect(session.created_at).toBeInstanceOf(Date);
          expect(session.last_accessed_at).toBeInstanceOf(Date);
          
          // Verify tokens are valid
          const accessPayload = tokenService.verifyAccessToken(authResult.accessToken);
          expect(accessPayload.userId).toBe(authResult.user.id);
          expect(accessPayload.email).toBe(authResult.user.email);
          
          const refreshPayload = tokenService.verifyRefreshToken(authResult.refreshToken);
          expect(refreshPayload.userId).toBe(authResult.user.id);
          expect(refreshPayload.email).toBe(authResult.user.email);
        }),
        { numRuns: 10, timeout: 10000 }
      );
    });

    test('Property: Session refresh functionality', async () => {
      await fc.assert(
        fc.asyncProperty(registerRequestArb, async (registerData) => {
          // Reset repository for this test run
          repository.reset();
          
          // Register user (creates 1 session)
          const registerResult = await authService.register(registerData);
          
          // Use the registration session for refresh test
          const originalAccessToken = registerResult.accessToken;
          const originalRefreshToken = registerResult.refreshToken;
          
          // Refresh token
          const refreshRequest: RefreshTokenRequest = {
            refreshToken: originalRefreshToken,
          };
          
          const refreshResult = await authService.refreshToken(refreshRequest);
          
          // Verify new tokens are different
          expect(refreshResult.accessToken).not.toBe(originalAccessToken);
          expect(refreshResult.refreshToken).not.toBe(originalRefreshToken);
          
          // Verify new tokens are valid
          const newAccessPayload = tokenService.verifyAccessToken(refreshResult.accessToken);
          expect(newAccessPayload.userId).toBe(registerResult.user.id);
          expect(newAccessPayload.email).toBe(registerResult.user.email);
          
          const newRefreshPayload = tokenService.verifyRefreshToken(refreshResult.refreshToken);
          expect(newRefreshPayload.userId).toBe(registerResult.user.id);
          expect(newRefreshPayload.email).toBe(registerResult.user.email);
          
          // Verify still only 1 session (updated)
          const sessions = repository.getSessionsByUserId(registerResult.user.id);
          expect(sessions).toHaveLength(1);
          
          const session = sessions[0];
          expect(session.access_token).toBe(refreshResult.accessToken);
          expect(session.refresh_token).toBe(refreshResult.refreshToken);
        }),
        { numRuns: 10, timeout: 10000 }
      );
    });

    test('Property: Session logout and cleanup', async () => {
      await fc.assert(
        fc.asyncProperty(registerRequestArb, async (registerData) => {
          // Register user
          const authResult = await authService.register(registerData);
          
          // Verify session exists
          let sessions = repository.getSessionsByUserId(authResult.user.id);
          expect(sessions).toHaveLength(1);
          
          const sessionId = sessions[0].id;
          
          // Logout
          await authService.logout(sessionId, authResult.user.id);
          
          // Verify session was deleted
          sessions = repository.getSessionsByUserId(authResult.user.id);
          expect(sessions).toHaveLength(0);
          
          // Verify session cannot be found by ID
          const deletedSession = await repository.findSessionById(sessionId);
          expect(deletedSession).toBeNull();
        }),
        { numRuns: 10, timeout: 10000 }
      );
    });

    test('Property: Multiple session management', async () => {
      await fc.assert(
        fc.asyncProperty(registerRequestArb, async (registerData) => {
          // Reset repository for this test run
          repository.reset();
          
          // Register user (creates 1 session)
          const registerResult = await authService.register(registerData);
          
          // Create additional sessions by logging in multiple times
          const loginSessions: AuthResult[] = [];
          for (let i = 0; i < 3; i++) {
            const loginResult = await authService.login({
              email: registerData.email,
              password: registerData.password,
            });
            loginSessions.push(loginResult);
          }
          
          // Verify all sessions exist (1 from registration + 3 from logins = 4 total)
          const userSessions = repository.getSessionsByUserId(registerResult.user.id);
          expect(userSessions).toHaveLength(4);
          
          // Verify each session has unique tokens
          const allSessions = [registerResult, ...loginSessions];
          const allTokens = allSessions.flatMap(s => [s.accessToken, s.refreshToken]);
          const uniqueTokens = new Set(allTokens);
          expect(uniqueTokens.size).toBe(allTokens.length);
          
          // Logout from all sessions
          await authService.logoutAll(registerResult.user.id);
          
          // Verify all sessions were deleted
          const remainingSessions = repository.getSessionsByUserId(registerResult.user.id);
          expect(remainingSessions).toHaveLength(0);
        }),
        { numRuns: 5, timeout: 15000 }
      );
    });

    test('Property: Session isolation between users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(registerRequestArb, { minLength: 2, maxLength: 4 }),
          async (registerDataArray) => {
            // Ensure unique emails
            const uniqueRegisterData = registerDataArray.map((data, index) => ({
              ...data,
              email: `user${index}-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
            }));
            
            const userSessions: { userId: string; authResult: AuthResult }[] = [];
            
            // Register multiple users and create sessions
            for (const registerData of uniqueRegisterData) {
              const authResult = await authService.register(registerData);
              userSessions.push({ userId: authResult.user.id, authResult });
            }
            
            // Verify each user has exactly one session
            for (const { userId } of userSessions) {
              const sessions = repository.getSessionsByUserId(userId);
              expect(sessions).toHaveLength(1);
            }
            
            // Verify sessions are isolated (tokens don't work for other users)
            for (let i = 0; i < userSessions.length; i++) {
              const currentUser = userSessions[i];
              const accessPayload = tokenService.verifyAccessToken(currentUser.authResult.accessToken);
              
              // Verify token belongs to correct user
              expect(accessPayload.userId).toBe(currentUser.userId);
              
              // Verify token doesn't belong to other users
              for (let j = 0; j < userSessions.length; j++) {
                if (i !== j) {
                  const otherUser = userSessions[j];
                  expect(accessPayload.userId).not.toBe(otherUser.userId);
                }
              }
            }
            
            // Logout one user and verify others are unaffected
            const firstUser = userSessions[0];
            await authService.logoutAll(firstUser.userId);
            
            // Verify first user has no sessions
            const firstUserSessions = repository.getSessionsByUserId(firstUser.userId);
            expect(firstUserSessions).toHaveLength(0);
            
            // Verify other users still have sessions
            for (let i = 1; i < userSessions.length; i++) {
              const otherUserSessions = repository.getSessionsByUserId(userSessions[i].userId);
              expect(otherUserSessions).toHaveLength(1);
            }
          }
        ),
        { numRuns: 3, timeout: 20000 }
      );
    });

    test('Property: Invalid refresh token handling', async () => {
      await fc.assert(
        fc.asyncProperty(registerRequestArb, async (registerData) => {
          // Register user
          const authResult = await authService.register(registerData);
          
          // Try to refresh with invalid token
          const invalidRefreshRequest: RefreshTokenRequest = {
            refreshToken: 'invalid-token',
          };
          
          await expect(authService.refreshToken(invalidRefreshRequest))
            .rejects.toThrow(UnauthorizedError);
          
          // Try to refresh with access token (wrong token type)
          const wrongTokenTypeRequest: RefreshTokenRequest = {
            refreshToken: authResult.accessToken,
          };
          
          await expect(authService.refreshToken(wrongTokenTypeRequest))
            .rejects.toThrow(UnauthorizedError);
          
          // Verify original session is still intact
          const sessions = repository.getSessionsByUserId(authResult.user.id);
          expect(sessions).toHaveLength(1);
          
          // Verify original tokens still work
          const accessPayload = tokenService.verifyAccessToken(authResult.accessToken);
          expect(accessPayload.userId).toBe(authResult.user.id);
        }),
        { numRuns: 10, timeout: 10000 }
      );
    });

    test('Property: Session consistency after user updates', async () => {
      await fc.assert(
        fc.asyncProperty(registerRequestArb, async (registerData) => {
          // Register user
          const authResult = await authService.register(registerData);
          
          // Update user (simulate profile update)
          await repository.updateUser(authResult.user.id, {
            first_name: 'Updated',
            last_login_at: new Date(),
          });
          
          // Verify session still exists and is valid
          const sessions = repository.getSessionsByUserId(authResult.user.id);
          expect(sessions).toHaveLength(1);
          
          // Verify tokens still work
          const accessPayload = tokenService.verifyAccessToken(authResult.accessToken);
          expect(accessPayload.userId).toBe(authResult.user.id);
          
          const refreshPayload = tokenService.verifyRefreshToken(authResult.refreshToken);
          expect(refreshPayload.userId).toBe(authResult.user.id);
          
          // Verify refresh still works
          const refreshRequest: RefreshTokenRequest = {
            refreshToken: authResult.refreshToken,
          };
          
          const refreshResult = await authService.refreshToken(refreshRequest);
          expect(refreshResult.user.id).toBe(authResult.user.id);
        }),
        { numRuns: 10, timeout: 10000 }
      );
    });
  });
});