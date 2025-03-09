const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function testMariaDBConnection() {
  // MariaDB configuration with multiple options to try
  const config = {
    host: process.env.MARIADB_HOST || 'localhost',
    user: process.env.MARIADB_USER || 'root',
    password: process.env.MARIADB_PASSWORD || '',
    database: process.env.MARIADB_DATABASE || 'ticketing',
    ssl: false,
    socketPath: '/var/run/mysqld/mysqld.sock'  // Try socket connection
  };

  try {
    console.log('Attempting to connect to MariaDB...');
    
    // Try direct connection
    const connection = await mysql.createConnection(config);
    console.log('✅ Successfully connected to MariaDB!');
    
    // Test query
    const [rows] = await connection.execute('SELECT 1+1 AS result');
    console.log('Test query result:', rows[0].result);
    
    // Close connection
    await connection.end();
    console.log('Connection closed');
    
    return true;
  } catch (error) {
    console.error('❌ Connection error:', error);
    
    console.log('\n===== TROUBLESHOOTING STEPS =====');
    console.log('1. Check MariaDB status:');
    console.log('   sudo systemctl status mariadb');
    
    console.log('\n2. Try manual connection:');
    console.log('   sudo mariadb');
    
    console.log('\n3. Check error logs:');
    console.log('   sudo tail -n 50 /var/log/mysql/error.log');
    
    return false;
  }
}

// Run the test function
testMariaDBConnection();
