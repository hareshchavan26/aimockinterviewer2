import fc from 'fast-check';
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

// Simple mock repository for property testing
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

// Arbitraries for property testing
const userIdArbitrary = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

const profileDataArbitrary = fc.record({
  bio: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  location: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  website: fc.option(fc.webUrl(), { nil: undefined }),
  linkedinUrl: fc.option(fc.webUrl(), { nil: undefined }),
  githubUrl: fc.option(fc.webUrl(), { nil: undefined }),
  phoneNumber: fc.option(fc.string({ maxLength: 20 }), { nil: undefined }),
  timezone: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
  language: fc.option(fc.string({ maxLength: 10 }), { nil: undefined }),
}, { requiredKeys: [] });

const preferencesDataArbitrary = fc.record({
  defaultIndustry: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  defaultRole: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  preferredInterviewLength: fc.option(fc.integer({ min: 15, max: 180 }), { nil: undefined }),
  difficultyLevel: fc.option(fc.constantFrom('beginner', 'intermediate', 'advanced'), { nil: undefined }),
  emailNotifications: fc.option(fc.boolean(), { nil: undefined }),
  pushNotifications: fc.option(fc.boolean(), { nil: undefined }),
  marketingEmails: fc.option(fc.boolean(), { nil: undefined }),
  progressUpdates: fc.option(fc.boolean(), { nil: undefined }),
  reminderNotifications: fc.option(fc.boolean(), { nil: undefined }),
  profileVisibility: fc.option(fc.constantFrom('public', 'private', 'connections'), { nil: undefined }),
  dataSharing: fc.option(fc.boolean(), { nil: undefined }),
  analyticsOptOut: fc.option(fc.boolean(), { nil: undefined }),
  theme: fc.option(fc.constantFrom('light', 'dark', 'system'), { nil: undefined }),
  language: fc.option(fc.string({ maxLength: 10 }), { nil: undefined }),
}, { requiredKeys: [] });

const settingsDataArbitrary = fc.record({
  twoFactorEnabled: fc.option(fc.boolean(), { nil: undefined }),
  sessionTimeout: fc.option(fc.integer({ min: 5, max: 1440 }), { nil: undefined }),
  autoRecording: fc.option(fc.boolean(), { nil: undefined }),
  cameraEnabled: fc.option(fc.boolean(), { nil: undefined }),
  microphoneEnabled: fc.option(fc.boolean(), { nil: undefined }),
  highContrast: fc.option(fc.boolean(), { nil: undefined }),
  fontSize: fc.option(fc.constantFrom('small', 'medium', 'large'), { nil: undefined }),
  screenReader: fc.option(fc.boolean(), { nil: undefined }),
}, { requiredKeys: [] });

describe('User Profile Data Management Property Tests', () => {
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

  describe('Property 17: User Data Management', () => {
    test('Profile data persistence: Any valid profile update should be retrievable', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          profileDataArbitrary,
          async (userId, profileData) => {
            // Update profile with valid data
            const updatedProfile = await userProfileService.updateProfile(userId, profileData);
            
            // Retrieve the profile
            const retrievedProfile = await userProfileService.getProfile(userId);
            
            // Verify data persistence
            expect(retrievedProfile.userId).toBe(userId);
            if (profileData.bio !== undefined) {
              expect(retrievedProfile.bio).toBe(profileData.bio);
            }
            if (profileData.location !== undefined) {
              expect(retrievedProfile.location).toBe(profileData.location);
            }
            if (profileData.website !== undefined) {
              expect(retrievedProfile.website).toBe(profileData.website);
            }
            if (profileData.linkedinUrl !== undefined) {
              expect(retrievedProfile.linkedinUrl).toBe(profileData.linkedinUrl);
            }
            if (profileData.githubUrl !== undefined) {
              expect(retrievedProfile.githubUrl).toBe(profileData.githubUrl);
            }
            if (profileData.phoneNumber !== undefined) {
              expect(retrievedProfile.phoneNumber).toBe(profileData.phoneNumber);
            }
            if (profileData.timezone !== undefined) {
              expect(retrievedProfile.timezone).toBe(profileData.timezone);
            }
            if (profileData.language !== undefined) {
              expect(retrievedProfile.language).toBe(profileData.language);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Preferences data persistence: Any valid preferences update should be retrievable', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          preferencesDataArbitrary,
          async (userId, preferencesData) => {
            // Update preferences with valid data
            const updatedPreferences = await userProfileService.updatePreferences(userId, preferencesData);
            
            // Retrieve the preferences
            const retrievedPreferences = await userProfileService.getPreferences(userId);
            
            // Verify data persistence
            expect(retrievedPreferences.userId).toBe(userId);
            if (preferencesData.defaultIndustry !== undefined) {
              expect(retrievedPreferences.defaultIndustry).toBe(preferencesData.defaultIndustry);
            }
            if (preferencesData.defaultRole !== undefined) {
              expect(retrievedPreferences.defaultRole).toBe(preferencesData.defaultRole);
            }
            if (preferencesData.preferredInterviewLength !== undefined) {
              expect(retrievedPreferences.preferredInterviewLength).toBe(preferencesData.preferredInterviewLength);
            }
            if (preferencesData.difficultyLevel !== undefined) {
              expect(retrievedPreferences.difficultyLevel).toBe(preferencesData.difficultyLevel);
            }
            if (preferencesData.emailNotifications !== undefined) {
              expect(retrievedPreferences.emailNotifications).toBe(preferencesData.emailNotifications);
            }
            if (preferencesData.profileVisibility !== undefined) {
              expect(retrievedPreferences.profileVisibility).toBe(preferencesData.profileVisibility);
            }
            if (preferencesData.theme !== undefined) {
              expect(retrievedPreferences.theme).toBe(preferencesData.theme);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Settings data persistence: Any valid settings update should be retrievable', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          settingsDataArbitrary,
          async (userId, settingsData) => {
            // Update settings with valid data
            const updatedSettings = await userProfileService.updateSettings(userId, settingsData);
            
            // Retrieve the settings
            const retrievedSettings = await userProfileService.getSettings(userId);
            
            // Verify data persistence
            expect(retrievedSettings.userId).toBe(userId);
            if (settingsData.twoFactorEnabled !== undefined) {
              expect(retrievedSettings.twoFactorEnabled).toBe(settingsData.twoFactorEnabled);
            }
            if (settingsData.sessionTimeout !== undefined) {
              expect(retrievedSettings.sessionTimeout).toBe(settingsData.sessionTimeout);
            }
            if (settingsData.autoRecording !== undefined) {
              expect(retrievedSettings.autoRecording).toBe(settingsData.autoRecording);
            }
            if (settingsData.cameraEnabled !== undefined) {
              expect(retrievedSettings.cameraEnabled).toBe(settingsData.cameraEnabled);
            }
            if (settingsData.fontSize !== undefined) {
              expect(retrievedSettings.fontSize).toBe(settingsData.fontSize);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Data consistency: Multiple updates should maintain data integrity', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          fc.array(profileDataArbitrary, { minLength: 1, maxLength: 5 }),
          async (userId, profileUpdates) => {
            let lastUpdate: any = {};
            
            // Apply multiple updates
            for (const update of profileUpdates) {
              await userProfileService.updateProfile(userId, update);
              lastUpdate = { ...lastUpdate, ...update };
            }
            
            // Retrieve final state
            const finalProfile = await userProfileService.getProfile(userId);
            
            // Verify final state matches last applied updates
            expect(finalProfile.userId).toBe(userId);
            for (const [key, value] of Object.entries(lastUpdate)) {
              if (value !== undefined) {
                expect((finalProfile as any)[key]).toBe(value);
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Complete user data consistency: All user data should be consistent', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          profileDataArbitrary,
          preferencesDataArbitrary,
          settingsDataArbitrary,
          async (userId, profileData, preferencesData, settingsData) => {
            // Update all user data
            await userProfileService.updateProfile(userId, profileData);
            await userProfileService.updatePreferences(userId, preferencesData);
            await userProfileService.updateSettings(userId, settingsData);
            
            // Get complete user data
            const completeData = await userProfileService.getCompleteUserData(userId);
            
            // Verify all data belongs to the same user
            expect(completeData.profile.userId).toBe(userId);
            expect(completeData.preferences.userId).toBe(userId);
            expect(completeData.settings.userId).toBe(userId);
            
            // Verify data integrity
            expect(completeData.profile).toBeDefined();
            expect(completeData.preferences).toBeDefined();
            expect(completeData.settings).toBeDefined();
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Reset operations maintain defaults: Reset should always return to default values', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          preferencesDataArbitrary,
          settingsDataArbitrary,
          async (userId, preferencesData, settingsData) => {
            // Update with arbitrary data
            await userProfileService.updatePreferences(userId, preferencesData);
            await userProfileService.updateSettings(userId, settingsData);
            
            // Reset to defaults
            const resetPreferences = await userProfileService.resetPreferences(userId);
            const resetSettings = await userProfileService.resetSettings(userId);
            
            // Verify default values
            expect(resetPreferences.emailNotifications).toBe(true);
            expect(resetPreferences.pushNotifications).toBe(true);
            expect(resetPreferences.marketingEmails).toBe(false);
            expect(resetPreferences.profileVisibility).toBe('private');
            expect(resetPreferences.dataSharing).toBe(false);
            
            expect(resetSettings.twoFactorEnabled).toBe(false);
            expect(resetSettings.autoRecording).toBe(false);
            expect(resetSettings.cameraEnabled).toBe(true);
            expect(resetSettings.microphoneEnabled).toBe(true);
            expect(resetSettings.fontSize).toBe('medium');
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Profile picture operations maintain consistency', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          fc.uint8Array({ minLength: 100, maxLength: 1000 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (userId, imageData, filename) => {
            const buffer = Buffer.from(imageData);
            const mimeType = 'image/jpeg';
            
            // Upload profile picture
            const uploadedPicture = await userProfileService.uploadProfilePicture(
              userId,
              buffer,
              filename,
              mimeType
            );
            
            // Retrieve profile picture
            const retrievedPicture = await userProfileService.getProfilePicture(userId);
            
            // Verify consistency
            expect(retrievedPicture).toBeDefined();
            expect(retrievedPicture!.userId).toBe(userId);
            expect(retrievedPicture!.originalName).toBe(filename);
            expect(retrievedPicture!.mimeType).toBe(mimeType);
            expect(retrievedPicture!.size).toBe(buffer.length);
            expect(retrievedPicture!.url).toBeDefined();
            expect(retrievedPicture!.id).toBe(uploadedPicture.id);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('Data validation consistency: Invalid data should always be rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          fc.record({
            bio: fc.option(fc.string({ minLength: 501, maxLength: 1000 })), // Too long
            preferredInterviewLength: fc.option(fc.integer({ min: 200, max: 500 })), // Out of range
            sessionTimeout: fc.option(fc.integer({ min: 2000, max: 5000 })), // Out of range
          }, { requiredKeys: [] }),
          async (userId, invalidData) => {
            // Attempt to update with invalid data should throw ValidationError
            if (invalidData.bio !== undefined) {
              await expect(userProfileService.updateProfile(userId, { bio: invalidData.bio }))
                .rejects.toThrow(ValidationError);
            }
            
            if (invalidData.preferredInterviewLength !== undefined) {
              await expect(userProfileService.updatePreferences(userId, { 
                preferredInterviewLength: invalidData.preferredInterviewLength 
              })).rejects.toThrow(ValidationError);
            }
            
            if (invalidData.sessionTimeout !== undefined) {
              await expect(userProfileService.updateSettings(userId, { 
                sessionTimeout: invalidData.sessionTimeout 
              })).rejects.toThrow(ValidationError);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});