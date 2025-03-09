const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

async function createUserAndAssignment() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Define models
    const UserSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: String,
      avatar: String,
      createdAt: { type: Date, default: Date.now }
    });
    
    const AssignmentSchema = new mongoose.Schema({
      user: mongoose.Schema.Types.ObjectId,
      helpdesk: mongoose.Schema.Types.ObjectId,
      assignedBy: mongoose.Schema.Types.ObjectId,
      createdAt: { type: Date, default: Date.now }
    });
    
    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Assignment = mongoose.models.Assignment || mongoose.model('Assignment', AssignmentSchema);
    
    // Find or create a regular user
    let regularUser = await User.findOne({ role: 'user' });
    
    if (!regularUser) {
      console.log('No regular user found. Creating one...');
      
      const hashedPassword = await bcrypt.hash('user123', 10);
      
      regularUser = new User({
        name: 'Regular User',
        email: 'user@example.com',
        password: hashedPassword,
        role: 'user',
        avatar: 'https://ui-avatars.com/api/?name=Regular+User&background=random'
      });
      
      await regularUser.save();
      console.log('Created regular user:');
      console.log('- Email: user@example.com');
      console.log('- Password: user123');
    } else {
      console.log(`Found regular user: ${regularUser.email}`);
    }
    
    // Find helpdesk and admin users
    const helpdeskUser = await User.findOne({ email: 'helpdesk@example.com' });
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    
    if (!helpdeskUser) {
      console.error('No helpdesk user found. Please run the init-db script first.');
      return;
    }
    
    if (!adminUser) {
      console.error('No admin user found. Please run the init-db script first.');
      return;
    }
    
    // Check if assignment already exists
    const existingAssignment = await Assignment.findOne({ user: regularUser._id });
    
    if (existingAssignment) {
      console.log('Assignment already exists for this user');
      return;
    }
    
    // Create assignment
    const assignment = new Assignment({
      user: regularUser._id,
      helpdesk: helpdeskUser._id,
      assignedBy: adminUser._id,
      createdAt: new Date()
    });
    
    await assignment.save();
    console.log('Assignment created successfully:');
    console.log(`- User: ${regularUser.name} (${regularUser._id})`);
    console.log(`- Helpdesk: ${helpdeskUser.name} (${helpdeskUser._id})`);
    console.log(`- Assigned by: ${adminUser.name} (${adminUser._id})`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
createUserAndAssignment();
