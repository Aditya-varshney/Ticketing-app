const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function addTicketAuditTable() {
  console.log('==== ADDING TICKET AUDIT TABLE ====');
  
  // Get database configuration
  const DB_NAME = process.env.MARIADB_DATABASE || process.env.DB_NAME || 'ticketing';
  const DB_USER = process.env.MARIADB_USER || process.env.DB_USER || 'ticketing_app';
  const DB_PASS = process.env.MARIADB_PASSWORD || process.env.DB_PASSWORD || 'secure_password';
  const DB_HOST = process.env.MARIADB_HOST || process.env.DB_HOST || 'localhost';
  const DB_PORT = parseInt(process.env.MARIADB_PORT || process.env.DB_PORT || '3306', 10);

  console.log('Database configuration:');
  console.log(`- Host: ${DB_HOST}`);
  console.log(`- Database: ${DB_NAME}`);
  console.log(`- User: ${DB_USER}`);
  console.log(`- Port: ${DB_PORT}`);
  
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME
    });

    console.log('Connected to database successfully');

    // Create ticket_audits table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ticket_audits (
        id VARCHAR(36) PRIMARY KEY,
        ticket_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        action VARCHAR(50) NOT NULL,
        previous_value TEXT,
        new_value TEXT,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ticket_audit_ticket (ticket_id),
        INDEX idx_ticket_audit_user (user_id),
        INDEX idx_ticket_audit_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Now add foreign keys separately to handle potential issues
    try {
      await connection.query(`
        ALTER TABLE ticket_audits 
        ADD CONSTRAINT fk_ticket_audit_ticket
        FOREIGN KEY (ticket_id) REFERENCES form_submissions(id) 
        ON DELETE CASCADE
      `);
      console.log('Added foreign key for ticket_id');
    } catch (err) {
      console.warn('Warning: Could not add ticket_id foreign key:', err.message);
    }

    try {
      await connection.query(`
        ALTER TABLE ticket_audits 
        ADD CONSTRAINT fk_ticket_audit_user
        FOREIGN KEY (user_id) REFERENCES users(id) 
        ON DELETE CASCADE
      `);
      console.log('Added foreign key for user_id');
    } catch (err) {
      console.warn('Warning: Could not add user_id foreign key:', err.message);
    }

    console.log('Ticket audit table created successfully');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the migration
addTicketAuditTable().catch(console.error); 