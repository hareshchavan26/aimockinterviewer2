import { config } from '../config';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'ai_interview_platform_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.SMTP_HOST = 'smtp.mailtrap.io';
process.env.SMTP_PORT = '2525';
process.env.SMTP_USER = 'test';
process.env.SMTP_PASS = 'test';
process.env.FROM_EMAIL = 'test@example.com';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret';

// Set test timeout
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Setup test database or mocks here
});

// Global test teardown
afterAll(async () => {
  // Cleanup test database or mocks here
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});