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
        setTicketTypes(data);
        
        // Also update localStorage for offline backup
        try {
          localStorage.setItem('ticketTypes', JSON.stringify(data));
        } catch (e) {
          console.error('Failed to update localStorage:', e);
        }
      } catch (error) {
        console.error('Error loading ticket forms:', error);
        
        // Try to load from localStorage as fallback
        const savedTypes = localStorage.getItem('ticketTypes');
        if (savedTypes) {
          setTicketTypes(JSON.parse(savedTypes));
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
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {ticketTypes.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-block p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                No ticket forms have been created yet.
              </p>
              <Button 
                onClick={handleCreateForm}
                variant="primary"
              >
                Create Your First Form
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {ticketTypes.map(form => (
              <div key={form.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">{form.name}</h3>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleEditForm(form.id)}
                      variant="secondary"
                      size="sm"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteForm(form.id)}
                      variant="danger"
                      size="sm"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2">Fields:</h4>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                    <div className="overflow-x-auto max-h-96">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                          <tr>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-1/3">Name</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-1/3">Type</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-1/3">Required</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                          {form.fields && Array.isArray(form.fields) ? form.fields.map((field) => (
                            <tr key={field.id}>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white break-words">{field.name}</td>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{field.type}</td>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                {field.required ? 'Yes' : 'No'}
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan="3" className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                                Fields data not available or in incorrect format
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-2">Form Preview:</h4>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-gray-50 dark:bg-gray-900">
                    {form.fields && Array.isArray(form.fields) ? form.fields.map((field) => (
                      <div key={field.id} className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {field.name} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        
                        {field.type === 'textarea' ? (
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            rows="3"
                            readOnly
                            placeholder={`${field.name} field`}
                          />
                        ) : (
                          <input
                            type={field.type}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            readOnly
                            placeholder={`${field.name} field`}
                          />
                        )}
                      </div>
                    )) : (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                        No fields available to preview
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button
                    onClick={() => router.push(`/admin/create-ticket?formId=${form.id}`)}
                    variant="primary"
                    size="md"
                    className="w-full"
                  >
                    Create Ticket Using This Form
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
