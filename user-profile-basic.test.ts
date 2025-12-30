import { DefaultUserProfileService } from '../services/user-profile';
import { MockFileStorageService } from '../services/file-storage';
import {
  UserProfile,
  UserPreferences,
  UserSettings,
  ProfilePicture,
  UpdateUserProfileRequest,
  UpdateUserPreferencesRequest,
  UpdateUserSettingsRequest,
  UserProfileRepository,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../types';

// Simple mock repository for testing
class MockUserProfileRepository implements UserProfileRepository {
  private profiles: Map<string, UserProfile> = new Map();
  private preferences: Map<string, UserPreferences> = new Map();
  private settings: Map<string, UserSettings> = new Map();
  private profilePictures: Map<string, ProfilePicture> = new Map();

  async createProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
    const profile: UserProfile = {
      id: crypto.randomUUID(),
      userId,
      bio: profileData.bio,
      location: profileData.location,
      website: profileData.website,
      linkedinUrl: profileData.linkedinUrl,
      githubUrl: profileData.githubUrl,
      phoneNumber: profileData.phoneNumber,
      timezone: profileData.timezone,
      language: profileData.language,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.profiles.set(userId, profile);
    return profile;
  }

  async findProfileByUserId(userId: string): Promise<UserProfile | null> {
    return this.profiles.get(userId) || null;
  }

  async updateProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
    const profile = this.profiles.get(userId);
    if (!profile) throw new NotFoundError('Profile not found');
    const updatedProfile = { ...profile, ...profileData, updatedAt: new Date() };
    this.profiles.set(userId, updatedProfile);
    return updatedProfile;
  }

  async deleteProfile(userId: string): Promise<void> {
    if (!this.profiles.has(userId)) throw new NotFoundError('Profile not found');
    this.profiles.delete(userId);
  }

  async createPreferences(userId: string, preferencesData: Partial<UserPreferences>): Promise<UserPreferences> {
    const preferences: UserPreferences = {
      id: crypto.randomUUID(),
      userId,
      defaultIndustry: preferencesData.defaultIndustry,
      defaultRole: preferencesData.defaultRole,
      preferredInterviewLength: preferencesData.preferredInterviewLength,
      difficultyLevel: preferencesData.difficultyLevel,
      emailNotifications: preferencesData.emailNotifications ?? true,
      pushNotifications: preferencesData.pushNotifications ?? true,
      marketingEmails: preferencesData.marketingEmails ?? false,
      progressUpdates: preferencesData.progressUpdates ?? true,
      reminderNotifications: preferencesData.reminderNotifications ?? true,
      profileVisibility: preferencesData.profileVisibility ?? 'private',
      dataSharing: preferencesData.dataSharing ?? false,
      analyticsOptOut: preferencesData.analyticsOptOut ?? false,
      theme: preferencesData.theme,
      language: preferencesData.language,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.preferences.set(userId, preferences);
    return preferences;
  }

  async findPreferencesByUserId(userId: string): Promise<UserPreferences | null> {
    return this.preferences.get(userId) || null;
  }

  async updatePreferences(userId: string, preferencesData: Partial<UserPreferences>): Promise<UserPreferences> {
    const preferences = this.preferences.get(userId);
    if (!preferences) throw new NotFoundError('Preferences not found');
    const updatedPreferences = { ...preferences, ...preferencesData, updatedAt: new Date() };
    this.preferences.set(userId, updatedPreferences);
    return updatedPreferences;
  }

  async deletePreferences(userId: string): Promise<void> {
    if (!this.preferences.has(userId)) throw new NotFoundError('Preferences not found');
    this.preferences.delete(userId);
  }

  async createSettings(userId: string, settingsData: Partial<UserSettings>): Promise<UserSettings> {
    const settings: UserSettings = {
      id: crypto.randomUUID(),
      userId,
      twoFactorEnabled: settingsData.twoFactorEnabled ?? false,
      sessionTimeout: settingsData.sessionTimeout,
      autoRecording: settingsData.autoRecording ?? false,
      cameraEnabled: settingsData.cameraEnabled ?? true,
      microphoneEnabled: settingsData.microphoneEnabled ?? true,
      highContrast: settingsData.highContrast ?? false,
      fontSize: settingsData.fontSize ?? 'medium',
      screenReader: settingsData.screenReader ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.settings.set(userId, settings);
    return settings;
  }

  async findSettingsByUserId(userId: string): Promise<UserSettings | null> {
    return this.settings.get(userId) || null;
  }

  async updateSettings(userId: string, settingsData: Partial<UserSettings>): Promise<UserSettings> {
    const settings = this.settings.get(userId);
    if (!settings) throw new NotFoundError('Settings not found');
    const updatedSettings = { ...settings, ...settingsData, updatedAt: new Date() };
    this.settings.set(userId, updatedSettings);
    return updatedSettings;
  }

  async deleteSettings(userId: string): Promise<void> {
    if (!this.settings.has(userId)) throw new NotFoundError('Settings not found');
    this.settings.delete(userId);
  }

  async createProfilePicture(userId: string, pictureData: Partial<ProfilePicture>): Promise<ProfilePicture> {
    const profilePicture: ProfilePicture = {
      id: crypto.randomUUID(),
      userId,
      filename: pictureData.filename!,
      originalName: pictureData.originalName!,
      mimeType: pictureData.mimeType!,
      size: pictureData.size!,
      url: pictureData.url!,
      thumbnailUrl: pictureData.thumbnailUrl,
      uploadedAt: new Date(),
    };
    this.profilePictures.set(userId, profilePicture);
    return profilePicture;
  }

  async findProfilePictureByUserId(userId: string): Promise<ProfilePicture | null> {
    return this.profilePictures.get(userId) || null;
  }

  async updateProfilePicture(userId: string, pictureData: Partial<ProfilePicture>): Promise<ProfilePicture> {
    const profilePicture = this.profilePictures.get(userId);
    if (!profilePicture) throw new NotFoundError('Profile picture not found');
    const updatedProfilePicture = { ...profilePicture, ...pictureData, uploadedAt: new Date() };
    this.profilePictures.set(userId, updatedProfilePicture);
    return updatedProfilePicture;
  }

  async deleteProfilePicture(userId: string): Promise<void> {
    if (!this.profilePictures.has(userId)) throw new NotFoundError('Profile picture not found');
    this.profilePictures.delete(userId);
  }

  reset() {
    this.profiles.clear();
    this.preferences.clear();
    this.settings.clear();
    this.profilePictures.clear();
  }
}

describe('UserProfileService', () => {
  let userProfileService: DefaultUserProfileService;
  let mockRepository: MockUserProfileRepository;
  let mockFileStorage: MockFileStorageService;

  beforeEach(() => {
    mockRepository = new MockUserProfileRepository();
    mockFileStorage = new MockFileStorageService();
    userProfileService = new DefaultUserProfileService(mockRepository, mockFileStorage);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  describe('Profile Management', () => {
    const userId = 'test-user-123';

    test('should create default profile when none exists', async () => {
      const profile = await userProfileService.getProfile(userId);
      
      expect(profile).toBeDefined();
      expect(profile.userId).toBe(userId);
      expect(profile.id).toBeDefined();
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.updatedAt).toBeInstanceOf(Date);
    });

    test('should return existing profile', async () => {
      // Create a profile first
      const initialProfile = await userProfileService.getProfile(userId);
      
      // Get it again
      const retrievedProfile = await userProfileService.getProfile(userId);
      
      expect(retrievedProfile.id).toBe(initialProfile.id);
      expect(retrievedProfile.userId).toBe(userId);
    });

    test('should update profile with valid data', async () => {
      const updateData: UpdateUserProfileRequest = {
        bio: 'Software engineer with 5 years of experience',
        location: 'San Francisco, CA',
        website: 'https://example.com',
        linkedinUrl: 'https://linkedin.com/in/testuser',
        githubUrl: 'https://github.com/testuser',
        phoneNumber: '+1-555-0123',
        timezone: 'America/Los_Angeles',
        language: 'en',
      };

      const updatedProfile = await userProfileService.updateProfile(userId, updateData);

      expect(updatedProfile.bio).toBe(updateData.bio);
      expect(updatedProfile.location).toBe(updateData.location);
      expect(updatedProfile.website).toBe(updateData.website);
      expect(updatedProfile.linkedinUrl).toBe(updateData.linkedinUrl);
      expect(updatedProfile.githubUrl).toBe(updateData.githubUrl);
      expect(updatedProfile.phoneNumber).toBe(updateData.phoneNumber);
      expect(updatedProfile.timezone).toBe(updateData.timezone);
      expect(updatedProfile.language).toBe(updateData.language);
    });

    test('should reject invalid website URL', async () => {
      const updateData: UpdateUserProfileRequest = {
        website: 'not-a-valid-url',
      };

      await expect(userProfileService.updateProfile(userId, updateData))
        .rejects.toThrow(ValidationError);
    });

    test('should reject invalid LinkedIn URL', async () => {
      const updateData: UpdateUserProfileRequest = {
        linkedinUrl: 'invalid-linkedin-url',
      };

      await expect(userProfileService.updateProfile(userId, updateData))
        .rejects.toThrow(ValidationError);
    });

    test('should reject invalid GitHub URL', async () => {
      const updateData: UpdateUserProfileRequest = {
        githubUrl: 'not-a-url',
      };

      await expect(userProfileService.updateProfile(userId, updateData))
        .rejects.toThrow(ValidationError);
    });

    test('should delete profile successfully', async () => {
      // Create a profile first
      await userProfileService.getProfile(userId);
      
      // Delete it
      await userProfileService.deleteProfile(userId);
      
      // Verify it's deleted by checking the repository directly
      const profile = await mockRepository.findProfileByUserId(userId);
      expect(profile).toBeNull();
    });

    test('should handle deleting non-existent profile gracefully', async () => {
      // Should not throw error when deleting non-existent profile
      await expect(userProfileService.deleteProfile('non-existent-user'))
        .resolves.not.toThrow();
    });
  });

  describe('Preferences Management', () => {
    const userId = 'test-user-123';

    test('should create default preferences when none exist', async () => {
      const preferences = await userProfileService.getPreferences(userId);
      
      expect(preferences).toBeDefined();
      expect(preferences.userId).toBe(userId);
      expect(preferences.emailNotifications).toBe(true);
      expect(preferences.pushNotifications).toBe(true);
      expect(preferences.marketingEmails).toBe(false);
      expect(preferences.progressUpdates).toBe(true);
      expect(preferences.reminderNotifications).toBe(true);
      expect(preferences.profileVisibility).toBe('private');
      expect(preferences.dataSharing).toBe(false);
      expect(preferences.analyticsOptOut).toBe(false);
    });

    test('should update preferences with valid data', async () => {
      const updateData: UpdateUserPreferencesRequest = {
        defaultIndustry: 'Technology',
        defaultRole: 'Software Engineer',
        preferredInterviewLength: 60,
        difficultyLevel: 'intermediate',
        emailNotifications: false,
        pushNotifications: false,
        marketingEmails: true,
        profileVisibility: 'public',
        theme: 'dark',
        language: 'es',
      };

      const updatedPreferences = await userProfileService.updatePreferences(userId, updateData);

      expect(updatedPreferences.defaultIndustry).toBe(updateData.defaultIndustry);
      expect(updatedPreferences.defaultRole).toBe(updateData.defaultRole);
      expect(updatedPreferences.preferredInterviewLength).toBe(updateData.preferredInterviewLength);
      expect(updatedPreferences.difficultyLevel).toBe(updateData.difficultyLevel);
      expect(updatedPreferences.emailNotifications).toBe(updateData.emailNotifications);
      expect(updatedPreferences.pushNotifications).toBe(updateData.pushNotifications);
      expect(updatedPreferences.marketingEmails).toBe(updateData.marketingEmails);
      expect(updatedPreferences.profileVisibility).toBe(updateData.profileVisibility);
      expect(updatedPreferences.theme).toBe(updateData.theme);
      expect(updatedPreferences.language).toBe(updateData.language);
    });

    test('should reset preferences to defaults', async () => {
      // First, update preferences to non-default values
      await userProfileService.updatePreferences(userId, {
        emailNotifications: false,
        marketingEmails: true,
        profileVisibility: 'public',
        dataSharing: true,
      });

      // Reset to defaults
      const resetPreferences = await userProfileService.resetPreferences(userId);

      expect(resetPreferences.emailNotifications).toBe(true);
      expect(resetPreferences.marketingEmails).toBe(false);
      expect(resetPreferences.profileVisibility).toBe('private');
      expect(resetPreferences.dataSharing).toBe(false);
    });

    test('should validate difficulty level enum', async () => {
      const updateData = {
        difficultyLevel: 'invalid-level' as any,
      };

      await expect(userProfileService.updatePreferences(userId, updateData))
        .rejects.toThrow(ValidationError);
    });

    test('should validate profile visibility enum', async () => {
      const updateData = {
        profileVisibility: 'invalid-visibility' as any,
      };

      await expect(userProfileService.updatePreferences(userId, updateData))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('Settings Management', () => {
    const userId = 'test-user-123';

    test('should create default settings when none exist', async () => {
      const settings = await userProfileService.getSettings(userId);
      
      expect(settings).toBeDefined();
      expect(settings.userId).toBe(userId);
      expect(settings.twoFactorEnabled).toBe(false);
      expect(settings.autoRecording).toBe(false);
      expect(settings.cameraEnabled).toBe(true);
      expect(settings.microphoneEnabled).toBe(true);
      expect(settings.highContrast).toBe(false);
      expect(settings.fontSize).toBe('medium');
      expect(settings.screenReader).toBe(false);
    });

    test('should update settings with valid data', async () => {
      const updateData: UpdateUserSettingsRequest = {
        twoFactorEnabled: true,
        sessionTimeout: 30,
        autoRecording: true,
        cameraEnabled: false,
        microphoneEnabled: false,
        highContrast: true,
        fontSize: 'large',
        screenReader: true,
      };

      const updatedSettings = await userProfileService.updateSettings(userId, updateData);

      expect(updatedSettings.twoFactorEnabled).toBe(updateData.twoFactorEnabled);
      expect(updatedSettings.sessionTimeout).toBe(updateData.sessionTimeout);
      expect(updatedSettings.autoRecording).toBe(updateData.autoRecording);
      expect(updatedSettings.cameraEnabled).toBe(updateData.cameraEnabled);
      expect(updatedSettings.microphoneEnabled).toBe(updateData.microphoneEnabled);
      expect(updatedSettings.highContrast).toBe(updateData.highContrast);
      expect(updatedSettings.fontSize).toBe(updateData.fontSize);
      expect(updatedSettings.screenReader).toBe(updateData.screenReader);
    });

    test('should reset settings to defaults', async () => {
      // First, update settings to non-default values
      await userProfileService.updateSettings(userId, {
        twoFactorEnabled: true,
        autoRecording: true,
        cameraEnabled: false,
        fontSize: 'large',
      });

      // Reset to defaults
      const resetSettings = await userProfileService.resetSettings(userId);

      expect(resetSettings.twoFactorEnabled).toBe(false);
      expect(resetSettings.autoRecording).toBe(false);
      expect(resetSettings.cameraEnabled).toBe(true);
      expect(resetSettings.fontSize).toBe('medium');
    });

    test('should validate fontSize enum', async () => {
      const updateData = {
        fontSize: 'invalid-size' as any,
      };

      await expect(userProfileService.updateSettings(userId, updateData))
        .rejects.toThrow(ValidationError);
    });

    test('should validate session timeout range', async () => {
      const updateData = {
        sessionTimeout: 2000, // Above max of 1440
      };

      await expect(userProfileService.updateSettings(userId, updateData))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('Profile Picture Management', () => {
    const userId = 'test-user-123';
    const mockImageBuffer = Buffer.from('fake-image-data');
    const filename = 'profile.jpg';
    const mimeType = 'image/jpeg';

    test('should upload profile picture successfully', async () => {
      const profilePicture = await userProfileService.uploadProfilePicture(
        userId,
        mockImageBuffer,
        filename,
        mimeType
      );

      expect(profilePicture).toBeDefined();
      expect(profilePicture.userId).toBe(userId);
      expect(profilePicture.originalName).toBe(filename);
      expect(profilePicture.mimeType).toBe(mimeType);
      expect(profilePicture.size).toBe(mockImageBuffer.length);
      expect(profilePicture.url).toBeDefined();
      expect(profilePicture.thumbnailUrl).toBeDefined();
    });

    test('should reject non-image files', async () => {
      const textBuffer = Buffer.from('not-an-image');
      
      await expect(userProfileService.uploadProfilePicture(
        userId,
        textBuffer,
        'document.txt',
        'text/plain'
      )).rejects.toThrow(ValidationError);
    });

    test('should reject files that are too large', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB, over the 5MB limit
      
      await expect(userProfileService.uploadProfilePicture(
        userId,
        largeBuffer,
        'large-image.jpg',
        'image/jpeg'
      )).rejects.toThrow(ValidationError);
    });

    test('should replace existing profile picture', async () => {
      // Upload first picture
      const firstPicture = await userProfileService.uploadProfilePicture(
        userId,
        mockImageBuffer,
        'first.jpg',
        'image/jpeg'
      );

      // Upload second picture (should replace first)
      const secondPicture = await userProfileService.uploadProfilePicture(
        userId,
        mockImageBuffer,
        'second.jpg',
        'image/jpeg'
      );

      expect(secondPicture.id).toBe(firstPicture.id); // Same record, updated
      expect(secondPicture.originalName).toBe('second.jpg');
    });

    test('should get profile picture', async () => {
      // Upload a picture first
      await userProfileService.uploadProfilePicture(
        userId,
        mockImageBuffer,
        filename,
        mimeType
      );

      const retrievedPicture = await userProfileService.getProfilePicture(userId);
      
      expect(retrievedPicture).toBeDefined();
      expect(retrievedPicture!.userId).toBe(userId);
      expect(retrievedPicture!.originalName).toBe(filename);
    });

    test('should return null for non-existent profile picture', async () => {
      const picture = await userProfileService.getProfilePicture('non-existent-user');
      expect(picture).toBeNull();
    });

    test('should delete profile picture successfully', async () => {
      // Upload a picture first
      await userProfileService.uploadProfilePicture(
        userId,
        mockImageBuffer,
        filename,
        mimeType
      );

      // Delete it
      await userProfileService.deleteProfilePicture(userId);

      // Verify it's deleted
      const picture = await userProfileService.getProfilePicture(userId);
      expect(picture).toBeNull();
    });

    test('should handle deleting non-existent profile picture gracefully', async () => {
      // Should not throw error when deleting non-existent picture
      await expect(userProfileService.deleteProfilePicture('non-existent-user'))
        .resolves.not.toThrow();
    });
  });

  describe('Complete User Data', () => {
    const userId = 'test-user-123';

    test('should get complete user data', async () => {
      // Create some data first
      await userProfileService.updateProfile(userId, { bio: 'Test bio' });
      await userProfileService.updatePreferences(userId, { theme: 'dark' });
      await userProfileService.updateSettings(userId, { fontSize: 'large' });
      await userProfileService.uploadProfilePicture(
        userId,
        Buffer.from('fake-image'),
        'profile.jpg',
        'image/jpeg'
      );

      const completeData = await userProfileService.getCompleteUserData(userId);

      expect(completeData.profile).toBeDefined();
      expect(completeData.profile.bio).toBe('Test bio');
      expect(completeData.preferences).toBeDefined();
      expect(completeData.preferences.theme).toBe('dark');
      expect(completeData.settings).toBeDefined();
      expect(completeData.settings.fontSize).toBe('large');
      expect(completeData.profilePicture).toBeDefined();
      expect(completeData.profilePicture!.originalName).toBe('profile.jpg');
    });

    test('should get complete user data without profile picture', async () => {
      const completeData = await userProfileService.getCompleteUserData(userId);

      expect(completeData.profile).toBeDefined();
      expect(completeData.preferences).toBeDefined();
      expect(completeData.settings).toBeDefined();
      expect(completeData.profilePicture).toBeUndefined();
    });
  });
});