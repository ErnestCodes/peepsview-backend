import { Router } from 'express';
import { SocialController } from '../controllers/social.controller';
import { validate } from '../middleware/validation';
import { socialValidation } from '../validations/social.validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const socialController = new SocialController();

// OAuth URLs and callbacks (no auth required)
router.get(
  '/:platform/oauth-url',
  authenticateToken,
  validate(socialValidation.getOAuthUrl),
  socialController.getOAuthUrl.bind(socialController)
);

router.post(
  '/:platform/connect',
  validate(socialValidation.connect),
  socialController.connect.bind(socialController)
);

// Protected routes
router.use(authenticateToken);

// Platform management
router.post(
  '/:platform/disconnect',
  validate(socialValidation.disconnect),
  socialController.disconnect.bind(socialController)
);

// Account Management
router.get('/accounts', socialController.getAccounts.bind(socialController));

router.put(
  '/accounts',
  validate(socialValidation.updateAccounts),
  socialController.updateAccounts.bind(socialController)
);

router.post(
  '/accounts/:accountId/disconnect',
  validate(socialValidation.disconnectAccount),
  socialController.disconnectAccount.bind(socialController)
);

router.put(
  '/accounts/:accountId/default',
  validate(socialValidation.setDefaultAccount),
  socialController.setDefaultAccount.bind(socialController)
);

// router.post(
//   '/accounts/:accountId/refresh',
//   validate(socialValidation.refreshToken),
//   socialController.refreshToken.bind(socialController)
// );

export default router;
