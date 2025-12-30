/**
 * Peer Connection Manager
 * Manages WebRTC peer connections and media streams
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import {
  PeerConnection,
  MediaConstraints,
  MediaStateData,
  STUNTURNConfig,
  SignalingError,
  SignalingErrorCode
} from '../types/webrtc';

export interface PeerConnectionManagerConfig {
  stunTurnConfig: STUNTURNConfig;
  connectionTimeout: number;
  reconnectAttempts: number;
  reconnectDelay: number;
}

export class PeerConnectionManager extends EventEmitter {
  private connections: Map<string, RTCPeerConnection> = new Map();
  private localStreams: Map<string, MediaStream> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private config: PeerConnectionManagerConfig;

  constructor(config: PeerConnectionManagerConfig) {
    super();
    this.config = config;
    
    logger.info('Peer Connection Manager initialized', {
      iceServers: config.stunTurnConfig.iceServers.length
    });
  }

  /**
   * Create a new peer connection
   */
  public async createPeerConnection(
    connectionId: string,
    isInitiator: boolean = false
  ): Promise<RTCPeerConnection> {
    try {
      logger.info('Creating peer connection', { connectionId, isInitiator });

      const peerConnection = new RTCPeerConnection({
        iceServers: this.config.stunTurnConfig.iceServers,
        iceCandidatePoolSize: 10,
        bundlePolicy: 'balanced',
        rtcpMuxPolicy: 'require'
      });

      // Set up event handlers
      this.setupPeerConnectionHandlers(peerConnection, connectionId);

      // Store connection
      this.connections.set(connectionId, peerConnection);

      // Add local streams if available
      const localStream = this.localStreams.get('default');
      if (localStream) {
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });
      }

      this.emit('connectionCreated', { connectionId, isInitiator });
      
      return peerConnection;

    } catch (error) {
      logger.error('Failed to create peer connection', { connectionId, error });
      throw new Error(`Failed to create peer connection: ${error}`);
    }
  }

  /**
   * Create and send an offer
   */
  public async createOffer(connectionId: string): Promise<RTCSessionDescriptionInit> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    try {
      logger.debug('Creating offer', { connectionId });

      const offer = await connection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      await connection.setLocalDescription(offer);
      
      logger.debug('Offer created and set as local description', { connectionId });
      return offer;

    } catch (error) {
      logger.error('Failed to create offer', { connectionId, error });
      throw error;
    }
  }

  /**
   * Handle incoming offer and create answer
   */
  public async handleOffer(
    connectionId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    try {
      logger.debug('Handling offer', { connectionId });

      await connection.setRemoteDescription(offer);
      
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      
      logger.debug('Answer created and set as local description', { connectionId });
      return answer;

    } catch (error) {
      logger.error('Failed to handle offer', { connectionId, error });
      throw error;
    }
  }

  /**
   * Handle incoming answer
   */
  public async handleAnswer(
    connectionId: string,
    answer: RTCSessionDescriptionInit
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    try {
      logger.debug('Handling answer', { connectionId });
      await connection.setRemoteDescription(answer);
      logger.debug('Answer set as remote description', { connectionId });

    } catch (error) {
      logger.error('Failed to handle answer', { connectionId, error });
      throw error;
    }
  }

  /**
   * Add ICE candidate
   */
  public async addIceCandidate(
    connectionId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      logger.warn('Connection not found for ICE candidate', { connectionId });
      return;
    }

    try {
      await connection.addIceCandidate(candidate);
      logger.debug('ICE candidate added', { connectionId });

    } catch (error) {
      logger.error('Failed to add ICE candidate', { connectionId, error });
      // Don't throw - ICE candidates can fail without breaking the connection
    }
  }

  /**
   * Get or create local media stream
   */
  public async getLocalStream(
    streamId: string = 'default',
    constraints: MediaConstraints
  ): Promise<MediaStream> {
    try {
      logger.info('Getting local media stream', { streamId, constraints });

      let stream = this.localStreams.get(streamId);
      
      if (!stream) {
        // Create new stream
        if (constraints.screen) {
          // Screen sharing
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: constraints.audio
          });
        } else {
          // Camera/microphone
          stream = await navigator.mediaDevices.getUserMedia({
            audio: constraints.audio,
            video: constraints.video
          });
        }

        this.localStreams.set(streamId, stream);
        
        // Set up stream event handlers
        this.setupStreamHandlers(stream, streamId, true);
      }

      this.emit('localStreamReady', { streamId, stream });
      return stream;

    } catch (error) {
      logger.error('Failed to get local stream', { streamId, constraints, error });
      throw new Error(`Failed to access media: ${error}`);
    }
  }

  /**
   * Update media state (mute/unmute, enable/disable video)
   */
  public updateMediaState(
    streamId: string = 'default',
    mediaState: Partial<MediaStateData>
  ): void {
    const stream = this.localStreams.get(streamId);
    if (!stream) {
      logger.warn('Stream not found for media state update', { streamId });
      return;
    }

    try {
      if (mediaState.audio !== undefined) {
        stream.getAudioTracks().forEach(track => {
          track.enabled = mediaState.audio!;
        });
      }

      if (mediaState.video !== undefined) {
        stream.getVideoTracks().forEach(track => {
          track.enabled = mediaState.video!;
        });
      }

      logger.info('Media state updated', { streamId, mediaState });
      this.emit('mediaStateChanged', { streamId, mediaState });

    } catch (error) {
      logger.error('Failed to update media state', { streamId, mediaState, error });
    }
  }

  /**
   * Stop and remove a media stream
   */
  public stopStream(streamId: string): void {
    const stream = this.localStreams.get(streamId);
    if (!stream) {
      return;
    }

    try {
      stream.getTracks().forEach(track => {
        track.stop();
      });

      this.localStreams.delete(streamId);
      logger.info('Stream stopped and removed', { streamId });
      this.emit('streamStopped', { streamId });

    } catch (error) {
      logger.error('Failed to stop stream', { streamId, error });
    }
  }

  /**
   * Close a peer connection
   */
  public closePeerConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    try {
      connection.close();
      this.connections.delete(connectionId);
      
      logger.info('Peer connection closed', { connectionId });
      this.emit('connectionClosed', { connectionId });

    } catch (error) {
      logger.error('Failed to close peer connection', { connectionId, error });
    }
  }

  /**
   * Get connection statistics
   */
  public async getConnectionStats(connectionId: string): Promise<RTCStatsReport | null> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return null;
    }

    try {
      return await connection.getStats();
    } catch (error) {
      logger.error('Failed to get connection stats', { connectionId, error });
      return null;
    }
  }

  /**
   * Clean up all connections and streams
   */
  public cleanup(): void {
    logger.info('Cleaning up peer connection manager');

    // Close all peer connections
    for (const [connectionId, connection] of this.connections.entries()) {
      try {
        connection.close();
      } catch (error) {
        logger.error('Error closing connection during cleanup', { connectionId, error });
      }
    }

    // Stop all local streams
    for (const [streamId, stream] of this.localStreams.entries()) {
      try {
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        logger.error('Error stopping stream during cleanup', { streamId, error });
      }
    }

    // Clear maps
    this.connections.clear();
    this.localStreams.clear();
    this.remoteStreams.clear();

    this.emit('cleanup');
  }

  private setupPeerConnectionHandlers(
    connection: RTCPeerConnection,
    connectionId: string
  ): void {
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        logger.debug('ICE candidate generated', { connectionId });
        this.emit('iceCandidate', {
          connectionId,
          candidate: event.candidate
        });
      }
    };

    connection.oniceconnectionstatechange = () => {
      logger.info('ICE connection state changed', {
        connectionId,
        state: connection.iceConnectionState
      });
      
      this.emit('connectionStateChange', {
        connectionId,
        state: connection.iceConnectionState
      });

      if (connection.iceConnectionState === 'failed') {
        this.handleConnectionFailure(connectionId);
      }
    };

    connection.ontrack = (event) => {
      logger.info('Remote track received', { connectionId });
      
      const [remoteStream] = event.streams;
      this.remoteStreams.set(connectionId, remoteStream);
      
      this.setupStreamHandlers(remoteStream, connectionId, false);
      
      this.emit('remoteStream', {
        connectionId,
        stream: remoteStream
      });
    };

    connection.ondatachannel = (event) => {
      logger.info('Data channel received', { connectionId });
      this.setupDataChannelHandlers(event.channel, connectionId);
    };

    connection.onconnectionstatechange = () => {
      logger.info('Connection state changed', {
        connectionId,
        state: connection.connectionState
      });
    };
  }

  private setupStreamHandlers(
    stream: MediaStream,
    streamId: string,
    isLocal: boolean
  ): void {
    stream.onaddtrack = (event) => {
      logger.debug('Track added to stream', {
        streamId,
        trackKind: event.track.kind,
        isLocal
      });
    };

    stream.onremovetrack = (event) => {
      logger.debug('Track removed from stream', {
        streamId,
        trackKind: event.track.kind,
        isLocal
      });
    };

    // Set up track handlers
    stream.getTracks().forEach(track => {
      track.onended = () => {
        logger.info('Track ended', {
          streamId,
          trackKind: track.kind,
          isLocal
        });
      };

      track.onmute = () => {
        logger.debug('Track muted', {
          streamId,
          trackKind: track.kind,
          isLocal
        });
      };

      track.onunmute = () => {
        logger.debug('Track unmuted', {
          streamId,
          trackKind: track.kind,
          isLocal
        });
      };
    });
  }

  private setupDataChannelHandlers(channel: RTCDataChannel, connectionId: string): void {
    channel.onopen = () => {
      logger.info('Data channel opened', { connectionId, label: channel.label });
    };

    channel.onclose = () => {
      logger.info('Data channel closed', { connectionId, label: channel.label });
    };

    channel.onmessage = (event) => {
      logger.debug('Data channel message received', {
        connectionId,
        label: channel.label,
        data: event.data
      });
      
      this.emit('dataChannelMessage', {
        connectionId,
        label: channel.label,
        data: event.data
      });
    };

    channel.onerror = (error) => {
      logger.error('Data channel error', {
        connectionId,
        label: channel.label,
        error
      });
    };
  }

  private handleConnectionFailure(connectionId: string): void {
    logger.warn('Handling connection failure', { connectionId });
    
    this.emit('connectionFailed', { connectionId });
    
    // Attempt reconnection logic could be added here
    // For now, just emit the failure event
  }

  // Getters for monitoring
  public get activeConnections(): number {
    return this.connections.size;
  }

  public get activeStreams(): number {
    return this.localStreams.size;
  }

  public getConnectionState(connectionId: string): RTCPeerConnectionState | null {
    const connection = this.connections.get(connectionId);
    return connection ? connection.connectionState : null;
  }
}