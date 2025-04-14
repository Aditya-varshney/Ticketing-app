#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

/**
 * Unified Setup Script for Ticketing App
 * 
 * This script combines all necessary setup steps:
 * 1. Database and tables setup
 * 2. Schema migrations (ticket_id, assigned_by columns)
 * 3. Data seeding
 * 4. Verification
 */

// Configuration
const config = {
  host: process.env.MARIADB_HOST || 'localhost',
  user: process.env.MARIADB_ROOT_USER || 'root',
  password: process.env.MARIADB_ROOT_PASSWORD || '',
  database: process.env.MARIADB_DATABASE || 'ticketing',
  port: process.env.MARIADB_PORT || 3306,
  ssl: false
};

// App user to create
const appUser = {
  username: process.env.MARIADB_USER || 'ticket_user',
  password: process.env.MARIADB_PASSWORD || 'secure_password'
};

// Logging helper
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const getPrefix = () => {
    switch (type) {
      case 'error': return chalk.red('❌ ERROR');
      case 'success': return chalk.green('✅ SUCCESS');
      case 'warn': return chalk.yellow('⚠️ WARNING');
      case 'info': return chalk.blue('ℹ️ INFO');
      case 'step': return chalk.magenta('🔄 STEP');
      default: return chalk.grey('🔍 DEBUG');
    }
  };
  console.log(`[${timestamp}] ${getPrefix()}: ${message}`);
};

// Check if a file exists
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Execute a database query with error handling
async function executeQuery(connection, query, params = [], description = '') {
  try {
    const [result] = await connection.execute(query, params);
    if (description) {
      log(`${description} succeeded`, 'success');
    }
    return result;
  } catch (err) {
    log(`${description || 'Query'} failed: ${err.message}`, 'error');
    if (err.code === 'ER_DUP_ENTRY') {
      log('A duplicate entry was found. This may be expected if you\'ve run this script before.', 'warn');
    } else if (err.code === 'ER_TABLE_EXISTS_ERROR') {
      log('Table already exists. This is expected if you\'ve run this script before.', 'warn');
    } else if (err.code === 'ER_DB_CREATE_EXISTS') {
      log('Database already exists. This is expected if you\'ve run this script before.', 'warn');
    } else {
      log(`SQL Error Code: ${err.code}`, 'error');
      log(`SQL Query: ${query}`, 'error');
    }
    return null;
  }
}

// Create the database
async function createDatabase() {
  log('=== DATABASE SETUP ===', 'step');
  let connection;
  
  try {
    // Connect to MariaDB without specifying a database
    log('Connecting to MariaDB...', 'info');
    connection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      port: config.port
    });
    
    log('Connected to MariaDB successfully', 'success');
    
    // Check if database exists
    const [databases] = await connection.execute(`SHOW DATABASES LIKE '${config.database}'`);
    if (databases.length > 0) {
      log(`Database '${config.database}' already exists`, 'warn');
    } else {
      // Create the database
      await executeQuery(
        connection, 
        `CREATE DATABASE \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
        [],
        `Creating database '${config.database}'`
      );
    }
    
    // Create application user if it doesn't exist
    if (config.user !== appUser.username) {
      const [users] = await connection.execute(
        `SELECT User FROM mysql.user WHERE User = ?`,
        [appUser.username]
      );
      
      if (users.length > 0) {
        log(`User '${appUser.username}' already exists, updating permissions...`, 'info');
        // Drop user first to reset permissions
        await executeQuery(
          connection,
          `DROP USER IF EXISTS '${appUser.username}'@'%'`,
          [],
          `Dropping existing user '${appUser.username}'`
        );
      }
      
      // Create user with appropriate permissions
      await executeQuery(
        connection,
        `CREATE USER '${appUser.username}'@'%' IDENTIFIED BY '${appUser.password}'`,
        [],
        `Creating user '${appUser.username}'`
      );
      
      // Grant privileges
      await executeQuery(
        connection,
        `GRANT ALL PRIVILEGES ON \`${config.database}\`.* TO '${appUser.username}'@'%'`,
        [],
        `Granting privileges to '${appUser.username}'`
      );
      
      await executeQuery(connection, `FLUSH PRIVILEGES`, [], 'Flushing privileges');
    }
    
    // Close the root connection
    await connection.end();
    log('Initial database and user setup completed', 'success');
    
    // Connect as the application user to create tables
    connection = await mysql.createConnection({
      host: config.host,
      user: appUser.username,
      password: appUser.password,
      database: config.database,
      port: config.port,
      ssl: false
    });
    
    log(`Connected as '${appUser.username}'`, 'success');
    
    // Create tables
    await createTables(connection);
    
    // Create sample data
    await createSampleData(connection);
    
  } catch (err) {
    log(`Database setup failed: ${err.message}`, 'error');
    if (err.code === 'ECONNREFUSED') {
      log('Could not connect to the MariaDB server. Make sure it is running.', 'warn');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      log('Access denied. Check your database credentials in .env.local', 'warn');
    }
    process.exit(1);
  } finally {
    if (connection) {
      try {
        await connection.end();
        log('Database connection closed', 'info');
      } catch (err) {
        // Ignore errors on connection close
      }
    }
  }
}

// Create database tables
async function createTables(connection) {
  log('=== CREATING TABLES ===', 'step');
  
  try {
    // Create users table
    await executeQuery(
      connection,
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        role ENUM('user', 'helpdesk', 'admin') NOT NULL DEFAULT 'user',
        profile_image VARCHAR(255),
        bio TEXT,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      [],
      'Creating users table'
    );
    
    // Create forms table
    await executeQuery(
      connection,
      `CREATE TABLE IF NOT EXISTS forms (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        form_fields JSON NOT NULL,
        status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
        created_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )`,
      [],
      'Creating forms table'
    );
    
    // Create form_submissions table
    await executeQuery(
      connection,
      `CREATE TABLE IF NOT EXISTS form_submissions (
        id VARCHAR(36) PRIMARY KEY,
        form_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        form_data JSON NOT NULL,
        status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        assigned_to VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
      )`,
      [],
      'Creating form_submissions table'
    );
    
    // Create audit_logs table
    await executeQuery(
      connection,
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        action_type VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(36) NOT NULL,
        previous_state JSON,
        new_state JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )`,
      [],
      'Creating audit_logs table'
    );
    
    // Create chat_messages table
    await executeQuery(
      connection,
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(36) PRIMARY KEY,
        sender_id VARCHAR(36) NOT NULL,
        receiver_id VARCHAR(36) NOT NULL,
        ticket_id VARCHAR(36),
        content TEXT NOT NULL,
        attachment JSON,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (ticket_id) REFERENCES form_submissions(id) ON DELETE CASCADE
      )`,
      [],
      'Creating chat_messages table'
    );
    
    // Create file_attachments table
    await executeQuery(
      connection,
      `CREATE TABLE IF NOT EXISTS file_attachments (
        id VARCHAR(36) PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_size INT NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(36) NOT NULL,
        uploaded_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      )`,
      [],
      'Creating file_attachments table'
    );
    
    // Create quick_replies table
    await executeQuery(
      connection,
      `CREATE TABLE IF NOT EXISTS quick_replies (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      [],
      'Creating quick_replies table'
    );
    
    log('All tables created successfully', 'success');
  } catch (err) {
    log(`Error creating tables: ${err.message}`, 'error');
    throw err;
  }
}

// Create sample data
async function createSampleData(connection) {
  log('=== CREATING SAMPLE DATA ===', 'step');
  
  try {
    // Create sample users (admin, helpdesk, regular user)
    const adminPassword = await bcrypt.hash('admin123', 10);
    const helpdeskPassword = await bcrypt.hash('helpdesk123', 10);
    const userPassword = await bcrypt.hash('user123', 10);
    
    // Check if admin user exists
    const [existingAdmin] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      ['admin@example.com']
    );
    
    if (existingAdmin.length === 0) {
      // Create admin user
      await executeQuery(
        connection,
        `INSERT INTO users (id, username, email, password, first_name, last_name, role)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
        ['admin', 'admin@example.com', adminPassword, 'Admin', 'User', 'admin'],
        'Creating admin user'
      );
    } else {
      log('Admin user already exists, skipping...', 'info');
    }
    
    // Check if helpdesk user exists
    const [existingHelpdesk] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      ['helpdesk@example.com']
    );
    
    if (existingHelpdesk.length === 0) {
      // Create helpdesk user
      await executeQuery(
        connection,
        `INSERT INTO users (id, username, email, password, first_name, last_name, role)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
        ['helpdesk', 'helpdesk@example.com', helpdeskPassword, 'Help', 'Desk', 'helpdesk'],
        'Creating helpdesk user'
      );
    } else {
      log('Helpdesk user already exists, skipping...', 'info');
    }
    
    // Check if regular user exists
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      ['user@example.com']
    );
    
    if (existingUser.length === 0) {
      // Create regular user
      await executeQuery(
        connection,
        `INSERT INTO users (id, username, email, password, first_name, last_name, role)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
        ['user', 'user@example.com', userPassword, 'Regular', 'User', 'user'],
        'Creating regular user'
      );
    } else {
      log('Regular user already exists, skipping...', 'info');
    }
    
    // Get admin user ID
    const [adminUser] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      ['admin@example.com']
    );
    
    const adminId = adminUser[0].id;
    
    // Create sample form
    const [existingForm] = await connection.execute(
      'SELECT id FROM forms WHERE title = ?',
      ['IT Support Request']
    );
    
    let formId;
    
    if (existingForm.length === 0) {
      // Create form
      const formFields = JSON.stringify([
        {
          id: "title",
          label: "Issue Title",
          type: "text",
          required: true,
          placeholder: "Brief description of your issue"
        },
        {
          id: "description",
          label: "Detailed Description",
          type: "textarea",
          required: true,
          placeholder: "Please describe your issue in detail"
        },
        {
          id: "issueType",
          label: "Issue Type",
          type: "select",
          required: true,
          options: [
            { value: "hardware", label: "Hardware Problem" },
            { value: "software", label: "Software Problem" },
            { value: "network", label: "Network Issue" },
            { value: "account", label: "Account Access" },
            { value: "other", label: "Other" }
          ]
        },
        {
          id: "urgency",
          label: "Urgency Level",
          type: "radio",
          required: true,
          options: [
            { value: "low", label: "Low - Not time sensitive" },
            { value: "medium", label: "Medium - Affects work but has workaround" },
            { value: "high", label: "High - Severely impacts work" },
            { value: "urgent", label: "Urgent - Complete work stoppage" }
          ]
        },
        {
          id: "screenshot",
          label: "Attach Screenshot (optional)",
          type: "file",
          required: false,
          accept: "image/*"
        }
      ]);
      
      const [formResult] = await connection.execute(
        `INSERT INTO forms (id, title, description, form_fields, created_by)
         VALUES (UUID(), ?, ?, ?, ?)`,
        ['IT Support Request', 'Use this form to request IT support for hardware, software, or network issues', formFields, adminId]
      );
      
      // Get the form ID using UUID()
      const [newForm] = await connection.execute(
        'SELECT id FROM forms WHERE title = ?',
        ['IT Support Request']
      );
      
      formId = newForm[0].id;
      log('Created sample form', 'success');
    } else {
      formId = existingForm[0].id;
      log('Sample form already exists, skipping...', 'info');
    }
    
    // Get user ID
    const [regularUser] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      ['user@example.com']
    );
    
    const userId = regularUser[0].id;
    
    // Create sample ticket/submission
    const [existingTicket] = await connection.execute(
      'SELECT id FROM form_submissions WHERE form_id = ? AND user_id = ? LIMIT 1',
      [formId, userId]
    );
    
    if (existingTicket.length === 0) {
      // Create sample ticket
      const ticketData = JSON.stringify({
        title: "My computer won't start",
        description: "When I press the power button, I hear a beeping sound but the screen stays black.",
        issueType: "hardware",
        urgency: "high"
      });
      
      await executeQuery(
        connection,
        `INSERT INTO form_submissions (id, form_id, user_id, form_data, status, priority)
         VALUES (UUID(), ?, ?, ?, 'open', 'high')`,
        [formId, userId, ticketData],
        'Creating sample ticket'
      );
    } else {
      log('Sample ticket already exists, skipping...', 'info');
    }
    
    // Add sample quick replies for helpdesk
    const [helpdeskUser] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      ['helpdesk@example.com']
    );
    
    const helpdeskId = helpdeskUser[0].id;
    
    const [existingQuickReplies] = await connection.execute(
      'SELECT id FROM quick_replies WHERE user_id = ? LIMIT 1',
      [helpdeskId]
    );
    
    if (existingQuickReplies.length === 0) {
      // Add quick replies
      const quickReplies = [
        "Thank you for your message. I'll look into this issue right away.",
        "Could you please provide more information about the problem you're experiencing?",
        "Have you tried restarting your device? This often resolves many common issues.",
        "I'll need to get some additional details from you to help resolve this issue.",
        "Your ticket has been assigned to our technical team and they will contact you shortly."
      ];
      
      for (const reply of quickReplies) {
        await executeQuery(
          connection,
          `INSERT INTO quick_replies (id, user_id, content)
           VALUES (UUID(), ?, ?)`,
          [helpdeskId, reply],
          'Adding quick reply'
        );
      }
      
      log('Created sample quick replies', 'success');
    } else {
      log('Sample quick replies already exist, skipping...', 'info');
    }
    
    log('All sample data created successfully', 'success');
  } catch (err) {
    log(`Error creating sample data: ${err.message}`, 'error');
    throw err;
  }
}

// Create .env.local file if it doesn't exist
async function createEnvFile() {
  log('=== CHECKING ENVIRONMENT CONFIG ===', 'step');
  
  const envPath = path.join(process.cwd(), '.env.local');
  const envExists = await fileExists(envPath);
  
  if (!envExists) {
    log('.env.local not found, creating...', 'info');
    
    const envContent = `# Database Configuration
MARIADB_HOST=localhost
MARIADB_PORT=3306
MARIADB_DATABASE=ticketing
MARIADB_USER=ticket_user
MARIADB_PASSWORD=secure_password
MARIADB_ROOT_USER=root
MARIADB_ROOT_PASSWORD=

# Next Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-next-auth-secret-key-at-least-32-chars

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google API (for chatbot)
NEXT_PUBLIC_GOOGLE_API_KEY=your_google_api_key_here

# Optional - File upload config
NEXT_PUBLIC_MAX_FILE_SIZE=5242880
`;
    
    await fs.writeFile(envPath, envContent);
    log('.env.local file created successfully', 'success');
    log('Please review and update the values in .env.local before continuing', 'warn');
    
    // Ask user to update the file and continue
    console.log('\n' + chalk.yellow('⚠️  ACTION REQUIRED ⚠️'));
    console.log(chalk.yellow('Please edit the .env.local file with your actual configuration values.'));
    console.log(chalk.yellow('Once you have updated the file, re-run this script.\n'));
    
    process.exit(0);
  } else {
    log('.env.local file already exists', 'info');
    // Continue with setup
  }
}

// Check if MariaDB is installed and running
function checkMariaDB() {
  log('=== CHECKING MARIADB ===', 'step');
  
  try {
    // Try to connect to MariaDB server (will throw if not running)
    execSync(`mysql -h${config.host} -P${config.port} -u${config.user} ${config.password ? `-p${config.password}` : ''} -e "SELECT 1"`, { stdio: 'ignore' });
    log('MariaDB is running', 'success');
    return true;
  } catch (error) {
    log('Cannot connect to MariaDB server', 'error');
    log('Please make sure MariaDB is installed and running', 'warn');
    log('Installation instructions:');
    log('  - Ubuntu/Debian: sudo apt install mariadb-server && sudo systemctl start mariadb', 'info');
    log('  - CentOS/RHEL: sudo yum install mariadb-server && sudo systemctl start mariadb', 'info');
    log('  - macOS: brew install mariadb && brew services start mariadb', 'info');
    log('  - Windows: Download and install from https://mariadb.org/download/', 'info');
    return false;
  }
}

// Main function to run the setup
async function runSetup() {
  console.log(chalk.bold.blue('\n=== TICKETING SYSTEM SETUP ===\n'));
  
  try {
    // Check environment file
    await createEnvFile();
    
    // Check MariaDB is running
    const mariadbRunning = checkMariaDB();
    if (!mariadbRunning) {
      process.exit(1);
    }
    
    // Create database and tables
    await createDatabase();
    
    // Success message
    console.log(chalk.bold.green('\n=== SETUP COMPLETED SUCCESSFULLY ===\n'));
    log('You can now start the application with: npm run dev', 'success');
    
    // Display login credentials
    console.log(chalk.bold.yellow('\nSample User Accounts:'));
    console.log(chalk.yellow('Admin User:'));
    console.log('  Email: admin@example.com');
    console.log('  Password: admin123');
    console.log(chalk.yellow('\nHelpdesk User:'));
    console.log('  Email: helpdesk@example.com');
    console.log('  Password: helpdesk123');
    console.log(chalk.yellow('\nRegular User:'));
    console.log('  Email: user@example.com');
    console.log('  Password: user123');
    
    console.log(chalk.bold.red('\nIMPORTANT: For production use, change these default passwords!'));
    
  } catch (error) {
    log(`Setup failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the setup script
runSetup(); 