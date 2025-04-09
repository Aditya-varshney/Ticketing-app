import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../connect';
import User from './User';

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.STRING(36),
    defaultValue: () => uuidv4(),
    primaryKey: true
  },
  sender: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  receiver: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  ticket_id: {
    type: DataTypes.STRING(20),
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['sender', 'receiver', 'created_at']
    }
  ],
  tableName: 'messages'  // Explicitly specify the lowercase table name
});

// Associations are defined in models/index.js

export default Message;
