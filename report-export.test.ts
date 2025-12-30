import { DefaultReportExportService } from '../services/report-export-service';
import {
  CategoryScores,
  InterviewSession,
  PerformanceReport,
  InterviewConfig,
} from '@ai-interview/types';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Report Export Service', () => {
  let exportService: DefaultReportExportService;

  beforeEach(() => {
    exportService = new DefaultReportExportService();
    jest.clearAllMocks();
    
    // Mock fs operations
    mockFs.access.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ size: 1024 } as any);
  });

  const mockCategoryScores: CategoryScores = {
    communication: 0.75,
    technicalAccuracy: 0.82,
    confidence: 0.68,
    clarity: 0.79,
    structure: 0.73,
    relevance: 0.81,
  };

  const mockSession: InterviewSession = {
    id: 'session-1',
    userId: 'user-123',
    config: {
      industry: 'Technology',
      role: 'Software Engineer',
      company: 'TechCorp',
      difficulty: 'medium',
      questionTypes: ['behavioral', 'technical'],
      timeLimit: 3600,
      interviewerPersonality: 'friendly',
    } as InterviewConfig,
    status: 'completed',
    questions: [],
    responses: [],
    startTime: new Date('2023-01-01'),
    endTime: new Date('2023-01-01'),
    duration: 3600,
    metadata: {},
  };

  const mockReport: PerformanceReport = {
    id: 'report-1',
    sessionId: 'session-1',
    userId: 'user-123',
    overallScore: 0.78,
    categoryScores: mockCategoryScores,
    strengths: ['technicalAccuracy', 'relevance'],
    weaknesses: ['confidence'],
    improvementPlan: {
      priorityAreas: ['confidence'],
      recommendations: ['Practice speaking with more conviction'],
      practiceExercises: ['Record yourself answering questions'],
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
      summary: 'Mock transcript',
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
    createdAt: new Date('2023-01-01'),
  };

  describe('PDF Export', () => {
    it('should export report to PDF successfully', async () => {
      const result = await exportService.exportToPDF(mockReport, mockSession);

      expect(result.success).toBe(true);
      expect(result.format).toBe('pdf');
      expect(result.filePath).toBeDefined();
      expect(result.downloadUrl).toBeDefined();
      expect(result.fileSize).toBe(1024);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should include all sections when options are enabled', async () => {
      const options = {
        includeTranscript: true,
        includeVisualComponents: true,
        includeImprovementPlan: true,
        includeBenchmarkComparison: true
      };

      const result = await exportService.exportToPDF(mockReport, mockSession, options);

      expect(result.success).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();
      
      // Check that the content includes expected sections
      const writeCall = mockFs.writeFile.mock.calls[0];
      const content = writeCall[1] as string;
      expect(content).toContain('INTERVIEW PERFORMANCE REPORT');
      expect(content).toContain('CATEGORY SCORES');
      expect(content).toContain('IMPROVEMENT PLAN');
      expect(content).toContain('BENCHMARK COMPARISON');
    });

    it('should handle PDF export errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('File write error'));

      const result = await exportService.exportToPDF(mockReport, mockSession);

      expect(result.success).toBe(false);
      expect(result.format).toBe('pdf');
      expect(result.error).toBe('File write error');
    });
  });

  describe('JSON Export', () => {
    it('should export report to JSON successfully', async () => {
      const result = await exportService.exportToJSON(mockReport, mockSession);

      expect(result.success).toBe(true);
      expect(result.format).toBe('json');
      expect(result.filePath).toBeDefined();
      expect(result.downloadUrl).toBeDefined();
      expect(result.fileSize).toBe(1024);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should create proper JSON structure', async () => {
      const options = {
        includeImprovementPlan: true,
        includeBenchmarkComparison: true,
        includeTranscript: true
      };

      const result = await exportService.exportToJSON(mockReport, mockSession, options);

      expect(result.success).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();
      
      // Check that the JSON content is properly structured
      const writeCall = mockFs.writeFile.mock.calls[0];
      const jsonContent = writeCall[1] as string;
      const parsedContent = JSON.parse(jsonContent);
      
      expect(parsedContent.reportMetadata).toBeDefined();
      expect(parsedContent.sessionInfo).toBeDefined();
      expect(parsedContent.performance).toBeDefined();
      expect(parsedContent.improvementPlan).toBeDefined();
      expect(parsedContent.benchmarkComparison).toBeDefined();
      expect(parsedContent.transcript).toBeDefined();
    });

    it('should exclude sections when options are disabled', async () => {
      const options = {
        includeImprovementPlan: false,
        includeBenchmarkComparison: false,
        includeTranscript: false
      };

      const result = await exportService.exportToJSON(mockReport, mockSession, options);

      expect(result.success).toBe(true);
      
      const writeCall = mockFs.writeFile.mock.calls[0];
      const jsonContent = writeCall[1] as string;
      const parsedContent = JSON.parse(jsonContent);
      
      expect(parsedContent.improvementPlan).toBeUndefined();
      expect(parsedContent.benchmarkComparison).toBeUndefined();
      expect(parsedContent.transcript).toBeUndefined();
    });

    it('should handle JSON export errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('JSON write error'));

      const result = await exportService.exportToJSON(mockReport, mockSession);

      expect(result.success).toBe(false);
      expect(result.format).toBe('json');
      expect(result.error).toBe('JSON write error');
    });
  });

  describe('CSV Export', () => {
    it('should export multiple reports to CSV successfully', async () => {
      const reports = [mockReport, { ...mockReport, id: 'report-2' }];
      const sessions = [mockSession, { ...mockSession, id: 'session-2' }];

      const result = await exportService.exportToCSV(reports, sessions);

      expect(result.success).toBe(true);
      expect(result.format).toBe('csv');
      expect(result.filePath).toBeDefined();
      expect(result.downloadUrl).toBeDefined();
      expect(result.fileSize).toBe(1024);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should create proper CSV structure with headers', async () => {
      const reports = [mockReport];
      const sessions = [mockSession];

      const result = await exportService.exportToCSV(reports, sessions);

      expect(result.success).toBe(true);
      
      const writeCall = mockFs.writeFile.mock.calls[0];
      const csvContent = writeCall[1] as string;
      const lines = csvContent.split('\n');
      
      // Check headers
      expect(lines[0]).toContain('Report ID');
      expect(lines[0]).toContain('Session ID');
      expect(lines[0]).toContain('Overall Score');
      expect(lines[0]).toContain('Communication');
      expect(lines[0]).toContain('Technical Accuracy');
      
      // Check data row
      expect(lines[1]).toContain(mockReport.id);
      expect(lines[1]).toContain(mockSession.id);
      expect(lines[1]).toContain('78'); // Overall score as percentage
    });

    it('should include benchmark data when option is enabled', async () => {
      const options = { includeBenchmarkComparison: true };
      const reports = [mockReport];
      const sessions = [mockSession];

      const result = await exportService.exportToCSV(reports, sessions, options);

      expect(result.success).toBe(true);
      
      const writeCall = mockFs.writeFile.mock.calls[0];
      const csvContent = writeCall[1] as string;
      const lines = csvContent.split('\n');
      
      expect(lines[0]).toContain('Percentile');
      expect(lines[0]).toContain('Industry Average');
      expect(lines[0]).toContain('Role Average');
    });

    it('should handle empty arrays gracefully', async () => {
      const result = await exportService.exportToCSV([], []);

      expect(result.success).toBe(true);
      
      const writeCall = mockFs.writeFile.mock.calls[0];
      const csvContent = writeCall[1] as string;
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      // Should only have headers
      expect(lines.length).toBe(1);
    });

    it('should handle CSV export errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('CSV write error'));

      const result = await exportService.exportToCSV([mockReport], [mockSession]);

      expect(result.success).toBe(false);
      expect(result.format).toBe('csv');
      expect(result.error).toBe('CSV write error');
    });
  });

  describe('Shareable Links', () => {
    it('should create shareable link successfully', async () => {
      const shareableLink = await exportService.createShareableLink(
        'report-123',
        'user-456',
        24,
        10
      );

      expect(shareableLink).toBeDefined();
      expect(shareableLink.id).toBeDefined();
      expect(shareableLink.reportId).toBe('report-123');
      expect(shareableLink.userId).toBe('user-456');
      expect(shareableLink.url).toContain('/shared/report/');
      expect(shareableLink.maxAccess).toBe(10);
      expect(shareableLink.isActive).toBe(true);
      expect(shareableLink.accessCount).toBe(0);
      expect(shareableLink.expiresAt).toBeInstanceOf(Date);
      expect(shareableLink.createdAt).toBeInstanceOf(Date);
    });

    it('should set correct expiration time', async () => {
      const expirationHours = 48;
      const shareableLink = await exportService.createShareableLink(
        'report-123',
        'user-456',
        expirationHours
      );

      const expectedExpiration = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
      const actualExpiration = shareableLink.expiresAt;
      
      // Allow 1 second tolerance for test execution time
      expect(Math.abs(actualExpiration.getTime() - expectedExpiration.getTime())).toBeLessThan(1000);
    });

    it('should retrieve shareable link successfully', async () => {
      const linkId = 'share_123456789_abcdef';
      const shareableLink = await exportService.getShareableLink(linkId);

      expect(shareableLink).toBeDefined();
      expect(shareableLink?.id).toBe(linkId);
      expect(shareableLink?.isActive).toBe(true);
    });

    it('should return null for invalid link ID', async () => {
      const shareableLink = await exportService.getShareableLink('invalid_link');
      expect(shareableLink).toBeNull();
    });

    it('should revoke shareable link successfully', async () => {
      await expect(exportService.revokeShareableLink('share_123')).resolves.not.toThrow();
    });

    it('should get report by valid shareable link', async () => {
      const linkId = 'share_123456789_abcdef';
      const report = await exportService.getReportByShareableLink(linkId);

      expect(report).toBeDefined();
      expect(report?.id).toBeDefined();
      expect(report?.userId).toBeDefined();
      expect(report?.overallScore).toBeGreaterThanOrEqual(0);
      expect(report?.categoryScores).toBeDefined();
    });

    it('should return null for invalid shareable link', async () => {
      const report = await exportService.getReportByShareableLink('invalid_link');
      expect(report).toBeNull();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete export workflow', async () => {
      // Test PDF export
      const pdfResult = await exportService.exportToPDF(mockReport, mockSession);
      expect(pdfResult.success).toBe(true);

      // Test JSON export
      const jsonResult = await exportService.exportToJSON(mockReport, mockSession);
      expect(jsonResult.success).toBe(true);

      // Test CSV export
      const csvResult = await exportService.exportToCSV([mockReport], [mockSession]);
      expect(csvResult.success).toBe(true);

      // Test shareable link creation
      const shareableLink = await exportService.createShareableLink(
        mockReport.id,
        mockReport.userId
      );
      expect(shareableLink.isActive).toBe(true);

      // Test report access via shareable link
      const sharedReport = await exportService.getReportByShareableLink(shareableLink.id);
      expect(sharedReport).toBeDefined();

      // Verify all exports have different formats
      expect(pdfResult.format).toBe('pdf');
      expect(jsonResult.format).toBe('json');
      expect(csvResult.format).toBe('csv');
    });

    it('should handle multiple reports with different configurations', async () => {
      const reports = [
        mockReport,
        {
          ...mockReport,
          id: 'report-2',
          overallScore: 0.65,
          categoryScores: {
            ...mockCategoryScores,
            confidence: 0.45,
            communication: 0.85
          }
        },
        {
          ...mockReport,
          id: 'report-3',
          overallScore: 0.92,
          categoryScores: {
            ...mockCategoryScores,
            confidence: 0.95,
            technicalAccuracy: 0.88
          }
        }
      ];

      const sessions = reports.map((report, index) => ({
        ...mockSession,
        id: `session-${index + 1}`
      }));

      const csvResult = await exportService.exportToCSV(reports, sessions);
      expect(csvResult.success).toBe(true);

      // Verify CSV contains all reports
      const writeCall = mockFs.writeFile.mock.calls[0];
      const csvContent = writeCall[1] as string;
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      // Should have header + 3 data rows
      expect(lines.length).toBe(4);
      expect(csvContent).toContain('report-1');
      expect(csvContent).toContain('report-2');
      expect(csvContent).toContain('report-3');
    });

    it('should handle export options correctly across formats', async () => {
      const options = {
        includeTranscript: false,
        includeImprovementPlan: false,
        includeBenchmarkComparison: true
      };

      // Test PDF with options
      const pdfResult = await exportService.exportToPDF(mockReport, mockSession, options);
      expect(pdfResult.success).toBe(true);

      // Test JSON with options
      const jsonResult = await exportService.exportToJSON(mockReport, mockSession, options);
      expect(jsonResult.success).toBe(true);

      // Verify JSON structure respects options
      const writeCall = mockFs.writeFile.mock.calls[1]; // Second call (JSON)
      const jsonContent = writeCall[1] as string;
      const parsedContent = JSON.parse(jsonContent);
      
      expect(parsedContent.improvementPlan).toBeUndefined();
      expect(parsedContent.transcript).toBeUndefined();
      expect(parsedContent.benchmarkComparison).toBeDefined();
    });

    it('should handle file system errors gracefully', async () => {
      // Simulate directory creation failure
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));
      
      // Should still work if directory already exists
      mockFs.access.mockResolvedValue(undefined);
      
      const result = await exportService.exportToPDF(mockReport, mockSession);
      expect(result.success).toBe(true);
    });

    it('should generate unique file names for concurrent exports', async () => {
      const promises = [
        exportService.exportToPDF(mockReport, mockSession),
        exportService.exportToJSON(mockReport, mockSession),
        exportService.exportToCSV([mockReport], [mockSession])
      ];

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verify all file paths are different
      const filePaths = results.map(r => r.filePath);
      const uniquePaths = new Set(filePaths);
      expect(uniquePaths.size).toBe(filePaths.length);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing report data', async () => {
      const invalidReport = null as any;
      
      await expect(exportService.exportToPDF(invalidReport, mockSession))
        .rejects.toThrow();
    });

    it('should handle missing session data', async () => {
      const invalidSession = null as any;
      
      const result = await exportService.exportToJSON(mockReport, invalidSession);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle file system permission errors', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('EACCES: permission denied'));

      const result = await exportService.exportToPDF(mockReport, mockSession);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('permission denied');
    });

    it('should handle disk space errors', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('ENOSPC: no space left on device'));

      const result = await exportService.exportToCSV([mockReport], [mockSession]);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('no space left on device');
    });
  });
});