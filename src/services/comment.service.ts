import { supabase, supabaseAdmin } from '../lib/supabase';
import { Database } from '../types/supabase';

type Comment = Database['public']['Tables']['comments']['Row'];
type CommentInsert = Database['public']['Tables']['comments']['Insert'];
type CommentUpdate = Database['public']['Tables']['comments']['Update'];

export class CommentService {
  async createComment(commentData: CommentInsert): Promise<Comment> {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        ...commentData,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async bulkCreateComments(comments: CommentInsert[]): Promise<Comment[]> {
    const commentsWithTimestamp = comments.map((comment) => ({
      ...comment,
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabaseAdmin
      .from('comments')
      .insert(commentsWithTimestamp)
      .select();

    if (error) throw error;
    return data || [];
  }

  async getCommentsByPostId(postId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('published_at', { ascending: true, nullsFirst: false });

    if (error) throw error;
    return data || [];
  }

  async getCommentById(commentId: string): Promise<Comment | null> {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateComment(
    commentId: string,
    updates: CommentUpdate
  ): Promise<Comment> {
    const { data, error } = await supabase
      .from('comments')
      .update(updates)
      .eq('id', commentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
  }

  async getCommentReplies(parentCommentId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('parent_comment_id', parentCommentId)
      .order('published_at', { ascending: true, nullsFirst: false });

    if (error) throw error;
    return data || [];
  }

  async getCommentsByAuthor(
    postId: string,
    authorId: string
  ): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .eq('author_id', authorId)
      .order('published_at', { ascending: true, nullsFirst: false });

    if (error) throw error;
    return data || [];
  }

  async getTopLevelComments(postId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('published_at', { ascending: true, nullsFirst: false });

    if (error) throw error;
    return data || [];
  }

  async getCommentsWithReplies(postId: string): Promise<any[]> {
    // Get all comments for the post
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('published_at', { ascending: true, nullsFirst: false });

    if (error) throw error;

    // Organize comments into a tree structure
    const commentMap = new Map();
    const topLevelComments: any[] = [];

    // First pass: create comment objects with replies array
    comments?.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: organize into tree structure
    comments?.forEach((comment) => {
      const commentObj = commentMap.get(comment.id);
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies.push(commentObj);
        }
      } else {
        topLevelComments.push(commentObj);
      }
    });

    return topLevelComments;
  }

  async getCommentStats(postId: string): Promise<{
    totalComments: number;
    topLevelComments: number;
    repliesCount: number;
    averageLikes: number;
  }> {
    const { data: comments, error } = await supabase
      .from('comments')
      .select('likes_count, parent_comment_id')
      .eq('post_id', postId);

    if (error) throw error;

    const totalComments = comments?.length || 0;
    const topLevelComments =
      comments?.filter((c) => !c.parent_comment_id).length || 0;
    const repliesCount = totalComments - topLevelComments;
    const totalLikes =
      comments?.reduce((sum, c) => sum + (c.likes_count || 0), 0) || 0;
    const averageLikes = totalComments > 0 ? totalLikes / totalComments : 0;

    return {
      totalComments,
      topLevelComments,
      repliesCount,
      averageLikes,
    };
  }
}
