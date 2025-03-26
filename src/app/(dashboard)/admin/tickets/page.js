'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';

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
  const [includeRevoked, setIncludeRevoked] = useState(true);
  const [filterTicketType, setFilterTicketType] = useState('all');
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loadingTicketTypes, setLoadingTicketTypes] = useState(true);

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
        const url = `/api/forms/submissions?${includeRevoked ? 'includeRevoked=true' : ''}`;
        const response = await fetch(url, {
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
  }, [isAuthenticated, includeRevoked]);
  
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

  useEffect(() => {
    const fetchTicketTypes = async () => {
      if (!isAuthenticated) return;
      
      try {
        setLoadingTicketTypes(true);
        const response = await fetch('/api/forms/templates');
        
        if (!response.ok) {
          throw new Error('Failed to fetch ticket types');
        }
        
        const data = await response.json();
        const templates = data.templates || [];
        setTicketTypes(templates);
      } catch (error) {
        console.error('Error fetching ticket types:', error);
      } finally {
        setLoadingTicketTypes(false);
      }
    };
    
    fetchTicketTypes();
  }, [isAuthenticated]);

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const statusMatch = filterStatus === 'all' || ticket.status === filterStatus;
    const priorityMatch = filterPriority === 'all' || ticket.priority === filterPriority;
    const typeMatch = filterTicketType === 'all' || ticket.form_template_id === filterTicketType;
    return statusMatch && priorityMatch && typeMatch;
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
  
  if (loading || loadingTickets || loadingHelpdesks || loadingTicketTypes) {
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
            <div className="w-48 ml-2">
              <label htmlFor="typeFilter" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Ticket Type
              </label>
              <select
                id="typeFilter"
                value={filterTicketType}
                onChange={(e) => setFilterTicketType(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              >
                <option value="all">All Types</option>
                {ticketTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="mb-4 flex items-center">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={includeRevoked}
              onChange={() => setIncludeRevoked(!includeRevoked)}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
              Show Revoked Tickets
            </span>
          </label>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredTickets.length} of {tickets.length} tickets
            {filterStatus !== 'all' && ` • Status: ${filterStatus}`}
            {filterPriority !== 'all' && ` • Priority: ${filterPriority}`}
            {filterTicketType !== 'all' && ` • Type: ${ticketTypes.find(t => t.id === filterTicketType)?.name || 'Unknown'}`}
          </div>
          
          {(filterStatus !== 'all' || filterPriority !== 'all' || filterTicketType !== 'all') && (
            <button
              onClick={() => {
                setFilterStatus('all');
                setFilterPriority('all');
                setFilterTicketType('all');
              }}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Clear Filters
            </button>
          )}
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
