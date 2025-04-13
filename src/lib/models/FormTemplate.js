const FormTemplate = sequelize.define('FormTemplate', {
  // ... your existing fields
}, {
  tableName: 'form_templates',
  underscored: true, // This tells Sequelize to use snake_case in the database
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
}); 