import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../connect';
import User from './User';

const FormTemplate = sequelize.define('FormTemplate', {
  id: {
    type: DataTypes.STRING(36),
    defaultValue: () => uuidv4(),
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  fields: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      try {
        const rawValue = this.getDataValue('fields');
        return rawValue ? JSON.parse(rawValue) : [];
      } catch (error) {
        console.error("Error parsing fields:", error);
        return [];
      }
    },
    set(value) {
      try {
        this.setDataValue('fields', JSON.stringify(value));
      } catch (error) {
        console.error("Error stringifying fields:", error);
        this.setDataValue('fields', '[]');
      }
    }
  },
  created_by: {
    type: DataTypes.STRING(36),
    allowNull: false
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tableName: 'form_templates',
  // Add this to handle JSON fields better
  hooks: {
    beforeValidate: (instance) => {
      // Ensure fields is always valid JSON
      if (instance.fields && typeof instance.fields === 'object') {
        instance.setDataValue('fields', JSON.stringify(instance.fields));
      }
    }
  }
});

// Associations are defined in models/index.js

export default FormTemplate;
