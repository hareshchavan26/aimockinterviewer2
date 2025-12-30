import Stripe from 'stripe';
import {
  PaymentService,
  SubscriptionRepository,
  UserSubscription,
  SubscriptionStatus,
  PaymentFailedError,
  SubscriptionNotFoundError,
} from '../types';
import { logger } from '../utils/logger';

export class StripePaymentService implements PaymentService {
  private stripe: Stripe;

  constructor(
    private repository: SubscriptionRepository,
    stripeSecretKey: string,
    private webhookSecret: string
  ) {
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });
  }

  // Customer management
  async createCustomer(userId: string, email: string, name?: string): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          userId,
        },
      });

      logger.info('Stripe customer created', { customerId: customer.id, userId, email });
      return customer.id;
    } catch (error) {
      logger.error('Failed to create Stripe customer', { error, userId, email });
      throw new PaymentFailedError('Failed to create customer');
    }
  }

  async updateCustomer(customerId: string, data: Partial<Stripe.CustomerUpdateParams>): Promise<void> {
    try {
      await this.stripe.customers.update(customerId, data);
      logger.info('Stripe customer updated', { customerId });
    } catch (error) {
      logger.error('Failed to update Stripe customer', { error, customerId });
      throw new PaymentFailedError('Failed to update customer');
    }
  }

  async deleteCustomer(customerId: string): Promise<void> {
    try {
      await this.stripe.customers.del(customerId);
      logger.info('Stripe customer deleted', { customerId });
    } catch (error) {
      logger.error('Failed to delete Stripe customer', { error, customerId });
      throw new PaymentFailedError('Failed to delete customer');
    }
  }

  // Payment methods
  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    try {
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      logger.info('Payment method attached', { customerId, paymentMethodId });
    } catch (error) {
      logger.error('Failed to attach payment method', { error, customerId, paymentMethodId });
      throw new PaymentFailedError('Failed to attach payment method');
    }
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);
      logger.info('Payment method detached', { paymentMethodId });
    } catch (error) {
      logger.error('Failed to detach payment method', { error, paymentMethodId });
      throw new PaymentFailedError('Failed to detach payment method');
    }
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    try {
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      logger.info('Default payment method set', { customerId, paymentMethodId });
    } catch (error) {
      logger.error('Failed to set default payment method', { error, customerId, paymentMethodId });
      throw new PaymentFailedError('Failed to set default payment method');
    }
  }

  // Subscriptions
  async createSubscription(
    customerId: string,
    priceId: string,
    options: {
      trialPeriodDays?: number;
      paymentMethodId?: string;
      metadata?: Record<string, string>;
    } = {}
  ): Promise<Stripe.Subscription> {
    try {
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: options.metadata || {},
      };

      if (options.trialPeriodDays) {
        subscriptionParams.trial_period_days = options.trialPeriodDays;
      }

      if (options.paymentMethodId) {
        subscriptionParams.default_payment_method = options.paymentMethodId;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionParams);

      logger.info('Stripe subscription created', {
        subscriptionId: subscription.id,
        customerId,
        priceId,
        status: subscription.status,
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to create Stripe subscription', { error, customerId, priceId });
      throw new PaymentFailedError('Failed to create subscription');
    }
  }

  async updateSubscription(
    subscriptionId: string,
    options: Stripe.SubscriptionUpdateParams
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, options);

      logger.info('Stripe subscription updated', {
        subscriptionId,
        status: subscription.status,
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to update Stripe subscription', { error, subscriptionId });
      throw new PaymentFailedError('Failed to update subscription');
    }
  }

  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false
  ): Promise<Stripe.Subscription> {
    try {
      let subscription: Stripe.Subscription;

      if (immediately) {
        subscription = await this.stripe.subscriptions.cancel(subscriptionId);
      } else {
        subscription = await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }

      logger.info('Stripe subscription canceled', {
        subscriptionId,
        immediately,
        status: subscription.status,
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to cancel Stripe subscription', { error, subscriptionId, immediately });
      throw new PaymentFailedError('Failed to cancel subscription');
    }
  }

  // Retry failed payments
  async retryFailedPayment(subscriptionId: string): Promise<void> {
    try {
      // Get the subscription
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice'],
      });

      if (!subscription.latest_invoice) {
        throw new PaymentFailedError('No invoice found for subscription');
      }

      const invoice = subscription.latest_invoice as Stripe.Invoice;

      if (invoice.status === 'open') {
        // Retry the payment
        await this.stripe.invoices.pay(invoice.id);
        logger.info('Payment retry successful', { subscriptionId, invoiceId: invoice.id });
      }
    } catch (error) {
      logger.error('Failed to retry payment', { error, subscriptionId });
      throw new PaymentFailedError('Failed to retry payment');
    }
  }

  // Webhook handling
  async handleWebhook(payload: string, signature: string): Promise<void> {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);

      logger.info('Processing Stripe webhook', { eventType: event.type, eventId: event.id });

      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
          break;

        default:
          logger.info('Unhandled webhook event type', { eventType: event.type });
      }
    } catch (error) {
      logger.error('Failed to process webhook', { error });
      throw error;
    }
  }

  // Private webhook handlers
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId = subscription.customer as string;
      const customer = await this.stripe.customers.retrieve(customerId);

      if (customer.deleted) {
        logger.warn('Subscription created for deleted customer', { subscriptionId: subscription.id });
        return;
      }

      const userId = customer.metadata?.userId;
      if (!userId) {
        logger.warn('No userId found in customer metadata', { customerId });
        return;
      }

      // Update our subscription record with Stripe data
      const userSubscription = await this.repository.findSubscriptionByUserId(userId);
      if (userSubscription) {
        await this.repository.updateSubscription(userSubscription.id, {
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: customerId,
          status: this.mapStripeStatus(subscription.status),
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        });
      }

      logger.info('Subscription created webhook processed', { subscriptionId: subscription.id, userId });
    } catch (error) {
      logger.error('Failed to handle subscription created webhook', { error, subscriptionId: subscription.id });
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const userSubscription = await this.repository.findSubscriptionByStripeId(subscription.id);
      if (!userSubscription) {
        logger.warn('No local subscription found for Stripe subscription', { subscriptionId: subscription.id });
        return;
      }

      await this.repository.updateSubscription(userSubscription.id, {
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
      });

      logger.info('Subscription updated webhook processed', { subscriptionId: subscription.id });
    } catch (error) {
      logger.error('Failed to handle subscription updated webhook', { error, subscriptionId: subscription.id });
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      const userSubscription = await this.repository.findSubscriptionByStripeId(subscription.id);
      if (!userSubscription) {
        logger.warn('No local subscription found for deleted Stripe subscription', { subscriptionId: subscription.id });
        return;
      }

      await this.repository.updateSubscription(userSubscription.id, {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
      });

      logger.info('Subscription deleted webhook processed', { subscriptionId: subscription.id });
    } catch (error) {
      logger.error('Failed to handle subscription deleted webhook', { error, subscriptionId: subscription.id });
    }
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    try {
      if (!invoice.subscription) {
        return;
      }

      const subscriptionId = invoice.subscription as string;
      const userSubscription = await this.repository.findSubscriptionByStripeId(subscriptionId);
      
      if (!userSubscription) {
        logger.warn('No local subscription found for payment succeeded', { subscriptionId });
        return;
      }

      // Update subscription status to active if it was past due
      if (userSubscription.status === SubscriptionStatus.PAST_DUE) {
        await this.repository.updateSubscription(userSubscription.id, {
          status: SubscriptionStatus.ACTIVE,
        });
      }

      logger.info('Payment succeeded webhook processed', { subscriptionId, invoiceId: invoice.id });
    } catch (error) {
      logger.error('Failed to handle payment succeeded webhook', { error, invoiceId: invoice.id });
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      if (!invoice.subscription) {
        return;
      }

      const subscriptionId = invoice.subscription as string;
      const userSubscription = await this.repository.findSubscriptionByStripeId(subscriptionId);
      
      if (!userSubscription) {
        logger.warn('No local subscription found for payment failed', { subscriptionId });
        return;
      }

      // Mark subscription as past due
      await this.repository.updateSubscription(userSubscription.id, {
        status: SubscriptionStatus.PAST_DUE,
      });

      // Schedule retry logic (this would typically be handled by a job queue)
      await this.schedulePaymentRetry(userSubscription.id, invoice.id);

      logger.info('Payment failed webhook processed', { subscriptionId, invoiceId: invoice.id });
    } catch (error) {
      logger.error('Failed to handle payment failed webhook', { error, invoiceId: invoice.id });
    }
  }

  private async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
    try {
      const userSubscription = await this.repository.findSubscriptionByStripeId(subscription.id);
      if (!userSubscription) {
        logger.warn('No local subscription found for trial ending', { subscriptionId: subscription.id });
        return;
      }

      // Send notification to user about trial ending
      // This would typically integrate with a notification service
      logger.info('Trial will end notification', { 
        subscriptionId: subscription.id,
        userId: userSubscription.userId,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
      });
    } catch (error) {
      logger.error('Failed to handle trial will end webhook', { error, subscriptionId: subscription.id });
    }
  }

  private async schedulePaymentRetry(subscriptionId: string, invoiceId: string): Promise<void> {
    // In a real implementation, this would use a job queue like Bull or Agenda
    // For now, we'll implement a simple retry mechanism
    const retryDelays = [24, 72, 168]; // 1 day, 3 days, 7 days in hours

    for (let i = 0; i < retryDelays.length; i++) {
      setTimeout(async () => {
        try {
          await this.retryFailedPayment(subscriptionId);
          logger.info('Scheduled payment retry executed', { subscriptionId, attempt: i + 1 });
        } catch (error) {
          logger.error('Scheduled payment retry failed', { error, subscriptionId, attempt: i + 1 });
        }
      }, retryDelays[i] * 60 * 60 * 1000); // Convert hours to milliseconds
    }
  }

  private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'unpaid':
        return SubscriptionStatus.UNPAID;
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      case 'incomplete':
        return SubscriptionStatus.INCOMPLETE;
      case 'incomplete_expired':
        return SubscriptionStatus.INCOMPLETE_EXPIRED;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'paused':
        return SubscriptionStatus.PAUSED;
      default:
        return SubscriptionStatus.INCOMPLETE;
    }
  }
}