import express from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validator.js';
import { authenticateToken } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';

const router = express.Router();

// Public routes (no authentication required)

// Login
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  authController.login
);

// Affiliate login
router.post(
  '/affiliate/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  authController.affiliateLogin
);

// Refresh token
router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  validate,
  authController.refreshToken
);

// Forgot password
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required')],
  validate,
  authController.forgotPassword
);

// Reset password
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  validate,
  authController.resetPassword
);

// Protected routes (authentication required)

// Get current user
router.get('/me', authenticateToken, authController.getCurrentUser);

// Update profile
router.put(
  '/profile',
  authenticateToken,
  [
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('firstName').optional().trim(),
    body('lastName').optional().trim()
  ],
  validate,
  authController.updateProfile
);

// Change password
router.put(
  '/password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ],
  validate,
  authController.changePassword
);

// Logout
router.post('/logout', authenticateToken, authController.logout);

export default router;
