import { EmailService } from '../../types';

export class MockEmailService implements EmailService {
  public sentEmails: Array<{
    type: 'verification' | 'passwordReset' | 'magicLink';
    email: string;
    token: string;
    timestamp: Date;
  }> = [];

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    this.sentEmails.push({
      type: 'verification',
      email,
      token,
      timestamp: new Date(),
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    this.sentEmails.push({
      type: 'passwordReset',
      email,
      token,
      timestamp: new Date(),
    });
  }

  async sendMagicLinkEmail(email: string, token: string): Promise<void> {
    this.sentEmails.push({
      type: 'magicLink',
      email,
      token,
      timestamp: new Date(),
    });
  }

  // Test helper methods
  getLastEmailSent(): typeof this.sentEmails[0] | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  getEmailsSentTo(email: string): typeof this.sentEmails {
    return this.sentEmails.filter(e => e.email === email);
  }

  getEmailsByType(type: 'verification' | 'passwordReset' | 'magicLink'): typeof this.sentEmails {
    return this.sentEmails.filter(e => e.type === type);
  }

  reset(): void {
    this.sentEmails = [];
  }
}