'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';

export default function AdminTicketDetailsPage({ params }) {
  const ticketId = params.id;
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [ticket, setTicket] = useState(null);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notification, setNotification] = useState(null);
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('open');
  
  useEffect(() => {
    // Check if user is authenticated and has the correct role
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    } else if (!loading && user?.role !== 'admin') {
      router.replace(`/${user?.role}`);
    }
  }, [loading, isAuthenticated, user, router]);
  
  useEffect(() => {
    // Fetch ticket details
    const fetchTicket = async () => {
      if (!isAuthenticated || !ticketId) return;
      
      try {
        setLoadingTicket(true);
        const response = await fetch(`/api/forms/submissions?id=${ticketId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch ticket details');
        }
        
        const data = await response.json();
        setTicket(data);
        setPriority(data.priority || 'medium');
        setStatus(data.status || 'open');
      } catch (error) {
        console.error('Error fetching ticket:', error);
        setNotification({
          type: 'error',
          message: 'Could not load ticket details. Please try again later.'
        });
      } finally {
        setLoadingTicket(false);
      }
    };
    
    fetchTicket();
  }, [isAuthenticated, ticketId]);
  
  const handleUpdateTicket = async () => {
    try {
      setUpdating(true);
      
      const response = await fetch(`/api/forms/submissions?id=${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priority,
          status
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update ticket');
      }
      
      setNotification({
        type: 'success',
        message: 'Ticket updated successfully'
      });
      
      // Refresh the ticket data
      const updatedTicketResponse = await fetch(`/api/forms/submissions?id=${ticketId}`);
      if (updatedTicketResponse.ok) {
        const updatedTicket = await updatedTicketResponse.json();
        setTicket(updatedTicket);
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to update ticket'
      });
    } finally {
      setUpdating(false);
      
      // Clear notification after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };
  
  if (loading || loadingTicket) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!ticket) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Ticket Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            The requested ticket could not be found.
          </p>
          <Button onClick={() => router.push('/admin/tickets')}>
            Back to Tickets
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
            <h1 className="text-2xl font-bold mb-2">Ticket Details</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Ticket ID: {ticket.id}
            </p>
          </div>
          <div>
            <Button 
              onClick={() => router.push('/admin/tickets')}
              variant="outline"
            >
              Back to All Tickets
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {ticket.template?.name || 'Ticket Information'}
            </h2>
            
            {notification && (
              <div className={`mb-6 p-4 rounded-md ${
                notification.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {notification.message}
              </div>
            )}
            
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <dl className="divide-y divide-gray-200 dark:divide-gray-700">
                {ticket.form_data && Object.entries(ticket.form_data).map(([key, value]) => (
                  <div key={key} className="py-3 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {key}
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-white col-span-2">
                      {typeof value === 'string' && (value.length > 100 || value.includes('\n')) ? (
                        <div className="whitespace-pre-wrap">{value}</div>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">User Information</h2>
            <dl className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="py-3 grid grid-cols-3">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</dt>
                <dd className="text-sm text-gray-900 dark:text-white col-span-2">
                  {ticket.submitter?.name || 'Unknown'}
                </dd>
              </div>
              <div className="py-3 grid grid-cols-3">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                <dd className="text-sm text-gray-900 dark:text-white col-span-2">
                  {ticket.submitter?.email || 'Unknown'}
                </dd>
              </div>
              <div className="py-3 grid grid-cols-3">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Submitted On</dt>
                <dd className="text-sm text-gray-900 dark:text-white col-span-2">
                  {new Date(ticket.created_at).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Ticket Management</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="pending">Pending Review</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            
            <Button
              onClick={handleUpdateTicket}
              className="w-full"
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Update Ticket'}
            </Button>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-medium mb-2">Actions</h3>
              
              <div className="space-y-3">
                <Button
                  onClick={() => router.push(`/chat/${ticket.submitter?.id}`)}
                  variant="secondary"
                  className="w-full"
                >
                  Chat with Submitter
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
