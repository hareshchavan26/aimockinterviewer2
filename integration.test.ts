import request from 'supertest';
import { createApp } from '../app';
import { PerformanceReport } from '@ai-interview/types';

describe('Reporting Service Integration', () => {
  let app: any;

  beforeAll(async () => {
    app = await createApp();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Reporting service is healthy');
      expect(response.body.service).toBe('reporting');
    });
  });

  describe('Reports API', () => {
    // Skip database-dependent tests in unit test environment
    it.skip('should return 404 for non-existent report', async () => {
      const response = await request(app)
        .get('/api/reports/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REPORT_NOT_FOUND');
    });

    it('should validate session ID when generating report', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it.skip('should validate user ID when getting user reports', async () => {
      const response = await request(app)
        .get('/api/reports/user/')
        .expect(404); // Route not found due to empty user ID

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/reports/user/test-user?limit=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it.skip('should handle valid limit and offset parameters', async () => {
      const response = await request(app)
        .get('/api/reports/user/test-user?limit=10&offset=0')
        .expect(500); // Will fail due to database connection, but validation passes

      // The validation should pass, but it will fail at database level
      // In a real test, we'd mock the database
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});