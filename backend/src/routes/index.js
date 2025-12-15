import express from 'express';
import authRoutes from './auth.js';
import apiRoutes from './api.js';

const router = express.Router();

// Auth routes (login, register, etc.)
router.use('/auth', authRoutes);

// API routes (analytics, reports, etc.)
router.use('/', apiRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'LazySauce API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/login': 'User login',
        'POST /api/auth/affiliate/login': 'Affiliate login',
        'POST /api/auth/refresh': 'Refresh access token',
        'GET /api/auth/me': 'Get current user',
        'PUT /api/auth/profile': 'Update profile',
        'PUT /api/auth/password': 'Change password',
        'POST /api/auth/forgot-password': 'Request password reset',
        'POST /api/auth/reset-password': 'Reset password with token',
        'POST /api/auth/logout': 'Logout'
      },
      analytics: {
        'GET /api/analytics': 'Get analytics data',
        'GET /api/analytics/affiliate': 'Get affiliate analytics',
        'GET /api/analytics/map': 'Get geographic analytics',
        'GET /api/averages': 'Get averages'
      },
      data: {
        'GET /api/approximate': 'Autocomplete/search',
        'GET /api/ip-actions': 'Get IP actions',
        'GET /api/channels': 'Get channels',
        'GET /api/clients': 'Get clients',
        'GET /api/conversions': 'Get conversions',
        'GET /api/offers': 'Get offers',
        'GET /api/rawwords': 'Get raw words/keywords',
        'POST /api/custom-sql': 'Run custom SQL (admin)'
      },
      settings: {
        'POST /api/settings/default-date': 'Save default date',
        'POST /api/settings/default-offer': 'Save default offer',
        'POST /api/settings/timezone': 'Save timezone'
      },
      reports: {
        'GET /api/reports': 'Get saved reports',
        'POST /api/reports': 'Save report',
        'PUT /api/reports/:id': 'Update report',
        'DELETE /api/reports/:id': 'Delete report'
      },
      columnSets: {
        'GET /api/column-sets': 'Get column sets',
        'POST /api/column-sets': 'Save column set',
        'DELETE /api/column-sets/:id': 'Delete column set'
      },
      filters: {
        'GET /api/filters': 'Get saved filters',
        'POST /api/filters': 'Save filter',
        'DELETE /api/filters/:id': 'Delete filter'
      },
      other: {
        'DELETE /api/ip-actions/:ip': 'Clear IP records',
        'POST /api/sales/import': 'Import sales data'
      }
    }
  });
});

export default router;
