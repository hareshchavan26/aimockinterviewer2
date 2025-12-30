/**
 * Media Streaming Types
 * Defines interfaces for media capture, streaming, and recording
 */

export interface MediaStreamConfig {
  audio: AudioConfig;
  video: VideoConfig;
  recording: RecordingConfig;
}

export interface AudioConfig {
  enabled: boolean;
  sampleRate: number;
  channels: number;
  bitrate: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export interface VideoConfig {
  enabled: boolean;
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
  codec: 'h264' | 'vp8' | 'vp9';
}

export interface RecordingConfig {
  enabled: boolean;
  format: 'webm' | 'mp4';
  audioBitrate: number;
  videoBitrate: number;
  maxDuration: number; // milliseconds
  chunkSize: number; // milliseconds
}

export interface MediaStreamInfo {
  id: string;
  userId: string;
  sessionId: string;
  type: MediaStreamType;
  status: MediaStreamStatus;
  config: MediaStreamConfig;
  startedAt: Date;
  endedAt?: Date;
  duration?: number;
  fileSize?: number;
  filePath?: string;
  metadata: MediaMetadata;
}

export enum MediaStreamType {
  AUDIO_ONLY = 'audio_only',
  VIDEO_ONLY = 'video_only',
  AUDIO_VIDEO = 'audio_video',
  SCREEN_SHARE = 'screen_share'
}

export enum MediaStreamStatus {
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  ERROR = 'error'
}

export interface MediaMetadata {
  audioTracks: AudioTrackInfo[];
  videoTracks: VideoTrackInfo[];
  recordingChunks: RecordingChunk[];
  qualityMetrics: QualityMetrics;
}

export interface AudioTrackInfo {
  id: string;
  kind: 'audio';
  label: string;
  enabled: boolean;
  muted: boolean;
  settings: MediaTrackSettings;
}

export interface VideoTrackInfo {
  id: string;
  kind: 'video';
  label: string;
  enabled: boolean;
  muted: boolean;
  settings: MediaTrackSettings;
}

export interface RecordingChunk {
  id: string;
  startTime: number;
  endTime: number;
  size: number;
  type: string;
  filePath?: string;
}

export interface QualityMetrics {
  audioLevel: number;
  videoQuality: number;
  networkQuality: number;
  frameRate: number;
  bitrate: number;
  packetLoss: number;
  jitter: number;
  roundTripTime: number;
}

export interface MediaProcessingPipeline {
  id: string;
  streamId: string;
  processors: MediaProcessor[];
  status: ProcessingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum ProcessingStatus {
  IDLE = 'idle',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface MediaProcessor {
  id: string;
  type: ProcessorType;
  config: ProcessorConfig;
  status: ProcessingStatus;
  inputFormat: string;
  outputFormat: string;
  processingTime?: number;
  error?: string;
}

export enum ProcessorType {
  AUDIO_ANALYSIS = 'audio_analysis',
  VIDEO_ANALYSIS = 'video_analysis',
  SPEECH_TO_TEXT = 'speech_to_text',
  EMOTION_DETECTION = 'emotion_detection',
  FACE_DETECTION = 'face_detection',
  TRANSCODING = 'transcoding',
  COMPRESSION = 'compression'
}

export interface ProcessorConfig {
  [key: string]: any;
}

export interface AudioAnalysisConfig extends ProcessorConfig {
  enableVolumeAnalysis: boolean;
  enablePitchAnalysis: boolean;
  enableSpeechRate: boolean;
  enablePauseDetection: boolean;
  enableFillerWordDetection: boolean;
  confidenceThreshold: number;
}

export interface VideoAnalysisConfig extends ProcessorConfig {
  enableFaceDetection: boolean;
  enableEmotionDetection: boolean;
  enableGazeTracking: boolean;
  enableGestureAnalysis: boolean;
  confidenceThreshold: number;
  frameSkip: number;
}

export interface SpeechToTextConfig extends ProcessorConfig {
  language: string;
  model: string;
  enablePunctuation: boolean;
  enableTimestamps: boolean;
  enableSpeakerDiarization: boolean;
}

export interface MediaAnalysisResult {
  streamId: string;
  processorId: string;
  type: ProcessorType;
  timestamp: Date;
  data: AnalysisData;
  confidence: number;
  metadata: any;
}

export interface AnalysisData {
  [key: string]: any;
}

export interface AudioAnalysisResult extends AnalysisData {
  volume: number;
  pitch: number;
  speechRate: number;
  pauseDuration: number;
  fillerWords: string[];
  clarity: number;
  confidence: number;
}

export interface VideoAnalysisResult extends AnalysisData {
  faces: FaceDetection[];
  emotions: EmotionDetection[];
  gaze: GazeData;
  gestures: GestureData[];
}

export interface FaceDetection {
  boundingBox: BoundingBox;
  landmarks: FaceLandmark[];
  confidence: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceLandmark {
  type: string;
  x: number;
  y: number;
  confidence: number;
}

export interface EmotionDetection {
  emotion: EmotionType;
  confidence: number;
  intensity: number;
}

export enum EmotionType {
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  SURPRISED = 'surprised',
  FEARFUL = 'fearful',
  DISGUSTED = 'disgusted',
  NEUTRAL = 'neutral',
  CONFIDENT = 'confident',
  NERVOUS = 'nervous'
}

export interface GazeData {
  direction: GazeDirection;
  confidence: number;
  eyeContact: boolean;
}

export interface GazeDirection {
  x: number;
  y: number;
  z: number;
}

export interface GestureData {
  type: GestureType;
  confidence: number;
  duration: number;
  intensity: number;
}

export enum GestureType {
  HAND_GESTURE = 'hand_gesture',
  HEAD_NOD = 'head_nod',
  HEAD_SHAKE = 'head_shake',
  SHOULDER_SHRUG = 'shoulder_shrug',
  POINTING = 'pointing'
}

export interface MediaStreamingErrorData {
  code: MediaErrorCode;
  message: string;
  streamId?: string;
  processorId?: string;
  details?: any;
}

export class MediaStreamingError extends Error {
  public code: MediaErrorCode;
  public streamId?: string;
  public processorId?: string;
  public details?: any;

  constructor(data: MediaStreamingErrorData) {
    super(data.message);
    this.name = 'MediaStreamingError';
    this.code = data.code;
    this.streamId = data.streamId;
    this.processorId = data.processorId;
    this.details = data.details;
  }
}

export enum MediaErrorCode {
  STREAM_NOT_FOUND = 'STREAM_NOT_FOUND',
  MEDIA_ACCESS_DENIED = 'MEDIA_ACCESS_DENIED',
  RECORDING_FAILED = 'RECORDING_FAILED',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  STORAGE_FULL = 'STORAGE_FULL',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CODEC_NOT_SUPPORTED = 'CODEC_NOT_SUPPORTED',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION'
}