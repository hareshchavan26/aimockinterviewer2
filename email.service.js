export class MockEmailService {
    sentEmails = [];
    async sendVerificationEmail(email, token) {
        this.sentEmails.push({
            type: 'verification',
            email,
            token,
            timestamp: new Date(),
        });
    }
    async sendPasswordResetEmail(email, token) {
        this.sentEmails.push({
            type: 'passwordReset',
            email,
            token,
            timestamp: new Date(),
        });
    }
    async sendMagicLinkEmail(email, token) {
        this.sentEmails.push({
            type: 'magicLink',
            email,
            token,
            timestamp: new Date(),
        });
    }
    // Test helper methods
    getLastEmailSent() {
        return this.sentEmails[this.sentEmails.length - 1];
    }
    getEmailsSentTo(email) {
        return this.sentEmails.filter(e => e.email === email);
    }
    getEmailsByType(type) {
        return this.sentEmails.filter(e => e.type === type);
    }
    reset() {
        this.sentEmails = [];
    }
}
