/**
 * WebRTC Signaling Server
 * Handles WebSocket-based signaling for peer-to-peer connections
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '../utils/logger';
import {
  SignalingMessage,
  SignalingMessageType,
  JoinSessionData,
  PeerConnection,
  InterviewSession,
  SessionStatus,
  MediaStateData,
  SignalingServerConfig,
  SignalingError,
  SignalingErrorCode,
  STUNTURNConfig
} from '../types/webrtc';

export class SignalingServer {
  private io: SocketIOServer;
  private sessions: Map<string, InterviewSession> = new Map();
  private userSockets: Map<string, Socket> = new Map();
  private config: SignalingServerConfig;

  constructor(httpServer: HTTPServer, config: SignalingServerConfig) {
    this.config = config;
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.corsOrigins,
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    this.startHeartbeat();
    
    logger.info('WebRTC Signaling Server initialized', {
      corsOrigins: config.corsOrigins,
      heartbeatInterval: config.heartbeatInterval
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info('Client connected', { socketId: socket.id });

      socket.on('join_session', (data: JoinSessionData) => {
        this.handleJoinSession(socket, data);
      });

      socket.on('leave_session', (data: { sessionId: string; userId: string }) => {
        this.handleLeaveSession(socket, data);
      });

      socket.on('offer', (data: any) => {
        this.handleOffer(socket, data);
      });

      socket.on('answer', (data: any) => {
        this.handleAnswer(socket, data);
      });

      socket.on('ice_candidate', (data: any) => {
        this.handleIceCandidate(socket, data);
      });

      socket.on('media_state_change', (data: any) => {
        this.handleMediaStateChange(socket, data);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      socket.on('error', (error) => {
        logger.error('Socket error', { socketId: socket.id, error });
      });
    });
  }

  private handleJoinSession(socket: Socket, data: JoinSessionData): void {
    try {
      logger.info('User joining session', {
        sessionId: data.sessionId,
        userId: data.userId,
        role: data.userRole
      });

      // Validate input
      if (!data.sessionId || !data.userId || !data.userRole) {
        this.sendError(socket, SignalingErrorCode.INVALID_MESSAGE_FORMAT, 'Missing required fields');
        return;
      }

      // Check if user is already in a session
      if (this.userSockets.has(data.userId)) {
        this.sendError(socket, SignalingErrorCode.USER_ALREADY_IN_SESSION, 'User already connected');
        return;
      }

      // Get or create session
      let session = this.sessions.get(data.sessionId);
      if (!session) {
        session = this.createSession(data.sessionId);
      }

      // Create peer connection
      const peerConnection: PeerConnection = {
        id: socket.id,
        userId: data.userId,
        sessionId: data.sessionId,
        role: data.userRole,
        connectionState: 'new',
        mediaState: {
          audio: data.mediaConstraints.audio,
          video: data.mediaConstraints.video,
          screen: data.mediaConstraints.screen || false
        },
        connectedAt: new Date(),
        lastActivity: new Date()
      };

      // Add to session
      session.participants.set(data.userId, peerConnection);
      this.userSockets.set(data.userId, socket);

      // Join socket room
      socket.join(data.sessionId);

      // Update session status
      if (session.participants.size >= 2) {
        session.status = SessionStatus.ACTIVE;
      }

      // Notify user of successful join
      socket.emit('session_joined', {
        sessionId: data.sessionId,
        participants: Array.from(session.participants.values()),
        stunTurnConfig: this.config.stunTurnConfig
      });

      // Notify other participants
      socket.to(data.sessionId).emit('user_joined', {
        user: peerConnection,
        sessionStatus: session.status
      });

      logger.info('User successfully joined session', {
        sessionId: data.sessionId,
        userId: data.userId,
        participantCount: session.participants.size
      });

    } catch (error) {
      logger.error('Error handling join session', { error, data });
      this.sendError(socket, SignalingErrorCode.CONNECTION_TIMEOUT, 'Failed to join session');
    }
  }

  private handleLeaveSession(socket: Socket, data: { sessionId: string; userId: string }): void {
    try {
      logger.info('User leaving session', data);

      const session = this.sessions.get(data.sessionId);
      if (!session) {
        this.sendError(socket, SignalingErrorCode.SESSION_NOT_FOUND, 'Session not found');
        return;
      }

      // Remove participant
      session.participants.delete(data.userId);
      this.userSockets.delete(data.userId);

      // Leave socket room
      socket.leave(data.sessionId);

      // Update session status
      if (session.participants.size === 0) {
        session.status = SessionStatus.ENDED;
        this.sessions.delete(data.sessionId);
      } else if (session.participants.size === 1) {
        session.status = SessionStatus.WAITING;
      }

      // Notify user
      socket.emit('session_left', { sessionId: data.sessionId });

      // Notify other participants
      socket.to(data.sessionId).emit('user_left', {
        userId: data.userId,
        sessionStatus: session.status
      });

      logger.info('User successfully left session', {
        sessionId: data.sessionId,
        userId: data.userId,
        remainingParticipants: session.participants.size
      });

    } catch (error) {
      logger.error('Error handling leave session', { error, data });
    }
  }

  private handleOffer(socket: Socket, data: any): void {
    try {
      logger.debug('Handling WebRTC offer', { from: data.userId, to: data.targetUserId });

      const targetSocket = this.userSockets.get(data.targetUserId);
      if (!targetSocket) {
        this.sendError(socket, SignalingErrorCode.SESSION_NOT_FOUND, 'Target user not found');
        return;
      }

      // Forward offer to target user
      targetSocket.emit('offer', {
        from: data.userId,
        sessionId: data.sessionId,
        offer: data.offer
      });

      this.updateLastActivity(data.userId);

    } catch (error) {
      logger.error('Error handling offer', { error, data });
    }
  }

  private handleAnswer(socket: Socket, data: any): void {
    try {
      logger.debug('Handling WebRTC answer', { from: data.userId, to: data.targetUserId });

      const targetSocket = this.userSockets.get(data.targetUserId);
      if (!targetSocket) {
        this.sendError(socket, SignalingErrorCode.SESSION_NOT_FOUND, 'Target user not found');
        return;
      }

      // Forward answer to target user
      targetSocket.emit('answer', {
        from: data.userId,
        sessionId: data.sessionId,
        answer: data.answer
      });

      this.updateLastActivity(data.userId);

    } catch (error) {
      logger.error('Error handling answer', { error, data });
    }
  }

  private handleIceCandidate(socket: Socket, data: any): void {
    try {
      logger.debug('Handling ICE candidate', { from: data.userId, to: data.targetUserId });

      const targetSocket = this.userSockets.get(data.targetUserId);
      if (!targetSocket) {
        return; // ICE candidates can be sent before target connects
      }

      // Forward ICE candidate to target user
      targetSocket.emit('ice_candidate', {
        from: data.userId,
        sessionId: data.sessionId,
        candidate: data.candidate
      });

      this.updateLastActivity(data.userId);

    } catch (error) {
      logger.error('Error handling ICE candidate', { error, data });
    }
  }

  private handleMediaStateChange(socket: Socket, data: any): void {
    try {
      logger.debug('Handling media state change', data);

      const session = this.sessions.get(data.sessionId);
      if (!session) {
        this.sendError(socket, SignalingErrorCode.SESSION_NOT_FOUND, 'Session not found');
        return;
      }

      const participant = session.participants.get(data.userId);
      if (!participant) {
        return;
      }

      // Update media state
      participant.mediaState = { ...participant.mediaState, ...data.mediaState };
      participant.lastActivity = new Date();

      // Notify other participants
      socket.to(data.sessionId).emit('media_state_change', {
        userId: data.userId,
        mediaState: participant.mediaState
      });

    } catch (error) {
      logger.error('Error handling media state change', { error, data });
    }
  }

  private handleDisconnect(socket: Socket): void {
    logger.info('Client disconnected', { socketId: socket.id });

    // Find and remove user from all sessions
    for (const [userId, userSocket] of this.userSockets.entries()) {
      if (userSocket.id === socket.id) {
        // Find user's session
        for (const [sessionId, session] of this.sessions.entries()) {
          if (session.participants.has(userId)) {
            this.handleLeaveSession(socket, { sessionId, userId });
            break;
          }
        }
        break;
      }
    }
  }

  private createSession(sessionId: string): InterviewSession {
    const session: InterviewSession = {
      id: sessionId,
      participants: new Map(),
      createdAt: new Date(),
      status: SessionStatus.WAITING,
      recordingActive: false,
      mediaStreams: new Map()
    };

    this.sessions.set(sessionId, session);
    logger.info('Created new interview session', { sessionId });
    
    return session;
  }

  private updateLastActivity(userId: string): void {
    for (const session of this.sessions.values()) {
      const participant = session.participants.get(userId);
      if (participant) {
        participant.lastActivity = new Date();
        break;
      }
    }
  }

  private sendError(socket: Socket, code: SignalingErrorCode, message: string, details?: any): void {
    const error: SignalingError = { code, message, details };
    socket.emit('error', error);
    logger.warn('Sent signaling error', { socketId: socket.id, error });
  }

  private startHeartbeat(): void {
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, this.config.heartbeatInterval);
  }

  private cleanupInactiveSessions(): void {
    const now = new Date();
    const timeout = this.config.connectionTimeout;

    for (const [sessionId, session] of this.sessions.entries()) {
      // Check for inactive participants
      for (const [userId, participant] of session.participants.entries()) {
        const inactiveTime = now.getTime() - participant.lastActivity.getTime();
        
        if (inactiveTime > timeout) {
          logger.info('Removing inactive participant', {
            sessionId,
            userId,
            inactiveTime
          });

          const socket = this.userSockets.get(userId);
          if (socket) {
            this.handleLeaveSession(socket, { sessionId, userId });
          }
        }
      }

      // Remove empty sessions
      if (session.participants.size === 0) {
        this.sessions.delete(sessionId);
        logger.info('Removed empty session', { sessionId });
      }
    }
  }

  // Public methods for external access
  public getSessionInfo(sessionId: string): InterviewSession | undefined {
    return this.sessions.get(sessionId);
  }

  public getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  public getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down signaling server');
    
    // Notify all clients
    this.io.emit('server_shutdown', { message: 'Server is shutting down' });
    
    // Close all connections
    this.io.close();
    
    // Clear data
    this.sessions.clear();
    this.userSockets.clear();
  }
}