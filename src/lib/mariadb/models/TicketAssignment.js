import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../connect';
import User from './User';
import FormSubmission from './FormSubmission';

const TicketAssignment = sequelize.define('TicketAssignment', {
  id: {
    type: DataTypes.STRING(36),
    defaultValue: () => uuidv4(),
    primaryKey: true
  },
  ticket_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    unique: true,
    references: {
      model: 'form_submissions',
      key: 'id'
    }
  },
  helpdesk_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assigned_by: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assigned_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false,
  tableName: 'ticket_assignments'
});

export default TicketAssignment; 