import bcrypt from 'bcryptjs';
import { PasswordService, AuthConfig } from '../../types';

export class TestBcryptPasswordService implements PasswordService {
  constructor(private config: AuthConfig) {}

  async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.config.bcryptRounds);
      return bcrypt.hash(password, salt);
    } catch (error) {
      throw new Error('Failed to hash password');
    }
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return bcrypt.compare(password, hash);
    } catch (error) {
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
}