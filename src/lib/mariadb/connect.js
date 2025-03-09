import { Sequelize } from 'sequelize';

// Force mysql2 to be loaded (this prevents the installation error)
let sequelize;

if (typeof window === 'undefined') {
  // Only run on server-side
  try {
    // Use dynamic import to prevent Next.js from trying to bundle mysql2
    sequelize = new Sequelize(
      process.env.MARIADB_DATABASE || 'ticketing',
      process.env.MARIADB_USER || 'ticketing_app',
      process.env.MARIADB_PASSWORD || 'secure_password',
      {
        host: process.env.MARIADB_HOST || 'localhost',
        dialect: 'mysql',
        dialectModule: require('mysql2'), // Explicitly provide the module
        ssl: false,
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
      }
    );
  } catch (error) {
    console.error('Error initializing Sequelize:', error);
    throw error;
  }
} else {
  // Client-side stub
  console.warn('Attempted to use Sequelize on the client side');
  sequelize = null;
}

// Create a connection function that can be reused
export async function connectToDatabase() {
  if (!sequelize) {
    throw new Error('Sequelize is not initialized');
  }
  
  try {
    await sequelize.authenticate();
    console.log('MariaDB connection established successfully.');
    return sequelize;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
}

// Export the sequelize instance for model definition
export default sequelize;
