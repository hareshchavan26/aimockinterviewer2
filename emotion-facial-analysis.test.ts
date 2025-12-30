/**
 * Emotion and Facial Analysis Engine Tests
 * Basic functionality tests for emotion detection and facial expression analysis
 */

import { EmotionFacialAnalysisEngine } from '../services/emotion-facial-analysis-engine';
import {
  EmotionFacialAnalysisRequest,
  EmotionFacialConfig,
  VideoData,
  AudioData,
  VideoFormat,
  AudioFormat,
  VideoEncoding,
  AudioEncoding,
  InterviewStage,
  FaceApiModel,
  EmotionSensitivity,
  EmotionFacialAnalysisError,
  EmotionType,
  FacialExpression
} from '../types/emotion-facial-analysis';

describe('EmotionFacialAnalysisEngine', () => {
  let emotionFacialEngine: EmotionFacialAnalysisEngine;
  let defaultConfig: EmotionFacialConfig;

  beforeEach(() => {
    defaultConfig = {
      enableAdvancedAnalysis: true,
      faceApiSettings: {
        modelPath: '/models/face-api',
        detectionThreshold: 0.5,
        landmarkThreshold: 0.5,
        expressionThreshold: 0.3,
        maxFaces: 1
      },
      emotionThresholds: {
        minIntensity: 0.1,
        maxIntensity: 1.0,
        stabilityThreshold: 0.7,
        changeThreshold: 0.2
      },
      confidenceThresholds: {
        minConfidence: 0.6,
        highConfidence: 0.8,
        stabilityThreshold: 0.7
      },
      correlationThresholds: {
        minCorrelation: 0.5,
        highCorrelation: 0.8,
        discrepancyThreshold: 0.3
      }
    };

    emotionFacialEngine = new EmotionFacialAnalysisEngine(defaultConfig);
  });

  describe('Basic Emotion and Facial Analysis', () => {
    it('should analyze video and audio successfully', async () => {
      const mockVideoData: VideoData = {
        buffer: Buffer.from('mock-video-data'),
        format: {
          encoding: VideoEncoding.MP4,
          mimeType: 'video/mp4',
          extension: 'mp4'
        },
        duration: 60,
        frameRate: 30,
        resolution: { width: 1280, height: 720 },
        codec: 'h264'
      };

      const mockAudioData: AudioData = {
        buffer: Buffer.from('mock-audio-data'),
        format: {
          encoding: AudioEncoding.WAV,
          mimeType: 'audio/wav',
          extension: 'wav'
        },
        duration: 60,
        sampleRate: 44100,
        channels: 1
      };

      const request: EmotionFacialAnalysisRequest = {
        videoData: mockVideoData,
        audioData: mockAudioData,
        context: {
          questionType: 'behavioral',
          interviewStage: InterviewStage.BEHAVIORAL,
          expectedDuration: 60
        },
        options: {
          enableVoiceEmotionDetection: true,
          enableFacialExpressionAnalysis: true,
          enableMicroExpressionDetection: true,
          enableGazeTracking: true,
          enablePostureAnalysis: true,
          enableConfidenceAssessment: true,
          enableEmotionCorrelation: true,
          confidenceThreshold: 0.7,
          faceApiModel: FaceApiModel.MEDIUM,
          emotionSensitivity: EmotionSensitivity.MEDIUM
        }
      };

      const result = await emotionFacialEngine.analyzeEmotionFacial(request);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
      expect(result.voiceEmotionAnalysis).toBeDefined();
      expect(result.facialExpressionAnalysis).toBeDefined();
      expect(result.microExpressionAnalysis).toBeDefined();
      expect(result.gazeAnalysis).toBeDefined();
      expect(result.postureAnalysis).toBeDefined();
      expect(result.confidenceAssessment).toBeDefined();
      expect(result.emotionCorrelation).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should analyze voice emotions only', async () => {
      const mockAudioData: AudioData = {
        buffer: Buffer.from('mock-audio-data'),
        format: {
          encoding: AudioEncoding.MP3,
          mimeType: 'audio/mp3',
          extension: 'mp3'
        },
        duration: 45,
        sampleRate: 44100,
        channels: 1
      };

      const request: EmotionFacialAnalysisRequest = {
        audioData: mockAudioData,
        context: {
          questionType: 'technical',
          interviewStage: InterviewStage.TECHNICAL
        },
        options: {
          enableVoiceEmotionDetection: true,
          enableFacialExpressionAnalysis: false,
          enableMicroExpressionDetection: false,
          enableGazeTracking: false,
          enablePostureAnalysis: false,
          enableConfidenceAssessment: true,
          enableEmotionCorrelation: false,
          confidenceThreshold: 0.7,
          faceApiModel: FaceApiModel.MEDIUM,
          emotionSensitivity: EmotionSensitivity.HIGH
        }
      };

      const result = await emotionFacialEngine.analyzeEmotionFacial(request);

      expect(result.voiceEmotionAnalysis.emotions).toBeInstanceOf(Array);
      expect(result.voiceEmotionAnalysis.emotions.length).toBeGreaterThan(0);
      expect(result.voiceEmotionAnalysis.primaryEmotion).toBeDefined();
      expect(Object.values(EmotionType)).toContain(result.voiceEmotionAnalysis.primaryEmotion);
      expect(result.voiceEmotionAnalysis.emotionalStability).toBeGreaterThanOrEqual(0);
      expect(result.voiceEmotionAnalysis.emotionalStability).toBeLessThanOrEqual(1);
      expect(result.voiceEmotionAnalysis.score).toBeGreaterThanOrEqual(0);
      expect(result.voiceEmotionAnalysis.score).toBeLessThanOrEqual(1);

      // Check that facial analysis is empty when disabled
      expect(result.facialExpressionAnalysis.expressions).toHaveLength(0);
      expect(result.facialExpressionAnalysis.recommendations).toContain('Facial expression analysis not enabled');
    });

    it('should analyze facial expressions only', async () => {
      const mockVideoData: VideoData = {
        buffer: Buffer.from('mock-video-data'),
        format: {
          encoding: VideoEncoding.WEBM,
          mimeType: 'video/webm',
          extension: 'webm'
        },
        duration: 90,
        frameRate: 25,
        resolution: { width: 854, height: 480 },
        codec: 'vp8'
      };

      const request: EmotionFacialAnalysisRequest = {
        videoData: mockVideoData,
        context: {
          questionType: 'behavioral',
          interviewStage: InterviewStage.BEHAVIORAL
        },
        options: {
          enableVoiceEmotionDetection: false,
          enableFacialExpressionAnalysis: true,
          enableMicroExpressionDetection: true,
          enableGazeTracking: true,
          enablePostureAnalysis: true,
          enableConfidenceAssessment: true,
          enableEmotionCorrelation: false,
          confidenceThreshold: 0.7,
          faceApiModel: FaceApiModel.LARGE,
          emotionSensitivity: EmotionSensitivity.HIGH
        }
      };

      const result = await emotionFacialEngine.analyzeEmotionFacial(request);

      expect(result.facialExpressionAnalysis.expressions).toBeInstanceOf(Array);
      expect(result.facialExpressionAnalysis.expressions.length).toBeGreaterThan(0);
      expect(result.facialExpressionAnalysis.primaryExpression).toBeDefined();
      expect(Object.values(FacialExpression)).toContain(result.facialExpressionAnalysis.primaryExpression);
      expect(result.facialExpressionAnalysis.facialLandmarks).toBeInstanceOf(Array);
      expect(result.facialExpressionAnalysis.expressionStability).toBeGreaterThanOrEqual(0);
      expect(result.facialExpressionAnalysis.expressionStability).toBeLessThanOrEqual(1);
      expect(result.facialExpressionAnalysis.score).toBeGreaterThanOrEqual(0);
      expect(result.facialExpressionAnalysis.score).toBeLessThanOrEqual(1);

      // Check gaze analysis
      expect(result.gazeAnalysis.gazeStability).toBeGreaterThanOrEqual(0);
      expect(result.gazeAnalysis.gazeStability).toBeLessThanOrEqual(1);
      expect(result.gazeAnalysis.score).toBeGreaterThanOrEqual(0);
      expect(result.gazeAnalysis.score).toBeLessThanOrEqual(1);

      // Check that voice analysis is empty when disabled
      expect(result.voiceEmotionAnalysis.emotions).toHaveLength(0);
      expect(result.voiceEmotionAnalysis.recommendations).toContain('Voice emotion analysis not enabled');
    });

    it('should assess confidence from multiple modalities', async () => {
      const mockVideoData: VideoData = {
        buffer: Buffer.from('mock-video-data'),
        format: {
          encoding: VideoEncoding.MP4,
          mimeType: 'video/mp4',
          extension: 'mp4'
        },
        duration: 120,
        frameRate: 30,
        resolution: { width: 1920, height: 1080 },
        codec: 'h264'
      };

      const mockAudioData: AudioData = {
        buffer: Buffer.from('mock-audio-data'),
        format: {
          encoding: AudioEncoding.FLAC,
          mimeType: 'audio/flac',
          extension: 'flac'
        },
        duration: 120,
        sampleRate: 48000,
        channels: 1
      };

      const request: EmotionFacialAnalysisRequest = {
        videoData: mockVideoData,
        audioData: mockAudioData,
        context: {
          questionType: 'behavioral',
          interviewStage: InterviewStage.BEHAVIORAL
        },
        options: {
          enableVoiceEmotionDetection: true,
          enableFacialExpressionAnalysis: true,
          enableMicroExpressionDetection: false,
          enableGazeTracking: false,
          enablePostureAnalysis: true,
          enableConfidenceAssessment: true,
          enableEmotionCorrelation: true,
          confidenceThreshold: 0.8,
          faceApiModel: FaceApiModel.MEDIUM,
          emotionSensitivity: EmotionSensitivity.MEDIUM
        }
      };

      const result = await emotionFacialEngine.analyzeEmotionFacial(request);

      expect(result.confidenceAssessment.overallConfidence).toBeGreaterThan(0);
      expect(result.confidenceAssessment.overallConfidence).toBeLessThanOrEqual(1);
      expect(result.confidenceAssessment.voiceConfidence).toBeGreaterThanOrEqual(0);
      expect(result.confidenceAssessment.voiceConfidence).toBeLessThanOrEqual(1);
      expect(result.confidenceAssessment.facialConfidence).toBeGreaterThanOrEqual(0);
      expect(result.confidenceAssessment.facialConfidence).toBeLessThanOrEqual(1);
      expect(result.confidenceAssessment.postureConfidence).toBeGreaterThanOrEqual(0);
      expect(result.confidenceAssessment.postureConfidence).toBeLessThanOrEqual(1);

      // Check emotion correlation
      expect(result.emotionCorrelation.voiceFaceCorrelation.correlation).toBeGreaterThanOrEqual(0);
      expect(result.emotionCorrelation.voiceFaceCorrelation.correlation).toBeLessThanOrEqual(1);
      expect(result.emotionCorrelation.emotionConsistency.overall).toBeGreaterThanOrEqual(0);
      expect(result.emotionCorrelation.emotionConsistency.overall).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for insufficient data', async () => {
      const request: EmotionFacialAnalysisRequest = {
        context: {
          questionType: 'behavioral',
          interviewStage: InterviewStage.BEHAVIORAL
        },
        options: {
          enableVoiceEmotionDetection: true,
          enableFacialExpressionAnalysis: true,
          enableMicroExpressionDetection: true,
          enableGazeTracking: true,
          enablePostureAnalysis: true,
          enableConfidenceAssessment: true,
          enableEmotionCorrelation: true,
          confidenceThreshold: 0.7,
          faceApiModel: FaceApiModel.MEDIUM,
          emotionSensitivity: EmotionSensitivity.MEDIUM
        }
      };

      await expect(emotionFacialEngine.analyzeEmotionFacial(request)).rejects.toThrow('Either video or audio data is required');
    });

    it('should throw error for video too short', async () => {
      const mockVideoData: VideoData = {
        buffer: Buffer.from('short-video'),
        format: {
          encoding: VideoEncoding.MP4,
          mimeType: 'video/mp4',
          extension: 'mp4'
        },
        duration: 3, // Too short
        frameRate: 30,
        resolution: { width: 640, height: 480 },
        codec: 'h264'
      };

      const request: EmotionFacialAnalysisRequest = {
        videoData: mockVideoData,
        context: {
          questionType: 'behavioral',
          interviewStage: InterviewStage.BEHAVIORAL
        },
        options: {
          enableVoiceEmotionDetection: false,
          enableFacialExpressionAnalysis: true,
          enableMicroExpressionDetection: false,
          enableGazeTracking: false,
          enablePostureAnalysis: false,
          enableConfidenceAssessment: false,
          enableEmotionCorrelation: false,
          confidenceThreshold: 0.7,
          faceApiModel: FaceApiModel.MEDIUM,
          emotionSensitivity: EmotionSensitivity.MEDIUM
        }
      };

      await expect(emotionFacialEngine.analyzeEmotionFacial(request)).rejects.toThrow('Video must be at least 5 seconds long');
    });

    it('should throw error for poor video quality', async () => {
      const mockVideoData: VideoData = {
        buffer: Buffer.from('low-quality-video'),
        format: {
          encoding: VideoEncoding.MP4,
          mimeType: 'video/mp4',
          extension: 'mp4'
        },
        duration: 60,
        frameRate: 30,
        resolution: { width: 160, height: 120 }, // Too low resolution
        codec: 'h264'
      };

      const request: EmotionFacialAnalysisRequest = {
        videoData: mockVideoData,
        context: {
          questionType: 'behavioral',
          interviewStage: InterviewStage.BEHAVIORAL
        },
        options: {
          enableVoiceEmotionDetection: false,
          enableFacialExpressionAnalysis: true,
          enableMicroExpressionDetection: false,
          enableGazeTracking: false,
          enablePostureAnalysis: false,
          enableConfidenceAssessment: false,
          enableEmotionCorrelation: false,
          confidenceThreshold: 0.7,
          faceApiModel: FaceApiModel.MEDIUM,
          emotionSensitivity: EmotionSensitivity.MEDIUM
        }
      };

      await expect(emotionFacialEngine.analyzeEmotionFacial(request)).rejects.toThrow('Video resolution too low for reliable face detection');
    });
  });

  describe('Voice Emotion Analysis', () => {
    it('should detect multiple emotions with intensities', async () => {
      const mockAudioData: AudioData = {
        buffer: Buffer.from('emotional-speech-sample'),
        format: {
          encoding: AudioEncoding.WAV,
          mimeType: 'audio/wav',
          extension: 'wav'
        },
        duration: 75,
        sampleRate: 44100,
        channels: 1
      };

      const request: EmotionFacialAnalysisRequest = {
        audioData: mockAudioData,
        context: {
          questionType: 'behavioral',
          interviewStage: InterviewStage.BEHAVIORAL
        },
        options: {
          enableVoiceEmotionDetection: true,
          enableFacialExpressionAnalysis: false,
          enableMicroExpressionDetection: false,
          enableGazeTracking: false,
          enablePostureAnalysis: false,
          enableConfidenceAssessment: false,
          enableEmotionCorrelation: false,
          confidenceThreshold: 0.7,
          faceApiModel: FaceApiModel.MEDIUM,
          emotionSensitivity: EmotionSensitivity.HIGH
        }
      };

      const result = await emotionFacialEngine.analyzeEmotionFacial(request);

      expect(result.voiceEmotionAnalysis.emotions.length).toBeGreaterThan(0);
      
      // Check emotion structure
      const firstEmotion = result.voiceEmotionAnalysis.emotions[0];
      expect(firstEmotion.emotion).toBeDefined();
      expect(Object.values(EmotionType)).toContain(firstEmotion.emotion);
      expect(firstEmotion.intensity).toBeGreaterThanOrEqual(0);
      expect(firstEmotion.intensity).toBeLessThanOrEqual(1);
      expect(firstEmotion.confidence).toBeGreaterThan(0);
      expect(firstEmotion.confidence).toBeLessThanOrEqual(1);
      expect(firstEmotion.timeSegments).toBeInstanceOf(Array);
      expect(firstEmotion.voiceFeatures).toBeInstanceOf(Array);

      // Check emotional range
      expect(result.voiceEmotionAnalysis.emotionalRange.min).toBeGreaterThanOrEqual(0);
      expect(result.voiceEmotionAnalysis.emotionalRange.max).toBeLessThanOrEqual(1);
      expect(result.voiceEmotionAnalysis.emotionalRange.average).toBeGreaterThanOrEqual(0);
      expect(result.voiceEmotionAnalysis.emotionalRange.average).toBeLessThanOrEqual(1);
    });
  });

  describe('Facial Expression Analysis', () => {
    it('should detect facial expressions with landmarks', async () => {
      const mockVideoData: VideoData = {
        buffer: Buffer.from('facial-expression-video'),
        format: {
          encoding: VideoEncoding.MP4,
          mimeType: 'video/mp4',
          extension: 'mp4'
        },
        duration: 60,
        frameRate: 30,
        resolution: { width: 1280, height: 720 },
        codec: 'h264'
      };

      const request: EmotionFacialAnalysisRequest = {
        videoData: mockVideoData,
        context: {
          questionType: 'behavioral',
          interviewStage: InterviewStage.BEHAVIORAL
        },
        options: {
          enableVoiceEmotionDetection: false,
          enableFacialExpressionAnalysis: true,
          enableMicroExpressionDetection: false,
          enableGazeTracking: false,
          enablePostureAnalysis: false,
          enableConfidenceAssessment: false,
          enableEmotionCorrelation: false,
          confidenceThreshold: 0.7,
          faceApiModel: FaceApiModel.LARGE,
          emotionSensitivity: EmotionSensitivity.MEDIUM
        }
      };

      const result = await emotionFacialEngine.analyzeEmotionFacial(request);

      expect(result.facialExpressionAnalysis.expressions.length).toBeGreaterThan(0);
      expect(result.facialExpressionAnalysis.facialLandmarks.length).toBeGreaterThan(0);

      // Check expression structure
      const firstExpression = result.facialExpressionAnalysis.expressions[0];
      expect(firstExpression.expression).toBeDefined();
      expect(Object.values(FacialExpression)).toContain(firstExpression.expression);
      expect(firstExpression.intensity).toBeGreaterThanOrEqual(0);
      expect(firstExpression.intensity).toBeLessThanOrEqual(1);
      expect(firstExpression.confidence).toBeGreaterThan(0);
      expect(firstExpression.confidence).toBeLessThanOrEqual(1);

      // Check facial landmarks structure
      const firstLandmark = result.facialExpressionAnalysis.facialLandmarks[0];
      expect(firstLandmark.timestamp).toBeGreaterThanOrEqual(0);
      expect(firstLandmark.landmarks).toBeInstanceOf(Array);
      expect(firstLandmark.landmarks.length).toBe(68); // Standard 68-point model
      expect(firstLandmark.boundingBox).toBeDefined();
      expect(firstLandmark.faceQuality).toBeDefined();

      // Check individual landmark
      const landmark = firstLandmark.landmarks[0];
      expect(landmark.id).toBeDefined();
      expect(landmark.x).toBeGreaterThanOrEqual(0);
      expect(landmark.y).toBeGreaterThanOrEqual(0);
      expect(landmark.confidence).toBeGreaterThan(0);
      expect(landmark.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Micro-expression Analysis', () => {
    it('should assess authenticity of expressions', async () => {
      const mockVideoData: VideoData = {
        buffer: Buffer.from('micro-expression-video'),
        format: {
          encoding: VideoEncoding.MP4,
          mimeType: 'video/mp4',
          extension: 'mp4'
        },
        duration: 90,
        frameRate: 30,
        resolution: { width: 1920, height: 1080 },
        codec: 'h264'
      };

      const request: EmotionFacialAnalysisRequest = {
        videoData: mockVideoData,
        context: {
          questionType: 'behavioral',
          interviewStage: InterviewStage.BEHAVIORAL
        },
        options: {
          enableVoiceEmotionDetection: false,
          enableFacialExpressionAnalysis: true,
          enableMicroExpressionDetection: true,
          enableGazeTracking: false,
          enablePostureAnalysis: false,
          enableConfidenceAssessment: false,
          enableEmotionCorrelation: false,
          confidenceThreshold: 0.7,
          faceApiModel: FaceApiModel.LARGE,
          emotionSensitivity: EmotionSensitivity.VERY_HIGH
        }
      };

      const result = await emotionFacialEngine.analyzeEmotionFacial(request);

      expect(result.microExpressionAnalysis.authenticity).toBeDefined();
      expect(result.microExpressionAnalysis.authenticity.score).toBeGreaterThanOrEqual(0);
      expect(result.microExpressionAnalysis.authenticity.score).toBeLessThanOrEqual(1);
      expect(result.microExpressionAnalysis.authenticity.genuineExpressions).toBeGreaterThanOrEqual(0);
      expect(result.microExpressionAnalysis.authenticity.forcedExpressions).toBeGreaterThanOrEqual(0);
      expect(result.microExpressionAnalysis.authenticity.overallAuthenticity).toBeDefined();
      expect(result.microExpressionAnalysis.score).toBeGreaterThanOrEqual(0);
      expect(result.microExpressionAnalysis.score).toBeLessThanOrEqual(1);
    });
  });
});