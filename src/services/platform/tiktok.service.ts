import axios from 'axios';
import { supabaseAdmin } from '../../lib/supabase';
import { SocialPlatformService } from '../../types/social';

interface TikTokCredentials {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  open_id: string;
}

interface TikTokUserInfo {
  username: string;
  avatar_url: string;
}

export class TikTokService implements SocialPlatformService {
  private clientKey: string;
  private clientSecret: string;
  private redirectUri: string;
  private userId: string;
  private accessToken?: string;
  private openId?: string;
  private credentials: TikTokCredentials | null = null;

  constructor(userId: string) {
    this.userId = userId;
    this.clientKey = process.env.TIKTOK_CLIENT_KEY!;
    this.clientSecret = process.env.TIKTOK_CLIENT_SECRET!;
    this.redirectUri = process.env.TIKTOK_CALLBACK_URL!;
    this.loadSavedCredentials();
  }

  private async loadSavedCredentials() {
    const { data: account } = await supabaseAdmin
      .from('social_accounts')
      .select('*')
      .eq('user_id', this.userId)
      .eq('platform', 'tiktok')
      .single();

    if (account) {
      this.accessToken = account.access_token;
      try {
        const metadata = JSON.parse(account.platform_user_id);
        this.openId = metadata.open_id;
      } catch (e) {
        // Fallback for old format
        this.openId = account.platform_user_id;
      }
    }
  }

  async getAuthUrl(): Promise<string> {
    const scopes = [
      'user.info.basic',
      'video.upload',
      'video.publish',
      'video.list',
    ];

    const params = new URLSearchParams({
      client_key: this.clientKey,
      response_type: 'code',
      scope: scopes.join(','),
      redirect_uri: this.redirectUri,
      state: this.userId,
      revalidate: 'true',
    });

    const url = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
    return url;
  }

  async connect(code: string): Promise<void> {
    const credentials = await this.getAccessToken(code);
    this.accessToken = credentials.access_token;
    this.openId = credentials.open_id;
    const userInfo = await this.getUserInfo(credentials.access_token);
    await this.saveCredentials(this.userId, credentials, userInfo);
  }

  async disconnect(): Promise<void> {
    await supabaseAdmin
      .from('social_accounts')
      .delete()
      .eq('user_id', this.userId)
      .eq('platform', 'tiktok');

    this.accessToken = undefined;
  }

  public async getAccessToken(code: string): Promise<TikTokCredentials> {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
    });

    const response = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (response.data.error) {
      throw new Error(`TikTok token error: ${response.data.error.message}`);
    }

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
      open_id: response.data.open_id,
    };
  }

  private async getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
    if (!this.openId) {
      throw new Error('OpenID is required for user info request');
    }

    const params = new URLSearchParams({
      fields: 'open_id,display_name,avatar_url',
    });

    const response = await axios.get(
      `https://open.tiktokapis.com/v2/user/info/?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.data.error && response.data.error.code !== 'ok') {
      throw new Error(`TikTok user info error: ${response.data.error.message}`);
    }

    const userData = response.data.data.user;
    return {
      username: userData.display_name,
      avatar_url: userData.avatar_url,
    };
  }

  public async saveCredentials(
    userId: string,
    credentials: TikTokCredentials,
    userInfo: TikTokUserInfo
  ) {
    const platformUserMetadata = {
      display_name: userInfo.username,
      open_id: credentials.open_id,
    };

    const accountData = {
      user_id: userId,
      platform: 'tiktok',
      platform_user_id: JSON.stringify(platformUserMetadata),
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expires_at: new Date(
        Date.now() + credentials.expires_in * 1000
      ).toISOString(),
      avatar: userInfo.avatar_url,
      is_default: false,
      updated_at: new Date().toISOString(),
    };

    const { data: existingAccount } = await supabaseAdmin
      .from('social_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('platform', 'tiktok')
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
  }

  async refreshToken(): Promise<void> {
    const { data: account } = await supabaseAdmin
      .from('social_accounts')
      .select('*')
      .eq('user_id', this.userId)
      .eq('platform', 'tiktok')
      .single();

    if (!account?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const params = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token,
    });

    const response = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (response.data.error) {
      throw new Error(
        `TikTok token refresh error: ${response.data.error.message}`
      );
    }

    const credentials = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
      open_id: response.data.open_id,
    };

    // Update the access token in memory
    this.accessToken = credentials.access_token;

    // Update the token in the database
    await supabaseAdmin
      .from('social_accounts')
      .update({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token,
        expires_at: new Date(
          Date.now() + credentials.expires_in * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', this.userId)
      .eq('platform', 'tiktok');
  }

  private async ensureValidToken(): Promise<void> {
    const { data: account } = await supabaseAdmin
      .from('social_accounts')
      .select('*')
      .eq('user_id', this.userId)
      .eq('platform', 'tiktok')
      .single();

    if (!account) {
      throw new Error('No TikTok account connected');
    }

    const expiresAt = new Date(account.expires_at);
    const now = new Date();

    // Refresh if token is expired or will expire in the next 5 minutes
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      await this.refreshToken();
    } else {
      this.accessToken = account.access_token;
    }
  }
}
