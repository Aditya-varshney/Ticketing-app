require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function updatePriorityEnum() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.MARIADB_HOST || 'localhost',
      user: process.env.MARIADB_USER || 'ticketing_app',
      password: process.env.MARIADB_PASSWORD || 'secure_password',
      database: process.env.MARIADB_DATABASE || 'ticketing',
      port: process.env.DB_PORT || 3306
    });
    
    console.log('Connection successful');
    
    // Alter the table to update the enum
    await conn.query(`
      ALTER TABLE form_submissions 
      MODIFY priority ENUM('pending', 'low', 'medium', 'high', 'urgent') DEFAULT 'pending'
    `);
    
    console.log('Successfully updated priority enum to include "pending" value');
    
  } catch (error) {
    console.error('Error updating priority enum:', error);
  } finally {
    if (conn) await conn.end();
  }
}

updatePriorityEnum().then(() => process.exit(0));
