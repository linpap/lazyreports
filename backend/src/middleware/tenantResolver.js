import { getTenantConnection } from '../config/database.js';
import { ApiError } from './errorHandler.js';

/**
 * Middleware to resolve tenant database based on authenticated user
 *
 * This middleware:
 * 1. Checks if user has a tenant_id in their JWT token
 * 2. Gets or creates a database pool for that tenant
 * 3. Attaches the tenant pool to the request object
 *
 * Multi-tenancy allows different clients to have isolated databases:
 * - lazysauce (main)
 * - lazysauce_client_abc
 * - lazysauce_client_xyz
 */
export const resolveTenant = (req, res, next) => {
  try {
    // User must be authenticated first
    if (!req.user) {
      throw new ApiError(401, 'Authentication required for tenant resolution');
    }

    // Get tenant ID from user token
    const tenantId = req.user.tenant_id || req.user.db_d || null;

    if (tenantId) {
      // Get tenant-specific database pool
      req.tenantPool = getTenantConnection(tenantId);
      req.tenantId = tenantId;
    } else {
      // No tenant specified, use main database
      req.tenantPool = null;
      req.tenantId = null;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to require tenant (for routes that must have tenant context)
 */
export const requireTenant = (req, res, next) => {
  if (!req.tenantId || !req.tenantPool) {
    throw new ApiError(400, 'Tenant context required for this operation');
  }
  next();
};

export default { resolveTenant, requireTenant };
