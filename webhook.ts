import { Request, Response } from 'express';
import { PaymentService } from '../types';
import { logger } from '../utils/logger';

export class WebhookController {
  constructor(private paymentService: PaymentService) {}

  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const payload = req.body;

      if (!signature) {
        logger.warn('Missing Stripe signature header');
        res.status(400).json({ error: 'Missing signature header' });
        return;
      }

      await this.paymentService.handleWebhook(payload, signature);

      logger.info('Webhook processed successfully');
      res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Webhook processing failed', { error });
      res.status(400).json({ error: 'Webhook processing failed' });
    }
  }
}