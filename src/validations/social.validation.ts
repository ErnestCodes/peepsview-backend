import { param, query, body } from 'express-validator';
import { SupportedPlatform } from '../types/social';

const supportedPlatforms: SupportedPlatform[] = [
  'youtube',
  'tiktok',
  'facebook',
  'linkedin',
];

export const socialValidation = {
  getOAuthUrl: [
    param('platform').isIn(supportedPlatforms).withMessage('Invalid platform'),
  ],

  connect: [
    param('platform').isIn(supportedPlatforms).withMessage('Invalid platform'),
    query('code').notEmpty().withMessage('Authorization code is required'),
  ],

  disconnect: [
    param('platform').isIn(supportedPlatforms).withMessage('Invalid platform'),
  ],

  updateAccounts: [
    body('accounts').isArray().withMessage('Accounts must be an array'),
    body('accounts.*.id').notEmpty().withMessage('Account ID is required'),
    body('accounts.*.isDefault').optional().isBoolean(),
  ],

  disconnectAccount: [
    param('accountId').notEmpty().withMessage('Account ID is required'),
  ],

  setDefaultAccount: [
    param('accountId').notEmpty().withMessage('Account ID is required'),
  ],

  refreshToken: [
    param('accountId').notEmpty().withMessage('Account ID is required'),
  ],
};
