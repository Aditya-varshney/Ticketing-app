const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env.local' });

async function initializeMariaDB() {
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

  // Test connection
  try {
    await sequelize.authenticate();
    console.log('Connected to MariaDB successfully.');

    // Define User model for initialization
    const User = sequelize.define('User', {
      id: {
        type: DataTypes.STRING(36),
        primaryKey: true,
        defaultValue: () => uuidv4()
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      role: {
        type: DataTypes.ENUM('user', 'helpdesk', 'admin'),
        defaultValue: 'user'
      },
      avatar: {
        type: DataTypes.STRING
      }
    }, {
      tableName: 'users',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    // Sync tables (create them if they don't exist)
    await sequelize.sync();
    
    // Check if admin user exists
    const admin = await User.findOne({ where: { email: 'admin@example.com' } });
    
    if (!admin) {
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        id: uuidv4(),
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=random'
      });
      console.log('Created admin user:');
      console.log('- Email: admin@example.com');
      console.log('- Password: admin123');
    } else {
      console.log('Admin user already exists');
    }
    
    // Check if helpdesk user exists
    const helpdesk = await User.findOne({ where: { email: 'helpdesk@example.com' } });
    
    if (!helpdesk) {
      // Create helpdesk user
      const hashedPassword = await bcrypt.hash('helpdesk123', 10);
      await User.create({
        id: uuidv4(),
        name: 'Helpdesk User',
        email: 'helpdesk@example.com',
        password: hashedPassword,
        role: 'helpdesk',
        avatar: 'https://ui-avatars.com/api/?name=Helpdesk+User&background=random'
      });
      console.log('Created helpdesk user:');
      console.log('- Email: helpdesk@example.com');
      console.log('- Password: helpdesk123');
    } else {
      console.log('Helpdesk user already exists');
    }
    
    console.log('MariaDB initialization completed successfully!');
    
  } catch (error) {
    console.error('Error initializing MariaDB:', error);
  } finally {
    await sequelize.close();
    console.log('Closed MariaDB connection.');
  }
}

initializeMariaDB();
