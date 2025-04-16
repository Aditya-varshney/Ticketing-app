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
  sender_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  receiver_id: {
    type: DataTypes.STRING(36),
    allowNull: true,
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
    type: DataTypes.STRING(36),
    allowNull: true
  },
  attachment_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  attachment_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  attachment_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  attachment_size: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['sender_id', 'receiver_id', 'created_at']
    }
  ],
  tableName: 'chat_messages'  // Match the table name from schema.sql
});

export default Message;
