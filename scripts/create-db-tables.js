const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

// MariaDB configuration with SSL completely disabled
const config = {
  host: process.env.MARIADB_HOST || 'localhost',
  user: process.env.MARIADB_USER || 'ticketing_app',
  password: process.env.MARIADB_PASSWORD || 'secure_password',
  database: process.env.MARIADB_DATABASE || 'ticketing',
  ssl: false // Explicitly disable SSL
};

async function createDatabaseTables() {
  try {
    console.log('Attempting to connect to MariaDB...');
    
    const connection = await mysql.createConnection(config);
    console.log('✅ Connected to MariaDB successfully!');

    console.log('Creating database tables...');
    
    // Create Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'helpdesk', 'admin') DEFAULT 'user',
        avatar VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    // Create Messages table - Notice the backticks around "read" to escape the reserved word
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        sender VARCHAR(36) NOT NULL,
        receiver VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        \`read\` BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (sender) REFERENCES users(id),
        FOREIGN KEY (receiver) REFERENCES users(id),
        INDEX(sender, receiver, created_at)
      )
    `);
    console.log('✅ Messages table created');

    // Create Assignments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS assignments (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL UNIQUE,
        helpdesk_id VARCHAR(36) NOT NULL,
        assigned_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (helpdesk_id) REFERENCES users(id),
        FOREIGN KEY (assigned_by) REFERENCES users(id)
      )
    `);
    console.log('✅ Assignments table created');

    await connection.end();
    console.log('\nAll database tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating database tables:', error);
    console.log('\n===== MANUAL STEPS TO CREATE TABLES =====');
    console.log('1. Connect to MariaDB directly:');
    console.log('   sudo mariadb');
    console.log('2. Run these SQL commands:');
    console.log('   USE ticketing;');
    console.log(`   
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'helpdesk', 'admin') DEFAULT 'user',
        avatar VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        sender VARCHAR(36) NOT NULL,
        receiver VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        \`read\` BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (sender) REFERENCES users(id),
        FOREIGN KEY (receiver) REFERENCES users(id),
        INDEX(sender, receiver, created_at)
      );

      CREATE TABLE IF NOT EXISTS assignments (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL UNIQUE,
        helpdesk_id VARCHAR(36) NOT NULL,
        assigned_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (helpdesk_id) REFERENCES users(id),
        FOREIGN KEY (assigned_by) REFERENCES users(id)
      );
    `);
  }
}

createDatabaseTables();
