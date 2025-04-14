const bcrypt = require('bcrypt');
const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '.env.local' });

const sequelize = new Sequelize({
  host: process.env.DB_HOST || process.env.MARIADB_HOST || 'localhost',
  port: process.env.DB_PORT || process.env.MARIADB_PORT || 3306,
  username: 'root',
  password: 'your_root_password',
  database: 'ticketing',
  dialect: 'mariadb'
});

async function updatePasswords() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    const users = [
      { email: 'admin1@example.com', password: 'admin1' },
      { email: 'admin2@example.com', password: 'admin2' },
      { email: 'helpdesk1@example.com', password: 'helpdesk1' },
      { email: 'helpdesk2@example.com', password: 'helpdesk2' },
      { email: 'helpdesk3@example.com', password: 'helpdesk3' },
      { email: 'user1@example.com', password: 'user1' },
      { email: 'user2@example.com', password: 'user2' },
      { email: 'user3@example.com', password: 'user3' },
      { email: 'user4@example.com', password: 'user4' },
      { email: 'user5@example.com', password: 'user5' }
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await sequelize.query(
        'UPDATE users SET password = ? WHERE email = ?',
        {
          replacements: [hashedPassword, user.email],
          type: Sequelize.QueryTypes.UPDATE
        }
      );
      console.log(`Updated password for ${user.email}`);
    }

    console.log('All passwords have been updated successfully!');
  } catch (error) {
    console.error('Error updating passwords:', error);
  } finally {
    await sequelize.close();
  }
}

updatePasswords(); 