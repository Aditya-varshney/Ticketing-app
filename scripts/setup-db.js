require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  // Check if .env.local exists, create from template if not
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  const envExamplePath = path.resolve(process.cwd(), '.env.example');
  
  if (!fs.existsSync(envLocalPath) && fs.existsSync(envExamplePath)) {
    console.log('⚠️ No .env.local file found. Creating from .env.example...');
    fs.copyFileSync(envExamplePath, envLocalPath);
    console.log('✅ Created .env.local from template. Please edit it with your database credentials.');
    console.log('   Then run this script again.');
    return;
  }

  // Reload environment after potential .env.local creation
  require('dotenv').config({ path: '.env.local', override: true });
  
  const DB_NAME = process.env.MARIADB_DATABASE || 'ticketing';
  const DB_USER = process.env.MARIADB_USER || 'ticketing_app';
  const DB_PASS = process.env.MARIADB_PASSWORD || 'secure_password';
  const DB_HOST = process.env.MARIADB_HOST || 'localhost';
  const DB_PORT = process.env.DB_PORT || 3306;

  console.log('==== TICKETING SYSTEM DATABASE SETUP ====');
  console.log('Database configuration:');
  console.log(`- Host: ${DB_HOST}`);
  console.log(`- Database: ${DB_NAME}`);
  console.log(`- User: ${DB_USER}`);
  console.log(`- Password: ${DB_PASS ? '******' : '(empty)'}`);

  try {
    // Step 1: Check if MariaDB is installed and running
    console.log('\n-- Step 1: Checking MariaDB installation --');
    try {
      // Try connecting to MariaDB server with socket authentication
      try {
        // Attempt to execute sudo mariadb as a child process to check server
        const { execSync } = require('child_process');
        execSync('sudo mariadb -e "SELECT 1"', { stdio: 'ignore' });
        console.log('✅ MariaDB server is running (verified via sudo)');
      } catch (sudoErr) {
        // Fall back to direct connection attempt
        const serverConnection = await mysql.createConnection({
          host: DB_HOST,
          port: DB_PORT,
          user: 'root',
          password: process.env.MARIADB_ROOT_PASSWORD || '',
          ssl: false,
          socketPath: '/var/run/mysqld/mysqld.sock' // Common socket path for MariaDB
        });
        
        await serverConnection.query('SELECT 1'); // Simple test query
        console.log('✅ MariaDB server is running');
        await serverConnection.end();
      }
    } catch (serverErr) {
      console.error('❌ Could not connect to MariaDB server:', serverErr.message);
      
      console.log('\n==== MANUAL SETUP REQUIRED ====');
      console.log('Your MariaDB installation appears to be using socket authentication for root');
      console.log('Please run these commands manually to set up the database:');
      console.log('\n1. Connect to MariaDB as root:');
      console.log('   sudo mariadb');
      console.log('\n2. Run these commands:');
      console.log(`   CREATE DATABASE IF NOT EXISTS ${DB_NAME};`);
      console.log(`   CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';`);
      console.log(`   GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';`);
      console.log('   FLUSH PRIVILEGES;');
      console.log('   exit;');
      
      console.log('\n3. After running the commands above, run this script again to create tables.');
      
      // Try to continue with regular user connection to create tables
      console.log('\n-- Attempting to continue with application user --');
    }

    // Step 2: Setup database and user with root privileges
    console.log('\n-- Step 2: Setting up database and user --');
    try {
      const rootConnection = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: 'root',
        password: process.env.MARIADB_ROOT_PASSWORD || '',
        ssl: false
      });
      
      // Check if database exists, create if not
      console.log('Checking for database...');
      const [databases] = await rootConnection.query('SHOW DATABASES LIKE ?', [DB_NAME]);
      if (databases.length === 0) {
        console.log(`Database '${DB_NAME}' not found, creating it...`);
        await rootConnection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
        console.log(`✅ Database '${DB_NAME}' created`);
      } else {
        console.log(`Database '${DB_NAME}' already exists`);
      }
      
      // Check if user exists, create or update if needed
      console.log('Checking for application user...');
      try {
        const [users] = await rootConnection.query(`SELECT User FROM mysql.user WHERE User = ? AND Host = 'localhost'`, [DB_USER]);
        if (users.length === 0) {
          console.log(`User '${DB_USER}' not found, creating it...`);
          await rootConnection.query(`CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY ?`, [DB_PASS]);
          console.log(`✅ User '${DB_USER}' created`);
        } else {
          console.log(`User '${DB_USER}' exists, updating password...`);
          await rootConnection.query(`ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY ?`, [DB_PASS]);
          console.log(`✅ Updated password for user '${DB_USER}'`);
        }
      } catch (userErr) {
        console.log(`⚠️ Could not check/create user: ${userErr.message}`);
      }
      
      // Grant privileges
      console.log('Granting privileges...');
      await rootConnection.query(`GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost'`);
      await rootConnection.query('FLUSH PRIVILEGES');
      console.log('✅ User privileges granted');
      
      await rootConnection.end();
    } catch (rootErr) {
      console.log('⚠️ Could not connect as root:', rootErr.message);
      console.log('\nYou need to manually setup the database and user:');
      console.log('1. Connect to MariaDB as root:');
      console.log('   sudo mariadb');
      console.log('\n2. Run these commands:');
      console.log(`   CREATE DATABASE IF NOT EXISTS ${DB_NAME};`);
      console.log(`   CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';`);
      console.log(`   GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';`);
      console.log('   FLUSH PRIVILEGES;');
      console.log('   exit;');
      
      console.log('\nAfter setting up the database manually, run this script again.');
      console.log('If you changed the password, update it in .env.local first.');
      
      // Try to continue anyway - it might work if the database already exists
      console.log('\nAttempting to continue with setup...');
    }

    // Step 3: Connect as application user
    console.log('\n-- Step 3: Connecting as application user --');
    let connection;
    try {
      connection = await mysql.createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASS,
        database: DB_NAME,
        port: DB_PORT,
        ssl: false
      });
      console.log('✅ Connected successfully');
    } catch (connErr) {
      console.error('❌ Could not connect with application user:', connErr.message);
      console.log('Please check your database configuration in .env.local');
      console.log('Make sure the database and user exist with correct permissions.');
      return;
    }

    // Step 4: Create core tables
    console.log('\n-- Step 4: Creating core tables --');
    
    // Users table
    await connection.query(`
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

    // Messages table
    await connection.query(`
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

    // Assignments table
    await connection.query(`
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

    // Step 5: Create form tables
    console.log('\n-- Step 5: Creating form tables --');
    
    // Form templates table - with error handling for foreign key
    try {
      // Try creating with foreign key first
      await connection.query(`
        CREATE TABLE IF NOT EXISTS form_templates (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          fields TEXT NOT NULL,
          created_by VARCHAR(36) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ Form templates table created with foreign key');
    } catch (err) {
      console.log('⚠️ Could not create form_templates with foreign key:', err.code);
      console.log('Creating form_templates without foreign key...');
      
      // Create without foreign key on failure
      await connection.query(`
        CREATE TABLE IF NOT EXISTS form_templates (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          fields TEXT NOT NULL,
          created_by VARCHAR(36) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ Form templates table created without foreign key');
    }

    // Form submissions table - already has error handling
    await connection.query(`
      CREATE TABLE IF NOT EXISTS form_submissions (
        id VARCHAR(36) PRIMARY KEY,
        form_template_id VARCHAR(36) NOT NULL,
        submitted_by VARCHAR(36) NOT NULL,
        form_data TEXT NOT NULL,
        status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
        priority ENUM('pending', 'low', 'medium', 'high', 'urgent') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (form_template_id) REFERENCES form_templates(id),
        FOREIGN KEY (submitted_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `).catch(err => {
      console.log('⚠️ Could not create form_submissions with foreign keys:', err.code);
      console.log('Creating form_submissions without foreign keys...');
      return connection.query(`
        CREATE TABLE IF NOT EXISTS form_submissions (
          id VARCHAR(36) PRIMARY KEY,
          form_template_id VARCHAR(36) NOT NULL,
          submitted_by VARCHAR(36) NOT NULL,
          form_data TEXT NOT NULL,
          status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
          priority ENUM('pending', 'low', 'medium', 'high', 'urgent') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    });
    console.log('✅ Form submissions table created');

    // Step 6: Initialize default users
    console.log('\n-- Step 6: Creating default users --');
    
    // Define all default users
    const defaultUsers = [
      // Admin users
      { id: uuidv4(), name: 'Admin1', email: 'admin1@example.com', password: 'admin1', role: 'admin' },
      { id: uuidv4(), name: 'Admin2', email: 'admin2@example.com', password: 'admin2', role: 'admin' },
      
      // Helpdesk users
      { id: uuidv4(), name: 'Helpdesk1', email: 'helpdesk1@example.com', password: 'helpdesk1', role: 'helpdesk' },
      { id: uuidv4(), name: 'Helpdesk2', email: 'helpdesk2@example.com', password: 'helpdesk2', role: 'helpdesk' },
      { id: uuidv4(), name: 'Helpdesk3', email: 'helpdesk3@example.com', password: 'helpdesk3', role: 'helpdesk' },
      
      // Regular users
      { id: uuidv4(), name: 'Aditya', email: 'user1@example.com', password: 'user1', role: 'user' },
      { id: uuidv4(), name: 'Tejas', email: 'user2@example.com', password: 'user2', role: 'user' },
      { id: uuidv4(), name: 'Farhan', email: 'user3@example.com', password: 'user3', role: 'user' },
      { id: uuidv4(), name: 'Vedant', email: 'user4@example.com', password: 'user4', role: 'user' },
      { id: uuidv4(), name: 'Soumojit', email: 'user5@example.com', password: 'user5', role: 'user' }
    ];
    
    // Create each user if they don't exist
    for (const user of defaultUsers) {
      // Check if user exists
      const [userExists] = await connection.query(`SELECT 1 FROM users WHERE email = ? LIMIT 1`, [user.email]);
      
      if (userExists.length === 0) {
        // Hash password
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        // Insert user
        await connection.query(`
          INSERT INTO users (id, name, email, password, role, avatar)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          user.id,
          user.name,
          user.email,
          hashedPassword,
          user.role,
          `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`
        ]);
        console.log(`✅ User created: ${user.name} (${user.role})`);
      } else {
        console.log(`ℹ️ User already exists: ${user.email}`);
      }
    }

    // Print summary
    console.log('\n==== SETUP COMPLETE ====');
    console.log('\nYour database is now configured and ready to use!');
    console.log('\nTo start the application:');
    console.log('npm run dev');
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    if (error.code) console.error('Error code:', error.code);
    console.log('\nPlease check your database settings in .env.local');
  }
}

setupDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
