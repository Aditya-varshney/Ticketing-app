require('dotenv').config({ path: '.env.local' });
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

/**
 * Unified Setup Script for Ticketing App
 * 
 * This script combines all necessary setup steps:
 * 1. Database and tables setup
 * 2. Schema migrations (ticket_id, assigned_by columns)
 * 3. Data seeding
 * 4. Verification
 */

// Helper to log with timestamps
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = type === 'error' ? '❌ ERROR' : 
                 type === 'success' ? '✅ SUCCESS' : 
                 type === 'warn' ? '⚠️ WARNING' : 'ℹ️ INFO';
  console.log(`[${timestamp}] ${prefix}: ${message}`);
};

// Main setup function
async function runUnifiedSetup() {
  log('Starting unified setup for Ticketing App');
  
  // Check if .env.local exists, create from template if not
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  const envExamplePath = path.resolve(process.cwd(), '.env.example');
  
  if (!fs.existsSync(envLocalPath) && fs.existsSync(envExamplePath)) {
    log('.env.local file not found. Creating from .env.example...', 'warn');
    fs.copyFileSync(envExamplePath, envLocalPath);
    log('Created .env.local from template. Please edit it with your database credentials.', 'success');
    log('Then run this script again.');
    return;
  }

  // Reload environment after potential .env.local creation
  require('dotenv').config({ path: '.env.local', override: true });
  
  // Get database configuration - support both DB_* and MARIADB_* variable names for compatibility
  const DB_NAME = process.env.MARIADB_DATABASE || process.env.DB_NAME || 'ticketing';
  const DB_USER = process.env.MARIADB_USER || process.env.DB_USER || 'ticketing_app';
  const DB_PASS = process.env.MARIADB_PASSWORD || process.env.DB_PASSWORD || 'secure_password';
  const DB_HOST = process.env.MARIADB_HOST || process.env.DB_HOST || 'localhost';
  const DB_PORT = parseInt(process.env.MARIADB_PORT || process.env.DB_PORT || '3306', 10);

  log('Database configuration:');
  log(`- Host: ${DB_HOST}`);
  log(`- Database: ${DB_NAME}`);
  log(`- User: ${DB_USER}`);
  log(`- Port: ${DB_PORT}`);

  try {
    // STEP 1: Database Setup
    log('\n==== STEP 1: Database Setup ====');
    
    // Try to connect as root to create database and user
    try {
      log('Attempting to connect as root to set up database and user...');
      const rootConnection = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: 'root',
        password: process.env.MARIADB_ROOT_PASSWORD || process.env.DB_ROOT_PASSWORD || '',
        ssl: false
      });
      
      // Create database if not exists
      log('Creating database if not exists...');
      await rootConnection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
      
      // Create user if not exists
      log('Creating user if not exists...');
      await rootConnection.query(`
        CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}'
      `);
      
      // Grant privileges
      log('Granting privileges...');
      await rootConnection.query(`
        GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost'
      `);
      await rootConnection.query('FLUSH PRIVILEGES');
      
      await rootConnection.end();
      log('Database and user setup completed successfully', 'success');
    } catch (rootError) {
      log('Could not connect as root. You may need to set up the database manually.', 'warn');
      log(`Manual setup commands:
      CREATE DATABASE IF NOT EXISTS ${DB_NAME};
      CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
      GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
      FLUSH PRIVILEGES;`, 'info');
    }
    
    // STEP 2: Connect with application user and create tables
    log('\n==== STEP 2: Creating Tables ====');
    let connection;
    
    try {
      log('Connecting with application user...');
      connection = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASS,
        database: DB_NAME,
        ssl: false
      });
      log('Connected successfully', 'success');
    } catch (connError) {
      log(`Could not connect with user ${DB_USER}: ${connError.message}`, 'error');
      log('Please check your database configuration in .env.local');
      return;
    }
    
    // Create tables
    log('Creating core tables...');
    
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
    log('Users table created or already exists', 'success');

    // Messages table with ticket_id
    await connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        sender VARCHAR(36) NOT NULL,
        receiver VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        \`read\` BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        ticket_id VARCHAR(36) NULL,
        FOREIGN KEY (sender) REFERENCES users(id),
        FOREIGN KEY (receiver) REFERENCES users(id),
        INDEX(sender, receiver, created_at),
        INDEX(ticket_id)
      )
    `);
    log('Messages table created or already exists', 'success');

    // Form templates table
    try {
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
      log('Form templates table created with foreign key', 'success');
    } catch (err) {
      log('Creating form_templates without foreign key constraint...', 'warn');
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
      log('Form templates table created without foreign key', 'success');
    }

    // Form submissions table
    await connection.query(`
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
    `).catch(err => {
      log(`Error with foreign keys: ${err.message}`, 'warn');
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
    log('Form submissions table created or already exists', 'success');

    // Check for status column in form_submissions
    const [statusExists] = await connection.query(
      `SHOW COLUMNS FROM form_submissions LIKE 'status'`
    );

    if (statusExists.length === 0) {
      log('Adding status column to form_submissions table...');
      await connection.query(`
        ALTER TABLE form_submissions 
        ADD COLUMN status VARCHAR(20) DEFAULT 'active'
      `);
      log('Added status column to form_submissions table', 'success');
    } else {
      log('status column already exists in form_submissions table', 'info');
    }

    // Ticket assignments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ticket_assignments (
        id VARCHAR(36) PRIMARY KEY,
        ticket_id VARCHAR(36) NOT NULL UNIQUE,
        helpdesk_id VARCHAR(36) NOT NULL,
        assigned_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    log('Ticket assignments table created or already exists', 'success');
    
    // STEP 3: Migrate schemas if needed
    log('\n==== STEP 3: Checking for Schema Migrations ====');
    
    // Check for ticket_id column in messages
    const [ticketIdExists] = await connection.query(
      `SHOW COLUMNS FROM messages LIKE 'ticket_id'`
    );
    
    if (ticketIdExists.length === 0) {
      log('Adding ticket_id column to messages table...');
      await connection.query(`
        ALTER TABLE messages 
        ADD COLUMN ticket_id VARCHAR(36) NULL,
        ADD INDEX idx_messages_ticket_id (ticket_id)
      `);
      log('Added ticket_id column to messages table', 'success');
    } else {
      log('ticket_id column already exists in messages table', 'info');
    }
    
    // Check for assigned_by column in ticket_assignments
    const [assignedByExists] = await connection.query(
      `SHOW COLUMNS FROM ticket_assignments LIKE 'assigned_by'`
    );
    
    if (assignedByExists.length === 0) {
      log('Adding assigned_by column to ticket_assignments table...');
      await connection.query(`
        ALTER TABLE ticket_assignments 
        ADD COLUMN assigned_by VARCHAR(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
      `);
      log('Added assigned_by column to ticket_assignments table', 'success');
    } else {
      log('assigned_by column already exists in ticket_assignments table', 'info');
    }

    // Check for assigned_at column in ticket_assignments
    const [assignedAtExists] = await connection.query(
      `SHOW COLUMNS FROM ticket_assignments LIKE 'assigned_at'`
    );

    if (assignedAtExists.length === 0) {
      log('Adding assigned_at column to ticket_assignments table...');
      await connection.query(`
        ALTER TABLE ticket_assignments 
        ADD COLUMN assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      log('Added assigned_at column to ticket_assignments table', 'success');
    } else {
      log('assigned_at column already exists in ticket_assignments table', 'info');
    }
    
    // STEP 4: Seed default users
    log('\n==== STEP 4: Creating Default Users ====');
    
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
      { id: uuidv4(), name: 'Soumojit', email: 'user4@example.com', password: 'user4', role: 'user' },
      { id: uuidv4(), name: 'Vedant', email: 'user5@example.com', password: 'user5', role: 'user' }
    ];
    
    // Create each user if they don't exist
    for (const user of defaultUsers) {
      // Check if user exists
      const [userExists] = await connection.query(
        `SELECT 1 FROM users WHERE email = ? LIMIT 1`, 
        [user.email]
      );
      
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
        log(`User created: ${user.name} (${user.role})`, 'success');
      } else {
        log(`User already exists: ${user.email}`, 'info');
      }
    }
    
    // STEP 5: Link messages with tickets
    log('\n==== STEP 5: Linking Messages with Tickets ====');
    
    // Get all tickets and their submitters
    const [tickets] = await connection.query(`
      SELECT 
        fs.id as ticket_id, 
        fs.submitted_by as user_id,
        ta.helpdesk_id
      FROM form_submissions fs
      LEFT JOIN ticket_assignments ta ON fs.id = ta.ticket_id
    `);
    
    log(`Found ${tickets.length} tickets.`);
    
    // Get all messages that don't have a ticket_id
    const [messages] = await connection.query(`
      SELECT id, sender, receiver
      FROM messages
      WHERE ticket_id IS NULL
    `);
    
    log(`Found ${messages.length} messages without ticket_id.`);
    
    if (messages.length > 0) {
      // For each ticket, find matching messages and update them
      let updatedCount = 0;
      
      for (const ticket of tickets) {
        const userId = ticket.user_id;
        const helpdeskId = ticket.helpdesk_id;
        
        if (!userId || !helpdeskId) {
          continue; // Skip tickets without user or helpdesk assignment
        }
        
        // Find messages between this user and helpdesk staff
        const messagesForTicket = messages.filter(message => 
          (message.sender === userId && message.receiver === helpdeskId) || 
          (message.sender === helpdeskId && message.receiver === userId)
        );
        
        if (messagesForTicket.length > 0) {
          const messageIds = messagesForTicket.map(m => `'${m.id}'`).join(',');
          log(`Updating ${messagesForTicket.length} messages for ticket ${ticket.ticket_id}...`);
          
          // Update these messages with the ticket_id
          await connection.query(`
            UPDATE messages
            SET ticket_id = '${ticket.ticket_id}'
            WHERE id IN (${messageIds})
          `);
          
          updatedCount += messagesForTicket.length;
        }
      }
      
      log(`Successfully updated ${updatedCount} messages with ticket IDs.`, 'success');
      log(`${messages.length - updatedCount} messages could not be mapped to a specific ticket.`, 'info');
    }
    
    // STEP 6: Verify everything is set up correctly
    log('\n==== STEP 6: Verification ====');
    
    const [tablesResult] = await connection.query('SHOW TABLES');
    const tables = tablesResult.map(row => Object.values(row)[0]);
    
    log(`Found ${tables.length} tables: ${tables.join(', ')}`, 'success');
    
    // Count records in each table
    for (const table of tables) {
      const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = countResult[0].count;
      log(`Table '${table}' has ${count} records`);
    }
    
    // Clean up
    await connection.end();
    
    // STEP 7: Final instructions
    log('\n==== Setup Complete! ====', 'success');
    log('\nYou can now start the application:');
    log('npm run dev');
    log('\nDefault login credentials:');
    log('Admin: admin1@example.com / admin1');
    log('Helpdesk: helpdesk1@example.com / helpdesk1');
    log('User: user1@example.com / user1');
    
  } catch (error) {
    log(`Error during setup: ${error.message}`, 'error');
    log(`Stack trace: ${error.stack}`, 'error');
    process.exit(1);
  }
}

// Run the setup
runUnifiedSetup().then(() => {
  log('Setup process completed', 'success');
}).catch(err => {
  log(`Unhandled error in setup: ${err.message}`, 'error');
  process.exit(1);
}); 