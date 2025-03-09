import sequelize from '../connect';
import User from './User';
import Message from './Message';
import Assignment from './Assignment';

// Define model relationships
User.hasMany(Message, { foreignKey: 'sender', as: 'sentMessages' });
User.hasMany(Message, { foreignKey: 'receiver', as: 'receivedMessages' });

User.hasOne(Assignment, { foreignKey: 'user_id', as: 'userAssignment' });
User.hasMany(Assignment, { foreignKey: 'helpdesk_id', as: 'helpdeskAssignments' });
User.hasMany(Assignment, { foreignKey: 'assigned_by', as: 'createdAssignments' });

// Disable automatic sync to prevent errors
// Uncomment only for initial setup, then comment out again
// if (process.env.NODE_ENV === 'development') {
//   sequelize.sync({ alter: true })
//     .then(() => console.log('Database & tables synchronized'))
//     .catch(err => console.error('Error synchronizing database:', err));
// }

export { sequelize, User, Message, Assignment };
