const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local', override: true });

async function addMessageAttachmentColumns() {
  console.log('==== ADDING MESSAGE ATTACHMENT COLUMNS ====');
  
  // Get database configuration
  const DB_NAME = process.env.MARIADB_DATABASE || process.env.DB_NAME || 'ticketing';
  const DB_USER = process.env.MARIADB_USER || process.env.DB_USER || 'ticket_user';
  const DB_PASS = process.env.MARIADB_PASSWORD || process.env.DB_PASSWORD || 'secure_password';
  const DB_HOST = process.env.MARIADB_HOST || process.env.DB_HOST || 'localhost';
  const DB_PORT = parseInt(process.env.MARIADB_PORT || process.env.DB_PORT || '3306', 10);

  console.log('Database configuration:');
  console.log(`- Host: ${DB_HOST}`);
  console.log(`- Port: ${DB_PORT}`);
  console.log(`- Database: ${DB_NAME}`);
  console.log(`- User: ${DB_USER}`);

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

    // Check if columns already exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'messages' 
        AND COLUMN_NAME IN ('has_attachment', 'attachment_url', 'attachment_type', 'attachment_name')
    `, [DB_NAME]);
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    
    console.log('Existing attachment columns:', existingColumns.length > 0 ? existingColumns.join(', ') : 'none');
    
    // This script is now deprecated in favor of update-messages-schema.js
    console.log('WARNING: This script is deprecated. Please use update-messages-schema.js instead.');
    console.log('Redirecting to update-messages-schema.js...');
    
    // Instead of running this script, call the other script using require
    console.log('Please run: node scripts/update-messages-schema.js');
    
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
addMessageAttachmentColumns().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 