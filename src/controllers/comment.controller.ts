import { Request, Response } from 'express';
import { ApiError } from '../middleware/error';
import { CommentService } from '../services/comment.service';
import { PostService } from '../services/post.service';
import { UserService } from '../services/user.service';

export class CommentController {
  private commentService: CommentService;
  private postService: PostService;
  private userService: UserService;

  constructor() {
    this.commentService = new CommentService();
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

  private async verifyPostAccess(
    postId: string,
    userId: string
  ): Promise<void> {
    const post = await this.postService.getPostById(postId, userId);
    if (!post) {
      throw new ApiError('Post not found or access denied', 404);
    }
  }

  async getCommentsByPost(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { postId } = req.params;
      const { withReplies = 'false' } = req.query;

      if (!postId) {
        throw new ApiError('Post ID is required', 400);
      }

      await this.verifyPostAccess(postId, user.id);

      let comments;
      if (withReplies === 'true') {
        comments = await this.commentService.getCommentsWithReplies(postId);
      } else {
        comments = await this.commentService.getCommentsByPostId(postId);
      }

      res.json({ comments });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch comments', 500);
    }
  }

  async getComment(req: Request, res: Response) {
    try {
      await this.getUserFromToken(req);
      const { commentId } = req.params;

      if (!commentId) {
        throw new ApiError('Comment ID is required', 400);
      }

      const comment = await this.commentService.getCommentById(commentId);
      if (!comment) {
        throw new ApiError('Comment not found', 404);
      }

      res.json(comment);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch comment', 500);
    }
  }

  async getCommentReplies(req: Request, res: Response) {
    try {
      await this.getUserFromToken(req);
      const { commentId } = req.params;

      if (!commentId) {
        throw new ApiError('Comment ID is required', 400);
      }

      const replies = await this.commentService.getCommentReplies(commentId);
      res.json({ replies });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch comment replies', 500);
    }
  }

  async getTopLevelComments(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { postId } = req.params;

      if (!postId) {
        throw new ApiError('Post ID is required', 400);
      }

      await this.verifyPostAccess(postId, user.id);

      const comments = await this.commentService.getTopLevelComments(postId);
      res.json({ comments });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch top-level comments', 500);
    }
  }

  async getCommentsByAuthor(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { postId, authorId } = req.params;

      if (!postId || !authorId) {
        throw new ApiError('Post ID and Author ID are required', 400);
      }

      await this.verifyPostAccess(postId, user.id);

      const comments = await this.commentService.getCommentsByAuthor(
        postId,
        authorId
      );
      res.json({ comments });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch comments by author', 500);
    }
  }

  async getCommentStats(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { postId } = req.params;

      if (!postId) {
        throw new ApiError('Post ID is required', 400);
      }

      await this.verifyPostAccess(postId, user.id);

      const stats = await this.commentService.getCommentStats(postId);
      res.json(stats);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch comment stats', 500);
    }
  }

  async updateComment(req: Request, res: Response) {
    try {
      await this.getUserFromToken(req);
      const { commentId } = req.params;
      const updates = req.body;

      if (!commentId) {
        throw new ApiError('Comment ID is required', 400);
      }

      const comment = await this.commentService.updateComment(
        commentId,
        updates
      );
      res.json(comment);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to update comment', 500);
    }
  }

  async deleteComment(req: Request, res: Response) {
    try {
      await this.getUserFromToken(req);
      const { commentId } = req.params;

      if (!commentId) {
        throw new ApiError('Comment ID is required', 400);
      }

      await this.commentService.deleteComment(commentId);
      res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to delete comment', 500);
    }
  }
}
