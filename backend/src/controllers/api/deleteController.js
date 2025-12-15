import pool from '../../config/database.js';
import { ApiError } from '../../middleware/errorHandler.js';

/**
 * Clear IP records
 * DELETE /api/ip-actions/:ip
 */
export const clearIP = async (req, res, next) => {
  try {
    const { ip } = req.params;
    const db = req.tenantPool || pool;

    if (!ip) {
      throw new ApiError(400, 'IP address is required');
    }

    const [result] = await db.execute(
      'DELETE FROM ip_actions WHERE ip_address = ?',
      [ip]
    );

    res.json({
      success: true,
      message: `Cleared ${result.affectedRows} IP action records`
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
