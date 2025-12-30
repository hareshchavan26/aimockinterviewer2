import { PoolClient } from 'pg';
import { 
  AuthRepository, 
  UserModel, 
  SessionModel, 
  OAuthAccountModel,
  NotFoundError,
  ConflictError 
} from '../types';
import { db } from './connection';
import { logger } from '../utils/logger';

export class PostgresAuthRepository implements AuthRepository {
  // User operations
  async createUser(userData: Partial<UserModel>): Promise<UserModel> {
    const query = `
      INSERT INTO users (
        email, password_hash, first_name, last_name, profile_picture, role,
        email_verified, email_verification_token, email_verification_expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      userData.email,
      userData.password_hash,
      userData.first_name,
      userData.last_name,
      userData.profile_picture,
      userData.role || 'user',
      userData.email_verified || false,
      userData.email_verification_token,
      userData.email_verification_expires_at,
    ];

    try {
      const result = await db.query(query, values);
      return this.mapUserFromDb(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505' && error.constraint === 'users_email_key') {
        throw new ConflictError('Email already exists');
      }
      logger.error('Error creating user', { error, userData: { ...userData, password_hash: '[REDACTED]' } });
      throw error;
    }
  }

  async findUserById(id: string): Promise<UserModel | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapUserFromDb(result.rows[0]);
  }

  async findUserByEmail(email: string): Promise<UserModel | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapUserFromDb(result.rows[0]);
  }

  async findUserByResetToken(token: string): Promise<UserModel | null> {
    const query = 'SELECT * FROM users WHERE password_reset_token = $1';
    const result = await db.query(query, [token]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapUserFromDb(result.rows[0]);
  }

  async findUserByVerificationToken(token: string): Promise<UserModel | null> {
    const query = 'SELECT * FROM users WHERE email_verification_token = $1';
    const result = await db.query(query, [token]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapUserFromDb(result.rows[0]);
  }

  async findUserByMagicLinkToken(token: string): Promise<UserModel | null> {
    const query = 'SELECT * FROM users WHERE magic_link_token = $1';
    const result = await db.query(query, [token]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapUserFromDb(result.rows[0]);
  }

  async updateUser(id: string, userData: Partial<UserModel>): Promise<UserModel> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build dynamic update query
    Object.entries(userData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at
    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }
    
    return this.mapUserFromDb(result.rows[0]);
  }

  async deleteUser(id: string): Promise<void> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rowCount === 0) {
      throw new NotFoundError('User not found');
    }
  }

  // Session operations
  async createSession(sessionData: Partial<SessionModel>): Promise<SessionModel> {
    const query = `
      INSERT INTO sessions (
        user_id, access_token, refresh_token, expires_at, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      sessionData.user_id,
      sessionData.access_token,
      sessionData.refresh_token,
      sessionData.expires_at,
      sessionData.ip_address,
      sessionData.user_agent,
    ];

    const result = await db.query(query, values);
    return this.mapSessionFromDb(result.rows[0]);
  }

  async findSessionById(id: string): Promise<SessionModel | null> {
    const query = 'SELECT * FROM sessions WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapSessionFromDb(result.rows[0]);
  }

  async findSessionByToken(token: string): Promise<SessionModel | null> {
    const query = 'SELECT * FROM sessions WHERE access_token = $1 OR refresh_token = $1';
    const result = await db.query(query, [token]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapSessionFromDb(result.rows[0]);
  }

  async updateSession(id: string, sessionData: Partial<SessionModel>): Promise<SessionModel> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(sessionData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const query = `
      UPDATE sessions 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Session not found');
    }
    
    return this.mapSessionFromDb(result.rows[0]);
  }

  async deleteSession(id: string): Promise<void> {
    const query = 'DELETE FROM sessions WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rowCount === 0) {
      throw new NotFoundError('Session not found');
    }
  }

  async deleteUserSessions(userId: string): Promise<void> {
    const query = 'DELETE FROM sessions WHERE user_id = $1';
    await db.query(query, [userId]);
  }

  // OAuth operations
  async createOAuthAccount(accountData: Partial<OAuthAccountModel>): Promise<OAuthAccountModel> {
    const query = `
      INSERT INTO oauth_accounts (
        user_id, provider, provider_account_id, access_token, refresh_token, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      accountData.user_id,
      accountData.provider,
      accountData.provider_account_id,
      accountData.access_token,
      accountData.refresh_token,
      accountData.expires_at,
    ];

    try {
      const result = await db.query(query, values);
      return this.mapOAuthAccountFromDb(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictError('OAuth account already exists');
      }
      throw error;
    }
  }

  async findOAuthAccount(provider: string, providerId: string): Promise<OAuthAccountModel | null> {
    const query = 'SELECT * FROM oauth_accounts WHERE provider = $1 AND provider_account_id = $2';
    const result = await db.query(query, [provider, providerId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapOAuthAccountFromDb(result.rows[0]);
  }

  async findOAuthAccountsByUserId(userId: string): Promise<OAuthAccountModel[]> {
    const query = 'SELECT * FROM oauth_accounts WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    
    return result.rows.map((row: any) => this.mapOAuthAccountFromDb(row));
  }

  async updateOAuthAccount(id: string, accountData: Partial<OAuthAccountModel>): Promise<OAuthAccountModel> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(accountData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE oauth_accounts 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('OAuth account not found');
    }
    
    return this.mapOAuthAccountFromDb(result.rows[0]);
  }

  async deleteOAuthAccount(id: string): Promise<void> {
    const query = 'DELETE FROM oauth_accounts WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rowCount === 0) {
      throw new NotFoundError('OAuth account not found');
    }
  }

  // Helper methods to map database rows to models
  private mapUserFromDb(row: any): UserModel {
    return {
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      first_name: row.first_name,
      last_name: row.last_name,
      profile_picture: row.profile_picture,
      role: row.role,
      email_verified: row.email_verified,
      email_verification_token: row.email_verification_token,
      email_verification_expires_at: row.email_verification_expires_at,
      password_reset_token: row.password_reset_token,
      password_reset_expires_at: row.password_reset_expires_at,
      magic_link_token: row.magic_link_token,
      magic_link_expires_at: row.magic_link_expires_at,
      last_login_at: row.last_login_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapSessionFromDb(row: any): SessionModel {
    return {
      id: row.id,
      user_id: row.user_id,
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      expires_at: row.expires_at,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      last_accessed_at: row.last_accessed_at,
      created_at: row.created_at,
    };
  }

  private mapOAuthAccountFromDb(row: any): OAuthAccountModel {
    return {
      id: row.id,
      user_id: row.user_id,
      provider: row.provider,
      provider_account_id: row.provider_account_id,
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      expires_at: row.expires_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}