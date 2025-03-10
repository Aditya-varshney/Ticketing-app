const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '.env.local' });

// MongoDB connection string from .env.local
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

// Define User schema (simplified version)
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  avatar: String,
  createdAt: { type: Date, default: Date.now }
});

async function initializeDatabase() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB!');
    
    // Create User model
    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists.');
      
      // Update role to admin if not already
      if (existingAdmin.role !== 'admin') {
        await User.updateOne(
          { email: 'admin@example.com' },
          { $set: { role: 'admin' } }
        );
        console.log('Updated existing user to admin role.');
      }
    } else {
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const adminUser = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=random'
      });
      
      await adminUser.save();
      console.log('Created new admin user:');
      console.log('- Email: admin@example.com');
      console.log('- Password: admin123');
    }
    
    // Create a helpdesk user if it doesn't exist
    const existingHelpdesk = await User.findOne({ email: 'helpdesk@example.com' });
    
    if (!existingHelpdesk) {
      const hashedPassword = await bcrypt.hash('helpdesk123', 10);
      
      const helpdeskUser = new User({
        name: 'Helpdesk User',
        email: 'helpdesk@example.com',
        password: hashedPassword,
        role: 'helpdesk',
        avatar: 'https://ui-avatars.com/api/?name=Helpdesk+User&background=random'
      });
      
      await helpdeskUser.save();
      console.log('Created helpdesk user:');
      console.log('- Email: helpdesk@example.com');
      console.log('- Password: helpdesk123');
    } else {
      console.log('Helpdesk user already exists.');
      
      if (existingHelpdesk.role !== 'helpdesk') {
        await User.updateOne(
          { email: 'helpdesk@example.com' },
          { $set: { role: 'helpdesk' } }
        );
        console.log('Updated existing user to helpdesk role.');
      }
    }
    
    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Database initialization error:', error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

// Run the initialization
initializeDatabase();
