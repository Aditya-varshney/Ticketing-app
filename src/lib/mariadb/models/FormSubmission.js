import { DataTypes } from 'sequelize';
import sequelize from '../connect';
import User from './User';
import FormTemplate from './FormTemplate';

const FormSubmission = sequelize.define('FormSubmission', {
  id: {
    type: DataTypes.STRING(20),
    primaryKey: true
  },
  form_template_id: {
    type: DataTypes.STRING(36),
    allowNull: true,
    references: {
      model: 'form_templates',
      key: 'id'
    }
  },
  submitted_by: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  form_data: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      try {
        const rawValue = this.getDataValue('form_data');
        return rawValue ? JSON.parse(rawValue) : {};
      } catch (error) {
        console.error("Error parsing form_data:", error);
        return {};
      }
    },
    set(value) {
      try {
        if (typeof value === 'string') {
          // Check if it's already a valid JSON string
          JSON.parse(value);
          this.setDataValue('form_data', value);
        } else {
          this.setDataValue('form_data', JSON.stringify(value));
        }
      } catch (error) {
        console.error("Error setting form_data:", error);
        this.setDataValue('form_data', '{}');
      }
    }
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'),
    defaultValue: 'open'
  },
  priority: {
    type: DataTypes.ENUM('pending', 'low', 'medium', 'high', 'urgent'),
    defaultValue: 'pending'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tableName: 'form_submissions',
  hooks: {
    beforeValidate: (instance) => {
      // Ensure form_data is always valid JSON
      if (instance.form_data && typeof instance.form_data === 'object') {
        instance.setDataValue('form_data', JSON.stringify(instance.form_data));
      }
    }
  }
});

// Associations are defined in models/index.js

export default FormSubmission;
