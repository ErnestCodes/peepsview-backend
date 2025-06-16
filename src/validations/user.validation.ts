import { body, param } from 'express-validator';

export const userValidation = {
  updateProfile: [
    body('name').optional().isString().trim(),
    body('email').optional().isEmail(),
  ],

  //   updateSettings: [
  //     body('settings').isObject()
  //   ],

  updatePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword').notEmpty().withMessage('New password is required'),
  ],

  createApiKey: [
    body('name').notEmpty().withMessage('API key name is required'),
  ],

  deleteApiKey: [
    param('keyId').notEmpty().withMessage('API key ID is required'),
  ],

  // Social account validations
  updateSocialAccounts: [
    body('accounts').isArray().withMessage('Accounts must be an array'),
    body('accounts.*.id').notEmpty().withMessage('Account ID is required'),
    body('accounts.*.isDefault').optional().isBoolean(),
  ],

  disconnectSocialAccount: [
    param('accountId').notEmpty().withMessage('Account ID is required'),
  ],

  setDefaultSocialAccount: [
    param('accountId').notEmpty().withMessage('Account ID is required'),
  ],

  refreshSocialToken: [
    param('accountId').notEmpty().withMessage('Account ID is required'),
  ],
};
