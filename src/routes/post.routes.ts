import { Router } from 'express';
import { PostController } from '../controllers/post.controller';

const router = Router();
const postController = new PostController();

// Create new post
router.post('/', postController.createPost.bind(postController));

// Get all posts for user with filtering and pagination
router.get('/', postController.getPosts.bind(postController));

// Get posts by platform
router.get(
  '/platform/:platform',
  postController.getPostsByPlatform.bind(postController)
);

// Get specific post by ID
router.get('/:postId', postController.getPost.bind(postController));

// Get post with all its comments
router.get(
  '/:postId/with-comments',
  postController.getPostWithComments.bind(postController)
);

// Update specific post
router.put('/:postId', postController.updatePost.bind(postController));

// Delete specific post
router.delete('/:postId', postController.deletePost.bind(postController));

export default router;
