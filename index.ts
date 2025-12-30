/**
 * Real-time Communication Service
 * WebRTC signaling server for AI Mock Interview Platform
 */

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { SignalingServer } from './services/signaling-server';
import { STUNTURNService, STUNTURNServiceConfig } from './services/stun-turn-config';
import { MediaStreamingService, MediaStreamingServiceConfig } from './services/media-streaming-service';
import { MediaProcessingPipelineService, ProcessingPipelineConfig } from './services/media-processing-pipeline';
import { createMediaRoutes } from './routes/media-routes';
import { logger } from './utils/logger';
import { SignalingServerConfig } from './types/webrtc';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '3004');
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// STUN/TURN configuration
const stunTurnConfig: STUNTURNServiceConfig = {
  stunServers: [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302'
  ],
  turnServers: [
    // Add your TURN servers here
    // {
    //   url: 'turn:your-turn-server.com:3478',
    //   username: 'username',
    //   credential: 'password'
    // }
  ],
  enableIPv6: false,
  credentialTTL: 3600 // 1 hour
};

// Signaling server configuration
const signalingConfig: SignalingServerConfig = {
  port: PORT,
  corsOrigins: corsOptions.origin as string[],
  stunTurnConfig: { iceServers: [] }, // Will be populated by STUNTURNService
  maxSessionDuration: 4 * 60 * 60 * 1000, // 4 hours
  heartbeatInterval: 30 * 1000, // 30 seconds
  connectionTimeout: 2 * 60 * 1000 // 2 minutes
};

// Media streaming service configuration
const mediaStreamingConfig: MediaStreamingServiceConfig = {
  recordingPath: path.join(process.cwd(), 'recordings'),
  maxRecordingDuration: 4 * 60 * 60 * 1000, // 4 hours
  maxFileSize: 1024 * 1024 * 1024, // 1GB
  chunkDuration: 10 * 1000, // 10 seconds
  enableQualityMonitoring: true,
  qualityCheckInterval: 5 * 1000 // 5 seconds
};

// Processing pipeline configuration
const processingConfig: ProcessingPipelineConfig = {
  enableRealTimeProcessing: true,
  processingInterval: 1000, // 1 second
  maxConcurrentProcessors: 10,
  audioAnalysisEnabled: true,
  videoAnalysisEnabled: true,
  speechToTextEnabled: true,
  emotionDetectionEnabled: true
};

class RealtimeService {
  private app: express.Application;
  private server: any;
  private signalingServer: SignalingServer;
  private stunTurnService: STUNTURNService;
  private mediaStreamingService: MediaStreamingService;
  private processingPipelineService: MediaProcessingPipelineService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    
    // Initialize services
    this.stunTurnService = new STUNTURNService(stunTurnConfig);
    this.mediaStreamingService = new MediaStreamingService(mediaStreamingConfig);
    this.processingPipelineService = new MediaProcessingPipelineService(processingConfig);
    
    this.initializeSignalingConfig();
    this.signalingServer = new SignalingServer(this.server, signalingConfig);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private async initializeSignalingConfig(): Promise<void> {
    try {
      const iceConfig = await this.stunTurnService.getICEServerConfig();
      signalingConfig.stunTurnConfig = iceConfig;
      
      logger.info('ICE server configuration initialized', {
        serverCount: iceConfig.iceServers.length
      });
    } catch (error) {
      logger.error('Failed to initialize ICE server configuration', { error });
    }
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false // Disable for WebRTC
    }));
    
    // CORS
    this.app.use(cors(corsOptions));
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'realtime-communication',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        stats: {
          activeSessions: this.signalingServer.getActiveSessionsCount(),
          connectedUsers: this.signalingServer.getConnectedUsersCount(),
          stunTurnStats: this.stunTurnService.getStats(),
          mediaStats: this.mediaStreamingService.getStats(),
          processingStats: this.processingPipelineService.getStats()
        }
      });
    });

    // Get ICE server configuration
    this.app.get('/api/ice-config', async (req, res) => {
      try {
        const userId = req.query.userId as string;
        const config = await this.stunTurnService.getICEServerConfig(userId);
        
        res.json({
          success: true,
          config
        });
      } catch (error) {
        logger.error('Failed to get ICE config', { error });
        res.status(500).json({
          success: false,
          error: 'Failed to get ICE configuration'
        });
      }
    });

    // Media streaming and processing routes
    this.app.use('/api/media', createMediaRoutes(
      this.mediaStreamingService,
      this.processingPipelineService
    ));

    // Get session information
    this.app.get('/api/sessions/:sessionId', (req, res) => {
      try {
        const { sessionId } = req.params;
        const session = this.signalingServer.getSessionInfo(sessionId);
        
        if (!session) {
          return res.status(404).json({
            success: false,
            error: 'Session not found'
          });
        }

        res.json({
          success: true,
          session: {
            id: session.id,
            status: session.status,
            participantCount: session.participants.size,
            createdAt: session.createdAt,
            recordingActive: session.recordingActive
          }
        });
      } catch (error) {
        logger.error('Failed to get session info', { error });
        res.status(500).json({
          success: false,
          error: 'Failed to get session information'
        });
      }
    });

    // Test STUN/TURN connectivity
    this.app.post('/api/test-connectivity', async (req, res) => {
      try {
        const results = await this.stunTurnService.testConnectivity();
        
        res.json({
          success: true,
          results
        });
      } catch (error) {
        logger.error('Connectivity test failed', { error });
        res.status(500).json({
          success: false,
          error: 'Connectivity test failed'
        });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found'
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
      });

      res.status(500).json({
        success: false,
        error: NODE_ENV === 'production' ? 'Internal server error' : error.message
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection', { reason, promise });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error });
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });
  }

  public async start(): Promise<void> {
    try {
      // Start periodic cleanup
      setInterval(() => {
        this.stunTurnService.cleanupExpiredCredentials();
      }, 5 * 60 * 1000); // Every 5 minutes

      this.server.listen(PORT, () => {
        logger.info('Real-time Communication Service started', {
          port: PORT,
          environment: NODE_ENV,
          corsOrigins: corsOptions.origin
        });
      });

    } catch (error) {
      logger.error('Failed to start service', { error });
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down Real-time Communication Service');
      
      // Shutdown media services
      await this.mediaStreamingService.cleanup();
      await this.processingPipelineService.cleanup();
      
      // Shutdown signaling server
      await this.signalingServer.shutdown();
      
      // Close HTTP server
      this.server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);

    } catch (error) {
      logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  }
}

// Start the service
const service = new RealtimeService();
service.start().catch((error) => {
  logger.error('Failed to start Real-time Communication Service', { error });
  process.exit(1);
});

export default service;