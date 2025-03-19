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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ticketTypes.map(template => (
              <div 
                key={template.id} 
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                onClick={() => handleSelectTemplate(template.id)}
              >
                <h3 className="text-xl font-medium mb-3">{template.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Click to fill this form and submit your request
                </p>
                <div className="mt-6">
                  <Button 
                    className="w-full py-3 text-base font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectTemplate(template.id);
                    }}
                  >
                    Fill Form
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
