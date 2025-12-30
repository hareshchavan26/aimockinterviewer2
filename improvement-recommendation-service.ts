import {
  ImprovementPlan,
  Recommendation,
  PracticeExercise,
  Resource,
  CategoryScores,
  ResponseAnalysis,
  InterviewSession,
  UserResponse,
} from '@ai-interview/types';
import { logger } from '../utils/logger';

export interface BetterAnswerSuggestion {
  originalResponse: string;
  improvedVersion: string;
  improvements: string[];
  reasoning: string;
  starMethodExample?: STARExample;
}

export interface STARExample {
  situation: string;
  task: string;
  action: string;
  result: string;
  fullExample: string;
}

export interface PersonalizedDrill {
  id: string;
  title: string;
  description: string;
  targetWeakness: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDuration: number;
  instructions: string[];
  successCriteria: string[];
  followUpDrills?: string[];
}

export interface ImprovementRecommendationService {
  generatePersonalizedPlan(
    categoryScores: CategoryScores,
    analyses: ResponseAnalysis[],
    session: InterviewSession
  ): Promise<ImprovementPlan>;
  
  generateBetterAnswerSuggestions(
    responses: UserResponse[],
    analyses: ResponseAnalysis[]
  ): Promise<BetterAnswerSuggestion[]>;
  
  generatePersonalizedDrills(
    priorityAreas: string[],
    categoryScores: CategoryScores,
    userHistory?: InterviewSession[]
  ): Promise<PersonalizedDrill[]>;
  
  generateSTARMethodExamples(
    industry: string,
    role: string,
    weaknessArea: string
  ): Promise<STARExample[]>;
}

export class DefaultImprovementRecommendationService implements ImprovementRecommendationService {
  
  async generatePersonalizedPlan(
    categoryScores: CategoryScores,
    analyses: ResponseAnalysis[],
    session: InterviewSession
  ): Promise<ImprovementPlan> {
    try {
      logger.info('Generating personalized improvement plan', { 
        sessionId: session.id,
        industry: session.config.industry,
        role: session.config.role 
      });

      // Identify priority areas with more sophisticated analysis
      const priorityAreas = this.identifyPriorityAreas(categoryScores, analyses);
      
      // Generate context-aware recommendations
      const recommendations = await this.generateContextAwareRecommendations(
        priorityAreas,
        categoryScores,
        session.config,
        analyses
      );
      
      // Generate personalized practice exercises
      const practiceExercises = await this.generatePersonalizedPracticeExercises(
        priorityAreas,
        categoryScores,
        session.config
      );
      
      // Calculate realistic improvement timeline
      const estimatedTimeToImprove = this.calculateImprovementTimeline(
        priorityAreas,
        categoryScores,
        analyses
      );

      const plan: ImprovementPlan = {
        priorityAreas,
        recommendations,
        practiceExercises,
        estimatedTimeToImprove,
      };

      logger.info('Personalized improvement plan generated', {
        sessionId: session.id,
        priorityAreasCount: priorityAreas.length,
        recommendationsCount: recommendations.length,
        exercisesCount: practiceExercises.length
      });

      return plan;
    } catch (error) {
      logger.error('Failed to generate personalized improvement plan', { 
        sessionId: session.id, 
        error 
      });
      throw error;
    }
  }

  async generateBetterAnswerSuggestions(
    responses: UserResponse[],
    analyses: ResponseAnalysis[]
  ): Promise<BetterAnswerSuggestion[]> {
    const suggestions: BetterAnswerSuggestion[] = [];

    for (let i = 0; i < responses.length && i < analyses.length; i++) {
      const response = responses[i];
      const analysis = analyses[i];

      if (!response.textResponse || analysis.overallScore > 0.8) {
        continue; // Skip if no text response or already good
      }

      const suggestion = await this.generateSingleAnswerSuggestion(
        response.textResponse,
        analysis
      );

      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  async generatePersonalizedDrills(
    priorityAreas: string[],
    categoryScores: CategoryScores,
    userHistory?: InterviewSession[]
  ): Promise<PersonalizedDrill[]> {
    const drills: PersonalizedDrill[] = [];

    for (const area of priorityAreas) {
      const areaDrills = await this.generateDrillsForArea(
        area,
        categoryScores,
        userHistory
      );
      drills.push(...areaDrills);
    }

    // Sort by priority and difficulty
    return drills.sort((a, b) => {
      const priorityOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
      return priorityOrder[a.difficulty] - priorityOrder[b.difficulty];
    });
  }

  async generateSTARMethodExamples(
    industry: string,
    role: string,
    weaknessArea: string
  ): Promise<STARExample[]> {
    const examples: STARExample[] = [];

    // Generate industry and role-specific STAR examples
    const exampleTemplates = this.getSTARTemplates(industry, role, weaknessArea);
    
    for (const template of exampleTemplates) {
      examples.push(this.populateSTARTemplate(template, industry, role));
    }

    return examples;
  }

  private identifyPriorityAreas(
    categoryScores: CategoryScores,
    analyses: ResponseAnalysis[]
  ): string[] {
    const priorityAreas: string[] = [];
    const scoreThreshold = 0.7;
    const criticalThreshold = 0.5;

    // Analyze category scores with weighted importance
    const categoryWeights = {
      communication: 1.2, // Higher weight for communication
      technicalAccuracy: 1.1,
      confidence: 1.0,
      clarity: 1.1,
      structure: 1.0,
      relevance: 1.0,
    };

    // Calculate weighted scores and identify critical areas
    Object.entries(categoryScores).forEach(([category, score]) => {
      const weight = categoryWeights[category as keyof typeof categoryWeights] || 1.0;
      const weightedScore = score * weight;

      if (score < criticalThreshold) {
        priorityAreas.unshift(category); // Critical areas first
      } else if (weightedScore < scoreThreshold) {
        priorityAreas.push(category);
      }
    });

    // Analyze patterns in individual responses
    const consistencyIssues = this.identifyConsistencyIssues(analyses);
    priorityAreas.push(...consistencyIssues);

    // Remove duplicates and limit to top 4 areas
    return [...new Set(priorityAreas)].slice(0, 4);
  }

  private identifyConsistencyIssues(analyses: ResponseAnalysis[]): string[] {
    const issues: string[] = [];
    
    if (analyses.length < 2) return issues;

    // Check for consistency in confidence
    const confidenceScores = analyses.map(a => a.confidenceScore);
    const confidenceVariance = this.calculateVariance(confidenceScores);
    if (confidenceVariance > 0.15) {
      issues.push('confidence consistency');
    }

    // Check for speech pattern issues
    const fillerWordCounts = analyses.map(a => a.speechAnalysis.fillerWordCount);
    const avgFillerWords = fillerWordCounts.reduce((sum, count) => sum + count, 0) / fillerWordCounts.length;
    if (avgFillerWords > 3) {
      issues.push('speech fluency');
    }

    return issues;
  }

  private async generateContextAwareRecommendations(
    priorityAreas: string[],
    categoryScores: CategoryScores,
    config: any,
    analyses: ResponseAnalysis[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    for (const area of priorityAreas) {
      const recommendation = await this.generateRecommendationForArea(
        area,
        categoryScores,
        config,
        analyses
      );
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  private async generateRecommendationForArea(
    area: string,
    categoryScores: CategoryScores,
    config: any,
    analyses: ResponseAnalysis[]
  ): Promise<Recommendation | null> {
    const industry = config.industry || 'Technology';
    const role = config.role || 'Software Engineer';

    switch (area) {
      case 'communication':
        return {
          category: 'Communication Excellence',
          description: `Enhance your verbal communication skills for ${role} interviews in ${industry}`,
          actionItems: [
            'Practice the "Pause and Think" technique before answering',
            'Record yourself explaining technical concepts to non-technical audiences',
            'Join a public speaking group like Toastmasters',
            'Practice active listening and asking clarifying questions',
            `Study communication patterns of successful ${role}s in ${industry}`
          ],
          resources: [
            {
              title: `Communication Skills for ${role}s`,
              url: 'https://example.com/tech-communication',
              type: 'course'
            },
            {
              title: 'The Art of Technical Communication',
              url: 'https://example.com/technical-communication',
              type: 'book'
            }
          ]
        };

      case 'technicalAccuracy':
        return {
          category: 'Technical Mastery',
          description: `Strengthen your technical knowledge and problem-solving approach for ${role} positions`,
          actionItems: [
            `Review core ${industry} concepts and latest trends`,
            'Practice explaining complex technical problems step-by-step',
            'Work through industry-specific case studies',
            'Build a portfolio of relevant projects',
            'Stay updated with best practices and emerging technologies'
          ],
          resources: [
            {
              title: `${role} Interview Preparation Guide`,
              url: 'https://example.com/tech-interview-prep',
              type: 'course'
            },
            {
              title: `${industry} Technical Standards`,
              url: 'https://example.com/industry-standards',
              type: 'article'
            }
          ]
        };

      case 'confidence':
        const avgConfidence = analyses.reduce((sum, a) => sum + a.confidenceScore, 0) / analyses.length;
        return {
          category: 'Confidence Building',
          description: `Build unshakeable confidence for ${role} interviews (current level: ${Math.round(avgConfidence * 100)}%)`,
          actionItems: [
            'Practice power posing for 2 minutes before interviews',
            'Create a "success story bank" of your achievements',
            'Visualize successful interview scenarios daily',
            'Practice with progressively challenging mock interviews',
            'Focus on your unique value proposition and strengths'
          ],
          resources: [
            {
              title: 'Confidence in Technical Interviews',
              url: 'https://example.com/interview-confidence',
              type: 'video'
            },
            {
              title: 'Mindset: The New Psychology of Success',
              url: 'https://example.com/growth-mindset',
              type: 'book'
            }
          ]
        };

      case 'clarity':
        return {
          category: 'Crystal Clear Communication',
          description: 'Improve the clarity and precision of your responses',
          actionItems: [
            'Use the PREP method: Point, Reason, Example, Point',
            'Practice explaining concepts in 30, 60, and 90-second formats',
            'Eliminate jargon and use simple, precise language',
            'Structure answers with clear beginning, middle, and end',
            'Ask "Does this answer the question?" before concluding'
          ],
          resources: [
            {
              title: 'Clear Communication Frameworks',
              url: 'https://example.com/communication-frameworks',
              type: 'article'
            }
          ]
        };

      case 'structure':
        return {
          category: 'Structured Thinking',
          description: 'Master the art of organized, logical responses',
          actionItems: [
            'Practice the STAR method for behavioral questions',
            'Use frameworks like "First, Second, Third" for complex answers',
            'Create mental templates for common question types',
            'Practice transitioning smoothly between ideas',
            'End each response with a clear conclusion'
          ],
          resources: [
            {
              title: 'Structured Interview Responses',
              url: 'https://example.com/structured-responses',
              type: 'course'
            }
          ]
        };

      case 'relevance':
        return {
          category: 'Targeted Responses',
          description: 'Ensure every answer directly addresses the question asked',
          actionItems: [
            'Practice the "Listen-Pause-Clarify-Answer" sequence',
            'Repeat key parts of the question in your answer',
            'Ask clarifying questions when unsure',
            'Stay focused on the specific scenario being discussed',
            'Conclude by explicitly connecting back to the question'
          ],
          resources: [
            {
              title: 'Active Listening in Interviews',
              url: 'https://example.com/active-listening',
              type: 'article'
            }
          ]
        };

      case 'confidence consistency':
        return {
          category: 'Consistent Confidence',
          description: 'Maintain steady confidence throughout the interview',
          actionItems: [
            'Practice breathing exercises between questions',
            'Develop go-to phrases for buying thinking time',
            'Create confidence anchors for difficult moments',
            'Practice recovering from mistakes gracefully',
            'Build stamina through longer practice sessions'
          ],
          resources: [
            {
              title: 'Interview Stamina and Consistency',
              url: 'https://example.com/interview-stamina',
              type: 'video'
            }
          ]
        };

      case 'speech fluency':
        return {
          category: 'Speech Fluency',
          description: 'Eliminate filler words and improve speaking flow',
          actionItems: [
            'Practice the "pause instead of filler" technique',
            'Record daily 2-minute impromptu speeches',
            'Use a metronome to practice consistent speaking pace',
            'Practice tongue twisters for articulation',
            'Join speaking clubs or debate groups'
          ],
          resources: [
            {
              title: 'Eliminating Filler Words',
              url: 'https://example.com/speech-fluency',
              type: 'course'
            }
          ]
        };

      default:
        return null;
    }
  }

  private async generatePersonalizedPracticeExercises(
    priorityAreas: string[],
    categoryScores: CategoryScores,
    config: any
  ): Promise<PracticeExercise[]> {
    const exercises: PracticeExercise[] = [];

    for (const area of priorityAreas) {
      const areaExercises = await this.generateExercisesForArea(area, config);
      exercises.push(...areaExercises);
    }

    return exercises;
  }

  private async generateExercisesForArea(
    area: string,
    config: any
  ): Promise<PracticeExercise[]> {
    const industry = config.industry || 'Technology';
    const role = config.role || 'Software Engineer';

    switch (area) {
      case 'communication':
        return [
          {
            title: 'Technical Concept Explanation Challenge',
            description: `Explain a complex ${industry} concept to someone with no technical background in under 2 minutes`,
            difficulty: 'medium',
            estimatedDuration: 20,
            category: 'Communication'
          },
          {
            title: 'Elevator Pitch Perfection',
            description: `Create and practice a compelling 60-second elevator pitch for a ${role} position`,
            difficulty: 'easy',
            estimatedDuration: 15,
            category: 'Communication'
          },
          {
            title: 'Question Clarification Practice',
            description: 'Practice asking thoughtful clarifying questions for ambiguous scenarios',
            difficulty: 'medium',
            estimatedDuration: 25,
            category: 'Communication'
          }
        ];

      case 'technicalAccuracy':
        return [
          {
            title: `${industry} Case Study Analysis`,
            description: `Analyze and present solutions for real-world ${industry} challenges`,
            difficulty: 'hard',
            estimatedDuration: 45,
            category: 'Technical Accuracy'
          },
          {
            title: 'Problem-Solving Walkthrough',
            description: 'Practice explaining your thought process while solving technical problems',
            difficulty: 'medium',
            estimatedDuration: 30,
            category: 'Technical Accuracy'
          },
          {
            title: 'Industry Trend Discussion',
            description: `Prepare to discuss current trends and future directions in ${industry}`,
            difficulty: 'medium',
            estimatedDuration: 25,
            category: 'Technical Accuracy'
          }
        ];

      case 'confidence':
        return [
          {
            title: 'Power Posing and Visualization',
            description: 'Practice confident body language and visualize successful interview scenarios',
            difficulty: 'easy',
            estimatedDuration: 10,
            category: 'Confidence'
          },
          {
            title: 'Strength Story Bank',
            description: 'Develop and practice 5 compelling stories that showcase your abilities',
            difficulty: 'medium',
            estimatedDuration: 35,
            category: 'Confidence'
          },
          {
            title: 'Mistake Recovery Practice',
            description: 'Practice recovering gracefully from mistakes or difficult questions',
            difficulty: 'hard',
            estimatedDuration: 20,
            category: 'Confidence'
          }
        ];

      case 'clarity':
        return [
          {
            title: 'PREP Method Mastery',
            description: 'Practice structuring answers using Point, Reason, Example, Point framework',
            difficulty: 'medium',
            estimatedDuration: 20,
            category: 'Clarity'
          },
          {
            title: 'Jargon-Free Explanation Challenge',
            description: 'Explain technical concepts without using any industry jargon',
            difficulty: 'medium',
            estimatedDuration: 25,
            category: 'Clarity'
          }
        ];

      case 'structure':
        return [
          {
            title: 'STAR Method Deep Dive',
            description: 'Master the Situation, Task, Action, Result framework for behavioral questions',
            difficulty: 'medium',
            estimatedDuration: 30,
            category: 'Structure'
          },
          {
            title: 'Multi-Part Question Organization',
            description: 'Practice organizing responses to complex, multi-part questions',
            difficulty: 'hard',
            estimatedDuration: 25,
            category: 'Structure'
          }
        ];

      case 'relevance':
        return [
          {
            title: 'Question Analysis Practice',
            description: 'Practice identifying key elements and requirements in interview questions',
            difficulty: 'easy',
            estimatedDuration: 15,
            category: 'Relevance'
          },
          {
            title: 'Answer Alignment Check',
            description: 'Practice ensuring your answers directly address what was asked',
            difficulty: 'medium',
            estimatedDuration: 20,
            category: 'Relevance'
          }
        ];

      default:
        return [
          {
            title: `${this.formatCategoryName(area)} Improvement Practice`,
            description: `Targeted practice exercises to improve your ${area} skills`,
            difficulty: 'medium',
            estimatedDuration: 20,
            category: this.formatCategoryName(area)
          }
        ];
    }
  }

  private async generateDrillsForArea(
    area: string,
    categoryScores: CategoryScores,
    userHistory?: InterviewSession[]
  ): Promise<PersonalizedDrill[]> {
    const score = categoryScores[area as keyof CategoryScores] || 0;
    const difficulty = score < 0.5 ? 'easy' : score < 0.7 ? 'medium' : 'hard';

    // Generate progressive drills based on current skill level
    const drills: PersonalizedDrill[] = [];

    switch (area) {
      case 'communication':
        drills.push({
          id: `comm_drill_${Date.now()}`,
          title: 'Daily Communication Challenge',
          description: 'Progressive daily exercises to improve verbal communication',
          targetWeakness: 'communication',
          difficulty,
          estimatedDuration: 15,
          instructions: [
            'Day 1-3: Practice speaking for 2 minutes without filler words',
            'Day 4-6: Explain a technical concept to an imaginary 10-year-old',
            'Day 7-9: Practice varying your tone and pace while speaking',
            'Day 10-12: Record yourself and analyze clarity and confidence'
          ],
          successCriteria: [
            'Reduce filler words by 50%',
            'Maintain consistent volume and pace',
            'Receive positive feedback on clarity'
          ],
          followUpDrills: ['advanced_communication_drill']
        });
        break;

      case 'confidence':
        drills.push({
          id: `conf_drill_${Date.now()}`,
          title: 'Confidence Building Bootcamp',
          description: 'Systematic approach to building interview confidence',
          targetWeakness: 'confidence',
          difficulty,
          estimatedDuration: 20,
          instructions: [
            'Week 1: Practice power posing for 2 minutes daily',
            'Week 2: Record and review 3 success stories',
            'Week 3: Practice with progressively challenging questions',
            'Week 4: Conduct mock interviews with feedback'
          ],
          successCriteria: [
            'Maintain eye contact for 80% of response time',
            'Speak with steady, confident voice',
            'Demonstrate positive body language'
          ]
        });
        break;

      default:
        drills.push({
          id: `${area}_drill_${Date.now()}`,
          title: `${this.formatCategoryName(area)} Improvement Drill`,
          description: `Targeted drill to improve ${area} performance`,
          targetWeakness: area,
          difficulty,
          estimatedDuration: 20,
          instructions: [
            `Focus on ${area}-specific techniques`,
            'Practice with realistic scenarios',
            'Get feedback and iterate'
          ],
          successCriteria: [
            `Show measurable improvement in ${area}`,
            'Demonstrate consistent application of techniques'
          ]
        });
    }

    return drills;
  }

  private async generateSingleAnswerSuggestion(
    originalResponse: string,
    analysis: ResponseAnalysis
  ): Promise<BetterAnswerSuggestion | null> {
    if (!originalResponse || originalResponse.length < 10) {
      return null;
    }

    const improvements: string[] = [];
    let improvedVersion = originalResponse;

    // Analyze and improve based on specific weaknesses
    if (analysis.textAnalysis.structureScore < 0.6) {
      improvements.push('Add clear structure with introduction, main points, and conclusion');
      improvedVersion = this.addStructureToResponse(improvedVersion);
    }

    if (analysis.textAnalysis.clarityScore < 0.6) {
      improvements.push('Use more specific examples and concrete details');
      improvedVersion = this.improveClarity(improvedVersion);
    }

    if (analysis.confidenceScore < 0.6) {
      improvements.push('Use more assertive language and eliminate hedging words');
      improvedVersion = this.improveConfidence(improvedVersion);
    }

    if (analysis.speechAnalysis.fillerWordCount > 3) {
      improvements.push('Eliminate filler words and use purposeful pauses');
      improvedVersion = this.removeFillersFromText(improvedVersion);
    }

    const reasoning = this.generateImprovementReasoning(analysis, improvements);

    return {
      originalResponse,
      improvedVersion,
      improvements,
      reasoning,
      starMethodExample: this.generateSTARExample(originalResponse)
    };
  }

  private addStructureToResponse(response: string): string {
    // Add basic structure if missing
    if (!response.includes('First') && !response.includes('Initially')) {
      return `Let me break this down into key points. First, ${response.toLowerCase()} In conclusion, this approach addresses the core requirements effectively.`;
    }
    return response;
  }

  private improveClarity(response: string): string {
    // Add more specific language
    return response
      .replace(/\bthing\b/g, 'solution')
      .replace(/\bstuff\b/g, 'components')
      .replace(/\bkind of\b/g, '')
      .replace(/\bsort of\b/g, '');
  }

  private improveConfidence(response: string): string {
    // Remove hedging language
    return response
      .replace(/\bI think\b/g, 'I believe')
      .replace(/\bmaybe\b/g, '')
      .replace(/\bprobably\b/g, '')
      .replace(/\bI guess\b/g, 'I would');
  }

  private removeFillersFromText(response: string): string {
    // Remove common filler words
    return response
      .replace(/\bum\b/g, '')
      .replace(/\buh\b/g, '')
      .replace(/\blike\b(?!\s+to)/g, '') // Keep "like to" but remove other uses
      .replace(/\byou know\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private generateImprovementReasoning(
    analysis: ResponseAnalysis,
    improvements: string[]
  ): string {
    let reasoning = 'Based on the analysis of your response, here are the key areas for improvement: ';
    
    if (analysis.textAnalysis.structureScore < 0.6) {
      reasoning += 'Your response would benefit from clearer organization. ';
    }
    
    if (analysis.confidenceScore < 0.6) {
      reasoning += 'Using more assertive language will convey greater confidence. ';
    }
    
    if (analysis.speechAnalysis.fillerWordCount > 3) {
      reasoning += 'Reducing filler words will make your communication more professional. ';
    }

    reasoning += 'These changes will help you deliver more impactful and memorable responses.';
    
    return reasoning;
  }

  private generateSTARExample(response: string): STARExample | undefined {
    // Generate a STAR method example if the response seems behavioral
    if (response.toLowerCase().includes('time when') || 
        response.toLowerCase().includes('experience') ||
        response.toLowerCase().includes('project')) {
      
      return {
        situation: 'In my previous role as a software engineer at TechCorp...',
        task: 'I was tasked with improving the performance of our main application...',
        action: 'I analyzed the codebase, identified bottlenecks, and implemented caching solutions...',
        result: 'This resulted in a 40% improvement in response time and better user satisfaction.',
        fullExample: 'In my previous role as a software engineer at TechCorp, I was tasked with improving the performance of our main application which was experiencing slow response times. I analyzed the codebase, identified key bottlenecks in our database queries, and implemented Redis caching solutions along with query optimization. This resulted in a 40% improvement in response time and significantly better user satisfaction scores.'
      };
    }
    
    return undefined;
  }

  private getSTARTemplates(industry: string, role: string, weaknessArea: string): any[] {
    // Return templates based on industry, role, and weakness area
    return [
      {
        type: 'leadership',
        situation: `Leading a ${industry} project team`,
        task: 'Deliver results under tight deadlines',
        action: 'Implement effective communication and delegation strategies',
        result: 'Successful project completion with team growth'
      },
      {
        type: 'problem-solving',
        situation: `Facing a critical ${industry} challenge`,
        task: 'Find innovative solution quickly',
        action: 'Apply systematic problem-solving approach',
        result: 'Resolved issue and prevented future occurrences'
      }
    ];
  }

  private populateSTARTemplate(template: any, industry: string, role: string): STARExample {
    return {
      situation: template.situation.replace('${industry}', industry),
      task: template.task,
      action: template.action,
      result: template.result,
      fullExample: `${template.situation.replace('${industry}', industry)}. ${template.task}. ${template.action}. ${template.result}.`
    };
  }

  private calculateImprovementTimeline(
    priorityAreas: string[],
    categoryScores: CategoryScores,
    analyses: ResponseAnalysis[]
  ): number {
    // Base timeline calculation
    let baseDays = 14; // 2 weeks minimum
    
    // Add time based on number of priority areas
    baseDays += priorityAreas.length * 7; // 1 week per priority area
    
    // Add time based on severity of weaknesses
    const avgScore = Object.values(categoryScores).reduce((sum, score) => sum + score, 0) / Object.values(categoryScores).length;
    if (avgScore < 0.5) {
      baseDays += 21; // 3 extra weeks for severe weaknesses
    } else if (avgScore < 0.7) {
      baseDays += 14; // 2 extra weeks for moderate weaknesses
    }
    
    // Consider consistency issues
    const confidenceVariance = this.calculateVariance(analyses.map(a => a.confidenceScore));
    if (confidenceVariance > 0.15) {
      baseDays += 7; // 1 extra week for consistency issues
    }
    
    return Math.min(baseDays, 90); // Cap at 90 days
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  private formatCategoryName(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1');
  }
}