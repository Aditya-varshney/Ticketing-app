'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import FormField from '@/components/forms/FormField';
import '@/styles/hover-effects.css';

export default function RaiseTicketPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [hoveredTemplate, setHoveredTemplate] = useState(null);
  const [hoveredPreview, setHoveredPreview] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketTemplates, setTicketTemplates] = useState([]);
  
  // Reference for tracking dropdowns
  const dropdownRefs = useRef({});

  useEffect(() => {
    // Check if user is authenticated and has the correct role
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    } else if (!loading && user?.role !== 'user') {
      router.replace(`/${user?.role}`);
    }
  }, [loading, isAuthenticated, user, router]);

  useEffect(() => {
    const fetchTicketTypes = async () => {
      try {
        setLoadingForms(true);
        const response = await fetch('/api/forms/templates');
        
        if (response.ok) {
          const data = await response.json();
          // Store the templates in state for filtering
          const templates = data.templates || [];
          setTicketTemplates(templates);
        } else {
          console.error("Failed to fetch ticket templates");
          // Set fallback templates
          setTicketTemplates([]);
        }
      } catch (error) {
        console.error("Error fetching ticket templates:", error);
        setTicketTemplates([]);
      } finally {
        setLoadingForms(false);
      }
    };
    
    if (isAuthenticated) {
    fetchTicketTypes();
    }
  }, [isAuthenticated]);

  // Initialize form data for each template
  useEffect(() => {
    if (ticketTypes.length > 0) {
      const initialFormData = {};
      ticketTypes.forEach(template => {
        if (template.fields && Array.isArray(template.fields)) {
          const templateData = {};
          template.fields.forEach(field => {
            templateData[field.id] = field.default_value || '';
          });
          initialFormData[template.id] = templateData;
        }
      });
      setFormData(initialFormData);
    }
  }, [ticketTypes]);

  const handleSelectTemplate = (templateId) => {
    // Navigate to the dedicated form page for this template
    router.push(`/user/raise-ticket/${templateId}`);
  };

  const handleChange = (templateId, fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        [fieldId]: value
      }
    }));
  };

  const handleSubmit = async (templateId) => {
    if (!templateId || !formData[templateId]) return;
    
    try {
      setSubmitting(true);
      
      // Check required fields
      const template = ticketTypes.find(t => t.id === templateId);
      const requiredFields = template.fields.filter(field => field.required);
      
      for (const field of requiredFields) {
        if (!formData[templateId][field.id]) {
          setNotification({
            type: 'error',
            message: `Please fill in the required field: ${field.name}`
          });
          return;
        }
      }
      
      const response = await fetch('/api/forms/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_id: templateId,
          form_data: formData[templateId]
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit ticket');
      }
      
      // Redirect to user dashboard with success message
      router.push('/user?ticketSubmitted=true');
    } catch (error) {
      console.error('Error submitting ticket:', error);
      setNotification({
        type: 'error',
        message: 'Failed to submit ticket. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClickOutside = (e) => {
    if (hoveredTemplate && dropdownRefs.current[hoveredTemplate] && 
        !dropdownRefs.current[hoveredTemplate].contains(e.target)) {
      setHoveredTemplate(null);
    }
  };

  // Add event listener for clicking outside
  useEffect(() => {
    if (hoveredTemplate) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [hoveredTemplate]);

  // Add a function to filter templates based on search query
  const filteredTemplates = searchQuery.trim() === '' 
    ? ticketTemplates 
    : ticketTemplates.filter(template => {
        const query = searchQuery.toLowerCase();
        return (
          template.name?.toLowerCase().includes(query) ||
          template.description?.toLowerCase().includes(query) ||
          // Search in fields if they exist
          (template.fields && template.fields.some(field => 
            field.label?.toLowerCase().includes(query) ||
            field.description?.toLowerCase().includes(query)
          ))
        );
      });

  if (loading || loadingForms) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Raise a Support Ticket</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Select the type of issue you're experiencing
            </p>
          </div>
          <div>
            <Button 
              onClick={() => router.push('/user')}
              variant="outline"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`mb-6 p-4 rounded-md ${
          notification.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' 
            : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
            </svg>
          </div>
          <input
            type="search"
            className="block w-full p-4 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Search for ticket templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          )}
        </div>
        
        {/* Show search result count */}
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {searchQuery ? 
            `Found ${filteredTemplates.length} of ${ticketTemplates.length} templates matching "${searchQuery}"` : 
            `Showing all ${ticketTemplates.length} available templates`
          }
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Available Ticket Types</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Hover over a ticket type to preview fields, then click to fill out the form.
        </p>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mt-4"></div>
              </div>
            ))}
          </div>
        ) : filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="relative group">
                <div 
                  className={`p-4 border rounded-lg transition-all duration-300 hover:shadow-md cursor-pointer
                    ${hoveredPreview === template.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'}
                    flex flex-col hover:-translate-y-1
                  `}
                  onClick={() => handleSelectTemplate(template.id)}
                  onMouseEnter={() => setHoveredPreview(template.id)}
                  onMouseLeave={() => setHoveredPreview(null)}
                >
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3 transform group-hover:scale-110 transition-transform duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{template.fields?.length || 0} fields</p>
                    </div>
                  </div>
                  
                  {/* Field preview on hover */}
                  {hoveredPreview === template.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 animate-fadeIn">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Form fields:</p>
                      <div className="space-y-1">
                        {Array.isArray(template.fields) && template.fields.slice(0, 3).map(field => (
                          <div key={field.id} className="flex items-center">
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${field.required ? 'bg-red-500' : 'bg-green-500'}`}></span>
                            <span className="text-sm truncate">{field.name}</span>
                          </div>
                        ))}
                        {template.fields?.length > 3 && (
                          <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                            + {template.fields.length - 3} more fields
                          </div>
                        )}
                      </div>
                      <div className="text-center mt-3">
                        <span className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                          Click to open form page
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {hoveredTemplate !== template.id && !hoveredPreview && (
                    <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                      Hover to preview • Click to open form
                    </div>
                  )}
                  
                  {/* Add a "Go to form" indicator at the bottom */}
                  <div className="mt-2 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <span className="mr-1">Open form</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
            </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-200">No templates found</h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              No ticket templates match your search criteria. Try a different search term.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear search
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
