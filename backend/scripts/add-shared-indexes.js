import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Index definitions for shared databases
const SHARED_INDEXES = {
  lazysauce: [
    // IP table indexes
    { table: 'ip', name: 'idx_ip_address', columns: '(address)' },
    { table: 'ip', name: 'idx_ip_country', columns: '(country)' },
    { table: 'ip', name: 'idx_ip_org', columns: '(org)' },

    // Domain table indexes
    { table: 'domain', name: 'idx_domain_aid', columns: '(aid)' },
    { table: 'domain', name: 'idx_domain_dkey', columns: '(dkey)' },

    // Device table indexes
    { table: 'device', name: 'idx_device_did', columns: '(did)' },
  ],

  lazysauce_analytics: [
    // User advertiser mapping indexes
    { table: 'user_advertiser', name: 'idx_user_advertiser_user_id', columns: '(user_id)' },
    { table: 'user_advertiser', name: 'idx_user_advertiser_advertiser_id', columns: '(advertiser_id)' },

    // Custom reports indexes
    { table: 'custom_reports', name: 'idx_custom_reports_advertiser_id', columns: '(advertiser_id)' },

    // IP actions indexes
    { table: 'ip_actions', name: 'idx_ip_actions_created_at', columns: '(created_at)' },
    { table: 'ip_actions', name: 'idx_ip_actions_ip', columns: '(ip)' },
  ],
};

// Create database connection
const createConnection = async (database) => {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: database,
    port: process.env.DB_PORT || 3306,
  });
};

// Check if index exists
const indexExists = async (connection, tableName, indexName) => {
  try {
    const [rows] = await connection.execute(
      `SHOW INDEX FROM ${tableName} WHERE Key_name = ?`,
      [indexName]
    );
    return rows.length > 0;
  } catch (error) {
    return false;
  }
};

// Check if table exists
const tableExists = async (connection, tableName) => {
  try {
    const [rows] = await connection.execute(
      `SHOW TABLES LIKE ?`,
      [tableName]
    );
    return rows.length > 0;
  } catch (error) {
    return false;
  }
};

// Add index to table
const addIndex = async (connection, tableName, indexName, columns) => {
  const sql = `ALTER TABLE ${tableName} ADD INDEX ${indexName} ${columns}`;
  await connection.execute(sql);
};

// Process a database
const processDatabase = async (dbName, indexes, dryRun = false) => {
  const results = {
    database: dbName,
    success: [],
    skipped: [],
    errors: [],
  };

  let connection;
  try {
    connection = await createConnection(dbName);
    console.log(`Connected to ${dbName}`);

    for (const index of indexes) {
      try {
        // Check if table exists
        const hasTable = await tableExists(connection, index.table);
        if (!hasTable) {
          results.skipped.push({
            index: index.name,
            reason: `Table '${index.table}' does not exist`,
          });
          console.log(`  ⏭️  ${index.table}.${index.name} - Table does not exist`);
          continue;
        }

        // Check if index already exists
        const hasIndex = await indexExists(connection, index.table, index.name);
        if (hasIndex) {
          results.skipped.push({
            index: index.name,
            reason: 'Index already exists',
          });
          console.log(`  ⏭️  ${index.table}.${index.name} - Already exists`);
          continue;
        }

        // Add the index
        if (dryRun) {
          results.success.push({
            index: index.name,
            table: index.table,
            note: 'Would be created (dry run)',
          });
          console.log(`  🔵 ${index.table}.${index.name} - Would be created (dry run)`);
        } else {
          console.log(`  ⏳ ${index.table}.${index.name} - Creating...`);
          await addIndex(connection, index.table, index.name, index.columns);
          results.success.push({
            index: index.name,
            table: index.table,
          });
          console.log(`  ✅ ${index.table}.${index.name} - Created`);
        }
      } catch (error) {
        results.errors.push({
          index: index.name,
          table: index.table,
          error: error.message,
        });
        console.log(`  ❌ ${index.table}.${index.name} - Error: ${error.message}`);
      }
    }
  } catch (error) {
    results.errors.push({
      index: 'connection',
      error: `Failed to connect to ${dbName}: ${error.message}`,
    });
    console.log(`❌ Failed to connect to ${dbName}: ${error.message}`);
  } finally {
    if (connection) {
      await connection.end();
    }
  }

  return results;
};

// Main function
const main = async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const targetDb = args.find(arg => arg.startsWith('--db='))?.split('=')[1];

  console.log('='.repeat(60));
  console.log('Shared Database Index Migration');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  if (targetDb) {
    console.log(`Target: ${targetDb}`);
  }
  console.log('='.repeat(60));
  console.log('');

  const allResults = [];

  try {
    for (const [dbName, indexes] of Object.entries(SHARED_INDEXES)) {
      if (targetDb && targetDb !== dbName) {
        continue;
      }

      console.log(`\nProcessing ${dbName}...`);
      console.log('-'.repeat(40));

      const result = await processDatabase(dbName, indexes, dryRun);
      allResults.push(result);
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));

    for (const result of allResults) {
      console.log(`\n${result.database}:`);
      console.log(`  Indexes created: ${result.success.length}`);
      console.log(`  Indexes skipped: ${result.skipped.length}`);
      console.log(`  Errors: ${result.errors.length}`);
    }

    const totalSuccess = allResults.reduce((sum, r) => sum + r.success.length, 0);
    const totalSkipped = allResults.reduce((sum, r) => sum + r.skipped.length, 0);
    const totalErrors = allResults.reduce((sum, r) => sum + r.errors.length, 0);

    console.log('\n' + '-'.repeat(40));
    console.log(`TOTAL: ${totalSuccess} created, ${totalSkipped} skipped, ${totalErrors} errors`);

    console.log('\n' + '='.repeat(60));
    console.log(dryRun ? 'Dry run complete. No changes were made.' : 'Migration complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
};

// Run the script
main().catch(console.error);
