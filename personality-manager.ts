import {
  AIPersonalityState,
  AIPersonalityConfig,
  InterviewerMood,
  ConversationTurn,
  InterviewStyle,
  InterviewTone,
  FormalityLevel,
  QuestionType,
  DifficultyLevel,
} from '../types/ai-interviewer';
import { logger } from '../utils/logger';

export class PersonalityManager {
  /**
   * Initialize AI personality state from configuration
   */
  static initializePersonality(config: AIPersonalityConfig): AIPersonalityState {
    logger.info('Initializing AI personality', {
      name: config.name,
      style: config.style,
      tone: config.tone,
    });

    // Ensure all numeric values are valid, use defaults for NaN/invalid values
    const safeAdaptiveness = isNaN(config.adaptiveness) || !isFinite(config.adaptiveness) ? 0.5 : config.adaptiveness;
    const safeFollowUpIntensity = isNaN(config.followUpIntensity) || !isFinite(config.followUpIntensity) ? 0.5 : config.followUpIntensity;
    const safeEncouragementLevel = isNaN(config.encouragementLevel) || !isFinite(config.encouragementLevel) ? 0.5 : config.encouragementLevel;

    return {
      name: config.name,
      style: config.style,
      tone: config.tone,
      formality: config.formality,
      adaptiveness: safeAdaptiveness,
      followUpIntensity: safeFollowUpIntensity,
      encouragementLevel: safeEncouragementLevel,
      
      // Initial dynamic state
      currentMood: this.getInitialMood(config),
      adaptationLevel: 0.0,
      userEngagementLevel: 0.5, // Start neutral
      sessionProgress: 0.0,
      
      // Empty conversation history
      conversationHistory: [],
      lastQuestionType: QuestionType.BEHAVIORAL,
      consecutiveFollowUps: 0,
    };
  }

  /**
   * Update personality state based on conversation events
   */
  static updatePersonalityState(
    currentState: AIPersonalityState,
    event: ConversationEvent
  ): AIPersonalityState {
    logger.debug('Updating personality state', {
      eventType: event.type,
      currentMood: currentState.currentMood,
      adaptationLevel: currentState.adaptationLevel,
    });

    const updatedState = { ...currentState };

    // Add conversation turn to history
    updatedState.conversationHistory = [
      ...currentState.conversationHistory.slice(-10), // Keep last 10 turns
      {
        type: event.type,
        content: event.content,
        timestamp: new Date(),
        metadata: event.metadata,
      },
    ];

    // Update based on event type
    switch (event.type) {
      case 'question':
        updatedState.lastQuestionType = event.questionType || currentState.lastQuestionType;
        updatedState.consecutiveFollowUps = event.isFollowUp ? currentState.consecutiveFollowUps + 1 : 0;
        break;

      case 'response':
        updatedState.userEngagementLevel = this.calculateEngagementLevel(event, currentState);
        updatedState.currentMood = this.adaptMood(currentState, event);
        break;

      case 'follow_up':
        updatedState.consecutiveFollowUps = currentState.consecutiveFollowUps + 1;
        break;
    }

    // Update session progress
    if (event.sessionProgress !== undefined) {
      const validProgress = isNaN(event.sessionProgress) || !isFinite(event.sessionProgress) ? 0.0 : event.sessionProgress;
      updatedState.sessionProgress = Math.max(0.0, Math.min(1.0, validProgress));
    }

    // Calculate adaptation level
    updatedState.adaptationLevel = this.calculateAdaptationLevel(updatedState);

    return updatedState;
  }

  /**
   * Get personality-appropriate response style
   */
  static getResponseStyle(personality: AIPersonalityState): ResponseStyle {
    const { style, tone, formality, currentMood, encouragementLevel } = personality;

    return {
      greeting: this.getGreetingStyle(style, tone, formality),
      questionIntro: this.getQuestionIntroStyle(currentMood, encouragementLevel),
      followUpStyle: this.getFollowUpStyle(personality),
      encouragement: this.getEncouragementStyle(encouragementLevel, currentMood),
      closing: this.getClosingStyle(style, tone),
    };
  }

  /**
   * Determine if a follow-up question should be asked
   */
  static shouldAskFollowUp(
    personality: AIPersonalityState,
    responseQuality: number,
    responseLength: number
  ): boolean {
    const { followUpIntensity, consecutiveFollowUps, adaptiveness } = personality;

    // Validate inputs
    const validResponseQuality = isNaN(responseQuality) || !isFinite(responseQuality) ? 0.5 : responseQuality;
    const validResponseLength = isNaN(responseLength) || !isFinite(responseLength) ? 100 : responseLength;
    const validFollowUpIntensity = isNaN(followUpIntensity) || !isFinite(followUpIntensity) ? 0.5 : followUpIntensity;
    const validAdaptiveness = isNaN(adaptiveness) || !isFinite(adaptiveness) ? 0.5 : adaptiveness;

    // Don't ask too many consecutive follow-ups
    if (consecutiveFollowUps >= 2) {
      return false;
    }

    // Base probability on follow-up intensity
    let followUpProbability = validFollowUpIntensity;

    // Adjust based on response quality (lower quality = higher chance of follow-up)
    if (validResponseQuality < 0.5) {
      followUpProbability += 0.3;
    } else if (validResponseQuality > 0.8) {
      followUpProbability -= 0.2;
    }

    // Adjust based on response length (very short responses need follow-up)
    if (validResponseLength < 50) {
      followUpProbability += 0.4;
    } else if (validResponseLength > 300) {
      followUpProbability -= 0.1;
    }

    // Factor in adaptiveness
    followUpProbability *= (0.5 + validAdaptiveness * 0.5);

    const finalProbability = Math.max(0.1, Math.min(0.9, followUpProbability));
    return Math.random() < finalProbability;
  }

  /**
   * Get personality-specific question preferences
   */
  static getQuestionPreferences(personality: AIPersonalityState): QuestionPreferences {
    const { style, currentMood, sessionProgress } = personality;

    return {
      preferredTypes: this.getPreferredQuestionTypes(style, currentMood),
      difficultyProgression: this.getDifficultyProgression(sessionProgress),
      focusAreaWeights: this.getFocusAreaWeights(personality),
      timingPreferences: this.getTimingPreferences(style),
    };
  }

  // Private helper methods

  private static getInitialMood(config: AIPersonalityConfig): InterviewerMood {
    switch (config.tone) {
      case InterviewTone.FRIENDLY:
        return InterviewerMood.WELCOMING;
      case InterviewTone.ENCOURAGING:
        return InterviewerMood.ENCOURAGING;
      case InterviewTone.CHALLENGING:
        return InterviewerMood.ANALYTICAL;
      case InterviewTone.PROFESSIONAL:
        return InterviewerMood.PROFESSIONAL;
      default:
        return InterviewerMood.PROFESSIONAL;
    }
  }

  private static calculateEngagementLevel(
    event: ConversationEvent,
    currentState: AIPersonalityState
  ): number {
    let engagement = currentState.userEngagementLevel;

    if (event.type === 'response') {
      const responseLength = event.content.length;
      const confidence = event.metadata?.confidence || 0.5;
      const duration = event.metadata?.duration || 0;

      // Adjust based on response characteristics
      if (responseLength > 100 && confidence > 0.6) {
        engagement += 0.1;
      } else if (responseLength < 30 || confidence < 0.3) {
        engagement -= 0.1;
      }

      // Adjust based on response time (too fast or too slow might indicate issues)
      if (duration > 0) {
        const wordsPerMinute = (responseLength / 5) / (duration / 60); // Rough WPM calculation
        if (wordsPerMinute > 100 && wordsPerMinute < 200) {
          engagement += 0.05; // Good pace
        } else if (wordsPerMinute < 50 || wordsPerMinute > 300) {
          engagement -= 0.05; // Too slow or too fast
        }
      }
    }

    return Math.max(0.0, Math.min(1.0, engagement));
  }

  private static adaptMood(
    currentState: AIPersonalityState,
    event: ConversationEvent
  ): InterviewerMood {
    const { currentMood, userEngagementLevel, sessionProgress, adaptiveness } = currentState;

    // Only adapt if personality is adaptive enough
    if (adaptiveness < 0.3) {
      return currentMood;
    }

    // Adapt based on user engagement
    if (userEngagementLevel < 0.3) {
      return InterviewerMood.ENCOURAGING;
    } else if (userEngagementLevel > 0.7 && sessionProgress > 0.4) {
      return InterviewerMood.CHALLENGING;
    } else if (sessionProgress > 0.8) {
      return InterviewerMood.SUPPORTIVE;
    }

    return currentMood;
  }

  private static calculateAdaptationLevel(state: AIPersonalityState): number {
    const { adaptiveness, conversationHistory, sessionProgress } = state;
    
    // Ensure we have valid numeric values
    const validAdaptiveness = isNaN(adaptiveness) || !isFinite(adaptiveness) ? 0.5 : adaptiveness;
    const validSessionProgress = isNaN(sessionProgress) || !isFinite(sessionProgress) ? 0.0 : sessionProgress;
    
    // Base adaptation on conversation length and adaptiveness setting
    const conversationDepth = Math.min(1.0, conversationHistory.length / 20);
    const progressFactor = validSessionProgress;
    
    const result = Math.min(1.0, validAdaptiveness * (conversationDepth + progressFactor) / 2);
    
    // Ensure result is always a valid number
    return isNaN(result) || !isFinite(result) ? 0.0 : result;
  }

  private static getGreetingStyle(
    style: InterviewStyle,
    tone: InterviewTone,
    formality: FormalityLevel
  ): string {
    if (formality === FormalityLevel.VERY_FORMAL) {
      return "Good day. I'm pleased to conduct your interview today.";
    } else if (formality === FormalityLevel.CASUAL) {
      return "Hi there! Ready to get started with your interview?";
    } else if (tone === InterviewTone.FRIENDLY) {
      return "Hello! I'm looking forward to our conversation today.";
    } else {
      return "Hello, and thank you for your time today.";
    }
  }

  private static getQuestionIntroStyle(
    mood: InterviewerMood,
    encouragementLevel: number
  ): string {
    if (mood === InterviewerMood.ENCOURAGING && encouragementLevel > 0.7) {
      return "I'd love to hear about";
    } else if (mood === InterviewerMood.CHALLENGING) {
      return "Let's dive deeper into";
    } else if (mood === InterviewerMood.ANALYTICAL) {
      return "I'm interested in understanding";
    } else {
      return "Could you tell me about";
    }
  }

  private static getFollowUpStyle(personality: AIPersonalityState): string {
    const { currentMood, followUpIntensity } = personality;

    if (followUpIntensity > 0.7) {
      return "That's interesting. Can you elaborate on";
    } else if (currentMood === InterviewerMood.ENCOURAGING) {
      return "I'd like to understand more about";
    } else {
      return "Could you provide more details about";
    }
  }

  private static getEncouragementStyle(
    encouragementLevel: number,
    mood: InterviewerMood
  ): string[] {
    const encouragements: string[] = [];

    if (encouragementLevel > 0.6) {
      encouragements.push("That's a great example.");
      encouragements.push("I appreciate the detail you've provided.");
      encouragements.push("That shows good thinking.");
    }

    if (mood === InterviewerMood.ENCOURAGING) {
      encouragements.push("You're doing well.");
      encouragements.push("That's exactly the kind of insight I was looking for.");
    }

    return encouragements;
  }

  private static getClosingStyle(style: InterviewStyle, tone: InterviewTone): string {
    if (tone === InterviewTone.FRIENDLY) {
      return "Thank you for sharing that with me.";
    } else if (style === InterviewStyle.FORMAL) {
      return "I appreciate your response.";
    } else {
      return "Thank you.";
    }
  }

  private static getPreferredQuestionTypes(
    style: InterviewStyle,
    mood: InterviewerMood
  ): QuestionType[] {
    const types: QuestionType[] = [];

    if (style === InterviewStyle.STRUCTURED) {
      types.push(QuestionType.BEHAVIORAL, QuestionType.SITUATIONAL);
    } else if (style === InterviewStyle.CONVERSATIONAL) {
      types.push(QuestionType.BEHAVIORAL, QuestionType.CULTURE_FIT);
    }

    if (mood === InterviewerMood.CHALLENGING) {
      types.push(QuestionType.TECHNICAL, QuestionType.PROBLEM_SOLVING);
    } else if (mood === InterviewerMood.ANALYTICAL) {
      types.push(QuestionType.CASE_STUDY, QuestionType.SYSTEM_DESIGN);
    }

    return types.length > 0 ? types : [QuestionType.BEHAVIORAL];
  }

  private static getDifficultyProgression(sessionProgress: number): DifficultyLevel {
    if (sessionProgress < 0.3) {
      return DifficultyLevel.JUNIOR;
    } else if (sessionProgress < 0.7) {
      return DifficultyLevel.MID;
    } else {
      return DifficultyLevel.SENIOR;
    }
  }

  private static getFocusAreaWeights(personality: AIPersonalityState): Record<string, number> {
    const { currentMood, style } = personality;
    const weights: Record<string, number> = {};

    if (currentMood === InterviewerMood.ANALYTICAL) {
      weights['problem_solving'] = 0.3;
      weights['analytical_thinking'] = 0.3;
    } else if (currentMood === InterviewerMood.ENCOURAGING) {
      weights['communication'] = 0.3;
      weights['teamwork'] = 0.2;
    }

    if (style === InterviewStyle.STRUCTURED) {
      weights['leadership'] = 0.2;
      weights['results_orientation'] = 0.2;
    }

    return weights;
  }

  private static getTimingPreferences(style: InterviewStyle): TimingPreferences {
    return {
      questionPacing: style === InterviewStyle.CASUAL ? 'relaxed' : 'standard',
      allowLongerResponses: style === InterviewStyle.CONVERSATIONAL,
      followUpDelay: style === InterviewStyle.FORMAL ? 2000 : 1000, // ms
    };
  }
}

// Supporting interfaces
export interface ConversationEvent {
  type: 'question' | 'response' | 'follow_up';
  content: string;
  questionType?: QuestionType;
  isFollowUp?: boolean;
  sessionProgress?: number;
  metadata?: {
    confidence?: number;
    duration?: number;
    responseLength?: number;
    [key: string]: any;
  };
}

export interface ResponseStyle {
  greeting: string;
  questionIntro: string;
  followUpStyle: string;
  encouragement: string[];
  closing: string;
}

export interface QuestionPreferences {
  preferredTypes: QuestionType[];
  difficultyProgression: DifficultyLevel;
  focusAreaWeights: Record<string, number>;
  timingPreferences: TimingPreferences;
}

export interface TimingPreferences {
  questionPacing: 'fast' | 'standard' | 'relaxed';
  allowLongerResponses: boolean;
  followUpDelay: number; // milliseconds
}