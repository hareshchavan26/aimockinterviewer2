/**
 * Media Streaming Service
 * Handles audio/video capture, streaming, and recording
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import {
  MediaStreamConfig,
  MediaStreamInfo,
  MediaStreamType,
  MediaStreamStatus,
  MediaMetadata,
  AudioTrackInfo,
  VideoTrackInfo,
  RecordingChunk,
  QualityMetrics,
  MediaStreamingError,
  MediaErrorCode
} from '../types/media';

export interface MediaStreamingServiceConfig {
  recordingPath: string;
  maxRecordingDuration: number;
  maxFileSize: number;
  chunkDuration: number;
  enableQualityMonitoring: boolean;
  qualityCheckInterval: number;
}

export class MediaStreamingService extends EventEmitter {
  private streams: Map<string, MediaStreamInfo> = new Map();
  private mediaRecorders: Map<string, MediaRecorder> = new Map();
  private recordingChunks: Map<string, Blob[]> = new Map();
  private qualityMonitors: Map<string, NodeJS.Timeout> = new Map();
  private config: MediaStreamingServiceConfig;

  constructor(config: MediaStreamingServiceConfig) {
    super();
    this.config = config;
    this.ensureRecordingDirectory();
    
    logger.info('Media Streaming Service initialized', {
      recordingPath: config.recordingPath,
      maxDuration: config.maxRecordingDuration,
      maxFileSize: config.maxFileSize
    });
  }

  /**
   * Create a new media stream
   */
  public async createMediaStream(
    userId: string,
    sessionId: string,
    type: MediaStreamType,
    config: MediaStreamConfig
  ): Promise<MediaStreamInfo> {
    try {
      const streamId = uuidv4();
      
      logger.info('Creating media stream', {
        streamId,
        userId,
        sessionId,
        type
      });

      const streamInfo: MediaStreamInfo = {
        id: streamId,
        userId,
        sessionId,
        type,
        status: MediaStreamStatus.INITIALIZING,
        config,
        startedAt: new Date(),
        metadata: {
          audioTracks: [],
          videoTracks: [],
          recordingChunks: [],
          qualityMetrics: this.getInitialQualityMetrics()
        }
      };

      this.streams.set(streamId, streamInfo);
      
      // Start quality monitoring if enabled
      if (this.config.enableQualityMonitoring) {
        this.startQualityMonitoring(streamId);
      }

      this.emit('streamCreated', { streamId, streamInfo });
      return streamInfo;

    } catch (error) {
      logger.error('Failed to create media stream', { userId, sessionId, type, error });
      throw new MediaStreamingError({
        code: MediaErrorCode.PROCESSING_FAILED,
        message: 'Failed to create media stream',
        details: error
      });
    }
  }

  /**
   * Start recording a media stream
   */
  public async startRecording(
    streamId: string,
    mediaStream: MediaStream
  ): Promise<void> {
    try {
      const streamInfo = this.streams.get(streamId);
      if (!streamInfo) {
        throw new MediaStreamingError({
          code: MediaErrorCode.STREAM_NOT_FOUND,
          message: 'Stream not found',
          streamId
        });
      }

      logger.info('Starting recording', { streamId });

      // Validate recording configuration
      if (!streamInfo.config.recording.enabled) {
        throw new MediaStreamingError({
          code: MediaErrorCode.INVALID_CONFIGURATION,
          message: 'Recording not enabled for this stream',
          streamId
        });
      }

      // Create MediaRecorder
      const options = this.getRecorderOptions(streamInfo.config);
      const mediaRecorder = new MediaRecorder(mediaStream, options);
      
      // Set up recording event handlers
      this.setupRecorderHandlers(mediaRecorder, streamId);
      
      // Initialize recording chunks
      this.recordingChunks.set(streamId, []);
      this.mediaRecorders.set(streamId, mediaRecorder);

      // Update stream metadata
      streamInfo.metadata.audioTracks = this.extractAudioTrackInfo(mediaStream);
      streamInfo.metadata.videoTracks = this.extractVideoTrackInfo(mediaStream);
      streamInfo.status = MediaStreamStatus.ACTIVE;

      // Start recording
      mediaRecorder.start(streamInfo.config.recording.chunkSize);

      this.emit('recordingStarted', { streamId, streamInfo });
      
      logger.info('Recording started successfully', { streamId });

    } catch (error) {
      logger.error('Failed to start recording', { streamId, error });
      throw error;
    }
  }

  /**
   * Stop recording a media stream
   */
  public async stopRecording(streamId: string): Promise<string> {
    try {
      const mediaRecorder = this.mediaRecorders.get(streamId);
      const streamInfo = this.streams.get(streamId);

      if (!mediaRecorder || !streamInfo) {
        throw new MediaStreamingError({
          code: MediaErrorCode.STREAM_NOT_FOUND,
          message: 'Stream or recorder not found',
          streamId
        });
      }

      logger.info('Stopping recording', { streamId });

      return new Promise((resolve, reject) => {
        mediaRecorder.onstop = async () => {
          try {
            const filePath = await this.saveRecording(streamId);
            
            // Update stream info
            streamInfo.status = MediaStreamStatus.STOPPED;
            streamInfo.endedAt = new Date();
            streamInfo.duration = streamInfo.endedAt.getTime() - streamInfo.startedAt.getTime();
            streamInfo.filePath = filePath;

            // Cleanup
            this.mediaRecorders.delete(streamId);
            this.recordingChunks.delete(streamId);
            this.stopQualityMonitoring(streamId);

            this.emit('recordingStopped', { streamId, filePath, streamInfo });
            
            logger.info('Recording stopped successfully', { streamId, filePath });
            resolve(filePath);

          } catch (error) {
            logger.error('Failed to save recording', { streamId, error });
            reject(error);
          }
        };

        mediaRecorder.stop();
      });

    } catch (error) {
      logger.error('Failed to stop recording', { streamId, error });
      throw error;
    }
  }

  /**
   * Pause recording
   */
  public pauseRecording(streamId: string): void {
    const mediaRecorder = this.mediaRecorders.get(streamId);
    const streamInfo = this.streams.get(streamId);

    if (!mediaRecorder || !streamInfo) {
      throw new MediaStreamingError({
        code: MediaErrorCode.STREAM_NOT_FOUND,
        message: 'Stream or recorder not found',
        streamId
      });
    }

    if (mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      streamInfo.status = MediaStreamStatus.PAUSED;
      
      this.emit('recordingPaused', { streamId });
      logger.info('Recording paused', { streamId });
    }
  }

  /**
   * Resume recording
   */
  public resumeRecording(streamId: string): void {
    const mediaRecorder = this.mediaRecorders.get(streamId);
    const streamInfo = this.streams.get(streamId);

    if (!mediaRecorder || !streamInfo) {
      throw new MediaStreamingError({
        code: MediaErrorCode.STREAM_NOT_FOUND,
        message: 'Stream or recorder not found',
        streamId
      });
    }

    if (mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      streamInfo.status = MediaStreamStatus.ACTIVE;
      
      this.emit('recordingResumed', { streamId });
      logger.info('Recording resumed', { streamId });
    }
  }

  /**
   * Get stream information
   */
  public getStreamInfo(streamId: string): MediaStreamInfo | undefined {
    return this.streams.get(streamId);
  }

  /**
   * Get all active streams
   */
  public getActiveStreams(): MediaStreamInfo[] {
    return Array.from(this.streams.values()).filter(
      stream => stream.status === MediaStreamStatus.ACTIVE
    );
  }

  /**
   * Update quality metrics for a stream
   */
  public updateQualityMetrics(streamId: string, metrics: Partial<QualityMetrics>): void {
    const streamInfo = this.streams.get(streamId);
    if (!streamInfo) {
      return;
    }

    streamInfo.metadata.qualityMetrics = {
      ...streamInfo.metadata.qualityMetrics,
      ...metrics
    };

    this.emit('qualityUpdated', { streamId, metrics: streamInfo.metadata.qualityMetrics });
  }

  /**
   * Clean up a stream
   */
  public async cleanupStream(streamId: string): Promise<void> {
    try {
      logger.info('Cleaning up stream', { streamId });

      // Stop recording if active
      const mediaRecorder = this.mediaRecorders.get(streamId);
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        await this.stopRecording(streamId);
      }

      // Stop quality monitoring
      this.stopQualityMonitoring(streamId);

      // Remove from maps
      this.streams.delete(streamId);
      this.mediaRecorders.delete(streamId);
      this.recordingChunks.delete(streamId);

      this.emit('streamCleaned', { streamId });
      
    } catch (error) {
      logger.error('Failed to cleanup stream', { streamId, error });
    }
  }

  /**
   * Get service statistics
   */
  public getStats(): {
    activeStreams: number;
    totalStreams: number;
    activeRecordings: number;
    totalRecordingSize: number;
  } {
    const activeStreams = this.getActiveStreams().length;
    const totalStreams = this.streams.size;
    const activeRecordings = this.mediaRecorders.size;
    
    // Calculate total recording size (simplified)
    let totalRecordingSize = 0;
    for (const streamInfo of this.streams.values()) {
      if (streamInfo.fileSize) {
        totalRecordingSize += streamInfo.fileSize;
      }
    }

    return {
      activeStreams,
      totalStreams,
      activeRecordings,
      totalRecordingSize
    };
  }

  // Private helper methods

  private async ensureRecordingDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.recordingPath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create recording directory', {
        path: this.config.recordingPath,
        error
      });
    }
  }

  private getRecorderOptions(config: MediaStreamConfig): MediaRecorderOptions {
    const mimeType = config.recording.format === 'mp4' 
      ? 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
      : 'video/webm; codecs="vp9, opus"';

    return {
      mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
      audioBitsPerSecond: config.recording.audioBitrate,
      videoBitsPerSecond: config.recording.videoBitrate
    };
  }

  private setupRecorderHandlers(mediaRecorder: MediaRecorder, streamId: string): void {
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        const chunks = this.recordingChunks.get(streamId) || [];
        chunks.push(event.data);
        this.recordingChunks.set(streamId, chunks);

        // Create recording chunk metadata
        const streamInfo = this.streams.get(streamId);
        if (streamInfo) {
          const chunk: RecordingChunk = {
            id: uuidv4(),
            startTime: Date.now(),
            endTime: Date.now(),
            size: event.data.size,
            type: event.data.type
          };
          streamInfo.metadata.recordingChunks.push(chunk);
        }

        this.emit('recordingChunk', { streamId, chunk: event.data });
      }
    };

    mediaRecorder.onerror = (event) => {
      logger.error('MediaRecorder error', { streamId, error: event });
      this.emit('recordingError', { streamId, error: event });
    };
  }

  private async saveRecording(streamId: string): Promise<string> {
    const chunks = this.recordingChunks.get(streamId);
    const streamInfo = this.streams.get(streamId);

    if (!chunks || !streamInfo) {
      throw new Error('No recording data found');
    }

    // Create blob from chunks
    const blob = new Blob(chunks, { type: chunks[0]?.type || 'video/webm' });
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = streamInfo.config.recording.format;
    const filename = `${streamInfo.sessionId}_${streamInfo.userId}_${timestamp}.${extension}`;
    const filePath = path.join(this.config.recordingPath, filename);

    // Save file (Note: In a real browser environment, you'd use different APIs)
    // This is a simplified version for the server-side implementation
    const buffer = Buffer.from(await blob.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Update stream info
    streamInfo.fileSize = buffer.length;

    logger.info('Recording saved', {
      streamId,
      filePath,
      fileSize: streamInfo.fileSize
    });

    return filePath;
  }

  private extractAudioTrackInfo(mediaStream: MediaStream): AudioTrackInfo[] {
    return mediaStream.getAudioTracks().map(track => ({
      id: track.id,
      kind: 'audio' as const,
      label: track.label,
      enabled: track.enabled,
      muted: track.muted,
      settings: track.getSettings()
    }));
  }

  private extractVideoTrackInfo(mediaStream: MediaStream): VideoTrackInfo[] {
    return mediaStream.getVideoTracks().map(track => ({
      id: track.id,
      kind: 'video' as const,
      label: track.label,
      enabled: track.enabled,
      muted: track.muted,
      settings: track.getSettings()
    }));
  }

  private getInitialQualityMetrics(): QualityMetrics {
    return {
      audioLevel: 0,
      videoQuality: 0,
      networkQuality: 1,
      frameRate: 0,
      bitrate: 0,
      packetLoss: 0,
      jitter: 0,
      roundTripTime: 0
    };
  }

  private startQualityMonitoring(streamId: string): void {
    const interval = setInterval(() => {
      this.checkStreamQuality(streamId);
    }, this.config.qualityCheckInterval);

    this.qualityMonitors.set(streamId, interval);
  }

  private stopQualityMonitoring(streamId: string): void {
    const interval = this.qualityMonitors.get(streamId);
    if (interval) {
      clearInterval(interval);
      this.qualityMonitors.delete(streamId);
    }
  }

  private checkStreamQuality(streamId: string): void {
    // This would typically analyze the actual stream quality
    // For now, we'll emit a placeholder event
    const streamInfo = this.streams.get(streamId);
    if (streamInfo) {
      this.emit('qualityCheck', { streamId, metrics: streamInfo.metadata.qualityMetrics });
    }
  }

  /**
   * Cleanup all streams and resources
   */
  public async cleanup(): Promise<void> {
    logger.info('Cleaning up Media Streaming Service');

    // Stop all recordings
    const cleanupPromises = Array.from(this.streams.keys()).map(streamId =>
      this.cleanupStream(streamId)
    );

    await Promise.all(cleanupPromises);

    // Clear all monitors
    for (const interval of this.qualityMonitors.values()) {
      clearInterval(interval);
    }
    this.qualityMonitors.clear();

    this.emit('cleanup');
  }
}