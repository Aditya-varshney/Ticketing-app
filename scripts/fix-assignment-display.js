// Create this to debug and fix assignments display
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config({ path: '.env.local' });

async function debugAssignments() {
  // Create Sequelize instance
  const sequelize = new Sequelize(
    process.env.MARIADB_DATABASE || 'ticketing',
    process.env.MARIADB_USER || 'ticketing_app',
    process.env.MARIADB_PASSWORD || 'secure_password',
    {
      host: process.env.MARIADB_HOST || 'localhost',
      dialect: 'mysql',
      logging: false,
      ssl: false
    }
  );

  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Connected to MariaDB');
    
    // Get associations
    const [results] = await sequelize.query(`
      SELECT 
        a.id, 
        a.user_id, 
        a.helpdesk_id, 
        a.assigned_by,
        u1.name AS user_name,
        u1.email AS user_email,
        u2.name AS helpdesk_name,
        u2.email AS helpdesk_email,
        u3.name AS admin_name,
        u3.email AS admin_email
      FROM assignments a
      JOIN users u1 ON a.user_id = u1.id
      JOIN users u2 ON a.helpdesk_id = u2.id
      JOIN users u3 ON a.assigned_by = u3.id
    `);
    
    console.log('Current assignments:');
    console.table(results);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

debugAssignments();
