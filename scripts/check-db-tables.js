require('dotenv').config();
const mariadb = require('mariadb');

async function checkTables() {
  let conn;
  try {
    conn = await mariadb.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'ticketing',
      port: process.env.DB_PORT || 3306
    });
    
    console.log('Connection successful');
    
    // Get all tables
    console.log('\n--- All tables in database:');
    const allTables = await conn.query('SHOW TABLES');
    console.table(allTables);
    
    // Check specific tables
    const formTemplateExists = await conn.query('SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ?', 
      [process.env.DB_NAME || 'ticketing', 'form_templates']);
    
    const formSubmissionsExists = await conn.query('SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ?', 
      [process.env.DB_NAME || 'ticketing', 'form_submissions']);
    
    console.log('\n--- Tables Verification:');
    console.log('form_templates exists:', formTemplateExists.length > 0 ? 'Yes ✅' : 'No ❌');
    console.log('form_submissions exists:', formSubmissionsExists.length > 0 ? 'Yes ✅' : 'No ❌');
    
    // If form_templates doesn't exist, show details of users table to verify database connection
    if (formTemplateExists.length === 0) {
      console.log('\n--- Verifying users table exists:');
      const usersTableExists = await conn.query('SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ?', 
        [process.env.DB_NAME || 'ticketing', 'users']);
      console.log('users table exists:', usersTableExists.length > 0 ? 'Yes ✅' : 'No ❌');
      
      if (usersTableExists.length > 0) {
        console.log('\n--- Structure of users table:');
        const userColumns = await conn.query('SHOW COLUMNS FROM users');
        console.table(userColumns);
      }
    }
    
  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    if (conn) await conn.end();
  }
}

checkTables();
