import { supabase, supabaseAdmin } from '../lib/supabase';
import { Database } from '../types/supabase';

type Post = Database['public']['Tables']['posts']['Row'];
type PostInsert = Database['public']['Tables']['posts']['Insert'];
type PostUpdate = Database['public']['Tables']['posts']['Update'];

export class PostService {
  async createPost(
    userId: string,
    postData: Omit<PostInsert, 'user_id'>
  ): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        ...postData,
        user_id: userId,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getPostById(postId: string, userId: string): Promise<Post | null> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getUserPosts(
    userId: string,
    options?: {
      platform?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Post[]> {
    let query = supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.platform) {
      query = query.eq('platform', options.platform);
    }

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async updatePost(
    postId: string,
    userId: string,
    updates: PostUpdate
  ): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deletePost(postId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async getPostsByPlatform(userId: string, platform: string): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updatePostStatus(
    postId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed'
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('posts')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (error) throw error;
  }

  async getPostsForAnalysis(limit: number = 10): Promise<Post[]> {
    const { data, error } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getPostWithComments(
    postId: string,
    userId: string
  ): Promise<Post & { comments?: any[] }> {
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(
        `
        *,
        comments (
          id,
          platform_comment_id,
          author_name,
          author_id,
          content,
          likes_count,
          replies_count,
          published_at,
          parent_comment_id,
          created_at
        )
      `
      )
      .eq('id', postId)
      .eq('user_id', userId)
      .single();

    if (postError) throw postError;
    return post;
  }
}
