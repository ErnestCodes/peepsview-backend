import { randomBytes } from 'crypto';
import { supabase, supabaseAdmin } from '../lib/supabase';

export class UserService {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async register(email: string, password: string, name: string) {
    try {
      console.log('Starting user registration for:', email);

      // Check if user exists first
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Create auth user with email confirmation
      const { data: auth, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${process.env.FRONTEND_URL}/auth/confirm`,
        },
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        throw new Error(authError.message);
      }

      if (!auth.user) {
        console.error('No user returned from auth signup');
        throw new Error('Failed to create user account');
      }

      // Create user profile using admin client
      const { error: profileError } = await supabaseAdmin.from('users').insert({
        id: auth.user.id,
        email,
        name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw new Error('Failed to create user profile');
      }

      console.log('Successfully registered user:', email);
      return {
        ...auth,
        message:
          'Registration successful. Please check your email to confirm your account.',
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async getSession(token: string) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error) throw error;
    return user;
  }

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });
    if (error) throw error;
  }

  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    // Verify current password
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: '', // We'll get this from the user record
      password: currentPassword,
    });

    if (authError) throw new Error('Current password is incorrect');

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  }

  async generateApiKey(userId: string, name: string) {
    const key = `gf_${randomBytes(32).toString('hex')}`;

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        name,
        key,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getApiKeys(userId: string) {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  }

  async updateAvatar(userId: string, file: Buffer) {
    const fileName = `${userId}/${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { avatarUrl: publicUrl };
  }

  async deleteApiKey(userId: string, keyId: string) {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .match({ id: keyId, user_id: userId });

    if (error) throw error;
  }

  async updateProfile(userId: string, data: { name?: string; email?: string }) {
    const { error } = await supabase
      .from('users')
      .update({
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;

    // If email is being updated, we need to update auth email as well
    if (data.email) {
      const { error: authError } = await supabase.auth.updateUser({
        email: data.email,
      });
      if (authError) throw authError;
    }

    // Get updated user data
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;
    return userData;
  }
}
