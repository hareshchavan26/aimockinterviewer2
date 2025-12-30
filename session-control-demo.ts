/**
 * Session Control Functionality Demo
 * 
 * This example demonstrates how to use the enhanced session control features
 * including pause/resume/skip operations, time limit enforcement, and session state management.
 */

import { DefaultInterviewConfigService } from '../services/interview-config-service';
import { SessionAction, SessionState } from '../types/interview-config';

// Mock repository for demo purposes
const mockRepository = {} as any;
const sessionService = new DefaultInterviewConfigService(mockRepository);

/**
 * Example: Starting and controlling an interview session
 */
async function sessionControlDemo() {
  const sessionId = 'demo-session-123';
  
  console.log('=== Session Control Demo ===\n');

  try {
    // 1. Start the session
    console.log('1. Starting interview session...');
    const startedSession = await sessionService.controlSession(sessionId, {
      action: SessionAction.START,
      metadata: {
        startReason: 'user_initiated',
        deviceType: 'desktop',
      },
    });
    console.log(`   Session state: ${startedSession.state}`);
    console.log(`   Started at: ${startedSession.startedAt}\n`);

    // 2. Get session status with time information
    console.log('2. Checking session status...');
    const status = await sessionService.getSessionStatus(sessionId);
    console.log(`   Current question: ${status.progress.currentQuestionIndex + 1}/${status.progress.totalQuestions}`);
    console.log(`   Progress: ${status.progress.progressPercentage}%`);
    console.log(`   Session time remaining: ${status.timeStatus.sessionTimeRemaining} seconds`);
    console.log(`   Question time remaining: ${status.timeStatus.questionTimeRemaining} seconds\n`);

    // 3. Pause the session
    console.log('3. Pausing session...');
    const pausedSession = await sessionService.controlSession(sessionId, {
      action: SessionAction.PAUSE,
      metadata: {
        pauseReason: 'user_requested',
      },
    });
    console.log(`   Session state: ${pausedSession.state}`);
    console.log(`   Paused at: ${pausedSession.pausedAt}\n`);

    // 4. Resume the session
    console.log('4. Resuming session...');
    const resumedSession = await sessionService.controlSession(sessionId, {
      action: SessionAction.RESUME,
      metadata: {
        resumeReason: 'user_requested',
      },
    });
    console.log(`   Session state: ${resumedSession.state}`);
    console.log(`   Resumed at: ${resumedSession.resumedAt}\n`);

    // 5. Skip a question
    console.log('5. Skipping current question...');
    const skippedSession = await sessionService.controlSession(sessionId, {
      action: SessionAction.SKIP_QUESTION,
      metadata: {
        reason: 'too_difficult',
      },
    });
    console.log(`   Current question index: ${skippedSession.currentQuestionIndex}`);
    console.log(`   Skip count: ${skippedSession.metadata.skipCount}\n`);

    // 6. End the session
    console.log('6. Ending session...');
    const endedSession = await sessionService.controlSession(sessionId, {
      action: SessionAction.END,
      metadata: {
        endReason: 'completed_successfully',
      },
    });
    console.log(`   Session state: ${endedSession.state}`);
    console.log(`   Completed at: ${endedSession.completedAt}`);
    console.log(`   Total duration: ${endedSession.duration} seconds\n`);

  } catch (error) {
    console.error('Session control error:', error);
  }
}

/**
 * Example: Time limit enforcement scenarios
 */
async function timeLimitDemo() {
  console.log('=== Time Limit Enforcement Demo ===\n');

  const sessionId = 'time-demo-session-456';

  try {
    // Get session status to check time limits
    const status = await sessionService.getSessionStatus(sessionId);
    
    console.log('Time Status:');
    console.log(`  Session time exceeded: ${status.timeStatus.sessionTimeExceeded}`);
    console.log(`  Question time exceeded: ${status.timeStatus.questionTimeExceeded}`);
    
    if (status.timeStatus.sessionTimeRemaining) {
      const minutes = Math.floor(status.timeStatus.sessionTimeRemaining / 60);
      const seconds = status.timeStatus.sessionTimeRemaining % 60;
      console.log(`  Session time remaining: ${minutes}m ${seconds}s`);
    }
    
    if (status.timeStatus.questionTimeRemaining) {
      console.log(`  Question time remaining: ${status.timeStatus.questionTimeRemaining}s`);
    }

    // Time limit warnings
    if (status.timeStatus.sessionTimeRemaining && status.timeStatus.sessionTimeRemaining < 300) {
      console.log('  ⚠️  Warning: Less than 5 minutes remaining in session');
    }
    
    if (status.timeStatus.questionTimeRemaining && status.timeStatus.questionTimeRemaining < 60) {
      console.log('  ⚠️  Warning: Less than 1 minute remaining for current question');
    }

    // Auto-advancement scenarios
    if (status.timeStatus.sessionTimeExceeded) {
      console.log('  🔄 Session automatically completed due to time limit');
    }
    
    if (status.timeStatus.questionTimeExceeded) {
      console.log('  🔄 Question automatically skipped due to time limit');
    }

  } catch (error) {
    console.error('Time limit check error:', error);
  }
}

/**
 * Example: Session state validation
 */
function sessionStateValidationDemo() {
  console.log('=== Session State Validation Demo ===\n');

  // Valid state transitions
  const validTransitions = {
    [SessionState.CREATED]: [SessionAction.START, SessionAction.ABANDON],
    [SessionState.IN_PROGRESS]: [SessionAction.PAUSE, SessionAction.SKIP_QUESTION, SessionAction.END, SessionAction.ABANDON],
    [SessionState.PAUSED]: [SessionAction.RESUME, SessionAction.ABANDON],
    [SessionState.COMPLETED]: [], // No valid transitions
    [SessionState.ABANDONED]: [], // No valid transitions
    [SessionState.ERROR]: [SessionAction.ABANDON],
  };

  console.log('Valid state transitions:');
  Object.entries(validTransitions).forEach(([state, actions]) => {
    console.log(`  ${state}: ${actions.join(', ') || 'none'}`);
  });

  console.log('\nExample invalid transitions:');
  console.log('  ❌ CREATED → PAUSE (must start first)');
  console.log('  ❌ COMPLETED → RESUME (session already completed)');
  console.log('  ❌ PAUSED → SKIP_QUESTION (must resume first)');
}

/**
 * Example: Configuration-based restrictions
 */
function configurationRestrictionsDemo() {
  console.log('=== Configuration Restrictions Demo ===\n');

  console.log('Session control restrictions based on interview configuration:');
  console.log('');
  
  console.log('Pause Control:');
  console.log('  allowPause: true  → ✅ User can pause/resume session');
  console.log('  allowPause: false → ❌ Pause/resume actions rejected');
  console.log('');
  
  console.log('Skip Control:');
  console.log('  allowSkip: true   → ✅ User can skip questions');
  console.log('  allowSkip: false  → ❌ Skip actions rejected');
  console.log('');
  
  console.log('Time Limits:');
  console.log('  duration: 60 minutes     → Session auto-completes after 60 minutes');
  console.log('  timePerQuestion: 300s    → Questions auto-skip after 5 minutes');
  console.log('  question.timeLimit: 600s → Specific question auto-skips after 10 minutes');
  console.log('');
  
  console.log('Notifications:');
  console.log('  warningThresholds: [75, 90] → Warnings at 75% and 90% time elapsed');
  console.log('  timeWarnings: true          → Time warnings enabled');
  console.log('  soundEnabled: true          → Audio notifications enabled');
}

// Run demos if this file is executed directly
if (require.main === module) {
  console.log('Session Control Functionality Examples\n');
  
  sessionStateValidationDemo();
  console.log('\n' + '='.repeat(50) + '\n');
  
  configurationRestrictionsDemo();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Note: The following demos would require a real database connection
  console.log('Note: sessionControlDemo() and timeLimitDemo() require a database connection');
  console.log('Run them in a real application environment with proper setup.');
}

export {
  sessionControlDemo,
  timeLimitDemo,
  sessionStateValidationDemo,
  configurationRestrictionsDemo,
};