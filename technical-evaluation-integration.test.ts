import request from 'supertest';
import express from 'express';
import aiInterviewerRoutes from '../routes/ai-interviewer-routes';
import { DifficultyLevel, QuestionType } from '../types/ai-interviewer';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  overallScore: 85,
                  technicalAccuracy: 90,
                  completeness: 80,
                  criteriaScores: [{
                    criteriaName: 'Technical Accuracy',
                    score: 90,
                    feedback: 'Excellent technical understanding',
                  }],
                  roleSpecificScores: [{
                    skillName: 'Algorithm Design',
                    score: 85,
                    importance: 'critical',
                    feedback: 'Good algorithmic approach',
                    examples: ['Correctly identified solution'],
                  }],
                  difficultyAssessment: {
                    perceivedDifficulty: 'mid',
                    actualPerformance: 85,
                    isAppropriate: true,
                    reasoning: 'Performance matches expected level',
                  },
                  adaptationRecommendation: {
                    recommendedLevel: 'senior',
                    confidence: 0.8,
                    reasoning: 'Strong performance',
                    adaptationStrategy: 'increase_difficulty',
                  },
                  strengths: ['Strong technical skills'],
                  improvements: ['Could improve explanation'],
                  followUpSuggestions: ['Ask about optimization'],
                  confidence: 0.9,
                }),
              },
            }],
          }),
        },
      },
    })),
  };
});

describe('Technical Evaluation Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req: any, res, next) => {
      req.userId = 'test-user-id';
      next();
    });
    
    app.use('/api/ai-interviewer', aiInterviewerRoutes);
  });

  describe('POST /api/ai-interviewer/responses/evaluate-technical', () => {
    const validRequest = {
      sessionId: 'test-session',
      question: {
        id: 'test-question',
        text: 'Implement a binary search algorithm',
        type: QuestionType.TECHNICAL,
        category: 'algorithms',
        difficulty: DifficultyLevel.MID,
        evaluationCriteria: [],
        timeLimit: 300,
        metadata: {
          source: 'test',
          version: 1,
          usageCount: 0,
          generatedAt: new Date(),
          modelVersion: 'gpt-4',
        },
      },
      userResponse: {
        questionId: 'test-question',
        questionText: 'Implement a binary search algorithm',
        responseText: 'I would implement binary search using a divide and conquer approach...',
        duration: 180,
        confidence: 0.8,
        isSkipped: false,
        timestamp: new Date(),
      },
      role: 'Software Engineer',
      industry: 'Technology',
      personalityState: {
        name: 'Technical Interviewer',
        style: 'professional',
        tone: 'professional',
        formality: 'formal',
        adaptiveness: 0.7,
        followUpIntensity: 0.6,
        encouragementLevel: 0.5,
        currentMood: 'analytical',
        adaptationLevel: 0.3,
        userEngagementLevel: 0.7,
        sessionProgress: 0.4,
        conversationHistory: [],
        lastQuestionType: QuestionType.TECHNICAL,
        consecutiveFollowUps: 0,
      },
    };

    it('should successfully evaluate a technical response', async () => {
      const response = await request(app)
        .post('/api/ai-interviewer/responses/evaluate-technical')
        .send(validRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.overallScore).toBe(85);
      expect(response.body.data.technicalAccuracy).toBe(90);
      expect(response.body.data.completeness).toBe(80);
      expect(response.body.data.roleSpecificScores).toHaveLength(1);
      expect(response.body.data.difficultyAssessment).toBeDefined();
      expect(response.body.data.adaptationRecommendation).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const invalidRequest = { ...validRequest };
      delete (invalidRequest as any).role;

      const response = await request(app)
        .post('/api/ai-interviewer/responses/evaluate-technical')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
      expect(response.body.code).toBe('INVALID_REQUEST');
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Create app without authentication middleware
      const unauthApp = express();
      unauthApp.use(express.json());
      unauthApp.use('/api/ai-interviewer', aiInterviewerRoutes);

      const response = await request(unauthApp)
        .post('/api/ai-interviewer/responses/evaluate-technical')
        .send(validRequest)
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
      expect(response.body.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('POST /api/ai-interviewer/difficulty/adapt', () => {
    const validRequest = {
      sessionId: 'test-session',
      userId: 'test-user',
      interviewConfig: {
        id: 'test-config',
        role: 'Software Engineer',
        industry: 'Technology',
        difficulty: DifficultyLevel.MID,
        duration: 60,
        questionTypes: [QuestionType.TECHNICAL],
        focusAreas: [],
        aiPersonality: {
          name: 'Test',
          style: 'professional',
          tone: 'professional',
          formality: 'formal',
          adaptiveness: 0.5,
          followUpIntensity: 0.5,
          encouragementLevel: 0.5,
        },
      },
      sessionHistory: [],
      currentDifficulty: DifficultyLevel.MID,
      performanceMetrics: {
        averageScore: 85,
        scoreVariance: 10,
        responseTime: 180,
        skipRate: 0.1,
        confidenceLevel: 0.8,
        improvementTrend: 'improving',
      },
    };

    it('should successfully adapt difficulty level', async () => {
      const response = await request(app)
        .post('/api/ai-interviewer/difficulty/adapt')
        .send(validRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.previousDifficulty).toBe(DifficultyLevel.MID);
      expect(response.body.data.adaptedDifficulty).toBeDefined();
      expect(response.body.data.reasoning).toBeDefined();
    });

    it('should return 400 for missing performance metrics', async () => {
      const invalidRequest = { ...validRequest };
      delete (invalidRequest as any).performanceMetrics;

      const response = await request(app)
        .post('/api/ai-interviewer/difficulty/adapt')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });
  });

  describe('GET /api/ai-interviewer/technical/role-criteria', () => {
    it('should return role-specific criteria', async () => {
      const response = await request(app)
        .get('/api/ai-interviewer/technical/role-criteria')
        .query({ role: 'Software Engineer', industry: 'Technology' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.role).toBe('Software Engineer');
      expect(response.body.data.industry).toBe('Technology');
      expect(response.body.data.requiredSkills).toBeDefined();
      expect(Array.isArray(response.body.data.requiredSkills)).toBe(true);
    });

    it('should return 400 for missing query parameters', async () => {
      const response = await request(app)
        .get('/api/ai-interviewer/technical/role-criteria')
        .query({ role: 'Software Engineer' }) // Missing industry
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required query parameters');
    });
  });

  describe('GET /api/ai-interviewer/technical/domain', () => {
    it('should return technical domain for role', async () => {
      const response = await request(app)
        .get('/api/ai-interviewer/technical/domain')
        .query({ role: 'Software Engineer' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.role).toBe('Software Engineer');
      expect(response.body.data.technicalDomain).toBeDefined();
    });

    it('should return 400 for missing role parameter', async () => {
      const response = await request(app)
        .get('/api/ai-interviewer/technical/domain')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required query parameter: role');
    });
  });
});