import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { YouTubeService } from '../services/platform/youtube.service';
import { TikTokService } from '../services/platform/tiktok.service';
import { FacebookService } from '../services/platform/facebook.service';
import { supabaseAdmin } from '../lib/supabase';
import { ApiError } from '../middleware/error';
import { SocialNotifier } from '../services/social.service';
import { LinkedInService } from '../services/platform/linkedin.service';

type PlatformServices = {
  youtube: YouTubeService;
  facebook: FacebookService;
  tiktok: TikTokService;
  linkedin: LinkedInService;
};

export class SocialController {
  private services: Partial<PlatformServices> = {};
  private socialService: SocialNotifier;
  private userService: UserService;

  constructor() {
    this.socialService = new SocialNotifier();
    this.userService = new UserService();
  }

  private getService(platform: keyof PlatformServices, userId: string) {
    // Only create service if it doesn't exist for this platform
    if (!this.services[platform]) {
      switch (platform) {
        case 'youtube':
          this.services.youtube = new YouTubeService(userId);
          break;
        case 'facebook':
          this.services.facebook = new FacebookService(userId);
          break;
        case 'tiktok':
          this.services.tiktok = new TikTokService(userId);
          break;
        case 'linkedin':
          this.services.linkedin = new LinkedInService(userId);
          break;
        default:
          throw new ApiError(`Unsupported platform: ${platform}`, 400);
      }
    }

    return this.services[platform]!;
  }

  private async getUserFromToken(req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new ApiError('Unauthorized', 401);

    const user = await this.userService.getSession(token);
    if (!user) throw new ApiError('Invalid session', 401);

    return user;
  }

  async getOAuthUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await this.getUserFromToken(req);
      const { platform } = req.params;
      const service = this.getService(
        platform as keyof PlatformServices,
        user.id
      );
      const url = await service.getAuthUrl();
      res.json({ url });
    } catch (error) {
      next(error);
    }
  }

  async connect(req: Request, res: Response) {
    try {
      const { code, state } = req.query;
      const { platform } = req.params;

      if (!code || !state) {
        throw new ApiError('Missing required parameters', 400);
      }

      // Create service instance for the platform
      const service = this.getService(
        platform as keyof PlatformServices,
        state as string
      );
      await service.connect(code as string);

      let userId = state as string;
      if (platform === 'youtube') {
        //we attempt use token to get user for youtube but also test for tiktok.
        const user = await this.userService.getSession(state as string);
        if (!user) {
          throw new ApiError('User not found from state token', 401);
        }
        userId = user.id;
      }

      // Get the newly connected account details
      const { data: account, error } = await supabaseAdmin
        .from('social_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', platform)
        .single();

      if (error) {
        throw new ApiError('Failed to retrieve account details', 500);
      }

      if (!account) {
        throw new ApiError('Account not found after connection', 404);
      }

      // Parse the platform_user_id to get metadata
      let username, avatar;
      try {
        const metadata = JSON.parse(account.platform_user_id);
        username = metadata.display_name;
        avatar = account.avatar;
      } catch (e) {
        username = account.platform_user_id;
        avatar = account.avatar;
      }

      // Format the account data
      const accountData = {
        id: account.id,
        platformId: platform,
        username: username,
        type: 'personal',
        avatar: avatar,
        isDefault: account.is_default,
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        expiresAt: account.expires_at,
      };

      // Return HTML that closes the popup and sends message to parent
      res.send(`
                <html><body><script>
                    if (window.opener) {
                        window.opener.postMessage({ 
                            type: 'oauth_callback',
                            platform: '${platform}',
                            success: true,
                            data: ${JSON.stringify(accountData)}
                        }, '*');
                        window.close();
                    }
                </script></body></html>
            `);
    } catch (error) {
      console.error('OAuth connection error:', error);
      res.send(`
                <html><body><script>
                    if (window.opener) {
                        window.opener.postMessage({ 
                            type: 'oauth_callback',
                            platform: '${req.params.platform}',
                            success: false,
                            error: ${JSON.stringify(
                              error instanceof Error
                                ? error.message
                                : 'Connection failed'
                            )}
                        }, '*');
                        window.close();
                    }
                </script></body></html>
            `);
    }
  }

  async disconnect(req: Request, res: Response, next: NextFunction) {
    try {
      const { platform } = req.params;

      // Update the connection status in the database
      const { error } = await supabaseAdmin
        .from('social_accounts')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', req.user.id)
        .eq('platform', platform)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      // Remove the service instance
      if (this.services[platform as keyof PlatformServices]) {
        delete this.services[platform as keyof PlatformServices];
      }

      res.json({ message: `Successfully disconnected from ${platform}` });
    } catch (error) {
      next(error);
    }
  }

  async getAccounts(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) throw new ApiError('Unauthorized', 401);

      const accounts = await this.socialService.getAccounts(token);
      res.json({ accounts });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch accounts', 500);
    }
  }

  async updateAccounts(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { accounts } = req.body;
      await this.socialService.updateAccounts(user.id, accounts);
      res.json({ message: 'Accounts updated successfully' });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to update accounts', 500);
    }
  }

  async disconnectAccount(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { accountId } = req.params;
      if (!accountId) throw new ApiError('Account ID is required', 400);

      await this.socialService.disconnectAccount(user.id, accountId);
      res.json({ message: 'Account disconnected successfully' });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to disconnect account', 500);
    }
  }

  async setDefaultAccount(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { accountId } = req.params;
      if (!accountId) throw new ApiError('Account ID is required', 400);

      await this.socialService.setDefaultAccount(user.id, accountId);
      res.json({ message: 'Default account set successfully' });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to set default account', 500);
    }
  }

  //   async refreshToken(req: Request, res: Response) {
  //     try {
  //       const user = await this.getUserFromToken(req);
  //       const { accountId } = req.params;
  //       if (!accountId) throw new ApiError('Account ID is required', 400);

  //       await this.socialService.refreshToken(user.id, accountId);
  //       res.json({ message: 'Token refreshed successfully' });
  //     } catch (error) {
  //       if (error instanceof ApiError) throw error;
  //       throw new ApiError('Failed to refresh token', 500);
  //     }
  //   }
}
