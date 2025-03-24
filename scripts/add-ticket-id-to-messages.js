require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Create a connection to the database using the same config as the app
const runMigration = async () => {
  console.log('Starting migration to add ticket_id column to messages table...');
  console.log('Connecting to database...');
  
  const host = process.env.MARIADB_HOST || 'localhost';
  const user = process.env.MARIADB_USER || 'ticketing_app';
  const password = process.env.MARIADB_PASSWORD || 'secure_password';
  const database = process.env.MARIADB_DATABASE || 'ticketing';
  const port = parseInt(process.env.MARIADB_PORT || '3306', 10);
  
  // Print configuration for debugging (without password)
  console.log(`DB Config - Host: ${host}, User: ${user}, Database: ${database}, Port: ${port}`);
  
  const sequelize = new Sequelize(database, user, password, {
    host,
    port,
    dialect: 'mysql',
    dialectModule: require('mysql2'),
    logging: console.log
  });
  
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('Connected to database successfully!');
    
    // Run a raw query to check if the column exists
    const [results] = await sequelize.query(
      `SHOW COLUMNS FROM messages LIKE 'ticket_id'`
    );
    
    if (results.length === 0) {
      console.log('The ticket_id column does not exist. Adding it now...');
      
      // Add the ticket_id column
      await sequelize.query(`
        ALTER TABLE messages 
        ADD COLUMN ticket_id VARCHAR(36) NULL,
        ADD INDEX idx_messages_ticket_id (ticket_id)
      `);
      
      console.log('Added ticket_id column to messages table with an index');
    } else {
      console.log('The ticket_id column already exists.');
    }
    
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

runMigration(); 