#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const dbManager = require('./db-manager');
const chalk = require('chalk');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Log function with timestamp
function log(level, message) {
  const timestamp = new Date().toISOString();
  const color = {
    error: chalk.red,
    warning: chalk.yellow,
    success: chalk.green,
    info: chalk.blue
  }[level] || chalk.white;
  
  console.log(`[${timestamp}] ${color(message)}`);
}

// Main function
async function setupDatabase() {
  console.log(chalk.blue.bold('==== DATABASE SETUP UTILITY ===='));
  console.log('This utility will help you set up the ticketing database\n');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const shouldResetDB = args.includes('--reset') || args.includes('-r');
  const skipPrompts = args.includes('--yes') || args.includes('-y');
  const sampleData = args.includes('--sample-data') || args.includes('-s');
  const shouldFixCollation = args.includes('--fix-collation');
  const showHelp = args.includes('--help') || args.includes('-h');
  
  if (showHelp) {
    console.log(chalk.yellow('Usage: node db-setup.js [options]'));
    console.log('Options:');
    console.log('  --reset (-r): Reset database (drops and recreates)');
    console.log('  --yes (-y): Skip all confirmation prompts');
    console.log('  --sample-data (-s): Include sample data');
    console.log('  --fix-collation: Fix table collation issues');
    console.log('  --help (-h): Show this help message');
    rl.close();
    return;
  }
  
  // Check if MariaDB is running
  log('info', 'Checking if MariaDB is running...');
  const mariaDBRunning = await dbManager.checkMariaDBRunning();
  if (!mariaDBRunning) {
    log('error', 'MariaDB is not running. Please start MariaDB service.');
    rl.close();
    return;
  }
  
  log('success', 'MariaDB is running.');
  
  // Get database configuration
  const dbConfig = {
    host: process.env.DB_HOST || process.env.MARIADB_HOST || 'localhost',
    port: process.env.DB_PORT || process.env.MARIADB_PORT || '3306',
    user: process.env.DB_USER || process.env.MARIADB_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.MARIADB_PASSWORD || '',
    database: process.env.DB_NAME || process.env.MARIADB_DATABASE || 'ticketing'
  };
  
  log('info', `Database configuration:`);
  log('info', `- Host: ${dbConfig.host}`);
  log('info', `- Port: ${dbConfig.port}`);
  log('info', `- User: ${dbConfig.user}`);
  log('info', `- Database: ${dbConfig.database}`);
  
  // Check if database exists
  const dbExistsResult = await dbManager.checkDatabaseExists(dbConfig.database);
  
  if (dbExistsResult.exists) {
    log('info', `Database '${dbConfig.database}' already exists.`);
    
    if (shouldResetDB) {
      if (skipPrompts) {
        log('warning', 'Resetting database as requested...');
        await resetDatabase(dbConfig.database);
      } else {
        const answer = await askQuestion(`Do you want to reset the database '${dbConfig.database}'? This will DELETE ALL DATA. (y/N): `);
        if (answer.toLowerCase() === 'y') {
          await resetDatabase(dbConfig.database);
        } else {
          log('info', 'Database reset cancelled.');
        }
      }
    } else {
      log('info', 'Using existing database.');
    }
  } else {
    log('info', `Database '${dbConfig.database}' does not exist. It will be created.`);
    await createDatabase(dbConfig.database);
  }
  
  // Check if tables exist
  const tablesResult = await dbManager.checkRequiredTables();
  
  if (!tablesResult.success) {
    log('warning', 'One or more required tables are missing.');
    
    if (skipPrompts) {
      log('info', 'Creating tables as requested...');
      await createTables();
    } else {
      const answer = await askQuestion('Do you want to create the missing tables? (Y/n): ');
      if (answer.toLowerCase() !== 'n') {
        await createTables();
      } else {
        log('info', 'Table creation cancelled.');
      }
    }
  } else {
    log('success', 'All required tables exist.');
  }
  
  // Fix collation issues
  if (shouldFixCollation) {
    log('info', 'Checking for collation issues...');
    await fixCollationIssues();
  }
  
  // Check for sample data
  const dataResult = await dbManager.checkSampleData();
  
  if (!dataResult.success) {
    log('warning', 'Sample data is missing or incomplete.');
    
    if (sampleData) {
      if (skipPrompts) {
        log('info', 'Adding sample data as requested...');
        await insertSampleData();
      } else {
        const answer = await askQuestion('Do you want to add sample data? (Y/n): ');
        if (answer.toLowerCase() !== 'n') {
          await insertSampleData();
        } else {
          log('info', 'Sample data insertion cancelled.');
        }
      }
    }
  } else {
    log('success', 'Sample data already exists.');
  }
  
  // Verify database setup
  await verifySetup();
  
  // All done
  log('success', 'Database setup completed successfully!');
  rl.close();
}

// Create database
async function createDatabase(dbName) {
  log('info', `Creating database '${dbName}'...`);
  const result = await dbManager.createDatabase(dbName);
  
  if (result.success) {
    log('success', `Database '${dbName}' created successfully.`);
    return true;
  } else {
    log('error', `Failed to create database: ${result.reason}`);
    return false;
  }
}

// Reset database
async function resetDatabase(dbName) {
  log('info', `Resetting database '${dbName}'...`);
  const result = await dbManager.resetDatabase(dbName);
  
  if (result.success) {
    log('success', `Database '${dbName}' reset successfully.`);
    return true;
  } else {
    log('error', `Failed to reset database: ${result.reason}`);
    return false;
  }
}

// Create tables
async function createTables() {
  log('info', 'Creating database tables...');
  const result = await dbManager.createTables();
  
  if (result.success) {
    log('success', 'Tables created successfully.');
    return true;
  } else {
    log('error', `Failed to create tables: ${result.reason}`);
    return false;
  }
}

// Insert sample data
async function insertSampleData() {
  log('info', 'Inserting sample data...');
  const result = await dbManager.insertSampleData();
  
  if (result.success) {
    log('success', 'Sample data inserted successfully.');
    return true;
  } else {
    log('error', `Failed to insert sample data: ${result.reason}`);
    return false;
  }
}

// Fix collation issues
async function fixCollationIssues() {
  log('info', 'Fixing table collation...');
  const result = await dbManager.fixTableCollation();
  
  if (result.success) {
    log('success', 'Table collation fixed successfully.');
    return true;
  } else {
    log('error', `Failed to fix table collation: ${result.reason}`);
    return false;
  }
}

// Verify setup
async function verifySetup() {
  log('info', 'Verifying database setup...');
  
  // Check database connection
  const connectionResult = await dbManager.testDatabaseConnection();
  if (!connectionResult.success) {
    log('error', `Verification failed: Could not connect to database. ${connectionResult.reason}`);
    return false;
  }
  
  // Check tables
  const tablesResult = await dbManager.checkRequiredTables();
  if (!tablesResult.success) {
    log('error', `Verification failed: ${tablesResult.reason}`);
    return false;
  }
  
  log('success', 'Database verification completed successfully.');
  return true;
}

// Helper function to ask questions
function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

// Execute the main function
setupDatabase().catch(error => {
  log('error', `Unexpected error during setup: ${error.message}`);
  rl.close();
  process.exit(1);
}); 