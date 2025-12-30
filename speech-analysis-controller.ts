/**
 * Speech Analysis Controller
 * HTTP endpoints for speech analysis functionality
 */

import { Request, Response } from 'express';
import multer from 'multer';
import { SpeechAnalysisEngine } from '../services/speech-analysis-engine';
import { logger } from '../utils/logger';
import {
  SpeechAnalysisRequest,
  SpeechAnalysisConfig,
  AudioData,
  AudioFormat,
  AudioEncoding,
  WhisperModel,
  InterviewStage,
  SpeechAnalysisError,
  SpeechAnalysisErrorCode
} from '../types/speech-analysis';

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'audio/wav',
      'audio/mpeg',
      'audio/mp3',
      'audio/flac',
      'audio/ogg',
      'audio/webm',
      'audio/m4a'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format. Supported formats: WAV, MP3, FLAC, OGG, WebM, M4A'));
    }
  }
});

export class SpeechAnalysisController {
  private speechAnalysisEngine: SpeechAnalysisEngine;
  public uploadMiddleware: any;

  constructor() {
    // Initialize with default configuration
    const defaultConfig: SpeechAnalysisConfig = {
      whisperApiKey: process.env.OPENAI_API_KEY || 'mock-api-key',
      whisperBaseUrl: 'https://api.openai.com/v1',
      enableAdvancedAnalysis: true,
      fillerWords: {
        verbal: ['um', 'uh', 'er', 'ah', 'hmm'],
        lexical: ['like', 'you know', 'basically', 'actually', 'literally', 'sort of', 'kind of'],
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

    this.speechAnalysisEngine = new SpeechAnalysisEngine(defaultConfig);
    this.uploadMiddleware = upload.single('audio');
  }

  /**
   * Analyze speech from uploaded audio file
   */
  public analyzeSpeech = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'Audio file is required'
        });
        return;
      }

      const { context, options } = req.body;

      // Parse context and options from form data
      const parsedContext = typeof context === 'string' ? JSON.parse(context) : context;
      const parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;

      // Extract audio metadata
      const audioData = await this.processAudioFile(req.file);

      // Set default context if not provided
      const analysisContext = {
        questionType: parsedContext?.questionType || 'behavioral',
        expectedDuration: parsedContext?.expectedDuration || 120,
        language: parsedContext?.language || 'en',
        interviewStage: parsedContext?.interviewStage || InterviewStage.BEHAVIORAL,
        ...parsedContext
      };

      // Set default options if not provided
      const analysisOptions = {
        enableTranscription: true,
        enablePaceAnalysis: true,
        enablePauseAnalysis: true,
        enableFillerDetection: true,
        enableClarityAnalysis: true,
        enableConfidenceAnalysis: true,
        enableEmotionDetection: true,
        enableVolumeAnalysis: true,
        confidenceThreshold: 0.7,
        whisperModel: WhisperModel.BASE,
        ...parsedOptions
      };

      const request: SpeechAnalysisRequest = {
        audioData,
        context: analysisContext,
        options: analysisOptions
      };

      logger.info('Processing speech analysis request', {
        audioDuration: audioData.duration,
        audioFormat: audioData.format.encoding,
        questionType: analysisContext.questionType,
        language: analysisContext.language
      });

      const result = await this.speechAnalysisEngine.analyzeSpeech(request);

      res.json({
        success: true,
        analysis: result
      });

    } catch (error: any) {
      logger.error('Speech analysis failed', { error });

      if (error instanceof SpeechAnalysisError) {
        const statusCode = this.getStatusCodeForError(error.code);
        res.status(statusCode).json({
          success: false,
          error: error.message,
          code: error.code
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  };

  /**
   * Analyze speech pace specifically
   */
  public analyzePace = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'Audio file is required'
        });
        return;
      }

      const { context } = req.body;
      const parsedContext = typeof context === 'string' ? JSON.parse(context) : context;

      const audioData = await this.processAudioFile(req.file);

      const analysisContext = {
        questionType: parsedContext?.questionType || 'behavioral',
        language: parsedContext?.language || 'en',
        ...parsedContext
      };

      const analysisOptions = {
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
      };

      const request: SpeechAnalysisRequest = {
        audioData,
        context: analysisContext,
        options: analysisOptions
      };

      const result = await this.speechAnalysisEngine.analyzeSpeech(request);

      res.json({
        success: true,
        paceAnalysis: result.paceAnalysis,
        transcription: result.transcription,
        overallScore: result.overallScore,
        recommendations: result.recommendations
      });

    } catch (error: any) {
      logger.error('Pace analysis failed', { error });

      if (error instanceof SpeechAnalysisError) {
        const statusCode = this.getStatusCodeForError(error.code);
        res.status(statusCode).json({
          success: false,
          error: error.message,
          code: error.code
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  };

  /**
   * Analyze filler words specifically
   */
  public analyzeFillers = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'Audio file is required'
        });
        return;
      }

      const { context } = req.body;
      const parsedContext = typeof context === 'string' ? JSON.parse(context) : context;

      const audioData = await this.processAudioFile(req.file);

      const analysisContext = {
        questionType: parsedContext?.questionType || 'behavioral',
        language: parsedContext?.language || 'en',
        ...parsedContext
      };

      const analysisOptions = {
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
      };

      const request: SpeechAnalysisRequest = {
        audioData,
        context: analysisContext,
        options: analysisOptions
      };

      const result = await this.speechAnalysisEngine.analyzeSpeech(request);

      res.json({
        success: true,
        fillerAnalysis: result.fillerAnalysis,
        pauseAnalysis: result.pauseAnalysis,
        transcription: result.transcription,
        overallScore: result.overallScore,
        recommendations: result.recommendations
      });

    } catch (error: any) {
      logger.error('Filler analysis failed', { error });

      if (error instanceof SpeechAnalysisError) {
        const statusCode = this.getStatusCodeForError(error.code);
        res.status(statusCode).json({
          success: false,
          error: error.message,
          code: error.code
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  };

  /**
   * Analyze confidence indicators specifically
   */
  public analyzeConfidence = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'Audio file is required'
        });
        return;
      }

      const { context } = req.body;
      const parsedContext = typeof context === 'string' ? JSON.parse(context) : context;

      const audioData = await this.processAudioFile(req.file);

      const analysisContext = {
        questionType: parsedContext?.questionType || 'behavioral',
        language: parsedContext?.language || 'en',
        ...parsedContext
      };

      const analysisOptions = {
        enableTranscription: true,
        enablePaceAnalysis: true,
        enablePauseAnalysis: true,
        enableFillerDetection: true,
        enableClarityAnalysis: true,
        enableConfidenceAnalysis: true,
        enableEmotionDetection: true,
        enableVolumeAnalysis: false,
        confidenceThreshold: 0.7,
        whisperModel: WhisperModel.BASE
      };

      const request: SpeechAnalysisRequest = {
        audioData,
        context: analysisContext,
        options: analysisOptions
      };

      const result = await this.speechAnalysisEngine.analyzeSpeech(request);

      res.json({
        success: true,
        confidenceAnalysis: result.confidenceAnalysis,
        emotionAnalysis: result.emotionAnalysis,
        clarityAnalysis: result.clarityAnalysis,
        transcription: result.transcription,
        overallScore: result.overallScore,
        recommendations: result.recommendations
      });

    } catch (error: any) {
      logger.error('Confidence analysis failed', { error });

      if (error instanceof SpeechAnalysisError) {
        const statusCode = this.getStatusCodeForError(error.code);
        res.status(statusCode).json({
          success: false,
          error: error.message,
          code: error.code
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  };

  /**
   * Get available analysis options and configurations
   */
  public getAnalysisOptions = async (req: Request, res: Response): Promise<void> => {
    try {
      const options = {
        supportedAudioFormats: Object.values(AudioEncoding),
        whisperModels: Object.values(WhisperModel),
        interviewStages: Object.values(InterviewStage),
        maxFileSize: '50MB',
        maxDuration: '10 minutes',
        minDuration: '5 seconds',
        analysisFeatures: {
          transcription: 'Speech-to-text conversion using Whisper API',
          paceAnalysis: 'Speaking rate, rhythm, and timing analysis',
          pauseAnalysis: 'Strategic pauses, hesitations, and silence patterns',
          fillerDetection: 'Identification of filler words and verbal hesitations',
          clarityAnalysis: 'Speech clarity, articulation, and pronunciation',
          confidenceAnalysis: 'Vocal confidence indicators and linguistic patterns',
          emotionDetection: 'Emotional tone and stability analysis',
          volumeAnalysis: 'Volume consistency and vocal dynamics'
        },
        defaultThresholds: {
          optimalPace: '150-190 words per minute',
          maxFillerPercentage: '5%',
          minClarityScore: '70%',
          minConfidenceScore: '60%'
        }
      };

      res.json({
        success: true,
        options
      });

    } catch (error: any) {
      logger.error('Failed to get speech analysis options', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Process uploaded audio file and extract metadata
   */
  private async processAudioFile(file: Express.Multer.File): Promise<AudioData> {
    try {
      // Extract audio format from MIME type
      const mimeTypeMap: Record<string, AudioEncoding> = {
        'audio/wav': AudioEncoding.WAV,
        'audio/mpeg': AudioEncoding.MP3,
        'audio/mp3': AudioEncoding.MP3,
        'audio/flac': AudioEncoding.FLAC,
        'audio/ogg': AudioEncoding.OGG,
        'audio/webm': AudioEncoding.WEBM,
        'audio/m4a': AudioEncoding.M4A
      };

      const encoding = mimeTypeMap[file.mimetype] || AudioEncoding.WAV;
      
      // Estimate duration based on file size (rough approximation)
      // In a real implementation, you would use an audio library to get exact metadata
      const estimatedDuration = this.estimateAudioDuration(file.buffer, encoding);

      const audioFormat: AudioFormat = {
        encoding,
        mimeType: file.mimetype,
        extension: encoding
      };

      const audioData: AudioData = {
        buffer: file.buffer,
        format: audioFormat,
        duration: estimatedDuration,
        sampleRate: 44100, // Default, would be extracted from actual audio
        channels: 1, // Assume mono for speech
        bitDepth: 16 // Default
      };

      logger.info('Audio file processed', {
        originalName: file.originalname,
        size: file.size,
        format: encoding,
        estimatedDuration: estimatedDuration
      });

      return audioData;

    } catch (error: any) {
      logger.error('Failed to process audio file', { error, fileName: file.originalname });
      throw new SpeechAnalysisError({
        code: SpeechAnalysisErrorCode.INVALID_AUDIO_FORMAT,
        message: 'Failed to process audio file',
        details: error
      });
    }
  }

  /**
   * Estimate audio duration based on file size and format
   */
  private estimateAudioDuration(buffer: Buffer, encoding: AudioEncoding): number {
    // Rough estimation based on typical bitrates
    const bitrates: Record<AudioEncoding, number> = {
      [AudioEncoding.WAV]: 1411, // kbps for 44.1kHz 16-bit stereo
      [AudioEncoding.MP3]: 128,  // typical MP3 bitrate
      [AudioEncoding.FLAC]: 800, // typical FLAC bitrate
      [AudioEncoding.OGG]: 128,  // typical OGG bitrate
      [AudioEncoding.WEBM]: 128, // typical WebM audio bitrate
      [AudioEncoding.M4A]: 128   // typical M4A bitrate
    };

    const bitrate = bitrates[encoding] || 128;
    const fileSizeKb = buffer.length / 1024;
    const durationSeconds = (fileSizeKb * 8) / bitrate;

    // Clamp to reasonable bounds
    return Math.max(5, Math.min(600, durationSeconds));
  }

  private getStatusCodeForError(code: SpeechAnalysisErrorCode): number {
    switch (code) {
      case SpeechAnalysisErrorCode.INVALID_AUDIO_FORMAT:
        return 400;
      case SpeechAnalysisErrorCode.AUDIO_TOO_SHORT:
      case SpeechAnalysisErrorCode.AUDIO_TOO_LONG:
        return 400;
      case SpeechAnalysisErrorCode.INSUFFICIENT_AUDIO_QUALITY:
        return 422;
      case SpeechAnalysisErrorCode.WHISPER_API_ERROR:
        return 502;
      case SpeechAnalysisErrorCode.TRANSCRIPTION_FAILED:
      case SpeechAnalysisErrorCode.PROCESSING_FAILED:
      case SpeechAnalysisErrorCode.CONFIGURATION_ERROR:
      default:
        return 500;
    }
  }
}