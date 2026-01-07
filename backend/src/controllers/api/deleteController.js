import pool from '../../config/database.js';
import { ApiError } from '../../middleware/errorHandler.js';

/**
 * Clear IP records - deletes visits and actions for an IP from the last month
 * POST /api/clear-ip
 */
export const clearIP = async (req, res, next) => {
  try {
    const { ip, offer } = req.body;

    if (!ip) {
      throw new ApiError(400, 'IP address is required');
    }

    if (!offer) {
      throw new ApiError(400, 'Offer is required');
    }

    // Get dkey from offer name
    const [domains] = await pool.execute(
      'SELECT dkey FROM lazysauce.domain WHERE name = ?',
      [offer]
    );

    if (domains.length === 0) {
      throw new ApiError(404, 'Offer not found');
    }

    const dkey = domains[0].dkey;
    const tenantDb = `lazysauce_${dkey}`;

    // Delete actions for this IP from the last month
    const deleteActionsSql = `
      DELETE ${tenantDb}.action
      FROM ${tenantDb}.action
      INNER JOIN ${tenantDb}.visit ON visit.pkey = action.pkey
      WHERE visit.ip = INET6_ATON(?)
      AND visit.date_created > NOW() - INTERVAL 1 MONTH
    `;

    const [actionResult] = await pool.execute(deleteActionsSql, [ip]);

    // Delete visits for this IP from the last month
    const deleteVisitsSql = `
      DELETE FROM ${tenantDb}.visit
      WHERE ip = INET6_ATON(?)
      AND date_created > NOW() - INTERVAL 1 MONTH
    `;

    const [visitResult] = await pool.execute(deleteVisitsSql, [ip]);

    res.json({
      success: true,
      message: `Cleared ${visitResult.affectedRows} visit(s) and ${actionResult.affectedRows} action(s) for IP ${ip}`,
      data: {
        visitsDeleted: visitResult.affectedRows,
        actionsDeleted: actionResult.affectedRows
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete saved report
 * DELETE /api/reports/:id
 */
export const deleteReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [result] = await pool.execute(
      'DELETE FROM saved_reports WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      throw new ApiError(404, 'Report not found or unauthorized');
    }

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export default {
  clearIP,
  deleteReport
};
