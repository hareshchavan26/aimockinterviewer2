import {
  CategoryScores,
  InterviewSession,
  PracticeExercise,
} from '@ai-interview/types';
import { logger } from '../utils/logger';
import { PersonalizedDrill } from './improvement-recommendation-service';

export interface PracticeDrillService {
  generatePersonalizedDrills(
    priorityAreas: string[],
    categoryScores: CategoryScores,
    session: InterviewSession,
    userHistory?: InterviewSession[]
  ): Promise<PersonalizedDrill[]>;
  
  generateProgressiveDrillPlan(
    targetArea: string,
    currentLevel: number,
    timeframe: number
  ): Promise<ProgressiveDrillPlan>;
  
  generateDailyPracticeRoutine(
    priorityAreas: string[],
    availableTimePerDay: number
  ): Promise<DailyPracticeRoutine>;
}

export interface ProgressiveDrillPlan {
  targetArea: string;
  currentLevel: number;
  targetLevel: number;
  phases: DrillPhase[];
  estimatedDuration: number;
  milestones: Milestone[];
}

export interface DrillPhase {
  phase: number;
  title: string;
  description: string;
  duration: number; // in days
  drills: PersonalizedDrill[];
  successCriteria: string[];
}

export interface Milestone {
  day: number;
  title: string;
  description: string;
  assessmentCriteria: string[];
}

export interface DailyPracticeRoutine {
  totalTimeRequired: number;
  sessions: PracticeSession[];
  weeklyGoals: string[];
  progressTracking: string[];
}

export interface PracticeSession {
  timeSlot: string;
  duration: number;
  focus: string;
  exercises: string[];
  successMetrics: string[];
}

export class DefaultPracticeDrillService implements PracticeDrillService {
  
  async generatePersonalizedDrills(
    priorityAreas: string[],
    categoryScores: CategoryScores,
    session: InterviewSession,
    userHistory?: InterviewSession[]
  ): Promise<PersonalizedDrill[]> {
    try {
      logger.info('Generating personalized practice drills', {
        sessionId: session.id,
        priorityAreas,
        industry: session.config.industry,
        role: session.config.role
      });

      const drills: PersonalizedDrill[] = [];

      for (const area of priorityAreas) {
        const areaDrills = await this.generateDrillsForSpecificArea(
          area,
          categoryScores,
          session,
          userHistory
        );
        drills.push(...areaDrills);
      }

      // Sort drills by priority and difficulty progression
      const sortedDrills = this.sortDrillsByPriority(drills, categoryScores);

      logger.info('Generated personalized drills', {
        sessionId: session.id,
        drillCount: sortedDrills.length
      });

      return sortedDrills;
    } catch (error) {
      logger.error('Failed to generate personalized drills', {
        sessionId: session.id,
        error
      });
      throw error;
    }
  }

  async generateProgressiveDrillPlan(
    targetArea: string,
    currentLevel: number,
    timeframe: number
  ): Promise<ProgressiveDrillPlan> {
    const phases = await this.createProgressivePhases(targetArea, currentLevel, timeframe);
    const milestones = this.createMilestones(phases);

    return {
      targetArea,
      currentLevel,
      targetLevel: Math.min(currentLevel + 0.3, 1.0), // Aim for 30% improvement
      phases,
      estimatedDuration: timeframe,
      milestones
    };
  }

  async generateDailyPracticeRoutine(
    priorityAreas: string[],
    availableTimePerDay: number
  ): Promise<DailyPracticeRoutine> {
    const sessions = await this.createDailySessions(priorityAreas, availableTimePerDay);
    const weeklyGoals = this.generateWeeklyGoals(priorityAreas);
    const progressTracking = this.generateProgressTrackingMethods(priorityAreas);

    return {
      totalTimeRequired: availableTimePerDay,
      sessions,
      weeklyGoals,
      progressTracking
    };
  }

  private async generateDrillsForSpecificArea(
    area: string,
    categoryScores: CategoryScores,
    session: InterviewSession,
    userHistory?: InterviewSession[]
  ): Promise<PersonalizedDrill[]> {
    const score = categoryScores[area as keyof CategoryScores] || 0;
    const difficulty = this.determineDifficulty(score);
    const industry = session?.config?.industry || 'Technology';
    const role = session?.config?.role || 'Software Engineer';

    const drills: PersonalizedDrill[] = [];

    switch (area) {
      case 'communication':
        drills.push(...await this.generateCommunicationDrills(difficulty, industry, role));
        break;
      case 'technicalAccuracy':
        drills.push(...await this.generateTechnicalDrills(difficulty, industry, role));
        break;
      case 'confidence':
        drills.push(...await this.generateConfidenceDrills(difficulty, userHistory));
        break;
      case 'clarity':
        drills.push(...await this.generateClarityDrills(difficulty, industry, role));
        break;
      case 'structure':
        drills.push(...await this.generateStructureDrills(difficulty));
        break;
      case 'relevance':
        drills.push(...await this.generateRelevanceDrills(difficulty, industry, role));
        break;
      default:
        drills.push(...await this.generateGenericDrills(area, difficulty));
    }

    return drills;
  }

  private async generateCommunicationDrills(
    difficulty: 'easy' | 'medium' | 'hard',
    industry: string,
    role: string
  ): Promise<PersonalizedDrill[]> {
    const drills: PersonalizedDrill[] = [];

    if (difficulty === 'easy') {
      drills.push({
        id: `comm_easy_${Date.now()}`,
        title: 'Daily Articulation Practice',
        description: 'Build fundamental speaking skills with structured daily exercises',
        targetWeakness: 'communication',
        difficulty: 'easy',
        estimatedDuration: 15,
        instructions: [
          'Day 1-3: Practice speaking for 2 minutes about your background without filler words',
          'Day 4-6: Explain a simple concept from your field to an imaginary child',
          'Day 7-9: Practice varying your tone and pace while reading aloud',
          'Day 10-12: Record yourself and identify areas for improvement'
        ],
        successCriteria: [
          'Speak for 2 minutes without "um" or "uh"',
          'Maintain consistent volume throughout',
          'Use varied intonation to maintain interest'
        ],
        followUpDrills: ['comm_medium_presentation']
      });
    }

    if (difficulty === 'medium') {
      drills.push({
        id: `comm_medium_${Date.now()}`,
        title: `${industry} Concept Explanation Challenge`,
        description: `Practice explaining complex ${industry} concepts clearly and concisely`,
        targetWeakness: 'communication',
        difficulty: 'medium',
        estimatedDuration: 25,
        instructions: [
          `Choose 5 key ${industry} concepts relevant to ${role} positions`,
          'Practice explaining each concept in exactly 90 seconds',
          'Record explanations and review for clarity and engagement',
          'Get feedback from colleagues or friends',
          'Refine explanations based on feedback'
        ],
        successCriteria: [
          'Explain concepts without technical jargon',
          'Maintain listener engagement throughout',
          'Receive positive feedback on clarity'
        ],
        followUpDrills: ['comm_hard_presentation']
      });
    }

    if (difficulty === 'hard') {
      drills.push({
        id: `comm_hard_${Date.now()}`,
        title: 'Executive Presentation Simulation',
        description: 'Practice high-stakes communication scenarios with complex audiences',
        targetWeakness: 'communication',
        difficulty: 'hard',
        estimatedDuration: 45,
        instructions: [
          'Prepare a 5-minute presentation on a complex project or achievement',
          'Practice presenting to different audience types (technical, executive, client)',
          'Handle challenging questions and interruptions gracefully',
          'Focus on storytelling and emotional connection',
          'Record and analyze body language and vocal delivery'
        ],
        successCriteria: [
          'Adapt communication style to different audiences',
          'Handle interruptions without losing composure',
          'Demonstrate executive presence and confidence'
        ]
      });
    }

    return drills;
  }

  private async generateTechnicalDrills(
    difficulty: 'easy' | 'medium' | 'hard',
    industry: string,
    role: string
  ): Promise<PersonalizedDrill[]> {
    const drills: PersonalizedDrill[] = [];

    if (difficulty === 'easy') {
      drills.push({
        id: `tech_easy_${Date.now()}`,
        title: `${role} Fundamentals Review`,
        description: `Strengthen core knowledge areas for ${role} positions`,
        targetWeakness: 'technicalAccuracy',
        difficulty: 'easy',
        estimatedDuration: 30,
        instructions: [
          `Review fundamental concepts in ${industry}`,
          'Create flashcards for key terms and concepts',
          'Practice explaining basic concepts out loud',
          'Take online quizzes to test knowledge',
          'Identify and focus on weak areas'
        ],
        successCriteria: [
          'Score 90%+ on fundamental concept quizzes',
          'Explain basic concepts clearly and accurately',
          'Identify connections between different concepts'
        ]
      });
    }

    if (difficulty === 'medium') {
      drills.push({
        id: `tech_medium_${Date.now()}`,
        title: `${industry} Case Study Analysis`,
        description: 'Practice analyzing and solving real-world industry problems',
        targetWeakness: 'technicalAccuracy',
        difficulty: 'medium',
        estimatedDuration: 40,
        instructions: [
          `Find 3 recent case studies from ${industry}`,
          'Analyze each case study thoroughly',
          'Develop alternative solutions and approaches',
          'Present your analysis and recommendations',
          'Compare your solutions with actual outcomes'
        ],
        successCriteria: [
          'Identify key problems and root causes',
          'Propose viable, well-reasoned solutions',
          'Demonstrate understanding of industry constraints'
        ]
      });
    }

    return drills;
  }

  private async generateConfidenceDrills(
    difficulty: 'easy' | 'medium' | 'hard',
    userHistory?: InterviewSession[]
  ): Promise<PersonalizedDrill[]> {
    const drills: PersonalizedDrill[] = [];

    drills.push({
      id: `conf_${difficulty}_${Date.now()}`,
      title: 'Confidence Building Bootcamp',
      description: 'Systematic approach to building unshakeable interview confidence',
      targetWeakness: 'confidence',
      difficulty,
      estimatedDuration: difficulty === 'easy' ? 15 : difficulty === 'medium' ? 25 : 35,
      instructions: [
        'Week 1: Practice power posing for 2 minutes before each practice session',
        'Week 2: Create and rehearse 5 achievement stories that showcase your value',
        'Week 3: Practice positive self-talk and reframe negative thoughts',
        'Week 4: Conduct mock interviews with progressively challenging scenarios'
      ],
      successCriteria: [
        'Maintain steady eye contact during responses',
        'Speak with clear, confident voice',
        'Demonstrate positive body language consistently'
      ]
    });

    return drills;
  }

  private async generateClarityDrills(
    difficulty: 'easy' | 'medium' | 'hard',
    industry: string,
    role: string
  ): Promise<PersonalizedDrill[]> {
    return [{
      id: `clarity_${difficulty}_${Date.now()}`,
      title: 'Crystal Clear Communication',
      description: 'Develop the ability to communicate complex ideas with perfect clarity',
      targetWeakness: 'clarity',
      difficulty,
      estimatedDuration: 20,
      instructions: [
        'Practice the PREP method: Point, Reason, Example, Point',
        'Eliminate jargon and use simple, precise language',
        'Use specific examples and concrete details',
        'Practice explaining concepts at different complexity levels'
      ],
      successCriteria: [
        'Explain complex concepts using simple language',
        'Provide specific, relevant examples',
        'Receive feedback that responses are easy to understand'
      ]
    }];
  }

  private async generateStructureDrills(
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<PersonalizedDrill[]> {
    return [{
      id: `structure_${difficulty}_${Date.now()}`,
      title: 'Structured Response Mastery',
      description: 'Master the art of organizing thoughts and delivering structured responses',
      targetWeakness: 'structure',
      difficulty,
      estimatedDuration: 25,
      instructions: [
        'Practice the STAR method for behavioral questions',
        'Use frameworks like "First, Second, Third" for complex topics',
        'Create mental templates for common question types',
        'Practice smooth transitions between ideas'
      ],
      successCriteria: [
        'Deliver responses with clear beginning, middle, and end',
        'Use appropriate frameworks for different question types',
        'Maintain logical flow throughout responses'
      ]
    }];
  }

  private async generateRelevanceDrills(
    difficulty: 'easy' | 'medium' | 'hard',
    industry: string,
    role: string
  ): Promise<PersonalizedDrill[]> {
    return [{
      id: `relevance_${difficulty}_${Date.now()}`,
      title: 'Targeted Response Training',
      description: 'Ensure every answer directly addresses the question asked',
      targetWeakness: 'relevance',
      difficulty,
      estimatedDuration: 20,
      instructions: [
        'Practice the "Listen-Pause-Clarify-Answer" sequence',
        'Repeat key parts of the question in your answer',
        'Stay focused on the specific scenario being discussed',
        'Practice asking clarifying questions when unsure'
      ],
      successCriteria: [
        'Directly address all parts of multi-part questions',
        'Stay on topic throughout the response',
        'Ask appropriate clarifying questions when needed'
      ]
    }];
  }

  private async generateGenericDrills(
    area: string,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<PersonalizedDrill[]> {
    return [{
      id: `${area}_${difficulty}_${Date.now()}`,
      title: `${this.formatCategoryName(area)} Improvement Drill`,
      description: `Targeted practice to improve your ${area} performance`,
      targetWeakness: area,
      difficulty,
      estimatedDuration: 20,
      instructions: [
        `Focus on ${area}-specific techniques and best practices`,
        'Practice with realistic interview scenarios',
        'Get feedback and iterate on your approach',
        'Track progress and adjust strategy as needed'
      ],
      successCriteria: [
        `Show measurable improvement in ${area} metrics`,
        'Demonstrate consistent application of techniques',
        'Receive positive feedback from practice partners'
      ]
    }];
  }

  private async createProgressivePhases(
    targetArea: string,
    currentLevel: number,
    timeframe: number
  ): Promise<DrillPhase[]> {
    const phases: DrillPhase[] = [];
    const phaseDuration = Math.floor(timeframe / 3); // 3 phases

    // Create a mock session for drill generation
    const mockSession = {
      config: {
        industry: 'Technology',
        role: 'Software Engineer'
      }
    } as InterviewSession;

    // Foundation Phase
    phases.push({
      phase: 1,
      title: 'Foundation Building',
      description: `Build fundamental skills in ${targetArea}`,
      duration: phaseDuration,
      drills: await this.generateDrillsForSpecificArea(targetArea, {} as CategoryScores, mockSession),
      successCriteria: [
        'Complete all foundation exercises',
        'Demonstrate basic competency',
        'Show consistent improvement'
      ]
    });

    // Development Phase
    phases.push({
      phase: 2,
      title: 'Skill Development',
      description: `Develop intermediate skills in ${targetArea}`,
      duration: phaseDuration,
      drills: [], // Would be populated with medium difficulty drills
      successCriteria: [
        'Apply skills in realistic scenarios',
        'Handle moderate complexity challenges',
        'Show measurable progress'
      ]
    });

    // Mastery Phase
    phases.push({
      phase: 3,
      title: 'Mastery & Refinement',
      description: `Achieve mastery in ${targetArea}`,
      duration: timeframe - (2 * phaseDuration),
      drills: [], // Would be populated with hard difficulty drills
      successCriteria: [
        'Demonstrate advanced competency',
        'Handle complex scenarios confidently',
        'Achieve target performance level'
      ]
    });

    return phases;
  }

  private createMilestones(phases: DrillPhase[]): Milestone[] {
    const milestones: Milestone[] = [];
    let currentDay = 0;

    phases.forEach((phase, index) => {
      currentDay += Math.floor(phase.duration / 2);
      milestones.push({
        day: currentDay,
        title: `${phase.title} Checkpoint`,
        description: `Assess progress in ${phase.title.toLowerCase()}`,
        assessmentCriteria: phase.successCriteria
      });
      currentDay += Math.ceil(phase.duration / 2);
    });

    return milestones;
  }

  private async createDailySessions(
    priorityAreas: string[],
    availableTimePerDay: number
  ): Promise<PracticeSession[]> {
    const sessions: PracticeSession[] = [];
    const timePerArea = Math.floor(availableTimePerDay / priorityAreas.length);

    priorityAreas.forEach((area, index) => {
      sessions.push({
        timeSlot: index === 0 ? 'Morning' : index === 1 ? 'Afternoon' : 'Evening',
        duration: timePerArea,
        focus: this.formatCategoryName(area),
        exercises: [
          `${area} focused practice`,
          'Record and review session',
          'Identify improvement areas'
        ],
        successMetrics: [
          'Complete all planned exercises',
          'Show improvement from previous session',
          'Maintain consistent practice schedule'
        ]
      });
    });

    return sessions;
  }

  private generateWeeklyGoals(priorityAreas: string[]): string[] {
    return priorityAreas.map(area => 
      `Show measurable improvement in ${this.formatCategoryName(area)}`
    );
  }

  private generateProgressTrackingMethods(priorityAreas: string[]): string[] {
    return [
      'Record daily practice sessions for self-review',
      'Track confidence levels before and after practice',
      'Measure improvement in target areas weekly',
      'Get feedback from practice partners or mentors',
      'Complete weekly self-assessment surveys'
    ];
  }

  private determineDifficulty(score: number): 'easy' | 'medium' | 'hard' {
    if (score < 0.5) return 'easy';
    if (score < 0.7) return 'medium';
    return 'hard';
  }

  private sortDrillsByPriority(
    drills: PersonalizedDrill[],
    categoryScores: CategoryScores
  ): PersonalizedDrill[] {
    return drills.sort((a, b) => {
      // Sort by difficulty (easy first) then by target weakness severity
      const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
      const aDifficultyScore = difficultyOrder[a.difficulty];
      const bDifficultyScore = difficultyOrder[b.difficulty];
      
      if (aDifficultyScore !== bDifficultyScore) {
        return aDifficultyScore - bDifficultyScore;
      }
      
      // If same difficulty, prioritize by weakness severity
      const aScore = categoryScores[a.targetWeakness as keyof CategoryScores] || 1;
      const bScore = categoryScores[b.targetWeakness as keyof CategoryScores] || 1;
      
      return aScore - bScore; // Lower scores (bigger weaknesses) first
    });
  }

  private formatCategoryName(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1');
  }
}