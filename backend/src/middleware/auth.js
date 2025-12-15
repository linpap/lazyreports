import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { ApiError } from './errorHandler.js';

// Authenticate JWT token
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    throw new ApiError(401, 'Access denied. No token provided.');
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired. Please login again.');
    }
    throw new ApiError(403, 'Invalid token.');
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = decoded;
    } catch (error) {
      // Token invalid, but we don't throw - just continue without user
      req.user = null;
    }
  }

  next();
};

// Check if user has specific role
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required.');
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'Access denied. Insufficient permissions.');
    }

    next();
  };
};

// Check if user is admin
export const requireAdmin = requireRole('admin');

// Check if user is affiliate
export const requireAffiliate = requireRole('affiliate', 'admin');

// Generate JWT token
export const generateToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

// Generate refresh token
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn
  });
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

export default {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireAffiliate,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken
};
