import { Pool } from 'pg';
import {
  SubscriptionPlan,
  UserSubscription,
  UsageMetrics,
  SubscriptionRepository,
  SubscriptionTier,
  SubscriptionStatus,
  UsageType,
  NotFoundError,
  ConflictError,
} from '../types';

export class DatabaseSubscriptionRepository implements SubscriptionRepository {
  constructor(private pool: Pool) {}

  // Plan operations
  async createPlan(planData: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const client = await this.pool.connect();
    try {
      // Check if plan with same name already exists
      const existingPlan = await client.query(
        'SELECT id FROM subscription_plans WHERE name = $1',
        [planData.name]
      );

      if (existingPlan.rows.length > 0) {
        throw new ConflictError(`Plan with name '${planData.name}' already exists`);
      }

      const result = await client.query(
        `INSERT INTO subscription_plans (
          id, name, description, tier, price, currency, billing_interval,
          features, limits, stripe_product_id, stripe_price_id, is_active,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *`,
        [
          crypto.randomUUID(),
          planData.name,
          planData.description || '',
          planData.tier,
          planData.price,
          planData.currency || 'usd',
          planData.billingInterval,
          JSON.stringify(planData.features || []),
          JSON.stringify(planData.limits || {}),
          planData.stripeProductId,
          planData.stripePriceId,
          planData.isActive ?? true,
        ]
      );

      return this.mapPlanFromDb(result.rows[0]);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async findPlanById(planId: string): Promise<SubscriptionPlan | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM subscription_plans WHERE id = $1',
        [planId]
      );

      return result.rows.length > 0 ? this.mapPlanFromDb(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async findPlanByTier(tier: SubscriptionTier): Promise<SubscriptionPlan | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM subscription_plans WHERE tier = $1 AND is_active = true ORDER BY price ASC LIMIT 1',
        [tier]
      );

      return result.rows.length > 0 ? this.mapPlanFromDb(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async updatePlan(planId: string, planData: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const client = await this.pool.connect();
    try {
      // Check if plan exists
      const existingPlan = await client.query(
        'SELECT * FROM subscription_plans WHERE id = $1',
        [planId]
      );

      if (existingPlan.rows.length === 0) {
        throw new NotFoundError('Plan not found');
      }

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (planData.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(planData.name);
      }
      if (planData.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(planData.description);
      }
      if (planData.price !== undefined) {
        updateFields.push(`price = $${paramIndex++}`);
        updateValues.push(planData.price);
      }
      if (planData.features !== undefined) {
        updateFields.push(`features = $${paramIndex++}`);
        updateValues.push(JSON.stringify(planData.features));
      }
      if (planData.limits !== undefined) {
        updateFields.push(`limits = $${paramIndex++}`);
        updateValues.push(JSON.stringify(planData.limits));
      }
      if (planData.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        updateValues.push(planData.isActive);
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(planId);

      const result = await client.query(
        `UPDATE subscription_plans SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        updateValues
      );

      return this.mapPlanFromDb(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async deletePlan(planId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM subscription_plans WHERE id = $1',
        [planId]
      );

      if (result.rowCount === 0) {
        throw new NotFoundError('Plan not found');
      }
    } finally {
      client.release();
    }
  }

  async listPlans(activeOnly: boolean = false): Promise<SubscriptionPlan[]> {
    const client = await this.pool.connect();
    try {
      const query = activeOnly
        ? 'SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price ASC'
        : 'SELECT * FROM subscription_plans ORDER BY price ASC';

      const result = await client.query(query);
      return result.rows.map(row => this.mapPlanFromDb(row));
    } finally {
      client.release();
    }
  }

  // Subscription operations
  async createSubscription(subscriptionData: Partial<UserSubscription>): Promise<UserSubscription> {
    const client = await this.pool.connect();
    try {
      // Check if user already has an active subscription
      const existingSubscription = await client.query(
        'SELECT id FROM user_subscriptions WHERE user_id = $1 AND status IN ($2, $3)',
        [subscriptionData.userId, SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]
      );

      if (existingSubscription.rows.length > 0) {
        throw new ConflictError('User already has an active subscription');
      }

      const result = await client.query(
        `INSERT INTO user_subscriptions (
          id, user_id, plan_id, stripe_subscription_id, stripe_customer_id,
          status, current_period_start, current_period_end, cancel_at_period_end,
          trial_start, trial_end, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *`,
        [
          crypto.randomUUID(),
          subscriptionData.userId,
          subscriptionData.planId,
          subscriptionData.stripeSubscriptionId,
          subscriptionData.stripeCustomerId,
          subscriptionData.status || SubscriptionStatus.ACTIVE,
          subscriptionData.currentPeriodStart || new Date(),
          subscriptionData.currentPeriodEnd,
          subscriptionData.cancelAtPeriodEnd || false,
          subscriptionData.trialStart,
          subscriptionData.trialEnd,
        ]
      );

      const subscription = this.mapSubscriptionFromDb(result.rows[0]);

      // Create initial usage metrics
      await this.createUsageMetrics({
        subscriptionId: subscription.id,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
        interviewsUsed: 0,
        analysisReportsGenerated: 0,
        aiQuestionsUsed: 0,
        recordingMinutesUsed: 0,
        exportCount: 0,
        lastResetAt: new Date(),
      });

      return subscription;
    } finally {
      client.release();
    }
  }

  async findSubscriptionById(subscriptionId: string): Promise<UserSubscription | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM user_subscriptions WHERE id = $1',
        [subscriptionId]
      );

      return result.rows.length > 0 ? this.mapSubscriptionFromDb(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async findSubscriptionByUserId(userId: string): Promise<UserSubscription | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM user_subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [userId]
      );

      return result.rows.length > 0 ? this.mapSubscriptionFromDb(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async findSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM user_subscriptions WHERE stripe_subscription_id = $1',
        [stripeSubscriptionId]
      );

      return result.rows.length > 0 ? this.mapSubscriptionFromDb(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async updateSubscription(subscriptionId: string, subscriptionData: Partial<UserSubscription>): Promise<UserSubscription> {
    const client = await this.pool.connect();
    try {
      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (subscriptionData.planId !== undefined) {
        updateFields.push(`plan_id = $${paramIndex++}`);
        updateValues.push(subscriptionData.planId);
      }
      if (subscriptionData.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        updateValues.push(subscriptionData.status);
      }
      if (subscriptionData.currentPeriodStart !== undefined) {
        updateFields.push(`current_period_start = $${paramIndex++}`);
        updateValues.push(subscriptionData.currentPeriodStart);
      }
      if (subscriptionData.currentPeriodEnd !== undefined) {
        updateFields.push(`current_period_end = $${paramIndex++}`);
        updateValues.push(subscriptionData.currentPeriodEnd);
      }
      if (subscriptionData.cancelAtPeriodEnd !== undefined) {
        updateFields.push(`cancel_at_period_end = $${paramIndex++}`);
        updateValues.push(subscriptionData.cancelAtPeriodEnd);
      }
      if (subscriptionData.canceledAt !== undefined) {
        updateFields.push(`canceled_at = $${paramIndex++}`);
        updateValues.push(subscriptionData.canceledAt);
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(subscriptionId);

      const result = await client.query(
        `UPDATE user_subscriptions SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        updateValues
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Subscription not found');
      }

      return this.mapSubscriptionFromDb(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM user_subscriptions WHERE id = $1',
        [subscriptionId]
      );

      if (result.rowCount === 0) {
        throw new NotFoundError('Subscription not found');
      }
    } finally {
      client.release();
    }
  }

  // Usage operations
  async createUsageMetrics(usageData: Partial<UsageMetrics>): Promise<UsageMetrics> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO usage_metrics (
          id, subscription_id, period_start, period_end,
          interviews_used, analysis_reports_generated, ai_questions_used,
          recording_minutes_used, export_count, last_reset_at,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *`,
        [
          crypto.randomUUID(),
          usageData.subscriptionId,
          usageData.periodStart,
          usageData.periodEnd,
          usageData.interviewsUsed || 0,
          usageData.analysisReportsGenerated || 0,
          usageData.aiQuestionsUsed || 0,
          usageData.recordingMinutesUsed || 0,
          usageData.exportCount || 0,
          usageData.lastResetAt || new Date(),
        ]
      );

      return this.mapUsageFromDb(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async findUsageBySubscriptionId(subscriptionId: string): Promise<UsageMetrics | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM usage_metrics WHERE subscription_id = $1 ORDER BY created_at DESC LIMIT 1',
        [subscriptionId]
      );

      return result.rows.length > 0 ? this.mapUsageFromDb(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async updateUsage(subscriptionId: string, usageData: Partial<UsageMetrics>): Promise<UsageMetrics> {
    const client = await this.pool.connect();
    try {
      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (usageData.interviewsUsed !== undefined) {
        updateFields.push(`interviews_used = $${paramIndex++}`);
        updateValues.push(usageData.interviewsUsed);
      }
      if (usageData.analysisReportsGenerated !== undefined) {
        updateFields.push(`analysis_reports_generated = $${paramIndex++}`);
        updateValues.push(usageData.analysisReportsGenerated);
      }
      if (usageData.aiQuestionsUsed !== undefined) {
        updateFields.push(`ai_questions_used = $${paramIndex++}`);
        updateValues.push(usageData.aiQuestionsUsed);
      }
      if (usageData.recordingMinutesUsed !== undefined) {
        updateFields.push(`recording_minutes_used = $${paramIndex++}`);
        updateValues.push(usageData.recordingMinutesUsed);
      }
      if (usageData.exportCount !== undefined) {
        updateFields.push(`export_count = $${paramIndex++}`);
        updateValues.push(usageData.exportCount);
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(subscriptionId);

      const result = await client.query(
        `UPDATE usage_metrics SET ${updateFields.join(', ')} 
         WHERE subscription_id = $${paramIndex} 
         AND id = (SELECT id FROM usage_metrics WHERE subscription_id = $${paramIndex} ORDER BY created_at DESC LIMIT 1)
         RETURNING *`,
        updateValues
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Usage metrics not found');
      }

      return this.mapUsageFromDb(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async resetUsage(subscriptionId: string, periodStart: Date, periodEnd: Date): Promise<UsageMetrics> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO usage_metrics (
          id, subscription_id, period_start, period_end,
          interviews_used, analysis_reports_generated, ai_questions_used,
          recording_minutes_used, export_count, last_reset_at,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 0, 0, 0, 0, 0, NOW(), NOW(), NOW())
        RETURNING *`,
        [crypto.randomUUID(), subscriptionId, periodStart, periodEnd]
      );

      return this.mapUsageFromDb(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async trackUsage(subscriptionId: string, usageType: UsageType, quantity: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      let updateField: string;
      switch (usageType) {
        case UsageType.INTERVIEW_STARTED:
        case UsageType.INTERVIEW_COMPLETED:
          updateField = 'interviews_used';
          break;
        case UsageType.ANALYSIS_GENERATED:
          updateField = 'analysis_reports_generated';
          break;
        case UsageType.AI_QUESTION_GENERATED:
          updateField = 'ai_questions_used';
          break;
        case UsageType.RECORDING_MINUTE_USED:
          updateField = 'recording_minutes_used';
          break;
        case UsageType.REPORT_EXPORTED:
          updateField = 'export_count';
          break;
        default:
          throw new Error(`Unknown usage type: ${usageType}`);
      }

      await client.query(
        `UPDATE usage_metrics 
         SET ${updateField} = ${updateField} + $1, updated_at = NOW()
         WHERE subscription_id = $2 
         AND id = (SELECT id FROM usage_metrics WHERE subscription_id = $2 ORDER BY created_at DESC LIMIT 1)`,
        [quantity, subscriptionId]
      );
    } finally {
      client.release();
    }
  }

  async getCurrentUsage(subscriptionId: string): Promise<UsageMetrics> {
    const usage = await this.findUsageBySubscriptionId(subscriptionId);
    if (!usage) {
      throw new NotFoundError('Usage metrics not found');
    }
    return usage;
  }

  // Helper methods
  private mapPlanFromDb(row: any): SubscriptionPlan {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      tier: row.tier,
      price: row.price,
      currency: row.currency,
      billingInterval: row.billing_interval,
      features: JSON.parse(row.features || '[]'),
      limits: JSON.parse(row.limits || '{}'),
      stripeProductId: row.stripe_product_id,
      stripePriceId: row.stripe_price_id,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapSubscriptionFromDb(row: any): UserSubscription {
    return {
      id: row.id,
      userId: row.user_id,
      planId: row.plan_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      stripeCustomerId: row.stripe_customer_id,
      status: row.status,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      cancelAtPeriodEnd: row.cancel_at_period_end,
      canceledAt: row.canceled_at,
      trialStart: row.trial_start,
      trialEnd: row.trial_end,
      usage: {} as UsageMetrics, // Will be populated separately
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapUsageFromDb(row: any): UsageMetrics {
    return {
      id: row.id,
      subscriptionId: row.subscription_id,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      interviewsUsed: row.interviews_used,
      analysisReportsGenerated: row.analysis_reports_generated,
      aiQuestionsUsed: row.ai_questions_used,
      recordingMinutesUsed: row.recording_minutes_used,
      exportCount: row.export_count,
      lastResetAt: row.last_reset_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}