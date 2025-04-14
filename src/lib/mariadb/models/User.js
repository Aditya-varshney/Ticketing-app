import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../connect';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING(36),
    defaultValue: () => uuidv4(),
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('user', 'helpdesk', 'admin'),
    defaultValue: 'user'
  },
  profile_image: {
    type: DataTypes.STRING,
    defaultValue: '',
    field: 'profile_image'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tableName: 'users'  // Explicitly specify the lowercase table name
});

// Virtual field to maintain compatibility with existing code
User.prototype.getAvatar = function() {
  return this.profile_image;
};

Object.defineProperty(User.prototype, 'avatar', {
  get() {
    return this.profile_image;
  },
  set(value) {
    this.profile_image = value;
  }
});

export default User;
