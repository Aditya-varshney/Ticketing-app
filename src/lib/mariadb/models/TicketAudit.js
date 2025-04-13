import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../connect';
import User from './User';
import FormSubmission from './FormSubmission';

const TicketAudit = sequelize.define('TicketAudit', {
  id: {
    type: DataTypes.STRING(36),
    defaultValue: () => uuidv4(),
    primaryKey: true
  },
  ticket_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: 'form_submissions',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
    // Possible values: created, updated, assigned, status_changed, priority_changed, revoked
  },
  previous_value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  new_value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  tableName: 'ticket_audits'
});

// Define associations
TicketAudit.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
TicketAudit.belongsTo(FormSubmission, { foreignKey: 'ticket_id', as: 'ticket' });

export default TicketAudit; 