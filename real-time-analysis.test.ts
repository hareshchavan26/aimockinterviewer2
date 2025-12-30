/**
 * Real-Time Analysis Pipeline Tests
 * Tests for real-time feedback generation, hesitation detection, and analysis aggregation
 * Requirements: 5.6
 */

import { RealTimeAnalysisPipeline } from '../services/real-time-analysis-pipeline';
import {
  RealTimeAnalysisRequest,
  RealTimeAnalysisConfig,
  AnalysisType,
  FeedbackFrequency,
  InsightType,
  InsightSeverity,
  HesitationType,
  NervousnessType,
  FeedbackType,
  TrendDirection,
  RealTimeAnalysisError,
  RealTimeAnalysisErrorCode
} from '../types/real-time-analysis';

describe('RealTimeAnalysisPipeline', () => {
  let pipeline: RealTimeAnalysisPipeline;
  let defaultConfig: RealTimeAnalysisConfig;

  beforeEach(() => {
    defaultConfig = {
      enableRealTimeFeedback: true,
      feedbackDelay: 500,
      analysisWindow: 5000,
      aggregationInterval: 1000,
      hesitationThresholds: {
        minHesitationDuration: 300,
        maxAcceptableHesitations: 5,
        criticalHesitationDuration: 2000,
        patternDetectionWindow: 10000
      },
      nervousnessThresholds: {
        voiceStabilityThreshold: 0.7,
        paceVariabilityThreshold: 0.3,
        emotionalStabilityThreshold: 0.6,
        criticalNervousnessLevel: 0.8
      },
      confidenceThresholds: {
        minConfidenceLevel: 0.5,
        confidenceDropThreshold: 0.3,
        confidenceRecoveryThreshold: 0.7,
        stabilityWindow: 5000
      },
      feedbackSettings: {
        enablePositiveFeedback: true,
        enableCorrectiveFeedback: true,
        feedbackFrequency: FeedbackFrequency.IMMEDIATE,
        adaptiveFeedback: true,
        personalizedMessages: true
      }
    };

    pipeline = new RealTimeAnalysisPipeline(defaultConfig);
  });

  describe('Session Management', () => {
    it('should start a new analysis session', () => {
      const sessionId = 'test-session-1';
      const session = pipeline.startSession(sessionId);

      expect(session).toBeDefined();
      expect(session.sessionId).toBe(sessionId);
      expect(session.startTime).toBeGreaterThan(0);
      expect(session.analysisHistory).toEqual([]);
      expect(session.aggregatedState).toBeDefined();
      expect(session.configuration).toEqual(defaultConfig);
    });

    it('should get session state', () => {
      const sessionId = 'test-session-2';
      pipeline.startSession(sessionId);

      const state = pipeline.getSessionState(sessionId);
      expect(state).toBeDefined();
      expect(state?.overallConfidence).toBe(0.5);
      expect(state?.nervousnessLevel).toBe(0);
      expect(state?.hesitationLevel).toBe(0);
    });

    it('should return null for non-existent session state', () => {
      const state = pipeline.getSessionState('non-existent-session');
      expect(state).toBeNull();
    });

    it('should end session and cleanup resources', () => {
      const sessionId = 'test-session-3';
      pipeline.startSession(sessionId);

      // Verify session exists
      expect(pipeline.getSessionState(sessionId)).toBeDefined();

      // End session
      pipeline.endSession(sessionId);

      // Verify session is cleaned up
      expect(pipeline.getSessionState(sessionId)).toBeNull();
    });
  });

  describe('Text Stream Analysis', () => {
    it('should analyze text stream and detect filler words', async () => {
      const sessionId = 'text-session-1';
      pipeline.startSession(sessionId);

      const request: RealTimeAnalysisRequest = {
        sessionId,
        analysisType: AnalysisType.TEXT_STREAM,
        inputData: {
          text: 'Um, well, I think that, like, this is a good approach, you know?',
          timestamp: Date.now(),
          sequenceNumber: 1
        },
        context: {
          questionType: 'behavioral',
          interviewStage: 'behavioral',
          currentTime: Date.now(),
          sessionStartTime: Date.now()
        },
        options: {
          enableHesitationDetection: true,
          enableNervousnessDetection: false,
          enableConfidenceTracking: true,
          enablePaceAnalysis: false,
          enableEmotionTracking: false,
          feedbackThreshold: 0.7,
          aggregationWindow: 5000
        }
      };

      const result = await pipeline.processRealTimeAnalysis(request);

      expect(result).toBeDefined();
      expect(result.sessionId).toBe(sessionId);
      expect(result.analysisType).toBe(AnalysisType.TEXT_STREAM);
      expect(result.immediateInsights).toBeInstanceOf(Array);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingLatency).toBeGreaterThan(0);

      // Should detect filler words
      const fillerInsight = result.immediateInsights.find(
        insight => insight.type === InsightType.FILLER_WORDS
      );
      expect(fillerInsight).toBeDefined();
      expect(fillerInsight?.severity).toBe(InsightSeverity.WARNING);
    });

    it('should detect good structure in text', async () => {
      const sessionId = 'text-session-2';
      pipeline.startSession(sessionId);

      const request: RealTimeAnalysisRequest = {
        sessionId,
        analysisType: AnalysisType.TEXT_STREAM,
        inputData: {
          text: 'First, I analyzed the problem thoroughly. Then, I developed a comprehensive solution. Finally, I implemented the changes and monitored the results.',
          timestamp: Date.now(),
          sequenceNumber: 1
        },
        context: {
          questionType: 'technical',
          interviewStage: 'technical',
          currentTime: Date.now(),
          sessionStartTime: Date.now()
        },
        options: {
          enableHesitationDetection: true,
          enableNervousnessDetection: false,
          enableConfidenceTracking: true,
          enablePaceAnalysis: false,
          enableEmotionTracking: false,
          feedbackThreshold: 0.7,
          aggregationWindow: 5000
        }
      };

      const result = await pipeline.processRealTimeAnalysis(request);

      // Should detect clear structure
      const structureInsight = result.immediateInsights.find(
        insight => insight.type === InsightType.CLEAR_STRUCTURE
      );
      expect(structureInsight).toBeDefined();
      expect(structureInsight?.severity).toBe(InsightSeverity.POSITIVE);
    });
  });

  describe('Audio Stream Analysis', () => {
    it('should analyze audio stream and detect pace issues', async () => {
      const sessionId = 'audio-session-1';
      pipeline.startSession(sessionId);

      const request: RealTimeAnalysisRequest = {
        sessionId,
        analysisType: AnalysisType.AUDIO_STREAM,
        inputData: {
          audioChunk: {
            buffer: Buffer.from('mock-audio-data'),
            duration: 5000,
            sampleRate: 44100,
            channels: 1,
            format: 'wav'
          },
          timestamp: Date.now(),
          sequenceNumber: 1
        },
        context: {
          questionType: 'behavioral',
          interviewStage: 'behavioral',
          currentTime: Date.now(),
          sessionStartTime: Date.now()
        },
        options: {
          enableHesitationDetection: true,
          enableNervousnessDetection: true,
          enableConfidenceTracking: true,
          enablePaceAnalysis: true,
          enableEmotionTracking: false,
          feedbackThreshold: 0.7,
          aggregationWindow: 5000
        }
      };

      const result = await pipeline.processRealTimeAnalysis(request);

      expect(result).toBeDefined();
      expect(result.analysisType).toBe(AnalysisType.AUDIO_STREAM);
      expect(result.immediateInsights).toBeInstanceOf(Array);

      // Should have pace-related insights
      const paceInsights = result.immediateInsights.filter(
        insight => insight.type === InsightType.PACE_TOO_FAST || 
                  insight.type === InsightType.PACE_TOO_SLOW ||
                  insight.type === InsightType.GOOD_PACE
      );
      expect(paceInsights.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Modal Analysis', () => {
    it('should process multi-modal input with text, audio, and video', async () => {
      const sessionId = 'multimodal-session-1';
      pipeline.startSession(sessionId);

      const request: RealTimeAnalysisRequest = {
        sessionId,
        analysisType: AnalysisType.MULTI_MODAL,
        inputData: {
          text: 'I believe this approach will work well for our team.',
          audioChunk: {
            buffer: Buffer.from('mock-audio-data'),
            duration: 3000,
            sampleRate: 44100,
            channels: 1,
            format: 'wav'
          },
          videoFrame: {
            buffer: Buffer.from('mock-video-frame'),
            width: 640,
            height: 480,
            format: 'rgb24',
            frameRate: 30
          },
          timestamp: Date.now(),
          sequenceNumber: 1
        },
        context: {
          questionType: 'leadership',
          interviewStage: 'leadership',
          currentTime: Date.now(),
          sessionStartTime: Date.now()
        },
        options: {
          enableHesitationDetection: true,
          enableNervousnessDetection: true,
          enableConfidenceTracking: true,
          enablePaceAnalysis: true,
          enableEmotionTracking: true,
          feedbackThreshold: 0.7,
          aggregationWindow: 5000
        }
      };

      const result = await pipeline.processRealTimeAnalysis(request);

      expect(result).toBeDefined();
      expect(result.analysisType).toBe(AnalysisType.MULTI_MODAL);
      expect(result.immediateInsights).toBeInstanceOf(Array);
      expect(result.hesitationDetection).toBeDefined();
      expect(result.nervousnessDetection).toBeDefined();
      expect(result.aggregatedMetrics).toBeDefined();
      expect(result.feedbackTriggers).toBeInstanceOf(Array);
    });
  });

  describe('Hesitation Detection', () => {
    it('should detect and analyze hesitation patterns', async () => {
      const sessionId = 'hesitation-session-1';
      pipeline.startSession(sessionId);

      const request: RealTimeAnalysisRequest = {
        sessionId,
        analysisType: AnalysisType.TEXT_STREAM,
        inputData: {
          text: 'Um, well, I think... uh... this is... you know... a good idea.',
          timestamp: Date.now(),
          sequenceNumber: 1
        },
        context: {
          questionType: 'technical',
          interviewStage: 'technical',
          currentTime: Date.now(),
          sessionStartTime: Date.now()
        },
        options: {
          enableHesitationDetection: true,
          enableNervousnessDetection: false,
          enableConfidenceTracking: true,
          enablePaceAnalysis: false,
          enableEmotionTracking: false,
          feedbackThreshold: 0.7,
          aggregationWindow: 5000
        }
      };

      const result = await pipeline.processRealTimeAnalysis(request);

      expect(result.hesitationDetection).toBeDefined();
      expect(result.hesitationDetection.hesitationPatterns).toBeInstanceOf(Array);
      expect(result.hesitationDetection.hesitationPatterns.length).toBeGreaterThan(0);
      expect(result.hesitationDetection.overallHesitationScore).toBeGreaterThanOrEqual(0);
      expect(result.hesitationDetection.overallHesitationScore).toBeLessThanOrEqual(1);
      expect(result.hesitationDetection.recommendations).toBeInstanceOf(Array);

      // Check hesitation pattern structure
      const pattern = result.hesitationDetection.hesitationPatterns[0];
      expect(Object.values(HesitationType)).toContain(pattern.type);
      expect(pattern.frequency).toBeGreaterThanOrEqual(0);
      expect(pattern.averageDuration).toBeGreaterThan(0);
    });
  });

  describe('Nervousness Detection', () => {
    it('should analyze nervousness indicators', async () => {
      const sessionId = 'nervousness-session-1';
      pipeline.startSession(sessionId);

      const request: RealTimeAnalysisRequest = {
        sessionId,
        analysisType: AnalysisType.AUDIO_STREAM,
        inputData: {
          audioChunk: {
            buffer: Buffer.from('nervous-speech-audio'),
            duration: 4000,
            sampleRate: 44100,
            channels: 1,
            format: 'wav'
          },
          timestamp: Date.now(),
          sequenceNumber: 1
        },
        context: {
          questionType: 'behavioral',
          interviewStage: 'behavioral',
          currentTime: Date.now(),
          sessionStartTime: Date.now()
        },
        options: {
          enableHesitationDetection: false,
          enableNervousnessDetection: true,
          enableConfidenceTracking: true,
          enablePaceAnalysis: true,
          enableEmotionTracking: false,
          feedbackThreshold: 0.7,
          aggregationWindow: 5000
        }
      };

      const result = await pipeline.processRealTimeAnalysis(request);

      expect(result.nervousnessDetection).toBeDefined();
      expect(result.nervousnessDetection.nervousnessLevel).toBeGreaterThanOrEqual(0);
      expect(result.nervousnessDetection.nervousnessLevel).toBeLessThanOrEqual(1);
      expect(result.nervousnessDetection.voiceStability).toBeGreaterThanOrEqual(0);
      expect(result.nervousnessDetection.voiceStability).toBeLessThanOrEqual(1);
      expect(result.nervousnessDetection.speechPattern).toBeDefined();
      expect(result.nervousnessDetection.emotionalState).toBeDefined();
      expect(result.nervousnessDetection.recommendations).toBeInstanceOf(Array);

      // Check speech pattern analysis
      const speechPattern = result.nervousnessDetection.speechPattern;
      expect(speechPattern.averagePace).toBeGreaterThan(0);
      expect(speechPattern.paceVariability).toBeGreaterThanOrEqual(0);
      expect(speechPattern.articulationClarity).toBeGreaterThanOrEqual(0);
      expect(speechPattern.articulationClarity).toBeLessThanOrEqual(1);
    });
  });

  describe('Feedback Generation', () => {
    it('should generate appropriate feedback triggers', async () => {
      const sessionId = 'feedback-session-1';
      pipeline.startSession(sessionId);

      const request: RealTimeAnalysisRequest = {
        sessionId,
        analysisType: AnalysisType.TEXT_STREAM,
        inputData: {
          text: 'Um, like, I think, uh, this is, you know, really important.',
          timestamp: Date.now(),
          sequenceNumber: 1
        },
        context: {
          questionType: 'behavioral',
          interviewStage: 'behavioral',
          currentTime: Date.now(),
          sessionStartTime: Date.now()
        },
        options: {
          enableHesitationDetection: true,
          enableNervousnessDetection: true,
          enableConfidenceTracking: true,
          enablePaceAnalysis: true,
          enableEmotionTracking: true,
          feedbackThreshold: 0.7,
          aggregationWindow: 5000
        }
      };

      const result = await pipeline.processRealTimeAnalysis(request);

      expect(result.feedbackTriggers).toBeInstanceOf(Array);
      expect(result.feedbackTriggers.length).toBeGreaterThan(0);

      // Check feedback trigger structure
      const trigger = result.feedbackTriggers[0];
      expect(Object.values(FeedbackType)).toContain(trigger.type);
      expect(trigger.message).toBeDefined();
      expect(trigger.message.length).toBeGreaterThan(0);
      expect(typeof trigger.actionRequired).toBe('boolean');
      expect(trigger.timestamp).toBeGreaterThan(0);
    });

    it('should generate positive feedback for good performance', async () => {
      const sessionId = 'positive-feedback-session';
      pipeline.startSession(sessionId);

      const request: RealTimeAnalysisRequest = {
        sessionId,
        analysisType: AnalysisType.TEXT_STREAM,
        inputData: {
          text: 'First, I analyzed the requirements carefully. Then, I designed a comprehensive solution. Finally, I implemented it successfully with excellent results.',
          timestamp: Date.now(),
          sequenceNumber: 1
        },
        context: {
          questionType: 'technical',
          interviewStage: 'technical',
          currentTime: Date.now(),
          sessionStartTime: Date.now()
        },
        options: {
          enableHesitationDetection: true,
          enableNervousnessDetection: false,
          enableConfidenceTracking: true,
          enablePaceAnalysis: false,
          enableEmotionTracking: false,
          feedbackThreshold: 0.7,
          aggregationWindow: 5000
        }
      };

      const result = await pipeline.processRealTimeAnalysis(request);

      // Should have positive feedback for clear structure
      const positiveFeedback = result.feedbackTriggers.find(
        trigger => trigger.type === FeedbackType.ENCOURAGEMENT
      );
      expect(positiveFeedback).toBeDefined();
    });
  });

  describe('Session State Updates', () => {
    it('should update session state with analysis results', async () => {
      const sessionId = 'state-update-session';
      pipeline.startSession(sessionId);

      const initialState = pipeline.getSessionState(sessionId);
      expect(initialState?.overallConfidence).toBe(0.5);

      const request: RealTimeAnalysisRequest = {
        sessionId,
        analysisType: AnalysisType.TEXT_STREAM,
        inputData: {
          text: 'This is a clear and confident response.',
          timestamp: Date.now(),
          sequenceNumber: 1
        },
        context: {
          questionType: 'behavioral',
          interviewStage: 'behavioral',
          currentTime: Date.now(),
          sessionStartTime: Date.now()
        },
        options: {
          enableHesitationDetection: true,
          enableNervousnessDetection: true,
          enableConfidenceTracking: true,
          enablePaceAnalysis: true,
          enableEmotionTracking: true,
          feedbackThreshold: 0.7,
          aggregationWindow: 5000
        }
      };

      await pipeline.processRealTimeAnalysis(request);

      const updatedState = pipeline.getSessionState(sessionId);
      expect(updatedState).toBeDefined();
      // Check that the state has been updated (confidence may have changed due to analysis)
      expect(updatedState?.overallConfidence).toBeGreaterThanOrEqual(0);
      expect(updatedState?.overallConfidence).toBeLessThanOrEqual(1);
      expect(updatedState?.communicationEffectiveness).toBeGreaterThanOrEqual(0);
      expect(updatedState?.communicationEffectiveness).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for missing session ID', async () => {
      const request: RealTimeAnalysisRequest = {
        sessionId: '',
        analysisType: AnalysisType.TEXT_STREAM,
        inputData: {
          text: 'Test text',
          timestamp: Date.now(),
          sequenceNumber: 1
        },
        context: {
          questionType: 'behavioral',
          interviewStage: 'behavioral',
          currentTime: Date.now(),
          sessionStartTime: Date.now()
        },
        options: {
          enableHesitationDetection: true,
          enableNervousnessDetection: false,
          enableConfidenceTracking: true,
          enablePaceAnalysis: false,
          enableEmotionTracking: false,
          feedbackThreshold: 0.7,
          aggregationWindow: 5000
        }
      };

      await expect(pipeline.processRealTimeAnalysis(request)).rejects.toThrow(RealTimeAnalysisError);
      await expect(pipeline.processRealTimeAnalysis(request)).rejects.toThrow('Session ID is required');
    });

    it('should throw error for non-existent session', async () => {
      const request: RealTimeAnalysisRequest = {
        sessionId: 'non-existent-session',
        analysisType: AnalysisType.TEXT_STREAM,
        inputData: {
          text: 'Test text',
          timestamp: Date.now(),
          sequenceNumber: 1
        },
        context: {
          questionType: 'behavioral',
          interviewStage: 'behavioral',
          currentTime: Date.now(),
          sessionStartTime: Date.now()
        },
        options: {
          enableHesitationDetection: true,
          enableNervousnessDetection: false,
          enableConfidenceTracking: true,
          enablePaceAnalysis: false,
          enableEmotionTracking: false,
          feedbackThreshold: 0.7,
          aggregationWindow: 5000
        }
      };

      await expect(pipeline.processRealTimeAnalysis(request)).rejects.toThrow(RealTimeAnalysisError);
      await expect(pipeline.processRealTimeAnalysis(request)).rejects.toThrow('Session not found');
    });

    it('should throw error for insufficient input data', async () => {
      const sessionId = 'error-session';
      pipeline.startSession(sessionId);

      const request: RealTimeAnalysisRequest = {
        sessionId,
        analysisType: AnalysisType.TEXT_STREAM,
        inputData: {
          timestamp: Date.now(),
          sequenceNumber: 1
        },
        context: {
          questionType: 'behavioral',
          interviewStage: 'behavioral',
          currentTime: Date.now(),
          sessionStartTime: Date.now()
        },
        options: {
          enableHesitationDetection: true,
          enableNervousnessDetection: false,
          enableConfidenceTracking: true,
          enablePaceAnalysis: false,
          enableEmotionTracking: false,
          feedbackThreshold: 0.7,
          aggregationWindow: 5000
        }
      };

      await expect(pipeline.processRealTimeAnalysis(request)).rejects.toThrow(RealTimeAnalysisError);
      await expect(pipeline.processRealTimeAnalysis(request)).rejects.toThrow('At least one input type');
    });
  });

  describe('Analysis History', () => {
    it('should maintain analysis history for sessions', async () => {
      const sessionId = 'history-session';
      pipeline.startSession(sessionId);

      // Process multiple analysis requests
      for (let i = 0; i < 3; i++) {
        const request: RealTimeAnalysisRequest = {
          sessionId,
          analysisType: AnalysisType.TEXT_STREAM,
          inputData: {
            text: `Response number ${i + 1}`,
            timestamp: Date.now(),
            sequenceNumber: i + 1
          },
          context: {
            questionType: 'behavioral',
            interviewStage: 'behavioral',
            currentTime: Date.now(),
            sessionStartTime: Date.now()
          },
          options: {
            enableHesitationDetection: true,
            enableNervousnessDetection: false,
            enableConfidenceTracking: true,
            enablePaceAnalysis: false,
            enableEmotionTracking: false,
            feedbackThreshold: 0.7,
            aggregationWindow: 5000
          }
        };

        await pipeline.processRealTimeAnalysis(request);
      }

      const history = pipeline.getSessionHistory(sessionId);
      expect(history).toBeInstanceOf(Array);
      expect(history.length).toBe(3);
      expect(history[0].sequenceNumber).toBe(1);
      expect(history[2].sequenceNumber).toBe(3);
    });

    it('should return empty array for non-existent session history', () => {
      const history = pipeline.getSessionHistory('non-existent-session');
      expect(history).toEqual([]);
    });
  });
});