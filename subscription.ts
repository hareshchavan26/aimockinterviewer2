// Subscription and Billing Types

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  tier: SubscriptionTier;
  price: number; // in cents
  currency: string;
  billingInterval: BillingInterval;
  features: PlanFeature[];
  limits: UsageLimits;
  stripeProductId?: string;
  stripePriceId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  usage: UsageMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageMetrics {
  id: string;
  subscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
  interviewsUsed: number;
  analysisReportsGenerated: number;
  aiQuestionsUsed: number;
  recordingMinutesUsed: number;
  exportCount: number;
  lastResetAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageLimits {
  interviewsPerMonth: number;
  analysisReportsPerMonth: number;
  aiQuestionsPerInterview: number;
  recordingMinutesPerMonth: number;
  exportsPerMonth: number;
  maxInterviewDuration: number; // in minutes
  advancedAnalytics: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
}

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  category: FeatureCategory;
  isEnabled: boolean;
}

// Enums
export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  CANCELED = 'canceled',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  PAUSED = 'paused',
}

export enum BillingInterval {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum FeatureCategory {
  INTERVIEWS = 'interviews',
  ANALYSIS = 'analysis',
  REPORTING = 'reporting',
  SUPPORT = 'support',
  CUSTOMIZATION = 'customization',
  INTEGRATIONS = 'integrations',
}

export enum UsageType {
  INTERVIEW_STARTED = 'interview_started',
  INTERVIEW_COMPLETED = 'interview_completed',
  ANALYSIS_GENERATED = 'analysis_generated',
  REPORT_EXPORTED = 'report_exported',
  AI_QUESTION_GENERATED = 'ai_question_generated',
  RECORDING_MINUTE_USED = 'recording_minute_used',
}

// Request/Response types
export interface CreateSubscriptionRequest {
  userId: string;
  planId: string;
  paymentMethodId?: string;
  trialDays?: number;
}

export interface UpdateSubscriptionRequest {
  planId?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface CreatePlanRequest {
  name: string;
  description: string;
  tier: SubscriptionTier;
  price: number;
  currency: string;
  billingInterval: BillingInterval;
  features: string[];
  limits: UsageLimits;
}

export interface UpdatePlanRequest {
  name?: string;
  description?: string;
  price?: number;
  features?: string[];
  limits?: Partial<UsageLimits>;
  isActive?: boolean;
}

export interface UsageTrackingRequest {
  subscriptionId: string;
  usageType: UsageType;
  quantity?: number;
  metadata?: Record<string, any>;
}

export interface SubscriptionResponse {
  subscription: UserSubscription;
  plan: SubscriptionPlan;
  usage: UsageMetrics;
  remainingUsage: {
    interviews: number;
    analysisReports: number;
    aiQuestions: number;
    recordingMinutes: number;
    exports: number;
  };
}

export interface UsageCheckResponse {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  limit: number;
  upgradeRequired?: boolean;
  suggestedPlan?: SubscriptionPlan;
}

// Service interfaces
export interface SubscriptionRepository {
  // Plan operations
  createPlan(planData: Partial<SubscriptionPlan>): Promise<SubscriptionPlan>;
  findPlanById(planId: string): Promise<SubscriptionPlan | null>;
  findPlanByTier(tier: SubscriptionTier): Promise<SubscriptionPlan | null>;
  updatePlan(planId: string, planData: Partial<SubscriptionPlan>): Promise<SubscriptionPlan>;
  deletePlan(planId: string): Promise<void>;
  listPlans(activeOnly?: boolean): Promise<SubscriptionPlan[]>;
  
  // Subscription operations
  createSubscription(subscriptionData: Partial<UserSubscription>): Promise<UserSubscription>;
  findSubscriptionById(subscriptionId: string): Promise<UserSubscription | null>;
  findSubscriptionByUserId(userId: string): Promise<UserSubscription | null>;
  findSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | null>;
  updateSubscription(subscriptionId: string, subscriptionData: Partial<UserSubscription>): Promise<UserSubscription>;
  deleteSubscription(subscriptionId: string): Promise<void>;
  
  // Usage operations
  createUsageMetrics(usageData: Partial<UsageMetrics>): Promise<UsageMetrics>;
  findUsageBySubscriptionId(subscriptionId: string): Promise<UsageMetrics | null>;
  updateUsage(subscriptionId: string, usageData: Partial<UsageMetrics>): Promise<UsageMetrics>;
  resetUsage(subscriptionId: string, periodStart: Date, periodEnd: Date): Promise<UsageMetrics>;
  
  // Usage tracking
  trackUsage(subscriptionId: string, usageType: UsageType, quantity: number): Promise<void>;
  getCurrentUsage(subscriptionId: string): Promise<UsageMetrics>;
}

export interface SubscriptionService {
  // Plan management
  createPlan(planData: CreatePlanRequest): Promise<SubscriptionPlan>;
  updatePlan(planId: string, planData: UpdatePlanRequest): Promise<SubscriptionPlan>;
  deletePlan(planId: string): Promise<void>;
  getPlan(planId: string): Promise<SubscriptionPlan>;
  listPlans(activeOnly?: boolean): Promise<SubscriptionPlan[]>;
  
  // Subscription management
  createSubscription(subscriptionData: CreateSubscriptionRequest): Promise<SubscriptionResponse>;
  updateSubscription(subscriptionId: string, subscriptionData: UpdateSubscriptionRequest): Promise<SubscriptionResponse>;
  cancelSubscription(subscriptionId: string, immediately?: boolean): Promise<UserSubscription>;
  getUserSubscription(userId: string): Promise<SubscriptionResponse | null>;
  getSubscription(subscriptionId: string): Promise<SubscriptionResponse>;
  
  // Usage management
  trackUsage(request: UsageTrackingRequest): Promise<void>;
  checkUsageLimit(subscriptionId: string, usageType: UsageType, requestedQuantity?: number): Promise<UsageCheckResponse>;
  getCurrentUsage(subscriptionId: string): Promise<UsageMetrics>;
  resetUsageForPeriod(subscriptionId: string): Promise<UsageMetrics>;
  
  // Feature access
  hasFeatureAccess(userId: string, feature: string): Promise<boolean>;
  getFeatureAccess(userId: string): Promise<PlanFeature[]>;
  
  // System operations
  initializeDefaultPlans(): Promise<void>;
  processSubscriptionRenewal(subscriptionId: string): Promise<void>;
  handleFailedPayment(subscriptionId: string): Promise<void>;
}

export interface PaymentService {
  // Customer management
  createCustomer(userId: string, email: string, name?: string): Promise<string>;
  updateCustomer(customerId: string, data: any): Promise<void>;
  deleteCustomer(customerId: string): Promise<void>;
  
  // Payment methods
  attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;
  detachPaymentMethod(paymentMethodId: string): Promise<void>;
  setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;
  
  // Subscriptions
  createSubscription(customerId: string, priceId: string, options?: any): Promise<any>;
  updateSubscription(subscriptionId: string, options: any): Promise<any>;
  cancelSubscription(subscriptionId: string, immediately?: boolean): Promise<any>;
  
  // Webhooks
  handleWebhook(payload: string, signature: string): Promise<void>;
  
  // Payment retry
  retryFailedPayment(subscriptionId: string): Promise<void>;
}

// Error types
export class SubscriptionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'SubscriptionError';
  }
}

export class UsageLimitExceededError extends SubscriptionError {
  constructor(
    message: string,
    public usageType: UsageType,
    public currentUsage: number,
    public limit: number
  ) {
    super(message, 'USAGE_LIMIT_EXCEEDED', 403);
    this.name = 'UsageLimitExceededError';
  }
}

export class PlanNotFoundError extends SubscriptionError {
  constructor(message: string, public planId?: string) {
    super(message, 'PLAN_NOT_FOUND', 404);
    this.name = 'PlanNotFoundError';
  }
}

export class SubscriptionNotFoundError extends SubscriptionError {
  constructor(message: string, public subscriptionId?: string) {
    super(message, 'SUBSCRIPTION_NOT_FOUND', 404);
    this.name = 'SubscriptionNotFoundError';
  }
}

export class PaymentFailedError extends SubscriptionError {
  constructor(message: string, public paymentIntentId?: string) {
    super(message, 'PAYMENT_FAILED', 402);
    this.name = 'PaymentFailedError';
  }
}

export class InvalidPlanTransitionError extends SubscriptionError {
  constructor(message: string, public fromPlan: string, public toPlan: string) {
    super(message, 'INVALID_PLAN_TRANSITION', 400);
    this.name = 'InvalidPlanTransitionError';
  }
}

export class ValidationError extends SubscriptionError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends SubscriptionError {
  constructor(message: string, public resource?: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends SubscriptionError {
  constructor(message: string, public resource?: string) {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}