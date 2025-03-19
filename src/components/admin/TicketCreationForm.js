'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function TicketCreationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = searchParams.get('formId');
  const mode = searchParams.get('mode');
  const isEditMode = mode === 'edit-type';
  const initialMode = mode === 'create-type' || mode === 'edit-type' ? 'create-type' : 'create-ticket';
  
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
    priority: 'medium',
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
    required: false
  });

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
    setTicketData(prev => ({
      ...prev,
      ticketType: typeId,
      fields: {} // Reset fields when changing ticket type
    }));
  };

  // Handle changes to field values in the ticket form
  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    if (name === 'priority') {
      setTicketData(prev => ({ ...prev, priority: value }));
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

  // Add a field to the new ticket type being created
  const handleAddField = () => {
    if (!newField.name) {
      setNotification({
        type: 'error',
        message: 'Field Name is required'
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
      required: false
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

  // Load ticket types and if in edit mode, populate the form with existing data
  useEffect(() => {
    try {
      // First load all ticket types
      const loadTicketTypes = async () => {
        try {
          // Try to load from API first
          const response = await fetch('/api/forms/templates');
          if (response.ok) {
            const data = await response.json();
            setTicketTypes(data);
            // Also update localStorage
            localStorage.setItem('ticketTypes', JSON.stringify(data));
            return data;
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

  // Save the new ticket type or update existing one
  const handleSaveTicketType = async () => {
    if (!newTicketType.name || newTicketType.fields.length === 0) {
      setNotification({
        type: 'error',
        message: 'Ticket Type Name and at least one field are required'
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
      
      // Save to backend API
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTicketType.name,
          fields: newTicketType.fields
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
          type.id === newTicketType.id ? { ...newTicketType } : type
        );
      } else {
        // Add new template
        const typeId = responseData.template?.id || generateUniqueId(newTicketType.name, ticketTypes.map(t => t.id), '-');
        updatedTicketTypes = [...ticketTypes, { ...newTicketType, id: typeId }];
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
    
    const selectedType = ticketTypes.find(type => type.id === selectedTicketType);
    if (!selectedType) {
      setNotification({
        type: 'error',
        message: 'Please select a ticket type'
      });
      return;
    }
    
    // Validate required fields
    const missingFields = selectedType.fields
      .filter(field => field.required && !ticketData.fields[field.id])
      .map(field => field.name);
      
    if (missingFields.length > 0) {
      setNotification({
        type: 'error',
        message: `Please fill in required fields: ${missingFields.join(', ')}`
      });
      return;
    }
    
    setSubmitting(true);
    
    try {
      // This API endpoint will need to be implemented later
      // const response = await fetch('/api/tickets', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(ticketData),
      // });
      
      console.log('Ticket would be created with:', ticketData);
      
      setNotification({
        type: 'success',
        message: 'Ticket created successfully!'
      });
      
      // Reset form
      setTicketData({
        ticketType: '',
        priority: 'medium',
        fields: {}
      });
      setSelectedTicketType('');
      
    } catch (error) {
      console.error('Error creating ticket:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to create ticket'
      });
    } finally {
      setSubmitting(false);
      
      // Clear notification after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);
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
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {notification.message}
        </div>
      )}

      {formMode === 'create-ticket' ? (
        // Ticket creation form
        <div>
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-lg font-medium">Create New Ticket</h2>
            <Button 
              type="button" 
              variant="secondary" 
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

            {selectedTicketType && (
              <>
                {/* Dynamic fields based on selected ticket type */}
                {ticketTypes
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
                  ))}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={ticketData.priority}
                    onChange={handleFieldChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </>
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
                disabled={submitting || !selectedTicketType}
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
            {isEditMode ? 'Edit Ticket Type' : 'Define New Ticket Type'}
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ticket Type Name *
              </label>
              <input
                type="text"
                name="name"
                value={newTicketType.name}
                onChange={handleNewTicketTypeChange}
                placeholder="LAN Issue"
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
                      name="type"
                      value={newField.type}
                      onChange={handleNewFieldChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="email">Email</option>
                      <option value="date">Date</option>
                      <option value="textarea">Text Area</option>
                    </select>
                  </div>
                  
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
        </div>
      )}
    </div>
  );
}
