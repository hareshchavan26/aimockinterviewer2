import { DefaultImprovementRecommendationService } from '../services/improvement-recommendation-service';
import { DefaultAnswerSuggestionService } from '../services/answer-suggestion-service';
import { DefaultPracticeDrillService } from '../services/practice-drill-service';
import {
  CategoryScores,
  ResponseAnalysis,
  InterviewSession,
  UserResponse,
  InterviewConfig,
} from '@ai-interview/types';

describe('Improvement Recommendations', () => {
  let improvementService: DefaultImprovementRecommendationService;
  let answerSuggestionService: DefaultAnswerSuggestionService;
  let practiceDrillService: DefaultPracticeDrillService;

  beforeEach(() => {
    improvementService = new DefaultImprovementRecommendationService();
    answerSuggestionService = new DefaultAnswerSuggestionService();
    practiceDrillService = new DefaultPracticeDrillService();
  });

  const mockCategoryScores: CategoryScores = {
    communication: 0.6,
    technicalAccuracy: 0.8,
    confidence: 0.5,
    clarity: 0.7,
    structure: 0.4,
    relevance: 0.9,
  };

  const mockAnalyses: ResponseAnalysis[] = [
    {
      textAnalysis: {
        wordCount: 150,
        sentenceCount: 8,
        keywordRelevance: 0.7,
        structureScore: 0.6,
        clarityScore: 0.8,
        grammarScore: 0.9,
      },
      speechAnalysis: {
        pace: 140,
        pauseCount: 3,
        fillerWordCount: 5,
        clarityScore: 0.7,
        volumeConsistency: 0.8,
      },
      emotionAnalysis: {
        confidence: 0.6,
        nervousness: 0.4,
        enthusiasm: 0.7,
        stress: 0.3,
        engagement: 0.8,
      },
      confidenceScore: 0.6,
      overallScore: 0.7,
    },
  ];

  const mockSession: InterviewSession = {
    id: 'session-123',
    userId: 'user-456',
    config: {
      industry: 'Technology',
      role: 'Software Engineer',
      company: 'TechCorp',
      difficulty: 'medium',
      questionTypes: ['behavioral', 'technical'],
      timeLimit: 3600,
      interviewerPersonality: 'friendly',
    } as InterviewConfig,
    status: 'completed',
    questions: [
      {
        id: 'q1',
        text: 'Tell me about a challenging project you worked on.',
        type: 'behavioral',
        difficulty: 0.7,
        expectedDuration: 300,
      },
    ],
    responses: [
      {
        questionId: 'q1',
        textResponse: 'I worked on a project that was really challenging and stuff. It was kind of difficult but I think I managed to do okay.',
        timestamp: new Date(),
        duration: 180,
        analysis: mockAnalyses[0],
      },
    ],
    startTime: new Date(),
    endTime: new Date(),
    duration: 1800,
    metadata: {},
  };

  describe('PersonalizedImprovementPlan', () => {
    it('should generate a personalized improvement plan', async () => {
      const plan = await improvementService.generatePersonalizedPlan(
        mockCategoryScores,
        mockAnalyses,
        mockSession
      );

      expect(plan).toBeDefined();
      expect(plan.priorityAreas).toBeInstanceOf(Array);
      expect(plan.priorityAreas.length).toBeGreaterThan(0);
      expect(plan.recommendations).toBeInstanceOf(Array);
      expect(plan.practiceExercises).toBeInstanceOf(Array);
      expect(plan.estimatedTimeToImprove).toBeGreaterThan(0);

      // Should identify low-scoring areas as priorities
      expect(plan.priorityAreas).toContain('confidence');
      expect(plan.priorityAreas).toContain('structure');
    });

    it('should provide context-aware recommendations', async () => {
      const plan = await improvementService.generatePersonalizedPlan(
        mockCategoryScores,
        mockAnalyses,
        mockSession
      );

      const recommendations = plan.recommendations;
      expect(recommendations.length).toBeGreaterThan(0);

      // Should have recommendations for priority areas
      const confidenceRec = recommendations.find(r => r.category.toLowerCase().includes('confidence'));
      expect(confidenceRec).toBeDefined();
      expect(confidenceRec?.actionItems).toBeInstanceOf(Array);
      expect(confidenceRec?.actionItems.length).toBeGreaterThan(0);
      expect(confidenceRec?.resources).toBeInstanceOf(Array);
    });
  });

  describe('BetterAnswerSuggestions', () => {
    it('should generate better answer suggestions', async () => {
      const suggestions = await answerSuggestionService.generateBetterAnswerSuggestions(
        mockSession,
        mockSession.responses as UserResponse[],
        mockAnalyses
      );

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);

      const suggestion = suggestions[0];
      expect(suggestion.originalResponse).toBeDefined();
      expect(suggestion.improvedVersion).toBeDefined();
      expect(suggestion.improvements).toBeInstanceOf(Array);
      expect(suggestion.reasoning).toBeDefined();

      // Improved version should be different from original
      expect(suggestion.improvedVersion).not.toBe(suggestion.originalResponse);
      expect(suggestion.improvedVersion.length).toBeGreaterThan(suggestion.originalResponse.length);
    });

    it('should provide STAR method examples for behavioral questions', async () => {
      const starExample = await answerSuggestionService.generateSTARMethodSuggestion(
        'I worked on a challenging project',
        'behavioral',
        'Technology',
        'Software Engineer'
      );

      expect(starExample).toBeDefined();
      expect(starExample.situation).toBeDefined();
      expect(starExample.task).toBeDefined();
      expect(starExample.action).toBeDefined();
      expect(starExample.result).toBeDefined();
      expect(starExample.fullExample).toBeDefined();
    });

    it('should generate answer templates', async () => {
      const templates = await answerSuggestionService.generateAnswerTemplates(
        'behavioral',
        'Technology',
        'Software Engineer'
      );

      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);

      const template = templates[0];
      expect(template.questionType).toBe('behavioral');
      expect(template.template).toBeDefined();
      expect(template.example).toBeDefined();
      expect(template.keyPoints).toBeInstanceOf(Array);
      expect(template.commonMistakes).toBeInstanceOf(Array);
    });
  });

  describe('PersonalizedDrills', () => {
    it('should generate personalized practice drills', async () => {
      const priorityAreas = ['confidence', 'structure', 'communication'];
      const drills = await practiceDrillService.generatePersonalizedDrills(
        priorityAreas,
        mockCategoryScores,
        mockSession
      );

      expect(drills).toBeInstanceOf(Array);
      expect(drills.length).toBeGreaterThan(0);

      const drill = drills[0];
      expect(drill.id).toBeDefined();
      expect(drill.title).toBeDefined();
      expect(drill.description).toBeDefined();
      expect(drill.targetWeakness).toBeDefined();
      expect(drill.difficulty).toMatch(/^(easy|medium|hard)$/);
      expect(drill.estimatedDuration).toBeGreaterThan(0);
      expect(drill.instructions).toBeInstanceOf(Array);
      expect(drill.successCriteria).toBeInstanceOf(Array);
    });

    it('should generate progressive drill plan', async () => {
      const progressivePlan = await practiceDrillService.generateProgressiveDrillPlan(
        'confidence',
        0.5,
        30
      );

      expect(progressivePlan).toBeDefined();
      expect(progressivePlan.targetArea).toBe('confidence');
      expect(progressivePlan.currentLevel).toBe(0.5);
      expect(progressivePlan.targetLevel).toBeGreaterThan(0.5);
      expect(progressivePlan.phases).toBeInstanceOf(Array);
      expect(progressivePlan.phases.length).toBe(3);
      expect(progressivePlan.milestones).toBeInstanceOf(Array);
    });

    it('should generate daily practice routine', async () => {
      const priorityAreas = ['confidence', 'communication'];
      const routine = await practiceDrillService.generateDailyPracticeRoutine(
        priorityAreas,
        30
      );

      expect(routine).toBeDefined();
      expect(routine.totalTimeRequired).toBe(30);
      expect(routine.sessions).toBeInstanceOf(Array);
      expect(routine.sessions.length).toBe(priorityAreas.length);
      expect(routine.weeklyGoals).toBeInstanceOf(Array);
      expect(routine.progressTracking).toBeInstanceOf(Array);
    });
  });

  describe('STAR Method Examples', () => {
    it('should generate industry-specific STAR examples', async () => {
      const examples = await improvementService.generateSTARMethodExamples(
        'Technology',
        'Software Engineer',
        'communication'
      );

      expect(examples).toBeInstanceOf(Array);
      expect(examples.length).toBeGreaterThan(0);

      const example = examples[0];
      expect(example.situation).toBeDefined();
      expect(example.task).toBeDefined();
      expect(example.action).toBeDefined();
      expect(example.result).toBeDefined();
      expect(example.fullExample).toBeDefined();
    });
  });

  describe('Integration', () => {
    it('should work together to provide comprehensive improvement package', async () => {
      // Generate all components
      const [improvementPlan, answerSuggestions, practiceDrills] = await Promise.all([
        improvementService.generatePersonalizedPlan(
          mockCategoryScores,
          mockAnalyses,
          mockSession
        ),
        answerSuggestionService.generateBetterAnswerSuggestions(
          mockSession,
          mockSession.responses as UserResponse[],
          mockAnalyses
        ),
        practiceDrillService.generatePersonalizedDrills(
          ['confidence', 'structure'],
          mockCategoryScores,
          mockSession
        ),
      ]);

      // Verify all components are generated
      expect(improvementPlan).toBeDefined();
      expect(answerSuggestions).toBeDefined();
      expect(practiceDrills).toBeDefined();

      // Verify they work together logically
      expect(improvementPlan.priorityAreas.length).toBeGreaterThan(0);
      expect(answerSuggestions.length).toBeGreaterThan(0);
      expect(practiceDrills.length).toBeGreaterThan(0);

      // Priority areas should align with low scores
      const lowScoreAreas = Object.entries(mockCategoryScores)
        .filter(([_, score]) => score < 0.7)
        .map(([area, _]) => area);
      
      expect(improvementPlan.priorityAreas.some(area => 
        lowScoreAreas.includes(area) || area.includes('confidence') || area.includes('structure')
      )).toBe(true);
    });
  });
});