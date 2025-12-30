import {
  PerformanceReport,
  InterviewSession,
  CategoryScores,
} from '@ai-interview/types';
import { logger } from '../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ExportOptions {
  format: 'pdf' | 'json' | 'csv';
  includeTranscript?: boolean;
  includeVisualComponents?: boolean;
  includeMetadata?: boolean;
  customFields?: string[];
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
  password?: string;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  downloadUrl?: string;
  error?: string;
}

export interface ShareResult {
  success: boolean;
  shareableLink?: ShareableLink;
  error?: string;
}

export interface ReportExportService {
  // Export functionality
  exportReportToPDF(
    report: PerformanceReport,
    session: InterviewSession,
    options?: ExportOptions
  ): Promise<ExportResult>;
  
  exportReportToJSON(
    report: PerformanceReport,
    session: InterviewSession,
    options?: ExportOptions
  ): Promise<ExportResult>;
  
  exportReportToCSV(
    reports: PerformanceReport[],
    sessions: InterviewSession[],
    options?: ExportOptions
  ): Promise<ExportResult>;
  
  // Shareable links
  createShareableLink(
    reportId: string,
    userId: string,
    expirationHours?: number,
    maxAccess?: number,
    password?: string
  ): Promise<ShareResult>;
  
  getShareableReport(linkId: string, password?: string): Promise<{
    success: boolean;
    report?: PerformanceReport;
    session?: InterviewSession;
    error?: string;
  }>;
  
  revokeShareableLink(linkId: string, userId: string): Promise<{ success: boolean; error?: string }>;
  
  // Utility methods
  getExportHistory(userId: string): Promise<ExportResult[]>;
  getActiveShareableLinks(userId: string): Promise<ShareableLink[]>;
}

export class DefaultReportExportService implements ReportExportService {
  private readonly exportDir = './exports';
  private readonly baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  constructor() {
    this.ensureExportDirectory();
  }

  async exportReportToPDF(
    report: PerformanceReport,
    session: InterviewSession,
    options: ExportOptions = { format: 'pdf' }
  ): Promise<ExportResult> {
    try {
      logger.info('Exporting report to PDF', { 
        reportId: report.id, 
        sessionId: session.id,
        options 
      });

      // Generate PDF content (in a real implementation, this would use a PDF library like puppeteer or jsPDF)
      const pdfContent = this.generatePDFContent(report, session, options);
      
      const fileName = `interview-report-${report.id}-${Date.now()}.pdf`;
      const filePath = path.join(this.exportDir, fileName);
      
      // In a real implementation, this would generate actual PDF bytes
      await fs.writeFile(filePath, pdfContent, 'utf8');
      
      const stats = await fs.stat(filePath);
      const downloadUrl = `${this.baseUrl}/api/reporting/exports/download/${fileName}`;

      logger.info('PDF export completed', { 
        reportId: report.id,
        fileName,
        fileSize: stats.size 
      });

      return {
        success: true,
        filePath,
        fileName,
        fileSize: stats.size,
        downloadUrl
      };
    } catch (error) {
      logger.error('Failed to export report to PDF', { error, reportId: report.id });
      return {
        success: false,
        error: 'Failed to generate PDF export'
      };
    }
  }

  async exportReportToJSON(
    report: PerformanceReport,
    session: InterviewSession,
    options: ExportOptions = { format: 'json' }
  ): Promise<ExportResult> {
    try {
      logger.info('Exporting report to JSON', { 
        reportId: report.id, 
        sessionId: session.id,
        options 
      });

      const exportData = this.prepareJSONExportData(report, session, options);
      const jsonContent = JSON.stringify(exportData, null, 2);
      
      const fileName = `interview-report-${report.id}-${Date.now()}.json`;
      const filePath = path.join(this.exportDir, fileName);
      
      await fs.writeFile(filePath, jsonContent, 'utf8');
      
      const stats = await fs.stat(filePath);
      const downloadUrl = `${this.baseUrl}/api/reporting/exports/download/${fileName}`;

      logger.info('JSON export completed', { 
        reportId: report.id,
        fileName,
        fileSize: stats.size 
      });

      return {
        success: true,
        filePath,
        fileName,
        fileSize: stats.size,
        downloadUrl
      };
    } catch (error) {
      logger.error('Failed to export report to JSON', { error, reportId: report.id });
      return {
        success: false,
        error: 'Failed to generate JSON export'
      };
    }
  }

  async exportReportToCSV(
    reports: PerformanceReport[],
    sessions: InterviewSession[],
    options: ExportOptions = { format: 'csv' }
  ): Promise<ExportResult> {
    try {
      logger.info('Exporting reports to CSV', { 
        reportCount: reports.length,
        sessionCount: sessions.length,
        options 
      });

      const csvContent = this.generateCSVContent(reports, sessions, options);
      
      const fileName = `interview-reports-${Date.now()}.csv`;
      const filePath = path.join(this.exportDir, fileName);
      
      await fs.writeFile(filePath, csvContent, 'utf8');
      
      const stats = await fs.stat(filePath);
      const downloadUrl = `${this.baseUrl}/api/reporting/exports/download/${fileName}`;

      logger.info('CSV export completed', { 
        reportCount: reports.length,
        fileName,
        fileSize: stats.size 
      });

      return {
        success: true,
        filePath,
        fileName,
        fileSize: stats.size,
        downloadUrl
      };
    } catch (error) {
      logger.error('Failed to export reports to CSV', { error, reportCount: reports.length });
      return {
        success: false,
        error: 'Failed to generate CSV export'
      };
    }
  }

  async createShareableLink(
    reportId: string,
    userId: string,
    expirationHours: number = 24,
    maxAccess?: number,
    password?: string
  ): Promise<ShareResult> {
    try {
      logger.info('Creating shareable link', { 
        reportId, 
        userId, 
        expirationHours,
        maxAccess,
        hasPassword: !!password 
      });

      const linkId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
      
      const shareableLink: ShareableLink = {
        id: linkId,
        reportId,
        userId,
        url: `${this.baseUrl}/api/reporting/shared/${linkId}`,
        expiresAt,
        accessCount: 0,
        maxAccess,
        isActive: true,
        createdAt: new Date(),
        password
      };

      // In a real implementation, this would be saved to database
      logger.info('Shareable link created', { 
        linkId,
        reportId,
        expiresAt 
      });

      return {
        success: true,
        shareableLink
      };
    } catch (error) {
      logger.error('Failed to create shareable link', { error, reportId, userId });
      return {
        success: false,
        error: 'Failed to create shareable link'
      };
    }
  }

  async getShareableReport(linkId: string, password?: string): Promise<{
    success: boolean;
    report?: PerformanceReport;
    session?: InterviewSession;
    error?: string;
  }> {
    try {
      logger.info('Accessing shareable report', { linkId, hasPassword: !!password });

      // In a real implementation, this would fetch from database and validate
      const mockReport: PerformanceReport = {
        id: 'shared-report-1',
        sessionId: 'shared-session-1',
        userId: 'shared-user',
        overallScore: 0.85,
        categoryScores: {
          communication: 0.82,
          technicalAccuracy: 0.88,
          confidence: 0.80,
          clarity: 0.85,
          structure: 0.83,
          relevance: 0.87,
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
          percentile: 75,
          averageScore: 0.85,
          topPerformerScore: 0.95,
          industryAverage: 0.72,
          roleAverage: 0.74,
        },
        transcript: {
          segments: [],
          highlights: [],
          summary: 'Shared report transcript',
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
          categoryBreakdown: { type: 'donut', segments: [], totalScore: 0.85 },
        },
        createdAt: new Date(),
      };

      const mockSession: InterviewSession = {
        id: 'shared-session-1',
        userId: 'shared-user',
        config: {
          industry: 'Technology',
          role: 'Software Engineer',
          company: 'TechCorp',
          difficulty: 'medium',
          questionTypes: ['behavioral', 'technical'],
          timeLimit: 3600,
          interviewerPersonality: 'friendly',
        },
        status: 'completed',
        questions: [],
        responses: [],
        startTime: new Date(),
        endTime: new Date(),
        duration: 3600,
        metadata: {},
      };

      logger.info('Shareable report accessed', { linkId });

      return {
        success: true,
        report: mockReport,
        session: mockSession
      };
    } catch (error) {
      logger.error('Failed to access shareable report', { error, linkId });
      return {
        success: false,
        error: 'Failed to access shared report'
      };
    }
  }

  async revokeShareableLink(linkId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Revoking shareable link', { linkId, userId });

      // In a real implementation, this would update the database
      logger.info('Shareable link revoked', { linkId });

      return { success: true };
    } catch (error) {
      logger.error('Failed to revoke shareable link', { error, linkId, userId });
      return {
        success: false,
        error: 'Failed to revoke shareable link'
      };
    }
  }

  async getExportHistory(userId: string): Promise<ExportResult[]> {
    try {
      logger.info('Fetching export history', { userId });

      // Mock export history
      const mockHistory: ExportResult[] = [
        {
          success: true,
          fileName: 'interview-report-123-1640995200000.pdf',
          fileSize: 245760,
          downloadUrl: `${this.baseUrl}/api/reporting/exports/download/interview-report-123-1640995200000.pdf`
        },
        {
          success: true,
          fileName: 'interview-report-124-1640995300000.json',
          fileSize: 15420,
          downloadUrl: `${this.baseUrl}/api/reporting/exports/download/interview-report-124-1640995300000.json`
        },
        {
          success: true,
          fileName: 'interview-reports-1640995400000.csv',
          fileSize: 8960,
          downloadUrl: `${this.baseUrl}/api/reporting/exports/download/interview-reports-1640995400000.csv`
        }
      ];

      return mockHistory;
    } catch (error) {
      logger.error('Failed to fetch export history', { error, userId });
      return [];
    }
  }

  async getActiveShareableLinks(userId: string): Promise<ShareableLink[]> {
    try {
      logger.info('Fetching active shareable links', { userId });

      // Mock active links
      const mockLinks: ShareableLink[] = [
        {
          id: 'share_1640995200000_abc123',
          reportId: 'report-123',
          userId,
          url: `${this.baseUrl}/api/reporting/shared/share_1640995200000_abc123`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          accessCount: 3,
          maxAccess: 10,
          isActive: true,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          id: 'share_1640995300000_def456',
          reportId: 'report-124',
          userId,
          url: `${this.baseUrl}/api/reporting/shared/share_1640995300000_def456`,
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          accessCount: 1,
          isActive: true,
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          password: 'protected'
        }
      ];

      return mockLinks.filter(link => link.isActive && link.expiresAt > new Date());
    } catch (error) {
      logger.error('Failed to fetch active shareable links', { error, userId });
      return [];
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
    // In a real implementation, this would generate actual PDF content using a library like puppeteer
    const content = `
INTERVIEW PERFORMANCE REPORT
============================

Session Information:
- Session ID: ${session.id}
- Date: ${session.startTime.toLocaleDateString()}
- Duration: ${Math.round(session.duration / 60)} minutes
- Industry: ${session.config.industry}
- Role: ${session.config.role}
- Company: ${session.config.company}

Overall Performance:
- Overall Score: ${Math.round(report.overallScore * 100)}%
- Percentile: ${report.benchmarkComparison.percentile}th

Category Breakdown:
- Communication: ${Math.round(report.categoryScores.communication * 100)}%
- Technical Accuracy: ${Math.round(report.categoryScores.technicalAccuracy * 100)}%
- Confidence: ${Math.round(report.categoryScores.confidence * 100)}%
- Clarity: ${Math.round(report.categoryScores.clarity * 100)}%
- Structure: ${Math.round(report.categoryScores.structure * 100)}%
- Relevance: ${Math.round(report.categoryScores.relevance * 100)}%

Strengths:
${report.strengths.map(s => `- ${s}`).join('\n')}

Areas for Improvement:
${report.weaknesses.map(w => `- ${w}`).join('\n')}

Improvement Plan:
Priority Areas: ${report.improvementPlan.priorityAreas.join(', ')}
Estimated Time to Improve: ${report.improvementPlan.estimatedTimeToImprove} days

Recommendations:
${report.improvementPlan.recommendations.map(r => `- ${r}`).join('\n')}

${options.includeTranscript ? `
Transcript Summary:
${report.transcript.summary}
` : ''}

Generated on: ${new Date().toLocaleString()}
    `;

    return content;
  }

  private prepareJSONExportData(
    report: PerformanceReport,
    session: InterviewSession,
    options: ExportOptions
  ): any {
    const exportData: any = {
      metadata: {
        exportedAt: new Date().toISOString(),
        exportFormat: 'json',
        version: '1.0'
      },
      session: {
        id: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        config: session.config,
        status: session.status
      },
      report: {
        id: report.id,
        overallScore: report.overallScore,
        categoryScores: report.categoryScores,
        strengths: report.strengths,
        weaknesses: report.weaknesses,
        improvementPlan: report.improvementPlan,
        benchmarkComparison: report.benchmarkComparison,
        createdAt: report.createdAt
      }
    };

    if (options.includeTranscript) {
      exportData.report.transcript = report.transcript;
    }

    if (options.includeVisualComponents) {
      exportData.report.visualComponents = report.visualComponents;
    }

    if (options.includeMetadata && session.metadata) {
      exportData.session.metadata = session.metadata;
    }

    return exportData;
  }

  private generateCSVContent(
    reports: PerformanceReport[],
    sessions: InterviewSession[],
    options: ExportOptions
  ): string {
    const headers = [
      'Session ID',
      'Report ID',
      'Date',
      'Duration (minutes)',
      'Industry',
      'Role',
      'Company',
      'Overall Score',
      'Communication',
      'Technical Accuracy',
      'Confidence',
      'Clarity',
      'Structure',
      'Relevance',
      'Percentile',
      'Strengths',
      'Weaknesses'
    ];

    const rows = reports.map((report, index) => {
      const session = sessions[index];
      if (!session) return null;

      return [
        session.id,
        report.id,
        session.startTime.toISOString().split('T')[0],
        Math.round(session.duration / 60),
        session.config.industry,
        session.config.role,
        session.config.company,
        Math.round(report.overallScore * 100),
        Math.round(report.categoryScores.communication * 100),
        Math.round(report.categoryScores.technicalAccuracy * 100),
        Math.round(report.categoryScores.confidence * 100),
        Math.round(report.categoryScores.clarity * 100),
        Math.round(report.categoryScores.structure * 100),
        Math.round(report.categoryScores.relevance * 100),
        report.benchmarkComparison.percentile,
        report.strengths.join('; '),
        report.weaknesses.join('; ')
      ];
    }).filter(row => row !== null);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row!.map(cell => 
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(','))
    ].join('\n');

    return csvContent;
  }
}