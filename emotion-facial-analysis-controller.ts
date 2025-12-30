/**
 * Emotion and Facial Analysis Controller
 * HTTP endpoints for emotion detection and facial expression analysis
 */

import { Request, Response } from 'express';
import multer from 'multer';
import { EmotionFacialAnalysisEngine } from '../services/emotion-facial-analysis-engine';
import { logger } from '../utils/logger';
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
  EmotionFacialAnalysisErrorCode
} from '../types/emotion-facial-analysis';

// Configure multer for video and audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for video files
  },
  fileFilter: (req, file, cb) => {
    const allowedVideoTypes = [
      'video/mp4',
      'video/webm',
      'video/avi',
      'video/mov',
      'video/mkv'
    ];
    
    const allowedAudioTypes = [
      'audio/wav',
      'audio/mpeg',
      'audio/mp3',
      'audio/flac',
      'audio/ogg',
      'audio/webm',
      'audio/m4a'
    ];
    
    if (allowedVideoTypes.includes(file.mimetype) || allowedAudioTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Supported formats: MP4, WebM, AVI, MOV, MKV for video; WAV, MP3, FLAC, OGG, WebM, M4A for audio'));
    }
  }
});

export class EmotionFacialAnalysisController {
  private emotionFacialEngine: EmotionFacialAnalysisEngine;
  public uploadMiddleware: any;

  constructor() {
    // Initialize with default configuration
    const defaultConfig: EmotionFacialConfig = {
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

    this.emotionFacialEngine = new EmotionFacialAnalysisEngine(defaultConfig);
    this.uploadMiddleware = upload.fields([
      { name: 'video', maxCount: 1 },
      { name: 'audio', maxCount: 1 }
    ]);
  }

  /**
   * Analyze emotions and facial expressions from uploaded files
   */
  public analyzeEmotionFacial = async (req: Request, res: Response): Promise<void> => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const videoFile = files?.video?.[0];
      const audioFile = files?.audio?.[0];

      if (!videoFile && !audioFile) {
        res.status(400).json({
          success: false,
          error: 'Either video or audio file is required'
        });
        return;
      }

      const { context, options } = req.body;

      // Parse context and options from form data
      const parsedContext = typeof context === 'string' ? JSON.parse(context) : context;
      const parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;

      // Process uploaded files
      const videoData = videoFile ? await this.processVideoFile(videoFile) : undefined;
      const audioData = audioFile ? await this.processAudioFile(audioFile) : undefined;

      // Set default context if not provided
      const analysisContext = {
        questionType: parsedContext?.questionType || 'behavioral',
        interviewStage: parsedContext?.interviewStage || InterviewStage.BEHAVIORAL,
        expectedDuration: parsedContext?.expectedDuration || 120,
        ...parsedContext
      };

      // Set default options if not provided
      const analysisOptions = {
        enableVoiceEmotionDetection: true,
        enableFacialExpressionAnalysis: !!videoData,
        enableMicroExpressionDetection: !!videoData,
        enableGazeTracking: !!videoData,
        enablePostureAnalysis: !!videoData,
        enableConfidenceAssessment: true,
        enableEmotionCorrelation: !!(videoData && audioData),
        confidenceThreshold: 0.7,
        faceApiModel: FaceApiModel.MEDIUM,
        emotionSensitivity: EmotionSensitivity.MEDIUM,
        ...parsedOptions
      };

      const request: EmotionFacialAnalysisRequest = {
        videoData,
        audioData,
        context: analysisContext,
        options: analysisOptions
      };

      logger.info('Processing emotion and facial analysis request', {
        hasVideo: !!videoData,
        hasAudio: !!audioData,
        videoDuration: videoData?.duration,
        audioDuration: audioData?.duration,
        questionType: analysisContext.questionType,
        interviewStage: analysisContext.interviewStage
      });

      const result = await this.emotionFacialEngine.analyzeEmotionFacial(request);

      res.json({
        success: true,
        analysis: result
      });

    } catch (error: any) {
      logger.error('Emotion and facial analysis failed', { error });

      if (error instanceof EmotionFacialAnalysisError) {
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
   * Analyze voice emotions specifically
   */
  public analyzeVoiceEmotions = async (req: Request, res: Response): Promise<void> => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const audioFile = files?.audio?.[0];

      if (!audioFile) {
        res.status(400).json({
          success: false,
          error: 'Audio file is required'
        });
        return;
      }

      const { context } = req.body;
      const parsedContext = typeof context === 'string' ? JSON.parse(context) : context;

      const audioData = await this.processAudioFile(audioFile);

      const analysisContext = {
        questionType: parsedContext?.questionType || 'behavioral',
        interviewStage: parsedContext?.interviewStage || InterviewStage.BEHAVIORAL,
        ...parsedContext
      };

      const analysisOptions = {
        enableVoiceEmotionDetection: true,
        enableFacialExpressionAnalysis: false,
        enableMicroExpressionDetection: false,
        enableGazeTracking: false,
        enablePostureAnalysis: false,
        enableConfidenceAssessment: true,
        enableEmotionCorrelation: false,
        confidenceThreshold: 0.7,
        faceApiModel: FaceApiModel.MEDIUM,
        emotionSensitivity: EmotionSensitivity.MEDIUM
      };

      const request: EmotionFacialAnalysisRequest = {
        audioData,
        context: analysisContext,
        options: analysisOptions
      };

      const result = await this.emotionFacialEngine.analyzeEmotionFacial(request);

      res.json({
        success: true,
        voiceEmotionAnalysis: result.voiceEmotionAnalysis,
        confidenceAssessment: result.confidenceAssessment,
        overallScore: result.overallScore,
        recommendations: result.recommendations
      });

    } catch (error: any) {
      logger.error('Voice emotion analysis failed', { error });

      if (error instanceof EmotionFacialAnalysisError) {
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
   * Analyze facial expressions specifically
   */
  public analyzeFacialExpressions = async (req: Request, res: Response): Promise<void> => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const videoFile = files?.video?.[0];

      if (!videoFile) {
        res.status(400).json({
          success: false,
          error: 'Video file is required'
        });
        return;
      }

      const { context } = req.body;
      const parsedContext = typeof context === 'string' ? JSON.parse(context) : context;

      const videoData = await this.processVideoFile(videoFile);

      const analysisContext = {
        questionType: parsedContext?.questionType || 'behavioral',
        interviewStage: parsedContext?.interviewStage || InterviewStage.BEHAVIORAL,
        ...parsedContext
      };

      const analysisOptions = {
        enableVoiceEmotionDetection: false,
        enableFacialExpressionAnalysis: true,
        enableMicroExpressionDetection: true,
        enableGazeTracking: true,
        enablePostureAnalysis: false,
        enableConfidenceAssessment: true,
        enableEmotionCorrelation: false,
        confidenceThreshold: 0.7,
        faceApiModel: FaceApiModel.MEDIUM,
        emotionSensitivity: EmotionSensitivity.MEDIUM
      };

      const request: EmotionFacialAnalysisRequest = {
        videoData,
        context: analysisContext,
        options: analysisOptions
      };

      const result = await this.emotionFacialEngine.analyzeEmotionFacial(request);

      res.json({
        success: true,
        facialExpressionAnalysis: result.facialExpressionAnalysis,
        microExpressionAnalysis: result.microExpressionAnalysis,
        gazeAnalysis: result.gazeAnalysis,
        confidenceAssessment: result.confidenceAssessment,
        overallScore: result.overallScore,
        recommendations: result.recommendations
      });

    } catch (error: any) {
      logger.error('Facial expression analysis failed', { error });

      if (error instanceof EmotionFacialAnalysisError) {
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
   * Analyze confidence indicators across modalities
   */
  public analyzeConfidence = async (req: Request, res: Response): Promise<void> => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const videoFile = files?.video?.[0];
      const audioFile = files?.audio?.[0];

      if (!videoFile && !audioFile) {
        res.status(400).json({
          success: false,
          error: 'Either video or audio file is required'
        });
        return;
      }

      const { context } = req.body;
      const parsedContext = typeof context === 'string' ? JSON.parse(context) : context;

      const videoData = videoFile ? await this.processVideoFile(videoFile) : undefined;
      const audioData = audioFile ? await this.processAudioFile(audioFile) : undefined;

      const analysisContext = {
        questionType: parsedContext?.questionType || 'behavioral',
        interviewStage: parsedContext?.interviewStage || InterviewStage.BEHAVIORAL,
        ...parsedContext
      };

      const analysisOptions = {
        enableVoiceEmotionDetection: !!audioData,
        enableFacialExpressionAnalysis: !!videoData,
        enableMicroExpressionDetection: !!videoData,
        enableGazeTracking: !!videoData,
        enablePostureAnalysis: !!videoData,
        enableConfidenceAssessment: true,
        enableEmotionCorrelation: !!(videoData && audioData),
        confidenceThreshold: 0.7,
        faceApiModel: FaceApiModel.MEDIUM,
        emotionSensitivity: EmotionSensitivity.MEDIUM
      };

      const request: EmotionFacialAnalysisRequest = {
        videoData,
        audioData,
        context: analysisContext,
        options: analysisOptions
      };

      const result = await this.emotionFacialEngine.analyzeEmotionFacial(request);

      res.json({
        success: true,
        confidenceAssessment: result.confidenceAssessment,
        emotionCorrelation: result.emotionCorrelation,
        overallScore: result.overallScore,
        recommendations: result.recommendations
      });

    } catch (error: any) {
      logger.error('Confidence analysis failed', { error });

      if (error instanceof EmotionFacialAnalysisError) {
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
        supportedVideoFormats: Object.values(VideoEncoding),
        supportedAudioFormats: Object.values(AudioEncoding),
        faceApiModels: Object.values(FaceApiModel),
        emotionSensitivity: Object.values(EmotionSensitivity),
        interviewStages: Object.values(InterviewStage),
        maxFileSize: '100MB',
        maxDuration: '10 minutes',
        minDuration: '5 seconds',
        minVideoResolution: '320x240',
        analysisFeatures: {
          voiceEmotionDetection: 'Emotion detection from voice characteristics and prosody',
          facialExpressionAnalysis: 'Facial expression recognition using face-api.js',
          microExpressionDetection: 'Detection of brief, involuntary facial expressions',
          gazeTracking: 'Eye contact and gaze direction analysis',
          postureAnalysis: 'Body language and posture assessment',
          confidenceAssessment: 'Multi-modal confidence level evaluation',
          emotionCorrelation: 'Cross-modal emotion consistency analysis'
        },
        emotionTypes: [
          'happiness', 'sadness', 'anger', 'fear', 'surprise', 'disgust',
          'confidence', 'nervousness', 'enthusiasm', 'calmness', 'uncertainty'
        ],
        facialExpressions: [
          'happy', 'sad', 'angry', 'fearful', 'surprised', 'disgusted',
          'confident', 'nervous', 'focused', 'confused', 'interested', 'neutral'
        ]
      };

      res.json({
        success: true,
        options
      });

    } catch (error: any) {
      logger.error('Failed to get emotion and facial analysis options', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Process uploaded video file and extract metadata
   */
  private async processVideoFile(file: Express.Multer.File): Promise<VideoData> {
    try {
      // Extract video format from MIME type
      const mimeTypeMap: Record<string, VideoEncoding> = {
        'video/mp4': VideoEncoding.MP4,
        'video/webm': VideoEncoding.WEBM,
        'video/avi': VideoEncoding.AVI,
        'video/mov': VideoEncoding.MOV,
        'video/mkv': VideoEncoding.MKV
      };

      const encoding = mimeTypeMap[file.mimetype] || VideoEncoding.MP4;
      
      // Estimate video properties (in a real implementation, use ffprobe or similar)
      const estimatedDuration = this.estimateVideoDuration(file.buffer, encoding);
      const estimatedResolution = this.estimateVideoResolution(file.buffer);

      const videoFormat: VideoFormat = {
        encoding,
        mimeType: file.mimetype,
        extension: encoding
      };

      const videoData: VideoData = {
        buffer: file.buffer,
        format: videoFormat,
        duration: estimatedDuration,
        frameRate: 30, // Default, would be extracted from actual video
        resolution: estimatedResolution,
        codec: 'h264' // Default
      };

      logger.info('Video file processed', {
        originalName: file.originalname,
        size: file.size,
        format: encoding,
        estimatedDuration: estimatedDuration,
        resolution: `${estimatedResolution.width}x${estimatedResolution.height}`
      });

      return videoData;

    } catch (error: any) {
      logger.error('Failed to process video file', { error, fileName: file.originalname });
      throw new EmotionFacialAnalysisError({
        code: EmotionFacialAnalysisErrorCode.INVALID_VIDEO_FORMAT,
        message: 'Failed to process video file',
        details: error
      });
    }
  }

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
        channels: 1 // Assume mono for speech
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
      throw new EmotionFacialAnalysisError({
        code: EmotionFacialAnalysisErrorCode.INVALID_AUDIO_FORMAT,
        message: 'Failed to process audio file',
        details: error
      });
    }
  }

  /**
   * Estimate video duration based on file size and format
   */
  private estimateVideoDuration(buffer: Buffer, encoding: VideoEncoding): number {
    // Rough estimation based on typical bitrates for video
    const bitrates: Record<VideoEncoding, number> = {
      [VideoEncoding.MP4]: 2000,  // kbps for typical MP4
      [VideoEncoding.WEBM]: 1500, // kbps for WebM
      [VideoEncoding.AVI]: 2500,  // kbps for AVI
      [VideoEncoding.MOV]: 2000,  // kbps for MOV
      [VideoEncoding.MKV]: 2000   // kbps for MKV
    };

    const bitrate = bitrates[encoding] || 2000;
    const fileSizeKb = buffer.length / 1024;
    const durationSeconds = (fileSizeKb * 8) / bitrate;

    // Clamp to reasonable bounds
    return Math.max(5, Math.min(600, durationSeconds));
  }

  /**
   * Estimate video resolution based on file size
   */
  private estimateVideoResolution(buffer: Buffer): { width: number; height: number } {
    // Simple heuristic based on file size
    const fileSizeMB = buffer.length / (1024 * 1024);
    
    if (fileSizeMB > 50) {
      return { width: 1920, height: 1080 }; // HD
    } else if (fileSizeMB > 20) {
      return { width: 1280, height: 720 };  // 720p
    } else if (fileSizeMB > 5) {
      return { width: 854, height: 480 };   // 480p
    } else {
      return { width: 640, height: 360 };   // 360p
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

  private getStatusCodeForError(code: EmotionFacialAnalysisErrorCode): number {
    switch (code) {
      case EmotionFacialAnalysisErrorCode.INVALID_VIDEO_FORMAT:
      case EmotionFacialAnalysisErrorCode.INVALID_AUDIO_FORMAT:
      case EmotionFacialAnalysisErrorCode.INSUFFICIENT_DATA:
        return 400;
      case EmotionFacialAnalysisErrorCode.POOR_VIDEO_QUALITY:
        return 422;
      case EmotionFacialAnalysisErrorCode.NO_FACE_DETECTED:
        return 422;
      case EmotionFacialAnalysisErrorCode.FACE_API_ERROR:
        return 502;
      case EmotionFacialAnalysisErrorCode.PROCESSING_FAILED:
      case EmotionFacialAnalysisErrorCode.CONFIGURATION_ERROR:
      default:
        return 500;
    }
  }
}