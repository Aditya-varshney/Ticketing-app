require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Create a connection to the database using the same config as the app
const runMigration = async () => {
  console.log('Starting migration to add assigned_by column to ticket_assignments table...');
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
      `SHOW COLUMNS FROM ticket_assignments LIKE 'assigned_by'`
    );
    
    if (results.length === 0) {
      console.log('The assigned_by column does not exist. Adding it now...');
      
      // Add the assigned_by column
      await sequelize.query(`
        ALTER TABLE ticket_assignments 
        ADD COLUMN assigned_by VARCHAR(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        ADD CONSTRAINT fk_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id)
      `);
      
      console.log('Added assigned_by column to ticket_assignments table');
      
      // Update existing records to use the helpdesk_id as the assigned_by
      console.log('Updating existing records...');
      
      await sequelize.query(`
        UPDATE ticket_assignments 
        SET assigned_by = helpdesk_id
        WHERE assigned_by = '00000000-0000-0000-0000-000000000000'
      `);
      
      // Remove the default value
      await sequelize.query(`
        ALTER TABLE ticket_assignments 
        ALTER COLUMN assigned_by DROP DEFAULT
      `);
      
      console.log('Updated existing assignments.');
    } else {
      console.log('The assigned_by column already exists.');
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