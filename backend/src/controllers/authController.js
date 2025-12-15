import bcrypt from 'bcryptjs';
import { analyticsPool } from '../config/database.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

// Use analyticsPool (lazysauce_analytics) for user authentication
// This matches the PHP app which uses DB_MR for login
const pool = analyticsPool;

/**
 * User login
 * POST /api/auth/login
 *
 * Table: user_accounts
 * Fields: user_id, user_name, user_password, timezone, active
 */
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new ApiError(400, 'Username and password are required');
    }

    // Get user from database (using correct table: user_accounts)
    const [rows] = await pool.execute(
      'SELECT user_id, user_name, user_password, timezone, active FROM user_accounts WHERE user_name = ? AND active = 1 LIMIT 1',
      [username]
    );

    if (rows.length === 0) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const user = rows[0];

    // Verify password - the existing system uses bcrypt (password_hash with PASSWORD_BCRYPT)
    let isValidPassword = false;

    try {
      isValidPassword = await bcrypt.compare(password, user.user_password);
    } catch (e) {
      // If bcrypt fails, password might be in different format
      isValidPassword = false;
    }

    if (!isValidPassword) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Get additional user info (first_name from user_accounts_extra)
    let firstName = '';
    try {
      const [extraRows] = await pool.execute(
        'SELECT first_name FROM user_accounts_extra WHERE user_id = ? LIMIT 1',
        [user.user_id]
      );
      if (extraRows.length > 0) {
        firstName = extraRows[0].first_name;
      }
    } catch (e) {
      // Table might not exist, continue without extra info
    }

    // Generate tokens
    const tokenPayload = {
      id: user.user_id,
      username: user.user_name,
      role: 'user',
      timezone: user.timezone || null
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: user.user_id });

    res.json({
      success: true,
      data: {
        user: {
          id: user.user_id,
          username: user.user_name,
          firstName: firstName,
          role: 'user',
          timezone: user.timezone
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Affiliate login
 * POST /api/auth/affiliate/login
 */
export const affiliateLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new ApiError(400, 'Username and password are required');
    }

    // Try to find affiliate in affiliate_users or similar table
    // First, let's check if there's an affiliate_users table
    const [rows] = await pool.execute(
      'SELECT * FROM affiliate_users WHERE username = ? AND active = 1 LIMIT 1',
      [username]
    );

    if (rows.length === 0) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const affiliate = rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, affiliate.password);

    if (!isValidPassword) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Generate tokens
    const tokenPayload = {
      id: affiliate.id,
      username: affiliate.username,
      role: 'affiliate',
      affiliate_id: affiliate.id
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: affiliate.id, type: 'affiliate' });

    res.json({
      success: true,
      data: {
        user: {
          id: affiliate.id,
          username: affiliate.username,
          role: 'affiliate'
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw new ApiError(400, 'Refresh token is required');
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(token);

    // Get user from database
    const [rows] = await pool.execute(
      'SELECT user_id, user_name, timezone FROM user_accounts WHERE user_id = ? AND active = 1',
      [decoded.id]
    );

    if (rows.length === 0) {
      throw new ApiError(401, 'User not found');
    }

    const user = rows[0];

    // Generate new access token
    const tokenPayload = {
      id: user.user_id,
      username: user.user_name,
      role: 'user',
      timezone: user.timezone || null
    };

    const accessToken = generateToken(tokenPayload);

    res.json({
      success: true,
      data: { accessToken }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
export const getCurrentUser = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT user_id, user_name, timezone FROM user_accounts WHERE user_id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      throw new ApiError(404, 'User not found');
    }

    const user = rows[0];

    // Get additional info
    let firstName = '';
    try {
      const [extraRows] = await pool.execute(
        'SELECT first_name, last_name FROM user_accounts_extra WHERE user_id = ? LIMIT 1',
        [user.user_id]
      );
      if (extraRows.length > 0) {
        firstName = extraRows[0].first_name || '';
      }
    } catch (e) {
      // Continue without extra info
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.user_id,
          username: user.user_name,
          firstName: firstName,
          timezone: user.timezone
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * PUT /api/auth/profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { firstName, timezone } = req.body;

    // Update timezone in user_accounts
    if (timezone) {
      await pool.execute(
        'UPDATE user_accounts SET timezone = ? WHERE user_id = ?',
        [timezone, req.user.id]
      );
    }

    // Update first_name in user_accounts_extra if it exists
    if (firstName) {
      try {
        await pool.execute(
          'UPDATE user_accounts_extra SET first_name = ? WHERE user_id = ?',
          [firstName, req.user.id]
        );
      } catch (e) {
        // Table might not exist
      }
    }

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 * PUT /api/auth/password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ApiError(400, 'Current password and new password are required');
    }

    // Get current user
    const [rows] = await pool.execute(
      'SELECT user_password FROM user_accounts WHERE user_id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      throw new ApiError(404, 'User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, rows[0].user_password);

    if (!isValidPassword) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    // Hash new password (using bcrypt with cost 10, same as PHP PASSWORD_BCRYPT default)
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.execute(
      'UPDATE user_accounts SET user_password = ? WHERE user_id = ?',
      [hashedPassword, req.user.id]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ApiError(400, 'Email/Username is required');
    }

    // Check if user exists (user_name is the email in this system)
    const [rows] = await pool.execute(
      'SELECT user_id, user_name FROM user_accounts WHERE user_name = ?',
      [email]
    );

    if (rows.length === 0) {
      // Don't reveal if email exists
      res.json({
        success: true,
        message: 'If an account exists, a password reset link has been sent'
      });
      return;
    }

    // Generate reset token
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Save reset token to reset_account table
    try {
      await pool.execute(
        'INSERT INTO reset_account (Token, user_id, user_name, date) VALUES (?, ?, ?, ?)',
        [resetToken, rows[0].user_id, rows[0].user_name, now]
      );
    } catch (e) {
      // Handle duplicate or other errors
    }

    // TODO: Send email with reset link

    res.json({
      success: true,
      message: 'If an account exists, a password reset link has been sent'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new ApiError(400, 'Token and new password are required');
    }

    // Find user with valid reset token (within 1 hour)
    const [rows] = await pool.execute(
      'SELECT user_id FROM reset_account WHERE Token = ? AND date >= DATE_SUB(NOW(), INTERVAL 1 HOUR) LIMIT 1',
      [token]
    );

    if (rows.length === 0) {
      throw new ApiError(400, 'Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.execute(
      'UPDATE user_accounts SET user_password = ? WHERE user_id = ?',
      [hashedPassword, rows[0].user_id]
    );

    // Delete used token
    await pool.execute(
      'DELETE FROM reset_account WHERE Token = ?',
      [token]
    );

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    // Client-side should remove the token
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

export default {
  login,
  affiliateLogin,
  refreshToken,
  getCurrentUser,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  logout
};
