export type SupportedPlatform = 'youtube' | 'tiktok' | 'facebook' | 'linkedin';

export interface OAuthCallbackResult {
  userId: string;
  platformUserId: string;
  platformUsername: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface VideoUploadResult {
  id: string;
  title: string;
  description: string;
  url: string;
  platform: SupportedPlatform;
}

export interface VideoUploadSettings {
  visibility?: 'private' | 'unlisted' | 'public';
  tags?: string[];
  category?: string;
  allowDuet?: boolean;
  allowStitch?: boolean;
  originalSound?: boolean;
}

export interface SocialAccount {
  id: string;
  platformId: SupportedPlatform;
  username: string;
  type: 'personal' | 'business' | 'creator';
  connected: boolean;
  isDefault: boolean;
  accessToken: string;
  avatar?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface SocialPlatformService {
  getAuthUrl(): Promise<string>;
  connect(code: string): Promise<void>;
  disconnect(): Promise<void>;
  refreshToken?(): Promise<void>;
  //  getSpecifiVideoComments
}
