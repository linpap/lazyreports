import pool from '../../config/database.js';
import { ApiError } from '../../middleware/errorHandler.js';

/**
 * Save default date preference
 * POST /api/settings/default-date
 */
export const saveDefaultDate = async (req, res, next) => {
  try {
    const { dateType, startDate, endDate } = req.body;
    const userId = req.user.id;

    await pool.execute(
      `INSERT INTO user_settings (user_id, setting_key, setting_value)
       VALUES (?, 'default_date', ?)
       ON DUPLICATE KEY UPDATE setting_value = ?`,
      [userId, JSON.stringify({ dateType, startDate, endDate }), JSON.stringify({ dateType, startDate, endDate })]
    );

    res.json({
      success: true,
      message: 'Default date saved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save default offer preference
 * POST /api/settings/default-offer
 */
export const saveDefaultOffer = async (req, res, next) => {
  try {
    const { offerId } = req.body;
    const userId = req.user.id;

    await pool.execute(
      `INSERT INTO user_settings (user_id, setting_key, setting_value)
       VALUES (?, 'default_offer', ?)
       ON DUPLICATE KEY UPDATE setting_value = ?`,
      [userId, offerId, offerId]
    );

    res.json({
      success: true,
      message: 'Default offer saved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save custom report
 * POST /api/reports
 */
export const saveReport = async (req, res, next) => {
  try {
    const { name, description, config, isDefault } = req.body;
    const userId = req.user.id;

    if (!name || !config) {
      throw new ApiError(400, 'Report name and config are required');
    }

    // If setting as default, unset other defaults first
    if (isDefault) {
      await pool.execute(
        'UPDATE saved_reports SET is_default = 0 WHERE user_id = ?',
        [userId]
      );
    }

    const [result] = await pool.execute(
      `INSERT INTO saved_reports (user_id, name, description, config, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, name, description || null, JSON.stringify(config), isDefault ? 1 : 0]
    );

    res.json({
      success: true,
      message: 'Report saved successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update saved report
 * PUT /api/reports/:id
 */
export const updateReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, config, isDefault } = req.body;
    const userId = req.user.id;

    // Verify ownership
    const [existing] = await pool.execute(
      'SELECT id FROM saved_reports WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (existing.length === 0) {
      throw new ApiError(404, 'Report not found');
    }

    // If setting as default, unset other defaults first
    if (isDefault) {
      await pool.execute(
        'UPDATE saved_reports SET is_default = 0 WHERE user_id = ?',
        [userId]
      );
    }

    await pool.execute(
      `UPDATE saved_reports
       SET name = ?, description = ?, config = ?, is_default = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [name, description || null, JSON.stringify(config), isDefault ? 1 : 0, id, userId]
    );

    res.json({
      success: true,
      message: 'Report updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get saved reports
 * GET /api/reports
 */
export const getSavedReports = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.execute(
      'SELECT * FROM saved_reports WHERE user_id = ? ORDER BY is_default DESC, name',
      [userId]
    );

    // Parse config JSON
    const reports = rows.map(row => ({
      ...row,
      config: JSON.parse(row.config || '{}')
    }));

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save column set
 * POST /api/column-sets
 */
export const saveColumnSet = async (req, res, next) => {
  try {
    const { name, columns, reportType } = req.body;
    const userId = req.user.id;

    if (!name || !columns) {
      throw new ApiError(400, 'Name and columns are required');
    }

    const [result] = await pool.execute(
      `INSERT INTO user_column_sets (user_id, name, columns, report_type, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, name, JSON.stringify(columns), reportType || null]
    );

    res.json({
      success: true,
      message: 'Column set saved successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get column sets
 * GET /api/column-sets
 */
export const getColumnSets = async (req, res, next) => {
  try {
    const { reportType } = req.query;
    const userId = req.user.id;

    let sql = 'SELECT * FROM user_column_sets WHERE user_id = ?';
    const params = [userId];

    if (reportType) {
      sql += ' AND report_type = ?';
      params.push(reportType);
    }

    sql += ' ORDER BY name';

    const [rows] = await pool.execute(sql, params);

    const columnSets = rows.map(row => ({
      ...row,
      columns: JSON.parse(row.columns || '[]')
    }));

    res.json({
      success: true,
      data: columnSets
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete column set
 * DELETE /api/column-sets/:id
 */
export const deleteColumnSet = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [result] = await pool.execute(
      'DELETE FROM user_column_sets WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      throw new ApiError(404, 'Column set not found');
    }

    res.json({
      success: true,
      message: 'Column set deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save filter preset
 * POST /api/filters
 */
export const saveFilter = async (req, res, next) => {
  try {
    const { name, filters, reportType } = req.body;
    const userId = req.user.id;

    if (!name || !filters) {
      throw new ApiError(400, 'Name and filters are required');
    }

    const [result] = await pool.execute(
      `INSERT INTO user_filters (user_id, name, filters, report_type, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, name, JSON.stringify(filters), reportType || null]
    );

    res.json({
      success: true,
      message: 'Filter saved successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get saved filters
 * GET /api/filters
 */
export const getFilters = async (req, res, next) => {
  try {
    const { reportType } = req.query;
    const userId = req.user.id;

    let sql = 'SELECT * FROM user_filters WHERE user_id = ?';
    const params = [userId];

    if (reportType) {
      sql += ' AND report_type = ?';
      params.push(reportType);
    }

    sql += ' ORDER BY name';

    const [rows] = await pool.execute(sql, params);

    const filters = rows.map(row => ({
      ...row,
      filters: JSON.parse(row.filters || '{}')
    }));

    res.json({
      success: true,
      data: filters
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete filter
 * DELETE /api/filters/:id
 */
export const deleteFilter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [result] = await pool.execute(
      'DELETE FROM user_filters WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      throw new ApiError(404, 'Filter not found');
    }

    res.json({
      success: true,
      message: 'Filter deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save timezone preference
 * POST /api/settings/timezone
 */
export const saveTimezone = async (req, res, next) => {
  try {
    const { timezone } = req.body;
    const userId = req.user.id;

    await pool.execute(
      `INSERT INTO user_settings (user_id, setting_key, setting_value)
       VALUES (?, 'timezone', ?)
       ON DUPLICATE KEY UPDATE setting_value = ?`,
      [userId, timezone, timezone]
    );

    res.json({
      success: true,
      message: 'Timezone saved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Import sales data
 * POST /api/sales/import
 */
export const importSales = async (req, res, next) => {
  try {
    const { sales } = req.body;

    if (!sales || !Array.isArray(sales)) {
      throw new ApiError(400, 'Sales data array is required');
    }

    const db = req.tenantPool || pool;
    let imported = 0;

    for (const sale of sales) {
      await db.execute(
        `INSERT INTO sales (date, offer_id, affiliate_id, amount, status, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [sale.date, sale.offerId, sale.affiliateId, sale.amount, sale.status || 'pending']
      );
      imported++;
    }

    res.json({
      success: true,
      message: `Imported ${imported} sales records`
    });
  } catch (error) {
    next(error);
  }
};

export default {
  saveDefaultDate,
  saveDefaultOffer,
  saveReport,
  updateReport,
  getSavedReports,
  saveColumnSet,
  getColumnSets,
  deleteColumnSet,
  saveFilter,
  getFilters,
  deleteFilter,
  saveTimezone,
  importSales
};
