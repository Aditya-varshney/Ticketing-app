const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const {
  MYSQL_HOST: DB_HOST = 'localhost',
  MYSQL_PORT: DB_PORT = 3306,
  MYSQL_USER: DB_USER = 'ticketing_app',
  MYSQL_PASSWORD: DB_PASS = '',
  MYSQL_DATABASE: DB_NAME = 'ticketing'
} = process.env;

async function updateSchema() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME
    });

    // Check current maximum lengths
    console.log('Checking current data lengths...');
    
    const [formSubmissionsMaxLength] = await connection.query(`
      SELECT MAX(LENGTH(id)) as max_length FROM form_submissions
    `);
    console.log('Maximum length in form_submissions.id:', formSubmissionsMaxLength[0].max_length);

    const [ticketAssignmentsMaxLength] = await connection.query(`
      SELECT MAX(LENGTH(ticket_id)) as max_length FROM ticket_assignments
    `);
    console.log('Maximum length in ticket_assignments.ticket_id:', ticketAssignmentsMaxLength[0].max_length);

    const [messagesMaxLength] = await connection.query(`
      SELECT MAX(LENGTH(ticket_id)) as max_length FROM messages
    `);
    console.log('Maximum length in messages.ticket_id:', messagesMaxLength[0].max_length);

    // Use a safe length that can accommodate both existing data and new format
    const safeLength = Math.max(
      50,  // New format maximum length
      formSubmissionsMaxLength[0].max_length || 0,
      ticketAssignmentsMaxLength[0].max_length || 0,
      messagesMaxLength[0].max_length || 0
    );

    console.log(`Using safe length of ${safeLength} characters for all ID fields`);

    // Update form_submissions table
    console.log('Updating form_submissions table...');
    await connection.query(`
      ALTER TABLE form_submissions 
      MODIFY COLUMN id VARCHAR(${safeLength}) NOT NULL
    `);
    console.log('Updated form_submissions table successfully');

    // Update ticket_assignments table
    console.log('Updating ticket_assignments table...');
    await connection.query(`
      ALTER TABLE ticket_assignments 
      MODIFY COLUMN ticket_id VARCHAR(${safeLength}) NOT NULL
    `);
    console.log('Updated ticket_assignments table successfully');

    // Update messages table
    console.log('Updating messages table...');
    await connection.query(`
      ALTER TABLE messages 
      MODIFY COLUMN ticket_id VARCHAR(${safeLength}) NULL
    `);
    console.log('Updated messages table successfully');

    console.log('Schema update completed successfully!');
  } catch (error) {
    console.error('Error updating schema:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateSchema(); 