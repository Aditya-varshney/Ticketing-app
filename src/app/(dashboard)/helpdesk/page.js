'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';

// Status badge component
const StatusBadge = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor()}`}>
      {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Priority badge component
const PriorityBadge = ({ priority }) => {
  const getPriorityColor = () => {
    switch (priority) {
      case 'pending':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'medium':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'high':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor()}`}>
      {priority === 'pending' ? 'Pending' : priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
};

export default function HelpdeskDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [assignedTickets, setAssignedTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  
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

  // Fetch tickets assigned to this helpdesk
  useEffect(() => {
    const fetchAssignedTickets = async () => {
      if (!isAuthenticated || !user?.id) return;
      
      try {
        setLoadingTickets(true);
        // Use the /api/helpdesk/tickets endpoint
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
          console.log("Tickets fetched for helpdesk:", tickets.length);
          setAssignedTickets(tickets);
        }
      } catch (error) {
        console.error('Error fetching tickets:', error);
      } finally {
        setLoadingTickets(false);
      }
    };

    if (isAuthenticated && user) {
      fetchAssignedTickets();
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
  
  // Sort the tickets based on current sort settings
  const getSortedTickets = () => {
    return [...assignedTickets].sort((a, b) => {
      let compareResult = 0;
      
      switch (sortField) {
        case 'type':
          // Sort by form template name
          compareResult = (a.template?.name || '').localeCompare(b.template?.name || '');
          break;
          
        case 'created_at':
          // Sort by date
          compareResult = new Date(a.created_at) - new Date(b.created_at);
          break;
          
        case 'priority':
          // Sort by priority (custom order)
          const priorityOrder = { pending: 0, low: 1, medium: 2, high: 3, urgent: 4 };
          compareResult = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
          break;
          
        case 'status':
          // Sort by status (custom order)
          const statusOrder = { open: 0, in_progress: 1, resolved: 2, closed: 3 };
          compareResult = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
          break;
          
        default:
          compareResult = 0;
      }
      
      // Apply sort direction
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
          <Button onClick={() => logout()} variant="outline">
            Logout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Ticket List Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Assigned Tickets</h2>
            
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
          
          {assignedTickets.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No tickets have been assigned to you yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ticket ID
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Priority
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {getSortedTickets().map((ticket) => (
                    <tr key={ticket.id}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {ticket.id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                        {ticket.submitter?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {ticket.template?.name || 'Unknown Form'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(ticket.created_at)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <PriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() => router.push(`/helpdesk/tickets/${ticket.id}`)}
                          size="sm"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
