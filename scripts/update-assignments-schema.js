const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local', override: true });

async function updateAssignmentsSchema() {
  console.log('==== UPDATING TICKETING SYSTEM SCHEMA ====');
  
  const DB_NAME = process.env.MARIADB_DATABASE || 'ticketing';
  const DB_USER = process.env.MARIADB_USER || 'ticketing_app';
  const DB_PASS = process.env.MARIADB_PASSWORD || 'secure_password';
  const DB_HOST = process.env.MARIADB_HOST || 'localhost';
  const DB_PORT = process.env.DB_PORT || 3306;

  console.log('Database configuration:');
  console.log(`- Host: ${DB_HOST}`);
  console.log(`- Database: ${DB_NAME}`);
  console.log(`- User: ${DB_USER}`);
  
  try {
    // Create connection to MariaDB
    const connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
    });
    
    console.log('✅ Connected to MariaDB');
    
    // Check if we need to migrate
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    
    // Check if the old assignments table exists
    if (tableNames.includes('assignments')) {
      console.log('⚠️ Old assignments table found. Migrating to ticket_assignments...');
      
      // Create the new table if it doesn't exist yet
      if (!tableNames.includes('ticket_assignments')) {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS ticket_assignments (
            id VARCHAR(36) PRIMARY KEY,
            ticket_id VARCHAR(36) NOT NULL UNIQUE,
            helpdesk_id VARCHAR(36) NOT NULL,
            assigned_by VARCHAR(36) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (ticket_id) REFERENCES form_submissions(id) ON DELETE CASCADE,
            FOREIGN KEY (helpdesk_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
        console.log('✅ Created ticket_assignments table');
      }
      
      // Drop the old table
      await connection.query('DROP TABLE assignments');
      console.log('✅ Dropped old assignments table');
    } else if (!tableNames.includes('ticket_assignments')) {
      // Just create the new table if needed
      await connection.query(`
        CREATE TABLE IF NOT EXISTS ticket_assignments (
          id VARCHAR(36) PRIMARY KEY,
          ticket_id VARCHAR(36) NOT NULL UNIQUE,
          helpdesk_id VARCHAR(36) NOT NULL,
          assigned_by VARCHAR(36) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (ticket_id) REFERENCES form_submissions(id) ON DELETE CASCADE,
          FOREIGN KEY (helpdesk_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Created ticket_assignments table');
    } else {
      console.log('✅ ticket_assignments table already exists');
    }
    
    // Check for and remove ticketing_app database if it exists
    const [databases] = await connection.query('SHOW DATABASES');
    const dbNames = databases.map(db => Object.values(db)[0]);
    
    if (dbNames.includes('ticketing_app')) {
      console.log('⚠️ Removing unused ticketing_app database...');
      await connection.query('DROP DATABASE IF EXISTS ticketing_app');
      console.log('✅ Removed ticketing_app database');
    }
    
    console.log('✅ Database schema update completed successfully');
    await connection.end();
  } catch (error) {
    console.error('❌ Error updating database schema:', error);
    process.exit(1);
  }
}

updateAssignmentsSchema(); 