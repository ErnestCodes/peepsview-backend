import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validate } from '../middleware/validation';
import { userValidation } from '../validations/user.validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const userController = new UserController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Profile and Settings
router.put(
  '/profile',
  validate(userValidation.updateProfile),
  userController.updateProfile.bind(userController)
);

router.post(
  '/password',
  validate(userValidation.updatePassword),
  userController.updatePassword.bind(userController)
);

// API Keys
router.get('/api-keys', userController.getApiKeys.bind(userController));

router.post(
  '/api-keys',
  validate(userValidation.createApiKey),
  userController.createApiKey.bind(userController)
);

router.post(
  '/api-keys/:keyId/delete',
  validate(userValidation.deleteApiKey),
  userController.deleteApiKey.bind(userController)
);

export default router;
