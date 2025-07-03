import axios from 'axios';
import { supabaseAdmin } from '../../lib/supabase';
import { SocialPlatformService } from '../../types/social';

interface LinkedInCredentials {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  id: string; // LinkedIn Member ID
}

interface LinkedInUserInfo {
  id: string;
  name: string;
  email: string;
  profilePicture: string;
}

export class LinkedInService implements SocialPlatformService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private userId: string;
  private accessToken?: string;
  private memberId?: string;
  private credentials: LinkedInCredentials | null = null;

  constructor(userId: string) {
    this.userId = userId;
    this.clientId = process.env.LINKEDIN_CLIENT_ID!;
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
    this.redirectUri = process.env.LINKEDIN_CALLBACK_URL!;
    this.loadSavedCredentials();
  }

  private async loadSavedCredentials() {
    const { data: account } = await supabaseAdmin
      .from('social_accounts')
      .select('*')
      .eq('user_id', this.userId)
      .eq('platform', 'linkedin')
      .single();

    if (account) {
      this.accessToken = account.access_token;
      try {
        const metadata = JSON.parse(account.platform_user_id);
        this.memberId = metadata.id;
      } catch (e) {
        // Fallback for old format
        this.memberId = account.platform_user_id;
      }
    }
  }

  async getAuthUrl(): Promise<string> {
    const scopes = ['profile', 'email', 'openid', 'w_member_social'];

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      state: this.userId,
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async connect(code: string): Promise<void> {
    const credentials = await this.getAccessToken(code);
    this.accessToken = credentials.access_token;
    const userInfo = await this.getUserInfo(credentials.access_token);
    this.memberId = userInfo.id;
    await this.saveCredentials(this.userId, credentials, userInfo);
  }

  async disconnect(): Promise<void> {
    await supabaseAdmin
      .from('social_accounts')
      .delete()
      .eq('user_id', this.userId)
      .eq('platform', 'linkedin');

    this.accessToken = undefined;
  }

  public async getAccessToken(code: string): Promise<LinkedInCredentials> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
    });

    const response = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (response.data.error) {
      throw new Error(
        `LinkedIn token error: ${response.data.error_description}`
      );
    }

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
      id: response.data.id_token,
    };
  }

  private async getUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
    try {
      const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = response.data;
      return {
        id: data.sub,
        name: data.name,
        email: data.email,
        profilePicture: data.picture,
      };
    } catch (error: any) {
      console.error('LinkedIn: Error fetching user info:', {
        message: error.message,
        response: error.response?.data,
      });
      throw error;
    }
  }

  private async saveCredentials(
    userId: string,
    credentials: LinkedInCredentials,
    userInfo: LinkedInUserInfo
  ) {
    const platformUserMetadata = {
      display_name: userInfo.name,
      id: userInfo.id,
    };

    const accountData = {
      user_id: userId,
      platform: 'linkedin',
      platform_user_id: JSON.stringify(platformUserMetadata),
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expires_at: new Date(
        Date.now() + credentials.expires_in * 1000
      ).toISOString(),
      avatar: userInfo.profilePicture,
      is_default: false,
      updated_at: new Date().toISOString(),
    };

    const { data: existingAccount } = await supabaseAdmin
      .from('social_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('platform', 'linkedin')
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
      .eq('platform', 'linkedin')
      .single();

    if (!account?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (response.data.error) {
      throw new Error(
        `LinkedIn token refresh error: ${response.data.error_description}`
      );
    }

    // Update the access token in memory
    this.accessToken = response.data.access_token;

    // Update the token in the database
    await supabaseAdmin
      .from('social_accounts')
      .update({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_at: new Date(
          Date.now() + response.data.expires_in * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', this.userId)
      .eq('platform', 'linkedin');
  }

  private async ensureValidToken(): Promise<void> {
    const { data: account } = await supabaseAdmin
      .from('social_accounts')
      .select('*')
      .eq('user_id', this.userId)
      .eq('platform', 'linkedin')
      .single();

    if (!account) {
      throw new Error('No LinkedIn account connected');
    }

    const metadata = JSON.parse(account.platform_user_id);
    const expiresAt = new Date(account.expires_at);
    const now = new Date();

    // Refresh if token is expired or will expire in the next 5 minutes
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      await this.refreshToken();
    } else {
      this.accessToken = account.access_token;
      this.memberId = metadata.id;
    }
  }
}
