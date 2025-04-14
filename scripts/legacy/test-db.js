#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const chalk = require('chalk');
const { execSync } = require('child_process');
const dbManager = require('./db-manager');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || process.env.MARIADB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.MARIADB_PORT || '3306'),
  user: process.env.DB_USER || process.env.MARIADB_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.MARIADB_PASSWORD || '',
  database: process.env.DB_NAME || process.env.MARIADB_DATABASE || 'ticketing'
};

// Logger function to output colorful messages with timestamps
function log(message, type = 'info') {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const prefix = `[${timestamp}]`;
  
  switch (type) {
    case 'error':
      console.error(chalk.red(`${prefix} ERROR: ${message}`));
      break;
    case 'success':
      console.log(chalk.green(`${prefix} SUCCESS: ${message}`));
      break;
    case 'warning':
      console.log(chalk.yellow(`${prefix} WARNING: ${message}`));
      break;
    default:
      console.log(chalk.blue(`${prefix} INFO: ${message}`));
  }
}

// Execute a database query with error handling
async function executeQuery(connection, query, params = []) {
  try {
    const [results] = await connection.execute(query, params);
    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Check if MariaDB is running
async function checkMariaDBRunning() {
  log('Checking if MariaDB/MySQL is running...');
  
  try {
    // Try different methods to check if MariaDB is running
    try {
      execSync('systemctl is-active --quiet mariadb', { stdio: 'ignore' });
      log('MariaDB service is running', 'success');
      return true;
    } catch (err) {
      try {
        execSync('systemctl is-active --quiet mysqld', { stdio: 'ignore' });
        log('MySQL service is running', 'success');
        return true;
      } catch (err2) {
        try {
          execSync(`mysqladmin ping -h${dbConfig.host} -P${dbConfig.port} -u${dbConfig.user} ${dbConfig.password ? `-p${dbConfig.password}` : ''}`, 
            { stdio: 'ignore' });
          log('MariaDB/MySQL server is accessible', 'success');
          return true;
        } catch (err3) {
          log('MariaDB/MySQL is not running or not accessible', 'error');
          log('Please start MariaDB/MySQL service before continuing.', 'warning');
          return false;
        }
      }
    }
  } catch (error) {
    log(`Error checking MariaDB status: ${error.message}`, 'error');
    return false;
  }
}

// Test database connection
async function testDatabaseConnection() {
  log('Testing database connection...');
  log(`Host: ${dbConfig.host}, Port: ${dbConfig.port}, User: ${dbConfig.user}, Database: ${dbConfig.database}`);
  
  try {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });
    
    log('Successfully connected to MariaDB/MySQL server', 'success');
    
    // Check if database exists
    const [databases] = await connection.query('SHOW DATABASES');
    const dbExists = databases.some(db => db.Database === dbConfig.database);
    
    if (dbExists) {
      log(`Database '${dbConfig.database}' exists`, 'success');
      
      // Connect to the specified database
      await connection.query(`USE ${dbConfig.database}`);
      log(`Connected to database '${dbConfig.database}'`, 'success');
    } else {
      log(`Database '${dbConfig.database}' does not exist`, 'error');
      log('Run db-setup.js to create the database', 'warning');
    }
    
    await connection.end();
    return { success: true, dbExists };
  } catch (error) {
    log(`Database connection failed: ${error.message}`, 'error');
    return { success: false, reason: error.message };
  }
}

// Test table structure
async function testTableStructure() {
  log('Checking database table structure...');
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get list of tables
    const [tables] = await connection.query('SHOW TABLES');
    const tableList = tables.map(table => Object.values(table)[0]);
    
    log(`Found ${tableList.length} tables in the database`, 'info');
    
    // Required tables
    const requiredTables = [
      'users', 
      'forms', 
      'form_submissions', 
      'chat_messages', 
      'form_fields', 
      'ticket_audit_log',
      'attachment_files'
    ];
    
    // Check if all required tables exist
    const missingTables = requiredTables.filter(table => !tableList.includes(table));
    
    if (missingTables.length > 0) {
      log(`Missing required tables: ${missingTables.join(', ')}`, 'error');
    } else {
      log('All required tables exist', 'success');
    }
    
    // Check table structure for each table
    for (const table of tableList) {
      const [columns] = await connection.query(`DESCRIBE ${table}`);
      log(`Table '${table}' has ${columns.length} columns`, 'info');
      
      // Check for primary key
      const primaryKey = columns.find(col => col.Key === 'PRI');
      if (!primaryKey) {
        log(`Table '${table}' is missing a primary key`, 'warning');
      }
    }
    
    await connection.end();
    return { success: true, tables: tableList, missingTables };
  } catch (error) {
    log(`Error checking table structure: ${error.message}`, 'error');
    return { success: false, reason: error.message };
  }
}

// Check for sample data
async function testSampleData() {
  log('Checking for sample data...');
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Check users
    const userResult = await executeQuery(connection, 'SELECT COUNT(*) as count FROM users');
    const userCount = userResult.success ? userResult.results[0].count : 0;
    
    // Check forms
    const formResult = await executeQuery(connection, 'SELECT COUNT(*) as count FROM forms');
    const formCount = formResult.success ? formResult.results[0].count : 0;
    
    // Check submissions
    const submissionResult = await executeQuery(connection, 'SELECT COUNT(*) as count FROM form_submissions');
    const submissionCount = submissionResult.success ? submissionResult.results[0].count : 0;
    
    log(`Found ${userCount} users, ${formCount} forms, and ${submissionCount} submissions`, 'info');
    
    if (userCount === 0 || formCount === 0) {
      log('Database appears to be empty or missing sample data', 'warning');
      log('Consider running db-setup.js with sample data option', 'info');
    } else {
      log('Sample data is present in the database', 'success');
    }
    
    await connection.end();
    return { 
      success: true, 
      data: { 
        users: userCount, 
        forms: formCount, 
        submissions: submissionCount 
      } 
    };
  } catch (error) {
    log(`Error checking sample data: ${error.message}`, 'error');
    return { success: false, reason: error.message };
  }
}

// Test basic operations
async function testBasicOperations() {
  log('Testing basic database operations...');
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Test INSERT operation
    const testUserName = `test_user_${Date.now()}`;
    const insertResult = await executeQuery(
      connection,
      'INSERT INTO users (email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, NOW())',
      [`${testUserName}@test.com`, testUserName, 'testpasswordhash', 'user']
    );
    
    if (!insertResult.success) {
      log(`INSERT operation failed: ${insertResult.error}`, 'error');
      await connection.end();
      return { success: false, reason: insertResult.error };
    }
    
    const userId = insertResult.results.insertId;
    log(`Created test user with ID ${userId}`, 'success');
    
    // Test SELECT operation
    const selectResult = await executeQuery(
      connection,
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (!selectResult.success || selectResult.results.length === 0) {
      log(`SELECT operation failed: ${selectResult.error || 'User not found'}`, 'error');
      await connection.end();
      return { success: false, reason: selectResult.error || 'User not found' };
    }
    
    log('SELECT operation successful', 'success');
    
    // Test UPDATE operation
    const updatedName = `${testUserName}_updated`;
    const updateResult = await executeQuery(
      connection,
      'UPDATE users SET name = ? WHERE id = ?',
      [updatedName, userId]
    );
    
    if (!updateResult.success) {
      log(`UPDATE operation failed: ${updateResult.error}`, 'error');
      await connection.end();
      return { success: false, reason: updateResult.error };
    }
    
    log('UPDATE operation successful', 'success');
    
    // Test DELETE operation
    const deleteResult = await executeQuery(
      connection,
      'DELETE FROM users WHERE id = ?',
      [userId]
    );
    
    if (!deleteResult.success) {
      log(`DELETE operation failed: ${deleteResult.error}`, 'error');
      await connection.end();
      return { success: false, reason: deleteResult.error };
    }
    
    log('DELETE operation successful', 'success');
    log('All basic database operations completed successfully', 'success');
    
    await connection.end();
    return { success: true };
  } catch (error) {
    log(`Error testing basic operations: ${error.message}`, 'error');
    return { success: false, reason: error.message };
  }
}

// Check environment variables
async function checkEnvironmentVariables() {
  log('Checking environment variables...');
  
  const requiredVars = [
    { name: 'DB_HOST', fallback: 'MARIADB_HOST', defaultValue: 'localhost' },
    { name: 'DB_PORT', fallback: 'MARIADB_PORT', defaultValue: '3306' },
    { name: 'DB_USER', fallback: 'MARIADB_USER', defaultValue: 'root' },
    { name: 'DB_PASSWORD', fallback: 'MARIADB_PASSWORD', defaultValue: '' },
    { name: 'DB_NAME', fallback: 'MARIADB_DATABASE', defaultValue: 'ticketing' }
  ];
  
  const missingVars = [];
  
  for (const variable of requiredVars) {
    const value = process.env[variable.name] || process.env[variable.fallback];
    if (!value) {
      if (variable.defaultValue !== '') {
        log(`${variable.name} or ${variable.fallback} not set, using default: ${variable.defaultValue}`, 'warning');
      } else {
        missingVars.push(variable.name);
      }
    }
  }
  
  if (missingVars.length > 0) {
    log(`Missing required environment variables: ${missingVars.join(', ')}`, 'error');
    return { success: false, missingVars };
  }
  
  log('All required environment variables are set', 'success');
  return { success: true };
}

// Main function to run all tests
async function runTests() {
  log('Starting database tests', 'info');
  
  const results = {
    environment: await checkEnvironmentVariables(),
    mariadb: await checkMariaDBRunning(),
    connection: null,
    tables: null,
    sampleData: null,
    operations: null
  };
  
  if (!results.mariadb) {
    log('MariaDB/MySQL is not running. Cannot continue with tests.', 'error');
    return results;
  }
  
  results.connection = await testDatabaseConnection();
  
  if (!results.connection.success) {
    log('Database connection failed. Cannot continue with tests.', 'error');
    return results;
  }
  
  if (results.connection.dbExists) {
    results.tables = await testTableStructure();
    results.sampleData = await testSampleData();
    results.operations = await testBasicOperations();
  }
  
  // Show summary
  log('==== TEST SUMMARY ====', 'info');
  log(`Environment Check: ${results.environment.success ? 'PASS' : 'FAIL'}`, results.environment.success ? 'success' : 'error');
  log(`MariaDB Running: ${results.mariadb ? 'PASS' : 'FAIL'}`, results.mariadb ? 'success' : 'error');
  log(`Database Connection: ${results.connection.success ? 'PASS' : 'FAIL'}`, results.connection.success ? 'success' : 'error');
  
  if (results.connection.dbExists) {
    log(`Table Structure: ${results.tables.success ? 'PASS' : 'FAIL'}`, results.tables.success ? 'success' : 'error');
    log(`Sample Data: ${results.sampleData.success ? 'PASS' : 'FAIL'}`, results.sampleData.success ? 'success' : 'error');
    log(`Basic Operations: ${results.operations.success ? 'PASS' : 'FAIL'}`, results.operations.success ? 'success' : 'error');
    
    const allPassed = results.environment.success && 
                      results.mariadb && 
                      results.connection.success && 
                      results.tables.success && 
                      results.sampleData.success && 
                      results.operations.success;
    
    if (allPassed) {
      log('All tests passed! Your database is correctly set up and functioning properly.', 'success');
    } else {
      log('Some tests failed. Please check the logs above for details.', 'warning');
    }
  } else {
    log('Database does not exist. Please run db-setup.js to create it.', 'warning');
  }
  
  return results;
}

// Parse command line arguments
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  log('Usage: node test-db.js [options]', 'info');
  log('Options:', 'info');
  log('  --help (-h): Show this help message', 'info');
  process.exit(0);
}

// Execute the main function
runTests().catch(error => {
  log(`Unexpected error during tests: ${error.message}`, 'error');
  process.exit(1);
});
