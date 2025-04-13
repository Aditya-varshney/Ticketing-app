const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function addMessageAttachmentColumns() {
  console.log('==== ADDING MESSAGE ATTACHMENT COLUMNS ====');
  
  // Get database configuration
  const DB_NAME = process.env.MARIADB_DATABASE || process.env.DB_NAME || 'ticketing';
  const DB_USER = process.env.MARIADB_USER || process.env.DB_USER || 'ticketing_app';
  const DB_PASS = process.env.MARIADB_PASSWORD || process.env.DB_PASSWORD || 'secure_password';
  const DB_HOST = process.env.MARIADB_HOST || process.env.DB_HOST || 'localhost';
  const DB_PORT = parseInt(process.env.MARIADB_PORT || process.env.DB_PORT || '3306', 10);

  console.log('Database configuration:');
  console.log(`- Host: ${DB_HOST}`);
  console.log(`- Port: ${DB_PORT}`);
  console.log(`- Database: ${DB_NAME}`);
  console.log(`- User: ${DB_USER}`);

  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME
    });

    console.log('Connected to database successfully');

    // Add attachment columns to messages table
    console.log('Adding attachment columns to messages table...');
    await connection.execute(`
      ALTER TABLE messages
      ADD COLUMN has_attachment BOOLEAN DEFAULT FALSE,
      ADD COLUMN attachment_url VARCHAR(255),
      ADD COLUMN attachment_type VARCHAR(50),
      ADD COLUMN attachment_name VARCHAR(255)
    `);

    console.log('Successfully added attachment columns to messages table');
    await connection.end();
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the migration
addMessageAttachmentColumns(); 