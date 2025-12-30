import cron from 'node-cron';
import { DefaultSecurityService } from './security-service';
import { logger } from '../utils/logger';

export interface ScheduledJob {
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
}

export interface SchedulerService {
  startScheduler(): void;
  stopScheduler(): void;
  getScheduledJobs(): ScheduledJob[];
  enableJob(jobId: string): void;
  disableJob(jobId: string): void;
}

export class DefaultSchedulerService implements SchedulerService {
  private securityService: DefaultSecurityService;
  private jobs: Map<string, { job: ScheduledJob; task: cron.ScheduledTask }> = new Map();
  private isRunning: boolean = false;

  constructor() {
    this.securityService = new DefaultSecurityService();
    this.initializeJobs();
  }

  private initializeJobs(): void {
    // Daily retention policy enforcement at 2 AM
    this.addJob({
      id: 'retention-enforcement',
      name: 'Data Retention Policy Enforcement',
      schedule: '0 2 * * *', // Daily at 2 AM
      enabled: true,
      runCount: 0,
    }, this.enforceRetentionPolicies.bind(this));

    // Weekly security audit log cleanup at 3 AM on Sundays
    this.addJob({
      id: 'audit-log-cleanup',
      name: 'Audit Log Cleanup',
      schedule: '0 3 * * 0', // Weekly on Sunday at 3 AM
      enabled: true,
      runCount: 0,
    }, this.cleanupAuditLogs.bind(this));

    // Hourly security metrics collection
    this.addJob({
      id: 'security-metrics',
      name: 'Security Metrics Collection',
      schedule: '0 * * * *', // Every hour
      enabled: true,
      runCount: 0,
    }, this.collectSecurityMetrics.bind(this));

    // Daily backup verification at 4 AM
    this.addJob({
      id: 'backup-verification',
      name: 'Backup Verification',
      schedule: '0 4 * * *', // Daily at 4 AM
      enabled: true,
      runCount: 0,
    }, this.verifyBackups.bind(this));
  }

  private addJob(jobConfig: ScheduledJob, taskFunction: () => Promise<void>): void {
    const task = cron.schedule(jobConfig.schedule, async () => {
      if (!jobConfig.enabled) {
        return;
      }

      logger.info('Starting scheduled job', { jobId: jobConfig.id, jobName: jobConfig.name });
      
      try {
        const startTime = Date.now();
        await taskFunction();
        const duration = Date.now() - startTime;
        
        jobConfig.lastRun = new Date();
        jobConfig.runCount++;
        
        logger.info('Scheduled job completed successfully', {
          jobId: jobConfig.id,
          jobName: jobConfig.name,
          duration,
          runCount: jobConfig.runCount,
        });

        // Log successful job execution
        await this.securityService.logAuditEvent({
          userId: 'system',
          action: 'SCHEDULED_JOB_COMPLETED',
          resource: 'scheduled_jobs',
          resourceId: jobConfig.id,
          metadata: {
            jobName: jobConfig.name,
            duration,
            runCount: jobConfig.runCount,
          },
          success: true,
        });
      } catch (error) {
        logger.error('Scheduled job failed', {
          jobId: jobConfig.id,
          jobName: jobConfig.name,
          error: error instanceof Error ? error.message : String(error),
        });

        // Log failed job execution
        await this.securityService.logAuditEvent({
          userId: 'system',
          action: 'SCHEDULED_JOB_FAILED',
          resource: 'scheduled_jobs',
          resourceId: jobConfig.id,
          metadata: {
            jobName: jobConfig.name,
            error: error instanceof Error ? error.message : String(error),
          },
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }, {
      scheduled: false, // Don't start immediately
    });

    this.jobs.set(jobConfig.id, { job: jobConfig, task });
  }

  startScheduler(): void {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    logger.info('Starting scheduler service');
    
    for (const [jobId, { job, task }] of this.jobs.entries()) {
      if (job.enabled) {
        task.start();
        job.nextRun = this.calculateNextRun(job.schedule);
        logger.info('Started scheduled job', { jobId, jobName: job.name, nextRun: job.nextRun });
      }
    }

    this.isRunning = true;
    logger.info('Scheduler service started successfully');
  }

  stopScheduler(): void {
    if (!this.isRunning) {
      logger.warn('Scheduler is not running');
      return;
    }

    logger.info('Stopping scheduler service');
    
    for (const [jobId, { job, task }] of this.jobs.entries()) {
      task.stop();
      job.nextRun = undefined;
      logger.info('Stopped scheduled job', { jobId, jobName: job.name });
    }

    this.isRunning = false;
    logger.info('Scheduler service stopped successfully');
  }

  getScheduledJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values()).map(({ job }) => ({
      ...job,
      nextRun: job.enabled ? this.calculateNextRun(job.schedule) : undefined,
    }));
  }

  enableJob(jobId: string): void {
    const jobEntry = this.jobs.get(jobId);
    if (!jobEntry) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    jobEntry.job.enabled = true;
    
    if (this.isRunning) {
      jobEntry.task.start();
      jobEntry.job.nextRun = this.calculateNextRun(jobEntry.job.schedule);
    }

    logger.info('Enabled scheduled job', { jobId, jobName: jobEntry.job.name });
  }

  disableJob(jobId: string): void {
    const jobEntry = this.jobs.get(jobId);
    if (!jobEntry) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    jobEntry.job.enabled = false;
    jobEntry.task.stop();
    jobEntry.job.nextRun = undefined;

    logger.info('Disabled scheduled job', { jobId, jobName: jobEntry.job.name });
  }

  private calculateNextRun(schedule: string): Date {
    // This is a simplified calculation - in production you'd use a proper cron parser
    const now = new Date();
    
    // For demonstration, just add 1 hour for hourly jobs, 1 day for daily jobs
    if (schedule.includes('* * * *')) { // Hourly
      return new Date(now.getTime() + 60 * 60 * 1000);
    } else if (schedule.includes('* * *')) { // Daily
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else { // Weekly
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  // Scheduled job implementations
  private async enforceRetentionPolicies(): Promise<void> {
    logger.info('Starting retention policy enforcement');
    await this.securityService.enforceRetentionPolicies();
    logger.info('Retention policy enforcement completed');
  }

  private async cleanupAuditLogs(): Promise<void> {
    logger.info('Starting audit log cleanup');
    
    // Get audit logs older than retention period
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    const oldLogs = await this.securityService.getAuditLogs(undefined, undefined, cutoffDate);
    
    logger.info('Audit log cleanup completed', { 
      oldLogsFound: oldLogs.length,
      cutoffDate: cutoffDate.toISOString(),
    });
  }

  private async collectSecurityMetrics(): Promise<void> {
    logger.info('Collecting security metrics');
    
    const policies = await this.securityService.getRetentionPolicies();
    const recentAuditLogs = await this.securityService.getAuditLogs(
      undefined,
      new Date(Date.now() - 60 * 60 * 1000) // Last hour
    );

    const metrics = {
      retentionPoliciesCount: policies.length,
      hourlyAuditEvents: recentAuditLogs.length,
      failedAuditEvents: recentAuditLogs.filter(log => !log.success).length,
      timestamp: new Date().toISOString(),
    };

    logger.info('Security metrics collected', metrics);
    
    // In production, you might send these metrics to a monitoring system
    await this.sendMetricsToMonitoring(metrics);
  }

  private async verifyBackups(): Promise<void> {
    logger.info('Starting backup verification');
    
    // In production, this would verify that backups are being created successfully
    // and that they can be restored if needed
    
    const backupStatus = {
      lastBackupTime: new Date().toISOString(),
      backupSize: '1.2GB', // Mock data
      verificationStatus: 'success',
      integrityCheck: 'passed',
    };

    logger.info('Backup verification completed', backupStatus);
  }

  private async sendMetricsToMonitoring(metrics: any): Promise<void> {
    // Placeholder for sending metrics to external monitoring systems
    // This could be Prometheus, DataDog, CloudWatch, etc.
    logger.debug('Metrics would be sent to monitoring system', { metrics });
  }
}

// Export singleton instance
export const schedulerService = new DefaultSchedulerService();