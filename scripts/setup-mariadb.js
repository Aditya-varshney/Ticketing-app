const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function setupMariaDB() {
  // Database parameters
  const DB_NAME = process.env.MARIADB_DATABASE || 'ticketing';
  const APP_USER = 'ticketing_app';
  const APP_PASSWORD = 'secure_password';  // You should change this
  
  console.log('Setting up MariaDB for the ticketing application...');
  
  // Step 1: Try to connect to MariaDB
  try {
    console.log('Trying to connect to MariaDB as root...');
    
    // Try auth_socket (passwordless) authentication first
    let connection;
    try {
      connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root'
        // No password for auth_socket
      });
      console.log('Connected using auth_socket authentication');
    } catch (socketError) {
      console.log('Auth_socket failed, trying with password...');
      
      const rootPassword = process.env.MARIADB_ROOT_PASSWORD || '';
      connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: rootPassword
      });
      console.log('Connected using password authentication');
    }
    
    // Step 2: Create database if not exists
    console.log(`Creating database ${DB_NAME} if it doesn't exist...`);
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
    
    // Step 3: Create application user
    console.log(`Creating application user ${APP_USER}...`);
    try {
      await connection.execute(
        `CREATE USER IF NOT EXISTS '${APP_USER}'@'localhost' IDENTIFIED BY '${APP_PASSWORD}'`
      );
      
      // Grant privileges
      await connection.execute(
        `GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${APP_USER}'@'localhost'`
      );
      
      await connection.execute('FLUSH PRIVILEGES');
    } catch (userError) {
      console.log('Note: User might already exist:', userError.message);
    }
    
    console.log('\n✅ Database setup completed successfully!');
    console.log('\nUpdate your .env.local with these credentials:');
    console.log(`MARIADB_USER=${APP_USER}`);
    console.log(`MARIADB_PASSWORD=${APP_PASSWORD}`);
    console.log(`MARIADB_DATABASE=${DB_NAME}`);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.log('\nIf you cannot connect as root, try:');
    console.log('1. Run the MariaDB client manually: sudo mysql');
    console.log('2. Then run these commands:');
    console.log(`   CREATE DATABASE IF NOT EXISTS ${DB_NAME};`);
    console.log(`   CREATE USER '${APP_USER}'@'localhost' IDENTIFIED BY '${APP_PASSWORD}';`);
    console.log(`   GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${APP_USER}'@'localhost';`);
    console.log('   FLUSH PRIVILEGES;');
  }
}

setupMariaDB();
