/**
 * WebRTC Signaling Types
 * Defines interfaces for real-time communication signaling
 */

export interface SignalingMessage {
  type: SignalingMessageType;
  sessionId: string;
  userId: string;
  timestamp: Date;
  data: any;
}

export enum SignalingMessageType {
  // Connection management
  JOIN_SESSION = 'join_session',
  LEAVE_SESSION = 'leave_session',
  SESSION_JOINED = 'session_joined',
  SESSION_LEFT = 'session_left',
  
  // WebRTC signaling
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice_candidate',
  
  // Media control
  MEDIA_STATE_CHANGE = 'media_state_change',
  RECORDING_START = 'recording_start',
  RECORDING_STOP = 'recording_stop',
  
  // Error handling
  ERROR = 'error',
  CONNECTION_FAILED = 'connection_failed'
}

export interface JoinSessionData {
  sessionId: string;
  userId: string;
  userRole: 'interviewer' | 'interviewee';
  mediaConstraints: MediaConstraints;
}

export interface MediaConstraints {
  audio: boolean;
  video: boolean;
  screen?: boolean;
}

export interface RTCOfferData {
  sdp: string;
  type: 'offer';
}

export interface RTCAnswerData {
  sdp: string;
  type: 'answer';
}

export interface ICECandidateData {
  candidate: string;
  sdpMLineIndex: number;
  sdpMid: string;
}

export interface MediaStateData {
  audio: boolean;
  video: boolean;
  screen?: boolean;
}

export interface PeerConnection {
  id: string;
  userId: string;
  sessionId: string;
  role: 'interviewer' | 'interviewee';
  connectionState: RTCPeerConnectionState;
  mediaState: MediaStateData;
  connectedAt: Date;
  lastActivity: Date;
}

export interface InterviewSession {
  id: string;
  participants: Map<string, PeerConnection>;
  createdAt: Date;
  status: SessionStatus;
  recordingActive: boolean;
  mediaStreams: Map<string, MediaStreamInfo>;
}

export enum SessionStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ENDED = 'ended'
}

export interface MediaStreamInfo {
  userId: string;
  streamId: string;
  type: 'audio' | 'video' | 'screen';
  active: boolean;
  startedAt: Date;
}

export interface STUNTURNConfig {
  iceServers: RTCIceServer[];
}

export interface SignalingServerConfig {
  port: number;
  corsOrigins: string[];
  stunTurnConfig: STUNTURNConfig;
  maxSessionDuration: number; // milliseconds
  heartbeatInterval: number; // milliseconds
  connectionTimeout: number; // milliseconds
}

export interface SignalingError {
  code: string;
  message: string;
  details?: any;
}

export enum SignalingErrorCode {
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  USER_ALREADY_IN_SESSION = 'USER_ALREADY_IN_SESSION',
  INVALID_MESSAGE_FORMAT = 'INVALID_MESSAGE_FORMAT',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  MEDIA_SETUP_FAILED = 'MEDIA_SETUP_FAILED',
  RECORDING_FAILED = 'RECORDING_FAILED'
}