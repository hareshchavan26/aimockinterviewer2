import {
  PerformanceReport,
  CategoryScores,
  InterviewSession,
} from '@ai-interview/types';
import { logger } from '../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ExportOptions {
  format: 'pdf' | 'json' | 'csv';
  includeTranscript?: boolean;
  includeVisualComponents?: boolean;
  includeImprovementPlan?: boolean;
  includeBenchmarkComparison?: boolean;
}

export interface ShareableLink {
  id: string;
  reportId: string;
  userId: string;
  url: string;
  expiresAt: Date;
  accessCount: number;
  maxAccess?: number;
  isActive: boolean;
  createdAt: Date;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  downloadUrl?: string;
  fileSize?: number;
  format: string;
  error?: string;
}

export interface ReportExportService {
  exportToPDF(
    report: PerformanceReport,
    session: InterviewSession,
    options?: Partial<ExportOptions>
  ): Promise<ExportResult>;
  
  exportToJSON(
    report: PerformanceReport,
    session: InterviewSession,
    options?: Partial<ExportOptions>
  ): Promise<ExportResult>;
  
  exportToCSV(
    reports: PerformanceReport[],
    sessions: InterviewSession[],
    options?: Partial<ExportOptions>
  ): Promise<ExportResult>;
  
  createShareableLink(
    reportId: string,
    userId: string,
    expirationHours?: number,
    maxAccess?: number
  ): Promise<ShareableLink>;
  
  getShareableLink(linkId: string): Promise<ShareableLink | null>;
  
  revokeShareableLink(linkId: string): Promise<void>;
  
  getReportByShareableLink(linkId: string): Promise<PerformanceReport | null>;
}

export class DefaultReportExportService implements ReportExportService {
  private readonly exportDir = './exports';
  private readonly baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  constructor() {
    this.ensureExportDirectory();
  }

  async exportToPDF(
    report: PerformanceReport,
    session: InterviewSession,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      logger.info('Exporting report to PDF', { 
        reportId: report.id, 
        sessionId: session.id 
      });

      const exportOptions: ExportOptions = {
        format: 'pdf',
        includeTranscript: true,
        includeVisualComponents: true,
        includeImprovementPlan: true,
        includeBenchmarkComparison: true,
        ...options
      };

      // Generate PDF content (in a real implementation, this would use a PDF library like puppeteer or jsPDF)
      const pdfContent = this.generatePDFContent(report, session, exportOptions);
      
      const fileName = `interview-report-${report.id}-${Date.now()}.pdf`;
      const filePath = path.join(this.exportDir, fileName);
      
      // In a real implementation, this would generate actual PDF bytes
      await fs.writeFile(filePath, pdfContent, 'utf8');
      
      const fileStats = await fs.stat(filePath);
      const downloadUrl = `${this.baseUrl}/api/reports/download/${fileName}`;

      logger.info('PDF export completed', { 
        reportId: report.id, 
        filePath, 
        fileSize: fileStats.size 
      });

      return {
        success: true,
        filePath,
        downloadUrl,
        fileSize: fileStats.size,
        format: 'pdf'
      };

    } catch (error) {
      logger.error('Failed to export report to PDF', { error, reportId: report.id });
      return {
        success: false,
        format: 'pdf',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async exportToJSON(
    report: PerformanceReport,
    session: InterviewSession,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      logger.info('Exporting report to JSON', { 
        reportId: report.id, 
        sessionId: session.id 
      });

      const exportOptions: ExportOptions = {
        format: 'json',
        includeTranscript: true,
        includeVisualComponents: false, // Visual components not needed in JSON
        includeImprovementPlan: true,
        includeBenchmarkComparison: true,
        ...options
      };

      const exportData = this.prepareJSONExportData(report, session, exportOptions);
      
      const fileName = `interview-report-${report.id}-${Date.now()}.json`;
      const filePath = path.join(this.exportDir, fileName);
      
      await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
      
      const fileStats = await fs.stat(filePath);
      const downloadUrl = `${this.baseUrl}/api/reports/download/${fileName}`;

      logger.info('JSON export completed', { 
        reportId: report.id, 
        filePath, 
        fileSize: fileStats.size 
      });

      return {
        success: true,
        filePath,
        downloadUrl,
        fileSize: fileStats.size,
        format: 'json'
      };

    } catch (error) {
      logger.error('Failed to export report to JSON', { error, reportId: report.id });
      return {
        success: false,
        format: 'json',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async exportToCSV(
    reports: PerformanceReport[],
    sessions: InterviewSession[],
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      logger.info('Exporting reports to CSV', { 
        reportCount: reports.length,
        sessionCount: sessions.length 
      });

      const exportOptions: ExportOptions = {
        format: 'csv',
        includeTranscript: false, // Transcripts don't work well in CSV
        includeVisualComponents: false,
        includeImprovementPlan: false,
        includeBenchmarkComparison: true,
        ...options
      };

      const csvContent = this.generateCSVContent(reports, sessions, exportOptions);
      
      const fileName = `interview-reports-${Date.now()}.csv`;
      const filePath = path.join(this.exportDir, fileName);
      
      await fs.writeFile(filePath, csvContent, 'utf8');
      
      const fileStats = await fs.stat(filePath);
      const downloadUrl = `${this.baseUrl}/api/reports/download/${fileName}`;

      logger.info('CSV export completed', { 
        reportCount: reports.length,
        filePath, 
        fileSize: fileStats.size 
      });

      return {
        success: true,
        filePath,
        downloadUrl,
        fileSize: fileStats.size,
        format: 'csv'
      };

    } catch (error) {
      logger.error('Failed to export reports to CSV', { error, reportCount: reports.length });
      return {
        success: false,
        format: 'csv',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createShareableLink(
    reportId: string,
    userId: string,
    expirationHours: number = 24,
    maxAccess?: number
  ): Promise<ShareableLink> {
    try {
      logger.info('Creating shareable link', { reportId, userId, expirationHours });

      const linkId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
      
      const shareableLink: ShareableLink = {
        id: linkId,
        reportId,
        userId,
        url: `${this.baseUrl}/shared/report/${linkId}`,
        expiresAt,
        accessCount: 0,
        maxAccess,
        isActive: true,
        createdAt: new Date()
      };

      // In a real implementation, this would be saved to database
      logger.info('Shareable link created', { 
        linkId, 
        reportId, 
        expiresAt: shareableLink.expiresAt 
      });

      return shareableLink;

    } catch (error) {
      logger.error('Failed to create shareable link', { error, reportId, userId });
      throw error;
    }
  }

  async getShareableLink(linkId: string): Promise<ShareableLink | null> {
    try {
      logger.info('Retrieving shareable link', { linkId });

      // In a real implementation, this would query the database
      // For now, return a mock link if the format is correct
      if (linkId.startsWith('share_')) {
        const mockLink: ShareableLink = {
          id: linkId,
          reportId: 'report-123',
          userId: 'user-456',
          url: `${this.baseUrl}/shared/report/${linkId}`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          accessCount: 0,
          isActive: true,
          createdAt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
        };

        return mockLink;
      }

      return null;

    } catch (error) {
      logger.error('Failed to retrieve shareable link', { error, linkId });
      throw error;
    }
  }

  async revokeShareableLink(linkId: string): Promise<void> {
    try {
      logger.info('Revoking shareable link', { linkId });

      // In a real implementation, this would update the database
      logger.info('Shareable link revoked', { linkId });

    } catch (error) {
      logger.error('Failed to revoke shareable link', { error, linkId });
      throw error;
    }
  }

  async getReportByShareableLink(linkId: string): Promise<PerformanceReport | null> {
    try {
      logger.info('Getting report by shareable link', { linkId });

      const shareableLink = await this.getShareableLink(linkId);
      
      if (!shareableLink || !shareableLink.isActive) {
        logger.warn('Shareable link not found or inactive', { linkId });
        return null;
      }

      if (shareableLink.expiresAt < new Date()) {
        logger.warn('Shareable link expired', { linkId, expiresAt: shareableLink.expiresAt });
        return null;
      }

      if (shareableLink.maxAccess && shareableLink.accessCount >= shareableLink.maxAccess) {
        logger.warn('Shareable link access limit exceeded', { 
          linkId, 
          accessCount: shareableLink.accessCount,
          maxAccess: shareableLink.maxAccess 
        });
        return null;
      }

      // In a real implementation, this would fetch the actual report from database
      // and increment the access count
      const mockReport: PerformanceReport = {
        id: shareableLink.reportId,
        sessionId: 'session-123',
        userId: shareableLink.userId,
        overallScore: 0.78,
        categoryScores: {
          communication: 0.75,
          technicalAccuracy: 0.82,
          confidence: 0.68,
          clarity: 0.79,
          structure: 0.73,
          relevance: 0.81,
        },
        strengths: ['technicalAccuracy', 'relevance'],
        weaknesses: ['confidence'],
        improvementPlan: {
          priorityAreas: ['confidence'],
          recommendations: [{
            category: 'confidence',
            description: 'Practice speaking with more conviction',
            actionItems: ['Record practice sessions', 'Focus on tone'],
            resources: []
          }],
          practiceExercises: [{
            title: 'Confidence Building',
            description: 'Record yourself answering questions',
            difficulty: 'medium' as const,
            estimatedDuration: 30,
            category: 'confidence'
          }],
          estimatedTimeToImprove: 14,
        },
        benchmarkComparison: {
          percentile: 65,
          averageScore: 0.78,
          topPerformerScore: 0.9,
          industryAverage: 0.7,
          roleAverage: 0.72,
        },
        transcript: {
          segments: [],
          highlights: [],
          summary: 'Mock transcript for shared report',
        },
        visualComponents: {
          scoreChart: { type: 'radar', data: [], colors: [], labels: [] },
          confidenceHeatmap: { 
            timePoints: [], 
            dimensions: { width: 800, height: 400 }, 
            colorScale: { min: '#ffebee', max: '#c8e6c9', steps: 10 } 
          },
          progressChart: { 
            type: 'line', 
            timeSeriesData: [], 
            trendLine: { slope: 0.1, direction: 'improving', confidence: 0.8 } 
          },
          categoryBreakdown: { type: 'donut', segments: [], totalScore: 0.78 },
        },
        createdAt: new Date(),
      };

      logger.info('Report retrieved via shareable link', { 
        linkId, 
        reportId: mockReport.id 
      });

      return mockReport;

    } catch (error) {
      logger.error('Failed to get report by shareable link', { error, linkId });
      throw error;
    }
  }

  private async ensureExportDirectory(): Promise<void> {
    try {
      await fs.access(this.exportDir);
    } catch {
      await fs.mkdir(this.exportDir, { recursive: true });
      logger.info('Created export directory', { exportDir: this.exportDir });
    }
  }

  private generatePDFContent(
    report: PerformanceReport,
    session: InterviewSession,
    options: ExportOptions
  ): string {
    // In a real implementation, this would generate actual PDF content
    // For now, return a text representation that could be converted to PDF
    
    let content = `INTERVIEW PERFORMANCE REPORT\n`;
    content += `================================\n\n`;
    content += `Report ID: ${report.id}\n`;
    content += `Session ID: ${session.id}\n`;
    content += `Date: ${report.createdAt.toLocaleDateString()}\n`;
    content += `Overall Score: ${Math.round(report.overallScore * 100)}%\n\n`;

    content += `CATEGORY SCORES\n`;
    content += `---------------\n`;
    Object.entries(report.categoryScores).forEach(([category, score]) => {
      content += `${this.formatCategoryName(category)}: ${Math.round(score * 100)}%\n`;
    });

    content += `\nSTRENGTHS\n`;
    content += `---------\n`;
    report.strengths.forEach(strength => {
      content += `• ${this.formatCategoryName(strength)}\n`;
    });

    content += `\nAREAS FOR IMPROVEMENT\n`;
    content += `--------------------\n`;
    report.weaknesses.forEach(weakness => {
      content += `• ${this.formatCategoryName(weakness)}\n`;
    });

    if (options.includeImprovementPlan && report.improvementPlan) {
      content += `\nIMPROVEMENT PLAN\n`;
      content += `----------------\n`;
      content += `Priority Areas: ${report.improvementPlan.priorityAreas.join(', ')}\n`;
      content += `Estimated Time to Improve: ${report.improvementPlan.estimatedTimeToImprove} days\n\n`;
      
      content += `Recommendations:\n`;
      report.improvementPlan.recommendations.forEach(rec => {
        content += `• ${rec}\n`;
      });
    }

    if (options.includeBenchmarkComparison && report.benchmarkComparison) {
      content += `\nBENCHMARK COMPARISON\n`;
      content += `-------------------\n`;
      content += `Your Percentile: ${report.benchmarkComparison.percentile}%\n`;
      content += `Industry Average: ${Math.round(report.benchmarkComparison.industryAverage * 100)}%\n`;
      content += `Role Average: ${Math.round(report.benchmarkComparison.roleAverage * 100)}%\n`;
    }

    if (options.includeTranscript && report.transcript) {
      content += `\nTRANSCRIPT SUMMARY\n`;
      content += `------------------\n`;
      content += report.transcript.summary || 'No transcript summary available.\n';
    }

    return content;
  }

  private prepareJSONExportData(
    report: PerformanceReport,
    session: InterviewSession,
    options: ExportOptions
  ): any {
    const exportData: any = {
      reportMetadata: {
        id: report.id,
        sessionId: session.id,
        userId: report.userId,
        createdAt: report.createdAt,
        exportedAt: new Date(),
        format: 'json'
      },
      sessionInfo: {
        id: session.id,
        config: session.config,
        duration: session.duration,
        startTime: session.startTime,
        endTime: session.endTime
      },
      performance: {
        overallScore: report.overallScore,
        categoryScores: report.categoryScores,
        strengths: report.strengths,
        weaknesses: report.weaknesses
      }
    };

    if (options.includeImprovementPlan && report.improvementPlan) {
      exportData.improvementPlan = report.improvementPlan;
    }

    if (options.includeBenchmarkComparison && report.benchmarkComparison) {
      exportData.benchmarkComparison = report.benchmarkComparison;
    }

    if (options.includeTranscript && report.transcript) {
      exportData.transcript = report.transcript;
    }

    return exportData;
  }

  private generateCSVContent(
    reports: PerformanceReport[],
    sessions: InterviewSession[],
    options: ExportOptions
  ): string {
    const headers = [
      'Report ID',
      'Session ID',
      'User ID',
      'Date',
      'Overall Score',
      'Communication',
      'Technical Accuracy',
      'Confidence',
      'Clarity',
      'Structure',
      'Relevance',
      'Strengths',
      'Weaknesses'
    ];

    if (options.includeBenchmarkComparison) {
      headers.push('Percentile', 'Industry Average', 'Role Average');
    }

    let csvContent = headers.join(',') + '\n';

    reports.forEach((report, index) => {
      const session = sessions[index];
      if (!session) return;

      const row = [
        report.id,
        session.id,
        report.userId,
        report.createdAt.toISOString().split('T')[0], // Date only
        Math.round(report.overallScore * 100),
        Math.round(report.categoryScores.communication * 100),
        Math.round(report.categoryScores.technicalAccuracy * 100),
        Math.round(report.categoryScores.confidence * 100),
        Math.round(report.categoryScores.clarity * 100),
        Math.round(report.categoryScores.structure * 100),
        Math.round(report.categoryScores.relevance * 100),
        `"${report.strengths.join('; ')}"`,
        `"${report.weaknesses.join('; ')}"`,
      ];

      if (options.includeBenchmarkComparison && report.benchmarkComparison) {
        row.push(
          report.benchmarkComparison.percentile.toString(),
          Math.round(report.benchmarkComparison.industryAverage * 100).toString(),
          Math.round(report.benchmarkComparison.roleAverage * 100).toString()
        );
      }

      csvContent += row.join(',') + '\n';
    });

    return csvContent;
  }

  private formatCategoryName(category: string): string {
    const categoryNames: { [key: string]: string } = {
      communication: 'Communication Skills',
      technicalAccuracy: 'Technical Accuracy',
      confidence: 'Confidence',
      clarity: 'Clarity',
      structure: 'Answer Structure',
      relevance: 'Relevance'
    };
    
    return categoryNames[category] || category;
  }
}