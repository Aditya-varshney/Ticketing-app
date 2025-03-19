require('dotenv').config();

const { Sequelize } = require('sequelize');

// Get database credentials from environment variables or use defaults
const DB_NAME = process.env.DB_NAME || 'ticketing';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || ''; // This might need to be your actual password
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;

// Log the database configuration for debugging
console.log('Database Configuration:');
console.log(`- Database: ${DB_NAME}`);
console.log(`- User: ${DB_USER}`);
console.log(`- Password: ${DB_PASS ? '******' : '(empty)'}`);
console.log(`- Host: ${DB_HOST}`);
console.log(`- Port: ${DB_PORT}`);

// Database configuration
const sequelize = new Sequelize(
  DB_NAME,
  DB_USER,
  DB_PASS,
  {
    host: DB_HOST,
    dialect: 'mariadb',
    port: DB_PORT,
    logging: console.log // Enable logging for debugging
  }
);

async function createTables() {
  try {
    console.log('Attempting to connect to database...');
    await sequelize.authenticate();
    console.log('Connection established successfully.');
    
    // FormTemplate table
    console.log('Creating form_templates table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS form_templates (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        fields TEXT NOT NULL,
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Form Templates table created successfully');
    
    // FormSubmission table 
    console.log('Creating form_submissions table...');
    await sequelize.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Form Submissions table created successfully');
    
    // Verify the tables were created
    const [results] = await sequelize.query(`
      SHOW TABLES LIKE 'form_%';
    `);
    console.log('Created tables:', results);
    
    console.log('All tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    
    console.log('\nIf you\'re getting an "Access denied" error, here are some troubleshooting steps:');
    console.log('1. Make sure you have a .env file with the correct database credentials');
    console.log('2. Your .env file should contain: DB_USER, DB_PASS, DB_NAME, DB_HOST, DB_PORT');
    console.log('3. If using root account, make sure the password is correct');
    console.log('4. Check if the database exists and the user has privileges');
    console.log('5. Try creating the tables manually in your database client');
    
    console.log('\nExample SQL for manual creation:');
    console.log(`
    CREATE TABLE IF NOT EXISTS form_templates (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      fields TEXT NOT NULL,
      created_by VARCHAR(36) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } finally {
    try {
      await sequelize.close();
      console.log('Database connection closed');
    } catch (err) {
      console.error('Error closing database connection:', err);
    }
  }
}

createTables();
