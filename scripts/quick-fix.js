const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Read env variables
require('dotenv').config({ path: '.env.local' });

// Database connection details from env
const DB_HOST = process.env.DB_HOST || process.env.MARIADB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || process.env.MARIADB_PORT || '3306';
const DB_USER = process.env.DB_USER || process.env.MARIADB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || process.env.MARIADB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || process.env.MARIADB_DATABASE || 'ticketing';

console.log('Quick fix script for audit trail and attachments issues');
console.log('=====================================================');
console.log(`Using database ${DB_NAME} on ${DB_HOST}:${DB_PORT}`);

// Create temporary SQL file
const tempSqlFile = path.join(__dirname, 'temp-fix.sql');

// SQL commands to fix issues
const sqlCommands = `
-- Check if audit_logs table exists, otherwise create it
CREATE TABLE IF NOT EXISTS \`audit_logs\` (
  \`id\` VARCHAR(36) PRIMARY KEY,
  \`user_id\` VARCHAR(36) NOT NULL,
  \`action\` VARCHAR(255) NOT NULL,
  \`entity_type\` VARCHAR(255) NOT NULL,
  \`entity_id\` VARCHAR(36) NOT NULL,
  \`details\` JSON,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add columns for previous_value and new_value if they don't exist
ALTER TABLE \`audit_logs\` 
ADD COLUMN IF NOT EXISTS \`previous_value\` TEXT AFTER \`entity_id\`,
ADD COLUMN IF NOT EXISTS \`new_value\` TEXT AFTER \`previous_value\`;

-- Create a public/uploads directory if it doesn't exist
-- (This is for file attachments)
`;

// Write SQL commands to temporary file
fs.writeFileSync(tempSqlFile, sqlCommands);

// Execute SQL commands using mysql/mariadb command line
async function runSqlCommands() {
  try {
    // Construct mysql command
    const mysqlCmd = `mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} ${DB_PASSWORD ? `-p${DB_PASSWORD}` : ''} ${DB_NAME} < ${tempSqlFile}`;
    console.log('Running SQL commands...');
    
    // Execute command
    await execPromise(mysqlCmd);
    console.log('SQL commands executed successfully');
    
    // Create uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`Created uploads directory at ${uploadsDir}`);
    } else {
      console.log(`Uploads directory already exists at ${uploadsDir}`);
    }
    
    console.log('\nFix completed successfully!');
    console.log('Please restart your application for the changes to take effect.');
    
  } catch (error) {
    console.error('Error executing SQL commands:', error.message);
    console.log('\nManual instructions if the script failed:');
    console.log('1. Connect to your database and run these commands:');
    console.log(sqlCommands);
    console.log('2. Create a directory at public/uploads for file attachments');
  } finally {
    // Clean up temporary file
    if (fs.existsSync(tempSqlFile)) {
      fs.unlinkSync(tempSqlFile);
    }
  }
}

// Run the fix
runSqlCommands(); 