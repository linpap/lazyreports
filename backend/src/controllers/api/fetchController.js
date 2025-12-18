import pool, { analyticsPool, getTenantConnection } from '../../config/database.js';
import { ApiError } from '../../middleware/errorHandler.js';

/**
 * Build hierarchical data structure from flat grouped rows
 * @param {Array} rows - Flat array of data rows with multiple group columns
 * @param {Array} groupByFields - Array of field names used for grouping
 * @returns {Array} - Hierarchical nested data structure
 */
const buildHierarchicalData = (rows, groupByFields) => {
  if (!rows.length || groupByFields.length <= 1) {
    // Add IDs to flat rows
    return rows.map((row, idx) => ({
      ...row,
      id: `row-${idx}`
    }));
  }

  let idCounter = 0;
  const generateId = (prefix = 'node') => `${prefix}-${idCounter++}`;

  // Group data hierarchically
  const grouped = {};

  rows.forEach(row => {
    // Get the first level key
    const level1Key = String(row[groupByFields[0]] || 'Unknown');

    if (!grouped[level1Key]) {
      grouped[level1Key] = {
        id: generateId('l0'),
        label: level1Key,
        grouping: level1Key,
        [groupByFields[0]]: row[groupByFields[0]],
        visitors: 0,
        engaged: 0,
        sales: 0,
        revenue: 0,
        children: [],
        _childMap: {}
      };
    }

    // Accumulate totals for level 1
    grouped[level1Key].visitors += Number(row.visitors) || 0;
    grouped[level1Key].engaged += Number(row.engaged) || 0;
    grouped[level1Key].sales += Number(row.sales) || 0;
    grouped[level1Key].revenue += Number(row.revenue) || 0;

    // Build child hierarchy for remaining levels
    let currentLevel = grouped[level1Key];
    // Track parent values for propagation to children
    const parentValues = {
      [groupByFields[0]]: row[groupByFields[0]]
    };

    for (let i = 1; i < groupByFields.length; i++) {
      const field = groupByFields[i];
      const fieldValue = String(row[field] || 'Unknown');

      if (!currentLevel._childMap[fieldValue]) {
        const childNode = {
          id: generateId(`l${i}`),
          label: fieldValue,
          grouping: fieldValue,
          [field]: row[field],
          // Propagate all parent groupBy values to children for filtering
          ...parentValues,
          _level: i,
          _levelField: field,
          visitors: 0,
          engaged: 0,
          sales: 0,
          revenue: 0,
          children: [],
          _childMap: {}
        };
        currentLevel._childMap[fieldValue] = childNode;
        currentLevel.children.push(childNode);
      }

      // Add current field to parentValues for next level
      parentValues[field] = row[field];

      currentLevel = currentLevel._childMap[fieldValue];

      // For the last level, use actual row values
      if (i === groupByFields.length - 1) {
        currentLevel.visitors = Number(row.visitors) || 0;
        currentLevel.engaged = Number(row.engaged) || 0;
        currentLevel.engage_rate = Number(row.engage_rate) || 0;
        currentLevel.sales = Number(row.sales) || 0;
        currentLevel.sales_rate = Number(row.sales_rate) || 0;
        currentLevel.revenue = Number(row.revenue) || 0;
        currentLevel.aov = Number(row.aov) || 0;
        currentLevel.epc = Number(row.epc) || 0;
        currentLevel.fraud = Number(row.fraud) || 0;
      } else {
        // Accumulate for intermediate levels
        currentLevel.visitors += Number(row.visitors) || 0;
        currentLevel.engaged += Number(row.engaged) || 0;
        currentLevel.sales += Number(row.sales) || 0;
        currentLevel.revenue += Number(row.revenue) || 0;
      }
    }
  });

  // Convert to array and calculate rates for aggregated levels
  const result = Object.values(grouped).map(item => {
    // Calculate rates for level 1
    item.engage_rate = item.visitors > 0 ? Math.round((item.engaged / item.visitors) * 10000) / 100 : 0;
    item.sales_rate = item.visitors > 0 ? Math.round((item.sales / item.visitors) * 10000) / 100 : 0;
    item.aov = item.sales > 0 ? Math.round((item.revenue / item.sales) * 100) / 100 : 0;
    item.epc = item.visitors > 0 ? Math.round((item.revenue / item.visitors) * 10000) / 10000 : 0;
    item.fraud = 0; // Will be recalculated if needed

    // Recursively clean and calculate rates for children
    const cleanChildren = (node) => {
      delete node._childMap;
      if (node.children && node.children.length > 0) {
        // Sort children by visitors descending
        node.children.sort((a, b) => b.visitors - a.visitors);
        node.children.forEach(child => {
          if (child._level < groupByFields.length - 1) {
            child.engage_rate = child.visitors > 0 ? Math.round((child.engaged / child.visitors) * 10000) / 100 : 0;
            child.sales_rate = child.visitors > 0 ? Math.round((child.sales / child.visitors) * 10000) / 100 : 0;
            child.aov = child.sales > 0 ? Math.round((child.revenue / child.sales) * 100) / 100 : 0;
            child.epc = child.visitors > 0 ? Math.round((child.revenue / child.visitors) * 10000) / 10000 : 0;
            child.fraud = 0;
          }
          cleanChildren(child);
        });
      } else {
        delete node.children;
      }
    };

    cleanChildren(item);
    return item;
  });

  // Sort by visitors descending
  result.sort((a, b) => b.visitors - a.visitors);

  return result;
};

/**
 * Get user's default offer from DB
 * Table: user_default_offer (user_id, dkey)
 */
const getDefaultOfferFromDb = async (userId) => {
  try {
    const [rows] = await analyticsPool.execute(
      `SELECT d.dkey, d.name
       FROM lazysauce_analytics.user_default_offer udo
       JOIN lazysauce.domain d ON udo.dkey = d.dkey
       WHERE udo.user_id = ?
       LIMIT 1`,
      [userId]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error fetching default offer:', error.message);
    return null;
  }
};

/**
 * Get user's available domains/offers
 * GET /api/domains
 *
 * Returns the list of domains (offers) the current user has access to
 * Also includes the user's default offer if one is set
 */
export const getUserDomains = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.json({
        success: true,
        data: [],
        defaultOffer: null
      });
    }

    const userDkeys = await getUserDkeys(userId);
    const defaultOffer = await getDefaultOfferFromDb(userId);

    res.json({
      success: true,
      data: userDkeys,
      defaultOffer: defaultOffer
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's default offer
 * GET /api/default-offer
 */
export const getDefaultOffer = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.json({
        success: true,
        data: null
      });
    }

    const defaultOffer = await getDefaultOfferFromDb(userId);

    res.json({
      success: true,
      data: defaultOffer
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save/update user's default offer
 * POST /api/default-offer
 */
export const saveDefaultOffer = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { dkey, offerName } = req.body;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    // Handle delete request
    if (offerName === 'Default Offer Deleted' || dkey === null) {
      await analyticsPool.execute(
        'DELETE FROM lazysauce_analytics.user_default_offer WHERE user_id = ?',
        [userId]
      );
      return res.json({
        success: true,
        message: 'Default offer deleted'
      });
    }

    if (!dkey) {
      throw new ApiError(400, 'dkey is required');
    }

    // Check if user already has a default offer
    const [existing] = await analyticsPool.execute(
      'SELECT * FROM lazysauce_analytics.user_default_offer WHERE user_id = ?',
      [userId]
    );

    if (existing.length === 0) {
      // Insert new default offer
      await analyticsPool.execute(
        'INSERT INTO lazysauce_analytics.user_default_offer (user_id, dkey) VALUES (?, ?)',
        [userId, dkey]
      );
    } else {
      // Update existing default offer
      await analyticsPool.execute(
        'UPDATE lazysauce_analytics.user_default_offer SET dkey = ? WHERE user_id = ?',
        [dkey, userId]
      );
    }

    res.json({
      success: true,
      message: 'Default offer saved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's available domains/dkeys from the database
 * Users are associated with advertisers via user_advertiser table
 * Each advertiser's domain has a dkey which corresponds to a database: lazysauce_[dkey]
 */
const getUserDkeys = async (userId) => {
  try {
    const [rows] = await analyticsPool.execute(
      `SELECT DISTINCT d.dkey, d.name
       FROM lazysauce.domain d
       JOIN lazysauce_analytics.user_advertiser ua ON ua.advertiser_id = d.aid
       WHERE ua.user_id = ?`,
      [userId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching user dkeys:', error.message);
    return [];
  }
};

/**
 * Fetch analytics data
 * GET /api/analytics
 *
 * Uses actual tables: lazysauce_[dkey].visit and lazysauce_[dkey].action
 * Dynamically determines dkey based on logged-in user's associated domains
 *
 * Supports filters: channel, subchannel, country, keyword, iporg, page_action
 * matchType: 'any' (OR logic) or 'all' (AND logic)
 */
export const getAnalytics = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      channel,
      subchannel,
      country,
      keyword,
      iporg,
      page_action,
      matchType = 'any',
      groupBy = 'date',
      dkey // Allow explicit dkey override
    } = req.query;

    const userId = req.user?.id;
    let tenantDkey = dkey;

    // If no explicit dkey, get user's first available domain
    if (!tenantDkey && userId) {
      const userDkeys = await getUserDkeys(userId);
      if (userDkeys.length > 0) {
        tenantDkey = userDkeys[0].dkey;
      }
    }

    // If still no dkey, return empty data (user has no domain access)
    if (!tenantDkey) {
      return res.json({
        success: true,
        data: [],
        message: 'No domain access configured for this user'
      });
    }

    const tenantDb = `lazysauce_${tenantDkey}`;
    const db = pool;

    // Build base query with IP join for country/iporg filters
    const needsIpJoin = country || iporg;
    const needsActionJoin = page_action;

    let sql = `
      SELECT
        DATE(v.date_created) as date,
        COUNT(DISTINCT v.pkey) as clicks,
        COUNT(CASE WHEN a.revenue > 0 THEN 1 END) as conversions,
        COALESCE(SUM(a.revenue), 0) as revenue,
        0 as cost
      FROM ${tenantDb}.visit v
      LEFT JOIN ${tenantDb}.action a ON v.pkey = a.pkey
      ${needsIpJoin ? 'LEFT JOIN lazysauce.ip ip ON v.ip = ip.address' : ''}
      WHERE v.is_bot = 0
    `;
    const params = [];

    // Date filters
    if (startDate) {
      sql += ' AND DATE(v.date_created) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND DATE(v.date_created) <= ?';
      params.push(endDate);
    }

    // Build filter conditions
    const filterConditions = [];

    // Channel filter (comma-separated values)
    if (channel) {
      const channels = channel.split(',').map(c => c.trim()).filter(c => c);
      if (channels.length > 0) {
        const placeholders = channels.map(() => '?').join(',');
        filterConditions.push(`v.channel IN (${placeholders})`);
        params.push(...channels);
      }
    }

    // Subchannel filter
    if (subchannel) {
      const subchannels = subchannel.split(',').map(c => c.trim()).filter(c => c);
      if (subchannels.length > 0) {
        const placeholders = subchannels.map(() => '?').join(',');
        filterConditions.push(`v.subchannel IN (${placeholders})`);
        params.push(...subchannels);
      }
    }

    // Country filter (from IP table)
    if (country) {
      const countries = country.split(',').map(c => c.trim()).filter(c => c);
      if (countries.length > 0) {
        const placeholders = countries.map(() => '?').join(',');
        filterConditions.push(`ip.country IN (${placeholders})`);
        params.push(...countries);
      }
    }

    // Keyword filter (using channel as fallback since keyword/rawword columns don't exist)
    if (keyword) {
      const keywords = keyword.split(',').map(k => k.trim()).filter(k => k);
      if (keywords.length > 0) {
        const placeholders = keywords.map(() => '?').join(',');
        filterConditions.push(`v.channel IN (${placeholders})`);
        params.push(...keywords);
      }
    }

    // IP Organization filter
    if (iporg) {
      const iporgs = iporg.split(',').map(o => o.trim()).filter(o => o);
      if (iporgs.length > 0) {
        const placeholders = iporgs.map(() => '?').join(',');
        filterConditions.push(`ip.org IN (${placeholders})`);
        params.push(...iporgs);
      }
    }

    // Page/Action filter
    if (page_action) {
      const actions = page_action.split(',').map(a => a.trim()).filter(a => a);
      if (actions.length > 0) {
        const placeholders = actions.map(() => '?').join(',');
        filterConditions.push(`a.action IN (${placeholders})`);
        params.push(...actions);
      }
    }

    // Apply filter conditions with match type
    if (filterConditions.length > 0) {
      const connector = matchType === 'all' ? ' AND ' : ' OR ';
      sql += ` AND (${filterConditions.join(connector)})`;
    }

    sql += ' GROUP BY DATE(v.date_created) ORDER BY date ASC';

    const [rows] = await db.execute(sql, params);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch full analytics report with grouping support
 * GET /api/analytics/report
 *
 * Supports grouping by: channel, subchannel, country, keyword, rawword, date, etc.
 * Returns metrics: visitors, engaged, engage_rate, sales, sales_rate, revenue, aov, epc
 */
export const getAnalyticsReport = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      channel,
      subchannel,
      country,
      keyword,
      iporg,
      page_action,
      matchType = 'any',
      groupBy = 'channel', // Default grouping field
      dkey,
      includeBots = 'false',
      usePostDate = 'false',
      timezone // User's timezone (e.g., 'America/New_York', '-05:00')
    } = req.query;

    const shouldIncludeBots = includeBots === 'true';
    const shouldUsePostDate = usePostDate === 'true';
    // Get timezone from query param or user profile
    const userTimezone = timezone || req.user?.timezone || '+00:00';

    const userId = req.user?.id;
    let tenantDkey = dkey;

    if (!tenantDkey && userId) {
      const userDkeys = await getUserDkeys(userId);
      if (userDkeys.length > 0) {
        tenantDkey = userDkeys[0].dkey;
      }
    }

    if (!tenantDkey) {
      return res.json({
        success: true,
        data: [],
        message: 'No domain access configured for this user'
      });
    }

    const tenantDb = `lazysauce_${tenantDkey}`;
    const db = pool;

    // Map groupBy field to SQL column
    const groupByMap = {
      'channel': 'v.channel',
      'subchannel': 'v.subchannel',
      'subchannel_stripped': 'SUBSTRING_INDEX(v.subchannel, "_", 1)',
      'country': 'ip.country',
      'keyword': 'v.target',
      'rawword': 'v.target',
      'state': 'ip.state',
      'device_type': 'd.device_type',
      'os': 'd.os',
      'os_version': "CONCAT(d.os, ' ', d.os_version)",
      'browser': 'd.browser',
      'browser_version': "CONCAT(d.browser, ' ', d.browser_version)",
      'day_of_week': 'DAYNAME(v.date_created)',
      'hour': 'HOUR(v.date_created)',
      'landing_page': 'landing_action.name',
      'landing_page_variant': "CONCAT(landing_action.name, ' - Variant: ', COALESCE(v.variant, 0))",
      'state_city': "CONCAT(ip.state, ', ', ip.city)",
      'source_domain': 'v.subchannel',
      'ip': 'v.ip',
      'ip_org': 'ip.org',
      'isp': 'ip.isp',
      'date': 'DATE(v.date_created)',
      'date_dow': "CONCAT(DATE(v.date_created), ' (', DAYNAME(v.date_created), ')')"
    };

    // Parse all groupBy fields
    const groupByFields = groupBy.split(',').map(g => g.trim()).filter(g => g);
    const firstGroupBy = groupByFields[0] || 'channel';

    // Build group columns and select expressions for all group fields
    const groupColumns = groupByFields.map(field => groupByMap[field] || 'v.channel');
    const groupSelectParts = groupByFields.map((field, idx) =>
      `${groupColumns[idx]} as \`${field}\``
    );

    // Build joins based on what's needed (check all groupBy fields)
    const needsIpJoin = groupByFields.some(f => ['country', 'state', 'state_city', 'ip_org', 'isp'].includes(f)) || country || iporg;
    const needsDeviceJoin = groupByFields.some(f => ['device_type', 'os', 'os_version', 'browser', 'browser_version'].includes(f));
    const needsLandingPageJoin = groupByFields.some(f => ['landing_page', 'landing_page_variant'].includes(f));

    // Always join IP table for fraud detection
    const alwaysNeedsIpJoin = true;

    // Optimized query - use action.action column (action order) to determine engaged
    // If a visitor has an action with action > 1, they have 2+ actions (engaged)
    let sql = `
      SELECT
        ${groupColumns[0]} as label,
        ${groupSelectParts.join(',\n        ')},
        COUNT(DISTINCT v.pkey) as visitors,
        COUNT(DISTINCT CASE WHEN a.action > 1 THEN v.pkey END) as engaged,
        ROUND(COUNT(DISTINCT CASE WHEN a.action > 1 THEN v.pkey END) / NULLIF(COUNT(DISTINCT v.pkey), 0) * 100, 2) as engage_rate,
        COUNT(CASE WHEN a.revenue > 0 THEN 1 END) as sales,
        ROUND(COUNT(CASE WHEN a.revenue > 0 THEN 1 END) / NULLIF(COUNT(DISTINCT v.pkey), 0) * 100, 2) as sales_rate,
        COALESCE(SUM(a.revenue), 0) as revenue,
        ROUND(COALESCE(SUM(a.revenue) / NULLIF(COUNT(CASE WHEN a.revenue > 0 THEN 1 END), 0), 0), 2) as aov,
        ROUND(COALESCE(SUM(a.revenue) / NULLIF(COUNT(DISTINCT v.pkey), 0), 0), 4) as epc,
        ROUND(COALESCE(SUM(CASE WHEN ip.is_proxy = 1 OR ip.is_crawler = 1 OR COALESCE(ip.threat_level, 0) > 0 THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT v.pkey), 0) * 100, 0), 2) as fraud
      FROM ${tenantDb}.visit v
      LEFT JOIN ${tenantDb}.action a ON v.pkey = a.pkey
      ${alwaysNeedsIpJoin || needsIpJoin ? 'LEFT JOIN lazysauce.ip ip ON v.ip = ip.address' : ''}
      ${needsDeviceJoin ? 'LEFT JOIN lazysauce.device d ON v.device_id = d.id' : ''}
      ${needsLandingPageJoin ? `LEFT JOIN ${tenantDb}.action landing_action ON v.pkey = landing_action.pkey AND landing_action.action = 1` : ''}
      WHERE 1=1
      ${shouldIncludeBots ? '' : ' AND v.is_bot = 0'}
    `;
    const params = [];

    // Date filters - use post_date if specified, otherwise date_created
    // Apply timezone conversion to match user's selected timezone
    const dateColumn = shouldUsePostDate ? 'v.post_date' : 'v.date_created';
    const tzDateColumn = `CONVERT_TZ(${dateColumn}, '+00:00', '${userTimezone}')`;

    if (startDate) {
      sql += ` AND DATE(${tzDateColumn}) >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND DATE(${tzDateColumn}) <= ?`;
      params.push(endDate);
    }

    // Build filter conditions
    const filterConditions = [];

    if (channel) {
      const channels = channel.split(',').map(c => c.trim()).filter(c => c);
      if (channels.length > 0) {
        const placeholders = channels.map(() => '?').join(',');
        filterConditions.push(`v.channel IN (${placeholders})`);
        params.push(...channels);
      }
    }

    if (subchannel) {
      const subchannels = subchannel.split(',').map(c => c.trim()).filter(c => c);
      if (subchannels.length > 0) {
        const placeholders = subchannels.map(() => '?').join(',');
        filterConditions.push(`v.subchannel IN (${placeholders})`);
        params.push(...subchannels);
      }
    }

    if (country) {
      const countries = country.split(',').map(c => c.trim()).filter(c => c);
      if (countries.length > 0) {
        const placeholders = countries.map(() => '?').join(',');
        filterConditions.push(`ip.country IN (${placeholders})`);
        params.push(...countries);
      }
    }

    if (keyword) {
      const keywords = keyword.split(',').map(k => k.trim()).filter(k => k);
      if (keywords.length > 0) {
        const placeholders = keywords.map(() => '?').join(',');
        filterConditions.push(`v.channel IN (${placeholders})`);
        params.push(...keywords);
      }
    }

    if (iporg) {
      const iporgs = iporg.split(',').map(o => o.trim()).filter(o => o);
      if (iporgs.length > 0) {
        const placeholders = iporgs.map(() => '?').join(',');
        filterConditions.push(`ip.org IN (${placeholders})`);
        params.push(...iporgs);
      }
    }

    if (page_action) {
      const actions = page_action.split(',').map(a => a.trim()).filter(a => a);
      if (actions.length > 0) {
        const placeholders = actions.map(() => '?').join(',');
        filterConditions.push(`a.action IN (${placeholders})`);
        params.push(...actions);
      }
    }

    // Apply filter conditions
    if (filterConditions.length > 0) {
      const connector = matchType === 'all' ? ' AND ' : ' OR ';
      sql += ` AND (${filterConditions.join(connector)})`;
    }

    sql += ` GROUP BY ${groupColumns.join(', ')}`;
    sql += ' ORDER BY visitors DESC';
    sql += ' LIMIT 1000'; // Safety limit

    const [rows] = await db.execute(sql, params);

    // Build hierarchical data if multiple groupBy fields
    let responseData = rows;
    if (groupByFields.length > 1) {
      responseData = buildHierarchicalData(rows, groupByFields);
    }

    // Helper function to add links to a node, collecting all parent groupBy values
    const baseDetailUrl = '/api/analytics/detail';
    const addLinksToNode = (node, parentValues = {}) => {
      // Build filter params from all groupBy field values
      const filterParams = [];
      filterParams.push(`startDate=${startDate}`);
      filterParams.push(`endDate=${endDate}`);
      filterParams.push(`dkey=${tenantDkey}`);

      // Collect all groupBy field values (from parents and current node)
      const allValues = { ...parentValues };

      // For flat data (single groupBy), use label for first field
      // For hierarchical data, each node has its field value
      groupByFields.forEach((field, idx) => {
        // Check if this node has the field value directly
        if (node[field] !== undefined && node[field] !== null && node[field] !== '') {
          allValues[field] = node[field];
        } else if (idx === 0 && !allValues[field] && node.label !== undefined && node.label !== null && node.label !== '') {
          // First field is aliased as 'label' - only use if not already set by parent
          allValues[field] = node.label;
        }
      });

      // Add all collected field values to params
      groupByFields.forEach((field) => {
        const value = allValues[field];
        if (value !== undefined && value !== null && value !== '') {
          filterParams.push(`${field}=${encodeURIComponent(value)}`);
        }
      });

      // Always include label for landing_page_variant filtering in detail endpoint
      // Use the first groupBy field value (usually landing_page_variant)
      const labelValue = allValues[groupByFields[0]] || node.label;
      if (labelValue) {
        filterParams.push(`label=${encodeURIComponent(labelValue)}`);
      }

      if (userTimezone) {
        filterParams.push(`timezone=${encodeURIComponent(userTimezone)}`);
      }

      const baseParams = filterParams.join('&');

      node.links = {
        visitors: `${baseDetailUrl}?${baseParams}&type=visitors`,
        engaged: `${baseDetailUrl}?${baseParams}&type=engaged`,
        sales: `${baseDetailUrl}?${baseParams}&type=sales`
      };

      // Recursively add links to children, passing down parent values
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          addLinksToNode(child, allValues);
        });
      }
    };

    // Add links to all nodes
    responseData.forEach(node => addLinksToNode(node, {}));

    res.json({
      success: true,
      data: responseData,
      groupByFields: groupByFields,
      isHierarchical: groupByFields.length > 1
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch detail records for drill-down
 * GET /api/analytics/detail
 *
 * Returns individual visit/action records for detail view
 */
export const getAnalyticsDetail = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      type = 'visitors', // visitors, engaged, sales
      channel,
      subchannel,
      subchannel_stripped, // Filter by stripped subchannel (part before underscore)
      country,
      keyword,
      search,
      limit = 100,
      offset = 0,
      dkey,
      timezone, // User's timezone
      variant, // Filter by variant
      page, // Filter by page name
      landing_page_variant, // Filter by landing page + variant combo (format: "PageName - Variant: VariantName")
      label, // Generic label filter (used when drilling down from report)
      // Additional groupBy field filters
      state,
      device_type,
      os,
      browser,
      ip_org
    } = req.query;

    // Get timezone from query param or user profile
    const userTimezone = timezone || req.user?.timezone || '+00:00';
    const userId = req.user?.id;
    let tenantDkey = dkey;

    if (!tenantDkey && userId) {
      const userDkeys = await getUserDkeys(userId);
      if (userDkeys.length > 0) {
        tenantDkey = userDkeys[0].dkey;
      }
    }

    if (!tenantDkey) {
      return res.json({
        success: true,
        data: [],
        message: 'No domain access configured for this user'
      });
    }

    const tenantDb = `lazysauce_${tenantDkey}`;
    const db = pool;

    let sql;
    const params = [];

    if (type === 'visitors') {
      sql = `
        SELECT
          CASE
            WHEN TIMESTAMPDIFF(MINUTE, v.date_created, NOW()) < 60
            THEN CONCAT(TIMESTAMPDIFF(MINUTE, v.date_created, NOW()), ' minutes')
            WHEN TIMESTAMPDIFF(HOUR, v.date_created, NOW()) < 24
            THEN CONCAT(TIMESTAMPDIFF(HOUR, v.date_created, NOW()), ' hours ',
                        MOD(TIMESTAMPDIFF(MINUTE, v.date_created, NOW()), 60), ' minutes')
            ELSE CONCAT(TIMESTAMPDIFF(DAY, v.date_created, NOW()), ' days')
          END as since_visit,
          v.pkey as visitor_id,
          (SELECT COUNT(*) FROM ${tenantDb}.action a2 WHERE a2.pkey = v.pkey) as total_actions,
          COALESCE((SELECT SUM(a2.revenue) FROM ${tenantDb}.action a2 WHERE a2.pkey = v.pkey), 0) as revenue,
          v.channel,
          v.subchannel,
          v.channel as keyword
        FROM ${tenantDb}.visit v
        WHERE v.is_bot = 0
      `;
    } else if (type === 'engaged') {
      // Highly optimized: Query action table directly for visitors with action > 1
      // This avoids scanning the entire visit table
      sql = `
        SELECT
          CASE
            WHEN TIMESTAMPDIFF(MINUTE, v.date_created, NOW()) < 60
            THEN CONCAT(TIMESTAMPDIFF(MINUTE, v.date_created, NOW()), ' minutes')
            WHEN TIMESTAMPDIFF(HOUR, v.date_created, NOW()) < 24
            THEN CONCAT(TIMESTAMPDIFF(HOUR, v.date_created, NOW()), ' hours ',
                        MOD(TIMESTAMPDIFF(MINUTE, v.date_created, NOW()), 60), ' minutes')
            ELSE CONCAT(TIMESTAMPDIFF(DAY, v.date_created, NOW()), ' days')
          END as since_visit,
          a.name as page,
          v.pkey as visitor_id,
          a.hash as action_id,
          a.action as total_actions,
          0 as revenue,
          v.channel,
          v.subchannel,
          v.channel as keyword
        FROM ${tenantDb}.action a
        JOIN ${tenantDb}.visit v ON v.pkey = a.pkey
        WHERE v.is_bot = 0 AND a.action = 2
      `;
    } else if (type === 'sales') {
      sql = `
        SELECT
          CASE
            WHEN TIMESTAMPDIFF(MINUTE, v.date_created, NOW()) < 60
            THEN CONCAT(TIMESTAMPDIFF(MINUTE, v.date_created, NOW()), ' minutes')
            WHEN TIMESTAMPDIFF(HOUR, v.date_created, NOW()) < 24
            THEN CONCAT(TIMESTAMPDIFF(HOUR, v.date_created, NOW()), ' hours ',
                        MOD(TIMESTAMPDIFF(MINUTE, v.date_created, NOW()), 60), ' minutes')
            ELSE CONCAT(TIMESTAMPDIFF(DAY, v.date_created, NOW()), ' days')
          END as since_visit,
          a.name as page,
          v.pkey as visitor_id,
          a.pkey as action_id,
          (SELECT COUNT(*) FROM ${tenantDb}.action a2 WHERE a2.pkey = v.pkey) as total_actions,
          CAST(a.revenue AS DECIMAL(10,2)) as revenue,
          v.channel,
          v.subchannel,
          v.channel as keyword
        FROM ${tenantDb}.action a
        JOIN ${tenantDb}.visit v ON a.pkey = v.pkey
        WHERE v.is_bot = 0 AND a.revenue > 0
      `;
    } else {
      return res.json({ success: true, data: [] });
    }

    // Date filters with timezone conversion
    const tzDateColumn = `CONVERT_TZ(v.date_created, '+00:00', '${userTimezone}')`;
    if (startDate) {
      sql += ` AND DATE(${tzDateColumn}) >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND DATE(${tzDateColumn}) <= ?`;
      params.push(endDate);
    }

    // Additional filters
    if (channel) {
      sql += ' AND v.channel = ?';
      params.push(channel);
    }

    if (subchannel) {
      sql += ' AND v.subchannel = ?';
      params.push(subchannel);
    }

    // Country filter disabled - ip table not available in detail queries
    // if (country) {
    //   sql += ' AND ip.country = ?';
    //   params.push(country);
    // }

    if (keyword) {
      sql += ' AND v.target = ?';
      params.push(keyword);
    }

    // Subchannel stripped filter (part before underscore)
    if (subchannel_stripped) {
      sql += ' AND SUBSTRING_INDEX(v.subchannel, "_", 1) = ?';
      params.push(subchannel_stripped);
    }

    // Variant/page filters for drill-down from report
    if (variant) {
      sql += ' AND a.variant = ?';
      params.push(variant);
    }

    if (page) {
      sql += ' AND a.name = ?';
      params.push(page);
    }

    // Landing page variant filter (format: "PageName - Variant: VariantName")
    if (landing_page_variant || label) {
      const filterValue = landing_page_variant || label;
      // Parse the combined format
      const match = filterValue.match(/^(.+?)\s*-\s*Variant:\s*(.+)$/);
      if (match) {
        const [, pageName, variantName] = match;
        // Need to join with landing action (action=1) to filter
        sql += ` AND EXISTS (
          SELECT 1 FROM ${tenantDb}.action landing
          WHERE landing.pkey = v.pkey
          AND landing.action = 1
          AND landing.name = ?
          AND landing.variant = ?
        )`;
        params.push(pageName.trim(), variantName.trim());
      } else {
        // Just filter by the label as page name
        sql += ` AND EXISTS (
          SELECT 1 FROM ${tenantDb}.action landing
          WHERE landing.pkey = v.pkey
          AND landing.action = 1
          AND landing.name = ?
        )`;
        params.push(filterValue);
      }
    }

    // Search filter - search across multiple fields
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      sql += ' AND (v.pkey LIKE ? OR v.channel LIKE ? OR v.subchannel LIKE ?)';
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    sql += ` ORDER BY ${type === 'visitors' ? 'v' : type === 'engaged' ? 'v' : 'a'}.date_created DESC`;
    // Fetch one extra record to determine if there are more pages
    sql += ` LIMIT ${limitNum + 1} OFFSET ${offsetNum}`;

    // Execute main query only - skip count query for performance
    const [rows] = await db.query(sql, params);

    // Check if we got more than limit - indicates more records exist
    const hasMore = rows.length > limitNum;
    // Only return the requested number of records
    const data = hasMore ? rows.slice(0, limitNum) : rows;

    res.json({
      success: true,
      data: data,
      total: -1, // Not calculated for performance
      hasMore: hasMore,
      limit: limitNum,
      offset: offsetNum
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch visitor details
 * GET /api/analytics/visitor/:id
 *
 * Returns detailed information about a specific visitor and all their actions
 */
export const getVisitorDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dkey } = req.query;
    const userId = req.user?.id;
    let tenantDkey = dkey;

    if (!tenantDkey && userId) {
      const userDkeys = await getUserDkeys(userId);
      if (userDkeys.length > 0) {
        tenantDkey = userDkeys[0].dkey;
      }
    }

    if (!tenantDkey) {
      return res.json({ success: true, data: null, message: 'No domain access' });
    }

    const tenantDb = `lazysauce_${tenantDkey}`;
    const db = pool;

    // Get visitor info with IP and device details
    const [visitors] = await db.query(`
      SELECT
        v.pkey as visitor_id,
        v.date_created,
        DATE_FORMAT(v.date_created, '%Y-%m-%d') as visit_date,
        TIME_FORMAT(v.date_created, '%H:%i:%s') as visit_time,
        INET6_NTOA(v.ip) as ip,
        v.channel,
        v.subchannel,
        v.target as keyword,
        v.variant,
        v.is_bot,
        v.did,
        ip.org as organization,
        ip.shortcountry as country,
        ip.state,
        ip.city,
        ip.timezone_offset,
        ip.is_proxy,
        ip.proxy_type,
        ip.is_crawler,
        ip.crawler_name,
        ip.is_tor,
        ip.threat_level,
        ip.is_bot as ip_is_bot,
        dom.name as domain_name,
        d.useragent as user_agent,
        d.os,
        d.os_version,
        d.browser,
        d.browser_version,
        d.is_bot as device_is_bot,
        d.is_mobile,
        d.is_smartphone,
        d.is_tablet,
        d.is_android,
        d.is_ios,
        d.brand,
        d.name as device_name,
        d.model as device_model,
        d.width as device_width,
        d.height as device_height,
        CASE
          WHEN d.is_tablet = 1 THEN 'Tablet'
          WHEN d.is_smartphone = 1 THEN 'Smartphone'
          WHEN d.is_mobile = 1 THEN 'Mobile'
          ELSE 'Desktop'
        END as device_type
      FROM ${tenantDb}.visit v
      LEFT JOIN lazysauce.ip ip ON v.ip = ip.address
      LEFT JOIN lazysauce.domain dom ON dom.dkey = ?
      LEFT JOIN lazysauce.device d ON v.did = d.did
      WHERE v.pkey = ?
    `, [tenantDkey, id]);

    if (visitors.length === 0) {
      return res.json({ success: true, data: null, message: 'Visitor not found' });
    }

    const visitor = visitors[0];

    // Get all actions for this visitor
    const [actions] = await db.query(`
      SELECT
        a.pkey as action_id,
        a.action as action_order,
        a.name as page,
        a.variant,
        DATE_FORMAT(a.date_created, '%Y-%m-%d') as date,
        TIME_FORMAT(a.date_created, '%H:%i:%s') as time,
        CAST(COALESCE(a.revenue, 0) AS DECIMAL(10,2)) as revenue,
        a.hash,
        CASE
          WHEN TIMESTAMPDIFF(MINUTE, v.date_created, a.date_created) < 60
          THEN CONCAT(TIMESTAMPDIFF(MINUTE, v.date_created, a.date_created), ' minutes')
          WHEN TIMESTAMPDIFF(HOUR, v.date_created, a.date_created) < 24
          THEN CONCAT(TIMESTAMPDIFF(HOUR, v.date_created, a.date_created), ' hours ',
                      MOD(TIMESTAMPDIFF(MINUTE, v.date_created, a.date_created), 60), ' minutes')
          ELSE CONCAT(TIMESTAMPDIFF(DAY, v.date_created, a.date_created), ' days')
        END as time_since_visit
      FROM ${tenantDb}.action a
      JOIN ${tenantDb}.visit v ON a.pkey = v.pkey
      WHERE a.pkey = ?
      ORDER BY a.action ASC
    `, [id]);

    // Get parameters for this visitor
    const [parameters] = await db.query(`
      SELECT
        'Visitor' as defined_at,
        name,
        value
      FROM ${tenantDb}.parameters
      WHERE pkey = ?
    `, [id]);

    res.json({
      success: true,
      data: {
        visitor,
        actions,
        parameters,
        total_actions: actions.length,
        total_revenue: actions.reduce((sum, a) => sum + (parseFloat(a.revenue) || 0), 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch action details
 * GET /api/analytics/action/:id
 *
 * Returns detailed information about a specific action
 */
export const getActionDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dkey } = req.query;
    const userId = req.user?.id;
    let tenantDkey = dkey;

    if (!tenantDkey && userId) {
      const userDkeys = await getUserDkeys(userId);
      if (userDkeys.length > 0) {
        tenantDkey = userDkeys[0].dkey;
      }
    }

    if (!tenantDkey) {
      return res.json({ success: true, data: null, message: 'No domain access' });
    }

    const tenantDb = `lazysauce_${tenantDkey}`;
    const db = pool;

    // Get action info with visitor, IP, and device details
    const [actions] = await db.query(`
      SELECT
        a.pkey as action_id,
        a.action as action_order,
        a.name as page,
        a.variant,
        CAST(COALESCE(a.revenue, 0) AS DECIMAL(10,2)) as revenue,
        a.hash,
        DATE_FORMAT(a.date_created, '%Y-%m-%d') as action_date,
        TIME_FORMAT(a.date_created, '%H:%i:%s') as action_time,
        v.pkey as visitor_id,
        v.date_created,
        DATE_FORMAT(v.date_created, '%Y-%m-%d') as visit_date,
        TIME_FORMAT(v.date_created, '%H:%i:%s') as visit_time,
        INET6_NTOA(v.ip) as ip,
        v.channel,
        v.subchannel,
        v.target as keyword,
        v.variant as visit_variant,
        v.is_bot,
        ip.org as organization,
        ip.shortcountry as country,
        ip.state,
        ip.city,
        ip.timezone_offset,
        ip.is_proxy,
        ip.proxy_type,
        ip.is_crawler,
        ip.crawler_name,
        ip.is_tor,
        ip.threat_level,
        dom.name as domain_name,
        d.useragent as user_agent,
        d.os,
        d.os_version,
        d.browser,
        d.browser_version,
        d.is_bot as device_is_bot,
        d.is_mobile,
        d.is_smartphone,
        d.is_tablet,
        d.is_android,
        d.is_ios,
        d.brand,
        d.name as device_name,
        d.model as device_model,
        d.width as device_width,
        d.height as device_height,
        CASE
          WHEN d.is_tablet = 1 THEN 'Tablet'
          WHEN d.is_smartphone = 1 THEN 'Smartphone'
          WHEN d.is_mobile = 1 THEN 'Mobile'
          ELSE 'Desktop'
        END as device_type,
        CASE
          WHEN TIMESTAMPDIFF(MINUTE, v.date_created, a.date_created) < 60
          THEN CONCAT(TIMESTAMPDIFF(MINUTE, v.date_created, a.date_created), ' minutes')
          WHEN TIMESTAMPDIFF(HOUR, v.date_created, a.date_created) < 24
          THEN CONCAT(TIMESTAMPDIFF(HOUR, v.date_created, a.date_created), ' hours ',
                      MOD(TIMESTAMPDIFF(MINUTE, v.date_created, a.date_created), 60), ' minutes')
          ELSE CONCAT(TIMESTAMPDIFF(DAY, v.date_created, a.date_created), ' days')
        END as time_since_visit
      FROM ${tenantDb}.action a
      JOIN ${tenantDb}.visit v ON a.pkey = v.pkey
      LEFT JOIN lazysauce.ip ip ON v.ip = ip.address
      LEFT JOIN lazysauce.domain dom ON dom.dkey = ?
      LEFT JOIN lazysauce.device d ON v.did = d.did
      WHERE a.hash = ?
    `, [tenantDkey, id]);

    if (actions.length === 0) {
      return res.json({ success: true, data: null, message: 'Action not found' });
    }

    const actionData = actions[0];

    // Get all actions for this visitor (to show in the actions table)
    const [allActions] = await db.query(`
      SELECT
        a.pkey as action_id,
        a.action as action_order,
        a.name as page,
        a.variant,
        DATE_FORMAT(a.date_created, '%Y-%m-%d') as date,
        TIME_FORMAT(a.date_created, '%H:%i:%s') as time,
        CAST(COALESCE(a.revenue, 0) AS DECIMAL(10,2)) as revenue,
        a.hash
      FROM ${tenantDb}.action a
      WHERE a.pkey = ?
      ORDER BY a.action ASC
    `, [actionData.visitor_id]);

    // Get parameters for this visitor
    const [parameters] = await db.query(`
      SELECT
        'Visitor' as defined_at,
        name,
        value
      FROM ${tenantDb}.parameters
      WHERE pkey = ?
    `, [actionData.visitor_id]);

    res.json({
      success: true,
      data: {
        ...actionData,
        actions: allActions,
        parameters,
        total_actions: allActions.length,
        total_revenue: allActions.reduce((sum, a) => sum + (parseFloat(a.revenue) || 0), 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch affiliate analytics
 * GET /api/analytics/affiliate
 *
 * Affiliate analytics come from the same visit/action tables, but filtered
 * by the affiliate's channel/subchannel as configured in affiliate_accounts
 */
export const getAffiliateAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, affiliateId, dkey } = req.query;
    const userId = req.user?.id;
    let tenantDkey = dkey;

    // If no explicit dkey, get user's first available domain
    if (!tenantDkey && userId) {
      const userDkeys = await getUserDkeys(userId);
      if (userDkeys.length > 0) {
        tenantDkey = userDkeys[0].dkey;
      }
    }

    // If still no dkey, return empty data
    if (!tenantDkey) {
      return res.json({
        success: true,
        data: []
      });
    }

    const tenantDb = `lazysauce_${tenantDkey}`;

    // If affiliateId provided, get affiliate's channel/subchannel for filtering
    let affiliateFilter = '';
    const params = [];

    if (affiliateId) {
      // Get affiliate info from affiliate_accounts
      const [affRows] = await analyticsPool.execute(
        'SELECT affiliate_channel, affiliate_subchannel, affiliate_percentage, affiliate_payout FROM affiliate_accounts WHERE affiliate_id = ?',
        [affiliateId]
      );

      if (affRows.length > 0) {
        const affiliate = affRows[0];
        if (affiliate.affiliate_channel) {
          affiliateFilter += ' AND v.channel = ?';
          params.push(affiliate.affiliate_channel);
        }
        if (affiliate.affiliate_subchannel) {
          affiliateFilter += ' AND v.subchannel = ?';
          params.push(affiliate.affiliate_subchannel);
        }
      }
    }

    let sql = `
      SELECT
        DATE(v.date_created) as date,
        v.channel,
        v.subchannel,
        COUNT(DISTINCT v.pkey) as clicks,
        COUNT(CASE WHEN a.revenue > 0 THEN 1 END) as conversions,
        COALESCE(SUM(a.revenue), 0) as revenue
      FROM ${tenantDb}.visit v
      LEFT JOIN ${tenantDb}.action a ON v.pkey = a.pkey
      WHERE v.is_bot = 0 ${affiliateFilter}
    `;

    if (startDate) {
      sql += ' AND DATE(v.date_created) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND DATE(v.date_created) <= ?';
      params.push(endDate);
    }

    sql += ' GROUP BY DATE(v.date_created), v.channel, v.subchannel ORDER BY date DESC';

    const [rows] = await pool.execute(sql, params);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch analytics map data (geographic)
 * GET /api/analytics/map
 *
 * Uses lazysauce_[dkey].visit joined with lazysauce.ip for country data
 */
export const getAnalyticsMap = async (req, res, next) => {
  try {
    const { startDate, endDate, dkey } = req.query;
    const userId = req.user?.id;
    let tenantDkey = dkey;

    // If no explicit dkey, get user's first available domain
    if (!tenantDkey && userId) {
      const userDkeys = await getUserDkeys(userId);
      if (userDkeys.length > 0) {
        tenantDkey = userDkeys[0].dkey;
      }
    }

    // If still no dkey, return empty data
    if (!tenantDkey) {
      return res.json({
        success: true,
        data: []
      });
    }

    const tenantDb = `lazysauce_${tenantDkey}`;
    const db = pool;

    let sql = `
      SELECT
        ip.country as country,
        ip.shortcountry as country_code,
        COUNT(DISTINCT v.pkey) as total,
        COUNT(DISTINCT v.pkey) as clicks,
        COUNT(CASE WHEN a.revenue > 0 THEN 1 END) as conversions
      FROM ${tenantDb}.visit v
      JOIN lazysauce.ip ip ON v.ip = ip.address
      LEFT JOIN ${tenantDb}.action a ON v.pkey = a.pkey
      WHERE v.is_bot = 0 AND ip.country IS NOT NULL
    `;
    const params = [];

    if (startDate) {
      sql += ' AND DATE(v.date_created) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND DATE(v.date_created) <= ?';
      params.push(endDate);
    }

    sql += ' GROUP BY ip.country, ip.shortcountry ORDER BY total DESC LIMIT 50';

    const [rows] = await db.execute(sql, params);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch IP actions
 * GET /api/ip-actions
 */
export const getIPActions = async (req, res, next) => {
  try {
    const { startDate, endDate, ip, action, limit = 100, offset = 0 } = req.query;
    const db = req.tenantPool || pool;

    let sql = 'SELECT * FROM ip_actions WHERE 1=1';
    const params = [];

    if (startDate) {
      sql += ' AND DATE(created_at) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND DATE(created_at) <= ?';
      params.push(endDate);
    }

    if (ip) {
      sql += ' AND ip_address LIKE ?';
      params.push(`%${ip}%`);
    }

    if (action) {
      sql += ' AND action = ?';
      params.push(action);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.execute(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM ip_actions WHERE 1=1';
    const countParams = [];

    if (startDate) {
      countSql += ' AND DATE(created_at) >= ?';
      countParams.push(startDate);
    }

    if (endDate) {
      countSql += ' AND DATE(created_at) <= ?';
      countParams.push(endDate);
    }

    const [countResult] = await db.execute(countSql, countParams);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch channels
 * GET /api/channels
 *
 * Uses lazysauce_[dkey].visit for channel data
 */
export const getChannels = async (req, res, next) => {
  try {
    const { dkey } = req.query;
    const userId = req.user?.id;
    let tenantDkey = dkey;

    // If no explicit dkey, get user's first available domain
    if (!tenantDkey && userId) {
      const userDkeys = await getUserDkeys(userId);
      if (userDkeys.length > 0) {
        tenantDkey = userDkeys[0].dkey;
      }
    }

    // If still no dkey, return empty data
    if (!tenantDkey) {
      return res.json({
        success: true,
        data: []
      });
    }

    const tenantDb = `lazysauce_${tenantDkey}`;
    const db = pool;

    const [rows] = await db.execute(
      `SELECT DISTINCT channel, subchannel FROM ${tenantDb}.visit WHERE channel IS NOT NULL ORDER BY channel LIMIT 100`
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch clients
 * GET /api/clients
 */
export const getClients = async (req, res, next) => {
  try {
    const { active, search, limit = 100, offset = 0 } = req.query;

    let sql = 'SELECT * FROM clients WHERE 1=1';
    const params = [];

    if (active !== undefined) {
      sql += ' AND active = ?';
      params.push(active === 'true' ? 1 : 0);
    }

    if (search) {
      sql += ' AND (name LIKE ? OR company LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY name LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.execute(sql, params);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch conversions
 * GET /api/conversions
 */
export const getConversions = async (req, res, next) => {
  try {
    const { startDate, endDate, offer, affiliate, limit = 100, offset = 0 } = req.query;
    const db = req.tenantPool || pool;

    let sql = 'SELECT * FROM conversions WHERE 1=1';
    const params = [];

    if (startDate) {
      sql += ' AND DATE(created_at) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND DATE(created_at) <= ?';
      params.push(endDate);
    }

    if (offer) {
      sql += ' AND offer_id = ?';
      params.push(offer);
    }

    if (affiliate) {
      sql += ' AND affiliate_id = ?';
      params.push(affiliate);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.execute(sql, params);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch offers
 * GET /api/offers
 */
export const getOffers = async (req, res, next) => {
  try {
    const { active, search } = req.query;
    const db = req.tenantPool || pool;

    let sql = 'SELECT * FROM offers WHERE 1=1';
    const params = [];

    if (active !== undefined) {
      sql += ' AND active = ?';
      params.push(active === 'true' ? 1 : 0);
    }

    if (search) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY name';

    const [rows] = await db.execute(sql, params);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch raw words/keywords
 * GET /api/rawwords
 */
export const getRawwords = async (req, res, next) => {
  try {
    const { startDate, endDate, type, limit = 100, offset = 0 } = req.query;
    const db = req.tenantPool || analyticsPool;

    let sql = `
      SELECT
        keyword,
        type,
        COUNT(*) as count,
        SUM(clicks) as clicks,
        SUM(conversions) as conversions
      FROM rawwords
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      sql += ' AND DATE(created_at) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND DATE(created_at) <= ?';
      params.push(endDate);
    }

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' GROUP BY keyword, type ORDER BY count DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.execute(sql, params);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Run custom SQL query (admin only)
 * POST /api/custom-sql
 */
export const runCustomSql = async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query) {
      throw new ApiError(400, 'SQL query is required');
    }

    // Security: Only allow SELECT queries
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery.startsWith('select')) {
      throw new ApiError(403, 'Only SELECT queries are allowed');
    }

    // Check for dangerous keywords
    const dangerousKeywords = ['drop', 'delete', 'update', 'insert', 'alter', 'create', 'truncate'];
    for (const keyword of dangerousKeywords) {
      if (normalizedQuery.includes(keyword)) {
        throw new ApiError(403, `Query contains forbidden keyword: ${keyword}`);
      }
    }

    const db = req.tenantPool || pool;
    const [rows] = await db.execute(query);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch averages
 * GET /api/averages
 *
 * Uses actual tables: lazysauce_[dkey].visit and lazysauce_[dkey].action
 */
export const getAverages = async (req, res, next) => {
  try {
    const { startDate, endDate, dkey } = req.query;
    const userId = req.user?.id;
    let tenantDkey = dkey;

    // If no explicit dkey, get user's first available domain
    if (!tenantDkey && userId) {
      const userDkeys = await getUserDkeys(userId);
      if (userDkeys.length > 0) {
        tenantDkey = userDkeys[0].dkey;
      }
    }

    // If still no dkey, return default values
    if (!tenantDkey) {
      return res.json({
        success: true,
        data: {
          avg_clicks: 0,
          avg_conversions: 0,
          avg_revenue: 0,
          avg_cost: 0,
          avg_conversion_rate: 0
        }
      });
    }

    const tenantDb = `lazysauce_${tenantDkey}`;
    const db = pool;

    // First get daily aggregates, then average them
    let sql = `
      SELECT
        AVG(daily_clicks) as avg_clicks,
        AVG(daily_conversions) as avg_conversions,
        AVG(daily_revenue) as avg_revenue,
        0 as avg_cost,
        AVG(CASE WHEN daily_clicks > 0 THEN daily_conversions / daily_clicks * 100 ELSE 0 END) as avg_conversion_rate
      FROM (
        SELECT
          DATE(v.date_created) as date,
          COUNT(DISTINCT v.pkey) as daily_clicks,
          COUNT(CASE WHEN a.revenue > 0 THEN 1 END) as daily_conversions,
          COALESCE(SUM(a.revenue), 0) as daily_revenue
        FROM ${tenantDb}.visit v
        LEFT JOIN ${tenantDb}.action a ON v.pkey = a.pkey
        WHERE v.is_bot = 0
    `;
    const params = [];

    if (startDate) {
      sql += ' AND DATE(v.date_created) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND DATE(v.date_created) <= ?';
      params.push(endDate);
    }

    sql += ' GROUP BY DATE(v.date_created)) as daily_stats';

    const [rows] = await db.execute(sql, params);

    res.json({
      success: true,
      data: rows[0] || {
        avg_clicks: 0,
        avg_conversions: 0,
        avg_revenue: 0,
        avg_cost: 0,
        avg_conversion_rate: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch weekly averages comparison
 * GET /api/averages/weekly
 *
 * Compares last 7 days against previous 3 weeks' averages by day of week
 */
export const getWeeklyAverages = async (req, res, next) => {
  try {
    const { dkey } = req.query;
    const userId = req.user?.id;
    let tenantDkey = dkey;

    if (!tenantDkey && userId) {
      const userDkeys = await getUserDkeys(userId);
      if (userDkeys.length > 0) {
        tenantDkey = userDkeys[0].dkey;
      }
    }

    if (!tenantDkey) {
      return res.json({
        success: true,
        data: { current: [], averages: [] }
      });
    }

    const tenantDb = `lazysauce_${tenantDkey}`;
    const db = pool;

    // Get current week data (last 7 days) by day of week
    const currentSql = `
      SELECT
        DAYNAME(v.date_created) as day_of_week,
        DAYOFWEEK(v.date_created) as day_num,
        DATE(v.date_created) as date,
        COUNT(DISTINCT v.pkey) as visitors,
        COALESCE(SUM(a.revenue), 0) as revenue,
        ROUND(COALESCE(SUM(a.revenue) / NULLIF(COUNT(DISTINCT v.pkey), 0), 0), 2) as epc
      FROM ${tenantDb}.visit v
      LEFT JOIN ${tenantDb}.action a ON v.pkey = a.pkey
      WHERE v.is_bot = 0
        AND DATE(v.date_created) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        AND DATE(v.date_created) <= CURDATE()
      GROUP BY DATE(v.date_created), DAYNAME(v.date_created), DAYOFWEEK(v.date_created)
      ORDER BY DATE(v.date_created) ASC
    `;

    // Get previous 3 weeks' averages by day of week
    const avgSql = `
      SELECT
        DAYNAME(v.date_created) as day_of_week,
        DAYOFWEEK(v.date_created) as day_num,
        ROUND(AVG(daily_visitors), 0) as avg_visitors,
        ROUND(AVG(daily_revenue), 2) as avg_revenue,
        ROUND(AVG(daily_epc), 2) as avg_epc
      FROM (
        SELECT
          DATE(v.date_created) as date,
          DAYNAME(v.date_created) as day_name,
          DAYOFWEEK(v.date_created) as day_num,
          COUNT(DISTINCT v.pkey) as daily_visitors,
          COALESCE(SUM(a.revenue), 0) as daily_revenue,
          ROUND(COALESCE(SUM(a.revenue) / NULLIF(COUNT(DISTINCT v.pkey), 0), 0), 2) as daily_epc
        FROM ${tenantDb}.visit v
        LEFT JOIN ${tenantDb}.action a ON v.pkey = a.pkey
        WHERE v.is_bot = 0
          AND DATE(v.date_created) >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
          AND DATE(v.date_created) < DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE(v.date_created)
      ) as daily_stats
      JOIN ${tenantDb}.visit v ON DAYOFWEEK(v.date_created) = daily_stats.day_num
      GROUP BY DAYOFWEEK(v.date_created), DAYNAME(v.date_created)
      ORDER BY DAYOFWEEK(v.date_created)
    `;

    // Simpler averages query
    const avgSqlSimple = `
      SELECT
        day_of_week,
        day_num,
        ROUND(AVG(daily_visitors), 0) as avg_visitors,
        ROUND(AVG(daily_revenue), 2) as avg_revenue,
        ROUND(AVG(daily_epc), 2) as avg_epc
      FROM (
        SELECT
          DAYNAME(v.date_created) as day_of_week,
          DAYOFWEEK(v.date_created) as day_num,
          DATE(v.date_created) as date,
          COUNT(DISTINCT v.pkey) as daily_visitors,
          COALESCE(SUM(a.revenue), 0) as daily_revenue,
          ROUND(COALESCE(SUM(a.revenue) / NULLIF(COUNT(DISTINCT v.pkey), 0), 0), 2) as daily_epc
        FROM ${tenantDb}.visit v
        LEFT JOIN ${tenantDb}.action a ON v.pkey = a.pkey
        WHERE v.is_bot = 0
          AND DATE(v.date_created) >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
          AND DATE(v.date_created) < DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE(v.date_created), DAYNAME(v.date_created), DAYOFWEEK(v.date_created)
      ) as daily_stats
      GROUP BY day_of_week, day_num
      ORDER BY day_num
    `;

    const [currentRows] = await db.query(currentSql);
    const [avgRows] = await db.query(avgSqlSimple);

    res.json({
      success: true,
      data: {
        current: currentRows,
        averages: avgRows
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch autocomplete suggestions
 * GET /api/approximate
 */
export const getApproximate = async (req, res, next) => {
  try {
    const { query, type, limit = 10, dkey } = req.query;
    const db = req.tenantPool || pool;

    if (!query || query.length < 1) {
      return res.json({ success: true, data: [] });
    }

    let sql;
    let params = [`%${query}%`, parseInt(limit)];
    let useAnalyticsPool = false;
    let useTenantDb = false;
    let tenantDbName = dkey ? `lazysauce_${dkey}` : null;

    switch (type) {
      case 'offer':
        sql = 'SELECT id, name as label FROM offers WHERE name LIKE ? LIMIT ?';
        break;
      case 'affiliate':
        sql = 'SELECT id, username as label FROM affiliates WHERE username LIKE ? LIMIT ?';
        break;
      case 'domain':
        sql = 'SELECT DISTINCT domain as label FROM analytics WHERE domain LIKE ? LIMIT ?';
        break;
      case 'channel':
        // Channels are stored in tenant DB visit table
        if (tenantDbName) {
          sql = `SELECT DISTINCT channel as id, channel as label FROM ${tenantDbName}.visit WHERE channel LIKE ? AND channel != '' LIMIT ?`;
        } else {
          sql = 'SELECT DISTINCT channel as id, channel as label FROM visit WHERE channel LIKE ? AND channel != \'\' LIMIT ?';
        }
        useTenantDb = true;
        break;
      case 'subchannel':
        if (tenantDbName) {
          sql = `SELECT DISTINCT subchannel as id, subchannel as label FROM ${tenantDbName}.visit WHERE subchannel LIKE ? AND subchannel != '' LIMIT ?`;
        } else {
          sql = 'SELECT DISTINCT subchannel as id, subchannel as label FROM visit WHERE subchannel LIKE ? AND subchannel != \'\' LIMIT ?';
        }
        useTenantDb = true;
        break;
      case 'country':
        // Countries are in main lazysauce DB
        sql = 'SELECT DISTINCT country as id, country as label FROM lazysauce.ip WHERE country LIKE ? AND country != \'\' LIMIT ?';
        break;
      case 'keyword':
        // Using channel as fallback since rawword column doesn't exist
        if (tenantDbName) {
          sql = `SELECT DISTINCT channel as id, channel as label FROM ${tenantDbName}.visit WHERE channel LIKE ? AND channel != '' LIMIT ?`;
        } else {
          sql = 'SELECT DISTINCT channel as id, channel as label FROM visit WHERE channel LIKE ? AND channel != \'\' LIMIT ?';
        }
        useTenantDb = true;
        break;
      case 'iporg':
        sql = 'SELECT DISTINCT org as id, org as label FROM lazysauce.ip WHERE org LIKE ? AND org != \'\' LIMIT ?';
        break;
      case 'page_action':
        if (tenantDbName) {
          sql = `SELECT DISTINCT action as id, action as label FROM ${tenantDbName}.action WHERE action LIKE ? AND action != '' LIMIT ?`;
        } else {
          sql = 'SELECT DISTINCT action as id, action as label FROM action WHERE action LIKE ? AND action != \'\' LIMIT ?';
        }
        useTenantDb = true;
        break;
      default:
        sql = 'SELECT DISTINCT keyword as label FROM rawwords WHERE keyword LIKE ? LIMIT ?';
    }

    const [rows] = await pool.execute(sql, params);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getUserDomains,
  getDefaultOffer,
  saveDefaultOffer,
  getAnalytics,
  getAffiliateAnalytics,
  getAnalyticsMap,
  getIPActions,
  getChannels,
  getClients,
  getConversions,
  getOffers,
  getRawwords,
  runCustomSql,
  getAverages,
  getWeeklyAverages,
  getApproximate
};
