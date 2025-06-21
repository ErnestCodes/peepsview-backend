import { Request, Response } from 'express';
import { ApiError } from '../middleware/error';
import { PostService } from '../services/post.service';
import { UserService } from '../services/user.service';

export class PostController {
  private postService: PostService;
  private userService: UserService;

  constructor() {
    this.postService = new PostService();
    this.userService = new UserService();
  }

  private async getUserFromToken(req: Request): Promise<any> {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new ApiError('Unauthorized', 401);
    }

    try {
      const user = await this.userService.getSession(token);
      if (!user) {
        throw new ApiError('Invalid session', 401);
      }
      return user;
    } catch (error) {
      throw new ApiError('Invalid session', 401);
    }
  }

  async createPost(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const {
        platform,
        post_url,
        title,
        content,
        author,
        social_account_id,
        platform_post_id,
      } = req.body;

      if (!platform || !post_url) {
        throw new ApiError('Platform and post URL are required', 400);
      }

      const post = await this.postService.createPost(user.id, {
        platform,
        post_url,
        title,
        content,
        author,
        social_account_id,
        platform_post_id,
      });

      res.status(201).json(post);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to create post', 500);
    }
  }

  async getPosts(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { platform, status, limit = 20, offset = 0 } = req.query;

      const posts = await this.postService.getUserPosts(user.id, {
        platform: platform as string,
        status: status as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.json({ posts });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch posts', 500);
    }
  }

  async getPost(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { postId } = req.params;

      if (!postId) {
        throw new ApiError('Post ID is required', 400);
      }

      const post = await this.postService.getPostById(postId, user.id);
      if (!post) {
        throw new ApiError('Post not found', 404);
      }

      res.json(post);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch post', 500);
    }
  }

  async getPostWithComments(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { postId } = req.params;

      if (!postId) {
        throw new ApiError('Post ID is required', 400);
      }

      const post = await this.postService.getPostWithComments(postId, user.id);
      if (!post) {
        throw new ApiError('Post not found', 404);
      }

      res.json(post);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch post with comments', 500);
    }
  }

  async updatePost(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { postId } = req.params;
      const updates = req.body;

      if (!postId) {
        throw new ApiError('Post ID is required', 400);
      }

      const post = await this.postService.updatePost(postId, user.id, updates);
      res.json(post);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to update post', 500);
    }
  }

  async deletePost(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { postId } = req.params;

      if (!postId) {
        throw new ApiError('Post ID is required', 400);
      }

      await this.postService.deletePost(postId, user.id);
      res.json({ message: 'Post deleted successfully' });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to delete post', 500);
    }
  }

  async getPostsByPlatform(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { platform } = req.params;

      if (!platform) {
        throw new ApiError('Platform is required', 400);
      }

      const posts = await this.postService.getPostsByPlatform(
        user.id,
        platform
      );
      res.json({ posts });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch posts by platform', 500);
    }
  }
}
