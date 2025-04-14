require('dotenv').config({ path: '../.env.local' });
const mariadb = require('mariadb');

async function fixCollation() {
  let conn;
  try {
    console.log('==== FIXING DATABASE COLLATION ISSUES ====');
    console.log('Database configuration:');
    console.log(`- Host: ${process.env.MARIADB_HOST || 'localhost'}`);
    console.log(`- Database: ${process.env.MARIADB_DATABASE || 'ticketing'}`);
    console.log(`- User: ${process.env.MARIADB_USER || 'ticketing_app'}`);
    
    // Connect to the database
    conn = await mariadb.createConnection({
      host: process.env.MARIADB_HOST || 'localhost',
      user: process.env.MARIADB_USER || 'ticketing_app',
      password: process.env.MARIADB_PASSWORD || 'secure_password',
      database: process.env.MARIADB_DATABASE || 'ticketing',
      port: process.env.MARIADB_PORT || 3306
    });
    
    console.log('✅ Connected to MariaDB');
    
    // Check current table collations
    console.log('\nChecking current table collations...');
    const tables = await conn.query(`
      SELECT TABLE_NAME, TABLE_COLLATION
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
    `, [process.env.MARIADB_DATABASE || 'ticketing']);
    
    console.log('Current table collations:');
    tables.forEach(table => {
      console.log(`- ${table.TABLE_NAME}: ${table.TABLE_COLLATION}`);
    });
    
    // Set a consistent collation for all tables
    console.log('\nUpdating table collations to utf8mb4_unicode_ci...');
    
    // Update users table
    await conn.query(`
      ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ Updated users table collation');
    
    // Update form_templates table
    await conn.query(`
      ALTER TABLE form_templates CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ Updated form_templates table collation');
    
    // Update form_submissions table
    await conn.query(`
      ALTER TABLE form_submissions CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ Updated form_submissions table collation');
    
    // Update ticket_assignments table
    await conn.query(`
      ALTER TABLE ticket_assignments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ Updated ticket_assignments table collation');
    
    // Update messages table
    await conn.query(`
      ALTER TABLE messages CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ Updated messages table collation');
    
    // Check updated table collations
    console.log('\nVerifying updated table collations...');
    const updatedTables = await conn.query(`
      SELECT TABLE_NAME, TABLE_COLLATION
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
    `, [process.env.MARIADB_DATABASE || 'ticketing']);
    
    console.log('Updated table collations:');
    updatedTables.forEach(table => {
      console.log(`- ${table.TABLE_NAME}: ${table.TABLE_COLLATION}`);
    });
    
    console.log('\n✅ Database collation fix completed successfully');
    
  } catch (error) {
    console.error('❌ Error fixing collation:', error);
  } finally {
    if (conn) await conn.close();
  }
}

fixCollation(); 