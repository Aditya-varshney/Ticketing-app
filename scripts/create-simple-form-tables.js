require('dotenv').config();
const mysql = require('mysql2/promise');

async function createTables() {
  console.log('Starting table creation process...');
  
  // Get database credentials
  const DB_NAME = process.env.DB_NAME || 'ticketing';
  const DB_USER = process.env.DB_USER || 'root';
  const DB_PASS = process.env.DB_PASS || '';
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = process.env.DB_PORT || 3306;
  
  console.log('Database config:', { DB_NAME, DB_USER, DB_HOST, DB_PORT });
  
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
      port: DB_PORT
    });
    
    console.log('Connected to database successfully');
    
    // Create form_templates table
    console.log('Creating form_templates table...');
    await connection.execute(`
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
    
    // Create form_submissions table
    console.log('Creating form_submissions table...');
    await connection.execute(`
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
    
    // Verify tables were created
    console.log('Checking tables created successfully...');
    const [rows] = await connection.execute('SHOW TABLES LIKE "form_%"');
    console.log('Created tables:', rows.map(row => Object.values(row)[0]));
    
    console.log('All tables created successfully!');
    await connection.end();
    
  } catch (error) {
    console.error('Error creating tables:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.errno) console.error('Error number:', error.errno);
    if (error.sqlMessage) console.error('SQL message:', error.sqlMessage);
    if (error.sqlState) console.error('SQL state:', error.sqlState);
    
    console.log('\nPlease check that:');
    console.log('1. Your database connection details are correct in .env file');
    console.log('2. The database exists and is accessible');
    console.log('3. The user has sufficient privileges to create tables');
    console.log('4. The "users" table exists (as we have foreign keys referencing it)');
  }
}

createTables()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
