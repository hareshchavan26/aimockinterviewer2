import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import {
  AIInterviewerService,
  QuestionGenerationContext,
  FollowUpContext,
  ResponseEvaluationContext,
  TechnicalEvaluationContext,
  DifficultyAdaptationContext,
  PersonalityAdaptationContext,
  GeneratedQuestion,
  ResponseEvaluation,
  TechnicalResponseEvaluation,
  AIPersonalityState,
  InterviewerMood,
  QuestionType,
  DifficultyLevel,
  FocusArea,
  AnswerStructure,
  CriteriaType,
  TechnicalDomain,
  TechnicalCategory,
  SkillImportance,
  AdaptationStrategy,
  TrendDirection,
  QuestionGenerationError,
  ResponseEvaluationError,
  TechnicalEvaluationError,
  DifficultyAdaptationError,
  PersonalityAdaptationError,
} from '../types/ai-interviewer';
import { logger } from '../utils/logger';

export class DefaultAIInterviewerService implements AIInterviewerService {
  private openai: OpenAI;
  private modelVersion: string = 'gpt-4';

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  async generateQuestion(context: QuestionGenerationContext): Promise<GeneratedQuestion> {
    try {
      logger.info('Generating question', {
        sessionId: context.sessionId,
        questionIndex: context.currentQuestionIndex,
        questionType: context.questionType,
        difficulty: context.difficulty,
      });

      const prompt = this.buildQuestionGenerationPrompt(context);
      
      const completion = await this.openai.chat.completions.create({
        model: this.modelVersion,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(context.personalityState),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new QuestionGenerationError('No response from OpenAI', context);
      }

      const question = this.parseQuestionResponse(response, context);
      
      logger.info('Question generated successfully', {
        sessionId: context.sessionId,
        questionId: question.id,
        questionType: question.type,
      });

      return question;
    } catch (error) {
      logger.error('Failed to generate question', {
        error,
        sessionId: context.sessionId,
        questionIndex: context.currentQuestionIndex,
      });
      
      if (error instanceof QuestionGenerationError) {
        throw error;
      }
      
      throw new QuestionGenerationError(
        `Failed to generate question: ${error instanceof Error ? error.message : String(error)}`,
        context
      );
    }
  }

  async generateFollowUpQuestion(context: FollowUpContext): Promise<GeneratedQuestion> {
    try {
      logger.info('Generating follow-up question', {
        sessionId: context.sessionId,
        originalQuestionId: context.originalQuestion.id,
      });

      const prompt = this.buildFollowUpPrompt(context);
      
      const completion = await this.openai.chat.completions.create({
        model: this.modelVersion,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(context.personalityState),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8, // Slightly higher temperature for more varied follow-ups
        max_tokens: 800,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new QuestionGenerationError('No response from OpenAI for follow-up');
      }

      const followUpQuestion = this.parseFollowUpResponse(response, context);
      
      logger.info('Follow-up question generated successfully', {
        sessionId: context.sessionId,
        questionId: followUpQuestion.id,
      });

      return followUpQuestion;
    } catch (error) {
      logger.error('Failed to generate follow-up question', {
        error,
        sessionId: context.sessionId,
      });
      
      throw new QuestionGenerationError(
        `Failed to generate follow-up question: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async evaluateResponse(context: ResponseEvaluationContext): Promise<ResponseEvaluation> {
    try {
      logger.info('Evaluating response', {
        sessionId: context.sessionId,
        questionId: context.question.id,
      });

      const prompt = this.buildEvaluationPrompt(context);
      
      const completion = await this.openai.chat.completions.create({
        model: this.modelVersion,
        messages: [
          {
            role: 'system',
            content: this.getEvaluationSystemPrompt(context.personalityState),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent evaluations
        max_tokens: 1500,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new ResponseEvaluationError('No response from OpenAI for evaluation', context);
      }

      const evaluation = this.parseEvaluationResponse(response, context);
      
      logger.info('Response evaluated successfully', {
        sessionId: context.sessionId,
        overallScore: evaluation.overallScore,
      });

      return evaluation;
    } catch (error) {
      logger.error('Failed to evaluate response', {
        error,
        sessionId: context.sessionId,
      });
      
      if (error instanceof ResponseEvaluationError) {
        throw error;
      }
      
      throw new ResponseEvaluationError(
        `Failed to evaluate response: ${error instanceof Error ? error.message : String(error)}`,
        context
      );
    }
  }

  async adaptPersonality(context: PersonalityAdaptationContext): Promise<AIPersonalityState> {
    try {
      logger.info('Adapting personality', {
        sessionId: context.sessionId,
        currentAdaptation: context.currentPersonality.adaptationLevel,
      });

      // Calculate adaptation based on session history and user engagement
      const adaptedPersonality = this.calculatePersonalityAdaptation(context);
      
      logger.info('Personality adapted successfully', {
        sessionId: context.sessionId,
        newAdaptationLevel: adaptedPersonality.adaptationLevel,
        newMood: adaptedPersonality.currentMood,
      });

      return adaptedPersonality;
    } catch (error) {
      logger.error('Failed to adapt personality', {
        error,
        sessionId: context.sessionId,
      });
      
      throw new PersonalityAdaptationError(
        `Failed to adapt personality: ${error instanceof Error ? error.message : String(error)}`,
        context
      );
    }
  }

  async evaluateTechnicalResponse(context: TechnicalEvaluationContext): Promise<TechnicalResponseEvaluation> {
    try {
      logger.info('Evaluating technical response', {
        sessionId: context.sessionId,
        questionId: context.question.id,
        technicalDomain: context.technicalDomain,
      });

      const prompt = this.buildTechnicalEvaluationPrompt(context);
      
      const completion = await this.openai.chat.completions.create({
        model: this.modelVersion,
        messages: [
          {
            role: 'system',
            content: this.getTechnicalEvaluationSystemPrompt(context),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2, // Lower temperature for more consistent technical evaluations
        max_tokens: 2000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new TechnicalEvaluationError('No response from OpenAI for technical evaluation', context);
      }

      const evaluation = this.parseTechnicalEvaluationResponse(response, context);
      
      logger.info('Technical response evaluated successfully', {
        sessionId: context.sessionId,
        overallScore: evaluation.overallScore,
        technicalAccuracy: evaluation.technicalAccuracy,
      });

      return evaluation;
    } catch (error) {
      logger.error('Failed to evaluate technical response', {
        error,
        sessionId: context.sessionId,
      });
      
      if (error instanceof TechnicalEvaluationError) {
        throw error;
      }
      
      throw new TechnicalEvaluationError(
        `Failed to evaluate technical response: ${error instanceof Error ? error.message : String(error)}`,
        context
      );
    }
  }

  async adaptDifficulty(context: DifficultyAdaptationContext): Promise<DifficultyLevel> {
    try {
      logger.info('Adapting difficulty level', {
        sessionId: context.sessionId,
        currentDifficulty: context.currentDifficulty,
        averageScore: context.performanceMetrics.averageScore,
      });

      const adaptedDifficulty = this.calculateDifficultyAdaptation(context);
      
      logger.info('Difficulty adapted successfully', {
        sessionId: context.sessionId,
        newDifficulty: adaptedDifficulty,
      });

      return adaptedDifficulty;
    } catch (error) {
      logger.error('Failed to adapt difficulty', {
        error,
        sessionId: context.sessionId,
      });
      
      throw new DifficultyAdaptationError(
        `Failed to adapt difficulty: ${error instanceof Error ? error.message : String(error)}`,
        context
      );
    }
  }

  private getSystemPrompt(personalityState: AIPersonalityState): string {
    const { name, style, tone, formality, currentMood } = personalityState;
    
    return `You are ${name}, an AI interviewer conducting a professional interview. 

Your personality characteristics:
- Style: ${style}
- Tone: ${tone}
- Formality: ${formality}
- Current mood: ${currentMood}
- Adaptiveness: ${personalityState.adaptiveness}
- Follow-up intensity: ${personalityState.followUpIntensity}
- Encouragement level: ${personalityState.encouragementLevel}

Guidelines:
1. Maintain consistency with your personality throughout the conversation
2. Ask clear, relevant questions appropriate for the interview context
3. Adapt your questioning style based on the candidate's responses
4. Be professional but approachable
5. Focus on gathering meaningful insights about the candidate's experience and skills
6. Generate questions that allow candidates to demonstrate their abilities

Always respond in a way that matches your personality characteristics and current mood.`;
  }

  private getEvaluationSystemPrompt(personalityState: AIPersonalityState): string {
    return `You are an expert interview evaluator with the personality of ${personalityState.name}.

Your evaluation should be:
1. Fair and objective
2. Constructive and helpful
3. Specific with actionable feedback
4. Consistent with professional interview standards
5. Aligned with the evaluation criteria provided

Provide detailed feedback that helps candidates improve while maintaining your personality characteristics.`;
  }

  private buildQuestionGenerationPrompt(context: QuestionGenerationContext): string {
    const { interviewConfig, currentQuestionIndex, previousResponses, questionType, difficulty, focusArea } = context;
    
    let prompt = `Generate an interview question for a ${interviewConfig.role} position in the ${interviewConfig.industry} industry.

Interview Details:
- Difficulty Level: ${difficulty || interviewConfig.difficulty}
- Question Type: ${questionType || 'behavioral'}
- Focus Area: ${focusArea || interviewConfig.focusAreas[0]}
- Question Number: ${currentQuestionIndex + 1}
- Total Duration: ${interviewConfig.duration} minutes

`;

    if (previousResponses.length > 0) {
      prompt += `Previous Questions and Responses:
${previousResponses.map((resp, idx) => 
  `${idx + 1}. Q: ${resp.questionText}
   A: ${resp.responseText ? resp.responseText.substring(0, 200) + '...' : 'Skipped'}
   Duration: ${resp.duration}s, Score: ${resp.evaluationScore || 'N/A'}`
).join('\n')}

`;
    }

    prompt += `Please generate a question that:
1. Is appropriate for the ${difficulty || interviewConfig.difficulty} level
2. Focuses on ${focusArea || interviewConfig.focusAreas[0]}
3. Builds naturally on previous responses (if any)
4. Allows the candidate to demonstrate relevant skills
5. Is clear and specific

Format your response as JSON with the following structure:
{
  "text": "The interview question",
  "category": "question category",
  "expectedStructure": "star|car|soar|free_form|structured",
  "timeLimit": 300,
  "context": "Additional context or background for the question",
  "evaluationCriteria": [
    {
      "name": "criteria name",
      "description": "what to evaluate",
      "weight": 0.3,
      "type": "content_quality|structure|communication|technical_accuracy|creativity|problem_solving|leadership"
    }
  ]
}`;

    return prompt;
  }

  private buildFollowUpPrompt(context: FollowUpContext): string {
    const { originalQuestion, userResponse, personalityState } = context;
    
    return `Based on the candidate's response, generate an appropriate follow-up question.

Original Question: "${originalQuestion.text}"
Candidate's Response: "${userResponse.responseText || 'No response provided'}"
Response Duration: ${userResponse.duration} seconds
Confidence Level: ${userResponse.confidence || 'Unknown'}

Your personality: ${personalityState.name} (${personalityState.tone}, ${personalityState.style})
Follow-up intensity: ${personalityState.followUpIntensity}

Generate a follow-up question that:
1. Digs deeper into their response
2. Clarifies any ambiguous points
3. Explores specific examples or details
4. Maintains the conversation flow
5. Matches your personality and follow-up intensity

Format as JSON:
{
  "text": "The follow-up question",
  "category": "follow_up",
  "timeLimit": 180,
  "context": "Why this follow-up is relevant"
}`;
  }

  private buildEvaluationPrompt(context: ResponseEvaluationContext): string {
    const { question, userResponse, evaluationCriteria } = context;
    
    return `Evaluate the candidate's response to the interview question.

Question: "${question.text}"
Expected Structure: ${question.expectedAnswerStructure || 'free_form'}
Response: "${userResponse.responseText || 'No response provided'}"
Duration: ${userResponse.duration} seconds

Evaluation Criteria:
${evaluationCriteria.map(criteria => 
  `- ${criteria.name} (${criteria.weight * 100}%): ${criteria.description}`
).join('\n')}

Provide a comprehensive evaluation with:
1. Overall score (0-100)
2. Individual criteria scores
3. Specific strengths identified
4. Areas for improvement
5. Actionable feedback

Format as JSON:
{
  "overallScore": 85,
  "criteriaScores": [
    {
      "criteriaName": "Content Quality",
      "score": 80,
      "feedback": "Specific feedback for this criteria"
    }
  ],
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Improvement area 1", "Improvement area 2"],
  "followUpSuggestions": ["Suggestion 1", "Suggestion 2"],
  "confidence": 0.9
}`;
  }

  private parseQuestionResponse(response: string, context: QuestionGenerationContext): GeneratedQuestion {
    try {
      const parsed = JSON.parse(response);
      
      return {
        id: uuidv4(),
        text: parsed.text,
        type: context.questionType || QuestionType.BEHAVIORAL,
        category: parsed.category || 'general',
        difficulty: context.difficulty || context.interviewConfig.difficulty,
        expectedAnswerStructure: this.parseAnswerStructure(parsed.expectedStructure),
        evaluationCriteria: this.parseEvaluationCriteria(parsed.evaluationCriteria || []),
        timeLimit: parsed.timeLimit || 300,
        context: parsed.context,
        followUpQuestions: parsed.followUpQuestions || [],
        metadata: {
          source: 'ai_generated',
          version: 1,
          usageCount: 0,
          generatedAt: new Date(),
          modelVersion: this.modelVersion,
        },
      };
    } catch (error) {
      // Fallback: create a basic question if JSON parsing fails
      logger.warn('Failed to parse question JSON, using fallback', { error, response });
      
      return {
        id: uuidv4(),
        text: response.includes('"text"') ? response : `Tell me about your experience with ${context.focusArea || 'problem solving'}.`,
        type: context.questionType || QuestionType.BEHAVIORAL,
        category: 'general',
        difficulty: context.difficulty || context.interviewConfig.difficulty,
        evaluationCriteria: this.getDefaultEvaluationCriteria(),
        timeLimit: 300,
        metadata: {
          source: 'ai_generated_fallback',
          version: 1,
          usageCount: 0,
          generatedAt: new Date(),
          modelVersion: this.modelVersion,
        },
      };
    }
  }

  private parseFollowUpResponse(response: string, context: FollowUpContext): GeneratedQuestion {
    try {
      const parsed = JSON.parse(response);
      
      return {
        id: uuidv4(),
        text: parsed.text,
        type: context.originalQuestion.type,
        category: 'follow_up',
        difficulty: context.originalQuestion.difficulty,
        evaluationCriteria: context.originalQuestion.evaluationCriteria,
        timeLimit: parsed.timeLimit || 180,
        context: parsed.context,
        metadata: {
          source: 'ai_generated_followup',
          version: 1,
          usageCount: 0,
          generatedAt: new Date(),
          modelVersion: this.modelVersion,
        },
      };
    } catch (error) {
      // Fallback follow-up question
      return {
        id: uuidv4(),
        text: "Can you provide more specific details about that experience?",
        type: context.originalQuestion.type,
        category: 'follow_up',
        difficulty: context.originalQuestion.difficulty,
        evaluationCriteria: context.originalQuestion.evaluationCriteria,
        timeLimit: 180,
        metadata: {
          source: 'ai_generated_followup_fallback',
          version: 1,
          usageCount: 0,
          generatedAt: new Date(),
          modelVersion: this.modelVersion,
        },
      };
    }
  }

  private parseEvaluationResponse(response: string, context: ResponseEvaluationContext): ResponseEvaluation {
    try {
      const parsed = JSON.parse(response);
      
      return {
        overallScore: Math.max(0, Math.min(100, parsed.overallScore || 0)),
        criteriaScores: (parsed.criteriaScores || []).map((score: any) => ({
          criteriaId: uuidv4(),
          criteriaName: score.criteriaName || 'General',
          score: Math.max(0, Math.min(100, score.score || 0)),
          feedback: score.feedback || 'No specific feedback provided',
          weight: 1.0 / (parsed.criteriaScores?.length || 1),
        })),
        strengths: parsed.strengths || [],
        improvements: parsed.improvements || [],
        followUpSuggestions: parsed.followUpSuggestions || [],
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        metadata: {
          processingTime: Date.now(),
          modelVersion: this.modelVersion,
          confidence: parsed.confidence || 0.5,
          flags: [],
        },
      };
    } catch (error) {
      // Fallback evaluation
      return {
        overallScore: 50,
        criteriaScores: [{
          criteriaId: uuidv4(),
          criteriaName: 'General Response',
          score: 50,
          feedback: 'Unable to provide detailed evaluation due to parsing error',
          weight: 1.0,
        }],
        strengths: ['Provided a response'],
        improvements: ['Could provide more specific details'],
        followUpSuggestions: ['Consider using the STAR method for behavioral questions'],
        confidence: 0.3,
        metadata: {
          processingTime: Date.now(),
          modelVersion: this.modelVersion,
          confidence: 0.3,
          flags: ['parsing_error'],
        },
      };
    }
  }

  private calculatePersonalityAdaptation(context: PersonalityAdaptationContext): AIPersonalityState {
    const { currentPersonality, sessionHistory, interviewConfig } = context;
    
    // Calculate user engagement based on response patterns
    const avgResponseTime = sessionHistory.reduce((sum, resp) => sum + resp.duration, 0) / sessionHistory.length || 0;
    const avgConfidence = sessionHistory.reduce((sum, resp) => sum + (resp.confidence || 0.5), 0) / sessionHistory.length || 0.5;
    const skipRate = sessionHistory.filter(resp => resp.isSkipped).length / sessionHistory.length || 0;
    
    // Determine engagement level
    let userEngagementLevel = 0.5; // Default neutral
    if (avgConfidence > 0.7 && skipRate < 0.1) {
      userEngagementLevel = 0.8; // High engagement
    } else if (avgConfidence < 0.3 || skipRate > 0.3) {
      userEngagementLevel = 0.2; // Low engagement
    }
    
    // Adapt mood based on engagement and progress
    const sessionProgress = sessionHistory.length / (interviewConfig.duration / 5); // Assuming ~5 min per question
    let newMood = currentPersonality.currentMood;
    
    if (userEngagementLevel < 0.3) {
      newMood = InterviewerMood.ENCOURAGING;
    } else if (userEngagementLevel > 0.7 && sessionProgress > 0.5) {
      newMood = InterviewerMood.CHALLENGING;
    } else if (sessionProgress < 0.3) {
      newMood = InterviewerMood.WELCOMING;
    }
    
    // Calculate adaptation level
    const adaptationIncrement = currentPersonality.adaptiveness * 0.1;
    const newAdaptationLevel = Math.min(1.0, currentPersonality.adaptationLevel + adaptationIncrement);
    
    return {
      ...currentPersonality,
      currentMood: newMood,
      adaptationLevel: newAdaptationLevel,
      userEngagementLevel,
      sessionProgress: Math.min(1.0, sessionProgress),
      conversationHistory: [
        ...currentPersonality.conversationHistory,
        {
          type: 'response',
          content: `Adaptation: engagement=${userEngagementLevel.toFixed(2)}, progress=${sessionProgress.toFixed(2)}`,
          timestamp: new Date(),
          metadata: { adaptationEvent: true },
        },
      ],
    };
  }

  private parseAnswerStructure(structure: string): AnswerStructure {
    switch (structure?.toLowerCase()) {
      case 'star': return AnswerStructure.STAR;
      case 'car': return AnswerStructure.CAR;
      case 'soar': return AnswerStructure.SOAR;
      case 'structured': return AnswerStructure.STRUCTURED;
      default: return AnswerStructure.FREE_FORM;
    }
  }

  private parseEvaluationCriteria(criteria: any[]): any[] {
    return criteria.map(c => ({
      id: uuidv4(),
      name: c.name || 'General',
      description: c.description || 'General evaluation',
      weight: c.weight || 0.25,
      type: this.parseCriteriaType(c.type),
      expectedKeywords: c.expectedKeywords || [],
      scoringRubric: c.scoringRubric || this.getDefaultScoringRubric(),
    }));
  }

  private parseCriteriaType(type: string): CriteriaType {
    switch (type?.toLowerCase()) {
      case 'content_quality': return CriteriaType.CONTENT_QUALITY;
      case 'structure': return CriteriaType.STRUCTURE;
      case 'communication': return CriteriaType.COMMUNICATION;
      case 'technical_accuracy': return CriteriaType.TECHNICAL_ACCURACY;
      case 'creativity': return CriteriaType.CREATIVITY;
      case 'problem_solving': return CriteriaType.PROBLEM_SOLVING;
      case 'leadership': return CriteriaType.LEADERSHIP;
      default: return CriteriaType.CONTENT_QUALITY;
    }
  }

  private getDefaultEvaluationCriteria(): any[] {
    return [
      {
        id: uuidv4(),
        name: 'Content Quality',
        description: 'Relevance and depth of the response',
        weight: 0.4,
        type: CriteriaType.CONTENT_QUALITY,
        expectedKeywords: [],
        scoringRubric: this.getDefaultScoringRubric(),
      },
      {
        id: uuidv4(),
        name: 'Communication',
        description: 'Clarity and articulation of ideas',
        weight: 0.3,
        type: CriteriaType.COMMUNICATION,
        expectedKeywords: [],
        scoringRubric: this.getDefaultScoringRubric(),
      },
      {
        id: uuidv4(),
        name: 'Structure',
        description: 'Organization and flow of the response',
        weight: 0.3,
        type: CriteriaType.STRUCTURE,
        expectedKeywords: [],
        scoringRubric: this.getDefaultScoringRubric(),
      },
    ];
  }

  private getDefaultScoringRubric(): any[] {
    return [
      { score: 1, description: 'Poor', indicators: ['Unclear', 'Irrelevant', 'Incomplete'] },
      { score: 2, description: 'Below Average', indicators: ['Somewhat unclear', 'Partially relevant'] },
      { score: 3, description: 'Average', indicators: ['Clear', 'Relevant', 'Complete'] },
      { score: 4, description: 'Good', indicators: ['Very clear', 'Highly relevant', 'Well-structured'] },
      { score: 5, description: 'Excellent', indicators: ['Exceptional clarity', 'Perfectly relevant', 'Outstanding structure'] },
    ];
  }

  private getTechnicalEvaluationSystemPrompt(context: TechnicalEvaluationContext): string {
    const { roleSpecificCriteria, technicalDomain } = context;
    
    return `You are an expert technical interviewer and evaluator specializing in ${technicalDomain}.

Role-specific evaluation context:
- Role: ${roleSpecificCriteria.role}
- Industry: ${roleSpecificCriteria.industry}
- Technical Domain: ${technicalDomain}

Required Skills Assessment:
${roleSpecificCriteria.requiredSkills.map(skill => 
  `- ${skill.name} (${skill.importance}): ${skill.assessmentCriteria.join(', ')}`
).join('\n')}

Your evaluation should assess:
1. Technical accuracy and correctness
2. Completeness of the solution
3. Code quality and best practices (if applicable)
4. Problem-solving approach
5. Role-specific competencies
6. Appropriate difficulty level for the candidate

Provide detailed, constructive feedback that helps candidates improve their technical skills while maintaining professional standards.`;
  }

  private buildTechnicalEvaluationPrompt(context: TechnicalEvaluationContext): string {
    const { question, userResponse, roleSpecificCriteria, expectedSolution } = context;
    
    let prompt = `Evaluate this technical interview response comprehensively.

Question: "${question.text}"
Question Type: ${question.type}
Difficulty Level: ${question.difficulty}

Candidate Response: "${userResponse.responseText || 'No response provided'}"
Response Duration: ${userResponse.duration} seconds
Confidence Level: ${userResponse.confidence || 'Unknown'}

Role-Specific Evaluation Criteria:
${roleSpecificCriteria.requiredSkills.map(skill => 
  `- ${skill.name} (${skill.importance}): Look for ${skill.keywords.join(', ')}`
).join('\n')}

`;

    if (expectedSolution) {
      prompt += `Expected Solution Context:
- Description: ${expectedSolution.description}
- Key Components: ${expectedSolution.keyComponents.join(', ')}
- Alternative Approaches: ${expectedSolution.alternativeApproaches.join(', ')}
- Common Mistakes: ${expectedSolution.commonMistakes.join(', ')}
${expectedSolution.timeComplexity ? `- Expected Time Complexity: ${expectedSolution.timeComplexity}` : ''}
${expectedSolution.spaceComplexity ? `- Expected Space Complexity: ${expectedSolution.spaceComplexity}` : ''}

`;
    }

    prompt += `Provide a comprehensive technical evaluation with:
1. Overall score (0-100)
2. Technical accuracy score (0-100)
3. Completeness score (0-100)
4. Role-specific skill scores
5. Code quality metrics (if code was provided)
6. Algorithmic complexity analysis (if applicable)
7. Difficulty assessment
8. Adaptation recommendation

Format as JSON:
{
  "overallScore": 85,
  "technicalAccuracy": 90,
  "completeness": 80,
  "criteriaScores": [
    {
      "criteriaName": "Technical Accuracy",
      "score": 90,
      "feedback": "Detailed feedback"
    }
  ],
  "roleSpecificScores": [
    {
      "skillName": "Algorithm Design",
      "score": 85,
      "importance": "high",
      "feedback": "Good understanding demonstrated",
      "examples": ["Correctly identified optimal approach"]
    }
  ],
  "codeQuality": {
    "readability": 85,
    "maintainability": 80,
    "efficiency": 90,
    "bestPractices": 75,
    "errorHandling": 70
  },
  "algorithmicComplexity": {
    "timeComplexity": "O(n log n)",
    "spaceComplexity": "O(n)",
    "isOptimal": true,
    "improvementSuggestions": []
  },
  "difficultyAssessment": {
    "perceivedDifficulty": "mid",
    "actualPerformance": 85,
    "isAppropriate": true,
    "reasoning": "Performance matches expected level"
  },
  "adaptationRecommendation": {
    "recommendedLevel": "senior",
    "confidence": 0.8,
    "reasoning": "Strong performance suggests readiness for harder questions",
    "adaptationStrategy": "increase_difficulty"
  },
  "strengths": ["Strong algorithmic thinking", "Clean code structure"],
  "improvements": ["Could improve error handling", "Consider edge cases"],
  "followUpSuggestions": ["Ask about optimization", "Explore alternative approaches"],
  "confidence": 0.9
}`;

    return prompt;
  }

  private parseTechnicalEvaluationResponse(response: string, context: TechnicalEvaluationContext): TechnicalResponseEvaluation {
    try {
      const parsed = JSON.parse(response);
      
      return {
        overallScore: Math.max(0, Math.min(100, parsed.overallScore || 0)),
        technicalAccuracy: Math.max(0, Math.min(100, parsed.technicalAccuracy || 0)),
        completeness: Math.max(0, Math.min(100, parsed.completeness || 0)),
        criteriaScores: (parsed.criteriaScores || []).map((score: any) => ({
          criteriaId: uuidv4(),
          criteriaName: score.criteriaName || 'General',
          score: Math.max(0, Math.min(100, score.score || 0)),
          feedback: score.feedback || 'No specific feedback provided',
          weight: 1.0 / (parsed.criteriaScores?.length || 1),
        })),
        roleSpecificScores: (parsed.roleSpecificScores || []).map((score: any) => ({
          skillName: score.skillName || 'General Skill',
          score: Math.max(0, Math.min(100, score.score || 0)),
          importance: this.parseSkillImportance(score.importance),
          feedback: score.feedback || 'No feedback provided',
          examples: score.examples || [],
        })),
        codeQuality: parsed.codeQuality ? {
          readability: Math.max(0, Math.min(100, parsed.codeQuality.readability || 0)),
          maintainability: Math.max(0, Math.min(100, parsed.codeQuality.maintainability || 0)),
          efficiency: Math.max(0, Math.min(100, parsed.codeQuality.efficiency || 0)),
          bestPractices: Math.max(0, Math.min(100, parsed.codeQuality.bestPractices || 0)),
          errorHandling: Math.max(0, Math.min(100, parsed.codeQuality.errorHandling || 0)),
        } : undefined,
        algorithmicComplexity: parsed.algorithmicComplexity ? {
          timeComplexity: parsed.algorithmicComplexity.timeComplexity || 'Unknown',
          spaceComplexity: parsed.algorithmicComplexity.spaceComplexity || 'Unknown',
          isOptimal: parsed.algorithmicComplexity.isOptimal || false,
          improvementSuggestions: parsed.algorithmicComplexity.improvementSuggestions || [],
        } : undefined,
        difficultyAssessment: {
          perceivedDifficulty: this.parseDifficultyLevel(parsed.difficultyAssessment?.perceivedDifficulty),
          actualPerformance: Math.max(0, Math.min(100, parsed.difficultyAssessment?.actualPerformance || 0)),
          isAppropriate: parsed.difficultyAssessment?.isAppropriate || false,
          reasoning: parsed.difficultyAssessment?.reasoning || 'No reasoning provided',
        },
        adaptationRecommendation: {
          recommendedLevel: this.parseDifficultyLevel(parsed.adaptationRecommendation?.recommendedLevel),
          confidence: Math.max(0, Math.min(1, parsed.adaptationRecommendation?.confidence || 0.5)),
          reasoning: parsed.adaptationRecommendation?.reasoning || 'No reasoning provided',
          adaptationStrategy: this.parseAdaptationStrategy(parsed.adaptationRecommendation?.adaptationStrategy),
        },
        strengths: parsed.strengths || [],
        improvements: parsed.improvements || [],
        followUpSuggestions: parsed.followUpSuggestions || [],
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        metadata: {
          processingTime: Date.now(),
          modelVersion: this.modelVersion,
          confidence: parsed.confidence || 0.5,
          flags: [],
        },
      };
    } catch (error) {
      // Fallback technical evaluation
      logger.warn('Failed to parse technical evaluation JSON, using fallback', { error, response });
      
      return {
        overallScore: 50,
        technicalAccuracy: 50,
        completeness: 50,
        criteriaScores: [{
          criteriaId: uuidv4(),
          criteriaName: 'Technical Response',
          score: 50,
          feedback: 'Unable to provide detailed technical evaluation due to parsing error',
          weight: 1.0,
        }],
        roleSpecificScores: [{
          skillName: 'General Technical Skills',
          score: 50,
          importance: SkillImportance.MEDIUM,
          feedback: 'Unable to assess specific skills due to parsing error',
          examples: [],
        }],
        difficultyAssessment: {
          perceivedDifficulty: context.question.difficulty,
          actualPerformance: 50,
          isAppropriate: true,
          reasoning: 'Unable to assess difficulty appropriateness due to parsing error',
        },
        adaptationRecommendation: {
          recommendedLevel: context.question.difficulty,
          confidence: 0.3,
          reasoning: 'Unable to provide adaptation recommendation due to parsing error',
          adaptationStrategy: AdaptationStrategy.MAINTAIN_LEVEL,
        },
        strengths: ['Provided a response'],
        improvements: ['Could provide more technical details'],
        followUpSuggestions: ['Consider asking for clarification on technical concepts'],
        confidence: 0.3,
        metadata: {
          processingTime: Date.now(),
          modelVersion: this.modelVersion,
          confidence: 0.3,
          flags: ['parsing_error'],
        },
      };
    }
  }

  private calculateDifficultyAdaptation(context: DifficultyAdaptationContext): DifficultyLevel {
    const { currentDifficulty, performanceMetrics, sessionHistory } = context;
    
    // Calculate performance indicators
    const avgScore = performanceMetrics.averageScore;
    const scoreVariance = performanceMetrics.scoreVariance;
    const confidenceLevel = performanceMetrics.confidenceLevel;
    const improvementTrend = performanceMetrics.improvementTrend;
    
    // Define difficulty thresholds
    const EXCELLENT_THRESHOLD = 85;
    const GOOD_THRESHOLD = 70;
    const POOR_THRESHOLD = 50;
    
    // Determine adaptation strategy
    let recommendedLevel = currentDifficulty;
    
    if (avgScore >= EXCELLENT_THRESHOLD && confidenceLevel > 0.7 && scoreVariance < 15) {
      // Consistently excellent performance - increase difficulty
      recommendedLevel = this.getNextDifficultyLevel(currentDifficulty, true);
    } else if (avgScore < POOR_THRESHOLD || confidenceLevel < 0.3) {
      // Poor performance - decrease difficulty
      recommendedLevel = this.getNextDifficultyLevel(currentDifficulty, false);
    } else if (avgScore >= GOOD_THRESHOLD && improvementTrend === TrendDirection.IMPROVING) {
      // Good performance with improvement trend - slight increase
      if (sessionHistory.length >= 3) {
        recommendedLevel = this.getNextDifficultyLevel(currentDifficulty, true);
      }
    } else if (improvementTrend === TrendDirection.DECLINING && avgScore < GOOD_THRESHOLD) {
      // Declining performance - decrease difficulty
      recommendedLevel = this.getNextDifficultyLevel(currentDifficulty, false);
    }
    
    return recommendedLevel;
  }

  private getNextDifficultyLevel(current: DifficultyLevel, increase: boolean): DifficultyLevel {
    const levels = [
      DifficultyLevel.ENTRY,
      DifficultyLevel.JUNIOR,
      DifficultyLevel.MID,
      DifficultyLevel.SENIOR,
      DifficultyLevel.PRINCIPAL,
      DifficultyLevel.EXECUTIVE,
    ];
    
    const currentIndex = levels.indexOf(current);
    if (currentIndex === -1) return current;
    
    if (increase) {
      return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : current;
    } else {
      return currentIndex > 0 ? levels[currentIndex - 1] : current;
    }
  }

  private parseSkillImportance(importance: string): SkillImportance {
    switch (importance?.toLowerCase()) {
      case 'critical': return SkillImportance.CRITICAL;
      case 'high': return SkillImportance.HIGH;
      case 'medium': return SkillImportance.MEDIUM;
      case 'low': return SkillImportance.LOW;
      case 'nice_to_have': return SkillImportance.NICE_TO_HAVE;
      default: return SkillImportance.MEDIUM;
    }
  }

  private parseDifficultyLevel(level: string): DifficultyLevel {
    switch (level?.toLowerCase()) {
      case 'entry': return DifficultyLevel.ENTRY;
      case 'junior': return DifficultyLevel.JUNIOR;
      case 'mid': return DifficultyLevel.MID;
      case 'senior': return DifficultyLevel.SENIOR;
      case 'principal': return DifficultyLevel.PRINCIPAL;
      case 'executive': return DifficultyLevel.EXECUTIVE;
      default: return DifficultyLevel.MID;
    }
  }

  private parseAdaptationStrategy(strategy: string): AdaptationStrategy {
    switch (strategy?.toLowerCase()) {
      case 'increase_difficulty': return AdaptationStrategy.INCREASE_DIFFICULTY;
      case 'decrease_difficulty': return AdaptationStrategy.DECREASE_DIFFICULTY;
      case 'maintain_level': return AdaptationStrategy.MAINTAIN_LEVEL;
      case 'focus_on_weak_areas': return AdaptationStrategy.FOCUS_ON_WEAK_AREAS;
      case 'broaden_scope': return AdaptationStrategy.BROADEN_SCOPE;
      default: return AdaptationStrategy.MAINTAIN_LEVEL;
    }
  }
}