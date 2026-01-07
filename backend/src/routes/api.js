import express from 'express';
import { body, query } from 'express-validator';
import validate from '../middleware/validator.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenantResolver.js';
import * as fetchController from '../controllers/api/fetchController.js';
import * as saveController from '../controllers/api/saveController.js';
import * as deleteController from '../controllers/api/deleteController.js';

const router = express.Router();

// All API routes require authentication
router.use(authenticateToken);

// Resolve tenant for multi-tenant database access
router.use(resolveTenant);

// =====================
// FETCH ROUTES
// =====================

// User Domains/Offers (for selector dropdown)
router.get('/domains', fetchController.getUserDomains);

// Default Offer
router.get('/default-offer', fetchController.getDefaultOffer);
router.post('/default-offer', fetchController.saveDefaultOffer);

// Analytics
router.get('/analytics', fetchController.getAnalytics);
router.get('/analytics/report', fetchController.getAnalyticsReport);
router.get('/analytics/detail', fetchController.getAnalyticsDetail);
router.get('/analytics/visitor/:id', fetchController.getVisitorDetail);
router.get('/analytics/action/:id', fetchController.getActionDetail);
router.get('/analytics/affiliate', fetchController.getAffiliateAnalytics);
router.get('/analytics/offenders', fetchController.getOffendersReport);
router.get('/analytics/victims', fetchController.getVictimsReport);
router.get('/analytics/map', fetchController.getAnalyticsMap);
router.get('/averages', fetchController.getAverages);
router.get('/averages/weekly', fetchController.getWeeklyAverages);

// Autocomplete/Search
router.get('/approximate', fetchController.getApproximate);

// IP Actions
router.get('/ip-actions', fetchController.getIPActions);

// Channels
router.get('/channels', fetchController.getChannels);

// Variants
router.get('/variants', fetchController.getVariants);

// Company Users
router.get('/company-users', fetchController.getCompanyUsers);
router.post('/company-users', saveController.createCompanyUser);

// Affiliate Accounts
router.get('/affiliate-accounts', fetchController.getAffiliateAccounts);
router.post('/affiliate-accounts', saveController.createAffiliateAccount);

// Company Offers
router.post('/company-offers', saveController.createCompanyOffer);

// Clients/Advertisers
router.get('/clients', fetchController.getClients);
router.get('/clients/:id/report', fetchController.getClientReport);

// Domain Report (tracking domains inventory)
router.get('/domain-report', fetchController.getUserDomainReport);
router.put('/domain-report/:dkey', fetchController.updateDomainAdvertiser);
router.delete('/domain-report/:dkey', fetchController.deleteDomainReport);

// Advertisers (owner management - matches PHP isOwner check)
router.get('/advertisers', fetchController.getAdvertisers);
router.post('/advertisers', fetchController.createAdvertiser);
router.put('/advertisers/:id', fetchController.updateAdvertiser);
router.delete('/advertisers/:id', fetchController.deleteAdvertiser);

// Conversions
router.get('/conversions', fetchController.getConversions);

// Offers
router.get('/offers', fetchController.getOffers);

// Raw words / Keywords
router.get('/rawwords', fetchController.getRawwords);

// Decode visitor/action by pkey or hash
router.post('/decode', fetchController.decodeVisitor);

// Custom Reports (from database)
router.get('/custom-reports', fetchController.getCustomReports);

// Custom SQL (admin only)
router.post(
  '/custom-sql',
  requireAdmin,
  [body('query').notEmpty().withMessage('SQL query is required')],
  validate,
  fetchController.runCustomSql
);

// =====================
// SAVE ROUTES
// =====================

// Settings
router.get('/settings', saveController.getUserSettings);
router.post('/settings/default-report', saveController.saveDefaultReport);
router.post('/settings/default-date', saveController.saveDefaultDate);
router.post('/settings/default-offer', saveController.saveDefaultOffer);
router.post('/settings/timezone', saveController.saveTimezone);

// Reports
router.get('/reports', saveController.getSavedReports);
router.post(
  '/reports',
  [
    body('name').trim().notEmpty().withMessage('Report name is required'),
    body('config').notEmpty().withMessage('Report config is required')
  ],
  validate,
  saveController.saveReport
);
router.put('/reports/:id', saveController.updateReport);
router.delete('/reports/:id', deleteController.deleteReport);

// Column Sets
router.get('/column-sets', saveController.getColumnSets);
router.post(
  '/column-sets',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('columns').isArray().withMessage('Columns must be an array')
  ],
  validate,
  saveController.saveColumnSet
);
router.delete('/column-sets/:id', saveController.deleteColumnSet);

// Filters
router.get('/filters', saveController.getFilters);
router.post(
  '/filters',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('filters').notEmpty().withMessage('Filters are required')
  ],
  validate,
  saveController.saveFilter
);
router.delete('/filters/:id', saveController.deleteFilter);

// Sales Import
router.post(
  '/sales/import',
  [body('sales').isArray().withMessage('Sales must be an array')],
  validate,
  saveController.importSales
);

// =====================
// DELETE ROUTES
// =====================

// Clear IP
router.delete('/ip-actions/:ip', deleteController.clearIP);

export default router;
