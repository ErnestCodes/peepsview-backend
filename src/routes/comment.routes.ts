import { Router } from 'express';
import { CommentController } from '../controllers/comment.controller';

const router = Router();
const commentController = new CommentController();

// Get specific comment by ID
router.get('/:commentId', commentController.getComment.bind(commentController));

// Update specific comment
router.put(
  '/:commentId',
  commentController.updateComment.bind(commentController)
);

// Delete specific comment
router.delete(
  '/:commentId',
  commentController.deleteComment.bind(commentController)
);

// Get replies for a specific comment
router.get(
  '/:commentId/replies',
  commentController.getCommentReplies.bind(commentController)
);

// Post-specific comment routes
// Get all comments for a post (with optional replies)
router.get(
  '/post/:postId',
  commentController.getCommentsByPost.bind(commentController)
);

// Get top-level comments only for a post
router.get(
  '/post/:postId/top-level',
  commentController.getTopLevelComments.bind(commentController)
);

// Get comment statistics for a post
router.get(
  '/post/:postId/stats',
  commentController.getCommentStats.bind(commentController)
);

// Get comments by specific author for a post
router.get(
  '/post/:postId/author/:authorId',
  commentController.getCommentsByAuthor.bind(commentController)
);

export default router;
