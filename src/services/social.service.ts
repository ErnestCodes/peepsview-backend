import { supabase, supabaseAdmin } from '../lib/supabase';
import { UserService } from './user.service';

export class SocialNotifier {
  private userId?: string;

  constructor(userId?: string) {
    this.userId = userId;
    this.loadSavedCredentials();
  }

  private async loadSavedCredentials() {
    if (!this.userId) return;

    try {
      const { data: accounts } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', this.userId);

      if (!accounts) return;
    } catch (error) {
      console.error('Error loading social credentials:', error);
    }
  }

  private async saveCredentials(
    platform: string,
    credentials: {
      platform_user_id: string;
      access_token: string;
      refresh_token?: string;
      expires_at?: string;
    }
  ) {
    if (!this.userId) throw new Error('User ID is required');

    try {
      const { data: existingAccount } = await supabase
        .from('social_accounts')
        .select('id')
        .eq('user_id', this.userId)
        .eq('platform', platform)
        .single();

      const accountData = {
        user_id: this.userId,
        platform,
        platform_user_id: credentials.platform_user_id,
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token,
        expires_at: credentials.expires_at,
        updated_at: new Date().toISOString(),
      };

      if (existingAccount) {
        await supabase
          .from('social_accounts')
          .update(accountData)
          .eq('id', existingAccount.id);
      } else {
        await supabase.from('social_accounts').insert({
          ...accountData,
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(`Error saving ${platform} credentials:`, error);
      throw error;
    }
  }

  async getAccounts(token: string) {
    try {
      const userService = new UserService();
      const user = await userService.getSession(token);
      if (!user) {
        throw new Error('Invalid session');
      }
      // First try with regular client
      let { data: accounts, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error with regular client:', error);

        // If regular client fails, try with admin client
        const { data: adminAccounts, error: adminError } = await supabaseAdmin
          .from('social_accounts')
          .select('*')
          .eq('user_id', user.id);

        if (adminError) {
          console.error('Error with admin client:', adminError);
          throw adminError;
        }

        accounts = adminAccounts;
      }

      if (!accounts) return [];

      return accounts.map((account: any) => ({
        id: account.id,
        platformId: account.platform,
        username: account.platform_user_id,
        type: 'personal',
        avatar: account.avatar,
        isDefault: account.is_default || false,
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        expiresAt: account.expires_at
          ? new Date(account.expires_at).getTime()
          : undefined,
        connected: true,
      }));
    } catch (error) {
      console.error('Error getting social accounts:', error);
      throw error;
    }
  }

  async updateAccounts(
    userId: string,
    accounts: Array<{ id: string; isDefault?: boolean }>
  ) {
    const updates = accounts.map(async (account) => {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (typeof account.isDefault === 'boolean') {
        updateData.is_default = account.isDefault;

        // If setting as default, unset other defaults for this platform
        if (account.isDefault) {
          const { data: currentAccount } = await supabaseAdmin
            .from('social_accounts')
            .select('platform')
            .eq('id', account.id)
            .single();

          if (currentAccount) {
            await supabaseAdmin
              .from('social_accounts')
              .update({ is_default: false })
              .eq('user_id', userId)
              .eq('platform', currentAccount.platform)
              .neq('id', account.id);
          }
        }
      }

      return supabaseAdmin
        .from('social_accounts')
        .update(updateData)
        .eq('id', account.id)
        .eq('user_id', userId);
    });

    await Promise.all(updates);
  }

  async disconnectAccount(userId: string, accountId: string) {
    const { error } = await supabaseAdmin
      .from('social_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async setDefaultAccount(userId: string, accountId: string) {
    // Get the platform of the account
    const { data: account, error: fetchError } = await supabaseAdmin
      .from('social_accounts')
      .select('platform')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;
    if (!account) throw new Error('Account not found');

    // Unset default for all accounts of this platform
    const { error: updateError } = await supabaseAdmin
      .from('social_accounts')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('platform', account.platform);

    if (updateError) throw updateError;

    // Set the new default
    const { error: setDefaultError } = await supabaseAdmin
      .from('social_accounts')
      .update({ is_default: true })
      .eq('id', accountId)
      .eq('user_id', userId);

    if (setDefaultError) throw setDefaultError;
  }
}
