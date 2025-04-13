'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import FormField from '@/components/FormField';

// Helper function to parse options string into array
const parseOptions = (optionsString) => {
  if (!optionsString) return [];
  return optionsString
    .split(',')
    .map(opt => opt.trim())
    .filter(opt => opt !== '');
};

export default function FillTicketFormPage({ params }) {
  const templateId = params.id;
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [template, setTemplate] = useState(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  
  const [formData, setFormData] = useState({});

  useEffect(() => {
    // Check if user is authenticated and has the correct role
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    } else if (!loading && user?.role !== 'user') {
      router.replace(`/${user?.role}`);
    }
  }, [loading, isAuthenticated, user, router]);

  useEffect(() => {
    // Fetch the form template
    const fetchTemplate = async () => {
      if (!isAuthenticated || !templateId) return;
      
      try {
        setLoadingTemplate(true);
        const response = await fetch(`/api/forms/templates/${templateId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch form template');
        }
        
        const data = await response.json();
        console.log('Template data received:', data);
        
        // Process the template data
        const processedTemplate = data.template || data;
        
        // Ensure fields is always an array
        let templateFields = [];
        
        if (processedTemplate.fields) {
          if (Array.isArray(processedTemplate.fields)) {
            templateFields = processedTemplate.fields;
          } else if (typeof processedTemplate.fields === 'string') {
            try {
              templateFields = JSON.parse(processedTemplate.fields);
            } catch (e) {
              console.error('Error parsing fields JSON:', e);
              templateFields = [];
            }
          }
        }
        
        // Process fields to ensure dropdown options are correctly formatted
        templateFields = templateFields.map(field => {
          if (field.type === 'select' && field.options) {
            // Ensure options is a string
            const options = typeof field.options === 'string' 
              ? field.options 
              : String(field.options);
              
            return {
              ...field,
              options
            };
          }
          return field;
        });
        
        console.log('Processed template fields:', templateFields);
        
        // Set the processed template
        setTemplate({
          ...processedTemplate,
          fields: templateFields
        });
      } catch (error) {
        console.error('Error fetching form template:', error);
        setNotification({
          type: 'error',
          message: 'Could not load the form. Please try again later.'
        });
        
        // Try to get from localStorage as fallback
        try {
          const savedTypes = localStorage.getItem('ticketTypes');
          if (savedTypes) {
            const parsedTypes = JSON.parse(savedTypes);
            const localTemplate = parsedTypes.find(t => t.id === templateId);
            if (localTemplate) {
              // Ensure local template fields is an array too
              if (!localTemplate.fields || !Array.isArray(localTemplate.fields)) {
                if (typeof localTemplate.fields === 'string') {
                  try {
                    localTemplate.fields = JSON.parse(localTemplate.fields);
                  } catch (e) {
                    localTemplate.fields = [];
                  }
                } else {
                  localTemplate.fields = [];
                }
              }
              setTemplate(localTemplate);
            }
          }
        } catch (e) {
          console.error('Error loading from localStorage:', e);
        }
      } finally {
        setLoadingTemplate(false);
      }
    };
    
    fetchTemplate();
  }, [isAuthenticated, templateId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validate required fields
      const missingFields = template.fields
        .filter(field => field.required && !formData[field.id])
        .map(field => field.name);
      
      if (missingFields.length > 0) {
        setNotification({
          type: 'error',
          message: `Please fill in required fields: ${missingFields.join(', ')}`
        });
        return;
      }
      
      setSubmitting(true);
      
      const response = await fetch('/api/forms/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formTemplateId: templateId,
          formData
        }),
      });
      
      // Handle response errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: Failed to submit ticket`);
      }
      
      const result = await response.json();
      
      setNotification({
        type: 'success',
        message: 'Your ticket has been submitted successfully!'
      });
      
      // Reset form
      setFormData({});
      
      // Redirect after short delay
      setTimeout(() => {
        router.push('/user?ticketSubmitted=true');
      }, 2000);
    } catch (error) {
      console.error('Error submitting ticket:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to submit ticket'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loadingTemplate) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Form Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            The requested form could not be found.
          </p>
          <Button onClick={() => router.push('/user/raise-ticket')}>
            Back to Form Selection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">{template.name}</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Please fill out all required fields
            </p>
          </div>
          <div>
            <Button 
              onClick={() => router.push('/user/raise-ticket')}
              variant="outline"
            >
              Back to Form Selection
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {notification && (
          <div className={`mb-6 p-4 rounded-md ${
            notification.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' 
              : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'
          }`}>
            {notification.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {Array.isArray(template.fields) && template.fields.map(field => (
            <div key={field.id} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {field.name} {field.required && <span className="text-red-500">*</span>}
              </label>
              
              <FormField
                field={field}
                value={formData[field.id]}
                onChange={handleChange}
                darkMode={true}
              />
            </div>
          ))}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              className="mr-4"
              onClick={() => router.push('/user/raise-ticket')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

