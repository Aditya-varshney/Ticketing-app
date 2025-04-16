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
  user_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  entity_type: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'ticket'
  },
  entity_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    // This will store the ticket_id
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
    type: DataTypes.JSON,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('details');
      if (rawValue) {
        try {
          return typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
        } catch (e) {
          return rawValue;
        }
      }
      return null;
    },
    set(value) {
      if (value) {
        this.setDataValue('details', 
          typeof value === 'string' ? value : JSON.stringify(value)
        );
      } else {
        this.setDataValue('details', null);
      }
    }
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  tableName: 'audit_logs'
});

// Define associations
TicketAudit.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
// Use entity_id as the alias for ticket association
TicketAudit.belongsTo(FormSubmission, { foreignKey: 'entity_id', as: 'ticket', constraints: false });

export default TicketAudit; 