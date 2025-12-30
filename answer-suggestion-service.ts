import {
  UserResponse,
  ResponseAnalysis,
  InterviewSession,
} from '@ai-interview/types';
import { logger } from '../utils/logger';
import { BetterAnswerSuggestion, STARExample } from './improvement-recommendation-service';

export interface AnswerSuggestionService {
  generateBetterAnswerSuggestions(
    session: InterviewSession,
    responses: UserResponse[],
    analyses: ResponseAnalysis[]
  ): Promise<BetterAnswerSuggestion[]>;
  
  generateSTARMethodSuggestion(
    originalResponse: string,
    questionType: string,
    industry: string,
    role: string
  ): Promise<STARExample>;
  
  generateAnswerTemplates(
    questionType: string,
    industry: string,
    role: string
  ): Promise<AnswerTemplate[]>;
}

export interface AnswerTemplate {
  questionType: string;
  template: string;
  example: string;
  keyPoints: string[];
  commonMistakes: string[];
}

export class DefaultAnswerSuggestionService implements AnswerSuggestionService {
  
  async generateBetterAnswerSuggestions(
    session: InterviewSession,
    responses: UserResponse[],
    analyses: ResponseAnalysis[]
  ): Promise<BetterAnswerSuggestion[]> {
    try {
      logger.info('Generating better answer suggestions', { 
        sessionId: session.id,
        responseCount: responses.length 
      });

      const suggestions: BetterAnswerSuggestion[] = [];

      for (let i = 0; i < responses.length && i < analyses.length; i++) {
        const response = responses[i];
        const analysis = analyses[i];
        const question = session.questions[i];

        if (!response.textResponse || analysis.overallScore > 0.8) {
          continue; // Skip if no text response or already excellent
        }

        const suggestion = await this.generateSingleAnswerSuggestion(
          response.textResponse,
          analysis,
          question?.type || 'behavioral',
          session.config.industry,
          session.config.role
        );

        if (suggestion) {
          suggestions.push(suggestion);
        }
      }

      logger.info('Generated answer suggestions', { 
        sessionId: session.id,
        suggestionsCount: suggestions.length 
      });

      return suggestions;
    } catch (error) {
      logger.error('Failed to generate answer suggestions', { 
        sessionId: session.id, 
        error 
      });
      throw error;
    }
  }

  async generateSTARMethodSuggestion(
    originalResponse: string,
    questionType: string,
    industry: string,
    role: string
  ): Promise<STARExample> {
    // Generate a STAR method example based on the context
    const templates = await this.getSTARTemplatesByContext(questionType, industry, role);
    const selectedTemplate = templates[0] || this.getDefaultSTARTemplate();

    return {
      situation: selectedTemplate.situation,
      task: selectedTemplate.task,
      action: selectedTemplate.action,
      result: selectedTemplate.result,
      fullExample: this.combineSTARElements(selectedTemplate)
    };
  }

  async generateAnswerTemplates(
    questionType: string,
    industry: string,
    role: string
  ): Promise<AnswerTemplate[]> {
    const templates: AnswerTemplate[] = [];

    switch (questionType) {
      case 'behavioral':
        templates.push({
          questionType: 'behavioral',
          template: 'Use the STAR method: Situation → Task → Action → Result',
          example: 'In my previous role at [Company], I faced a situation where [specific challenge]. My task was to [specific responsibility]. I took action by [specific steps taken]. As a result, [quantifiable outcome].',
          keyPoints: [
            'Be specific with details',
            'Quantify results when possible',
            'Focus on your individual contribution',
            'Choose relevant examples'
          ],
          commonMistakes: [
            'Being too vague or general',
            'Not explaining your specific role',
            'Forgetting to mention the outcome',
            'Using irrelevant examples'
          ]
        });
        break;

      case 'technical':
        templates.push({
          questionType: 'technical',
          template: 'Problem → Approach → Implementation → Validation',
          example: `When faced with [technical problem], I analyzed the requirements and chose [approach] because [reasoning]. I implemented [specific solution] using [technologies/methods]. I validated the solution by [testing/metrics] which showed [results].`,
          keyPoints: [
            'Explain your thought process',
            'Justify your technical decisions',
            'Mention specific technologies used',
            'Discuss trade-offs considered'
          ],
          commonMistakes: [
            'Jumping to solution without explaining reasoning',
            'Using too much jargon without explanation',
            'Not considering alternative approaches',
            'Forgetting to mention validation/testing'
          ]
        });
        break;

      case 'situational':
        templates.push({
          questionType: 'situational',
          template: 'Understand → Analyze → Plan → Execute → Monitor',
          example: 'First, I would gather information to understand [situation details]. Then I would analyze [key factors] to identify [main challenges]. My plan would be to [specific steps]. I would execute by [implementation approach] while monitoring [success metrics].',
          keyPoints: [
            'Show systematic thinking',
            'Consider multiple perspectives',
            'Demonstrate leadership qualities',
            'Think about long-term implications'
          ],
          commonMistakes: [
            'Rushing to a solution',
            'Not considering stakeholder impact',
            'Ignoring potential risks',
            'Being too theoretical'
          ]
        });
        break;

      default:
        templates.push({
          questionType: 'general',
          template: 'Context → Challenge → Solution → Impact',
          example: 'In the context of [situation], the main challenge was [specific problem]. I addressed this by [solution approach] which resulted in [positive impact].',
          keyPoints: [
            'Provide clear context',
            'Identify the core challenge',
            'Explain your solution',
            'Highlight the positive impact'
          ],
          commonMistakes: [
            'Lack of structure',
            'Too much background information',
            'Weak or unclear solutions',
            'No measurable outcomes'
          ]
        });
    }

    return templates;
  }

  private async generateSingleAnswerSuggestion(
    originalResponse: string,
    analysis: ResponseAnalysis,
    questionType: string,
    industry: string,
    role: string
  ): Promise<BetterAnswerSuggestion | null> {
    if (!originalResponse || originalResponse.length < 10) {
      return null;
    }

    const improvements: string[] = [];
    let improvedVersion = originalResponse;

    // Structure improvement
    if (analysis.textAnalysis.structureScore < 0.6) {
      improvements.push('Add clear structure using a framework like STAR method');
      improvedVersion = await this.improveStructure(
        improvedVersion, 
        questionType, 
        industry, 
        role
      );
    }

    // Clarity improvement
    if (analysis.textAnalysis.clarityScore < 0.6) {
      improvements.push('Use more specific examples and concrete details');
      improvedVersion = this.improveClarity(improvedVersion);
    }

    // Confidence improvement
    if (analysis.confidenceScore < 0.6) {
      improvements.push('Use more assertive language and eliminate hedging words');
      improvedVersion = this.improveConfidence(improvedVersion);
    }

    // Relevance improvement
    if (analysis.textAnalysis.keywordRelevance < 0.6) {
      improvements.push('Include more relevant keywords and industry-specific terms');
      improvedVersion = this.improveRelevance(improvedVersion, industry, role);
    }

    // Grammar and professionalism
    if (analysis.textAnalysis.grammarScore < 0.8) {
      improvements.push('Improve grammar and use more professional language');
      improvedVersion = this.improveGrammar(improvedVersion);
    }

    // Ensure we have at least some improvements
    if (improvements.length === 0) {
      improvements.push('Enhance overall response quality and professionalism');
      improvedVersion = this.improveClarity(this.improveConfidence(improvedVersion));
    }

    const reasoning = this.generateImprovementReasoning(analysis, improvements);
    const starExample = questionType === 'behavioral' ? 
      await this.generateSTARMethodSuggestion(originalResponse, questionType, industry, role) : 
      undefined;

    return {
      originalResponse,
      improvedVersion,
      improvements,
      reasoning,
      starMethodExample: starExample
    };
  }

  private async improveStructure(
    response: string, 
    questionType: string, 
    industry: string, 
    role: string
  ): Promise<string> {
    if (questionType === 'behavioral') {
      // Apply STAR method structure
      const starExample = await this.generateSTARMethodSuggestion(
        response, 
        questionType, 
        industry, 
        role
      );
      
      return `Let me structure this using the STAR method. ${starExample.fullExample}`;
    } else if (questionType === 'technical') {
      // Apply technical problem-solving structure
      return `Let me walk through my approach systematically. First, I would analyze the problem: ${response}. Then I would implement a solution and validate the results.`;
    } else {
      // General structure improvement
      return `To address this question comprehensively: ${response}. In summary, this approach would effectively handle the situation.`;
    }
  }

  private improveClarity(response: string): string {
    return response
      .replace(/\bthing\b/g, 'solution')
      .replace(/\bstuff\b/g, 'components')
      .replace(/\bkind of\b/g, '')
      .replace(/\bsort of\b/g, '')
      .replace(/\ba lot\b/g, 'significantly')
      .replace(/\breally\b/g, 'particularly')
      .replace(/\bbasically\b/g, '');
  }

  private improveConfidence(response: string): string {
    return response
      .replace(/\bI think\b/g, 'I believe')
      .replace(/\bmaybe\b/g, '')
      .replace(/\bprobably\b/g, '')
      .replace(/\bI guess\b/g, 'I would')
      .replace(/\bmight\b/g, 'would')
      .replace(/\bcould\b/g, 'would')
      .replace(/\bI'm not sure but\b/g, 'In my experience,');
  }

  private improveRelevance(response: string, industry: string, role: string): string {
    // Add industry-specific context
    const industryTerms = this.getIndustryTerms(industry);
    const roleTerms = this.getRoleTerms(role);
    
    let improved = response;
    
    // Add relevant context if missing
    if (!improved.toLowerCase().includes(industry.toLowerCase())) {
      improved = `In the ${industry} industry, ${improved.toLowerCase()}`;
    }
    
    // Add role-specific perspective if missing
    if (!improved.toLowerCase().includes(role.toLowerCase())) {
      improved = `${improved} As a ${role}, this approach aligns with best practices in our field.`;
    }
    
    return improved;
  }

  private improveGrammar(response: string): string {
    return response
      .replace(/\bi\b/g, 'I') // Capitalize I
      .replace(/\.\s+([a-z])/g, (match, letter) => `. ${letter.toUpperCase()}`) // Capitalize after periods
      .replace(/\s+/g, ' ') // Remove extra spaces
      .trim();
  }

  private generateImprovementReasoning(
    analysis: ResponseAnalysis,
    improvements: string[]
  ): string {
    let reasoning = 'Based on the analysis of your response, here are the key improvements that will make your answer more impactful:\n\n';
    
    improvements.forEach((improvement, index) => {
      reasoning += `${index + 1}. ${improvement}\n`;
    });
    
    reasoning += '\nThese changes will help you deliver more structured, confident, and memorable responses that better showcase your qualifications.';
    
    return reasoning;
  }

  private async getSTARTemplatesByContext(
    questionType: string,
    industry: string,
    role: string
  ): Promise<any[]> {
    const templates = [];
    
    if (questionType === 'behavioral') {
      templates.push({
        situation: `In my previous role as a ${role} at a ${industry} company`,
        task: 'I was responsible for leading a critical project under tight deadlines',
        action: 'I organized the team, established clear milestones, and implemented daily check-ins to ensure progress',
        result: 'We delivered the project on time and 15% under budget, which led to a client renewal worth $500K'
      });
      
      templates.push({
        situation: `While working on a challenging ${industry} project`,
        task: 'I needed to resolve a complex technical issue that was blocking the team',
        action: 'I researched the problem, consulted with experts, and developed a comprehensive solution',
        result: 'The solution not only fixed the immediate issue but also prevented similar problems, saving 20 hours per week'
      });
    }
    
    return templates;
  }

  private getDefaultSTARTemplate(): any {
    return {
      situation: 'In my previous role at TechCorp',
      task: 'I was tasked with improving team productivity',
      action: 'I implemented new processes and provided training to team members',
      result: 'This resulted in a 25% increase in productivity and improved team satisfaction'
    };
  }

  private combineSTARElements(template: any): string {
    return `${template.situation}, ${template.task}. ${template.action}. ${template.result}.`;
  }

  private getIndustryTerms(industry: string): string[] {
    const industryTermsMap: { [key: string]: string[] } = {
      'Technology': ['scalability', 'architecture', 'deployment', 'optimization', 'integration'],
      'Finance': ['risk management', 'compliance', 'portfolio', 'analysis', 'regulations'],
      'Healthcare': ['patient care', 'compliance', 'safety protocols', 'quality assurance', 'regulations'],
      'Consulting': ['client engagement', 'stakeholder management', 'strategic planning', 'deliverables', 'methodology'],
      'Marketing': ['campaign optimization', 'ROI', 'brand awareness', 'customer acquisition', 'analytics']
    };
    
    return industryTermsMap[industry] || ['best practices', 'efficiency', 'quality', 'results', 'improvement'];
  }

  private getRoleTerms(role: string): string[] {
    const roleTermsMap: { [key: string]: string[] } = {
      'Software Engineer': ['code quality', 'testing', 'debugging', 'performance', 'maintainability'],
      'Product Manager': ['roadmap', 'stakeholders', 'requirements', 'prioritization', 'metrics'],
      'Data Scientist': ['analysis', 'modeling', 'insights', 'validation', 'interpretation'],
      'Marketing Manager': ['campaigns', 'targeting', 'conversion', 'engagement', 'attribution'],
      'Consultant': ['recommendations', 'analysis', 'implementation', 'client value', 'methodology']
    };
    
    return roleTermsMap[role] || ['leadership', 'collaboration', 'problem-solving', 'results', 'innovation'];
  }
}