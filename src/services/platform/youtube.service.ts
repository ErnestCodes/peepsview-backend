import { google } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { supabaseAdmin } from '../../lib/supabase';
import { SocialPlatformService } from '../../types/social';
interface VideoStats {
  videoId: string;
  views: number;
  likes: number;
  comments: number;
  timestamp?: Date;
}

interface YouTubeChannel {
  id?: string;
  snippet?: {
    title?: string;
    thumbnails?: {
      default?: {
        url?: string;
      };
    };
  };
}

interface YouTubeVideo {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
  };
}

interface YouTubeSearchResponse {
  id?: {
    videoId?: string;
  };
  snippet?: {
    title?: string;
    description?: string;
    thumbnails?: {
      default?: {
        url: string;
      };
    };
    publishedAt?: string;
  };
}

interface YouTubeCredentials {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export class YouTubeService implements SocialPlatformService {
  private youtube;
  private oauth2Client: OAuth2Client;
  private userId: string;
  private initialized: Promise<void> | null = null;

  constructor(userId: string) {
    this.userId = userId;
    this.oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID || '',
      process.env.YOUTUBE_CLIENT_SECRET || '',
      process.env.YOUTUBE_REDIRECT_URI || ''
    );
    this.youtube = google.youtube('v3');
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      this.initialized = this.initialize();
    }
    await this.initialized;
  }

  private async initialize(): Promise<void> {
    try {
      await this.loadSavedCredentials();
    } catch (error) {
      console.error('Failed to initialize YouTube service:', error);
      throw error;
    }
  }

  private async loadSavedCredentials() {
    const { data: account, error } = await supabaseAdmin
      .from('social_accounts')
      .select('*')
      .eq('user_id', this.userId)
      .eq('platform', 'youtube')
      .single();

    if (error || !account) {
      throw new Error('No YouTube account found');
    }

    this.oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expiry_date: new Date(account.expires_at).getTime(),
    });
  }

  private async ensureValidToken() {
    const credentials = this.oauth2Client.credentials;
    if (!credentials.access_token) {
      throw new Error('No access token available');
    }

    const expiryDate = credentials.expiry_date;
    if (!expiryDate || Date.now() >= expiryDate - 60000) {
      if (credentials.refresh_token) {
        const response = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(response.credentials);
        await this.saveCredentials(response.credentials);
      } else {
        throw new Error('No refresh token available');
      }
    }
  }

  private async saveCredentials(tokens: Credentials) {
    try {
      const response = await this.youtube.channels.list({
        auth: this.oauth2Client,
        part: ['snippet'],
        mine: true,
      });

      const channel = response.data.items?.[0] as YouTubeChannel;
      if (!channel?.id || !channel?.snippet?.title) {
        throw new Error('Could not fetch YouTube channel information');
      }

      if (!this.userId) {
        throw new Error('No user ID found');
      }

      const accountData = {
        user_id: this.userId,
        platform: 'youtube',
        platform_user_id: JSON.stringify({
          id: channel.id,
          display_name: channel.snippet.title,
        }),
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        avatar: channel.snippet.thumbnails?.default?.url || null,
        is_default: false,
        updated_at: new Date().toISOString(),
      };

      const { data: existingAccount } = await supabaseAdmin
        .from('social_accounts')
        .select('id')
        .eq('user_id', this.userId)
        .eq('platform', 'youtube')
        .single();

      if (existingAccount) {
        await supabaseAdmin
          .from('social_accounts')
          .update(accountData)
          .eq('id', existingAccount.id);
      } else {
        await supabaseAdmin.from('social_accounts').insert({
          ...accountData,
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error saving credentials:', error);
      throw error;
    }
  }

  async getAuthUrl(): Promise<string> {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.force-ssl',
    ];

    if (!this.userId) {
      throw new Error('No user ID found');
    }

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: this.userId,
      include_granted_scopes: true,
    });
  }

  async getAccessToken(code: string): Promise<YouTubeCredentials> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token || '',
      expires_in: tokens.expiry_date
        ? new Date(tokens.expiry_date).getTime()
        : 0,
    };
  }

  async connect(code: string): Promise<void> {
    const credentials = await this.getAccessToken(code);
    await this.saveCredentials(credentials);
  }

  async disconnect(): Promise<void> {
    // Revoke the token
    if (this.oauth2Client.credentials.access_token) {
      await this.oauth2Client.revokeToken(
        this.oauth2Client.credentials.access_token
      );
    }
  }

  async refreshToken(): Promise<void> {
    if (!this.oauth2Client.credentials.refresh_token) {
      throw new Error('No refresh token available');
    }

    const { credentials } = await this.oauth2Client.refreshAccessToken();
    this.oauth2Client.setCredentials(credentials);

    // Update the token in the database
    const { error } = await supabaseAdmin
      .from('social_accounts')
      .update({
        access_token: credentials.access_token,
        token_expires_at: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', this.userId)
      .eq('platform', 'youtube')
      .eq('is_active', true);

    if (error) {
      throw error;
    }
  }

  async getVideos(): Promise<YouTubeVideo[]> {
    await this.ensureInitialized();

    const response = await this.youtube.search.list({
      auth: this.oauth2Client,
      part: ['snippet'],
      forMine: true,
      maxResults: 50,
      type: ['video'],
    });

    return (response.data.items || []).map((item) => {
      const searchItem = item as YouTubeSearchResponse;
      return {
        id: searchItem.id?.videoId || '',
        title: searchItem.snippet?.title || '',
        description: searchItem.snippet?.description || '',
        thumbnail: searchItem.snippet?.thumbnails?.default?.url || '',
        publishedAt: searchItem.snippet?.publishedAt || '',
        url: `https://youtube.com/watch?v=${searchItem.id?.videoId}`,
      };
    });
  }

  async getVideoStats(videoId: string): Promise<VideoStats> {
    await this.ensureInitialized();

    const response = await this.youtube.videos.list({
      auth: this.oauth2Client,
      part: ['statistics'],
      id: [videoId],
    });

    const stats = response.data.items?.[0]?.statistics;
    return {
      videoId,
      views: Number(stats?.viewCount) || 0,
      likes: Number(stats?.likeCount) || 0,
      comments: Number(stats?.commentCount) || 0,
      timestamp: new Date(),
    };
  }
}
