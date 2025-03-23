import sequelize from '../connect';
import User from './User';
import Message from './Message';
import FormTemplate from './FormTemplate';
import FormSubmission from './FormSubmission';
import TicketAssignment from './TicketAssignment';

// Define model relationships
User.hasMany(Message, { foreignKey: 'sender', as: 'messagesSent' });
User.hasMany(Message, { foreignKey: 'receiver', as: 'receivedMessages' });
Message.belongsTo(User, { foreignKey: 'sender', as: 'senderUser' });
Message.belongsTo(User, { foreignKey: 'receiver', as: 'receiverUser' });

// Form Templates and Submissions
User.hasMany(FormTemplate, { foreignKey: 'created_by', as: 'createdTemplates' });
FormTemplate.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

User.hasMany(FormSubmission, { foreignKey: 'submitted_by', as: 'submissions' });
FormSubmission.belongsTo(User, { foreignKey: 'submitted_by', as: 'submitter' });
FormSubmission.belongsTo(FormTemplate, { foreignKey: 'form_template_id', as: 'template' });

// Ticket Assignment relationships (new model)
FormSubmission.hasOne(TicketAssignment, { foreignKey: 'ticket_id', as: 'assignment' });
TicketAssignment.belongsTo(FormSubmission, { foreignKey: 'ticket_id', as: 'ticket' });
TicketAssignment.belongsTo(User, { foreignKey: 'helpdesk_id', as: 'helpdesk' });
User.hasMany(TicketAssignment, { foreignKey: 'helpdesk_id', as: 'assignedTickets' });

export { sequelize, User, Message, FormTemplate, FormSubmission, TicketAssignment };
