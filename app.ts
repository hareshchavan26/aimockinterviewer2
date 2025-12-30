import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Pool } from 'pg';
import { config } from './config';
import { logger } from './utils/logger';
import { InterviewConfigController } from './controllers/interview-config-controller';
import { SessionController } from './controllers/session-controller';
import { DefaultInterviewConfigService } from './services/interview-config-service';
import { DatabaseInterviewConfigRepository } from './repositories/interview-config-repository';
import aiInterviewerRoutes from './routes/ai-interviewer-routes';
import { textAnalysisRoutes } from './routes/text-analysis-routes';
import { speechAnalysisRoutes } from './routes/speech-analysis-routes';
import { emotionFacialAnalysisRoutes } from './routes/emotion-facial-analysis-routes';
import realTimeAnalysisRoutes from './routes/real-time-analysis-routes';

export function createApp(pool: Pool) {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: config.cors.allowedOrigins,
    credentials: true,
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use('/api/', limiter);

  // JSON parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Initialize services
  const repository = new DatabaseInterviewConfigRepository(pool);
  const configService = new DefaultInterviewConfigService(repository);

  // Initialize controllers
  const configController = new InterviewConfigController(configService);
  const sessionController = new SessionController(configService);

  // Mock authentication middleware (in real app, this would validate JWT tokens)
  app.use('/api', (req: any, res, next) => {
    // Mock user ID - in real app, extract from JWT token
    req.userId = req.headers['x-user-id'] || req.body.userId || req.query.userId;
    next();
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'interview-service',
    });
  });

  // Configuration routes
  app.post('/api/configs', (req, res) => configController.createConfiguration(req, res));
  app.get('/api/configs/:configId', (req, res) => configController.getConfiguration(req, res));
  app.get('/api/users/:userId/configs', (req, res) => configController.getUserConfigurations(req, res));
  app.put('/api/configs/:configId', (req, res) => configController.updateConfiguration(req, res));
  app.delete('/api/configs/:configId', (req, res) => configController.deleteConfiguration(req, res));
  app.post('/api/configs/validate', (req, res) => configController.validateConfiguration(req, res));

  // Template routes
  app.get('/api/templates/:templateId', (req, res) => configController.getTemplate(req, res));
  app.get('/api/templates', (req, res) => configController.searchTemplates(req, res));
  app.get('/api/templates/role/:role', (req, res) => configController.getTemplatesByRole(req, res));
  app.get('/api/templates/industry/:industry', (req, res) => configController.getTemplatesByIndustry(req, res));

  // Session routes
  app.post('/api/sessions', (req, res) => sessionController.createSession(req, res));
  app.get('/api/sessions/:sessionId', (req, res) => sessionController.getSession(req, res));
  app.get('/api/users/:userId/sessions', (req, res) => sessionController.getUserSessions(req, res));
  app.post('/api/sessions/:sessionId/control', (req, res) => sessionController.controlSession(req, res));
  app.get('/api/sessions/:sessionId/status', (req, res) => sessionController.getSessionStatus(req, res));
  app.get('/api/sessions/:sessionId/current-question', (req, res) => sessionController.getCurrentQuestion(req, res));
  app.get('/api/sessions/:sessionId/time-limits', (req, res) => sessionController.checkTimeLimits(req, res));

  // Response routes
  app.post('/api/sessions/:sessionId/responses', (req, res) => sessionController.submitResponse(req, res));
  app.get('/api/sessions/:sessionId/responses', (req, res) => sessionController.getSessionResponses(req, res));

  // AI Interviewer routes
  app.use('/api/ai-interviewer', aiInterviewerRoutes);

  // Text Analysis routes
  app.use('/api/text-analysis', textAnalysisRoutes);

  // Speech Analysis routes
  app.use('/api/speech-analysis', speechAnalysisRoutes);

  // Emotion and Facial Analysis routes
  app.use('/api/emotion-facial-analysis', emotionFacialAnalysisRoutes);

  // Real-Time Analysis routes
  app.use('/api/real-time-analysis', realTimeAnalysisRoutes);

  // Error handling middleware
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', { error, url: req.url, method: req.method });
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not found',
      code: 'NOT_FOUND',
    });
  });

  return app;
}