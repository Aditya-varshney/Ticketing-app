import sequelize from '../connect';
import User from './User';
import Message from './Message';
import Assignment from './Assignment';
import FormTemplate from './FormTemplate';
import FormSubmission from './FormSubmission';

// Define model relationships
User.hasMany(Message, { foreignKey: 'sender', as: 'sentMessages' });
User.hasMany(Message, { foreignKey: 'receiver', as: 'receivedMessages' });

User.hasOne(Assignment, { foreignKey: 'user_id', as: 'userAssignment' });
User.hasMany(Assignment, { foreignKey: 'helpdesk_id', as: 'helpdeskAssignments' });
User.hasMany(Assignment, { foreignKey: 'assigned_by', as: 'createdAssignments' });

// Form relationships
User.hasMany(FormTemplate, { foreignKey: 'created_by', as: 'createdForms' });
User.hasMany(FormSubmission, { foreignKey: 'submitted_by', as: 'submittedForms' });
FormTemplate.hasMany(FormSubmission, { foreignKey: 'form_template_id', as: 'submissions' });

export { sequelize, User, Message, Assignment, FormTemplate, FormSubmission };
