import { DefaultAIInterviewerService } from '../services/ai-interviewer-service';
import { PersonalityManager } from '../services/personality-manager';
import {
  QuestionGenerationContext,
  FollowUpContext,
  ResponseEvaluationContext,
  AIPersonalityConfig,
  QuestionType,
  DifficultyLevel,
  FocusArea,
  InterviewStyle,
  InterviewTone,
  FormalityLevel,
} from '../types/ai-interviewer';

/**
 * Demo script showing AI interviewer functionality
 * This demonstrates the core features without requiring a full server setup
 */
async function runAIInterviewerDemo() {
  console.log('🤖 AI Interviewer Demo Starting...\n');

  // Initialize AI interviewer service
  const aiService = new DefaultAIInterviewerService();

  // 1. Create AI personality configuration
  console.log('1. Creating AI Personality Configuration...');
  const personalityConfig: AIPersonalityConfig = {
    name: 'Sarah Chen',
    style: InterviewStyle.CONVERSATIONAL,
    tone: InterviewTone.PROFESSIONAL,
    formality: FormalityLevel.SEMI_FORMAL,
    adaptiveness: 0.7,
    followUpIntensity: 0.6,
    encouragementLevel: 0.8,
  };

  // Initialize personality state
  const personalityState = PersonalityManager.initializePersonality(personalityConfig);
  console.log(`✅ Initialized personality: ${personalityState.name}`);
  console.log(`   Style: ${personalityState.style}, Tone: ${personalityState.tone}`);
  console.log(`   Current Mood: ${personalityState.currentMood}\n`);

  // 2. Generate initial interview question
  console.log('2. Generating Initial Interview Question...');
  const questionContext: QuestionGenerationContext = {
    sessionId: 'demo-session-123',
    userId: 'demo-user-456',
    interviewConfig: {
      id: 'demo-config',
      role: 'Senior Software Engineer',
      industry: 'Technology',
      difficulty: DifficultyLevel.SENIOR,
      duration: 60,
      questionTypes: [QuestionType.BEHAVIORAL, QuestionType.TECHNICAL],
      focusAreas: [FocusArea.LEADERSHIP, FocusArea.PROBLEM_SOLVING],
      aiPersonality: personalityConfig,
    },
    currentQuestionIndex: 0,
    previousResponses: [],
    personalityState,
    questionType: QuestionType.BEHAVIORAL,
    difficulty: DifficultyLevel.SENIOR,
    focusArea: FocusArea.LEADERSHIP,
  };

  try {
    const question = await aiService.generateQuestion(questionContext);
    console.log('✅ Generated Question:');
    console.log(`   Type: ${question.type}`);
    console.log(`   Category: ${question.category}`);
    console.log(`   Text: "${question.text}"`);
    console.log(`   Time Limit: ${question.timeLimit} seconds`);
    console.log(`   Evaluation Criteria: ${question.evaluationCriteria.length} criteria\n`);

    // 3. Simulate user response
    console.log('3. Simulating User Response...');
    const mockUserResponse = {
      questionId: question.id,
      questionText: question.text,
      responseText: "In my previous role as a team lead, I faced a situation where our team was struggling to meet a critical deadline for a major client project. The challenge was that we had underestimated the complexity of integrating with a third-party API, and morale was low. I took action by first conducting one-on-one meetings with each team member to understand their specific blockers and concerns. Then I reorganized our sprint to focus on the most critical features first, brought in a senior developer from another team to help with the API integration, and implemented daily stand-ups to track progress more closely. As a result, we delivered the project on time, and the team felt more confident in handling similar challenges in the future.",
      duration: 180, // 3 minutes
      confidence: 0.8,
      isSkipped: false,
      timestamp: new Date(),
      evaluationScore: undefined,
      keyPoints: ['leadership', 'problem-solving', 'team management', 'deadline pressure'],
    };

    console.log('📝 Mock User Response:');
    console.log(`   Duration: ${mockUserResponse.duration} seconds`);
    console.log(`   Confidence: ${mockUserResponse.confidence}`);
    console.log(`   Response: "${mockUserResponse.responseText.substring(0, 100)}..."\n`);

    // 4. Evaluate the response
    console.log('4. Evaluating User Response...');
    const evaluationContext: ResponseEvaluationContext = {
      sessionId: questionContext.sessionId,
      question,
      userResponse: mockUserResponse,
      evaluationCriteria: question.evaluationCriteria,
      personalityState,
    };

    const evaluation = await aiService.evaluateResponse(evaluationContext);
    console.log('✅ Response Evaluation:');
    console.log(`   Overall Score: ${evaluation.overallScore}/100`);
    console.log(`   Confidence: ${evaluation.confidence}`);
    console.log(`   Strengths: ${evaluation.strengths.join(', ')}`);
    console.log(`   Improvements: ${evaluation.improvements.join(', ')}`);
    console.log(`   Criteria Scores:`);
    evaluation.criteriaScores.forEach(score => {
      console.log(`     - ${score.criteriaName}: ${score.score}/100`);
    });
    console.log();

    // 5. Determine if follow-up is needed
    console.log('5. Determining Follow-up Strategy...');
    const shouldFollowUp = PersonalityManager.shouldAskFollowUp(
      personalityState,
      evaluation.overallScore / 100,
      mockUserResponse.responseText.length
    );

    console.log(`🤔 Should ask follow-up: ${shouldFollowUp}`);

    if (shouldFollowUp) {
      // 6. Generate follow-up question
      console.log('6. Generating Follow-up Question...');
      const followUpContext: FollowUpContext = {
        sessionId: questionContext.sessionId,
        userId: questionContext.userId,
        originalQuestion: question,
        userResponse: mockUserResponse,
        personalityState,
        interviewConfig: questionContext.interviewConfig,
      };

      const followUpQuestion = await aiService.generateFollowUpQuestion(followUpContext);
      console.log('✅ Generated Follow-up Question:');
      console.log(`   Text: "${followUpQuestion.text}"`);
      console.log(`   Time Limit: ${followUpQuestion.timeLimit} seconds\n`);
    }

    // 7. Adapt personality based on interaction
    console.log('7. Adapting AI Personality...');
    const adaptationContext = {
      sessionId: questionContext.sessionId,
      userId: questionContext.userId,
      interviewConfig: questionContext.interviewConfig,
      sessionHistory: [mockUserResponse],
      currentPersonality: personalityState,
    };

    const adaptedPersonality = await aiService.adaptPersonality(adaptationContext);
    console.log('✅ Personality Adaptation:');
    console.log(`   New Mood: ${adaptedPersonality.currentMood}`);
    console.log(`   Adaptation Level: ${adaptedPersonality.adaptationLevel.toFixed(2)}`);
    console.log(`   User Engagement: ${adaptedPersonality.userEngagementLevel.toFixed(2)}`);
    console.log(`   Session Progress: ${adaptedPersonality.sessionProgress.toFixed(2)}\n`);

    // 8. Get response style recommendations
    console.log('8. Getting Response Style Recommendations...');
    const responseStyle = PersonalityManager.getResponseStyle(adaptedPersonality);
    console.log('✅ Response Style:');
    console.log(`   Greeting: "${responseStyle.greeting}"`);
    console.log(`   Question Intro: "${responseStyle.questionIntro}"`);
    console.log(`   Follow-up Style: "${responseStyle.followUpStyle}"`);
    console.log(`   Encouragement Options: ${responseStyle.encouragement.length} phrases`);
    console.log(`   Closing: "${responseStyle.closing}"\n`);

    console.log('🎉 AI Interviewer Demo Completed Successfully!');
    console.log('\nKey Features Demonstrated:');
    console.log('✓ AI personality initialization and configuration');
    console.log('✓ Dynamic question generation based on context');
    console.log('✓ Intelligent response evaluation with detailed feedback');
    console.log('✓ Adaptive follow-up question generation');
    console.log('✓ Personality adaptation based on user interaction');
    console.log('✓ Context-aware response styling');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    console.log('\nNote: This demo requires OpenAI API access.');
    console.log('Set OPENAI_API_KEY environment variable to run with real AI.');
    console.log('The demo shows the structure and flow even without API access.');
  }
}

// Export for use in other files
export { runAIInterviewerDemo };

// Run demo if this file is executed directly
if (require.main === module) {
  runAIInterviewerDemo().catch(console.error);
}