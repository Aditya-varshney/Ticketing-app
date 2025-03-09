import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../connect';
import User from './User';

const Assignment = sequelize.define('Assignment', {
  id: {
    type: DataTypes.STRING(36),
    defaultValue: () => uuidv4(),
    primaryKey: true
  },
  user_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    unique: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  helpdesk_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  assigned_by: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tableName: 'assignments'  // Explicitly specify the lowercase table name
});

// Define associations
Assignment.belongsTo(User, { as: 'user', foreignKey: 'user_id' });
Assignment.belongsTo(User, { as: 'helpdesk', foreignKey: 'helpdesk_id' });
Assignment.belongsTo(User, { as: 'admin', foreignKey: 'assigned_by' });

export default Assignment;
