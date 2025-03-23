require('dotenv').config({ path: '.env.local' });
const { Sequelize, Op } = require('sequelize');

// Database connection
async function testHelpdeskUsers() {
  console.log('==== HELPDESK USERS DEBUG ====');
  console.log('Database configuration:');
  console.log(`- Host: ${process.env.MARIADB_HOST || 'localhost'}`);
  console.log(`- Database: ${process.env.MARIADB_DATABASE || 'ticketing'}`);
  console.log(`- User: ${process.env.MARIADB_USER || 'ticketing_app'}`);
  
  try {
    // Connect to database
    const sequelize = new Sequelize(
      process.env.MARIADB_DATABASE || 'ticketing',
      process.env.MARIADB_USER || 'ticketing_app',
      process.env.MARIADB_PASSWORD || 'secure_password',
      {
        host: process.env.MARIADB_HOST || 'localhost',
        dialect: 'mysql',
        dialectModule: require('mysql2'),
        logging: false,
        ssl: false
      }
    );
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Define User model inline for testing
    const User = sequelize.define('User', {
      id: {
        type: Sequelize.STRING(36),
        primaryKey: true
      },
      name: Sequelize.STRING,
      email: Sequelize.STRING,
      role: Sequelize.STRING,
      created_at: Sequelize.DATE,
      updated_at: Sequelize.DATE
    }, {
      tableName: 'users',
      timestamps: false
    });
    
    // Test raw SQL query first
    console.log('\nTesting raw SQL query:');
    const [rawResults] = await sequelize.query('SELECT id, name, email, role FROM users WHERE role = "helpdesk"');
    console.log(`Raw SQL found ${rawResults.length} helpdesk users:`);
    console.table(rawResults);
    
    // Test Sequelize model query
    console.log('\nTesting Sequelize model query:');
    const modelResults = await User.findAll({
      where: { role: 'helpdesk' },
      attributes: ['id', 'name', 'email', 'role', 'created_at']
    });
    
    console.log(`Sequelize found ${modelResults.length} helpdesk users:`);
    console.table(modelResults.map(u => u.toJSON()));
    
    // Close connection
    await sequelize.close();
    console.log('\n✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Error testing helpdesk users:', error);
    console.error('Error details:', error.message);
    if (error.parent) {
      console.error('Database error details:', error.parent.message);
    }
  }
}

testHelpdeskUsers(); 