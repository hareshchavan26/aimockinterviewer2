import fc from 'fast-check';
import { AuthService } from '../services/auth';
import { PostgresAuthRepository } from '../database/repository';
import { TestJWTTokenService } from './mocks/token.service';
import { TestBcryptPasswordService } from './mocks/password.service';
import { MockEmailService } from './mocks/email.service';
import { 
  RegisterRequest, 
  LoginRequest, 
  UserModel,
  AuthResult,
  UnauthorizedError,
  ConflictError,
  ValidationError,
  AuthConfig
} from '../types';

// Mock implementations for testing
class MockAuthRepository extends PostgresAuthRepository {
  private users: Map<string, UserModel> = new Map();
  private sessions: Map<string, any> = new Map();
  private emailIndex: Map<string, string> = new Map();

  async createUser(userData: Partial<UserModel>): Promise<UserModel> {
    if (this.emailIndex.has(userData.email!)) {
      throw new ConflictError('Email already exists');
    }
    
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

  async findSessionByToken(token: string): Promise<any> {
    for (const session of this.sessions.values()) {
      if (session.access_token === token || session.refresh_token === token) {
        return session;
      }
    }
    return null;
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

  // Reset for testing
  reset() {
    this.users.clear();
    this.sessions.clear();
    this.emailIndex.clear();
  }
}

describe('Authentication Security Properties', () => {
  let authService: AuthService;
  let repository: MockAuthRepository;
  let tokenService: TestJWTTokenService;
  let passwordService: TestBcryptPasswordService;
  let emailService: MockEmailService;

  beforeEach(() => {
    repository = new MockAuthRepository();
    repository.reset(); // Ensure clean state
    
    const authConfig: AuthConfig = {
      jwtSecret: 'test-secret',
      jwtAccessTokenExpiresIn: '15m',
      jwtRefreshTokenExpiresIn: '7d',
      bcryptRounds: 4, // Lower rounds for faster tests
      sessionMaxAge: 7 * 24 * 60 * 60 * 1000,
    };
    
    tokenService = new TestJWTTokenService(authConfig);
    passwordService = new TestBcryptPasswordService(authConfig);
    emailService = new MockEmailService();
    emailService.reset(); // Ensure clean state
    
    authService = new AuthService(repository, emailService, tokenService, passwordService);
  });

  afterEach(() => {
    repository.reset();
  });

  /**
   * Property 1: Authentication Security Communication
   * 
   * This property validates that the authentication system maintains security invariants:
   * 1. Passwords are never stored in plain text
   * 2. Invalid credentials always result in authentication failure
   * 3. Valid credentials always result in authentication success
   * 4. Tokens are cryptographically secure and verifiable
   * 5. Session management is secure and isolated
   */
  describe('Property 1: Authentication Security Communication', () => {
    // Arbitraries for generating test data
    const validEmailArb = fc.integer({ min: 1000000, max: 9999999 })
      .map(randomNum => {
        // Create truly unique emails using random numbers and timestamps
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        return `user${randomNum}${timestamp}${randomSuffix}@test.com`;
      });
    const validPasswordArb = fc.string({ minLength: 8, maxLength: 128 })
      .map(base => {
        // Ensure password meets all requirements
        const chars = base.split('');
        let result = '';
        
        // Ensure we have at least one of each required character type
        result += 'A'; // uppercase
        result += 'a'; // lowercase  
        result += '1'; // digit
        result += '@'; // special character
        
        // Fill the rest with the base string, ensuring minimum length
        const remaining = Math.max(4, 8 - result.length);
        for (let i = 0; i < remaining && i < chars.length; i++) {
          result += chars[i];
        }
        
        // Pad to minimum length if needed
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

    test('Property: Password security invariants', async () => {
      await fc.assert(
        fc.asyncProperty(registerRequestArb, async (registerData) => {
          // Register user
          const authResult = await authService.register(registerData);
          
          // Verify password is hashed, not stored in plain text
          const user = await repository.findUserByEmail(registerData.email);
          expect(user).toBeTruthy();
          expect(user!.password_hash).toBeDefined();
          expect(user!.password_hash).not.toBe(registerData.password);
          expect(user!.password_hash!.length).toBeGreaterThan(50); // bcrypt hashes are long
          
          // Verify password can be verified
          const isValid = await passwordService.comparePassword(registerData.password, user!.password_hash!);
          expect(isValid).toBe(true);
          
          // Verify wrong password fails
          const wrongPassword = registerData.password + 'wrong';
          const isInvalid = await passwordService.comparePassword(wrongPassword, user!.password_hash!);
          expect(isInvalid).toBe(false);
        }),
        { numRuns: 20, timeout: 10000 }
      );
    });

    test('Property: Authentication consistency', async () => {
      await fc.assert(
        fc.asyncProperty(registerRequestArb, async (registerData) => {
          // Register user
          await authService.register(registerData);
          
          // Valid credentials should always succeed
          const loginData: LoginRequest = {
            email: registerData.email,
            password: registerData.password,
          };
          
          const authResult = await authService.login(loginData);
          expect(authResult.user.email).toBe(registerData.email);
          expect(authResult.accessToken).toBeDefined();
          expect(authResult.refreshToken).toBeDefined();
          
          // Invalid password should always fail
          const invalidLoginData: LoginRequest = {
            email: registerData.email,
            password: registerData.password + 'invalid',
          };
          
          await expect(authService.login(invalidLoginData)).rejects.toThrow(UnauthorizedError);
          
          // Invalid email should always fail
          const invalidEmailData: LoginRequest = {
            email: 'nonexistent@example.com',
            password: registerData.password,
          };
          
          await expect(authService.login(invalidEmailData)).rejects.toThrow(UnauthorizedError);
        }),
        { numRuns: 15, timeout: 15000 }
      );
    });

    test('Property: Token security and verification', async () => {
      await fc.assert(
        fc.asyncProperty(registerRequestArb, async (registerData) => {
          // Register and login user
          await authService.register(registerData);
          const authResult = await authService.login({
            email: registerData.email,
            password: registerData.password,
          });
          
          // Verify tokens are different
          expect(authResult.accessToken).not.toBe(authResult.refreshToken);
          expect(authResult.accessToken.length).toBeGreaterThan(100); // JWT tokens are long
          expect(authResult.refreshToken.length).toBeGreaterThan(100);
          
          // Verify access token can be decoded
          const accessPayload = tokenService.verifyAccessToken(authResult.accessToken);
          expect(accessPayload.userId).toBe(authResult.user.id);
          expect(accessPayload.email).toBe(authResult.user.email);
          
          // Verify refresh token can be decoded
          const refreshPayload = tokenService.verifyRefreshToken(authResult.refreshToken);
          expect(refreshPayload.userId).toBe(authResult.user.id);
          expect(refreshPayload.email).toBe(authResult.user.email);
          
          // Verify invalid tokens are rejected
          expect(() => tokenService.verifyAccessToken('invalid-token')).toThrow();
          expect(() => tokenService.verifyRefreshToken('invalid-token')).toThrow();
        }),
        { numRuns: 10, timeout: 15000 }
      );
    });

    test('Property: Session isolation and security', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(registerRequestArb, { minLength: 2, maxLength: 5 }),
          async (registerDataArray) => {
            // Ensure unique emails by adding index
            const uniqueRegisterData = registerDataArray.map((data, index) => ({
              ...data,
              email: `user${index}-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
            }));
            
            const authResults: AuthResult[] = [];
            
            // Register multiple users
            for (const registerData of uniqueRegisterData) {
              const authResult = await authService.register(registerData);
              authResults.push(authResult);
            }
            
            // Verify each user has unique tokens
            const allTokens = authResults.flatMap(result => [result.accessToken, result.refreshToken]);
            const uniqueTokens = new Set(allTokens);
            expect(uniqueTokens.size).toBe(allTokens.length);
            
            // Verify tokens are tied to correct users
            for (let i = 0; i < authResults.length; i++) {
              const result = authResults[i];
              const accessPayload = tokenService.verifyAccessToken(result.accessToken);
              const refreshPayload = tokenService.verifyRefreshToken(result.refreshToken);
              
              expect(accessPayload.userId).toBe(result.user.id);
              expect(refreshPayload.userId).toBe(result.user.id);
              
              // Verify user can't access other users' data
              for (let j = 0; j < authResults.length; j++) {
                if (i !== j) {
                  const otherResult = authResults[j];
                  expect(accessPayload.userId).not.toBe(otherResult.user.id);
                  expect(refreshPayload.userId).not.toBe(otherResult.user.id);
                }
              }
            }
          }
        ),
        { numRuns: 5, timeout: 20000 }
      );
    });

    test('Property: Duplicate registration prevention', async () => {
      await fc.assert(
        fc.asyncProperty(registerRequestArb, async (registerData) => {
          // First registration should succeed
          const firstResult = await authService.register(registerData);
          expect(firstResult.user.email).toBe(registerData.email);
          
          // Second registration with same email should fail
          await expect(authService.register(registerData)).rejects.toThrow(ConflictError);
          
          // Registration with different case should also fail (email normalization)
          const upperCaseData = {
            ...registerData,
            email: registerData.email.toUpperCase(),
          };
          await expect(authService.register(upperCaseData)).rejects.toThrow(ConflictError);
        }),
        { numRuns: 10, timeout: 10000 }
      );
    });

    test('Property: Input validation and sanitization', async () => {
      // Test invalid email formats
      await fc.assert(
        fc.asyncProperty(
          fc.string().filter(s => !s.includes('@') || s.length < 3),
          validPasswordArb,
          validNameArb,
          validNameArb,
          async (invalidEmail, password, firstName, lastName) => {
            const invalidData = {
              email: invalidEmail,
              password,
              firstName,
              lastName,
            };
            
            await expect(authService.register(invalidData)).rejects.toThrow();
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );

      // Test weak passwords
      await fc.assert(
        fc.asyncProperty(
          validEmailArb,
          fc.string({ maxLength: 7 }), // Too short
          validNameArb,
          validNameArb,
          async (email, weakPassword, firstName, lastName) => {
            const invalidData = {
              email,
              password: weakPassword,
              firstName,
              lastName,
            };
            
            await expect(authService.register(invalidData)).rejects.toThrow();
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    });
  });
});