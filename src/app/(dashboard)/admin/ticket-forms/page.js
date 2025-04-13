'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';

export default function TicketFormsPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [notification, setNotification] = useState(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [expandedForm, setExpandedForm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Check if user is authenticated and has the correct role
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    } else if (!loading && user?.role !== 'admin') {
      router.replace(`/${user?.role}`);
    }
  }, [loading, isAuthenticated, user, router]);

  useEffect(() => {
    // Fetch form templates from the API
    const fetchTicketTypes = async () => {
      try {
        setLoadingForms(true);
        
        const response = await fetch('/api/forms/templates');
        if (!response.ok) {
          throw new Error('Failed to fetch form templates');
        }
        
        const data = await response.json();
        console.log("Admin dashboard - fetched ticket templates:", data);
        
        // Extract the templates array from the response
        const templates = data.templates || [];
        setTicketTypes(templates);
        
        // Also update localStorage for offline backup
        try {
          localStorage.setItem('ticketTypes', JSON.stringify(templates));
        } catch (e) {
          console.error('Failed to update localStorage:', e);
        }
      } catch (error) {
        console.error('Error loading ticket forms:', error);
        
        // Try to load from localStorage as fallback
        const savedTypes = localStorage.getItem('ticketTypes');
        if (savedTypes) {
          try {
            const parsedTypes = JSON.parse(savedTypes);
            setTicketTypes(Array.isArray(parsedTypes) ? parsedTypes : []);
          } catch (e) {
            console.error('Error parsing localStorage data:', e);
            setTicketTypes([]);
          }
        } else {
          // Ensure ticketTypes is always an array
          setTicketTypes([]);
        }
      } finally {
        setLoadingForms(false);
      }
    };

    if (isAuthenticated && user?.role === 'admin') {
      fetchTicketTypes();
    }
  }, [isAuthenticated, user]);

  const handleCreateForm = () => {
    router.push('/admin/create-ticket?mode=create-type');
  };

  const handleEditForm = (formId) => {
    // Navigate to edit page with the form ID
    router.push(`/admin/create-ticket?mode=edit-type&formId=${formId}`);
  };

  const handleDeleteForm = async (formId) => {
    if (deleteInProgress) return;
    
    if (confirm('Are you sure you want to delete this ticket form? This cannot be undone.')) {
      try {
        setDeleteInProgress(true);
        
        // First check if the form has any submissions
        const checkResponse = await fetch('/api/forms/submissions');
        if (checkResponse.ok) {
          const submissions = await checkResponse.json();
          const hasSubmissions = submissions.some(sub => sub.form_template_id === formId);
          
          if (hasSubmissions) {
            setNotification({
              type: 'error',
              message: 'Cannot delete a form that has submissions. Archive it instead.'
            });
            return;
          }
        }
        
        // Proceed with deletion (no password needed)
        const response = await fetch(`/api/forms/templates?id=${formId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to delete form template');
        }
        
        // Update state with optimistic update
        const updatedTicketTypes = ticketTypes.filter(type => type.id !== formId);
        setTicketTypes(updatedTicketTypes);
        
        // Also update localStorage for offline backup
        try {
          localStorage.setItem('ticketTypes', JSON.stringify(updatedTicketTypes));
        } catch (e) {
          console.error('Failed to update localStorage:', e);
        }
        
        setNotification({
          type: 'success',
          message: 'Form template deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting form template:', error);
        setNotification({
          type: 'error',
          message: error.message || 'Failed to delete form template'
        });
      } finally {
        setDeleteInProgress(false);
        // Clear notification after 5 seconds
        setTimeout(() => {
          setNotification(null);
        }, 5000);
      }
    }
  };

  const toggleForm = (formId) => {
    if (expandedForm === formId) {
      setExpandedForm(null);
    } else {
      setExpandedForm(formId);
    }
  };

  const filteredTicketTypes = Array.isArray(ticketTypes) 
    ? ticketTypes.filter(template => {
        if (!searchQuery) return true;
        
        const query = searchQuery.toLowerCase();
        return (
          template.name?.toLowerCase().includes(query) ||
          template.id?.toLowerCase().includes(query) ||
          (template.fields && JSON.stringify(template.fields).toLowerCase().includes(query))
        );
      })
    : [];

  const totalTemplates = Array.isArray(ticketTypes) ? ticketTypes.length : 0;
  const filteredCount = filteredTicketTypes.length;

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
            <h1 className="text-2xl font-bold mb-2">Ticket Forms</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage your ticket form templates
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => router.back()}
              variant="outline"
            >
              Back to Dashboard
            </Button>
            <Button 
              onClick={handleCreateForm}
              variant="success"
            >
              Create New Form
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

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <input
            type="search"
            className="block w-full p-2.5 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Search ticket forms by name or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => setSearchQuery('')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          )}
        </div>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {searchQuery ? 
            `Showing ${filteredCount} of ${totalTemplates} forms matching "${searchQuery}"` : 
            `Showing all ${totalTemplates} forms`
          }
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {loadingForms ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : Array.isArray(filteredTicketTypes) && filteredTicketTypes.length > 0 ? (
          <div className="space-y-6">
            {filteredTicketTypes.map(form => (
              <div key={form.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div 
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => toggleForm(form.id)}
                >
                  <div className="flex items-center space-x-2">
                    <span className={`transform transition-transform ${expandedForm === form.id ? 'rotate-90' : ''}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                    <h3 className="text-lg font-medium">{form.name}</h3>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditForm(form.id);
                      }}
                      variant="secondary"
                      size="sm"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteForm(form.id);
                      }}
                      variant="danger"
                      size="sm"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                
                {expandedForm === form.id && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium mb-2">Fields:</h4>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden mb-4">
                      <div className="overflow-x-auto max-h-96">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Required</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Options</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                            {Array.isArray(form.fields) && form.fields.length > 0 ? (
                              form.fields.map((field) => (
                                <tr key={field.id}>
                                  <td className="px-4 py-2">{field.name}</td>
                                  <td className="px-4 py-2 capitalize">{field.type}</td>
                                  <td className="px-4 py-2">{field.required ? 'Yes' : 'No'}</td>
                                  <td className="px-4 py-2">
                                    {field.type === 'select' && field.options ? (
                                      <div className="max-w-xs overflow-hidden">
                                        <span className="text-gray-600 dark:text-gray-400 text-sm">
                                          {field.options}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 dark:text-gray-600">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="4" className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                  No fields defined for this form
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button
                        onClick={() => router.push(`/admin/create-ticket?formId=${form.id}`)}
                        variant="primary"
                        size="md"
                        className="flex items-center gap-2 hover:bg-blue-700 dark:hover:bg-blue-800"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Create Ticket Using This Form
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            {searchQuery ? (
              <p className="text-gray-500 dark:text-gray-400">No forms match your search query. Try different keywords.</p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No ticket forms available. Create one to get started.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}