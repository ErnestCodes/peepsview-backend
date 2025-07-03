import axios from 'axios';
import { supabaseAdmin } from '../../lib/supabase';
import { SocialPlatformService } from '../../types/social';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
interface FacebookCredentials {
  access_token: string;
  user_id: string;
}

interface FacebookUserInfo {
  name: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

export class FacebookService implements SocialPlatformService {
  private appId: string;
  private appSecret: string;
  private redirectUri: string;
  private userId: string;
  private accessToken?: string;

  constructor(userId: string) {
    this.userId = userId;
    this.appId = process.env.FACEBOOK_APP_ID!;
    this.appSecret = process.env.FACEBOOK_APP_SECRET!;
    this.redirectUri =
      process.env.FACEBOOK_CALLBACK_URL ||
      'http://localhost:3000/social/facebook/callback';
    this.loadSavedCredentials();
  }

  private async loadSavedCredentials() {
    const { data: account } = await supabaseAdmin
      .from('social_accounts')
      .select('*')
      .eq('user_id', this.userId)
      .eq('platform', 'facebook')
      .single();

    if (account) {
      this.accessToken = account.access_token;
      // Validate token on load
      await this.validateToken();
    }
  }

  private async validateToken(): Promise<boolean> {
    if (!this.accessToken) {
      return false;
    }

    try {
      const response = await axios.get('https://graph.facebook.com/v22.0/me', {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        params: {
          fields: 'id,name,email',
        },
      });

      return response.status === 200;
    } catch (error) {
      console.error('Facebook token validation failed:', error);
      return false;
    }
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || !(await this.validateToken())) {
      throw new Error(
        'Invalid or expired Facebook access token. Please reconnect your Facebook account.'
      );
    }
  }

  async getAuthUrl(): Promise<string> {
    const scopes = [
      'public_profile',
      'email',
      // 'publish_to_id',
      'pages_manage_posts',
      'pages_read_engagement',
      // 'user_posts',
      // 'user_videos',
      'publish_video',
    ];

    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(','),
      response_type: 'code',
      state: this.userId,
    });

    return `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`;
  }

  async connect(code: string): Promise<void> {
    const credentials = await this.getAccessToken(code);
    const userInfo = await this.getUserInfo(credentials.access_token);
    await this.saveCredentials(credentials, userInfo);
    this.accessToken = credentials.access_token;
  }

  async disconnect(): Promise<void> {
    await supabaseAdmin
      .from('social_accounts')
      .delete()
      .eq('user_id', this.userId)
      .eq('platform', 'facebook');

    this.accessToken = undefined;
  }

  private async getAccessToken(code: string): Promise<FacebookCredentials> {
    const tokenResponse = await axios.get(
      'https://graph.facebook.com/v22.0/oauth/access_token',
      {
        params: {
          client_id: this.appId,
          client_secret: this.appSecret,
          redirect_uri: this.redirectUri,
          code: code,
        },
      }
    );

    const { access_token } = tokenResponse.data;

    // Get user ID
    const userResponse = await axios.get(
      'https://graph.facebook.com/v22.0/me',
      {
        params: {
          access_token,
        },
      }
    );

    return {
      access_token,
      user_id: userResponse.data.id,
    };
  }

  private async getUserInfo(accessToken: string): Promise<FacebookUserInfo> {
    const response = await axios.get('https://graph.facebook.com/v22.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        fields: 'name,picture',
      },
    });

    return response.data;
  }

  private async saveCredentials(
    credentials: FacebookCredentials,
    userInfo: FacebookUserInfo
  ) {
    const platformUserMetadata = {
      display_name: userInfo.name,
      id: credentials.user_id,
    };

    const accountData = {
      user_id: this.userId,
      platform: 'facebook',
      platform_user_id: JSON.stringify(platformUserMetadata),
      access_token: credentials.access_token,
      avatar: userInfo.picture?.data?.url,
      is_default: false,
      updated_at: new Date().toISOString(),
    };

    const { data: existingAccount } = await supabaseAdmin
      .from('social_accounts')
      .select('id')
      .eq('user_id', this.userId)
      .eq('platform', 'facebook')
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
}
