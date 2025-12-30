import { Pool } from 'pg';
import { PerformanceReport, CategoryScores, ImprovementPlan, BenchmarkComparison, AnnotatedTranscript } from '@ai-interview/types';
import { db } from './connection';
import { logger } from '../utils/logger';

export interface ReportRepository {
  saveReport(report: PerformanceReport): Promise<void>;
  getReport(reportId: string): Promise<PerformanceReport | null>;
  getReportsByUserId(userId: string, limit?: number, offset?: number): Promise<PerformanceReport[]>;
  getReportsBySessionId(sessionId: string): Promise<PerformanceReport | null>;
  deleteReport(reportId: string): Promise<boolean>;
  updateReport(reportId: string, updates: Partial<PerformanceReport>): Promise<boolean>;
  getReportCount(userId: string): Promise<number>;
  cleanupOldReports(retentionDays: number): Promise<number>;
}

export class PostgresReportRepository implements ReportRepository {
  constructor(private pool: Pool = db) {}

  async saveReport(report: PerformanceReport): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert main report record
      const reportQuery = `
        INSERT INTO performance_reports (
          id, session_id, user_id, overall_score, strengths, weaknesses, visual_components, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      
      await client.query(reportQuery, [
        report.id,
        report.sessionId,
        report.userId,
        report.overallScore,
        JSON.stringify(report.strengths),
        JSON.stringify(report.weaknesses),
        JSON.stringify(report.visualComponents),
        report.createdAt
      ]);

      // Insert category scores
      const categoryQuery = `
        INSERT INTO report_category_scores (
          report_id, communication, technical_accuracy, confidence, clarity, structure, relevance
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await client.query(categoryQuery, [
        report.id,
        report.categoryScores.communication,
        report.categoryScores.technicalAccuracy,
        report.categoryScores.confidence,
        report.categoryScores.clarity,
        report.categoryScores.structure,
        report.categoryScores.relevance
      ]);

      // Insert improvement plan
      const improvementQuery = `
        INSERT INTO report_improvement_plans (
          report_id, priority_areas, recommendations, practice_exercises, estimated_time_to_improve
        ) VALUES ($1, $2, $3, $4, $5)
      `;
      
      await client.query(improvementQuery, [
        report.id,
        JSON.stringify(report.improvementPlan.priorityAreas),
        JSON.stringify(report.improvementPlan.recommendations),
        JSON.stringify(report.improvementPlan.practiceExercises),
        report.improvementPlan.estimatedTimeToImprove
      ]);

      // Insert benchmark comparison
      const benchmarkQuery = `
        INSERT INTO report_benchmark_comparisons (
          report_id, percentile, average_score, top_performer_score, industry_average, role_average
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await client.query(benchmarkQuery, [
        report.id,
        report.benchmarkComparison.percentile,
        report.benchmarkComparison.averageScore,
        report.benchmarkComparison.topPerformerScore,
        report.benchmarkComparison.industryAverage,
        report.benchmarkComparison.roleAverage
      ]);

      // Insert annotated transcript
      const transcriptQuery = `
        INSERT INTO report_transcripts (
          report_id, segments, highlights, summary
        ) VALUES ($1, $2, $3, $4)
      `;
      
      await client.query(transcriptQuery, [
        report.id,
        JSON.stringify(report.transcript.segments),
        JSON.stringify(report.transcript.highlights),
        report.transcript.summary
      ]);

      await client.query('COMMIT');
      
      logger.info('Report saved successfully', { reportId: report.id });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to save report', { reportId: report.id, error });
      throw error;
    } finally {
      client.release();
    }
  }

  async getReport(reportId: string): Promise<PerformanceReport | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          r.*,
          cs.communication, cs.technical_accuracy, cs.confidence, cs.clarity, cs.structure, cs.relevance,
          ip.priority_areas, ip.recommendations, ip.practice_exercises, ip.estimated_time_to_improve,
          bc.percentile, bc.average_score, bc.top_performer_score, bc.industry_average, bc.role_average,
          t.segments, t.highlights, t.summary
        FROM performance_reports r
        LEFT JOIN report_category_scores cs ON r.id = cs.report_id
        LEFT JOIN report_improvement_plans ip ON r.id = ip.report_id
        LEFT JOIN report_benchmark_comparisons bc ON r.id = bc.report_id
        LEFT JOIN report_transcripts t ON r.id = t.report_id
        WHERE r.id = $1
      `;
      
      const result = await client.query(query, [reportId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return this.mapRowToReport(row);
    } catch (error) {
      logger.error('Failed to get report', { reportId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  async getReportsByUserId(userId: string, limit = 50, offset = 0): Promise<PerformanceReport[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          r.*,
          cs.communication, cs.technical_accuracy, cs.confidence, cs.clarity, cs.structure, cs.relevance,
          ip.priority_areas, ip.recommendations, ip.practice_exercises, ip.estimated_time_to_improve,
          bc.percentile, bc.average_score, bc.top_performer_score, bc.industry_average, bc.role_average,
          t.segments, t.highlights, t.summary
        FROM performance_reports r
        LEFT JOIN report_category_scores cs ON r.id = cs.report_id
        LEFT JOIN report_improvement_plans ip ON r.id = ip.report_id
        LEFT JOIN report_benchmark_comparisons bc ON r.id = bc.report_id
        LEFT JOIN report_transcripts t ON r.id = t.report_id
        WHERE r.user_id = $1
        ORDER BY r.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await client.query(query, [userId, limit, offset]);
      
      return result.rows.map(row => this.mapRowToReport(row));
    } catch (error) {
      logger.error('Failed to get reports by user ID', { userId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  async getReportsBySessionId(sessionId: string): Promise<PerformanceReport | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          r.*,
          cs.communication, cs.technical_accuracy, cs.confidence, cs.clarity, cs.structure, cs.relevance,
          ip.priority_areas, ip.recommendations, ip.practice_exercises, ip.estimated_time_to_improve,
          bc.percentile, bc.average_score, bc.top_performer_score, bc.industry_average, bc.role_average,
          t.segments, t.highlights, t.summary
        FROM performance_reports r
        LEFT JOIN report_category_scores cs ON r.id = cs.report_id
        LEFT JOIN report_improvement_plans ip ON r.id = ip.report_id
        LEFT JOIN report_benchmark_comparisons bc ON r.id = bc.report_id
        LEFT JOIN report_transcripts t ON r.id = t.report_id
        WHERE r.session_id = $1
        ORDER BY r.created_at DESC
        LIMIT 1
      `;
      
      const result = await client.query(query, [sessionId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToReport(result.rows[0]);
    } catch (error) {
      logger.error('Failed to get report by session ID', { sessionId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteReport(reportId: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Delete related records first (due to foreign key constraints)
      await client.query('DELETE FROM report_transcripts WHERE report_id = $1', [reportId]);
      await client.query('DELETE FROM report_benchmark_comparisons WHERE report_id = $1', [reportId]);
      await client.query('DELETE FROM report_improvement_plans WHERE report_id = $1', [reportId]);
      await client.query('DELETE FROM report_category_scores WHERE report_id = $1', [reportId]);
      
      // Delete main report record
      const result = await client.query('DELETE FROM performance_reports WHERE id = $1', [reportId]);
      
      await client.query('COMMIT');
      
      const deleted = (result.rowCount ?? 0) > 0;
      logger.info('Report deletion completed', { reportId, deleted });
      
      return deleted;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to delete report', { reportId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  async updateReport(reportId: string, updates: Partial<PerformanceReport>): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      // For simplicity, we'll only support updating basic fields
      // In a full implementation, you'd handle all nested objects
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.overallScore !== undefined) {
        updateFields.push(`overall_score = $${paramIndex++}`);
        values.push(updates.overallScore);
      }

      if (updates.strengths !== undefined) {
        updateFields.push(`strengths = $${paramIndex++}`);
        values.push(JSON.stringify(updates.strengths));
      }

      if (updates.weaknesses !== undefined) {
        updateFields.push(`weaknesses = $${paramIndex++}`);
        values.push(JSON.stringify(updates.weaknesses));
      }

      if (updateFields.length === 0) {
        return false;
      }

      values.push(reportId);
      const query = `
        UPDATE performance_reports 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
      `;
      
      const result = await client.query(query, values);
      
      const updated = (result.rowCount ?? 0) > 0;
      logger.info('Report update completed', { reportId, updated });
      
      return updated;
    } catch (error) {
      logger.error('Failed to update report', { reportId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  async getReportCount(userId: string): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT COUNT(*) as count FROM performance_reports WHERE user_id = $1';
      const result = await client.query(query, [userId]);
      
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Failed to get report count', { userId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  async cleanupOldReports(retentionDays: number): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get reports to delete
      const selectQuery = `
        SELECT id FROM performance_reports 
        WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
      `;
      const reportsToDelete = await client.query(selectQuery);
      const reportIds = reportsToDelete.rows.map(row => row.id);

      if (reportIds.length === 0) {
        await client.query('COMMIT');
        return 0;
      }

      // Delete related records
      const placeholders = reportIds.map((_, i) => `$${i + 1}`).join(',');
      
      await client.query(`DELETE FROM report_transcripts WHERE report_id IN (${placeholders})`, reportIds);
      await client.query(`DELETE FROM report_benchmark_comparisons WHERE report_id IN (${placeholders})`, reportIds);
      await client.query(`DELETE FROM report_improvement_plans WHERE report_id IN (${placeholders})`, reportIds);
      await client.query(`DELETE FROM report_category_scores WHERE report_id IN (${placeholders})`, reportIds);
      
      // Delete main records
      const deleteResult = await client.query(`DELETE FROM performance_reports WHERE id IN (${placeholders})`, reportIds);
      
      await client.query('COMMIT');
      
      const deletedCount = deleteResult.rowCount ?? 0;
      logger.info('Old reports cleanup completed', { deletedCount, retentionDays });
      
      return deletedCount;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to cleanup old reports', { retentionDays, error });
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRowToReport(row: any): PerformanceReport {
    return {
      id: row.id,
      sessionId: row.session_id,
      userId: row.user_id,
      overallScore: row.overall_score,
      categoryScores: {
        communication: row.communication,
        technicalAccuracy: row.technical_accuracy,
        confidence: row.confidence,
        clarity: row.clarity,
        structure: row.structure,
        relevance: row.relevance,
      },
      strengths: JSON.parse(row.strengths || '[]'),
      weaknesses: JSON.parse(row.weaknesses || '[]'),
      improvementPlan: {
        priorityAreas: JSON.parse(row.priority_areas || '[]'),
        recommendations: JSON.parse(row.recommendations || '[]'),
        practiceExercises: JSON.parse(row.practice_exercises || '[]'),
        estimatedTimeToImprove: row.estimated_time_to_improve,
      },
      benchmarkComparison: {
        percentile: row.percentile,
        averageScore: row.average_score,
        topPerformerScore: row.top_performer_score,
        industryAverage: row.industry_average,
        roleAverage: row.role_average,
      },
      transcript: {
        segments: JSON.parse(row.segments || '[]'),
        highlights: JSON.parse(row.highlights || '[]'),
        summary: row.summary || '',
      },
      visualComponents: JSON.parse(row.visual_components || '{}'),
      createdAt: row.created_at,
    };
  }
}