/**
 * Real-Time Analysis Pipeline Service
 * Provides real-time feedback generation, hesitation detection, and analysis aggregation
 * Requirements: 5.6
 */

import { logger } from '../utils/logger';
import {
  RealTimeAnalysisRequest,
  RealTimeAnalysisResult,
  RealTimeAnalysisConfig,
  RealTimeAnalysisSession,
  AnalysisType,
  ImmediateInsight,
  InsightType,
  InsightSeverity,
  HesitationAnalysis,
  HesitationType,
  PatternSeverity,
  NervousnessAnalysis,
  NervousnessType,
  AggregatedMetrics,
  TrendDirection,
  FeedbackTrigger,
  FeedbackType,
  FeedbackPriority,
  SessionState,
  RealTimeAnalysisError,
  RealTimeAnalysisErrorCode,
  TimeSegment,
  HesitationPattern,
  NervousnessIndicator,
  SpeechPatternAnalysis,
  EmotionalStateAnalysis,
  TrendAnalysis
} from '../types/real-time-analysis';

export class RealTimeAnalysisPipeline {
  private config: RealTimeAnalysisConfig;
  private activeSessions: Map<string, RealTimeAnalysisSession>;
  private analysisBuffer: Map<string, RealTimeAnalysisResult[]>;

  constructor(config: RealTimeAnalysisConfig) {
    this.config = config;
    this.activeSessions = new Map();
    this.analysisBuffer = new Map();
    
    logger.info('Real-Time Analysis Pipeline initialized', {
      enableRealTimeFeedback: config.enableRealTimeFeedback,
      feedbackDelay: config.feedbackDelay,
      analysisWindow: config.analysisWindow
    });
  }

  /**
   * Start a new real-time analysis session
   */
  public startSession(sessionId: string): RealTimeAnalysisSession {
    const session: RealTimeAnalysisSession = {
      sessionId,
      startTime: Date.now(),
      currentTime: Date.now(),
      analysisHistory: [],
      aggregatedState: {
        overallConfidence: 0.5,
        currentPace: 0,
        hesitationLevel: 0,
        nervousnessLevel: 0,
        emotionalState: 'neutral',
        communicationEffectiveness: 0.5,
        lastUpdateTime: Date.now()
      },
      activeStreams: [],
      configuration: this.config
    };

    this.activeSessions.set(sessionId, session);
    this.analysisBuffer.set(sessionId, []);

    logger.info('Real-time analysis session started', { sessionId });
    return session;
  }

  /**
   * Process real-time analysis request
   */
  public async processRealTimeAnalysis(request: RealTimeAnalysisRequest): Promise<RealTimeAnalysisResult> {
    const startTime = Date.now();

    try {
      this.validateRequest(request);

      const session = this.getSession(request.sessionId);
      session.currentTime = Date.now();

      // Generate immediate insights
      const immediateInsights = await this.generateImmediateInsights(request, session);

      // Detect hesitation patterns
      const hesitationDetection = await this.detectHesitation(request, session);

      // Analyze nervousness indicators
      const nervousnessDetection = await this.analyzeNervousness(request, session);

      // Calculate aggregated metrics
      const aggregatedMetrics = await this.calculateAggregatedMetrics(request, session);

      // Generate feedback triggers
      const feedbackTriggers = await this.generateFeedbackTriggers(
        immediateInsights,
        hesitationDetection,
        nervousnessDetection,
        session
      );

      const result: RealTimeAnalysisResult = {
        sessionId: request.sessionId,
        timestamp: Date.now(),
        sequenceNumber: request.inputData.sequenceNumber,
        analysisType: request.analysisType,
        immediateInsights,
        hesitationDetection,
        nervousnessDetection,
        aggregatedMetrics,
        feedbackTriggers,
        confidence: this.calculateOverallConfidence(immediateInsights, hesitationDetection, nervousnessDetection),
        processingLatency: Date.now() - startTime
      };

      // Update session state
      await this.updateSessionState(session, result);

      // Store result in history
      session.analysisHistory.push(result);
      this.analysisBuffer.get(request.sessionId)?.push(result);

      // Cleanup old results if buffer is too large
      this.cleanupAnalysisBuffer(request.sessionId);

      logger.debug('Real-time analysis completed', {
        sessionId: request.sessionId,
        analysisType: request.analysisType,
        processingLatency: result.processingLatency,
        insightsCount: immediateInsights.length,
        feedbackTriggersCount: feedbackTriggers.length
      });

      return result;

    } catch (error) {
      logger.error('Real-time analysis failed', {
        sessionId: request.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new RealTimeAnalysisError({
        code: RealTimeAnalysisErrorCode.PROCESSING_FAILED,
        message: `Real-time analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { sessionId: request.sessionId, analysisType: request.analysisType }
      });
    }
  }

  /**
   * Generate immediate insights from input data
   */
  private async generateImmediateInsights(
    request: RealTimeAnalysisRequest,
    session: RealTimeAnalysisSession
  ): Promise<ImmediateInsight[]> {
    const insights: ImmediateInsight[] = [];
    const currentTime = Date.now();

    // Analyze text input for immediate insights
    if (request.inputData.text && request.analysisType === AnalysisType.TEXT_STREAM) {
      const textInsights = await this.analyzeTextStream(request.inputData.text, session);
      insights.push(...textInsights);
    }

    // Analyze audio for pace and clarity insights
    if (request.inputData.audioChunk && 
        (request.analysisType === AnalysisType.AUDIO_STREAM || request.analysisType === AnalysisType.MULTI_MODAL)) {
      const audioInsights = await this.analyzeAudioStream(request.inputData.audioChunk, session);
      insights.push(...audioInsights);
    }

    // Analyze video for emotional insights
    if (request.inputData.videoFrame && 
        (request.analysisType === AnalysisType.VIDEO_STREAM || request.analysisType === AnalysisType.MULTI_MODAL)) {
      const videoInsights = await this.analyzeVideoStream(request.inputData.videoFrame, session);
      insights.push(...videoInsights);
    }

    return insights.map(insight => ({
      ...insight,
      timestamp: currentTime
    }));
  }

  /**
   * Analyze text stream for immediate insights
   */
  private async analyzeTextStream(text: string, session: RealTimeAnalysisSession): Promise<ImmediateInsight[]> {
    const insights: ImmediateInsight[] = [];

    // Check for filler words
    const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'actually'];
    const fillerCount = fillerWords.reduce((count, filler) => {
      return count + (text.toLowerCase().match(new RegExp(`\\b${filler}\\b`, 'g')) || []).length;
    }, 0);

    if (fillerCount > 2) {
      insights.push({
        type: InsightType.FILLER_WORDS,
        severity: InsightSeverity.WARNING,
        message: `Detected ${fillerCount} filler words in response`,
        suggestion: 'Try to pause instead of using filler words. Take a moment to think before speaking.',
        confidence: 0.8,
        timestamp: Date.now(),
        triggerData: { fillerCount, detectedFillers: fillerWords }
      });
    }

    // Check for structure indicators
    const structureWords = ['first', 'second', 'then', 'finally', 'in conclusion', 'to summarize'];
    const hasStructure = structureWords.some(word => text.toLowerCase().includes(word));

    if (hasStructure && text.length > 100) {
      insights.push({
        type: InsightType.CLEAR_STRUCTURE,
        severity: InsightSeverity.POSITIVE,
        message: 'Good use of structural language',
        suggestion: 'Continue using clear transitions and structure in your responses.',
        confidence: 0.7,
        timestamp: Date.now(),
        triggerData: { hasStructure, textLength: text.length }
      });
    }

    return insights;
  }

  /**
   * Analyze audio stream for pace and clarity insights
   */
  private async analyzeAudioStream(audioChunk: any, session: RealTimeAnalysisSession): Promise<ImmediateInsight[]> {
    const insights: ImmediateInsight[] = [];

    // Mock audio analysis - in real implementation, this would process actual audio
    const mockPace = 150 + Math.random() * 50; // Words per minute
    const mockClarity = 0.7 + Math.random() * 0.3;

    // Check pace
    if (mockPace > 200) {
      insights.push({
        type: InsightType.PACE_TOO_FAST,
        severity: InsightSeverity.WARNING,
        message: 'Speaking pace is too fast',
        suggestion: 'Slow down your speech to improve clarity and give the interviewer time to process.',
        confidence: 0.8,
        timestamp: Date.now(),
        triggerData: { pace: mockPace, threshold: 200 }
      });
    } else if (mockPace < 120) {
      insights.push({
        type: InsightType.PACE_TOO_SLOW,
        severity: InsightSeverity.WARNING,
        message: 'Speaking pace is too slow',
        suggestion: 'Increase your speaking pace slightly to maintain engagement.',
        confidence: 0.8,
        timestamp: Date.now(),
        triggerData: { pace: mockPace, threshold: 120 }
      });
    } else {
      insights.push({
        type: InsightType.GOOD_PACE,
        severity: InsightSeverity.POSITIVE,
        message: 'Excellent speaking pace',
        suggestion: 'Maintain this natural speaking rhythm.',
        confidence: 0.9,
        timestamp: Date.now(),
        triggerData: { pace: mockPace }
      });
    }

    return insights;
  }

  /**
   * Analyze video stream for emotional insights
   */
  private async analyzeVideoStream(videoFrame: any, session: RealTimeAnalysisSession): Promise<ImmediateInsight[]> {
    const insights: ImmediateInsight[] = [];

    // Mock video analysis - in real implementation, this would process actual video frames
    const mockConfidence = 0.6 + Math.random() * 0.4;
    const mockEmotionalStability = 0.7 + Math.random() * 0.3;

    if (mockConfidence > 0.8) {
      insights.push({
        type: InsightType.CONFIDENT_DELIVERY,
        severity: InsightSeverity.POSITIVE,
        message: 'Displaying confident body language',
        suggestion: 'Great job maintaining confident posture and eye contact.',
        confidence: mockConfidence,
        timestamp: Date.now(),
        triggerData: { confidenceLevel: mockConfidence }
      });
    } else if (mockConfidence < 0.5) {
      insights.push({
        type: InsightType.LOW_CONFIDENCE,
        severity: InsightSeverity.WARNING,
        message: 'Body language suggests low confidence',
        suggestion: 'Sit up straight, maintain eye contact, and use open gestures.',
        confidence: 0.7,
        timestamp: Date.now(),
        triggerData: { confidenceLevel: mockConfidence }
      });
    }

    return insights;
  }

  /**
   * Detect hesitation patterns in user responses
   */
  private async detectHesitation(
    request: RealTimeAnalysisRequest,
    session: RealTimeAnalysisSession
  ): Promise<HesitationAnalysis> {
    // Mock hesitation detection - in real implementation, this would analyze actual audio/text patterns
    const recentResults = session.analysisHistory.slice(-5);
    
    const hesitationPatterns: HesitationPattern[] = [
      {
        type: HesitationType.VERBAL_FILLER,
        frequency: 2 + Math.random() * 3,
        averageDuration: 500 + Math.random() * 1000,
        contexts: ['question_start', 'complex_topics'],
        severity: PatternSeverity.MODERATE
      },
      {
        type: HesitationType.SILENT_PAUSE,
        frequency: 1 + Math.random() * 2,
        averageDuration: 1000 + Math.random() * 2000,
        contexts: ['technical_questions'],
        severity: PatternSeverity.MINIMAL
      }
    ];

    const hesitationCount = Math.floor(Math.random() * 5);
    const averageHesitationDuration = 800 + Math.random() * 1200;
    const sessionDuration = (Date.now() - session.startTime) / 1000 / 60; // minutes
    const hesitationFrequency = sessionDuration > 0 ? hesitationCount / sessionDuration : 0;

    return {
      hesitationCount,
      averageHesitationDuration,
      hesitationFrequency,
      hesitationPatterns,
      overallHesitationScore: Math.max(0, 1 - (hesitationFrequency / 10)), // Normalize to 0-1
      recommendations: this.generateHesitationRecommendations(hesitationPatterns, hesitationFrequency)
    };
  }

  /**
   * Analyze nervousness indicators
   */
  private async analyzeNervousness(
    request: RealTimeAnalysisRequest,
    session: RealTimeAnalysisSession
  ): Promise<NervousnessAnalysis> {
    // Mock nervousness analysis
    const nervousnessIndicators: NervousnessIndicator[] = [];
    
    // Voice tremor analysis
    if (request.inputData.audioChunk) {
      const voiceTremorIntensity = Math.random() * 0.3;
      if (voiceTremorIntensity > 0.1) {
        nervousnessIndicators.push({
          type: NervousnessType.VOICE_TREMOR,
          intensity: voiceTremorIntensity,
          confidence: 0.7,
          timeSegments: [{ start: 0, end: 5000, intensity: voiceTremorIntensity }],
          description: 'Slight voice tremor detected'
        });
      }
    }

    // Rapid speech analysis
    const rapidSpeechIntensity = Math.random() * 0.4;
    if (rapidSpeechIntensity > 0.2) {
      nervousnessIndicators.push({
        type: NervousnessType.RAPID_SPEECH,
        intensity: rapidSpeechIntensity,
        confidence: 0.8,
        timeSegments: [{ start: 1000, end: 4000, intensity: rapidSpeechIntensity }],
        description: 'Speaking pace indicates nervousness'
      });
    }

    const voiceStability = 0.7 + Math.random() * 0.3;
    const speechPattern: SpeechPatternAnalysis = {
      averagePace: 140 + Math.random() * 40,
      paceVariability: Math.random() * 0.3,
      pauseFrequency: Math.random() * 5,
      fillerWordRate: Math.random() * 0.1,
      articulationClarity: 0.7 + Math.random() * 0.3,
      volumeConsistency: 0.8 + Math.random() * 0.2
    };

    const emotionalState: EmotionalStateAnalysis = {
      primaryEmotion: 'neutral',
      emotionIntensity: 0.3 + Math.random() * 0.4,
      emotionStability: 0.7 + Math.random() * 0.3,
      stressIndicators: ['slight_tension', 'elevated_pace'],
      confidenceLevel: 0.6 + Math.random() * 0.4
    };

    const nervousnessLevel = nervousnessIndicators.reduce((sum, indicator) => sum + indicator.intensity, 0) / Math.max(nervousnessIndicators.length, 1);

    return {
      nervousnessLevel,
      nervousnessIndicators,
      voiceStability,
      speechPattern,
      emotionalState,
      overallNervousnessScore: Math.min(1, nervousnessLevel),
      recommendations: this.generateNervousnessRecommendations(nervousnessLevel, nervousnessIndicators)
    };
  }

  /**
   * Calculate aggregated metrics for the session
   */
  private async calculateAggregatedMetrics(
    request: RealTimeAnalysisRequest,
    session: RealTimeAnalysisSession
  ): Promise<AggregatedMetrics> {
    const sessionDuration = Date.now() - session.startTime;
    const recentResults = session.analysisHistory.slice(-10);

    // Calculate trends
    const trendAnalysis: TrendAnalysis = {
      confidenceTrend: this.calculateTrend(recentResults.map(r => r.confidence)),
      paceTrend: TrendDirection.STABLE,
      hesitationTrend: this.calculateTrend(recentResults.map(r => r.hesitationDetection.overallHesitationScore)),
      nervousnessTrend: this.calculateTrend(recentResults.map(r => r.nervousnessDetection.overallNervousnessScore)),
      improvementAreas: ['pace_consistency', 'filler_word_reduction'],
      strengths: ['clear_structure', 'good_content']
    };

    return {
      sessionDuration,
      totalWordsSpoken: Math.floor(sessionDuration / 1000 * 2.5), // Estimate based on average speaking rate
      averagePace: 150 + Math.random() * 30,
      overallConfidence: session.aggregatedState.overallConfidence,
      hesitationRate: Math.random() * 0.1,
      nervousnessLevel: session.aggregatedState.nervousnessLevel,
      emotionalStability: 0.7 + Math.random() * 0.3,
      communicationEffectiveness: session.aggregatedState.communicationEffectiveness,
      trendAnalysis
    };
  }

  /**
   * Generate feedback triggers based on analysis results
   */
  private async generateFeedbackTriggers(
    insights: ImmediateInsight[],
    hesitation: HesitationAnalysis,
    nervousness: NervousnessAnalysis,
    session: RealTimeAnalysisSession
  ): Promise<FeedbackTrigger[]> {
    const triggers: FeedbackTrigger[] = [];

    // Generate triggers from insights
    insights.forEach(insight => {
      if (insight.severity === InsightSeverity.WARNING || insight.severity === InsightSeverity.CRITICAL) {
        triggers.push({
          type: FeedbackType.IMMEDIATE_CORRECTION,
          priority: insight.severity === InsightSeverity.CRITICAL ? FeedbackPriority.URGENT : FeedbackPriority.MEDIUM,
          message: insight.suggestion,
          actionRequired: true,
          timestamp: Date.now(),
          data: { insightType: insight.type, confidence: insight.confidence }
        });
      } else if (insight.severity === InsightSeverity.POSITIVE) {
        triggers.push({
          type: FeedbackType.ENCOURAGEMENT,
          priority: FeedbackPriority.LOW,
          message: insight.message,
          actionRequired: false,
          timestamp: Date.now(),
          data: { insightType: insight.type }
        });
      }
    });

    // Generate triggers from hesitation analysis
    if (hesitation.hesitationFrequency > 5) {
      triggers.push({
        type: FeedbackType.TECHNIQUE_SUGGESTION,
        priority: FeedbackPriority.MEDIUM,
        message: 'Consider taking a brief pause to collect your thoughts instead of using filler words.',
        actionRequired: true,
        timestamp: Date.now(),
        data: { hesitationFrequency: hesitation.hesitationFrequency }
      });
    }

    // Generate triggers from nervousness analysis
    if (nervousness.overallNervousnessScore > 0.7) {
      triggers.push({
        type: FeedbackType.CONFIDENCE_BOOST,
        priority: FeedbackPriority.HIGH,
        message: 'Take a deep breath and remember your qualifications. You\'re doing well.',
        actionRequired: false,
        timestamp: Date.now(),
        data: { nervousnessScore: nervousness.overallNervousnessScore }
      });
    }

    return triggers;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
    insights: ImmediateInsight[],
    hesitation: HesitationAnalysis,
    nervousness: NervousnessAnalysis
  ): number {
    const insightConfidence = insights.length > 0 
      ? insights.reduce((sum, insight) => sum + insight.confidence, 0) / insights.length 
      : 0.5;
    
    const hesitationConfidence = hesitation.overallHesitationScore;
    const nervousnessConfidence = 1 - nervousness.overallNervousnessScore;

    return (insightConfidence + hesitationConfidence + nervousnessConfidence) / 3;
  }

  /**
   * Update session state with new analysis results
   */
  private async updateSessionState(session: RealTimeAnalysisSession, result: RealTimeAnalysisResult): Promise<void> {
    const state = session.aggregatedState;
    
    // Update confidence with exponential moving average
    const alpha = 0.3; // Smoothing factor
    state.overallConfidence = alpha * result.confidence + (1 - alpha) * state.overallConfidence;
    
    // Update nervousness level
    state.nervousnessLevel = alpha * result.nervousnessDetection.overallNervousnessScore + (1 - alpha) * state.nervousnessLevel;
    
    // Update hesitation level
    state.hesitationLevel = alpha * (1 - result.hesitationDetection.overallHesitationScore) + (1 - alpha) * state.hesitationLevel;
    
    // Update communication effectiveness
    state.communicationEffectiveness = (state.overallConfidence + (1 - state.nervousnessLevel) + (1 - state.hesitationLevel)) / 3;
    
    state.lastUpdateTime = Date.now();
  }

  /**
   * Generate hesitation recommendations
   */
  private generateHesitationRecommendations(patterns: HesitationPattern[], frequency: number): string[] {
    const recommendations: string[] = [];

    if (frequency > 5) {
      recommendations.push('Practice speaking more slowly to reduce hesitation frequency');
      recommendations.push('Prepare key points in advance to improve fluency');
    }

    patterns.forEach(pattern => {
      switch (pattern.type) {
        case HesitationType.VERBAL_FILLER:
          recommendations.push('Replace filler words with brief pauses');
          break;
        case HesitationType.SILENT_PAUSE:
          recommendations.push('Use strategic pauses for emphasis rather than hesitation');
          break;
        case HesitationType.REPETITION:
          recommendations.push('Take time to organize thoughts before speaking');
          break;
      }
    });

    return recommendations;
  }

  /**
   * Generate nervousness recommendations
   */
  private generateNervousnessRecommendations(level: number, indicators: NervousnessIndicator[]): string[] {
    const recommendations: string[] = [];

    if (level > 0.5) {
      recommendations.push('Practice deep breathing exercises to calm nerves');
      recommendations.push('Focus on your preparation and qualifications');
    }

    indicators.forEach(indicator => {
      switch (indicator.type) {
        case NervousnessType.VOICE_TREMOR:
          recommendations.push('Speak from your diaphragm to stabilize your voice');
          break;
        case NervousnessType.RAPID_SPEECH:
          recommendations.push('Consciously slow down your speaking pace');
          break;
        case NervousnessType.PITCH_VARIATION:
          recommendations.push('Practice maintaining a steady vocal tone');
          break;
      }
    });

    return recommendations;
  }

  /**
   * Calculate trend direction from a series of values
   */
  private calculateTrend(values: number[]): TrendDirection {
    if (values.length < 2) return TrendDirection.STABLE;

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;
    const threshold = 0.1;

    if (difference > threshold) return TrendDirection.IMPROVING;
    if (difference < -threshold) return TrendDirection.DECLINING;
    return TrendDirection.STABLE;
  }

  /**
   * Validate analysis request
   */
  private validateRequest(request: RealTimeAnalysisRequest): void {
    if (!request.sessionId) {
      throw new RealTimeAnalysisError({
        code: RealTimeAnalysisErrorCode.INVALID_INPUT_DATA,
        message: 'Session ID is required'
      });
    }

    if (!request.inputData) {
      throw new RealTimeAnalysisError({
        code: RealTimeAnalysisErrorCode.INVALID_INPUT_DATA,
        message: 'Input data is required'
      });
    }

    if (!request.inputData.text && !request.inputData.audioChunk && !request.inputData.videoFrame) {
      throw new RealTimeAnalysisError({
        code: RealTimeAnalysisErrorCode.INSUFFICIENT_DATA,
        message: 'At least one input type (text, audio, or video) is required'
      });
    }
  }

  /**
   * Get active session or throw error
   */
  private getSession(sessionId: string): RealTimeAnalysisSession {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new RealTimeAnalysisError({
        code: RealTimeAnalysisErrorCode.SESSION_NOT_FOUND,
        message: `Session not found: ${sessionId}`
      });
    }
    return session;
  }

  /**
   * Cleanup old analysis results to prevent memory leaks
   */
  private cleanupAnalysisBuffer(sessionId: string): void {
    const buffer = this.analysisBuffer.get(sessionId);
    if (buffer && buffer.length > 100) {
      // Keep only the most recent 50 results
      this.analysisBuffer.set(sessionId, buffer.slice(-50));
    }
  }

  /**
   * End analysis session and cleanup resources
   */
  public endSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
    this.analysisBuffer.delete(sessionId);
    logger.info('Real-time analysis session ended', { sessionId });
  }

  /**
   * Get current session state
   */
  public getSessionState(sessionId: string): SessionState | null {
    const session = this.activeSessions.get(sessionId);
    return session ? session.aggregatedState : null;
  }

  /**
   * Get session analysis history
   */
  public getSessionHistory(sessionId: string): RealTimeAnalysisResult[] {
    const session = this.activeSessions.get(sessionId);
    return session ? session.analysisHistory : [];
  }
}