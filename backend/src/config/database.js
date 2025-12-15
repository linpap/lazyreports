import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load env vars (in case not loaded yet)
dotenv.config();

// Debug: Log database names
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_ANALYTICS_NAME:', process.env.DB_ANALYTICS_NAME);

// Main database pool
const mainPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Read replica pool (for heavy read operations)
const readReplicaPool = mysql.createPool({
  host: process.env.DB_RR_HOST || process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Analytics database pool
const analyticsPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_ANALYTICS_NAME || 'lazysauce_analytics',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Multi-tenant database connection factory
// Creates a connection to a tenant-specific database (lazysauce_[tenant_id])
const getTenantPool = (tenantId) => {
  return mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: `lazysauce_${tenantId}`,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });
};

// Cache for tenant pools
const tenantPools = new Map();

// Get or create a tenant pool
export const getTenantConnection = (tenantId) => {
  if (!tenantPools.has(tenantId)) {
    tenantPools.set(tenantId, getTenantPool(tenantId));
  }
  return tenantPools.get(tenantId);
};

// Test database connection
export const testConnection = async () => {
  try {
    const connection = await mainPool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Close all pools (for graceful shutdown)
export const closeAllPools = async () => {
  await mainPool.end();
  await readReplicaPool.end();
  await analyticsPool.end();
  for (const pool of tenantPools.values()) {
    await pool.end();
  }
  tenantPools.clear();
};

export { mainPool, readReplicaPool, analyticsPool };
export default mainPool;
