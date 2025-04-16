require('dotenv').config({ path: '.env.local' });
const mariadb = require('mariadb');
const path = require('path');
const fs = require('fs');

async function fixAuditLogs() {
  console.log('Starting audit logs fix script...');
  
  let connection;
  
  try {
    // Get database connection details - try all possible environment variable formats
    const dbConfig = {
      host: process.env.MARIADB_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.MARIADB_PORT || process.env.DB_PORT || '3306'),
      user: process.env.MARIADB_USER || process.env.DB_USER || 'root',
      password: process.env.MARIADB_PASSWORD || process.env.DB_PASSWORD || '',
      database: process.env.MARIADB_DATABASE || process.env.DB_NAME || 'ticketing'
    };
    
    // Log connection details (without password)
    console.log(`Connecting to database ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port} as ${dbConfig.user}`);
    console.log('If connection fails, check your .env.local file for correct database credentials');
    
    // Try connection
    connection = await mariadb.createConnection(dbConfig);
    console.log('Connected to database successfully');
    
    // Check if audit_logs table exists
    const tables = await connection.query(`
      SHOW TABLES LIKE 'audit_logs'
    `);
    
    if (tables.length === 0) {
      console.log('audit_logs table does not exist, creating it...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          action VARCHAR(255) NOT NULL,
          entity_type VARCHAR(255) NOT NULL,
          entity_id VARCHAR(36) NOT NULL,
          previous_value TEXT,
          new_value TEXT,
          details JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log('audit_logs table created successfully');
    } else {
      console.log('audit_logs table exists, checking columns...');
    }
    
    // Check if columns previous_value and new_value exist
    const columns = await connection.query(`
      SHOW COLUMNS FROM audit_logs LIKE 'previous_value'
    `);
    
    if (columns.length === 0) {
      console.log('Adding previous_value and new_value columns...');
      await connection.query(`
        ALTER TABLE audit_logs
        ADD COLUMN previous_value TEXT AFTER entity_id,
        ADD COLUMN new_value TEXT AFTER previous_value
      `);
      console.log('Columns added successfully');
    } else {
      console.log('previous_value column already exists');
    }
    
    // Check for any existing audit data with details that should be migrated
    console.log('Checking for audit records that need to be migrated...');
    const records = await connection.query(`
      SELECT id, details
      FROM audit_logs
      WHERE details IS NOT NULL
        AND (previous_value IS NULL OR previous_value = '')
    `);
    
    console.log(`Found ${records.length} records to migrate`);
    
    // Migrate records
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
        console.error(`Error migrating record ${record.id}:`, err.message);
      }
    }
    
    console.log(`Successfully migrated ${migratedCount} records`);
    
    // Create a check entry to verify everything is working
    console.log('Creating a test audit entry...');
    const testId = require('uuid').v4();
    const timestamp = new Date();
    
    await connection.query(`
      INSERT INTO audit_logs
      (id, user_id, action, entity_type, entity_id, previous_value, new_value, details, created_at)
      SELECT
        ?,
        id,
        'test_action',
        'ticket',
        id,
        'old_value',
        'new_value',
        '{"message": "Test entry from fix script"}',
        ?
      FROM users
      WHERE role = 'admin'
      LIMIT 1
    `, [testId, timestamp]);
    
    console.log('Test audit entry created successfully');
    console.log('Audit logs fix script completed successfully');
    
  } catch (error) {
    console.error('Error in audit logs fix script:', error);
    console.log('\nSuggested troubleshooting steps:');
    console.log('1. Check your database credentials in .env.local file');
    console.log('2. Ensure your database server is running');
    console.log('3. Try connecting to the database manually using the mysql/mariadb command line tool');
    console.log('4. Check if the database and user exist and have proper permissions');
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the function
fixAuditLogs()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 