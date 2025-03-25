import React from 'react';

// Helper function to parse options string into array
const parseOptions = (optionsString) => {
  if (!optionsString) return [];
  return optionsString
    .split(',')
    .map(opt => opt.trim())
    .filter(opt => opt !== '');
};

const FormField = ({ field, value, onChange, darkMode = false }) => {
  if (!field) return null;
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    onChange({
      target: {
        name: field.id,
        value: type === 'checkbox' ? checked : value,
        type
      }
    });
  };
  
  const baseInputClasses = `w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
    darkMode ? 'dark:bg-gray-700 dark:border-gray-600 dark:text-white' : ''
  }`;
  
  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          name={field.id}
          value={value || ''}
          onChange={handleChange}
          rows={4}
          className={baseInputClasses}
          required={field.required}
          placeholder={`Enter ${field.name.toLowerCase()}...`}
        />
      );
    
    case 'select':
      const options = parseOptions(field.options);
      console.log(`Rendering select field: ${field.name}`, {
        options,
        rawOptions: field.options
      });
      
      return (
        <select
          name={field.id}
          value={value || ''}
          onChange={handleChange}
          className={baseInputClasses}
          required={field.required}
        >
          <option value="">Select an option</option>
          {options.map((option, idx) => (
            <option key={idx} value={option}>{option}</option>
          ))}
        </select>
      );
    
    case 'checkbox':
      return (
        <div className="flex items-center">
          <input
            type="checkbox"
            name={field.id}
            checked={value || false}
            onChange={handleChange}
            className="h-4 w-4 border rounded mr-2"
            required={field.required}
          />
          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {field.checkboxLabel || 'Yes'}
          </span>
        </div>
      );
    
    default:
      return (
        <input
          type={field.type || 'text'}
          name={field.id}
          value={value || ''}
          onChange={handleChange}
          className={baseInputClasses}
          required={field.required}
          placeholder={`Enter ${field.name.toLowerCase()}...`}
        />
      );
  }
};

export default FormField; 