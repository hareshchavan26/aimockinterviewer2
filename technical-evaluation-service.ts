import {
  RoleSpecificCriteria,
  TechnicalSkill,
  TechnicalDomain,
  TechnicalCategory,
  SkillImportance,
  CriteriaType,
  DifficultyLevel,
  ComplexityExpectation,
} from '../types/ai-interviewer';

export class TechnicalEvaluationService {
  private roleSpecificCriteria: Map<string, RoleSpecificCriteria> = new Map();

  constructor() {
    this.initializeRoleSpecificCriteria();
  }

  getRoleSpecificCriteria(role: string, industry: string): RoleSpecificCriteria {
    const key = `${role.toLowerCase()}_${industry.toLowerCase()}`;
    return this.roleSpecificCriteria.get(key) || this.getDefaultCriteria(role, industry);
  }

  getTechnicalDomainForRole(role: string): TechnicalDomain {
    const roleMapping: Record<string, TechnicalDomain> = {
      'software engineer': TechnicalDomain.SOFTWARE_ENGINEERING,
      'frontend developer': TechnicalDomain.FRONTEND_DEVELOPMENT,
      'backend developer': TechnicalDomain.BACKEND_DEVELOPMENT,
      'full stack developer': TechnicalDomain.SOFTWARE_ENGINEERING,
      'data scientist': TechnicalDomain.DATA_SCIENCE,
      'ml engineer': TechnicalDomain.MACHINE_LEARNING,
      'devops engineer': TechnicalDomain.DEVOPS,
      'system architect': TechnicalDomain.SYSTEM_DESIGN,
      'security engineer': TechnicalDomain.CYBERSECURITY,
      'mobile developer': TechnicalDomain.MOBILE_DEVELOPMENT,
      'cloud architect': TechnicalDomain.CLOUD_ARCHITECTURE,
    };

    return roleMapping[role.toLowerCase()] || TechnicalDomain.SOFTWARE_ENGINEERING;
  }

  private initializeRoleSpecificCriteria(): void {
    // Software Engineer criteria
    this.roleSpecificCriteria.set('software engineer_technology', {
      role: 'Software Engineer',
      industry: 'Technology',
      requiredSkills: [
        {
          name: 'Algorithm Design',
          category: TechnicalCategory.ALGORITHM,
          importance: SkillImportance.CRITICAL,
          keywords: ['algorithm', 'complexity', 'optimization', 'efficiency'],
          assessmentCriteria: [
            'Can design efficient algorithms',
            'Understands time and space complexity',
            'Can optimize existing solutions',
          ],
        },
        {
          name: 'Data Structures',
          category: TechnicalCategory.DATA_STRUCTURE,
          importance: SkillImportance.CRITICAL,
          keywords: ['array', 'tree', 'graph', 'hash', 'stack', 'queue'],
          assessmentCriteria: [
            'Knows when to use appropriate data structures',
            'Can implement common data structures',
            'Understands trade-offs between different structures',
          ],
        },
        {
          name: 'System Design',
          category: TechnicalCategory.SYSTEM_DESIGN,
          importance: SkillImportance.HIGH,
          keywords: ['scalability', 'architecture', 'distributed', 'microservices'],
          assessmentCriteria: [
            'Can design scalable systems',
            'Understands distributed system concepts',
            'Can make architectural trade-offs',
          ],
        },
        {
          name: 'Code Quality',
          category: TechnicalCategory.PROGRAMMING_LANGUAGE,
          importance: SkillImportance.HIGH,
          keywords: ['clean code', 'maintainable', 'readable', 'best practices'],
          assessmentCriteria: [
            'Writes clean, readable code',
            'Follows best practices',
            'Considers maintainability',
          ],
        },
      ],
      evaluationWeights: {
        [CriteriaType.TECHNICAL_ACCURACY]: 0.4,
        [CriteriaType.PROBLEM_SOLVING]: 0.3,
        [CriteriaType.COMMUNICATION]: 0.2,
        [CriteriaType.STRUCTURE]: 0.1,
        [CriteriaType.CONTENT_QUALITY]: 0.0,
        [CriteriaType.CREATIVITY]: 0.0,
        [CriteriaType.LEADERSHIP]: 0.0,
      },
      complexityExpectations: [
        {
          level: DifficultyLevel.ENTRY,
          expectedTimeComplexity: ['O(n)', 'O(n log n)'],
          expectedSpaceComplexity: ['O(1)', 'O(n)'],
          requiredConcepts: ['basic algorithms', 'simple data structures'],
        },
        {
          level: DifficultyLevel.JUNIOR,
          expectedTimeComplexity: ['O(n)', 'O(n log n)', 'O(n²)'],
          expectedSpaceComplexity: ['O(1)', 'O(n)', 'O(log n)'],
          requiredConcepts: ['sorting', 'searching', 'basic dynamic programming'],
        },
        {
          level: DifficultyLevel.MID,
          expectedTimeComplexity: ['O(n log n)', 'O(n²)', 'O(2^n)'],
          expectedSpaceComplexity: ['O(n)', 'O(log n)', 'O(n²)'],
          requiredConcepts: ['advanced algorithms', 'graph algorithms', 'dynamic programming'],
        },
        {
          level: DifficultyLevel.SENIOR,
          expectedTimeComplexity: ['O(n log n)', 'O(n²)', 'O(2^n)', 'O(n!)'],
          expectedSpaceComplexity: ['O(n)', 'O(n²)', 'O(2^n)'],
          requiredConcepts: ['complex algorithms', 'optimization', 'advanced data structures'],
        },
      ],
    });

    // Frontend Developer criteria
    this.roleSpecificCriteria.set('frontend developer_technology', {
      role: 'Frontend Developer',
      industry: 'Technology',
      requiredSkills: [
        {
          name: 'JavaScript/TypeScript',
          category: TechnicalCategory.PROGRAMMING_LANGUAGE,
          importance: SkillImportance.CRITICAL,
          keywords: ['javascript', 'typescript', 'es6', 'async', 'promises'],
          assessmentCriteria: [
            'Strong JavaScript fundamentals',
            'Understands modern ES6+ features',
            'Can work with asynchronous code',
          ],
        },
        {
          name: 'React/Vue/Angular',
          category: TechnicalCategory.FRAMEWORK,
          importance: SkillImportance.CRITICAL,
          keywords: ['react', 'vue', 'angular', 'components', 'state management'],
          assessmentCriteria: [
            'Can build complex UI components',
            'Understands component lifecycle',
            'Knows state management patterns',
          ],
        },
        {
          name: 'CSS/Styling',
          category: TechnicalCategory.PROGRAMMING_LANGUAGE,
          importance: SkillImportance.HIGH,
          keywords: ['css', 'flexbox', 'grid', 'responsive', 'animations'],
          assessmentCriteria: [
            'Can create responsive layouts',
            'Understands CSS architecture',
            'Can implement complex styling',
          ],
        },
        {
          name: 'Performance Optimization',
          category: TechnicalCategory.ARCHITECTURE,
          importance: SkillImportance.MEDIUM,
          keywords: ['performance', 'optimization', 'lazy loading', 'bundling'],
          assessmentCriteria: [
            'Understands performance bottlenecks',
            'Can optimize bundle size',
            'Knows caching strategies',
          ],
        },
      ],
      evaluationWeights: {
        [CriteriaType.TECHNICAL_ACCURACY]: 0.35,
        [CriteriaType.CREATIVITY]: 0.25,
        [CriteriaType.PROBLEM_SOLVING]: 0.2,
        [CriteriaType.COMMUNICATION]: 0.15,
        [CriteriaType.STRUCTURE]: 0.05,
        [CriteriaType.CONTENT_QUALITY]: 0.0,
        [CriteriaType.LEADERSHIP]: 0.0,
      },
      complexityExpectations: [
        {
          level: DifficultyLevel.ENTRY,
          expectedTimeComplexity: ['O(n)', 'O(1)'],
          expectedSpaceComplexity: ['O(1)', 'O(n)'],
          requiredConcepts: ['basic DOM manipulation', 'event handling'],
        },
        {
          level: DifficultyLevel.JUNIOR,
          expectedTimeComplexity: ['O(n)', 'O(n log n)'],
          expectedSpaceComplexity: ['O(n)', 'O(log n)'],
          requiredConcepts: ['component architecture', 'state management'],
        },
        {
          level: DifficultyLevel.MID,
          expectedTimeComplexity: ['O(n log n)', 'O(n²)'],
          expectedSpaceComplexity: ['O(n)', 'O(n²)'],
          requiredConcepts: ['performance optimization', 'complex state management'],
        },
        {
          level: DifficultyLevel.SENIOR,
          expectedTimeComplexity: ['O(n²)', 'O(2^n)'],
          expectedSpaceComplexity: ['O(n²)', 'O(2^n)'],
          requiredConcepts: ['architecture design', 'advanced optimization'],
        },
      ],
    });

    // Data Scientist criteria
    this.roleSpecificCriteria.set('data scientist_technology', {
      role: 'Data Scientist',
      industry: 'Technology',
      requiredSkills: [
        {
          name: 'Statistical Analysis',
          category: TechnicalCategory.ALGORITHM,
          importance: SkillImportance.CRITICAL,
          keywords: ['statistics', 'hypothesis testing', 'regression', 'correlation'],
          assessmentCriteria: [
            'Understands statistical concepts',
            'Can perform hypothesis testing',
            'Knows when to use different statistical methods',
          ],
        },
        {
          name: 'Machine Learning',
          category: TechnicalCategory.ALGORITHM,
          importance: SkillImportance.CRITICAL,
          keywords: ['machine learning', 'supervised', 'unsupervised', 'model evaluation'],
          assessmentCriteria: [
            'Can select appropriate ML algorithms',
            'Understands model evaluation metrics',
            'Can handle overfitting and underfitting',
          ],
        },
        {
          name: 'Python/R Programming',
          category: TechnicalCategory.PROGRAMMING_LANGUAGE,
          importance: SkillImportance.HIGH,
          keywords: ['python', 'pandas', 'numpy', 'scikit-learn', 'matplotlib'],
          assessmentCriteria: [
            'Proficient in data manipulation libraries',
            'Can implement ML algorithms',
            'Can create effective visualizations',
          ],
        },
        {
          name: 'Data Processing',
          category: TechnicalCategory.DATA_STRUCTURE,
          importance: SkillImportance.HIGH,
          keywords: ['data cleaning', 'feature engineering', 'etl', 'preprocessing'],
          assessmentCriteria: [
            'Can clean and preprocess data',
            'Understands feature engineering',
            'Can handle missing data appropriately',
          ],
        },
      ],
      evaluationWeights: {
        [CriteriaType.TECHNICAL_ACCURACY]: 0.4,
        [CriteriaType.PROBLEM_SOLVING]: 0.3,
        [CriteriaType.COMMUNICATION]: 0.2,
        [CriteriaType.CREATIVITY]: 0.1,
        [CriteriaType.CONTENT_QUALITY]: 0.0,
        [CriteriaType.STRUCTURE]: 0.0,
        [CriteriaType.LEADERSHIP]: 0.0,
      },
      complexityExpectations: [
        {
          level: DifficultyLevel.ENTRY,
          expectedTimeComplexity: ['O(n)', 'O(n log n)'],
          expectedSpaceComplexity: ['O(n)', 'O(1)'],
          requiredConcepts: ['basic statistics', 'simple ML algorithms'],
        },
        {
          level: DifficultyLevel.JUNIOR,
          expectedTimeComplexity: ['O(n log n)', 'O(n²)'],
          expectedSpaceComplexity: ['O(n)', 'O(n²)'],
          requiredConcepts: ['supervised learning', 'data preprocessing'],
        },
        {
          level: DifficultyLevel.MID,
          expectedTimeComplexity: ['O(n²)', 'O(n³)'],
          expectedSpaceComplexity: ['O(n²)', 'O(n³)'],
          requiredConcepts: ['advanced ML', 'feature engineering', 'model selection'],
        },
        {
          level: DifficultyLevel.SENIOR,
          expectedTimeComplexity: ['O(n³)', 'O(2^n)'],
          expectedSpaceComplexity: ['O(n³)', 'O(2^n)'],
          requiredConcepts: ['deep learning', 'advanced statistics', 'model optimization'],
        },
      ],
    });
  }

  private getDefaultCriteria(role: string, industry: string): RoleSpecificCriteria {
    return {
      role,
      industry,
      requiredSkills: [
        {
          name: 'Problem Solving',
          category: TechnicalCategory.ALGORITHM,
          importance: SkillImportance.HIGH,
          keywords: ['problem solving', 'analytical thinking', 'logic'],
          assessmentCriteria: [
            'Can break down complex problems',
            'Shows logical thinking process',
            'Can identify edge cases',
          ],
        },
        {
          name: 'Technical Communication',
          category: TechnicalCategory.PROGRAMMING_LANGUAGE,
          importance: SkillImportance.MEDIUM,
          keywords: ['explanation', 'clarity', 'technical concepts'],
          assessmentCriteria: [
            'Can explain technical concepts clearly',
            'Uses appropriate technical terminology',
            'Can communicate trade-offs',
          ],
        },
      ],
      evaluationWeights: {
        [CriteriaType.TECHNICAL_ACCURACY]: 0.3,
        [CriteriaType.PROBLEM_SOLVING]: 0.3,
        [CriteriaType.COMMUNICATION]: 0.2,
        [CriteriaType.STRUCTURE]: 0.1,
        [CriteriaType.CONTENT_QUALITY]: 0.1,
        [CriteriaType.CREATIVITY]: 0.0,
        [CriteriaType.LEADERSHIP]: 0.0,
      },
      complexityExpectations: [
        {
          level: DifficultyLevel.ENTRY,
          expectedTimeComplexity: ['O(n)', 'O(1)'],
          expectedSpaceComplexity: ['O(1)', 'O(n)'],
          requiredConcepts: ['basic problem solving'],
        },
        {
          level: DifficultyLevel.MID,
          expectedTimeComplexity: ['O(n log n)', 'O(n²)'],
          expectedSpaceComplexity: ['O(n)', 'O(n²)'],
          requiredConcepts: ['intermediate problem solving'],
        },
        {
          level: DifficultyLevel.SENIOR,
          expectedTimeComplexity: ['O(n²)', 'O(2^n)'],
          expectedSpaceComplexity: ['O(n²)', 'O(2^n)'],
          requiredConcepts: ['advanced problem solving'],
        },
      ],
    };
  }
}