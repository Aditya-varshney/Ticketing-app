require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Database config
const DB_NAME = process.env.MARIADB_DATABASE || 'ticketing';
const DB_USER = process.env.MARIADB_USER || 'ticketing_app';
const DB_PASS = process.env.MARIADB_PASSWORD || 'secure_password';
const DB_HOST = process.env.MARIADB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;

// Confirm action with user
function confirm(message) {
  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, answer => {
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function cleanDatabase() {
  console.log('==== DATABASE CLEANUP SCRIPT ====');
  console.log('⚠️  WARNING: This will DELETE ALL DATA in the database');
  console.log('Database to clean:', DB_NAME);
  
  const confirmed = await confirm('Are you sure you want to continue?');
  if (!confirmed) {
    console.log('Database cleanup cancelled');
    rl.close();
    return;
  }

  try {
    // First check if database exists
    console.log('\n-- Step 1: Checking database existence --');
    let rootConnection;
    try {
      rootConnection = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: 'root',
        password: process.env.MARIADB_ROOT_PASSWORD || '',
        ssl: false
      });
      
      const [databases] = await rootConnection.query('SHOW DATABASES LIKE ?', [DB_NAME]);
      if (databases.length === 0) {
        console.log(`⚠️ Database '${DB_NAME}' does not exist yet. Nothing to clean.`);
        console.log('To create the database, run: node scripts/setup-db.js');
        await rootConnection.end();
        rl.close();
        return;
      }
      await rootConnection.end();
      console.log(`✅ Database '${DB_NAME}' exists`);
    } catch (rootErr) {
      console.log('⚠️ Could not check database existence as root:', rootErr.message);
      console.log('Continuing with cleanup assuming database exists...');
    }
  
    // Connect to the database
    console.log('\n-- Step 2: Connect to database --');
    let connection;
    try {
      connection = await mysql.createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASS,
        port: DB_PORT,
        database: DB_NAME,
        ssl: false,
        multipleStatements: true
      });
      console.log('✅ Connected successfully');
    } catch (connErr) {
      console.error('❌ Could not connect to database:', connErr.message);
      if (connErr.code === 'ER_BAD_DB_ERROR') {
        console.log(`Database '${DB_NAME}' does not exist. Nothing to clean.`);
        console.log('To create the database, run: node scripts/setup-db.js');
      } else if (connErr.code === 'ER_ACCESS_DENIED_ERROR') {
        console.log('Access denied. Check your database credentials in .env.local');
        console.log('For first-time setup, run: node scripts/setup-db.js');
      }
      rl.close();
      return;
    }
    
    // Get existing tables
    console.log('\n-- Step 3: Getting existing tables --');
    const [tables] = await connection.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = ?
    `, [DB_NAME]);
    
    const tableNames = tables.map(t => t.TABLE_NAME || t.table_name);
    
    if (tableNames.length === 0) {
      console.log('No tables found to drop');
    } else {
      console.log(`Found ${tableNames.length} tables to drop:`, tableNames.join(', '));
      
      // Disable foreign key checks to avoid constraint errors during deletion
      console.log('\n-- Step 4: Disabling foreign key checks --');
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      
      // Drop each table
      console.log('\n-- Step 5: Dropping all tables --');
      for (const table of tableNames) {
        await connection.query(`DROP TABLE IF EXISTS ${table}`);
        console.log(`Dropped table: ${table}`);
      }
      
      // Re-enable foreign key checks
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log('✅ All tables dropped successfully');
    }
    
    console.log('\n==== DATABASE CLEANUP COMPLETE ====');
    console.log('To recreate the database with fresh tables and users, run:');
    console.log('node scripts/setup-db.js');
    
    await connection.end();
    rl.close();
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    if (error.code) console.error('Error code:', error.code);
    console.log('\nFor first-time setup, run: node scripts/setup-db.js');
    rl.close();
  }
}

cleanDatabase();
