import { db } from './connection';
import { 
  UserProfile, 
  UserPreferences, 
  UserSettings, 
  ProfilePicture,
  UserProfileRepository,
  NotFoundError,
  ConflictError 
} from '../types';

export class PostgresUserProfileRepository implements UserProfileRepository {
  // Profile operations
  async createProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
    const query = `
      INSERT INTO user_profiles (
        user_id, bio, location, website, linkedin_url, github_url, 
        phone_number, timezone, language, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      userId,
      profileData.bio,
      profileData.location,
      profileData.website,
      profileData.linkedinUrl,
      profileData.githubUrl,
      profileData.phoneNumber,
      profileData.timezone,
      profileData.language,
      new Date(),
      new Date(),
    ];

    try {
      const result = await db.query(query, values);
      return this.mapProfileFromDb(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictError('Profile already exists for this user');
      }
      throw error;
    }
  }

  async findProfileByUserId(userId: string): Promise<UserProfile | null> {
    const query = 'SELECT * FROM user_profiles WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapProfileFromDb(result.rows[0]);
  }

  async updateProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (profileData.bio !== undefined) {
      fields.push(`bio = $${paramCount++}`);
      values.push(profileData.bio);
    }
    if (profileData.location !== undefined) {
      fields.push(`location = $${paramCount++}`);
      values.push(profileData.location);
    }
    if (profileData.website !== undefined) {
      fields.push(`website = $${paramCount++}`);
      values.push(profileData.website);
    }
    if (profileData.linkedinUrl !== undefined) {
      fields.push(`linkedin_url = $${paramCount++}`);
      values.push(profileData.linkedinUrl);
    }
    if (profileData.githubUrl !== undefined) {
      fields.push(`github_url = $${paramCount++}`);
      values.push(profileData.githubUrl);
    }
    if (profileData.phoneNumber !== undefined) {
      fields.push(`phone_number = $${paramCount++}`);
      values.push(profileData.phoneNumber);
    }
    if (profileData.timezone !== undefined) {
      fields.push(`timezone = $${paramCount++}`);
      values.push(profileData.timezone);
    }
    if (profileData.language !== undefined) {
      fields.push(`language = $${paramCount++}`);
      values.push(profileData.language);
    }

    fields.push(`updated_at = $${paramCount++}`);
    values.push(new Date());
    values.push(userId);

    const query = `
      UPDATE user_profiles 
      SET ${fields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Profile not found');
    }
    
    return this.mapProfileFromDb(result.rows[0]);
  }

  async deleteProfile(userId: string): Promise<void> {
    const query = 'DELETE FROM user_profiles WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    
    if (result.rowCount === 0) {
      throw new NotFoundError('Profile not found');
    }
  }

  // Preferences operations
  async createPreferences(userId: string, preferencesData: Partial<UserPreferences>): Promise<UserPreferences> {
    const query = `
      INSERT INTO user_preferences (
        user_id, default_industry, default_role, preferred_interview_length, difficulty_level,
        email_notifications, push_notifications, marketing_emails, progress_updates, reminder_notifications,
        profile_visibility, data_sharing, analytics_opt_out, theme, language, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      userId,
      preferencesData.defaultIndustry,
      preferencesData.defaultRole,
      preferencesData.preferredInterviewLength,
      preferencesData.difficultyLevel,
      preferencesData.emailNotifications ?? true,
      preferencesData.pushNotifications ?? true,
      preferencesData.marketingEmails ?? false,
      preferencesData.progressUpdates ?? true,
      preferencesData.reminderNotifications ?? true,
      preferencesData.profileVisibility ?? 'private',
      preferencesData.dataSharing ?? false,
      preferencesData.analyticsOptOut ?? false,
      preferencesData.theme,
      preferencesData.language,
      new Date(),
      new Date(),
    ];

    try {
      const result = await db.query(query, values);
      return this.mapPreferencesFromDb(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictError('Preferences already exist for this user');
      }
      throw error;
    }
  }

  async findPreferencesByUserId(userId: string): Promise<UserPreferences | null> {
    const query = 'SELECT * FROM user_preferences WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapPreferencesFromDb(result.rows[0]);
  }

  async updatePreferences(userId: string, preferencesData: Partial<UserPreferences>): Promise<UserPreferences> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (preferencesData.defaultIndustry !== undefined) {
      fields.push(`default_industry = $${paramCount++}`);
      values.push(preferencesData.defaultIndustry);
    }
    if (preferencesData.defaultRole !== undefined) {
      fields.push(`default_role = $${paramCount++}`);
      values.push(preferencesData.defaultRole);
    }
    if (preferencesData.preferredInterviewLength !== undefined) {
      fields.push(`preferred_interview_length = $${paramCount++}`);
      values.push(preferencesData.preferredInterviewLength);
    }
    if (preferencesData.difficultyLevel !== undefined) {
      fields.push(`difficulty_level = $${paramCount++}`);
      values.push(preferencesData.difficultyLevel);
    }
    if (preferencesData.emailNotifications !== undefined) {
      fields.push(`email_notifications = $${paramCount++}`);
      values.push(preferencesData.emailNotifications);
    }
    if (preferencesData.pushNotifications !== undefined) {
      fields.push(`push_notifications = $${paramCount++}`);
      values.push(preferencesData.pushNotifications);
    }
    if (preferencesData.marketingEmails !== undefined) {
      fields.push(`marketing_emails = $${paramCount++}`);
      values.push(preferencesData.marketingEmails);
    }
    if (preferencesData.progressUpdates !== undefined) {
      fields.push(`progress_updates = $${paramCount++}`);
      values.push(preferencesData.progressUpdates);
    }
    if (preferencesData.reminderNotifications !== undefined) {
      fields.push(`reminder_notifications = $${paramCount++}`);
      values.push(preferencesData.reminderNotifications);
    }
    if (preferencesData.profileVisibility !== undefined) {
      fields.push(`profile_visibility = $${paramCount++}`);
      values.push(preferencesData.profileVisibility);
    }
    if (preferencesData.dataSharing !== undefined) {
      fields.push(`data_sharing = $${paramCount++}`);
      values.push(preferencesData.dataSharing);
    }
    if (preferencesData.analyticsOptOut !== undefined) {
      fields.push(`analytics_opt_out = $${paramCount++}`);
      values.push(preferencesData.analyticsOptOut);
    }
    if (preferencesData.theme !== undefined) {
      fields.push(`theme = $${paramCount++}`);
      values.push(preferencesData.theme);
    }
    if (preferencesData.language !== undefined) {
      fields.push(`language = $${paramCount++}`);
      values.push(preferencesData.language);
    }

    fields.push(`updated_at = $${paramCount++}`);
    values.push(new Date());
    values.push(userId);

    const query = `
      UPDATE user_preferences 
      SET ${fields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Preferences not found');
    }
    
    return this.mapPreferencesFromDb(result.rows[0]);
  }

  async deletePreferences(userId: string): Promise<void> {
    const query = 'DELETE FROM user_preferences WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    
    if (result.rowCount === 0) {
      throw new NotFoundError('Preferences not found');
    }
  }

  // Settings operations
  async createSettings(userId: string, settingsData: Partial<UserSettings>): Promise<UserSettings> {
    const query = `
      INSERT INTO user_settings (
        user_id, two_factor_enabled, session_timeout, auto_recording, camera_enabled, 
        microphone_enabled, high_contrast, font_size, screen_reader, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      userId,
      settingsData.twoFactorEnabled ?? false,
      settingsData.sessionTimeout,
      settingsData.autoRecording ?? false,
      settingsData.cameraEnabled ?? true,
      settingsData.microphoneEnabled ?? true,
      settingsData.highContrast ?? false,
      settingsData.fontSize ?? 'medium',
      settingsData.screenReader ?? false,
      new Date(),
      new Date(),
    ];

    try {
      const result = await db.query(query, values);
      return this.mapSettingsFromDb(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictError('Settings already exist for this user');
      }
      throw error;
    }
  }

  async findSettingsByUserId(userId: string): Promise<UserSettings | null> {
    const query = 'SELECT * FROM user_settings WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapSettingsFromDb(result.rows[0]);
  }

  async updateSettings(userId: string, settingsData: Partial<UserSettings>): Promise<UserSettings> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (settingsData.twoFactorEnabled !== undefined) {
      fields.push(`two_factor_enabled = $${paramCount++}`);
      values.push(settingsData.twoFactorEnabled);
    }
    if (settingsData.sessionTimeout !== undefined) {
      fields.push(`session_timeout = $${paramCount++}`);
      values.push(settingsData.sessionTimeout);
    }
    if (settingsData.autoRecording !== undefined) {
      fields.push(`auto_recording = $${paramCount++}`);
      values.push(settingsData.autoRecording);
    }
    if (settingsData.cameraEnabled !== undefined) {
      fields.push(`camera_enabled = $${paramCount++}`);
      values.push(settingsData.cameraEnabled);
    }
    if (settingsData.microphoneEnabled !== undefined) {
      fields.push(`microphone_enabled = $${paramCount++}`);
      values.push(settingsData.microphoneEnabled);
    }
    if (settingsData.highContrast !== undefined) {
      fields.push(`high_contrast = $${paramCount++}`);
      values.push(settingsData.highContrast);
    }
    if (settingsData.fontSize !== undefined) {
      fields.push(`font_size = $${paramCount++}`);
      values.push(settingsData.fontSize);
    }
    if (settingsData.screenReader !== undefined) {
      fields.push(`screen_reader = $${paramCount++}`);
      values.push(settingsData.screenReader);
    }

    fields.push(`updated_at = $${paramCount++}`);
    values.push(new Date());
    values.push(userId);

    const query = `
      UPDATE user_settings 
      SET ${fields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Settings not found');
    }
    
    return this.mapSettingsFromDb(result.rows[0]);
  }

  async deleteSettings(userId: string): Promise<void> {
    const query = 'DELETE FROM user_settings WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    
    if (result.rowCount === 0) {
      throw new NotFoundError('Settings not found');
    }
  }

  // Profile picture operations
  async createProfilePicture(userId: string, pictureData: Partial<ProfilePicture>): Promise<ProfilePicture> {
    const query = `
      INSERT INTO profile_pictures (
        user_id, filename, original_name, mime_type, size, url, thumbnail_url, uploaded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      userId,
      pictureData.filename,
      pictureData.originalName,
      pictureData.mimeType,
      pictureData.size,
      pictureData.url,
      pictureData.thumbnailUrl,
      new Date(),
    ];

    try {
      const result = await db.query(query, values);
      return this.mapProfilePictureFromDb(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictError('Profile picture already exists for this user');
      }
      throw error;
    }
  }

  async findProfilePictureByUserId(userId: string): Promise<ProfilePicture | null> {
    const query = 'SELECT * FROM profile_pictures WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapProfilePictureFromDb(result.rows[0]);
  }

  async updateProfilePicture(userId: string, pictureData: Partial<ProfilePicture>): Promise<ProfilePicture> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (pictureData.filename !== undefined) {
      fields.push(`filename = $${paramCount++}`);
      values.push(pictureData.filename);
    }
    if (pictureData.originalName !== undefined) {
      fields.push(`original_name = $${paramCount++}`);
      values.push(pictureData.originalName);
    }
    if (pictureData.mimeType !== undefined) {
      fields.push(`mime_type = $${paramCount++}`);
      values.push(pictureData.mimeType);
    }
    if (pictureData.size !== undefined) {
      fields.push(`size = $${paramCount++}`);
      values.push(pictureData.size);
    }
    if (pictureData.url !== undefined) {
      fields.push(`url = $${paramCount++}`);
      values.push(pictureData.url);
    }
    if (pictureData.thumbnailUrl !== undefined) {
      fields.push(`thumbnail_url = $${paramCount++}`);
      values.push(pictureData.thumbnailUrl);
    }

    fields.push(`uploaded_at = $${paramCount++}`);
    values.push(new Date());
    values.push(userId);

    const query = `
      UPDATE profile_pictures 
      SET ${fields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Profile picture not found');
    }
    
    return this.mapProfilePictureFromDb(result.rows[0]);
  }

  async deleteProfilePicture(userId: string): Promise<void> {
    const query = 'DELETE FROM profile_pictures WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    
    if (result.rowCount === 0) {
      throw new NotFoundError('Profile picture not found');
    }
  }

  // Mapping functions
  private mapProfileFromDb(row: any): UserProfile {
    return {
      id: row.id,
      userId: row.user_id,
      bio: row.bio,
      location: row.location,
      website: row.website,
      linkedinUrl: row.linkedin_url,
      githubUrl: row.github_url,
      phoneNumber: row.phone_number,
      timezone: row.timezone,
      language: row.language,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapPreferencesFromDb(row: any): UserPreferences {
    return {
      id: row.id,
      userId: row.user_id,
      defaultIndustry: row.default_industry,
      defaultRole: row.default_role,
      preferredInterviewLength: row.preferred_interview_length,
      difficultyLevel: row.difficulty_level,
      emailNotifications: row.email_notifications,
      pushNotifications: row.push_notifications,
      marketingEmails: row.marketing_emails,
      progressUpdates: row.progress_updates,
      reminderNotifications: row.reminder_notifications,
      profileVisibility: row.profile_visibility,
      dataSharing: row.data_sharing,
      analyticsOptOut: row.analytics_opt_out,
      theme: row.theme,
      language: row.language,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapSettingsFromDb(row: any): UserSettings {
    return {
      id: row.id,
      userId: row.user_id,
      twoFactorEnabled: row.two_factor_enabled,
      sessionTimeout: row.session_timeout,
      autoRecording: row.auto_recording,
      cameraEnabled: row.camera_enabled,
      microphoneEnabled: row.microphone_enabled,
      highContrast: row.high_contrast,
      fontSize: row.font_size,
      screenReader: row.screen_reader,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapProfilePictureFromDb(row: any): ProfilePicture {
    return {
      id: row.id,
      userId: row.user_id,
      filename: row.filename,
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: row.size,
      url: row.url,
      thumbnailUrl: row.thumbnail_url,
      uploadedAt: row.uploaded_at,
    };
  }
}