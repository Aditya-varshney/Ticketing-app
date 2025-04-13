'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';

export default function HelpdeskDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [allTickets, setAllTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'assigned'
  const [notification, setNotification] = useState(null);
  const [assigning, setAssigning] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  useEffect(() => {
    // Check if user is authenticated and has the correct role
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    } else if (!loading && user?.role !== 'helpdesk') {
      router.replace(`/${user?.role}`);
    }
  }, [loading, isAuthenticated, user, router]);

  // Fetch all tickets
  const fetchTickets = async () => {
    if (!isAuthenticated || !user?.id) return;
    
    try {
      setLoadingTickets(true);
      const response = await fetch('/api/helpdesk/tickets', {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response from tickets API:", errorText);
        console.error("Status code:", response.status);
        throw new Error(`Failed to fetch tickets: ${response.status} - ${errorText.substring(0, 100)}`);
      } else {
        const tickets = await response.json();
        console.log("Tickets fetched:", tickets.length);
        setAllTickets(tickets);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchTickets();
    }
  }, [isAuthenticated, user]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Add function to handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if already sorting by this field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field with default direction
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Handle self-assignment of a ticket
  const handleSelfAssign = async (ticketId) => {
    try {
      setAssigning(true);
      
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: ticketId,
          selfAssign: true
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      
      // Refresh the ticket list
      await fetchTickets();
      
      setNotification({
        type: 'success',
        message: 'Ticket successfully assigned to you'
      });
      
    } catch (error) {
      console.error('Error self-assigning ticket:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to assign ticket'
      });
    } finally {
      setAssigning(false);
      
      // Clear notification after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };
  
  // Filter tickets based on active tab
  const getFilteredTickets = () => {
    let filtered = [...allTickets];
    
    if (activeTab === 'assigned') {
      filtered = filtered.filter(ticket => 
        ticket.assignment && ticket.assignment.helpdesk_id === user.id
      );
    }
    
    return filtered;
  };
  
  // Sort the tickets based on current sort settings
  const getSortedTickets = () => {
    return getFilteredTickets().sort((a, b) => {
      let compareResult = 0;
      
      switch (sortField) {
        case 'type':
          compareResult = (a.template?.name || '').localeCompare(b.template?.name || '');
          break;
          
        case 'created_at':
          compareResult = new Date(a.created_at) - new Date(b.created_at);
          break;
          
        case 'priority':
          const priorityOrder = { pending: 0, low: 1, medium: 2, high: 3, urgent: 4 };
          compareResult = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
          break;
          
        case 'status':
          const statusOrder = { open: 0, in_progress: 1, resolved: 2, closed: 3 };
          compareResult = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
          break;
          
        default:
          compareResult = 0;
      }
      
      return sortDirection === 'asc' ? compareResult : -compareResult;
    });
  };

  if (loading || loadingTickets) {
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
            <h1 className="text-2xl font-bold mb-2">Helpdesk Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Welcome back, {user?.name}!
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Removed logout button */}
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

      <div className="grid grid-cols-1 gap-6">
        {/* Tabs Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              className={`px-6 py-3 text-md font-medium ${
                activeTab === 'all'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('all')}
            >
              All Tickets
            </button>
            <button
              className={`px-6 py-3 text-md font-medium ${
                activeTab === 'assigned'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('assigned')}
            >
              My Assigned Tickets
            </button>
          </div>
        
          {/* Ticket List Section */}
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {activeTab === 'assigned' ? 'My Assigned Tickets' : 'All Tickets'}
              </h2>
              
              {/* Add sorting options */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => handleSort('type')}
                    className={`px-2 py-1 text-xs rounded-md ${
                      sortField === 'type' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Type
                    {sortField === 'type' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={() => handleSort('created_at')}
                    className={`px-2 py-1 text-xs rounded-md ${
                      sortField === 'created_at' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Date
                    {sortField === 'created_at' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={() => handleSort('priority')}
                    className={`px-2 py-1 text-xs rounded-md ${
                      sortField === 'priority' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Priority
                    {sortField === 'priority' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={() => handleSort('status')}
                    className={`px-2 py-1 text-xs rounded-md ${
                      sortField === 'status' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Status
                    {sortField === 'status' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Ticket List Content */}
            <div className="overflow-x-auto mt-6">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('type')}
                    >
                      Type
                      {sortField === 'type' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th 
                      scope="col" 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('created_at')}
                    >
                      Submitted
                      {sortField === 'created_at' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th 
                      scope="col" 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('status')}
                    >
                      Status
                      {sortField === 'status' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th 
                      scope="col" 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('priority')}
                    >
                      Priority
                      {sortField === 'priority' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {getSortedTickets().length > 0 ? (
                    getSortedTickets().map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {ticket.template?.name || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ID: {ticket.id}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(ticket.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <Avatar 
                                name={ticket.submitter?.name || 'Unknown User'} 
                                size="sm" 
                              />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {ticket.submitter?.name || 'Unknown User'}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {ticket.submitter?.email || ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={ticket.status} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <PriorityBadge priority={ticket.priority} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {ticket.assignment ? (
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <Avatar 
                                  name={ticket.assignment.helpdesk?.name || 'Unknown'} 
                                  size="sm"
                                />
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {ticket.assignment.helpdesk?.name || 'Unknown'}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Not assigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="primary"
                              onClick={() => router.push(`/helpdesk/tickets/${ticket.id}`)}
                              size="sm"
                            >
                              View Details
                            </Button>
                            
                            {/* Add "Assign to Me" button for unassigned tickets */}
                            {!ticket.assignment && (
                              <Button
                                variant="success"
                                onClick={() => handleSelfAssign(ticket.id)}
                                size="sm"
                                disabled={assigning}
                              >
                                {assigning ? 'Assigning...' : 'Assign to Me'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        {activeTab === 'assigned' 
                          ? "You don't have any assigned tickets yet." 
                          : "No tickets available."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
