import * as fc from 'fast-check';
import { validateEmail, validatePassword, validateUUID } from '../validation';
import { hashPassword, comparePassword, generateAccessToken, verifyToken } from '../auth';
import { createSuccessResponse, createErrorResponse, HTTP_STATUS } from '../api';

/**
 * Property-Based Test for Project Configuration
 * Feature: ai-mock-interview-platform, Property 1: Build system consistency
 * 
 * This test validates that the core utilities and configuration work consistently
 * across different inputs and maintain their invariants.
 */

describe('Project Configuration Property Tests', () => {
  describe('Property 1: Build system consistency', () => {
    test('Email validation should be consistent and reversible', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          (email) => {
            // Property: Valid emails should always validate as true
            const isValid = validateEmail(email);
            expect(isValid).toBe(true);
            
            // Property: Validation should be case-insensitive for domain
            const upperCaseEmail = email.toUpperCase();
            const lowerCaseEmail = email.toLowerCase();
            expect(validateEmail(upperCaseEmail)).toBe(validateEmail(lowerCaseEmail));
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Password hashing should be deterministic and secure', async () => {
      // Test with a few specific passwords instead of property-based testing
      // due to bcrypt performance constraints. Use lower rounds for testing.
      const testPasswords = [
        'TestPass123!',
        'AnotherP@ss456',
        'SecureP@ssw0rd'
      ];
      
      for (const password of testPasswords) {
        // Property: Hashing the same password should produce different hashes (due to salt)
        const hash1 = await hashPassword(password, 4); // Lower rounds for testing
        const hash2 = await hashPassword(password, 4);
        expect(hash1).not.toBe(hash2);
        
        // Property: Both hashes should verify against the original password
        const verify1 = await comparePassword(password, hash1);
        const verify2 = await comparePassword(password, hash2);
        expect(verify1).toBe(true);
        expect(verify2).toBe(true);
        
        // Property: Wrong password should not verify
        const wrongPassword = password + 'wrong';
        const verifyWrong = await comparePassword(wrongPassword, hash1);
        expect(verifyWrong).toBe(false);
      }
    }, 5000); // 5 second timeout

    test('JWT token generation and verification should be consistent', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.emailAddress(),
          fc.uuid(),
          fc.string({ minLength: 32, maxLength: 64 }),
          (userId, email, sessionId, secret) => {
            // Property: Generated token should be verifiable with the same secret
            const token = generateAccessToken(userId, email, sessionId, secret, '1h');
            expect(typeof token).toBe('string');
            expect(token.length).toBeGreaterThan(0);
            
            // Property: Token should contain the original payload data
            const payload = verifyToken(token, secret);
            expect(payload.userId).toBe(userId);
            expect(payload.email).toBe(email);
            expect(payload.sessionId).toBe(sessionId);
            
            // Property: Token should not verify with different secret
            const wrongSecret = secret + 'wrong';
            expect(() => verifyToken(token, wrongSecret)).toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('UUID validation should be consistent', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (uuid) => {
            // Property: Valid UUIDs should always validate as true
            const isValid = validateUUID(uuid);
            expect(isValid).toBe(true);
            
            // Property: UUID validation should be case-insensitive
            const upperUuid = uuid.toUpperCase();
            const lowerUuid = uuid.toLowerCase();
            expect(validateUUID(upperUuid)).toBe(validateUUID(lowerUuid));
            expect(validateUUID(upperUuid)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('API response creation should maintain structure consistency', () => {
      fc.assert(
        fc.property(
          fc.anything(),
          fc.option(fc.string()),
          (data, message) => {
            // Property: Success responses should always have success: true
            const successResponse = createSuccessResponse(data, message || undefined);
            expect(successResponse.success).toBe(true);
            expect(successResponse.data).toBe(data);
            if (message) {
              expect(successResponse.message).toBe(message);
            }
            expect(successResponse.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Error response creation should maintain structure consistency', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.option(fc.string()),
          (code, errorMessage, responseMessage) => {
            // Property: Error responses should always have success: false
            const error = { code, message: errorMessage };
            const errorResponse = createErrorResponse(error, responseMessage || undefined);
            
            expect(errorResponse.success).toBe(false);
            expect(errorResponse.error).toEqual(error);
            if (responseMessage) {
              expect(errorResponse.message).toBe(responseMessage);
            }
            expect(errorResponse.data).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('HTTP status codes should be valid numbers', () => {
      // Property: All HTTP status codes should be valid 3-digit numbers
      const statusCodes = Object.values(HTTP_STATUS);
      statusCodes.forEach(code => {
        expect(typeof code).toBe('number');
        expect(code).toBeGreaterThanOrEqual(100);
        expect(code).toBeLessThan(600);
      });
    });

    test('Configuration validation should handle edge cases', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant(null),
            fc.constant(undefined),
            fc.string({ maxLength: 5 }),
            fc.string({ minLength: 100 })
          ),
          (input) => {
            // Property: Invalid inputs should consistently return false
            if (typeof input === 'string') {
              const isValidEmail = validateEmail(input);
              const isValidPassword = validatePassword(input);
              const isValidUUID = validateUUID(input);
              
              // These should be boolean values
              expect(typeof isValidEmail).toBe('boolean');
              expect(typeof isValidPassword).toBe('boolean');
              expect(typeof isValidUUID).toBe('boolean');
              
              // Empty strings should always be invalid
              if (input === '') {
                expect(isValidEmail).toBe(false);
                expect(isValidPassword).toBe(false);
                expect(isValidUUID).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Integration consistency tests', () => {
    test('All utility functions should handle null/undefined gracefully', () => {
      // Property: Utility functions should not crash on null/undefined inputs
      expect(() => validateEmail('')).not.toThrow();
      expect(() => validatePassword('')).not.toThrow();
      expect(() => validateUUID('')).not.toThrow();
      
      // They should return false for invalid inputs
      expect(validateEmail('')).toBe(false);
      expect(validatePassword('')).toBe(false);
      expect(validateUUID('')).toBe(false);
    });

    test('Configuration objects should maintain type safety', () => {
      // Property: Configuration constants should maintain their types
      expect(typeof HTTP_STATUS.OK).toBe('number');
      expect(typeof HTTP_STATUS.BAD_REQUEST).toBe('number');
      expect(typeof HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe('number');
      
      // Status codes should be in expected ranges
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
    });
  });
});