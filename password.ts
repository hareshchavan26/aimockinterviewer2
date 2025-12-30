import bcrypt from 'bcryptjs';
import { PasswordService } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';

export class BcryptPasswordService implements PasswordService {
  async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(config.auth.bcryptRounds);
      return bcrypt.hash(password, salt);
    } catch (error) {
      logger.error('Error hashing password', { error });
      throw new Error('Failed to hash password');
    }
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Error comparing password', { error });
      return false;
    }
  }

  validatePassword(password: string): boolean {
    // Password requirements:
    // - At least 8 characters long
    // - Contains at least one lowercase letter
    // - Contains at least one uppercase letter
    // - Contains at least one digit
    // - Contains at least one special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  getPasswordRequirements(): string[] {
    return [
      'At least 8 characters long',
      'Contains at least one lowercase letter',
      'Contains at least one uppercase letter',
      'Contains at least one digit',
      'Contains at least one special character (@$!%*?&)',
    ];
  }

  generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const special = '@$!%*?&';
    const allChars = lowercase + uppercase + digits + special;

    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += digits[Math.floor(Math.random() * digits.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  calculatePasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (password.length >= 8) {
      score += 20;
    } else {
      feedback.push('Password should be at least 8 characters long');
    }

    if (password.length >= 12) {
      score += 10;
    }

    // Character variety checks
    if (/[a-z]/.test(password)) {
      score += 15;
    } else {
      feedback.push('Add lowercase letters');
    }

    if (/[A-Z]/.test(password)) {
      score += 15;
    } else {
      feedback.push('Add uppercase letters');
    }

    if (/\d/.test(password)) {
      score += 15;
    } else {
      feedback.push('Add numbers');
    }

    if (/[@$!%*?&]/.test(password)) {
      score += 15;
    } else {
      feedback.push('Add special characters (@$!%*?&)');
    }

    // Bonus points for additional complexity
    if (/[^A-Za-z0-9@$!%*?&]/.test(password)) {
      score += 5; // Other special characters
    }

    // Penalty for common patterns
    if (/(.)\1{2,}/.test(password)) {
      score -= 10; // Repeated characters
      feedback.push('Avoid repeated characters');
    }

    if (/123|abc|qwe/i.test(password)) {
      score -= 15; // Sequential patterns
      feedback.push('Avoid sequential patterns');
    }

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      feedback,
      isStrong: score >= 80 && this.validatePassword(password),
    };
  }
}