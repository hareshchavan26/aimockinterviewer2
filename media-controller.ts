/**
 * Media Controller
 * HTTP endpoints for media streaming and processing
 */

import { Request, Response } from 'express';
import { MediaStreamingService } from '../services/media-streaming-service';
import { MediaProcessingPipelineService } from '../services/media-processing-pipeline';
import { logger } from '../utils/logger';
import {
  MediaStreamType,
  MediaStreamConfig,
  ProcessorType,
  MediaErrorCode,
  MediaStreamingError
} from '../types/media';

export class MediaController {
  constructor(
    private mediaStreamingService: MediaStreamingService,
    private processingPipelineService: MediaProcessingPipelineService
  ) {}

  /**
   * Create a new media stream
   */
  public createStream = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, sessionId, type, config } = req.body;

      // Validate required fields
      if (!userId || !sessionId || !type || !config) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, sessionId, type, config'
        });
        return;
      }

      // Validate stream type
      if (!Object.values(MediaStreamType).includes(type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid stream type'
        });
        return;
      }

      const streamInfo = await this.mediaStreamingService.createMediaStream(
        userId,
        sessionId,
        type as MediaStreamType,
        config as MediaStreamConfig
      );

      logger.info('Media stream created via API', {
        streamId: streamInfo.id,
        userId,
        sessionId,
        type
      });

      res.json({
        success: true,
        stream: streamInfo
      });

    } catch (error) {
      logger.error('Failed to create media stream', { error });
      
      if (error instanceof MediaStreamingError) {
        res.status(400).json({
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
   * Get stream information
   */
  public getStream = async (req: Request, res: Response): Promise<void> => {
    try {
      const { streamId } = req.params;

      const streamInfo = this.mediaStreamingService.getStreamInfo(streamId);
      
      if (!streamInfo) {
        res.status(404).json({
          success: false,
          error: 'Stream not found'
        });
        return;
      }

      res.json({
        success: true,
        stream: streamInfo
      });

    } catch (error) {
      logger.error('Failed to get stream info', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Get all active streams
   */
  public getActiveStreams = async (req: Request, res: Response): Promise<void> => {
    try {
      const streams = this.mediaStreamingService.getActiveStreams();

      res.json({
        success: true,
        streams,
        count: streams.length
      });

    } catch (error) {
      logger.error('Failed to get active streams', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Update stream quality metrics
   */
  public updateQualityMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { streamId } = req.params;
      const { metrics } = req.body;

      if (!metrics) {
        res.status(400).json({
          success: false,
          error: 'Missing quality metrics'
        });
        return;
      }

      this.mediaStreamingService.updateQualityMetrics(streamId, metrics);

      res.json({
        success: true,
        message: 'Quality metrics updated'
      });

    } catch (error) {
      logger.error('Failed to update quality metrics', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Stop and cleanup a stream
   */
  public stopStream = async (req: Request, res: Response): Promise<void> => {
    try {
      const { streamId } = req.params;

      await this.mediaStreamingService.cleanupStream(streamId);

      res.json({
        success: true,
        message: 'Stream stopped and cleaned up'
      });

    } catch (error) {
      logger.error('Failed to stop stream', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Create a processing pipeline
   */
  public createPipeline = async (req: Request, res: Response): Promise<void> => {
    try {
      const { streamId, processors } = req.body;

      if (!streamId || !processors || !Array.isArray(processors)) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: streamId, processors (array)'
        });
        return;
      }

      // Validate processor configurations
      for (const processor of processors) {
        if (!processor.type || !Object.values(ProcessorType).includes(processor.type)) {
          res.status(400).json({
            success: false,
            error: 'Invalid processor type'
          });
          return;
        }
      }

      const pipeline = await this.processingPipelineService.createPipeline(
        streamId,
        processors
      );

      logger.info('Processing pipeline created via API', {
        pipelineId: pipeline.id,
        streamId,
        processorCount: processors.length
      });

      res.json({
        success: true,
        pipeline
      });

    } catch (error) {
      logger.error('Failed to create processing pipeline', { error });
      
      if (error instanceof MediaStreamingError) {
        res.status(400).json({
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
   * Start processing for a pipeline
   */
  public startProcessing = async (req: Request, res: Response): Promise<void> => {
    try {
      const { pipelineId } = req.params;

      await this.processingPipelineService.startProcessing(pipelineId);

      res.json({
        success: true,
        message: 'Processing started'
      });

    } catch (error) {
      logger.error('Failed to start processing', { error });
      
      if (error instanceof MediaStreamingError) {
        res.status(400).json({
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
   * Stop processing for a pipeline
   */
  public stopProcessing = async (req: Request, res: Response): Promise<void> => {
    try {
      const { pipelineId } = req.params;

      await this.processingPipelineService.stopProcessing(pipelineId);

      res.json({
        success: true,
        message: 'Processing stopped'
      });

    } catch (error) {
      logger.error('Failed to stop processing', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Get pipeline information
   */
  public getPipeline = async (req: Request, res: Response): Promise<void> => {
    try {
      const { pipelineId } = req.params;

      const pipeline = this.processingPipelineService.getPipelineInfo(pipelineId);
      
      if (!pipeline) {
        res.status(404).json({
          success: false,
          error: 'Pipeline not found'
        });
        return;
      }

      res.json({
        success: true,
        pipeline
      });

    } catch (error) {
      logger.error('Failed to get pipeline info', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Get all active pipelines
   */
  public getActivePipelines = async (req: Request, res: Response): Promise<void> => {
    try {
      const pipelines = this.processingPipelineService.getActivePipelines();

      res.json({
        success: true,
        pipelines,
        count: pipelines.length
      });

    } catch (error) {
      logger.error('Failed to get active pipelines', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Process media data through a pipeline
   */
  public processMediaData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { pipelineId } = req.params;
      const { mediaData, timestamp } = req.body;

      if (!mediaData || !timestamp) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: mediaData, timestamp'
        });
        return;
      }

      const results = await this.processingPipelineService.processMediaData(
        pipelineId,
        mediaData,
        timestamp
      );

      res.json({
        success: true,
        results,
        count: results.length
      });

    } catch (error) {
      logger.error('Failed to process media data', { error });
      
      if (error instanceof MediaStreamingError) {
        res.status(400).json({
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
   * Queue media data for processing
   */
  public queueMediaData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { pipelineId } = req.params;
      const { mediaData, timestamp } = req.body;

      if (!mediaData || !timestamp) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: mediaData, timestamp'
        });
        return;
      }

      this.processingPipelineService.queueMediaData(pipelineId, mediaData, timestamp);

      res.json({
        success: true,
        message: 'Media data queued for processing'
      });

    } catch (error) {
      logger.error('Failed to queue media data', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Get service statistics
   */
  public getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const streamingStats = this.mediaStreamingService.getStats();
      const processingStats = this.processingPipelineService.getStats();

      res.json({
        success: true,
        stats: {
          streaming: streamingStats,
          processing: processingStats,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to get service stats', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Cleanup pipeline
   */
  public cleanupPipeline = async (req: Request, res: Response): Promise<void> => {
    try {
      const { pipelineId } = req.params;

      await this.processingPipelineService.cleanupPipeline(pipelineId);

      res.json({
        success: true,
        message: 'Pipeline cleaned up'
      });

    } catch (error) {
      logger.error('Failed to cleanup pipeline', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}