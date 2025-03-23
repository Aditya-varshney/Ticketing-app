'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Link from 'next/link';

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
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-300';
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
      {priority === 'pending' ? 'Needs Review' : priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
};

export default function AdminTicketsPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [helpdeskUsers, setHelpdeskUsers] = useState([]);
  const [loadingHelpdesks, setLoadingHelpdesks] = useState(true);
  const [assignments, setAssignments] = useState({});
  const [updating, setUpdating] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    // Check if user is authenticated and has the correct role
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    } else if (!loading && user?.role !== 'admin') {
      router.replace(`/${user?.role}`);
    }
  }, [loading, isAuthenticated, user, router]);
  
  useEffect(() => {
    // Fetch all tickets
    const fetchTickets = async () => {
      if (!isAuthenticated) return;
      
      try {
        setLoadingTickets(true);
        const response = await fetch('/api/forms/submissions', {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch tickets');
        }
        
        const data = await response.json();
        console.log("Tickets fetched:", data.length);
        setTickets(data);
        
        // Extract existing assignments from tickets
        const assignmentsMap = {};
        
        // Fetch assignments to get ticket-helpdesk mappings
        const assignmentsResponse = await fetch('/api/assignments', {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (assignmentsResponse.ok) {
          const assignments = await assignmentsResponse.json();
          
          // Map ticket IDs to helpdesk IDs
          assignments.forEach(assignment => {
            if (assignment && assignment.ticket_id) {
              assignmentsMap[assignment.ticket_id] = assignment.helpdesk_id;
            }
          });
        }
        
        setAssignments(assignmentsMap);
      } catch (error) {
        console.error('Error fetching tickets:', error);
      } finally {
        setLoadingTickets(false);
      }
    };
    
    fetchTickets();
  }, [isAuthenticated]);
  
  useEffect(() => {
    // Fetch all helpdesk users
    const fetchHelpdesks = async () => {
      if (!isAuthenticated) return;
      
      try {
        setLoadingHelpdesks(true);
        const response = await fetch('/api/admin/users?role=helpdesk');
        
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        setHelpdeskUsers(data);
      } catch (error) {
        console.error('Error fetching helpdesks:', error);
      } finally {
        setLoadingHelpdesks(false);
      }
    };
    
    fetchHelpdesks();
  }, [isAuthenticated]);

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const statusMatch = filterStatus === 'all' || ticket.status === filterStatus;
    const priorityMatch = filterPriority === 'all' || ticket.priority === filterPriority;
    return statusMatch && priorityMatch;
  });
  
  // Get pending priority tickets
  const pendingReviewTickets = tickets.filter(ticket => ticket.priority === 'pending');
  
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
  
  // Handle assignment change
  const handleAssignmentChange = async (ticketId, helpdeskId) => {
    setUpdating(true);
    
    try {
      // If helpdeskId is empty, remove the assignment
      if (!helpdeskId) {
        // Call API to delete assignment
        const deleteResponse = await fetch(`/api/assignments?ticketId=${ticketId}`, {
          method: 'DELETE'
        });
        
        if (!deleteResponse.ok) {
          throw new Error('Failed to remove assignment');
        }
        
        // Update local state
        setAssignments(prev => {
          const newAssignments = { ...prev };
          delete newAssignments[ticketId];
          return newAssignments;
        });
        
        setNotification({
          type: 'success',
          message: 'Assignment removed successfully'
        });
      } else {
        // Call API to create/update assignment
        const response = await fetch('/api/assignments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticketId,
            helpdeskId
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update assignment');
        }
        
        // Update local state
        setAssignments(prev => ({
          ...prev,
          [ticketId]: helpdeskId
        }));
        
        setNotification({
          type: 'success',
          message: 'Assignment updated successfully'
        });
      }
    } catch (error) {
      console.error("Error updating assignment:", error);
      setNotification({
        type: 'error',
        message: error.message
      });
    } finally {
      setUpdating(false);
    }
  };
  
  if (loading || loadingTickets || loadingHelpdesks) {
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
            <h1 className="text-2xl font-bold mb-2">Support Tickets</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage user support requests
            </p>
          </div>
          <Button 
            onClick={() => router.push('/admin')}
            variant="outline"
          >
            Back to Dashboard
          </Button>
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
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-3 sm:space-y-0">
          <h2 className="text-lg font-medium">Filter Tickets</h2>
          <div className="flex space-x-4">
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>
              <select
                id="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label htmlFor="priority-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Priority
              </label>
              <select
                id="priority-filter"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="all">All Priorities</option>
                <option value="pending">Needs Review</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>
        
        {filteredTickets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No tickets match your filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ticket ID
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ticket Type
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Submitted By
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
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {filteredTickets.map((ticket) => {
                  const helpdeskAssignment = assignments[ticket.id];
                  const submitterId = ticket.submitted_by;
                  
                  return (
                    <tr 
                      key={ticket.id} 
                      className={ticket.priority === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {ticket.id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {ticket.template?.name || 'Unknown Form'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {ticket.submitter?.name || 'Unknown'}
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
                      <td className="px-4 py-4">
                        <select
                          value={helpdeskAssignment || ''}
                          onChange={(e) => handleAssignmentChange(ticket.id, e.target.value)}
                          className="block w-full pl-3 pr-10 py-1 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md dark:bg-gray-700 dark:border-gray-600"
                          disabled={updating}
                        >
                          <option value="">Unassigned</option>
                          {helpdeskUsers.map((helpdesk) => (
                            <option key={helpdesk.id} value={helpdesk.id}>
                              {helpdesk.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/admin/tickets/${ticket.id}`}>
                          <span className="text-blue-600 hover:underline">View</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
