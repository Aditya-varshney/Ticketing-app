#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');
const { exec, execSync } = require('child_process');
const readline = require('readline');
const util = require('util');

/**
 * Database Master Script for Ticketing App
 * 
 * This script handles all database operations:
 * 1. Setup - Create database, tables and application user
 * 2. Migrations - Apply schema updates when application evolves
 * 3. Seeding - Insert sample data for testing
 * 4. Verification - Test database connectivity and structure
 * 5. Backup/Restore - Export and import database dumps
 * 6. Cleanup - Reset or drop database when needed
 */

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || process.env.MARIADB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.MARIADB_PORT || '3306'),
  user: process.env.DB_USER || process.env.MARIADB_USER || 'ticket_user',
  password: process.env.DB_PASSWORD || process.env.MARIADB_PASSWORD || '',
  database: process.env.DB_NAME || process.env.MARIADB_DATABASE || 'ticketing',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// App user to create
const appUser = {
  username: process.env.APP_DB_USER || process.env.MARIADB_USER || 'ticket_user',
  password: process.env.APP_DB_PASSWORD || process.env.MARIADB_PASSWORD || 'secure_password'
};

// Required tables for the application
const requiredTables = [
  'users',
  'form_templates', // Changed from 'forms' to match schema
  'form_submissions',
  'chat_messages',
  'audit_logs',
  'file_attachments',
  'quick_replies'
];

// Logging helper with color and timestamp
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
    case 'step':
      console.log(chalk.cyan(`${prefix} STEP: ${message}`));
      break;
    default:
      console.log(chalk.blue(`${prefix} INFO: ${message}`));
  }
}

// Create readline interface for user prompts
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Prompt user for input
async function askQuestion(rl, query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Helper to execute database queries with proper error handling
async function executeQuery(connection, query, params = [], description = '') {
  try {
    const [results] = await connection.execute(query, params);
    if (description) {
      log(`${description} succeeded`, 'success');
    }
    return { success: true, results };
  } catch (error) {
    if (description) {
      log(`${description} failed: ${error.message}`, 'error');
    }
    return { 
      success: false, 
      error: error.message,
      code: error.code
    };
  }
}

// Check if a file exists
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Check if MariaDB is running
async function checkMariaDBRunning() {
  log('Checking if MariaDB/MySQL is running...', 'step');
  
  return new Promise(resolve => {
    const command = process.platform === 'win32'
      ? 'sc query mariadb'
      : 'pgrep -x mysqld || pgrep -x mariadbd';

    exec(command, (error, stdout) => {
      if (error) {
        // Try alternative check for Linux systems
        if (process.platform !== 'win32') {
          exec('systemctl is-active mariadb mysql || service mariadb status || service mysql status', (err2, stdout2) => {
            if (err2) {
              log('MariaDB/MySQL is not running', 'error');
              resolve(false);
            } else {
              const isRunning = stdout2.toLowerCase().includes('active') || stdout2.toLowerCase().includes('running');
              if (isRunning) {
                log('MariaDB/MySQL service is running', 'success');
              } else {
                log('MariaDB/MySQL is not running', 'error');
              }
              resolve(isRunning);
            }
          });
        } else {
          log('MariaDB/MySQL is not running', 'error');
          resolve(false);
        }
      } else {
        if (process.platform === 'win32') {
          const isRunning = stdout.includes('RUNNING');
          if (isRunning) {
            log('MariaDB service is running', 'success');
          } else {
            log('MariaDB is not running', 'error');
          }
          resolve(isRunning);
        } else {
          const isRunning = stdout.trim().length > 0;
          if (isRunning) {
            log('MariaDB/MySQL is running', 'success');
          } else {
            log('MariaDB/MySQL is not running', 'error');
          }
          resolve(isRunning);
        }
      }
    });
  });
}

// Connect to database
async function getDatabaseConnection(skipDatabase = false) {
  try {
    const config = {...dbConfig};
    
    // Check if we're doing an operation that requires elevated privileges
    const destructiveOperation = process.argv.includes('drop') || 
                                process.argv.includes('setup') || 
                                process.argv.includes('reset') ||
                                process.argv.includes('create');
    
    // For destructive operations, try to use root credentials if available
    if (destructiveOperation && skipDatabase) {
      const rootUser = process.env.MARIADB_ROOT_USER || process.env.DB_ROOT_USER;
      const rootPassword = process.env.MARIADB_ROOT_PASSWORD || process.env.DB_ROOT_PASSWORD;
      
      if (rootUser && rootPassword) {
        config.user = rootUser;
        config.password = rootPassword;
        log('Using root credentials for database operation', 'info');
      }
    }
    
    if (skipDatabase) {
      delete config.database;
    }
    
    const connection = await mysql.createConnection(config);
    if (skipDatabase) {
      log(`Connected to MariaDB server on ${dbConfig.host}`, 'success');
    } else {
      log(`Connected to database '${dbConfig.database}'`, 'success');
    }
    return { success: true, connection };
  } catch (error) {
    // Handle specific error codes
    let reason = `Failed to connect to database: ${error.message}`;
    
    if (error.code === 'ER_BAD_DB_ERROR') {
      reason = `Database '${dbConfig.database}' does not exist. You should create it first.`;
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      reason = 'Access denied. Check your username and password in the .env file.';
    } else if (error.code === 'ECONNREFUSED') {
      reason = `Connection refused. Make sure MariaDB is running on ${dbConfig.host}:${dbConfig.port}.`;
    }
    
    log(reason, 'error');
    return { 
      success: false, 
      reason,
      errorCode: error.code,
      error
    };
  }
}

// Check if database exists
async function checkDatabaseExists(dbName = dbConfig.database) {
  try {
    const rootConnection = await getDatabaseConnection(true);
    if (!rootConnection.success) {
      return { success: false, exists: false, reason: rootConnection.reason };
    }
    
    const [rows] = await rootConnection.connection.query(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [dbName]
    );
    
    await rootConnection.connection.end();
    
    return {
      success: true,
      exists: rows.length > 0
    };
  } catch (error) {
    log(`Error checking if database exists: ${error.message}`, 'error');
    return { success: false, exists: false, reason: error.message };
  }
}

// Create database
async function createDatabase(dbName = dbConfig.database) {
  let connection;
  try {
    log(`Creating database ${dbName}...`, 'step');
    
    // Don't automatically use root credentials - use the configured credentials first
    const config = {...dbConfig};
    delete config.database;
    
    try {
      connection = await mysql.createConnection(config);
      
      try {
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        log(`Database ${dbName} created successfully`, 'success');
        
        // Create application user if specified and different from connection user
        if (config.user !== appUser.username) {
          log(`Creating or updating application user ${appUser.username}...`, 'info');
          
          // Check if user exists and delete if so (to reset permissions)
          await connection.query(`DROP USER IF EXISTS '${appUser.username}'@'%'`);
          await connection.query(`DROP USER IF EXISTS '${appUser.username}'@'localhost'`);
          
          // Create user with all privileges
          await connection.query(`CREATE USER '${appUser.username}'@'%' IDENTIFIED BY '${appUser.password}'`);
          await connection.query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${appUser.username}'@'%'`);
          await connection.query(`FLUSH PRIVILEGES`);
          
          log(`Application user ${appUser.username} created with all privileges on ${dbName}`, 'success');
        }
        
        return { success: true };
      } catch (dbError) {
        // If access denied with regular user, provide instructions
        if (dbError.code === 'ER_DBACCESS_DENIED_ERROR' || dbError.code === 'ER_ACCESS_DENIED_ERROR') {
          log(`Insufficient privileges to create database. Try one of the following:`, 'warning');
          log(`1. Create the database manually using a database client with admin access:`, 'info');
          log(`   CREATE DATABASE ${dbName};`, 'info');
          log(`   CREATE USER '${appUser.username}'@'localhost' IDENTIFIED BY 'your_password';`, 'info');
          log(`   GRANT ALL PRIVILEGES ON ${dbName}.* TO '${appUser.username}'@'localhost';`, 'info');
          log(`   FLUSH PRIVILEGES;`, 'info');
          log(`2. Use an existing database with: --database=existing_db_name`, 'info');
          
          throw dbError;
        } else {
          // If the error is not permission-related, rethrow
          throw dbError;
        }
      }
    } catch (error) {
      // If we get access denied, try to check if the database already exists
      if (error.code === 'ER_DBACCESS_DENIED_ERROR' || error.code === 'ER_ACCESS_DENIED_ERROR') {
        // Check if database already exists (this might still work)
        try {
          const checkConfig = {...dbConfig};
          delete checkConfig.database;
          const checkConn = await mysql.createConnection(checkConfig);
          const [rows] = await checkConn.query('SHOW DATABASES LIKE ?', [dbName]);
          await checkConn.end();
          
          if (rows.length > 0) {
            log(`Database ${dbName} already exists, proceeding with setup...`, 'warning');
            return { success: true, alreadyExists: true };
          }
        } catch (checkError) {
          // Ignore errors in this check
        }
        
        log(`Insufficient privileges to create database. Try one of the following:`, 'warning');
        log(`1. Create the database manually using a database client with admin access:`, 'info');
        log(`   CREATE DATABASE ${dbName};`, 'info');
        log(`   GRANT ALL PRIVILEGES ON ${dbName}.* TO '${config.user}'@'localhost';`, 'info');
        log(`   FLUSH PRIVILEGES;`, 'info');
        log(`2. Use an existing database with: --database=existing_db_name`, 'info');
      }
      
      throw error;
    }
  } catch (error) {
    log(`Failed to create database: ${error.message}`, 'error');
    return { 
      success: false, 
      reason: `Failed to create database: ${error.message}`,
      error
    };
  } finally {
    if (connection) await connection.end();
  }
}

// Create tables
async function createTables() {
  let connection;
  try {
    log('Creating database tables...', 'step');
    const result = await getDatabaseConnection();
    
    if (!result.success) {
      return result;
    }
    
    connection = result.connection;
    
    // Disable foreign key checks temporarily
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Define table schemas
    const tableSchemas = [
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE,
        name VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin', 'helpdesk') NOT NULL DEFAULT 'user',
        profile_image VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      
      `CREATE TABLE IF NOT EXISTS form_templates (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        fields JSON NOT NULL,
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      
      `CREATE TABLE IF NOT EXISTS form_submissions (
        id VARCHAR(36) PRIMARY KEY,
        form_template_id VARCHAR(36) NOT NULL,
        submitted_by VARCHAR(36) NOT NULL,
        form_data JSON NOT NULL,
        status ENUM('open', 'in_progress', 'resolved', 'closed', 'reopened') NOT NULL DEFAULT 'open',
        priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (form_template_id) REFERENCES form_templates(id) ON DELETE CASCADE,
        FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      
      `CREATE TABLE IF NOT EXISTS ticket_assignments (
        id VARCHAR(36) PRIMARY KEY,
        ticket_id VARCHAR(36) NOT NULL,
        helpdesk_id VARCHAR(36) NOT NULL,
        assigned_by VARCHAR(36) NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES form_submissions(id) ON DELETE CASCADE,
        FOREIGN KEY (helpdesk_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(36) PRIMARY KEY,
        ticket_id VARCHAR(36),
        sender_id VARCHAR(36) NOT NULL,
        receiver_id VARCHAR(36),
        content TEXT NOT NULL,
        attachment_url VARCHAR(255),
        attachment_type VARCHAR(50),
        attachment_name VARCHAR(255),
        attachment_size INT,
        \`read\` BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES form_submissions(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(255) NOT NULL,
        entity_id VARCHAR(36) NOT NULL,
        details JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      
      `CREATE TABLE IF NOT EXISTS quick_replies (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      
      `CREATE TABLE IF NOT EXISTS file_attachments (
        id VARCHAR(36) PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_size INT NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(36) NOT NULL,
        uploaded_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    ];
    
    // Create each table
    for (const schema of tableSchemas) {
      await connection.query(schema);
    }
    
    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    log('All tables created successfully', 'success');
    return { success: true };
  } catch (error) {
    log(`Failed to create tables: ${error.message}`, 'error');
    return { 
      success: false, 
      reason: `Failed to create tables: ${error.message}`,
      error 
    };
  } finally {
    if (connection) {
      try {
        // Ensure foreign key checks are re-enabled
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        await connection.end();
      } catch (err) {
        // Ignore errors during cleanup
      }
    }
  }
}

// Check required tables
async function checkRequiredTables() {
  let connection;
  try {
    log('Checking required tables...', 'step');
    const result = await getDatabaseConnection();
    
    if (!result.success) {
      return result;
    }
    
    connection = result.connection;
    
    const missingTables = [];
    const tableDetails = {};
    
    // Check each table
    for (const table of requiredTables) {
      const [rows] = await connection.query(`
        SELECT COUNT(*) AS count 
        FROM information_schema.tables 
        WHERE table_schema = ? AND table_name = ?
      `, [dbConfig.database, table]);
      
      if (rows[0].count === 0) {
        missingTables.push(table);
      } else {
        // Get column information for existing tables
        const [columns] = await connection.query(`
          SHOW COLUMNS FROM ${table}
        `);
        tableDetails[table] = columns.map(col => ({
          name: col.Field,
          type: col.Type,
          nullable: col.Null === 'YES'
        }));
      }
    }
    
    if (missingTables.length > 0) {
      log(`Missing tables: ${missingTables.join(', ')}`, 'warning');
      return {
        success: false,
        reason: `Missing tables: ${missingTables.join(', ')}`,
        missingTables,
        existingTables: tableDetails
      };
    }
    
    log('All required tables exist', 'success');
    return { success: true, tables: tableDetails };
  } catch (error) {
    log(`Failed to check tables: ${error.message}`, 'error');
    return { 
      success: false, 
      reason: `Failed to check tables: ${error.message}`,
      error 
    };
  } finally {
    if (connection) await connection.end();
  }
}

// Check if user has access to the database
async function checkDatabaseAccess(dbName = dbConfig.database) {
  let connection;
  try {
    log(`Checking access to database ${dbName}...`, 'info');
    const config = {...dbConfig};
    
    // Try to connect without specifying a database first
    delete config.database;
    connection = await mysql.createConnection(config);
    
    // Check if database exists
    const [rows] = await connection.query('SHOW DATABASES LIKE ?', [dbName]);
    const databaseExists = rows.length > 0;
    
    if (databaseExists) {
      log(`Database ${dbName} exists`, 'info');
      await connection.end();
      
      // Now try to connect directly to the database
      try {
        const dbConfig2 = {...dbConfig, database: dbName}; // Use the specified database name
        const dbConnection = await mysql.createConnection(dbConfig2);
        await dbConnection.end();
        return { 
          success: true, 
          exists: true, 
          canConnect: true 
        };
      } catch (connectError) {
        // Can't connect to the database directly
        return { 
          success: true, 
          exists: true, 
          canConnect: false,
          error: connectError.message 
        };
      }
    } else {
      log(`Database ${dbName} does not exist`, 'warning');
      
      // Check if we can create databases with the current user
      try {
        const testDbName = `test_permission_${Date.now()}`;
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${testDbName}`);
        await connection.query(`DROP DATABASE ${testDbName}`);
        log('Current user has permission to create databases', 'info');
        return { 
          success: true, 
          exists: false, 
          canCreate: true,
          canConnect: false 
        };
      } catch (e) {
        log('Current user does not have permission to create databases', 'warning');
        return { 
          success: true, 
          exists: false,
          canCreate: false,
          canConnect: false 
        };
      }
    }
  } catch (error) {
    return { 
      success: false, 
      reason: `Failed to check database access: ${error.message}`,
      error 
    };
  } finally {
    if (connection) await connection.end();
  }
}

// Setup database
async function setupDatabase(force = false) {
  log('Starting database setup...', 'step');
  
  // Check if MariaDB is running
  const dbRunning = await checkMariaDBRunning();
  if (!dbRunning) {
    return {
      success: false,
      reason: 'MariaDB/MySQL is not running. Please start it before proceeding.'
    };
  }
  
  // Check existing database and access
  const accessCheck = await checkDatabaseAccess();
  
  if (accessCheck.exists && accessCheck.canConnect) {
    // Database exists and we can connect - just create/update tables
    log(`Using existing database ${dbConfig.database}`, 'info');
    
    // Create tables
    const tablesResult = await createTables();
    if (!tablesResult.success) {
      return tablesResult;
    }
    
    log('Database setup completed successfully', 'success');
    return { success: true };
  }
  
  if (!accessCheck.exists && accessCheck.canCreate) {
    // Database doesn't exist but user can create it
    log(`Creating database ${dbConfig.database} with current user`, 'info');
    const createResult = await createDatabase();
    if (!createResult.success) {
      return createResult;
    }
    
    // Create tables
    const tablesResult = await createTables();
    if (!tablesResult.success) {
      return tablesResult;
    }
    
    log('Database setup completed successfully', 'success');
    return { success: true };
  }
  
  if (!accessCheck.exists) {
    // Database doesn't exist and current user can't create it
    // Try with root credentials
    const createResult = await createDatabase();
    if (!createResult.success) {
      // If we're here, both regular user and root credentials failed
      log(`Cannot create database ${dbConfig.database}. You need to create it manually:`, 'warning');
      log(`1. Log in to MySQL as root or an admin user`, 'info');
      log(`2. Run: CREATE DATABASE ${dbConfig.database};`, 'info');
      log(`3. Run: CREATE USER '${dbConfig.user}'@'localhost' IDENTIFIED BY 'your_password';`, 'info');
      log(`4. Run: GRANT ALL PRIVILEGES ON ${dbConfig.database}.* TO '${dbConfig.user}'@'localhost';`, 'info');
      log(`5. Run: FLUSH PRIVILEGES;`, 'info');
      log(`6. Then run this setup script again`, 'info');
      
      return {
        success: false,
        reason: `Failed to create database. Manual setup required.`
      };
    }
    
    // Create tables
    const tablesResult = await createTables();
    if (!tablesResult.success) {
      return tablesResult;
    }
    
    log('Database setup completed successfully', 'success');
    return { success: true };
  }
  
  if (accessCheck.exists && !accessCheck.canConnect) {
    // Database exists but we can't connect to it
    log(`Database ${dbConfig.database} exists but you don't have access to it.`, 'warning');
    log(`Check your credentials or contact your database administrator.`, 'info');
    return {
      success: false,
      reason: `Cannot access existing database: ${accessCheck.error || 'Permission denied'}`
    };
  }
  
  // This shouldn't happen, but just in case
  return {
    success: false,
    reason: `Unknown database access pattern. Please check your configuration.`
  };
}

// Insert sample data
async function insertSampleData() {
  let connection;
  try {
    log('Inserting sample data...', 'info');
    const result = await getDatabaseConnection();
    
    if (!result.success) {
      return result;
    }
    
    connection = result.connection;
    
    // Create sample users
    log('Creating sample users...', 'info');
    
    // Generate password hashes for admin, helpdesk, and regular users
    const hashAdmin1 = await bcrypt.hash('admin1', 10);
    const hashAdmin2 = await bcrypt.hash('admin2', 10);
    const hashHelpdesk1 = await bcrypt.hash('helpdesk1', 10);
    const hashHelpdesk2 = await bcrypt.hash('helpdesk2', 10);
    const hashHelpdesk3 = await bcrypt.hash('helpdesk3', 10);
    const hashUser1 = await bcrypt.hash('user1', 10);
    const hashUser2 = await bcrypt.hash('user2', 10);
    const hashUser3 = await bcrypt.hash('user3', 10);
    const hashUser4 = await bcrypt.hash('user4', 10);
    const hashUser5 = await bcrypt.hash('user5', 10);
    
    // Insert admin, helpdesk and regular users
    const [userResult] = await connection.query(`
      INSERT INTO users (id, email, username, name, password, role, created_at) VALUES
      (UUID(), ?, ?, ?, ?, ?, NOW()),
      (UUID(), ?, ?, ?, ?, ?, NOW()),
      (UUID(), ?, ?, ?, ?, ?, NOW()),
      (UUID(), ?, ?, ?, ?, ?, NOW()),
      (UUID(), ?, ?, ?, ?, ?, NOW()),
      (UUID(), ?, ?, ?, ?, ?, NOW()),
      (UUID(), ?, ?, ?, ?, ?, NOW()),
      (UUID(), ?, ?, ?, ?, ?, NOW()),
      (UUID(), ?, ?, ?, ?, ?, NOW()),
      (UUID(), ?, ?, ?, ?, ?, NOW())
    `, [
      'admin1@example.com', 'admin1', 'Admin1', hashAdmin1, 'admin',
      'admin2@example.com', 'admin2', 'Admin2', hashAdmin2, 'admin',
      'helpdesk1@example.com', 'helpdesk1', 'Helpdesk1', hashHelpdesk1, 'helpdesk',
      'helpdesk2@example.com', 'helpdesk2', 'Helpdesk2', hashHelpdesk2, 'helpdesk',
      'helpdesk3@example.com', 'helpdesk3', 'Helpdesk3', hashHelpdesk3, 'helpdesk',
      'user1@example.com', 'user1', 'Aditya', hashUser1, 'user',
      'user2@example.com', 'user2', 'Tejas', hashUser2, 'user',
      'user3@example.com', 'user3', 'Eshaan', hashUser3, 'user',
      'user4@example.com', 'user4', 'Vedant', hashUser4, 'user',
      'user5@example.com', 'user5', 'Soumajit', hashUser5, 'user'
    ]);

    // Fetch the user IDs for creating relationships
    const [users] = await connection.query(`SELECT id, email, role FROM users`);
    const adminId = users.find(u => u.email === 'admin1@example.com').id;
    const helpdeskId = users.find(u => u.email === 'helpdesk1@example.com').id;
    const userId = users.find(u => u.email === 'user1@example.com').id;
    
    // Create sample form
    log('Creating sample form...', 'info');
    await connection.query(`
      INSERT INTO form_templates (id, name, fields, created_by) VALUES
      (UUID(), 'IT Support Request', 
       '${JSON.stringify([
         {
           id: "issue_type",
           type: "select",
           label: "Issue Type",
           required: true,
           options: ["Hardware", "Software", "Network", "Other"]
         },
         {
           id: "description",
           type: "textarea",
           label: "Issue Description",
           required: true
         },
         {
           id: "urgency",
           type: "select",
           label: "Urgency",
           required: true,
           options: ["Low", "Medium", "High", "Critical"]
         }
       ])}', 
       '${adminId}')
    `);
    
    // Get form ID and user ID for ticket creation
    const [formResult] = await connection.query("SELECT id FROM form_templates WHERE name = 'IT Support Request'");
    const formId = formResult[0].id;
    
    // Create sample ticket
    log('Creating sample ticket...', 'info');
    await connection.query(`
      INSERT INTO form_submissions (id, form_template_id, submitted_by, form_data, status, priority) VALUES
      (UUID(), '${formId}', '${userId}', 
      '${JSON.stringify({
        issue_type: "Software",
        description: "My email client is not syncing properly",
        urgency: "Medium"
      })}',
      'in_progress', 'medium')
    `);
    
    // Get ticket ID for chat messages
    const [ticketResult] = await connection.query("SELECT id FROM form_submissions LIMIT 1");
    const ticketId = ticketResult[0].id;
    
    // Add sample chat messages
    log('Creating sample chat messages...', 'info');
    await connection.query(`
      INSERT INTO chat_messages (id, ticket_id, sender_id, receiver_id, content) VALUES
      (UUID(), ?, ?, ?, ?),
      (UUID(), ?, ?, ?, ?)
    `, [
      ticketId, userId, helpdeskId, "I am having trouble with my email client. It won't sync.",
      ticketId, helpdeskId, userId, "Have you tried restarting the application? I will look into this issue for you."
    ]);
    
    // Add sample audit logs
    log('Creating sample audit logs...', 'info');
    await connection.query(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details) VALUES
      (UUID(), ?, ?, ?, ?, ?),
      (UUID(), ?, ?, ?, ?, ?),
      (UUID(), ?, ?, ?, ?, ?)
    `, [
      adminId, 'create', 'ticket', ticketId, JSON.stringify({"message": "Ticket created"}),
      adminId, 'assign', 'ticket', ticketId, JSON.stringify({"assignee": helpdeskId}),
      helpdeskId, 'update', 'ticket', ticketId, JSON.stringify({"status": {"from": "open", "to": "in_progress"}})
    ]);
    
    // Add sample quick replies for helpdesk
    log('Creating sample quick replies...', 'info');
    await connection.query(`
      INSERT INTO quick_replies (id, user_id, content, category) VALUES
      (UUID(), ?, ?, ?),
      (UUID(), ?, ?, ?),
      (UUID(), ?, ?, ?)
    `, [
      helpdeskId, 'Thank you for your request. I will look into this right away.', 'greeting',
      helpdeskId, 'Have you tried restarting your computer?', 'troubleshooting',
      helpdeskId, 'Your issue has been resolved. Please let me know if you need further assistance.', 'closing'
    ]);
    
    log('Sample data inserted successfully', 'success');
    return { success: true };
  } catch (error) {
    log(`Failed to insert sample data: ${error.message}`, 'error');
    return { 
      success: false, 
      reason: `Failed to insert sample data: ${error.message}`,
      error 
    };
  } finally {
    if (connection) await connection.end();
  }
}

// Check for sample data
async function checkSampleData() {
  let connection;
  try {
    log('Checking for sample data...', 'step');
    const result = await getDatabaseConnection();
    
    if (!result.success) {
      return result;
    }
    
    connection = result.connection;
    
    // Check users table
    const [userResult] = await connection.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE email IN (
        'admin1@example.com', 'admin2@example.com', 
        'helpdesk1@example.com', 'helpdesk2@example.com', 'helpdesk3@example.com',
        'user1@example.com', 'user2@example.com', 'user3@example.com', 'user4@example.com', 'user5@example.com'
      )
    `);
    
    const hasUsers = userResult[0].count > 0;
    
    // Check forms - use form_templates instead of forms
    const [formResult] = await connection.query(`SELECT COUNT(*) as count FROM form_templates`);
    const hasForms = formResult[0].count > 0;
    
    // Check tickets
    const [ticketResult] = await connection.query(`SELECT COUNT(*) as count FROM form_submissions`);
    const hasTickets = ticketResult[0].count > 0;
    
    // Check messages
    const [messageResult] = await connection.query(`SELECT COUNT(*) as count FROM chat_messages`);
    const hasMessages = messageResult[0].count > 0;
    
    if (!hasUsers) {
      log('No user data found in the database', 'warning');
      return { success: true, hasData: false };
    }
    
    if (hasUsers && hasForms && hasTickets && hasMessages) {
      log('Sample data exists in the database', 'success');
      return { success: true, hasData: true };
    } else {
      log('Partial sample data found, but some elements are missing', 'warning');
      return { success: true, hasData: false };
    }
  } catch (error) {
    log(`Failed to check for sample data: ${error.message}`, 'error');
    return { 
      success: false, 
      reason: `Failed to check for sample data: ${error.message}`, 
      error 
    };
  } finally {
    if (connection) await connection.end();
  }
}

// Seed database with test data
async function seedDatabase(force = false) {
  log('Starting database seeding...', 'step');
  
  const sampleDataResult = await checkSampleData();
  
  if (!sampleDataResult.success) {
    return sampleDataResult;
  }
  
  if (sampleDataResult.hasData && !force) {
    log('Sample data already exists in the database. Use --force to overwrite.', 'warning');
    log('Database seeded successfully!', 'success');
    log('Sample user credentials:', 'info');
    log('  Admin:    admin1@example.com / admin1', 'info');
    log('  Admin:    admin2@example.com / admin2', 'info');
    log('  Helpdesk: helpdesk1@example.com / helpdesk1', 'info');
    log('  Helpdesk: helpdesk2@example.com / helpdesk2', 'info');
    log('  Helpdesk: helpdesk3@example.com / helpdesk3', 'info');
    log('  User:     user1@example.com / user1 (Aditya)', 'info');
    log('  User:     user2@example.com / user2 (Tejas)', 'info');
    log('  User:     user3@example.com / user3 (Eshaan)', 'info');
    log('  User:     user4@example.com / user4 (Vedant)', 'info');
    log('  User:     user5@example.com / user5 (Soumajit)', 'info');
    return { success: true, alreadySeeded: true };
  }
  
  // Insert sample data
  const dataResult = await insertSampleData();
  if (!dataResult.success) {
    return dataResult;
  }
  
  log('Database seeded successfully!', 'success');
  log('Sample user credentials:', 'info');
  log('  Admin:    admin1@example.com / admin1', 'info');
  log('  Admin:    admin2@example.com / admin2', 'info');
  log('  Helpdesk: helpdesk1@example.com / helpdesk1', 'info');
  log('  Helpdesk: helpdesk2@example.com / helpdesk2', 'info');
  log('  Helpdesk: helpdesk3@example.com / helpdesk3', 'info');
  log('  User:     user1@example.com / user1 (Aditya)', 'info');
  log('  User:     user2@example.com / user2 (Tejas)', 'info');
  log('  User:     user3@example.com / user3 (Eshaan)', 'info');
  log('  User:     user4@example.com / user4 (Vedant)', 'info');
  log('  User:     user5@example.com / user5 (Soumajit)', 'info');
  
  return { success: true };
}

// Test database connection
async function testDatabaseConnection() {
  log('Testing database connection...', 'step');
  return await getDatabaseConnection();
}

// Test basic operations
async function testBasicOperations() {
  log('Testing basic database operations...', 'step');
  
  try {
    const connection = await (await getDatabaseConnection()).connection;
    
    // Test INSERT operation
    const testUserName = `test_user_${Date.now()}`;
    const insertResult = await executeQuery(
      connection,
      'INSERT INTO users (id, email, username, name, password, role) VALUES (UUID(), ?, ?, ?, ?, ?)',
      [`${testUserName}@test.com`, testUserName, testUserName, 'testpassword', 'user'],
      'INSERT operation'
    );
    
    if (!insertResult.success) {
      await connection.end();
      return { success: false, reason: insertResult.error };
    }
    
    // Get the user ID we just created
    const [userQuery] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [`${testUserName}@test.com`]
    );
    
    const userId = userQuery[0].id;
    log(`Created test user with ID ${userId}`, 'success');
    
    // Test SELECT operation
    const selectResult = await executeQuery(
      connection,
      'SELECT * FROM users WHERE id = ?',
      [userId],
      'SELECT operation'
    );
    
    if (!selectResult.success) {
      await connection.end();
      return { success: false, reason: selectResult.error };
    }
    
    // Test UPDATE operation
    const updatedName = `${testUserName}_updated`;
    const updateResult = await executeQuery(
      connection,
      'UPDATE users SET name = ? WHERE id = ?',
      [updatedName, userId],
      'UPDATE operation'
    );
    
    if (!updateResult.success) {
      await connection.end();
      return { success: false, reason: updateResult.error };
    }
    
    // Test DELETE operation
    const deleteResult = await executeQuery(
      connection,
      'DELETE FROM users WHERE id = ?',
      [userId],
      'DELETE operation'
    );
    
    if (!deleteResult.success) {
      await connection.end();
      return { success: false, reason: deleteResult.error };
    }
    
    log('All basic database operations completed successfully', 'success');
    
    await connection.end();
    return { success: true };
  } catch (error) {
    log(`Error testing basic operations: ${error.message}`, 'error');
    return { success: false, reason: error.message };
  }
}

// Test database functionality
async function testDatabase() {
  log('Running database tests...', 'step');
  
  const results = {
    mariadb: await checkMariaDBRunning(),
    connection: null,
    tables: null,
    sampleData: null,
    operations: null
  };
  
  if (!results.mariadb) {
    log('MariaDB is not running. Cannot continue with tests.', 'error');
    return results;
  }
  
  results.connection = await testDatabaseConnection();
  
  if (!results.connection.success) {
    log('Database connection failed. Cannot continue with tests.', 'error');
    return results;
  }
  
  results.tables = await checkRequiredTables();
  results.sampleData = await checkSampleData();
  results.operations = await testBasicOperations();
  
  // Show summary
  log('==== TEST SUMMARY ====', 'info');
  log(`MariaDB Running: ${results.mariadb ? 'PASS' : 'FAIL'}`, results.mariadb ? 'success' : 'error');
  log(`Database Connection: ${results.connection.success ? 'PASS' : 'FAIL'}`, results.connection.success ? 'success' : 'error');
  log(`Table Structure: ${results.tables.success ? 'PASS' : 'FAIL'}`, results.tables.success ? 'success' : 'error');
  log(`Sample Data: ${results.sampleData.success ? 'PASS' : 'FAIL'}`, results.sampleData.success ? 'success' : 'error');
  log(`Basic Operations: ${results.operations.success ? 'PASS' : 'FAIL'}`, results.operations.success ? 'success' : 'error');
  
  const allPassed = results.mariadb && 
                    results.connection.success && 
                    results.tables.success && 
                    results.sampleData.success && 
                    results.operations.success;
  
  if (allPassed) {
    log('All tests passed! Your database is correctly set up and functioning properly.', 'success');
  } else {
    log('Some tests failed. Please check the logs above for details.', 'warning');
  }
  
  return results;
}

// Export database
async function exportDatabase(exportPath = null) {
  try {
    if (!exportPath) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportDir = path.join(process.cwd(), 'backups');
      const filename = `${dbConfig.database}_${timestamp}.sql`;
      exportPath = path.join(exportDir, filename);
      
      // Create backups directory if it doesn't exist
      try {
        await fs.mkdir(exportDir, { recursive: true });
      } catch (err) {
        // Ignore if directory already exists
      }
    }
    
    log(`Exporting database to ${exportPath}...`, 'step');
    
    const command = `mysqldump -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} ${dbConfig.password ? `-p${dbConfig.password}` : ''} ${dbConfig.database} > "${exportPath}"`;
    execSync(command, { stdio: 'ignore' });
    
    log(`Database exported successfully to ${exportPath}`, 'success');
    return { success: true, path: exportPath };
  } catch (error) {
    log(`Failed to export database: ${error.message}`, 'error');
    return { success: false, reason: error.message };
  }
}

// Import database
async function importDatabase(filePath) {
  try {
    if (!filePath) {
      return { success: false, reason: 'No file path provided for import' };
    }
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (err) {
      return { success: false, reason: `Import file not found: ${filePath}` };
    }
    
    log(`Importing database from ${filePath}...`, 'step');
    
    // First create the database if it doesn't exist
    const dbExists = await checkDatabaseExists();
    if (!dbExists.exists) {
      log('Database does not exist. Creating it first.', 'info');
      const createResult = await createDatabase();
      if (!createResult.success) {
        return createResult;
      }
    }
    
    const command = `mysql -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} ${dbConfig.password ? `-p${dbConfig.password}` : ''} ${dbConfig.database} < "${filePath}"`;
    execSync(command, { stdio: 'ignore' });
    
    log(`Database imported successfully from ${filePath}`, 'success');
    return { success: true };
  } catch (error) {
    log(`Failed to import database: ${error.message}`, 'error');
    return { success: false, reason: error.message };
  }
}

// Drop all tables
async function dropTables() {
  let connection;
  try {
    log('Dropping all tables...', 'step');
    const result = await getDatabaseConnection();
    
    if (!result.success) {
      return result;
    }
    
    connection = result.connection;
    
    // Disable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Get all tables
    const [tables] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ?
    `, [dbConfig.database]);
    
    const tableNames = tables.map(t => t.TABLE_NAME || t.table_name);
    log(`Found ${tableNames.length} tables to drop: ${tableNames.join(', ')}`, 'info');
    
    // Drop each table
    for (const tableName of tableNames) {
      await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
      log(`Dropped table: ${tableName}`, 'info');
    }
    
    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    log('All tables dropped successfully', 'success');
    return { success: true };
  } catch (error) {
    log(`Failed to drop tables: ${error.message}`, 'error');
    return { 
      success: false, 
      reason: `Failed to drop tables: ${error.message}`,
      error 
    };
  } finally {
    if (connection) {
      try {
        // Ensure foreign key checks are re-enabled
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        await connection.end();
      } catch (err) {
        // Ignore errors during cleanup
      }
    }
  }
}

// Drop database
async function dropDatabase(dbName = dbConfig.database) {
  let connection;
  try {
    log(`Dropping database ${dbName}...`, 'step');
    
    // First check if we can connect to server without specifying database
    let serverConnection;
    try {
      const config = {...dbConfig};
      delete config.database;
      serverConnection = await mysql.createConnection(config);
      
      // Try to drop with current user
      try {
        log('Attempting to drop database with current user credentials...', 'info');
        await serverConnection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
        log(`Database ${dbName} dropped successfully`, 'success');
        await serverConnection.end();
        return { success: true };
      } catch (dropError) {
        // If access denied, try with root credentials
        if (dropError.code === 'ER_DBACCESS_DENIED_ERROR' || dropError.code === 'ER_ACCESS_DENIED_ERROR') {
          log('Current user does not have permission to drop database, trying with root credentials...', 'warning');
          await serverConnection.end();
          
          // Try with root credentials
          const rootUser = process.env.MARIADB_ROOT_USER || process.env.DB_ROOT_USER;
          const rootPassword = process.env.MARIADB_ROOT_PASSWORD || process.env.DB_ROOT_PASSWORD;
          
          if (rootUser && rootPassword) {
            try {
              const rootConfig = {
                host: dbConfig.host,
                port: dbConfig.port,
                user: rootUser,
                password: rootPassword
              };
              
              const rootConnection = await mysql.createConnection(rootConfig);
              await rootConnection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
              log(`Database ${dbName} dropped successfully using root credentials`, 'success');
              await rootConnection.end();
              return { success: true };
            } catch (rootError) {
              log(`Failed to drop database with root credentials: ${rootError.message}`, 'error');
              throw rootError;
            }
          } else {
            log(`Root credentials not found in environment variables`, 'warning');
            throw dropError;
          }
        } else {
          // Some other error occurred
          throw dropError;
        }
      }
    } catch (serverConnectError) {
      log(`Could not connect to database server: ${serverConnectError.message}`, 'error');
      throw serverConnectError;
    }
  } catch (error) {
    // Provide helpful instructions if we get access errors
    if (error.code === 'ER_DBACCESS_DENIED_ERROR' || error.code === 'ER_ACCESS_DENIED_ERROR') {
      log(`Insufficient privileges to drop database. Try one of the following:`, 'warning');
      log(`1. Add MARIADB_ROOT_USER and MARIADB_ROOT_PASSWORD to your .env.local file`, 'info');
      log(`2. Drop the database manually using a database client with admin access:`, 'info');
      log(`   DROP DATABASE ${dbName};`, 'info');
    }
    
    log(`Failed to drop database: ${error.message}`, 'error');
    return { 
      success: false, 
      reason: `Failed to drop database: ${error.message}`,
      error 
    };
  }
}

// Reset database (drop and recreate)
async function resetDatabase(dbName = dbConfig.database) {
  log('Resetting database (drop and recreate)...', 'step');
  
  // Drop database
  const dropResult = await dropDatabase(dbName);
  if (!dropResult.success) {
    return dropResult;
  }
  
  // Create database
  const createResult = await createDatabase(dbName);
  if (!createResult.success) {
    return createResult;
  }
  
  // Create tables
  const tablesResult = await createTables();
  if (!tablesResult.success) {
    return tablesResult;
  }
  
  log('Database reset completed successfully', 'success');
  return { success: true };
}

// Add migration functions to apply schema updates
async function applyMigration(migrationName) {
  log(`Applying migration: ${migrationName}...`, 'step');
  
  switch (migrationName) {
    case 'message-attachments':
      return await addMessageAttachments();
    case 'ticket-audit':
      return await addTicketAuditTable();
    case 'fix-collation':
      return await fixCollation();
    case 'ticket-id':
      return await updateTicketIdSchema();
    case 'verify-columns':
      return await verifyColumns();
    case 'fix-audit-logs':
      return await addAuditLogColumns();
    default:
      log(`Unknown migration: ${migrationName}`, 'error');
      return { success: false, reason: `Unknown migration: ${migrationName}` };
  }
}

// Update ticket schema to use ticket_id
async function updateTicketIdSchema() {
  let connection;
  try {
    log('Updating ticket ID schema...', 'step');
    const result = await getDatabaseConnection();
    
    if (!result.success) {
      return result;
    }
    
    connection = result.connection;
    
    // Check if the column exists in messages table
    const [messagesColumns] = await connection.query(`
      SHOW COLUMNS FROM chat_messages LIKE 'ticket_id'
    `);
    
    if (messagesColumns.length > 0) {
      log('Ticket ID column already exists in chat_messages table', 'info');
    } else {
      // Add ticket_id column
      await connection.query(`
        ALTER TABLE chat_messages 
        ADD COLUMN ticket_id VARCHAR(36) NULL,
        ADD FOREIGN KEY (ticket_id) REFERENCES form_submissions(id) ON DELETE CASCADE
      `);
      log('Added ticket_id column to chat_messages table', 'success');
    }
    
    log('Ticket ID schema update completed successfully', 'success');
    return { success: true };
  } catch (error) {
    log(`Failed to update ticket ID schema: ${error.message}`, 'error');
    return { 
      success: false, 
      reason: `Failed to update ticket ID schema: ${error.message}`,
      error 
    };
  } finally {
    if (connection) await connection.end();
  }
}

// Add message attachments
async function addMessageAttachments() {
  let connection;
  try {
    log('Adding message attachments support...', 'step');
    const result = await getDatabaseConnection();
    
    if (!result.success) {
      return result;
    }
    
    connection = result.connection;
    
    // Check if attachment columns already exist
    const [attachmentColumns] = await connection.query(`
      SHOW COLUMNS FROM chat_messages LIKE 'attachment_url'
    `);
    
    if (attachmentColumns.length > 0) {
      log('Message attachment columns already exist', 'info');
      return { success: true, skipped: true };
    }
    
    // Add attachment columns
    await connection.query(`
      ALTER TABLE chat_messages 
      ADD COLUMN attachment_url VARCHAR(255) NULL,
      ADD COLUMN attachment_type VARCHAR(50) NULL,
      ADD COLUMN attachment_name VARCHAR(255) NULL,
      ADD COLUMN attachment_size INT NULL
    `);
    
    log('Message attachment columns added successfully', 'success');
    return { success: true };
  } catch (error) {
    log(`Failed to add message attachments: ${error.message}`, 'error');
    return { 
      success: false, 
      reason: `Failed to add message attachments: ${error.message}`,
      error 
    };
  } finally {
    if (connection) await connection.end();
  }
}

// Add ticket audit table
async function addTicketAuditTable() {
  let connection;
  try {
    log('Adding ticket audit table...', 'step');
    const result = await getDatabaseConnection();
    
    if (!result.success) {
      return result;
    }
    
    connection = result.connection;
    
    // Check if table already exists
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'audit_logs'
    `);
    
    if (tables.length > 0) {
      log('Audit logs table already exists', 'info');
      return { success: true, skipped: true };
    }
    
    // Create audit logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(255) NOT NULL,
        entity_id VARCHAR(36) NOT NULL,
        details JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    
    log('Audit logs table created successfully', 'success');
    return { success: true };
  } catch (error) {
    log(`Failed to create audit logs table: ${error.message}`, 'error');
    return { 
      success: false, 
      reason: `Failed to create audit logs table: ${error.message}`,
      error 
    };
  } finally {
    if (connection) await connection.end();
  }
}

// Fix database collation
async function fixCollation() {
  let connection;
  try {
    log('Fixing table collation...', 'step');
    const result = await getDatabaseConnection();
    
    if (!result.success) {
      return result;
    }
    
    connection = result.connection;
    
    // Get all tables
    const [tables] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ?
    `, [dbConfig.database]);
    
    const tableNames = tables.map(t => t.TABLE_NAME || t.table_name);
    
    // Fix collation for each table
    for (const tableName of tableNames) {
      await connection.query(`ALTER TABLE \`${tableName}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      log(`Fixed collation for table: ${tableName}`, 'info');
    }
    
    log('All tables converted to utf8mb4_unicode_ci collation', 'success');
    return { success: true };
  } catch (error) {
    log(`Failed to fix table collation: ${error.message}`, 'error');
    return { 
      success: false, 
      reason: `Failed to fix table collation: ${error.message}`,
      error 
    };
  } finally {
    if (connection) await connection.end();
  }
}

// Verify required columns
async function verifyColumns() {
  let connection;
  try {
    log('Verifying database columns...', 'step');
    const result = await getDatabaseConnection();
    
    if (!result.success) {
      return result;
    }
    
    connection = result.connection;
    
    // Expected columns for key tables
    const expectedColumns = {
      'form_submissions': [
        'id', 'form_template_id', 'submitted_by', 'form_data', 'status', 'priority', 'created_at', 'updated_at'
      ],
      'chat_messages': [
        'id', 'ticket_id', 'sender_id', 'receiver_id', 'content',
        'attachment_url', 'attachment_type', 'attachment_name', 'attachment_size',
        'read', 'created_at', 'updated_at'
      ],
      'users': [
        'id', 'email', 'username', 'name', 'password', 'role', 
        'profile_image', 'created_at', 'updated_at'
      ],
      'audit_logs': [
        'id', 'user_id', 'action', 'entity_type', 'entity_id', 
        'details', 'created_at'
      ]
    };
    
    let missingColumns = {};
    let hasIssues = false;
    
    // Check each table
    for (const [tableName, columns] of Object.entries(expectedColumns)) {
      try {
        // First check if table exists
        const [tableCheck] = await connection.query(`
          SHOW TABLES LIKE '${tableName}'
        `);
        
        if (tableCheck.length === 0) {
          log(`Table ${tableName} does not exist`, 'warning');
          missingColumns[tableName] = { tableExists: false };
          hasIssues = true;
          continue;
        }
        
        // Get existing columns
        const [tableColumns] = await connection.query(`SHOW COLUMNS FROM ${tableName}`);
        const existingColumns = tableColumns.map(col => col.Field);
        
        // Check for missing columns
        const missing = columns.filter(col => !existingColumns.includes(col));
        
        if (missing.length > 0) {
          log(`Table ${tableName} is missing columns: ${missing.join(', ')}`, 'warning');
          missingColumns[tableName] = { tableExists: true, missingColumns: missing };
          hasIssues = true;
        }
      } catch (error) {
        log(`Error checking ${tableName}: ${error.message}`, 'error');
        missingColumns[tableName] = { error: error.message };
        hasIssues = true;
      }
    }
    
    if (hasIssues) {
      log('Column verification found issues', 'warning');
      return { 
        success: false, 
        reason: 'Column verification found issues',
        missingColumns 
      };
    }
    
    log('All columns verified successfully', 'success');
    return { success: true };
  } catch (error) {
    log(`Failed to verify columns: ${error.message}`, 'error');
    return { 
      success: false, 
      reason: `Failed to verify columns: ${error.message}`,
      error 
    };
  } finally {
    if (connection) await connection.end();
  }
}

// Run all migrations
async function runAllMigrations() {
  log('Running all database migrations...', 'step');
  
  const migrations = [
    'ticket-id',
    'message-attachments',
    'ticket-audit',
    'fix-collation',
    'fix-audit-logs'
  ];
  
  const results = {};
  let allSuccessful = true;
  
  for (const migration of migrations) {
    log(`Running migration: ${migration}`, 'info');
    const result = await applyMigration(migration);
    results[migration] = result;
    
    if (!result.success) {
      allSuccessful = false;
      log(`Migration ${migration} failed: ${result.reason}`, 'error');
    }
  }
  
  // Verify columns at the end
  const verifyResult = await verifyColumns();
  results['verify-columns'] = verifyResult;
  
  if (!verifyResult.success) {
    allSuccessful = false;
  }
  
  if (allSuccessful) {
    log('All migrations completed successfully', 'success');
  } else {
    log('Some migrations failed. Check the logs for details', 'warning');
  }
  
  return { success: allSuccessful, results };
}

/**
 * Adds and migrates columns for audit logs
 */
async function addAuditLogColumns() {
  let connection;
  try {
    log('Adding audit log columns...', 'step');
    const result = await getDatabaseConnection();
    
    if (!result.success) {
      return result;
    }
    
    connection = result.connection;
    
    // First check if the columns exist
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM audit_logs LIKE 'previous_value'
    `);
    
    if (columns.length === 0) {
      log('Adding previous_value and new_value columns to audit_logs table...', 'info');
      await connection.query(`
        ALTER TABLE audit_logs
        ADD COLUMN previous_value TEXT AFTER entity_id,
        ADD COLUMN new_value TEXT AFTER previous_value
      `);
      log('Columns added successfully', 'success');
      
      // Migrate any existing data
      log('Migrating existing audit data...', 'info');
      const [records] = await connection.query(`
        SELECT id, details
        FROM audit_logs
        WHERE details IS NOT NULL
          AND (previous_value IS NULL OR previous_value = '')
      `);
      
      log(`Found ${records.length} records to migrate`, 'info');
      
      let migratedCount = 0;
      for (const record of records) {
        try {
          const details = typeof record.details === 'string' 
            ? JSON.parse(record.details) 
            : record.details;
          
          if (details && (details.previous_value || details.previousValue || details.from)) {
            const previousValue = details.previous_value || details.previousValue || details.from;
            const newValue = details.new_value || details.newValue || details.to;
            
            await connection.query(`
              UPDATE audit_logs
              SET previous_value = ?,
                  new_value = ?
              WHERE id = ?
            `, [
              previousValue ? String(previousValue) : null,
              newValue ? String(newValue) : null,
              record.id
            ]);
            
            migratedCount++;
          }
        } catch (err) {
          log(`Error migrating record ${record.id}: ${err.message}`, 'warning');
        }
      }
      
      log(`Successfully migrated ${migratedCount} records`, 'success');
      return { success: true, message: 'Audit columns added and data migrated' };
    } else {
      log('previous_value column already exists, skipping migration', 'info');
      return { success: true, message: 'Audit columns already exist' };
    }
  } catch (error) {
    log(`Failed to add audit columns: ${error.message}`, 'error');
    return { 
      success: false, 
      reason: `Failed to add audit columns: ${error.message}`,
      error 
    };
  } finally {
    if (connection) await connection.end();
  }
}

// Export functions for use in other scripts
module.exports = {
  log,
  createReadlineInterface,
  askQuestion,
  checkMariaDBRunning,
  getDatabaseConnection,
  executeQuery,
  fileExists,
  checkDatabaseExists,
  createDatabase,
  createTables,
  checkRequiredTables,
  setupDatabase,
  insertSampleData,
  checkSampleData,
  seedDatabase,
  testDatabaseConnection,
  testBasicOperations,
  testDatabase,
  exportDatabase,
  importDatabase,
  dropTables,
  dropDatabase,
  resetDatabase,
  updateTicketIdSchema,
  addMessageAttachments,
  addTicketAuditTable,
  fixCollation,
  verifyColumns,
  applyMigration,
  runAllMigrations
};

// When run directly, parse command line arguments and execute
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  // Parse options
  const force = args.includes('--force') || args.includes('-f');
  const verbose = args.includes('--verbose') || args.includes('-v');
  
  // Extract credentials from command line if provided
  const userArg = args.find(arg => arg.startsWith('--user='));
  const passwordArg = args.find(arg => arg.startsWith('--password='));
  const hostArg = args.find(arg => arg.startsWith('--host='));
  const portArg = args.find(arg => arg.startsWith('--port='));
  const databaseArg = args.find(arg => arg.startsWith('--database='));
  const rootUserArg = args.find(arg => arg.startsWith('--root-user='));
  const rootPasswordArg = args.find(arg => arg.startsWith('--root-password='));
  
  // Override config with command line arguments if provided
  if (userArg) dbConfig.user = userArg.replace('--user=', '');
  if (passwordArg) dbConfig.password = passwordArg.replace('--password=', '');
  if (hostArg) dbConfig.host = hostArg.replace('--host=', '');
  if (portArg) dbConfig.port = parseInt(portArg.replace('--port=', ''), 10);
  if (databaseArg) dbConfig.database = databaseArg.replace('--database=', '');
  
  // Set root credentials if provided
  if (rootUserArg) process.env.MARIADB_ROOT_USER = rootUserArg.replace('--root-user=', '');
  if (rootPasswordArg) process.env.MARIADB_ROOT_PASSWORD = rootPasswordArg.replace('--root-password=', '');
  
  // Extract file path for backup/restore operations
  let filePath = null;
  const fileArg = args.find(arg => arg.startsWith('--file='));
  if (fileArg) {
    filePath = fileArg.replace('--file=', '');
  }
  
  // Show help if no arguments or help requested
  if (!command || args.includes('--help') || args.includes('-h')) {
    console.log(chalk.bold.blue('\nDatabase Master Script for Ticketing App\n'));
    console.log('Usage: node db-master.js [command] [options]\n');
    console.log('Commands:');
    console.log('  setup     - Set up database and tables');
    console.log('  seed      - Insert sample data');
    console.log('  test      - Test database connectivity and structure');
    console.log('  backup    - Create a database backup');
    console.log('  restore   - Restore from a database backup');
    console.log('  reset     - Reset database (drop and recreate)');
    console.log('  drop      - Drop database (destructive!)');
    console.log('  migrate   - Run all migrations and verify columns');
    console.log('  verify    - Verify database columns');
    console.log('\nMigration Commands:');
    console.log('  migration [name] - Run a specific migration');
    console.log('  Available migrations:');
    console.log('    ticket-id          - Update ticket ID schema');
    console.log('    message-attachments - Add message attachments support');
    console.log('    ticket-audit       - Add ticket audit table');
    console.log('    fix-collation      - Fix database collation');
    console.log('\nOptions:');
    console.log('  --help, -h     - Show this help message');
    console.log('  --force, -f    - Skip confirmation prompts');
    console.log('  --verbose, -v  - Show more detailed output');
    console.log('  --file=PATH    - Specify file path for backup/restore');
    console.log('\nDatabase Connection Options:');
    console.log('  --host=HOST       - Database host');
    console.log('  --port=PORT       - Database port');
    console.log('  --user=USER       - Database user');
    console.log('  --password=PASS   - Database password');
    console.log('  --root-user=USER  - Root user (for creating/dropping databases)');
    console.log('  --root-password=PASS  - Root password');
    console.log('\nExample: node db-master.js setup --user=myuser --password=mypass\n');
    process.exit(0);
  }

  // Process commands
  (async () => {
    switch (command) {
      case 'setup':
        log('Setting up database...', 'step');
        const setupResult = await setupDatabase(force);
        if (setupResult.success) {
          log('Database setup completed successfully!', 'success');
          log('You can now run the "seed" command to add sample data.', 'info');
        } else {
          log(`Database setup failed: ${setupResult.reason}`, 'error');
          process.exit(1);
        }
        break;
        
      case 'seed':
        log('Seeding database with sample data...', 'step');
        const seedResult = await seedDatabase(force);
        if (seedResult.success) {
          if (seedResult.alreadySeeded) {
            log('Sample data already exists. Skipped seeding.', 'warning');
            log('Use --force to replace existing data.', 'info');
          } else {
            log('Database seeded successfully!', 'success');
            log('Sample user credentials:', 'info');
            log('  Admin:    admin1@example.com / admin1', 'info');
            log('  Admin:    admin2@example.com / admin2', 'info');
            log('  Helpdesk: helpdesk1@example.com / helpdesk1', 'info');
            log('  Helpdesk: helpdesk2@example.com / helpdesk2', 'info');
            log('  Helpdesk: helpdesk3@example.com / helpdesk3', 'info');
            log('  User:     user1@example.com / user1 (Aditya)', 'info');
            log('  User:     user2@example.com / user2 (Tejas)', 'info');
            log('  User:     user3@example.com / user3 (Eshaan)', 'info');
            log('  User:     user4@example.com / user4 (Vedant)', 'info');
            log('  User:     user5@example.com / user5 (Soumajit)', 'info');
          }
        } else {
          log(`Database seeding failed: ${seedResult.reason}`, 'error');
          process.exit(1);
        }
        break;
        
      case 'test':
        log('Testing database...', 'step');
        const testResult = await testDatabase();
        const allTestsPassed = testResult.mariadb && 
                              testResult.connection?.success && 
                              testResult.tables?.success && 
                              testResult.sampleData?.success && 
                              testResult.operations?.success;
                              
        if (!allTestsPassed) {
          process.exit(1);
        }
        break;
        
      case 'backup':
        log('Creating database backup...', 'step');
        const backupResult = await exportDatabase(filePath);
        if (backupResult.success) {
          log(`Database backup created: ${backupResult.path}`, 'success');
        } else {
          log(`Backup failed: ${backupResult.reason}`, 'error');
          process.exit(1);
        }
        break;
        
      case 'restore':
        if (!filePath) {
          log('Please specify a file to restore from using --file=PATH', 'error');
          process.exit(1);
        }
        
        if (!force) {
          const rl = createReadlineInterface();
          const answer = await askQuestion(rl, `This will overwrite your current database. Are you sure? (y/N): `);
          rl.close();
          
          if (answer.toLowerCase() !== 'y') {
            log('Restore cancelled by user', 'warning');
            process.exit(0);
          }
        }
        
        log(`Restoring database from ${filePath}...`, 'step');
        const restoreResult = await importDatabase(filePath);
        if (restoreResult.success) {
          log('Database restored successfully!', 'success');
        } else {
          log(`Restore failed: ${restoreResult.reason}`, 'error');
          process.exit(1);
        }
        break;
        
      case 'reset':
        if (!force) {
          const rl = createReadlineInterface();
          const answer = await askQuestion(rl, `This will DESTROY your current database and recreate it. All data will be lost. Are you sure? (y/N): `);
          rl.close();
          
          if (answer.toLowerCase() !== 'y') {
            log('Reset cancelled by user', 'warning');
            process.exit(0);
          }
        }
        
        log('Resetting database...', 'step');
        const resetResult = await resetDatabase();
        if (resetResult.success) {
          log('Database reset successfully!', 'success');
          log('You can now run the "seed" command to add sample data.', 'info');
        } else {
          log(`Reset failed: ${resetResult.reason}`, 'error');
          process.exit(1);
        }
        break;
        
      case 'drop':
        if (!force) {
          const rl = createReadlineInterface();
          const answer = await askQuestion(rl, `This will PERMANENTLY DELETE your database. All data will be lost. Are you ABSOLUTELY sure? (y/N): `);
          rl.close();
          
          if (answer.toLowerCase() !== 'y') {
            log('Drop cancelled by user', 'warning');
            process.exit(0);
          }
        }
        
        log('Dropping database...', 'step');
        const dropResult = await dropDatabase();
        if (dropResult.success) {
          log('Database dropped successfully!', 'success');
        } else {
          log(`Drop failed: ${dropResult.reason}`, 'error');
          process.exit(1);
        }
        break;
        
      case 'migrate':
        log('Running all migrations...', 'step');
        const migrateResult = await runAllMigrations();
        if (migrateResult.success) {
          log('All migrations completed successfully!', 'success');
        } else {
          log('Some migrations failed. Check the logs for details.', 'warning');
          process.exit(1);
        }
        break;
        
      case 'migration':
        const migrationName = args[1];
        if (!migrationName) {
          log('Please specify a migration name', 'error');
          log('Available migrations: ticket-id, message-attachments, ticket-audit, fix-collation, verify-columns', 'info');
          process.exit(1);
        }
        
        log(`Running migration: ${migrationName}...`, 'step');
        const migrationResult = await applyMigration(migrationName);
        if (migrationResult.success) {
          log(`Migration ${migrationName} applied successfully!`, 'success');
        } else {
          log(`Migration failed: ${migrationResult.reason}`, 'error');
          process.exit(1);
        }
        break;
        
      case 'verify':
        log('Verifying database columns...', 'step');
        const verifyResult = await verifyColumns();
        if (verifyResult.success) {
          log('All database columns verified successfully!', 'success');
        } else {
          log(`Verification failed: ${verifyResult.reason}`, 'error');
          if (verifyResult.missingColumns) {
            for (const [table, info] of Object.entries(verifyResult.missingColumns)) {
              if (!info.tableExists) {
                log(`Table ${table} does not exist`, 'error');
              } else if (info.missingColumns) {
                log(`Table ${table} is missing columns: ${info.missingColumns.join(', ')}`, 'error');
              }
            }
          }
          process.exit(1);
        }
        break;
        
      default:
        log(`Unknown command: ${command}`, 'error');
        log('Use --help to see available commands', 'info');
        process.exit(1);
    }
  })().catch(error => {
    log(`Unexpected error: ${error.message}`, 'error');
    if (verbose) {
      console.error(error);
    }
    process.exit(1);
  });
}