import { StripePaymentService } from '../services/payment';
import { DatabaseSubscriptionRepository } from '../database/subscription-repository';

// Mock Stripe to avoid real API calls in tests
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
      update: jest.fn().mockResolvedValue({}),
      del: jest.fn().mockResolvedValue({}),
      retrieve: jest.fn().mockResolvedValue({
        id: 'cus_test123',
        email: 'test@example.com',
        metadata: { userId: 'user123' },
        deleted: false,
      }),
    },
    paymentMethods: {
      attach: jest.fn().mockResolvedValue({}),
      detach: jest.fn().mockResolvedValue({}),
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
      }),
      update: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
      }),
      cancel: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'canceled',
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        latest_invoice: {
          id: 'in_test123',
          status: 'open',
        },
      }),
    },
    invoices: {
      pay: jest.fn().mockResolvedValue({}),
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        id: 'evt_test123',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test123',
            customer: 'cus_test123',
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          },
        },
      }),
    },
  }));
});

// Mock the repository
const mockRepository = {
  findSubscriptionByUserId: jest.fn(),
  findSubscriptionByStripeId: jest.fn(),
  updateSubscription: jest.fn(),
} as unknown as DatabaseSubscriptionRepository;

describe('Stripe Integration Tests', () => {
  let paymentService: StripePaymentService;

  beforeEach(() => {
    paymentService = new StripePaymentService(
      mockRepository,
      'sk_test_fake_key',
      'whsec_fake_secret'
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Customer Management', () => {
    test('should create a Stripe customer', async () => {
      const customerId = await paymentService.createCustomer('user123', 'test@example.com', 'Test User');
      
      expect(customerId).toBe('cus_test123');
    });

    test('should update a Stripe customer', async () => {
      await expect(
        paymentService.updateCustomer('cus_test123', { name: 'Updated Name' })
      ).resolves.not.toThrow();
    });

    test('should delete a Stripe customer', async () => {
      await expect(
        paymentService.deleteCustomer('cus_test123')
      ).resolves.not.toThrow();
    });
  });

  describe('Payment Methods', () => {
    test('should attach a payment method', async () => {
      await expect(
        paymentService.attachPaymentMethod('cus_test123', 'pm_test123')
      ).resolves.not.toThrow();
    });

    test('should detach a payment method', async () => {
      await expect(
        paymentService.detachPaymentMethod('pm_test123')
      ).resolves.not.toThrow();
    });

    test('should set default payment method', async () => {
      await expect(
        paymentService.setDefaultPaymentMethod('cus_test123', 'pm_test123')
      ).resolves.not.toThrow();
    });
  });

  describe('Subscriptions', () => {
    test('should create a Stripe subscription', async () => {
      const subscription = await paymentService.createSubscription(
        'cus_test123',
        'price_test123',
        { trialPeriodDays: 7 }
      );

      expect(subscription.id).toBe('sub_test123');
      expect(subscription.status).toBe('active');
    });

    test('should update a Stripe subscription', async () => {
      const subscription = await paymentService.updateSubscription('sub_test123', {
        cancel_at_period_end: true,
      });

      expect(subscription.id).toBe('sub_test123');
    });

    test('should cancel a Stripe subscription', async () => {
      const subscription = await paymentService.cancelSubscription('sub_test123', false);

      expect(subscription.id).toBe('sub_test123');
    });
  });

  describe('Payment Retry', () => {
    test('should retry failed payment', async () => {
      await expect(
        paymentService.retryFailedPayment('sub_test123')
      ).resolves.not.toThrow();
    });
  });

  describe('Webhook Handling', () => {
    test('should handle webhook events', async () => {
      const payload = JSON.stringify({
        id: 'evt_test123',
        type: 'customer.subscription.created',
      });
      const signature = 'test_signature';

      // Mock the repository methods for webhook handling
      (mockRepository.findSubscriptionByUserId as jest.Mock).mockResolvedValue({
        id: 'sub_local123',
        userId: 'user123',
      });
      (mockRepository.updateSubscription as jest.Mock).mockResolvedValue({});

      await expect(
        paymentService.handleWebhook(payload, signature)
      ).resolves.not.toThrow();
    });
  });
});