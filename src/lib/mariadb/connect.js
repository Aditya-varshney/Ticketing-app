import { Sequelize } from 'sequelize';

// Force mysql2 to be loaded (this prevents the installation error)
let sequelize;

if (typeof window === 'undefined') {
  // Only run on server-side
  try {
    // Use dynamic import to prevent Next.js from trying to bundle mysql2
    sequelize = new Sequelize(
      process.env.MYSQL_DATABASE || 'ticketing',
      process.env.MYSQL_USER || 'ticketing_app',
      process.env.MYSQL_PASSWORD || 'secure_password',
      {
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT || 3306,
        dialect: 'mysql',
        dialectModule: require('mysql2'), // Explicitly provide the module
        dialectOptions: {
          // Prevent SQLite from being loaded
          supportBigNumbers: true,
          bigNumberStrings: true
        },
        ssl: false,
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        // Prevent SQLite from being loaded
        define: {
          timestamps: true,
          underscored: true
        }
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

// Database connection function
export const connectToDatabase = async () => {
  try {
    if (sequelize) {
      // If the connection is already established, test it
      try {
        await sequelize.authenticate();
        console.log('Using existing database connection');
        return sequelize;
      } catch (error) {
        console.error('Existing database connection failed, creating new connection:', error.message);
        // If the test fails, close it and create a new one
        try {
          await sequelize.close();
        } catch (closeError) {
          console.error('Error closing failed connection:', closeError.message);
        }
      }
    }
    
    console.log('Creating new database connection');
    const host = process.env.MYSQL_HOST || 'localhost';
    const user = process.env.MYSQL_USER || 'ticketing_app';
    const password = process.env.MYSQL_PASSWORD || 'secure_password';
    const database = process.env.MYSQL_DATABASE || 'ticketing';
    const port = parseInt(process.env.MYSQL_PORT || '3306', 10);
    
    // Print configuration for debugging (without password)
    console.log(`DB Config - Host: ${host}, User: ${user}, Database: ${database}, Port: ${port}`);
    
    // Create a new Sequelize instance
    sequelize = new Sequelize(database, user, password, {
      host,
      port,
      dialect: 'mysql',
      dialectModule: require('mysql2'),
      dialectOptions: {
        timezone: 'Etc/GMT0',
        connectTimeout: 10000 // 10 seconds
      },
      logging: false, // Disable logging in production and development
      pool: {
        max: 15, // Increase from 10 to 15
        min: 2, // Increase from 0 to 2 to keep connections ready
        acquire: 15000, // Reduce from 30000 to 15000
        idle: 5000 // Reduce from 10000 to 5000
      }
    });
    
    // Test the connection
    await sequelize.authenticate();
    console.log('Database connection established successfully');
    
    return sequelize;
  } catch (error) {
    console.error('Database connection error:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Log specific MariaDB errors
    if (error.name === 'SequelizeConnectionError') {
      console.error('Connection details error. Check host, username, password and database name.');
    } else if (error.name === 'SequelizeHostNotFoundError') {
      console.error('Host not found. Check hostname and port.');
    } else if (error.name === 'SequelizeAccessDeniedError') {
      console.error('Access denied. Check username and password.');
    }
    
    throw error;
  }
};

// Export the sequelize instance for model definition
export default sequelize;
