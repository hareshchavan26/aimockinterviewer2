// User Profile Management Types

export interface UserProfile {
  id: string;
  userId: string;
  bio?: string;
  location?: string;
  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  phoneNumber?: string;
  timezone?: string;
  language?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  id: string;
  userId: string;
  // Interview preferences
  defaultIndustry?: string;
  defaultRole?: string;
  preferredInterviewLength?: number; // in minutes
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
  
  // Notification preferences
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  progressUpdates: boolean;
  reminderNotifications: boolean;
  
  // Privacy preferences
  profileVisibility: 'public' | 'private' | 'connections';
  dataSharing: boolean;
  analyticsOptOut: boolean;
  
  // UI preferences
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  id: string;
  userId: string;
  // Account settings
  twoFactorEnabled: boolean;
  sessionTimeout?: number; // in minutes
  
  // Interview settings
  autoRecording: boolean;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  
  // Accessibility settings
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  screenReader: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfilePicture {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: Date;
}

// Request/Response types
export interface UpdateUserProfileRequest {
  bio?: string;
  location?: string;
  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  phoneNumber?: string;
  timezone?: string;
  language?: string;
}

export interface UpdateUserPreferencesRequest {
  defaultIndustry?: string;
  defaultRole?: string;
  preferredInterviewLength?: number;
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  marketingEmails?: boolean;
  progressUpdates?: boolean;
  reminderNotifications?: boolean;
  profileVisibility?: 'public' | 'private' | 'connections';
  dataSharing?: boolean;
  analyticsOptOut?: boolean;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
}

export interface UpdateUserSettingsRequest {
  twoFactorEnabled?: boolean;
  sessionTimeout?: number;
  autoRecording?: boolean;
  cameraEnabled?: boolean;
  microphoneEnabled?: boolean;
  highContrast?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
  screenReader?: boolean;
}

export interface UploadProfilePictureRequest {
  file: Buffer;
  filename: string;
  mimeType: string;
}

// Service interfaces
export interface UserProfileRepository {
  // Profile operations
  createProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile>;
  findProfileByUserId(userId: string): Promise<UserProfile | null>;
  updateProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile>;
  deleteProfile(userId: string): Promise<void>;
  
  // Preferences operations
  createPreferences(userId: string, preferencesData: Partial<UserPreferences>): Promise<UserPreferences>;
  findPreferencesByUserId(userId: string): Promise<UserPreferences | null>;
  updatePreferences(userId: string, preferencesData: Partial<UserPreferences>): Promise<UserPreferences>;
  deletePreferences(userId: string): Promise<void>;
  
  // Settings operations
  createSettings(userId: string, settingsData: Partial<UserSettings>): Promise<UserSettings>;
  findSettingsByUserId(userId: string): Promise<UserSettings | null>;
  updateSettings(userId: string, settingsData: Partial<UserSettings>): Promise<UserSettings>;
  deleteSettings(userId: string): Promise<void>;
  
  // Profile picture operations
  createProfilePicture(userId: string, pictureData: Partial<ProfilePicture>): Promise<ProfilePicture>;
  findProfilePictureByUserId(userId: string): Promise<ProfilePicture | null>;
  updateProfilePicture(userId: string, pictureData: Partial<ProfilePicture>): Promise<ProfilePicture>;
  deleteProfilePicture(userId: string): Promise<void>;
}

export interface FileStorageService {
  uploadFile(file: Buffer, filename: string, mimeType: string): Promise<{ url: string; filename: string }>;
  deleteFile(filename: string): Promise<void>;
  generateThumbnail(file: Buffer, mimeType: string): Promise<Buffer>;
}

export interface UserProfileService {
  // Profile management
  getProfile(userId: string): Promise<UserProfile>;
  updateProfile(userId: string, profileData: UpdateUserProfileRequest): Promise<UserProfile>;
  deleteProfile(userId: string): Promise<void>;
  
  // Preferences management
  getPreferences(userId: string): Promise<UserPreferences>;
  updatePreferences(userId: string, preferencesData: UpdateUserPreferencesRequest): Promise<UserPreferences>;
  resetPreferences(userId: string): Promise<UserPreferences>;
  
  // Settings management
  getSettings(userId: string): Promise<UserSettings>;
  updateSettings(userId: string, settingsData: UpdateUserSettingsRequest): Promise<UserSettings>;
  resetSettings(userId: string): Promise<UserSettings>;
  
  // Profile picture management
  uploadProfilePicture(userId: string, file: Buffer, filename: string, mimeType: string): Promise<ProfilePicture>;
  getProfilePicture(userId: string): Promise<ProfilePicture | null>;
  deleteProfilePicture(userId: string): Promise<void>;
  
  // Complete user data
  getCompleteUserData(userId: string): Promise<{
    profile: UserProfile;
    preferences: UserPreferences;
    settings: UserSettings;
    profilePicture?: ProfilePicture;
  }>;
}