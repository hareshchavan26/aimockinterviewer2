/**
 * Text Analysis Engine Tests
 * Basic functionality tests for text analysis
 */

import { TextAnalysisEngine } from '../services/text-analysis-engine';
import {
  TextAnalysisRequest,
  TextAnalysisConfig,
  QuestionType,
  ResponseStructure,
  DifficultyLevel,
  GrammarStrictness
} from '../types/text-analysis';

describe('TextAnalysisEngine', () => {
  let textAnalysisEngine: TextAnalysisEngine;
  let defaultConfig: TextAnalysisConfig;

  beforeEach(() => {
    defaultConfig = {
      enableAdvancedAnalysis: true,
      industryKeywords: {
        technology: ['software', 'development', 'programming', 'algorithm', 'database'],
        general: ['project', 'team', 'leadership', 'communication', 'problem-solving']
      },
      roleKeywords: {
        'software-engineer': ['coding', 'debugging', 'testing', 'architecture', 'scalability'],
        'general': ['experience', 'skills', 'collaboration', 'results']
      },
      starMethodWeights: {
        situation: 0.2,
        task: 0.2,
        action: 0.4,
        result: 0.2
      },
      qualityThresholds: {
        excellent: 0.85,
        good: 0.70,
        fair: 0.55,
        poor: 0.40
      },
      grammarRules: {
        enableSpellCheck: true,
        enableGrammarCheck: true,
        enableStyleCheck: true,
        strictness: GrammarStrictness.MODERATE
      }
    };

    textAnalysisEngine = new TextAnalysisEngine(defaultConfig);
  });

  describe('Basic Text Analysis', () => {
    it('should analyze a simple behavioral response', async () => {
      const request: TextAnalysisRequest = {
        text: 'In my previous role as a software engineer, I faced a challenging situation where our main database was experiencing performance issues. I was tasked with identifying and resolving the bottleneck. I analyzed the query patterns, implemented indexing strategies, and optimized the most expensive queries. As a result, we reduced response times by 60% and improved overall system performance.',
        context: {
          questionType: QuestionType.BEHAVIORAL,
          expectedStructure: ResponseStructure.STAR,
          role: 'software-engineer',
          industry: 'technology',
          difficultyLevel: DifficultyLevel.MID
        },
        options: {
          enableContentQuality: true,
          enableStructureAnalysis: true,
          enableKeywordRelevance: true,
          enableSTARMethod: true,
          enableGrammarCheck: true,
          enableSentimentAnalysis: true,
          confidenceThreshold: 0.7
        }
      };

      const result = await textAnalysisEngine.analyzeText(request);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
      expect(result.contentQuality).toBeDefined();
      expect(result.structureAnalysis).toBeDefined();
      expect(result.keywordRelevance).toBeDefined();
      expect(result.starMethodAnalysis).toBeDefined();
      expect(result.grammarAnalysis).toBeDefined();
      expect(result.sentimentAnalysis).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should analyze content quality metrics', async () => {
      const request: TextAnalysisRequest = {
        text: 'I worked on a project. It was good. We finished it.',
        context: {
          questionType: QuestionType.BEHAVIORAL,
          expectedStructure: ResponseStructure.FREE_FORM,
          role: 'general',
          industry: 'general',
          difficultyLevel: DifficultyLevel.JUNIOR
        },
        options: {
          enableContentQuality: true,
          enableStructureAnalysis: false,
          enableKeywordRelevance: false,
          enableSTARMethod: false,
          enableGrammarCheck: false,
          enableSentimentAnalysis: false,
          confidenceThreshold: 0.7
        }
      };

      const result = await textAnalysisEngine.analyzeText(request);

      expect(result.contentQuality.metrics.wordCount).toBe(11);
      expect(result.contentQuality.metrics.sentenceCount).toBe(3);
      expect(result.contentQuality.weaknesses).toContain('Response is too brief');
      expect(result.contentQuality.suggestions).toContain('Provide more detailed examples and explanations');
    });

    it('should handle technical question analysis', async () => {
      const request: TextAnalysisRequest = {
        text: 'To implement a scalable microservices architecture, I would start by identifying service boundaries based on business domains. Each service would have its own database to ensure loose coupling. I would use API gateways for routing and implement circuit breakers for fault tolerance. For deployment, I would containerize services using Docker and orchestrate them with Kubernetes. Monitoring and logging would be centralized using tools like Prometheus and ELK stack.',
        context: {
          questionType: QuestionType.TECHNICAL,
          expectedStructure: ResponseStructure.FREE_FORM,
          role: 'software-engineer',
          industry: 'technology',
          difficultyLevel: DifficultyLevel.SENIOR
        },
        options: {
          enableContentQuality: true,
          enableStructureAnalysis: true,
          enableKeywordRelevance: true,
          enableSTARMethod: false,
          enableGrammarCheck: true,
          enableSentimentAnalysis: true,
          confidenceThreshold: 0.7
        }
      };

      const result = await textAnalysisEngine.analyzeText(request);

      expect(result.keywordRelevance.relevantKeywords.length).toBeGreaterThan(0);
      expect(result.keywordRelevance.technicalTerms.length).toBeGreaterThan(0);
      expect(result.contentQuality.score).toBeGreaterThan(0.3);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for empty text', async () => {
      const request: TextAnalysisRequest = {
        text: '',
        context: {
          questionType: QuestionType.BEHAVIORAL,
          expectedStructure: ResponseStructure.FREE_FORM,
          role: 'general',
          industry: 'general',
          difficultyLevel: DifficultyLevel.MID
        },
        options: {
          enableContentQuality: true,
          enableStructureAnalysis: false,
          enableKeywordRelevance: false,
          enableSTARMethod: false,
          enableGrammarCheck: false,
          enableSentimentAnalysis: false,
          confidenceThreshold: 0.7
        }
      };

      await expect(textAnalysisEngine.analyzeText(request)).rejects.toThrow('Text content is required');
    });

    it('should throw error for text exceeding length limit', async () => {
      const longText = 'a'.repeat(10001);
      const request: TextAnalysisRequest = {
        text: longText,
        context: {
          questionType: QuestionType.BEHAVIORAL,
          expectedStructure: ResponseStructure.FREE_FORM,
          role: 'general',
          industry: 'general',
          difficultyLevel: DifficultyLevel.MID
        },
        options: {
          enableContentQuality: true,
          enableStructureAnalysis: false,
          enableKeywordRelevance: false,
          enableSTARMethod: false,
          enableGrammarCheck: false,
          enableSentimentAnalysis: false,
          confidenceThreshold: 0.7
        }
      };

      await expect(textAnalysisEngine.analyzeText(request)).rejects.toThrow('Text content exceeds maximum length limit');
    });
  });

  describe('STAR Method Analysis', () => {
    it('should identify STAR components in a well-structured response', async () => {
      const request: TextAnalysisRequest = {
        text: 'In my previous role, we faced a critical system outage during peak hours (Situation). I was responsible for leading the incident response and restoring service within 2 hours (Task). I immediately assembled a cross-functional team, implemented our disaster recovery procedures, and coordinated with stakeholders while troubleshooting the root cause (Action). We restored service in 90 minutes, implemented preventive measures, and received commendation from leadership for our swift response (Result).',
        context: {
          questionType: QuestionType.BEHAVIORAL,
          expectedStructure: ResponseStructure.STAR,
          role: 'software-engineer',
          industry: 'technology',
          difficultyLevel: DifficultyLevel.SENIOR
        },
        options: {
          enableContentQuality: true,
          enableStructureAnalysis: true,
          enableKeywordRelevance: true,
          enableSTARMethod: true,
          enableGrammarCheck: false,
          enableSentimentAnalysis: false,
          confidenceThreshold: 0.7
        }
      };

      const result = await textAnalysisEngine.analyzeText(request);

      expect(result.starMethodAnalysis).toBeDefined();
      expect(result.starMethodAnalysis!.structure.situation.present).toBe(true);
      expect(result.starMethodAnalysis!.structure.task.present).toBe(true);
      expect(result.starMethodAnalysis!.structure.action.present).toBe(true);
      expect(result.starMethodAnalysis!.structure.result.present).toBe(true);
      expect(result.starMethodAnalysis!.score).toBeGreaterThan(0.5);
    });
  });
});