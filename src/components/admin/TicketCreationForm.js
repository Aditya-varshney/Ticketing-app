'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

export default function TicketCreationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = searchParams.get('formId');
  const mode = searchParams.get('mode');
  const isEditMode = mode === 'edit-type';
  const initialMode = mode === 'create-type' || mode === 'edit-type' ? 'create-type' : 'create-ticket';
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Ticket types with their field configurations
  const [ticketTypes, setTicketTypes] = useState([]);
  
  // Selected ticket type
  const [selectedTicketType, setSelectedTicketType] = useState(formId || '');
  
  // Ticket data for form submission
  const [ticketData, setTicketData] = useState({
    ticketType: '',
    fields: {}
  });
  
  // Form mode: 'create-ticket' or 'create-type'
  const [formMode, setFormMode] = useState(initialMode);
  
  // New ticket type being created
  const [newTicketType, setNewTicketType] = useState({
    id: '', // Will be auto-generated
    name: '',
    fields: []
  });
  
  // New field being added to a ticket type
  const [newField, setNewField] = useState({
    id: '', // Will be auto-generated
    name: '',
    type: 'text',
    required: false,
    options: ''
  });

  // Handle custom ticket type input
  const [customTicketType, setCustomTicketType] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  const handleCustomTicketTypeChange = (e) => {
    setCustomTicketType(e.target.value);
  };
  
  const handleToggleCustomInput = () => {
    setShowCustomInput(!showCustomInput);
    if (!showCustomInput) {
      setSelectedTicketType('');
    } else {
      setCustomTicketType('');
    }
  };

  // Generate a unique ID from a name
  const generateUniqueId = (name, existingIds = [], separator = '-') => {
    // Convert name to lowercase and replace spaces/special chars with separator
    let id = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, separator) // Replace non-alphanumeric with separator
      .replace(new RegExp(`^${separator}|${separator}$`, 'g'), ''); // Remove leading/trailing separators
    
    // If ID is empty (e.g., only special chars in name), use a default
    if (!id) {
      id = 'field';
    }
    
    // Check if ID already exists, if so, append a number
    if (existingIds.includes(id)) {
      let counter = 1;
      while (existingIds.includes(`${id}${separator}${counter}`)) {
        counter++;
      }
      id = `${id}${separator}${counter}`;
    }
    
    return id;
  };

  // When ticket type changes, update form fields
  const handleTicketTypeChange = (e) => {
    const typeId = e.target.value;
    setSelectedTicketType(typeId);
    
    // Debug logging
    if (typeId) {
      const selectedType = ticketTypes.find(type => type.id === typeId);
      console.log('Selected ticket type:', selectedType);
      console.log('Fields type:', typeof selectedType?.fields);
      console.log('Is fields an array?', Array.isArray(selectedType?.fields));
      console.log('Fields content:', selectedType?.fields);
    }
    
    setTicketData(prev => ({
      ...prev,
      ticketType: typeId,
      fields: {} // Reset fields when changing ticket type
    }));
  };

  // Handle changes to field values in the ticket form
  const handleFieldChange = (e) => {
    const { name, value, type } = e.target;
    
    // Special handling for dropdown/select values
    if (type === 'select-one') {
      setTicketData(prev => ({
        ...prev,
        fields: {
          ...prev.fields,
          [name]: value
        }
      }));
    } else {
      setTicketData(prev => ({
        ...prev,
        fields: {
          ...prev.fields,
          [name]: value
        }
      }));
    }
  };

  // Switch to create new ticket type mode
  const handleCreateNewTicketType = () => {
    setFormMode('create-type');
    setNewTicketType({
      id: '',
      name: '',
      fields: []
    });
  };

  // Handle new field addition
  const handleAddField = () => {
    if (!newField.name) {
      setNotification({
        type: 'error',
        message: 'Field Name is required'
      });
      return;
    }
    
    // For select type, ensure options are provided
    if (newField.type === 'select' && (!newField.options || newField.options.trim() === '')) {
      setNotification({
        type: 'error',
        message: 'Options are required for dropdown fields'
      });
      return;
    }
    
    // Generate a unique ID for the field
    const existingFieldIds = newTicketType.fields.map(field => field.id);
    const fieldId = generateUniqueId(newField.name, existingFieldIds, '_');
    
    setNewTicketType(prev => ({
      ...prev,
      fields: [...prev.fields, { ...newField, id: fieldId }]
    }));
    
    // Reset new field form
    setNewField({
      id: '',
      name: '',
      type: 'text',
      required: false,
      options: ''
    });
  };

  // Handle changes to the new field form
  const handleNewFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewField(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle changes to the new ticket type form
  const handleNewTicketTypeChange = (e) => {
    const { name, value } = e.target;
    setNewTicketType(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Helper function to parse options string into array
  const parseOptions = (optionsString) => {
    if (!optionsString) return [];
    return optionsString
      .split(',')
      .map(opt => opt.trim())
      .filter(opt => opt !== '');
  };

  // Load ticket types and ensure proper handling of fields
  useEffect(() => {
    try {
      // First load all ticket types
      const loadTicketTypes = async () => {
        try {
          // Try to load from API first
          const response = await fetch('/api/forms/templates');
          if (response.ok) {
            const data = await response.json();
            
            // Process the data to ensure fields are properly handled
            const processedData = data.map(template => {
              // Ensure fields is an array
              let fields = [];
              
              // If fields exists but isn't an array, try to parse it
              if (template.fields) {
                if (Array.isArray(template.fields)) {
                  fields = template.fields;
                } else if (typeof template.fields === 'string') {
                  try {
                    fields = JSON.parse(template.fields);
                  } catch (e) {
                    console.error(`Error parsing fields for template ${template.id}:`, e);
                  }
                } else if (typeof template.fields === 'object') {
                  // If it's already an object but not an array, convert it
                  fields = Object.values(template.fields);
                }
              }
              
              // If fields is still not an array, set it to an empty array
              if (!Array.isArray(fields)) {
                fields = [];
              }
              
              // Ensure dropdown fields have their options properly formatted
              fields = fields.map(field => {
                if (field.type === 'select' && field.options) {
                  return {
                    ...field,
                    parsedOptions: parseOptions(field.options)
                  };
                }
                return field;
              });
              
              return {
                ...template,
                fields
              };
            });
            
            setTicketTypes(processedData);
            // Also update localStorage
            localStorage.setItem('ticketTypes', JSON.stringify(processedData));
            return processedData;
          }
        } catch (e) {
          console.error("Error loading from API:", e);
        }
        
        // Fallback to localStorage if API fails
        const savedTypes = localStorage.getItem('ticketTypes');
        if (savedTypes) {
          return JSON.parse(savedTypes);
        }
        
        // Default if nothing available
        return [
          {
            id: 'lan-issue',
            name: 'LAN Issue',
            fields: [
              { id: 'name', name: 'Name', type: 'text', required: true },
              { id: 'address', name: 'Address', type: 'text', required: true },
              { id: 'rollnum', name: 'Roll Number', type: 'number', required: true },
              { id: 'description', name: 'Description', type: 'textarea', required: true },
              { id: 'since_when', name: 'Since When (days)', type: 'number', required: false }
            ]
          },
          {
            id: 'erp-issue',
            name: 'ERP Login Issue',
            fields: [
              { id: 'name', name: 'Name', type: 'text', required: true },
              { id: 'email', name: 'Email', type: 'email', required: true },
              { id: 'institute_email', name: 'Institute Email', type: 'email', required: true },
              { id: 'rollnum', name: 'Roll Number', type: 'number', required: true },
              { id: 'description', name: 'Description', type: 'textarea', required: true }
            ]
          }
        ];
      };
      
      // Load types and set up form if needed
      const setupForm = async () => {
        const types = await loadTicketTypes();
        setTicketTypes(types);
        
        // If a specific formId is provided and we're in edit mode
        if (formId && isEditMode) {
          const templateToEdit = types.find(t => t.id === formId);
          if (templateToEdit) {
            // Populate form with existing data
            setNewTicketType({
              id: templateToEdit.id,
              name: templateToEdit.name,
              fields: [...templateToEdit.fields] // Clone the fields array
            });
          }
        }
        
        // If we're just selecting a form for ticket creation
        else if (formId && types.some(type => type.id === formId)) {
          setSelectedTicketType(formId);
        }
        
        setLoading(false);
      };
      
      setupForm();
    } catch (error) {
      console.error('Error setting up form:', error);
      setLoading(false);
    }
  }, [formId, isEditMode]);

  // Form submission - ensure fields are properly formatted
  const handleSaveTicketType = async () => {
    if (!newTicketType.name || newTicketType.fields.length === 0) {
      setNotification({
        type: 'error',
        message: 'Ticket Type Name and at least one field are required'
      });
      return;
    }
    
    // Validate dropdown fields have options
    const invalidDropdowns = newTicketType.fields.filter(
      field => field.type === 'select' && (!field.options || field.options.trim() === '')
    );
    
    if (invalidDropdowns.length > 0) {
      setNotification({
        type: 'error',
        message: `The following dropdown fields need options: ${invalidDropdowns.map(f => f.name).join(', ')}`
      });
      return;
    }
    
    setSubmitting(true);
    
    try {
      // If editing, use PUT request, otherwise POST
      const method = isEditMode ? 'PUT' : 'POST';
      const url = isEditMode 
        ? `/api/forms/templates?id=${newTicketType.id}`
        : '/api/forms/templates';
      
      // Process fields to ensure dropdown options are properly formatted
      const processedFields = newTicketType.fields.map(field => {
        if (field.type === 'select') {
          // Ensure options are trimmed and no empty options
          const cleanOptions = field.options
            .split(',')
            .map(opt => opt.trim())
            .filter(opt => opt !== '')
            .join(', ');
            
          return {
            ...field,
            options: cleanOptions
          };
        }
        return field;
      });
      
      // Save to backend API
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTicketType.name,
          fields: processedFields
        }),
      });
      
      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse response as JSON:", responseText);
        throw new Error("Invalid response from server");
      }
      
      if (!response.ok) {
        throw new Error(responseData.message || `Error ${response.status}: Failed to save form template`);
      }
      
      // Update local state
      let updatedTicketTypes;
      
      if (isEditMode) {
        // Replace the edited template
        updatedTicketTypes = ticketTypes.map(type => 
          type.id === newTicketType.id ? { ...newTicketType, fields: processedFields } : type
        );
      } else {
        // Add new template
        const typeId = responseData.template?.id || generateUniqueId(newTicketType.name, ticketTypes.map(t => t.id), '-');
        updatedTicketTypes = [...ticketTypes, { ...newTicketType, id: typeId, fields: processedFields }];
      }
      
      setTicketTypes(updatedTicketTypes);
      
      // Save to localStorage as fallback
      try {
        localStorage.setItem('ticketTypes', JSON.stringify(updatedTicketTypes));
      } catch (e) {
        console.error('Failed to save to localStorage:', e);
      }
      
      setFormMode('create-ticket');
      setNotification({
        type: 'success',
        message: `Ticket type ${isEditMode ? 'updated' : 'created'} successfully`
      });
      
      // If we're in edit mode, go back to the forms list
      if (isEditMode) {
        setTimeout(() => {
          router.push('/admin/ticket-forms');
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving form template:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to save form template'
      });
    } finally {
      setSubmitting(false);
      
      // Clear notification after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };

  // Handle ticket submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If using a custom ticket type, validate it
    if (showCustomInput && !customTicketType) {
      setNotification({
        type: 'error',
        message: 'Please enter a name for the new ticket type'
      });
      return;
    }
    
    // If using a pre-defined ticket type, validate it
    if (!showCustomInput && !selectedTicketType) {
      setNotification({
        type: 'error',
        message: 'Please select a ticket type'
      });
      return;
    }
    
    const selectedType = showCustomInput 
      ? { fields: [] } // Custom type has no predefined fields
      : ticketTypes.find(type => type.id === selectedTicketType);
    
    if (!showCustomInput && !selectedType) {
      setNotification({
        type: 'error',
        message: 'Please select a valid ticket type'
      });
      return;
    }
    
    // Validate required fields for pre-defined types
    if (!showCustomInput) {
      const missingFields = selectedType.fields
        .filter(field => field.required && !ticketData.fields[field.id])
        .map(field => field.name);
        
      if (missingFields.length > 0) {
        setNotification({
          type: 'error',
          message: `Please fill in the following required fields: ${missingFields.join(', ')}`
        });
        return;
      }
    }
    
    setSubmitting(true);
    
    try {
      const formData = ticketData.fields;
      
      // If using custom type, add it to the form data
      if (showCustomInput) {
        formData.ticketTypeName = customTicketType;
      }
      
      const response = await fetch('/api/forms/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formTemplateId: showCustomInput ? 'custom-ticket' : selectedTicketType,
          formData
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error creating ticket');
      }
      
      setNotification({
        type: 'success',
        message: 'Ticket created successfully'
      });
      
      // Reset form
      setTicketData({
        ticketType: '',
        fields: {}
      });
      setSelectedTicketType('');
      setCustomTicketType('');
      setShowCustomInput(false);
      
      // Redirect back to admin dashboard after 1.5 seconds
      setTimeout(() => {
        router.push('/admin');
      }, 1500);
    } catch (error) {
      console.error('Error creating ticket:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to create ticket'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel creating new ticket type and return to ticket creation
  const handleCancelNewTicketType = () => {
    setFormMode('create-ticket');
  };

  // Remove a field from the new ticket type being created
  const handleRemoveField = (fieldId) => {
    setNewTicketType(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }));
  };

  // When component loads, default to create-type mode for admins
  useEffect(() => {
    if (user?.role === 'admin' && !isEditMode && formMode === 'create-ticket') {
      setFormMode('create-type');
    }
  }, [user, isEditMode, formMode]);

  // Modified to allow using an existing template as a base
  const [baseTemplateId, setBaseTemplateId] = useState('');
  
  // Handle selecting a base template
  const handleBaseTemplateChange = (e) => {
    const selectedId = e.target.value;
    setBaseTemplateId(selectedId);
    
    if (selectedId) {
      const selectedTemplate = ticketTypes.find(type => type.id === selectedId);
      if (selectedTemplate) {
        // Copy name and fields from the selected template
        setNewTicketType(prev => ({
          ...prev,
          name: `${selectedTemplate.name} (Copy)`,
          fields: [...selectedTemplate.fields]
        }));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      {notification && (
        <div className={`mb-6 p-4 rounded-md ${
          notification.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' 
            : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'
        }`}>
          {notification.message}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : formMode === 'create-ticket' ? (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium">Create New Support Ticket</h2>
            <Button
              type="button"
              variant="outline"
              onClick={handleCreateNewTicketType}
            >
              Define New Ticket Type
            </Button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ticket Type *
              </label>
              <div className="flex items-center space-x-2 mb-2">
                <Button
                  type="button"
                  size="sm"
                  variant={showCustomInput ? "secondary" : "outline"}
                  onClick={handleToggleCustomInput}
                >
                  {showCustomInput ? "Use Existing Type" : "Create New Type"}
                </Button>
              </div>
              
              {showCustomInput ? (
                <input
                  type="text"
                  value={customTicketType}
                  onChange={handleCustomTicketTypeChange}
                  placeholder="Enter new ticket type name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <select
                    name="ticketType"
                    value={selectedTicketType}
                    onChange={handleTicketTypeChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="">Select Ticket Type</option>
                    {ticketTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {!showCustomInput && selectedTicketType && (
              <>
                {/* Dynamic fields based on selected ticket type */}
                {ticketTypes
                  .find(type => type.id === selectedTicketType)
                  ?.fields && Array.isArray(ticketTypes
                  .find(type => type.id === selectedTicketType)
                  ?.fields) ? (
                  ticketTypes
                  .find(type => type.id === selectedTicketType)
                  ?.fields.map(field => (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {field.name} {field.required && '*'}
                      </label>
                      
                      {field.type === 'textarea' ? (
                        <textarea
                          name={field.id}
                          value={ticketData.fields[field.id] || ''}
                          onChange={handleFieldChange}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          required={field.required}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          name={field.id}
                          value={ticketData.fields[field.id] || ''}
                          onChange={handleFieldChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          required={field.required}
                        >
                          <option value="">Select an option</option>
                          {field.options && parseOptions(field.options).map((option, idx) => (
                            <option key={idx} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          name={field.id}
                          value={ticketData.fields[field.id] || ''}
                          onChange={handleFieldChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          required={field.required}
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md">
                    <p>There was an issue loading the fields for this form. Please try a different form or contact an administrator.</p>
                  </div>
                )}
              </>
            )}
            
            {showCustomInput && customTicketType && (
              <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-md dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400">
                <p>Creating a new ticket with type: <strong>{customTicketType}</strong></p>
                <p className="text-sm mt-1">Note: This will create a simple ticket without predefined fields.</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                className="mr-4"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || (!selectedTicketType && !customTicketType)}
              >
                {submitting ? 'Creating...' : 'Create Ticket'}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        // Ticket type creation/editing form
        <div>
          <h2 className="text-lg font-medium mb-6">
            {isEditMode ? 'Edit Ticket Type' : 'Create New Ticket Type'}
          </h2>
          
          <div className="space-y-6">
            {!isEditMode && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Base Template (Optional)
                </label>
                <select
                  value={baseTemplateId}
                  onChange={handleBaseTemplateChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Create from scratch</option>
                  {ticketTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Select an existing template to use as a starting point, or start from scratch.
                </p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ticket Type Name *
              </label>
              <input
                type="text"
                name="name"
                value={newTicketType.name}
                onChange={handleNewTicketTypeChange}
                placeholder="Enter ticket type name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-md font-medium mb-4">Define Fields</h3>
              
              {/* Add field form */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Field Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={newField.name}
                      onChange={handleNewFieldChange}
                      placeholder="Name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Field Type
                    </label>
                    <select
                      id="field-type"
                      name="type"
                      value={newField.type}
                      onChange={handleNewFieldChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="text">Text</option>
                      <option value="textarea">Text Area</option>
                      <option value="number">Number</option>
                      <option value="email">Email</option>
                      <option value="tel">Phone</option>
                      <option value="date">Date</option>
                      <option value="select">Dropdown</option>
                    </select>
                  </div>
                  
                  {/* Show options input only for select/dropdown type fields */}
                  {newField.type === 'select' && (
                    <div className="mb-4">
                      <label htmlFor="field-options" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Options (comma separated)
                      </label>
                      <input
                        type="text"
                        id="field-options"
                        name="options"
                        value={newField.options || ''}
                        onChange={handleNewFieldChange}
                        placeholder="Option 1, Option 2, Option 3"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-end">
                    <div className="flex items-center h-10">
                      <input
                        type="checkbox"
                        name="required"
                        id="required"
                        checked={newField.required}
                        onChange={handleNewFieldChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="required" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Required
                      </label>
                    </div>
                    
                    <Button
                      type="button"
                      onClick={handleAddField}
                      className="ml-auto"
                      size="sm"
                    >
                      Add Field
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Field list */}
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-2">Current Fields:</h4>
                {newTicketType.fields.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">No fields added yet</p>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Type</th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Required</th>
                          <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                        {newTicketType.fields.map((field) => (
                          <tr key={field.id}>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{field.name}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{field.type}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                              {field.required ? 'Yes' : 'No'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveField(field.id)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                className="mr-4"
                onClick={() => isEditMode ? router.push('/admin/ticket-forms') : handleCancelNewTicketType()}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveTicketType}
                disabled={!newTicketType.name || newTicketType.fields.length === 0}
              >
                {isEditMode ? 'Update Ticket Type' : 'Save Ticket Type'}
              </Button>
            </div>
          </div>

          <div className="my-8">
            <h3 className="text-lg font-medium mb-6">Preview</h3>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
                <h4 className="text-base font-semibold">{newTicketType.name || 'New Form Template'}</h4>
              </div>
              <div className="p-4 space-y-6">
                {newTicketType.fields.map(field => (
                  <div key={field.id} className="relative">
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {field.name}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    
                    {field.type === 'select' ? (
                      <select
                        name={field.id}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required={field.required}
                        disabled
                      >
                        <option value="" disabled selected>Select an option</option>
                        {parseOptions(field.options).map((option, i) => (
                          <option key={i} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        name={field.id}
                        rows="3"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required={field.required}
                        disabled
                      />
                    ) : (
                      <input
                        type={field.type}
                        name={field.id}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required={field.required}
                        disabled
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
