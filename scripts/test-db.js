require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Parse command line arguments without yargs
const args = process.argv.slice(2);
const options = {
  test: true,  // Default option
  tables: args.includes('--tables') || args.includes('-a'),
  users: args.includes('--users') || args.includes('-u'),
  forms: args.includes('--forms') || args.includes('-f'),
  all: args.includes('--all'),
  help: args.includes('--help') || args.includes('-h'),
  setup: args.includes('--setup') || args.includes('-s')
};

// Show help if requested
if (options.help) {
  console.log('Usage: node test-db.js [options]');
  console.log('Options:');
  console.log('  --tables, -a   Show all tables');
  console.log('  --users, -u    Show users table structure and records');
  console.log('  --forms, -f    Show form templates and submissions');
  console.log('  --all          Run all checks');
  console.log('  --setup, -s    Show database setup information');
  console.log('  --help, -h     Show this help message');
  process.exit(0);
}

// Check if .env.local exists
if (!fs.existsSync(path.resolve(process.cwd(), '.env.local'))) {
  console.log('⚠️ No .env.local file found. Database connection will likely fail.');
  console.log('Run setup-db.js first to create the configuration file.');
  
  if (!options.setup) {
    console.log('Use --setup option to see more information.');
    process.exit(1);
  }
}

// Database config
const config = {
  host: process.env.MARIADB_HOST || 'localhost',
  user: process.env.MARIADB_USER || 'ticketing_app',
  password: process.env.MARIADB_PASSWORD || 'secure_password',
  database: process.env.MARIADB_DATABASE || 'ticketing',
  port: process.env.DB_PORT || 3306,
  ssl: false
};

// Show setup information if requested
if (options.setup) {
  console.log('==== DATABASE SETUP INFORMATION ====');
  console.log('Current configuration:');
  console.log(`- Host: ${config.host}`);
  console.log(`- User: ${config.user}`);
  console.log(`- Database: ${config.database}`);
  console.log(`- Port: ${config.port}`);
  
  console.log('\nSetup Instructions:');
  console.log('1. Make sure MariaDB is installed and running');
  console.log('2. Run the setup script: node scripts/setup-db.js');
  console.log('3. Run this test script to verify the connection');
  
  console.log('\nFirst-time Setup:');
  console.log('- Configure .env.local with your database credentials');
  console.log('- The setup script will create the database and user if needed');
  console.log('- Default user credentials are created for testing');
  process.exit(0);
}

async function testConnection() {
  console.log('==== DATABASE CONNECTION TEST ====');
  console.log('Testing connection with:');
  console.log(`- Host: ${config.host}`);
  console.log(`- User: ${config.user}`);
  console.log(`- Database: ${config.database}`);
  
  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ Connected successfully!');
    
    const [result] = await connection.execute('SELECT VERSION() as version');
    console.log(`Database version: ${result[0].version}`);
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.code) console.error('Error code:', error.code);
    
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n⚠️ Database does not exist. Run setup script:');
      console.log('node scripts/setup-db.js');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n⚠️ Access denied. Check your credentials in .env.local');
      console.log('For first-time setup: node scripts/setup-db.js');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️ Connection refused. Is MariaDB running?');
      console.log('Start MariaDB: sudo systemctl start mariadb');
    }
    
    return false;
  }
}

async function checkTables() {
  console.log('\n==== DATABASE TABLES ====');
  
  try {
    const connection = await mysql.createConnection(config);
    
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tables in database:');
    tables.forEach((row, i) => {
      console.log(`${i+1}. ${Object.values(row)[0]}`);
    });
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    return false;
  }
}

async function checkUsers() {
  console.log('\n==== USERS TABLE ====');
  
  try {
    const connection = await mysql.createConnection(config);
    
    // Check users table structure
    const [columns] = await connection.execute('DESCRIBE users');
    console.log('Users table structure:');
    console.table(columns);
    
    // Show total users count by role
    const [userStats] = await connection.execute(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `);
    console.log('\nUser statistics:');
    console.table(userStats);
    
    // Show the most recent 5 users
    console.log('\nMost recent users:');
    const [recentUsers] = await connection.execute(`
      SELECT id, name, email, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.table(recentUsers);
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
    return false;
  }
}

async function viewForms() {
  console.log('\n==== FORM DATA ====');
  
  try {
    const connection = await mysql.createConnection(config);
    
    // Show form templates
    const [templates] = await connection.execute(`
      SELECT id, name, created_by, created_at
      FROM form_templates
      ORDER BY created_at DESC
    `);
    
    console.log('Form Templates:');
    if (templates.length === 0) {
      console.log('No form templates found');
    } else {
      console.table(templates);
      
      // Show the fields of the most recent template
      const [fields] = await connection.execute(`
        SELECT fields FROM form_templates ORDER BY created_at DESC LIMIT 1
      `);
      
      if (fields.length > 0) {
        console.log('\nMost recent template fields:');
        try {
          const parsedFields = JSON.parse(fields[0].fields);
          console.table(parsedFields);
        } catch (e) {
          console.log('Raw fields:', fields[0].fields);
        }
      }
    }
    
    // Show form submissions
    const [submissions] = await connection.execute(`
      SELECT fs.id, ft.name as form_name, fs.status, fs.priority, fs.created_at
      FROM form_submissions fs
      JOIN form_templates ft ON fs.form_template_id = ft.id
      ORDER BY fs.created_at DESC
      LIMIT 10
    `);
    
    console.log('\nForm Submissions:');
    if (submissions.length === 0) {
      console.log('No form submissions found');
    } else {
      console.table(submissions);
    }
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ Error viewing forms:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('Form tables have not been created yet');
    }
    return false;
  }
}

async function runTests() {
  let connected = false;
  
  // Always run connection test first
  if (options.test || options.all) {
    connected = await testConnection();
    if (!connected) {
      console.error('\n❌ Cannot proceed with other tests due to connection failure');
      console.log('Run setup-db.js first to ensure the database is properly configured.');
      return;
    }
  }
  
  // Run other tests based on arguments
  if (options.tables || options.all) await checkTables();
  if (options.users || options.all) await checkUsers();
  if (options.forms || options.all) await viewForms();
  
  // If no specific test is requested, show usage
  if (!options.tables && !options.users && !options.forms && !options.all && !options.help && !options.setup) {
    console.log('\nTip: Use command line options to run specific tests:');
    console.log('  --tables (-a): Show all tables');
    console.log('  --users (-u): Show users table details');
    console.log('  --forms (-f): Show form templates and submissions');
    console.log('  --all: Run all checks');
    console.log('  --setup (-s): Show database setup information');
    console.log('  --help (-h): Show help');
  }
}

runTests();
