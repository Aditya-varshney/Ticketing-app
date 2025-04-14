const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local', override: true });

async function updateMessagesSchema() {
  console.log('==== UPDATING MESSAGES TABLE SCHEMA ====');
  
  // Get database configuration
  const DB_NAME = process.env.MARIADB_DATABASE || process.env.DB_NAME || 'ticketing';
  const DB_USER = process.env.MARIADB_USER || process.env.DB_USER || 'ticket_user';
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
    // Connect to database
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
      ssl: false
    });
    console.log('Connected successfully');
    
    // Check for has_attachment column
    const [hasAttachmentExists] = await connection.query(
      `SHOW COLUMNS FROM messages LIKE 'has_attachment'`
    );
    
    if (hasAttachmentExists.length === 0) {
      console.log('Adding has_attachment column to messages table...');
      await connection.query(`
        ALTER TABLE messages 
        ADD COLUMN has_attachment BOOLEAN DEFAULT FALSE
      `);
      console.log('Added has_attachment column to messages table');
    } else {
      console.log('has_attachment column already exists in messages table');
    }
    
    // Check for attachment_url column
    const [attachmentUrlExists] = await connection.query(
      `SHOW COLUMNS FROM messages LIKE 'attachment_url'`
    );
    
    if (attachmentUrlExists.length === 0) {
      console.log('Adding attachment_url column to messages table...');
      await connection.query(`
        ALTER TABLE messages 
        ADD COLUMN attachment_url VARCHAR(255)
      `);
      console.log('Added attachment_url column to messages table');
    } else {
      console.log('attachment_url column already exists in messages table');
    }
    
    // Check for attachment_type column
    const [attachmentTypeExists] = await connection.query(
      `SHOW COLUMNS FROM messages LIKE 'attachment_type'`
    );
    
    if (attachmentTypeExists.length === 0) {
      console.log('Adding attachment_type column to messages table...');
      await connection.query(`
        ALTER TABLE messages 
        ADD COLUMN attachment_type VARCHAR(50)
      `);
      console.log('Added attachment_type column to messages table');
    } else {
      console.log('attachment_type column already exists in messages table');
    }
    
    // Check for attachment_name column
    const [attachmentNameExists] = await connection.query(
      `SHOW COLUMNS FROM messages LIKE 'attachment_name'`
    );
    
    if (attachmentNameExists.length === 0) {
      console.log('Adding attachment_name column to messages table...');
      await connection.query(`
        ALTER TABLE messages 
        ADD COLUMN attachment_name VARCHAR(255)
      `);
      console.log('Added attachment_name column to messages table');
    } else {
      console.log('attachment_name column already exists in messages table');
    }
    
    console.log('Successfully updated messages table schema');
    
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
updateMessagesSchema().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 