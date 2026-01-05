import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Index definitions for tenant databases
const TENANT_INDEXES = [
  // Visit table indexes
  { table: 'visit', name: 'idx_visit_date_is_bot', columns: '(date_created, is_bot)' },
  { table: 'visit', name: 'idx_visit_channel_date', columns: '(channel, date_created)' },
  { table: 'visit', name: 'idx_visit_subchannel_date', columns: '(subchannel, date_created)' },
  { table: 'visit', name: 'idx_visit_pkey', columns: '(pkey)' },
  { table: 'visit', name: 'idx_visit_ip_is_bot', columns: '(ip, is_bot)' },
  { table: 'visit', name: 'idx_visit_post_date_is_bot', columns: '(post_date, is_bot)' },

  // Action table indexes
  { table: 'action', name: 'idx_action_pkey', columns: '(pkey)' },
  { table: 'action', name: 'idx_action_pkey_revenue', columns: '(pkey, revenue)' },
  { table: 'action', name: 'idx_action_revenue_date', columns: '(revenue, date_created)' },
  { table: 'action', name: 'idx_action_date_revenue', columns: '(date_created, revenue)' },
];

// Create main database pool
const createMainPool = () => {
  return mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'lazysauce',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });
};

// Create tenant database connection
const createTenantConnection = async (dkey) => {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: `lazysauce_${dkey}`,
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
    // Table might not exist
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

// Process a single tenant database
const processTenant = async (dkey, dryRun = false) => {
  const results = {
    dkey,
    success: [],
    skipped: [],
    errors: [],
  };

  let connection;
  try {
    connection = await createTenantConnection(dkey);

    for (const index of TENANT_INDEXES) {
      try {
        // Check if table exists
        const hasTable = await tableExists(connection, index.table);
        if (!hasTable) {
          results.skipped.push({
            index: index.name,
            reason: `Table '${index.table}' does not exist`,
          });
          continue;
        }

        // Check if index already exists
        const hasIndex = await indexExists(connection, index.table, index.name);
        if (hasIndex) {
          results.skipped.push({
            index: index.name,
            reason: 'Index already exists',
          });
          continue;
        }

        // Add the index
        if (dryRun) {
          results.success.push({
            index: index.name,
            table: index.table,
            note: 'Would be created (dry run)',
          });
        } else {
          await addIndex(connection, index.table, index.name, index.columns);
          results.success.push({
            index: index.name,
            table: index.table,
          });
        }
      } catch (error) {
        results.errors.push({
          index: index.name,
          table: index.table,
          error: error.message,
        });
      }
    }
  } catch (error) {
    results.errors.push({
      index: 'connection',
      error: `Failed to connect to lazysauce_${dkey}: ${error.message}`,
    });
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
  const singleDkey = args.find(arg => arg.startsWith('--dkey='))?.split('=')[1];
  const concurrency = parseInt(args.find(arg => arg.startsWith('--concurrency='))?.split('=')[1] || '5');

  console.log('='.repeat(60));
  console.log('Tenant Database Index Migration');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log(`Concurrency: ${concurrency}`);
  if (singleDkey) {
    console.log(`Target: Single dkey (${singleDkey})`);
  }
  console.log('='.repeat(60));
  console.log('');

  const mainPool = createMainPool();

  try {
    // Get all dkeys
    let dkeys;
    if (singleDkey) {
      dkeys = [{ dkey: singleDkey }];
    } else {
      const [rows] = await mainPool.execute('SELECT dkey, name FROM lazysauce.domain ORDER BY dkey');
      dkeys = rows;
    }

    console.log(`Found ${dkeys.length} tenant database(s) to process\n`);

    const allResults = [];
    let completed = 0;

    // Process in batches for concurrency control
    for (let i = 0; i < dkeys.length; i += concurrency) {
      const batch = dkeys.slice(i, i + concurrency);
      const batchPromises = batch.map(async (domain) => {
        const result = await processTenant(domain.dkey, dryRun);
        completed++;

        // Print progress
        const status = result.errors.length > 0 ? '❌' :
                       result.success.length > 0 ? '✅' : '⏭️';
        console.log(`[${completed}/${dkeys.length}] ${status} lazysauce_${domain.dkey} - ` +
          `${result.success.length} added, ${result.skipped.length} skipped, ${result.errors.length} errors`);

        return result;
      });

      const batchResults = await Promise.all(batchPromises);
      allResults.push(...batchResults);
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));

    const totalSuccess = allResults.reduce((sum, r) => sum + r.success.length, 0);
    const totalSkipped = allResults.reduce((sum, r) => sum + r.skipped.length, 0);
    const totalErrors = allResults.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(`Total databases processed: ${allResults.length}`);
    console.log(`Total indexes created: ${totalSuccess}`);
    console.log(`Total indexes skipped: ${totalSkipped}`);
    console.log(`Total errors: ${totalErrors}`);

    // Print errors if any
    if (totalErrors > 0) {
      console.log('\n' + '-'.repeat(60));
      console.log('ERRORS:');
      console.log('-'.repeat(60));
      for (const result of allResults) {
        if (result.errors.length > 0) {
          console.log(`\nlazysauce_${result.dkey}:`);
          for (const err of result.errors) {
            console.log(`  - ${err.index}: ${err.error}`);
          }
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(dryRun ? 'Dry run complete. No changes were made.' : 'Migration complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  } finally {
    await mainPool.end();
  }
};

// Run the script
main().catch(console.error);
