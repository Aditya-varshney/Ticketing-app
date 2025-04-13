const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local', override: true });

async function verifyColumns() {
  console.log('==== VERIFYING MESSAGES TABLE COLUMNS ====');
  
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
    
    // Show all columns in the messages table
    console.log('Checking columns in the messages table...');
    const [columns] = await connection.query(`SHOW COLUMNS FROM messages`);
    
    console.log('Columns in messages table:');
    columns.forEach(column => {
      console.log(`- ${column.Field} (${column.Type})`);
    });
    
    console.log('\nChecking specific attachment columns:');
    const columnNames = columns.map(col => col.Field);
    console.log('has_attachment exists:', columnNames.includes('has_attachment'));
    console.log('attachment_url exists:', columnNames.includes('attachment_url'));
    console.log('attachment_type exists:', columnNames.includes('attachment_type'));
    console.log('attachment_name exists:', columnNames.includes('attachment_name'));
    
    // If any column is missing, force add it
    if (!columnNames.includes('has_attachment')) {
      console.log('FORCING addition of has_attachment column...');
      try {
        await connection.query(`
          ALTER TABLE messages 
          ADD COLUMN has_attachment BOOLEAN DEFAULT FALSE
        `);
        console.log('Added has_attachment column');
      } catch (err) {
        console.error('Error adding has_attachment:', err.message);
      }
    }
    
    if (!columnNames.includes('attachment_url')) {
      console.log('FORCING addition of attachment_url column...');
      try {
        await connection.query(`
          ALTER TABLE messages 
          ADD COLUMN attachment_url VARCHAR(255) NULL
        `);
        console.log('Added attachment_url column');
      } catch (err) {
        console.error('Error adding attachment_url:', err.message);
      }
    }
    
    if (!columnNames.includes('attachment_type')) {
      console.log('FORCING addition of attachment_type column...');
      try {
        await connection.query(`
          ALTER TABLE messages 
          ADD COLUMN attachment_type VARCHAR(50) NULL
        `);
        console.log('Added attachment_type column');
      } catch (err) {
        console.error('Error adding attachment_type:', err.message);
      }
    }
    
    if (!columnNames.includes('attachment_name')) {
      console.log('FORCING addition of attachment_name column...');
      try {
        await connection.query(`
          ALTER TABLE messages 
          ADD COLUMN attachment_name VARCHAR(255) NULL
        `);
        console.log('Added attachment_name column');
      } catch (err) {
        console.error('Error adding attachment_name:', err.message);
      }
    }
    
    // Verify again after forced additions
    console.log('\nVerifying columns after forced additions:');
    const [columnsAfter] = await connection.query(`SHOW COLUMNS FROM messages`);
    const columnNamesAfter = columnsAfter.map(col => col.Field);
    console.log('has_attachment exists:', columnNamesAfter.includes('has_attachment'));
    console.log('attachment_url exists:', columnNamesAfter.includes('attachment_url'));
    console.log('attachment_type exists:', columnNamesAfter.includes('attachment_type'));
    console.log('attachment_name exists:', columnNamesAfter.includes('attachment_name'));
    
  } catch (error) {
    console.error('Error verifying columns:', error);
  } finally {
    if (connection) await connection.end();
  }
}

// Run the verification
verifyColumns()
  .then(() => {
    console.log('Completed verification process');
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed to verify columns:', err);
    process.exit(1);
  }); 