/**
 * Speech Analysis Engine Tests
 * Basic functionality tests for speech analysis
 */

import { SpeechAnalysisEngine } from '../services/speech-analysis-engine';
import {
  SpeechAnalysisRequest,
  SpeechAnalysisConfig,
  AudioData,
  AudioFormat,
  AudioEncoding,
  WhisperModel,
  InterviewStage,
  SpeechAnalysisError
} from '../types/speech-analysis';

describe('SpeechAnalysisEngine', () => {
  let speechAnalysisEngine: SpeechAnalysisEngine;
  let defaultConfig: SpeechAnalysisConfig;

  beforeEach(() => {
    defaultConfig = {
      whisperApiKey: 'test-api-key',
      whisperBaseUrl: 'https://api.openai.com/v1',
      enableAdvancedAnalysis: true,
      fillerWords: {
        verbal: ['um', 'uh', 'er', 'ah', 'hmm'],
        lexical: ['like', 'you know', 'basically', 'actually', 'literally'],
        customFillers: [],
        detectionSensitivity: 0.8
      },
      paceThresholds: {
        optimalWPM: { min: 150, max: 190, optimal: 170 },
        slowThreshold: 120,
        fastThreshold: 220,
        variabilityThreshold: 0.3
      },
      pauseThresholds: {
        minPauseLength: 0.3,
        maxOptimalPause: 2.0,
        hesitationThreshold: 1.5,
        strategicPauseRange: { min: 0.5, max: 1.5, optimal: 1.0 }
      },
      clarityThresholds: {
        minClarityScore: 0.7,
        noiseThreshold: 0.3,
        articulationThreshold: 0.75,
        volumeConsistencyThreshold: 0.8
      },
      confidenceThresholds: {
        minConfidenceScore: 0.6,
        hesitationRatioThreshold: 0.15,
        fillerFrequencyThreshold: 8.0,
        assertivenessThreshold: 0.5
      },
      volumeThresholds: {
        optimalRange: { min: 0.4, max: 0.8 },
        variabilityThreshold: 0.25,
        minAudibleLevel: 0.2,
        maxComfortableLevel: 0.9
      }
    };

    speechAnalysisEngine = new SpeechAnalysisEngine(defaultConfig);
  });

  describe('Basic Speech Analysis', () => {
    it('should analyze a speech sample successfully', async () => {
      const mockAudioData: AudioData = {
        buffer: Buffer.from('mock-audio-data'),
        format: {
          encoding: AudioEncoding.WAV,
          mimeType: 'audio/wav',
          extension: 'wav'
        },
        duration: 60, // 1 minute
        sampleRate: 44100,
        channels: 1,
        bitDepth: 16
      };

      const request: SpeechAnalysisRequest = {
        audioData: mockAudioData,
        context: {
          questionType: 'behavioral',
          expectedDuration: 60,
          language: 'en',
          interviewStage: InterviewStage.BEHAVIORAL
        },
        options: {
          enableTranscription: true,
          enablePaceAnalysis: true,
          enablePauseAnalysis: true,
          enableFillerDetection: true,
          enableClarityAnalysis: true,
          enableConfidenceAnalysis: true,
          enableEmotionDetection: true,
          enableVolumeAnalysis: true,
          confidenceThreshold: 0.7,
          whisperModel: WhisperModel.BASE
        }
      };

      const result = await speechAnalysisEngine.analyzeSpeech(request);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
      expect(result.transcription).toBeDefined();
      expect(result.transcription.text).toBeDefined();
      expect(result.transcription.wordCount).toBeGreaterThan(0);
      expect(result.paceAnalysis).toBeDefined();
      expect(result.pauseAnalysis).toBeDefined();
      expect(result.fillerAnalysis).toBeDefined();
      expect(result.clarityAnalysis).toBeDefined();
      expect(result.confidenceAnalysis).toBeDefined();
      expect(result.emotionAnalysis).toBeDefined();
      expect(result.volumeAnalysis).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should analyze pace metrics correctly', async () => {
      const mockAudioData: AudioData = {
        buffer: Buffer.from('mock-audio-data'),
        format: {
          encoding: AudioEncoding.MP3,
          mimeType: 'audio/mp3',
          extension: 'mp3'
        },
        duration: 30,
        sampleRate: 44100,
        channels: 1,
        bitDepth: 16
      };

      const request: SpeechAnalysisRequest = {
        audioData: mockAudioData,
        context: {
          questionType: 'technical',
          language: 'en',
          interviewStage: InterviewStage.TECHNICAL
        },
        options: {
          enableTranscription: true,
          enablePaceAnalysis: true,
          enablePauseAnalysis: false,
          enableFillerDetection: false,
          enableClarityAnalysis: false,
          enableConfidenceAnalysis: false,
          enableEmotionDetection: false,
          enableVolumeAnalysis: false,
          confidenceThreshold: 0.7,
          whisperModel: WhisperModel.BASE
        }
      };

      const result = await speechAnalysisEngine.analyzeSpeech(request);

      expect(result.paceAnalysis.metrics.averageWordsPerMinute).toBeGreaterThan(0);
      expect(result.paceAnalysis.metrics.averageSyllablesPerMinute).toBeGreaterThan(0);
      expect(result.paceAnalysis.metrics.optimalRange).toBeDefined();
      expect(result.paceAnalysis.metrics.optimalRange.min).toBeGreaterThan(0);
      expect(result.paceAnalysis.metrics.optimalRange.max).toBeGreaterThan(result.paceAnalysis.metrics.optimalRange.min);
      expect(result.paceAnalysis.score).toBeGreaterThanOrEqual(0);
      expect(result.paceAnalysis.score).toBeLessThanOrEqual(1);
    });

    it('should detect filler words correctly', async () => {
      const mockAudioData: AudioData = {
        buffer: Buffer.from('mock-audio-data-with-fillers'),
        format: {
          encoding: AudioEncoding.WAV,
          mimeType: 'audio/wav',
          extension: 'wav'
        },
        duration: 45,
        sampleRate: 44100,
        channels: 1,
        bitDepth: 16
      };

      const request: SpeechAnalysisRequest = {
        audioData: mockAudioData,
        context: {
          questionType: 'behavioral',
          language: 'en',
          interviewStage: InterviewStage.BEHAVIORAL
        },
        options: {
          enableTranscription: true,
          enablePaceAnalysis: false,
          enablePauseAnalysis: true,
          enableFillerDetection: true,
          enableClarityAnalysis: false,
          enableConfidenceAnalysis: false,
          enableEmotionDetection: false,
          enableVolumeAnalysis: false,
          confidenceThreshold: 0.7,
          whisperModel: WhisperModel.BASE
        }
      };

      const result = await speechAnalysisEngine.analyzeSpeech(request);

      expect(result.fillerAnalysis.metrics).toBeDefined();
      expect(result.fillerAnalysis.metrics.totalFillers).toBeGreaterThanOrEqual(0);
      expect(result.fillerAnalysis.metrics.fillersPerMinute).toBeGreaterThanOrEqual(0);
      expect(result.fillerAnalysis.metrics.fillerPercentage).toBeGreaterThanOrEqual(0);
      expect(result.fillerAnalysis.detectedFillers).toBeInstanceOf(Array);
      expect(result.fillerAnalysis.score).toBeGreaterThanOrEqual(0);
      expect(result.fillerAnalysis.score).toBeLessThanOrEqual(1);
    });

    it('should analyze confidence indicators', async () => {
      const mockAudioData: AudioData = {
        buffer: Buffer.from('mock-confident-speech'),
        format: {
          encoding: AudioEncoding.FLAC,
          mimeType: 'audio/flac',
          extension: 'flac'
        },
        duration: 90,
        sampleRate: 48000,
        channels: 1,
        bitDepth: 24
      };

      const request: SpeechAnalysisRequest = {
        audioData: mockAudioData,
        context: {
          questionType: 'behavioral',
          language: 'en',
          interviewStage: InterviewStage.BEHAVIORAL
        },
        options: {
          enableTranscription: true,
          enablePaceAnalysis: true,
          enablePauseAnalysis: true,
          enableFillerDetection: true,
          enableClarityAnalysis: true,
          enableConfidenceAnalysis: true,
          enableEmotionDetection: true,
          enableVolumeAnalysis: false,
          confidenceThreshold: 0.7,
          whisperModel: WhisperModel.SMALL
        }
      };

      const result = await speechAnalysisEngine.analyzeSpeech(request);

      expect(result.confidenceAnalysis.metrics).toBeDefined();
      expect(result.confidenceAnalysis.metrics.overallConfidence).toBeGreaterThan(0);
      expect(result.confidenceAnalysis.metrics.overallConfidence).toBeLessThanOrEqual(1);
      expect(result.confidenceAnalysis.metrics.linguisticConfidence).toBeGreaterThanOrEqual(0);
      expect(result.confidenceAnalysis.metrics.assertivenessLevel).toBeGreaterThanOrEqual(0);
      expect(result.confidenceAnalysis.score).toBeGreaterThanOrEqual(0);
      expect(result.confidenceAnalysis.score).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for missing audio data', async () => {
      const request: SpeechAnalysisRequest = {
        audioData: null as any,
        context: {
          questionType: 'behavioral',
          language: 'en'
        },
        options: {
          enableTranscription: true,
          enablePaceAnalysis: true,
          enablePauseAnalysis: true,
          enableFillerDetection: true,
          enableClarityAnalysis: true,
          enableConfidenceAnalysis: true,
          enableEmotionDetection: true,
          enableVolumeAnalysis: true,
          confidenceThreshold: 0.7,
          whisperModel: WhisperModel.BASE
        }
      };

      await expect(speechAnalysisEngine.analyzeSpeech(request)).rejects.toThrow('Audio data is required');
    });

    it('should throw error for audio too short', async () => {
      const mockAudioData: AudioData = {
        buffer: Buffer.from('short-audio'),
        format: {
          encoding: AudioEncoding.WAV,
          mimeType: 'audio/wav',
          extension: 'wav'
        },
        duration: 3, // Too short
        sampleRate: 44100,
        channels: 1,
        bitDepth: 16
      };

      const request: SpeechAnalysisRequest = {
        audioData: mockAudioData,
        context: {
          questionType: 'behavioral',
          language: 'en'
        },
        options: {
          enableTranscription: true,
          enablePaceAnalysis: true,
          enablePauseAnalysis: true,
          enableFillerDetection: true,
          enableClarityAnalysis: true,
          enableConfidenceAnalysis: true,
          enableEmotionDetection: true,
          enableVolumeAnalysis: true,
          confidenceThreshold: 0.7,
          whisperModel: WhisperModel.BASE
        }
      };

      await expect(speechAnalysisEngine.analyzeSpeech(request)).rejects.toThrow('Audio must be at least 5 seconds long');
    });

    it('should throw error for audio too long', async () => {
      const mockAudioData: AudioData = {
        buffer: Buffer.from('very-long-audio'),
        format: {
          encoding: AudioEncoding.WAV,
          mimeType: 'audio/wav',
          extension: 'wav'
        },
        duration: 700, // Too long (over 10 minutes)
        sampleRate: 44100,
        channels: 1,
        bitDepth: 16
      };

      const request: SpeechAnalysisRequest = {
        audioData: mockAudioData,
        context: {
          questionType: 'behavioral',
          language: 'en'
        },
        options: {
          enableTranscription: true,
          enablePaceAnalysis: true,
          enablePauseAnalysis: true,
          enableFillerDetection: true,
          enableClarityAnalysis: true,
          enableConfidenceAnalysis: true,
          enableEmotionDetection: true,
          enableVolumeAnalysis: true,
          confidenceThreshold: 0.7,
          whisperModel: WhisperModel.BASE
        }
      };

      await expect(speechAnalysisEngine.analyzeSpeech(request)).rejects.toThrow('Audio must be less than 10 minutes long');
    });
  });

  describe('Transcription Analysis', () => {
    it('should provide detailed transcription results', async () => {
      const mockAudioData: AudioData = {
        buffer: Buffer.from('clear-speech-sample'),
        format: {
          encoding: AudioEncoding.WAV,
          mimeType: 'audio/wav',
          extension: 'wav'
        },
        duration: 60,
        sampleRate: 44100,
        channels: 1,
        bitDepth: 16
      };

      const request: SpeechAnalysisRequest = {
        audioData: mockAudioData,
        context: {
          questionType: 'technical',
          language: 'en',
          interviewStage: InterviewStage.TECHNICAL
        },
        options: {
          enableTranscription: true,
          enablePaceAnalysis: false,
          enablePauseAnalysis: false,
          enableFillerDetection: false,
          enableClarityAnalysis: false,
          enableConfidenceAnalysis: false,
          enableEmotionDetection: false,
          enableVolumeAnalysis: false,
          confidenceThreshold: 0.7,
          whisperModel: WhisperModel.BASE
        }
      };

      const result = await speechAnalysisEngine.analyzeSpeech(request);

      expect(result.transcription.text).toBeDefined();
      expect(result.transcription.text.length).toBeGreaterThan(0);
      expect(result.transcription.segments).toBeInstanceOf(Array);
      expect(result.transcription.segments.length).toBeGreaterThan(0);
      expect(result.transcription.language).toBe('en');
      expect(result.transcription.confidence).toBeGreaterThan(0);
      expect(result.transcription.confidence).toBeLessThanOrEqual(1);
      expect(result.transcription.wordCount).toBeGreaterThan(0);
      expect(result.transcription.duration).toBe(60);

      // Check segment structure
      const firstSegment = result.transcription.segments[0];
      expect(firstSegment.id).toBeDefined();
      expect(firstSegment.text).toBeDefined();
      expect(firstSegment.start).toBeGreaterThanOrEqual(0);
      expect(firstSegment.end).toBeGreaterThan(firstSegment.start);
      expect(firstSegment.confidence).toBeGreaterThan(0);
      expect(firstSegment.words).toBeInstanceOf(Array);
    });
  });

  describe('Emotion Analysis', () => {
    it('should detect emotional indicators in speech', async () => {
      const mockAudioData: AudioData = {
        buffer: Buffer.from('emotional-speech-sample'),
        format: {
          encoding: AudioEncoding.MP3,
          mimeType: 'audio/mp3',
          extension: 'mp3'
        },
        duration: 75,
        sampleRate: 44100,
        channels: 1,
        bitDepth: 16
      };

      const request: SpeechAnalysisRequest = {
        audioData: mockAudioData,
        context: {
          questionType: 'behavioral',
          language: 'en',
          interviewStage: InterviewStage.BEHAVIORAL
        },
        options: {
          enableTranscription: true,
          enablePaceAnalysis: false,
          enablePauseAnalysis: false,
          enableFillerDetection: false,
          enableClarityAnalysis: false,
          enableConfidenceAnalysis: false,
          enableEmotionDetection: true,
          enableVolumeAnalysis: false,
          confidenceThreshold: 0.7,
          whisperModel: WhisperModel.BASE
        }
      };

      const result = await speechAnalysisEngine.analyzeSpeech(request);

      expect(result.emotionAnalysis.primaryEmotion).toBeDefined();
      expect(result.emotionAnalysis.emotions).toBeInstanceOf(Array);
      expect(result.emotionAnalysis.emotions.length).toBeGreaterThan(0);
      expect(result.emotionAnalysis.emotionalStability).toBeGreaterThan(0);
      expect(result.emotionAnalysis.emotionalStability).toBeLessThanOrEqual(1);
      expect(result.emotionAnalysis.emotionalRange).toBeDefined();
      expect(result.emotionAnalysis.score).toBeGreaterThanOrEqual(0);
      expect(result.emotionAnalysis.score).toBeLessThanOrEqual(1);

      // Check emotion structure
      const firstEmotion = result.emotionAnalysis.emotions[0];
      expect(firstEmotion.emotion).toBeDefined();
      expect(firstEmotion.intensity).toBeGreaterThanOrEqual(0);
      expect(firstEmotion.intensity).toBeLessThanOrEqual(1);
      expect(firstEmotion.confidence).toBeGreaterThan(0);
    });
  });
});