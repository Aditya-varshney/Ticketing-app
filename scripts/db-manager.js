#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const chalk = require('chalk');
const { exec, execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const util = require('util');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || process.env.MARIADB_HOST || 'localhost',
  port: process.env.DB_PORT || process.env.MARIADB_PORT || '3306',
  user: process.env.DB_USER || process.env.MARIADB_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.MARIADB_PASSWORD || '',
  database: process.env.DB_NAME || process.env.MARIADB_DATABASE || 'ticketing',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// App user to create
const appUser = {
  username: process.env.APP_DB_USER || process.env.MARIADB_USER || 'ticketing_app',
  password: process.env.APP_DB_PASSWORD || process.env.MARIADB_PASSWORD || 'secure_password'
};

// Required tables
const requiredTables = [
  'users',
  'forms',
  'form_submissions',
  'chat_messages',
  'message_attachments',
  'ticket_audit'
];

// Logging helper
function log(type, message) {
  const timestamp = new Date().toISOString().replace('T', ' ').substr(0, 19);
  switch (type) {
    case 'error':
      console.error(chalk.red(`[${timestamp}] ERROR: ${message}`));
      break;
    case 'success':
      console.log(chalk.green(`[${timestamp}] SUCCESS: ${message}`));
      break;
    case 'warning':
      console.log(chalk.yellow(`[${timestamp}] WARNING: ${message}`));
      break;
    case 'info':
    default:
      console.log(chalk.blue(`[${timestamp}] INFO: ${message}`));
  }
}

// Create readline interface
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Promisify readline question
async function askQuestion(rl, query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Check if MariaDB is running
async function checkMariaDBRunning() {
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
              resolve(false);
            } else {
              resolve(stdout2.toLowerCase().includes('active') || stdout2.toLowerCase().includes('running'));
            }
          });
        } else {
          resolve(false);
        }
      } else {
        if (process.platform === 'win32') {
          resolve(stdout.includes('RUNNING'));
        } else {
          resolve(stdout.trim().length > 0);
        }
      }
    });
  });
}

// Get database connection
async function getDatabaseConnection(skipDatabase = false) {
  try {
    const config = {...dbConfig};
    
    if (skipDatabase) {
      delete config.database;
    }
    
    const connection = await mysql.createConnection(config);
    if (skipDatabase) {
      log('info', `Connected to MariaDB server on ${dbConfig.host}.`);
    } else {
      log('info', `Connected to database '${dbConfig.database}'.`);
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
    
    return { 
      success: false, 
      reason,
      errorCode: error.code,
      error
    };
  }
}

// Get connection pool
async function getConnectionPool(skipDatabase = false) {
  try {
    const config = {...dbConfig};
    
    if (skipDatabase) {
      delete config.database;
    }
    
    const pool = mysql.createPool(config);
    return { success: true, pool };
  } catch (error) {
    return { success: false, reason: error.message };
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
    return { success: false, exists: false, reason: error.message };
  }
}

// Create database
async function createDatabase(dbName = dbConfig.database) {
  let connection;
  try {
    log('info', `Creating database ${dbName}...`);
    const result = await getDatabaseConnection(false);
    
    if (!result.success) {
      return result;
    }
    
    connection = result.connection;
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    log('success', `Database ${dbName} created or already exists.`);
    
    // Create application user if specified and different from connection user
    if (dbConfig.user !== appUser.username) {
      log('info', `Creating or updating application user ${appUser.username}...`);
      
      // Check if user exists and delete if so (to reset permissions)
      await connection.query(`DROP USER IF EXISTS '${appUser.username}'@'%'`);
      await connection.query(`DROP USER IF EXISTS '${appUser.username}'@'localhost'`);
      
      // Create user with all privileges
      await connection.query(`CREATE USER '${appUser.username}'@'%' IDENTIFIED BY '${appUser.password}'`);
      await connection.query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${appUser.username}'@'%'`);
      await connection.query(`FLUSH PRIVILEGES`);
      
      log('success', `Application user ${appUser.username} created with all privileges on ${dbName}.`);
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      reason: `Failed to create database: ${error.message}`,
      error
    };
  } finally {
    if (connection) await connection.end();
  }
}

// Reset database (drop and recreate)
async function resetDatabase(dbName = dbConfig.database) {
  log('info', 'Resetting database (drop and recreate)...');
  
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
  
  log('success', 'Database reset completed successfully.');
  return { success: true };
}

// Check required tables
async function checkRequiredTables() {
  let connection;
  try {
    log('info', 'Checking required tables...');
    const result = await getDatabaseConnection();
    
    if (!result.success) {
      return result;
    }
    
    connection = result.connection;
    
    // List of tables to check
    const requiredTables = ['users', 'forms', 'form_submissions', 'chat_messages', 'audit_logs', 'quick_replies', 'file_attachments'];
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
      return {
        success: false,
        reason: `Missing tables: ${missingTables.join(', ')}`,
        missingTables,
        existingTables: tableDetails
      };
    }
    
    log('success', 'All required tables exist.');
    return { success: true, tables: tableDetails };
  } catch (error) {
    return { 
      success: false, 
      reason: `Failed to check tables: ${error.message}`,
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
    log('info', 'Creating tables...');
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
      
      `CREATE TABLE IF NOT EXISTS forms (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        fields JSON NOT NULL,
        status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      
      `CREATE TABLE IF NOT EXISTS form_submissions (
        id VARCHAR(36) PRIMARY KEY,
        form_id VARCHAR(36) NOT NULL,
        submitter_id VARCHAR(36) NOT NULL,
        assigned_to VARCHAR(36),
        assigned_by VARCHAR(36),
        form_data JSON NOT NULL,
        status ENUM('open', 'in_progress', 'resolved', 'closed', 'reopened') NOT NULL DEFAULT 'open',
        priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
        FOREIGN KEY (submitter_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
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
        read BOOLEAN DEFAULT FALSE,
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
    
    log('success', 'All tables created successfully.');
    return { success: true };
  } catch (error) {
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

// Insert sample data
async function insertSampleData() {
  let connection;
  try {
    log('info', 'Inserting sample data...');
    const result = await getDatabaseConnection();
    
    if (!result.success) {
      return result;
    }
    
    connection = result.connection;
    
    // Check if users table already has data
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    if (users[0].count > 0) {
      log('warning', 'Sample data already exists. Skipping data insertion.');
      return { success: true, skipped: true };
    }
    
    // Insert sample users (password is "password" hashed with bcrypt)
    const bcryptHash = '$2b$10$rQWn0VifYgH5GH7NSwkn8.XPY1GHSJFz0nKiIJ/JTYJAv0BLGgSOy';
    await connection.query(`
      INSERT INTO users (id, email, username, name, password, role) VALUES
      (UUID(), 'admin@example.com', 'admin', 'Admin User', '${bcryptHash}', 'admin'),
      (UUID(), 'helpdesk@example.com', 'helpdesk', 'Helpdesk User', '${bcryptHash}', 'helpdesk'),
      (UUID(), 'user@example.com', 'user', 'Regular User', '${bcryptHash}', 'user')
    `);
    
    // Get admin ID
    const [adminResult] = await connection.query("SELECT id FROM users WHERE email = 'admin@example.com'");
    const adminId = adminResult[0].id;
    
    // Create sample form
    await connection.query(`
      INSERT INTO forms (id, title, description, fields, created_by) VALUES
      (UUID(), 'IT Support Request', 'Use this form to request IT support', 
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
    
    // Get form ID and user ID
    const [formResult] = await connection.query("SELECT id FROM forms WHERE title = 'IT Support Request'");
    const formId = formResult[0].id;
    
    const [userResult] = await connection.query("SELECT id FROM users WHERE email = 'user@example.com'");
    const userId = userResult[0].id;
    
    const [helpdeskResult] = await connection.query("SELECT id FROM users WHERE email = 'helpdesk@example.com'");
    const helpdeskId = helpdeskResult[0].id;
    
    // Create sample ticket
    await connection.query(`
      INSERT INTO form_submissions (id, form_id, submitter_id, assigned_to, assigned_by, form_data, status, priority) VALUES
      (UUID(), '${formId}', '${userId}', '${helpdeskId}', '${adminId}',
      '${JSON.stringify({
        issue_type: "Software",
        description: "My email client is not syncing properly",
        urgency: "Medium"
      })}',
      'in_progress', 'medium')
    `);
    
    // Get ticket ID
    const [ticketResult] = await connection.query("SELECT id FROM form_submissions LIMIT 1");
    const ticketId = ticketResult[0].id;
    
    // Add sample chat messages
    await connection.query(`
      INSERT INTO chat_messages (id, ticket_id, sender_id, receiver_id, content) VALUES
      (UUID(), '${ticketId}', '${userId}', '${helpdeskId}', 'I am having trouble with my email client. It won't sync.'),
      (UUID(), '${ticketId}', '${helpdeskId}', '${userId}', 'Have you tried restarting the application? I will look into this issue for you.')
    `);
    
    // Add sample audit logs
    await connection.query(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details) VALUES
      (UUID(), '${adminId}', 'create', 'ticket', '${ticketId}', '{"message": "Ticket created"}'),
      (UUID(), '${adminId}', 'assign', 'ticket', '${ticketId}', '{"assignee": "${helpdeskId}"}'),
      (UUID(), '${helpdeskId}', 'update', 'ticket', '${ticketId}', '{"status": {"from": "open", "to": "in_progress"}}')
    `);
    
    // Add sample quick replies for helpdesk
    await connection.query(`
      INSERT INTO quick_replies (id, user_id, content, category) VALUES
      (UUID(), '${helpdeskId}', 'Thank you for your request. I will look into this right away.', 'greeting'),
      (UUID(), '${helpdeskId}', 'Have you tried restarting your computer?', 'troubleshooting'),
      (UUID(), '${helpdeskId}', 'Your issue has been resolved. Please let me know if you need further assistance.', 'closing')
    `);
    
    log('success', 'Sample data inserted successfully.');
    return { success: true };
  } catch (error) {
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
    log('info', 'Checking for sample data...');
    const result = await getDatabaseConnection();
    
    if (!result.success) {
      return result;
    }
    
    connection = result.connection;
    
    // Check users table
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    
    if (users[0].count === 0) {
      return {
        success: false,
        reason: 'No user data found in the database.',
        noUsers: true
      };
    }
    
    // Check forms table
    const [forms] = await connection.query('SELECT COUNT(*) as count FROM forms');
    
    if (forms[0].count === 0) {
      return {
        success: false,
        reason: 'No form data found in the database.',
        noForms: true
      };
    }
    
    // Check tickets
    const [tickets] = await connection.query('SELECT COUNT(*) as count FROM form_submissions');
    
    if (tickets[0].count === 0) {
      return {
        success: false,
        reason: 'No tickets found in the database.',
        noTickets: true
      };
    }
    
    log('success', 'Sample data exists in the database.');
    return { 
      success: true,
      counts: {
        users: users[0].count,
        forms: forms[0].count,
        tickets: tickets[0].count
      }
    };
  } catch (error) {
    return { 
      success: false, 
      reason: `Failed to check sample data: ${error.message}`,
      error 
    };
  } finally {
    if (connection) await connection.end();
  }
}

// Test database connection
async function testDatabaseConnection() {
  log('info', 'Testing database connection...');
  return await getDatabaseConnection();
}

// Export database
async function exportDatabase(exportPath = null) {
  try {
    if (!exportPath) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportDir = path.join(__dirname, '../backups');
      const filename = `${dbConfig.database}_${timestamp}.sql`;
      exportPath = path.join(exportDir, filename);
      
      // Create backups directory if it doesn't exist
      try {
        await fs.mkdir(exportDir, { recursive: true });
      } catch (err) {
        // Ignore if directory already exists
      }
    }
    
    log('info', `Exporting database to ${exportPath}...`);
    
    const command = `mysqldump -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} ${dbConfig.password ? `-p${dbConfig.password}` : ''} ${dbConfig.database} > "${exportPath}"`;
    execSync(command, { stdio: 'ignore' });
    
    log('success', `Database exported successfully to ${exportPath}`);
    return { success: true, path: exportPath };
  } catch (error) {
    log('error', `Failed to export database: ${error.message}`);
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
    
    log('info', `Importing database from ${filePath}...`);
    
    const command = `mysql -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} ${dbConfig.password ? `-p${dbConfig.password}` : ''} ${dbConfig.database} < "${filePath}"`;
    execSync(command, { stdio: 'ignore' });
    
    log('success', `Database imported successfully from ${filePath}`);
    return { success: true };
  } catch (error) {
    log('error', `Failed to import database: ${error.message}`);
    return { success: false, reason: error.message };
  }
}

// Drop all tables
async function dropTables() {
  let connection;
  try {
    log('info', 'Dropping all tables...');
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
    log('info', `Found ${tableNames.length} tables to drop: ${tableNames.join(', ')}`);
    
    // Drop each table
    for (const tableName of tableNames) {
      await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
      log('info', `Dropped table: ${tableName}`);
    }
    
    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    log('success', 'All tables dropped successfully.');
    return { success: true };
  } catch (error) {
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
    log('info', `Dropping database ${dbName}...`);
    const result = await getDatabaseConnection(false);
    
    if (!result.success) {
      return result;
    }
    
    connection = result.connection;
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    
    log('success', `Database ${dbName} dropped successfully.`);
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      reason: `Failed to drop database: ${error.message}`,
      error 
    };
  } finally {
    if (connection) await connection.end();
  }
}

// Fix table collation
async function fixTableCollation() {
  let connection;
  try {
    log('info', 'Fixing table collation...');
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
      log('info', `Fixed collation for table: ${tableName}`);
    }
    
    log('success', 'All tables converted to utf8mb4_unicode_ci collation.');
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      reason: `Failed to fix table collation: ${error.message}`,
      error 
    };
  } finally {
    if (connection) await connection.end();
  }
}

// Check environment variables
async function checkEnvironmentVariables() {
  log('info', 'Checking environment variables...');
  
  const requiredVars = [
    { name: 'DB_HOST', fallback: 'MARIADB_HOST', value: dbConfig.host },
    { name: 'DB_USER', fallback: 'MARIADB_USER', value: dbConfig.user },
    { name: 'DB_PASSWORD', fallback: 'MARIADB_PASSWORD', value: dbConfig.password },
    { name: 'DB_NAME', fallback: 'MARIADB_DATABASE', value: dbConfig.database },
    { name: 'DB_PORT', fallback: 'MARIADB_PORT', value: dbConfig.port }
  ];
  
  const missingVars = [];
  
  for (const variable of requiredVars) {
    if (!variable.value) {
      missingVars.push(`${variable.name} or ${variable.fallback}`);
    }
  }
  
  if (missingVars.length > 0) {
    log('warning', `Missing environment variables: ${missingVars.join(', ')}`);
    return { 
      success: false, 
      missingVars 
    };
  }
  
  log('success', 'All required environment variables are set.');
  return { success: true };
}

// Get database info (version, tables, etc.)
async function getDatabaseInfo() {
  let connection;
  try {
    const result = await getDatabaseConnection();
    
    if (!result.success) {
      return result;
    }
    
    connection = result.connection;
    
    // Get MariaDB/MySQL version
    const [versionResult] = await connection.query('SELECT VERSION() as version');
    const version = versionResult[0].version;
    
    // Get all tables
    const [tables] = await connection.query(`
      SELECT table_name, table_rows, data_length, index_length
      FROM information_schema.tables 
      WHERE table_schema = ?
    `, [dbConfig.database]);
    
    // Get database size
    const [sizeResult] = await connection.query(`
      SELECT 
        SUM(data_length + index_length) AS total_size,
        SUM(data_length) AS data_size,
        SUM(index_length) AS index_size
      FROM information_schema.tables
      WHERE table_schema = ?
    `, [dbConfig.database]);
    
    const dbSize = sizeResult[0].total_size || 0;
    
    return {
      success: true,
      version,
      tables: tables.map(t => ({
        name: t.TABLE_NAME || t.table_name,
        rows: t.TABLE_ROWS || t.table_rows,
        dataSize: t.DATA_LENGTH || t.data_length,
        indexSize: t.INDEX_LENGTH || t.index_length
      })),
      size: {
        total: formatSize(dbSize),
        data: formatSize(sizeResult[0].data_size || 0),
        index: formatSize(sizeResult[0].index_size || 0)
      }
    };
  } catch (error) {
    return { 
      success: false, 
      reason: `Failed to get database info: ${error.message}`,
      error 
    };
  } finally {
    if (connection) await connection.end();
  }
}

// Format size in bytes to human-readable format
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  log,
  createReadlineInterface,
  askQuestion,
  checkMariaDBRunning,
  getDatabaseConnection,
  getConnectionPool,
  checkDatabaseExists,
  createDatabase,
  resetDatabase,
  checkRequiredTables,
  createTables,
  fixTableCollation,
  checkSampleData,
  insertSampleData,
  testDatabaseConnection,
  exportDatabase,
  importDatabase,
  dropTables,
  dropDatabase,
  getDatabaseInfo
}; 