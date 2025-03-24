'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';

export default function RaiseTicketPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loadingForms, setLoadingForms] = useState(true);

  useEffect(() => {
    // Check if user is authenticated and has the correct role
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    } else if (!loading && user?.role !== 'user') {
      router.replace(`/${user?.role}`);
    }
  }, [loading, isAuthenticated, user, router]);

  useEffect(() => {
    // Fetch available ticket types/form templates
    const fetchTicketTypes = async () => {
      if (!isAuthenticated) return;
      
      try {
        setLoadingForms(true);
        const response = await fetch('/api/forms/templates');
        
        if (!response.ok) {
          throw new Error('Failed to fetch ticket types');
        }
        
        const data = await response.json();
        setTicketTypes(data);
      } catch (error) {
        console.error('Error fetching ticket types:', error);
        
        // Try to get from localStorage as fallback
        try {
          const savedTypes = localStorage.getItem('ticketTypes');
          if (savedTypes) {
            setTicketTypes(JSON.parse(savedTypes));
          }
        } catch (e) {
          console.error('Error loading from localStorage:', e);
        }
      } finally {
        setLoadingForms(false);
      }
    };
    
    fetchTicketTypes();
  }, [isAuthenticated]);

  const handleSelectTemplate = (templateId) => {
    router.push(`/user/raise-ticket/${templateId}`);
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

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {ticketTypes.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-block p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-gray-600 dark:text-gray-300">
                No ticket forms are currently available. Please contact an administrator.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Ticket Type
              </label>
              <select
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                defaultValue=""
              >
                <option value="" disabled>Choose a ticket type...</option>
                {ticketTypes.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
