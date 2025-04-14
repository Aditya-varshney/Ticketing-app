#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const chalk = require('chalk');
const readline = require('readline');

// Database configuration
const config = {
  host: process.env.MARIADB_HOST || 'localhost',
  user: process.env.MARIADB_USER || 'ticketing_user',
  password: process.env.MARIADB_PASSWORD || 'password',
  database: process.env.MARIADB_DATABASE || 'ticketing',
  port: process.env.MARIADB_PORT || 3306
};

// Colors for console output
const colors = {
  info: chalk.blue,
  success: chalk.green,
  warn: chalk.yellow,
  error: chalk.red,
  debug: chalk.grey
};

// Logging helper with colors
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${timestamp}] ${colors[type](`${type.toUpperCase()}`)} ${message}`);
};

// Create a readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Execute query with error handling
async function executeQuery(connection, query, params = [], suppressErrors = false) {
  try {
    const [result] = await connection.execute(query, params);
    return { success: true, result };
  } catch (err) {
    if (!suppressErrors) {
      log(`Query failed: ${err.message}`, 'error');
      log(`SQL Error Code: ${err.code}`, 'error');
      log(`SQL Query: ${query}`, 'error');
    }
    return { success: false, error: err };
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const options = {
  force: args.includes('--force') || args.includes('-f'),
  drop: args.includes('--drop-database') || args.includes('-d'),
  help: args.includes('--help') || args.includes('-h')
};

// Print help if requested
if (options.help) {
  console.log('Usage: node clean-db.js [options]');
  console.log('Options:');
  console.log('  --force, -f            Skip confirmation prompts');
  console.log('  --drop-database, -d    Drop the entire database instead of just tables');
  console.log('  --help, -h             Show this help message');
  process.exit(0);
}

// Function to get all tables in the database
async function getAllTables(connection) {
  const { success, result, error } = await executeQuery(
    connection,
    'SHOW TABLES'
  );
  
  if (!success) {
    log(`Failed to get tables: ${error.message}`, 'error');
    return [];
  }
  
  return result.map(row => Object.values(row)[0]);
}

// Function to drop all tables in the correct order
async function dropAllTables(connection) {
  // First disable foreign key checks
  await executeQuery(connection, 'SET FOREIGN_KEY_CHECKS = 0');
  
  try {
    // Get all tables
    const tables = await getAllTables(connection);
    
    if (tables.length === 0) {
      log('No tables found in the database', 'info');
      return true;
    }
    
    log(`Found ${tables.length} tables: ${tables.join(', ')}`, 'info');
    
    // Drop each table
    for (const table of tables) {
      log(`Dropping table: ${table}...`, 'info');
      const { success, error } = await executeQuery(
        connection,
        `DROP TABLE IF EXISTS \`${table}\``
      );
      
      if (!success) {
        log(`Failed to drop table ${table}: ${error.message}`, 'error');
      } else {
        log(`Table ${table} dropped successfully`, 'success');
      }
    }
    
    return true;
  } finally {
    // Re-enable foreign key checks
    await executeQuery(connection, 'SET FOREIGN_KEY_CHECKS = 1');
  }
}

// Function to drop the entire database
async function dropDatabase(connection) {
  // Connect to MySQL without database selection
  const rootConnection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password
  });
  
  try {
    log(`Dropping database ${config.database}...`, 'info');
    
    const { success, error } = await executeQuery(
      rootConnection,
      `DROP DATABASE IF EXISTS \`${config.database}\``
    );
    
    if (!success) {
      log(`Failed to drop database: ${error.message}`, 'error');
      return false;
    }
    
    log(`Database ${config.database} dropped successfully`, 'success');
    
    // Recreate an empty database
    log(`Recreating empty database ${config.database}...`, 'info');
    const createResult = await executeQuery(
      rootConnection,
      `CREATE DATABASE \`${config.database}\``
    );
    
    if (!createResult.success) {
      log(`Failed to recreate database: ${createResult.error.message}`, 'error');
      return false;
    }
    
    log(`Empty database ${config.database} created successfully`, 'success');
    return true;
  } finally {
    await rootConnection.end();
  }
}

// Main function to clean the database
async function cleanDatabase() {
  console.log(chalk.bold.red('\n=== DATABASE CLEANUP TOOL ===\n'));
  log(`Target database: ${config.database} on ${config.host}`, 'info');
  
  if (options.drop) {
    log('WARNING: This will DROP and RECREATE the ENTIRE DATABASE.', 'warn');
  } else {
    log('This will DROP ALL TABLES in the database, but keep the database itself.', 'warn');
  }
  
  log('All data will be permanently lost!', 'warn');
  
  // Get confirmation unless --force is specified
  if (!options.force) {
    await new Promise((resolve) => {
      rl.question(chalk.bold.red('\nAre you sure you want to continue? (yes/no): '), (answer) => {
        if (answer.toLowerCase() !== 'yes') {
          log('Operation cancelled by user', 'info');
          process.exit(0);
        }
        resolve();
      });
    });
  }
  
  let connection;
  
  try {
    // First try to connect to the database
    try {
      connection = await mysql.createConnection(config);
      log('Connected to database', 'success');
    } catch (err) {
      if (err.code === 'ER_BAD_DB_ERROR') {
        log(`Database ${config.database} does not exist, nothing to clean`, 'warn');
        return true;
      } else {
        throw err;
      }
    }
    
    // Drop database or tables based on the option
    if (options.drop) {
      await connection.end(); // Close connection before dropping database
      return await dropDatabase(null);
    } else {
      const result = await dropAllTables(connection);
      
      if (result) {
        log('Database cleanup completed successfully', 'success');
        log('You can now run `npm run setup` to reinitialize the database with fresh tables and sample data', 'info');
        return true;
      } else {
        log('Database cleanup encountered errors', 'error');
        return false;
      }
    }
  } catch (err) {
    log(`Database operation failed: ${err.message}`, 'error');
    return false;
  } finally {
    if (connection) await connection.end();
    rl.close();
  }
}

// Run the script
cleanDatabase()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    log(`Unhandled error: ${err.message}`, 'error');
    process.exit(1);
  });
