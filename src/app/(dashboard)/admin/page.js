'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import { Users, HeadsetIcon, TicketIcon, AlertTriangleIcon } from 'lucide-react';
import Link from 'next/link';

// Statistic Card Component
const StatCard = ({ title, value, icon, color }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color} text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Chart Bar Component for simple visualization
const ChartBar = ({ label, value, maxValue, color }) => {
  const percentage = Math.round((value / maxValue) * 100);
  
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-medium">{value}</span>
      </div>
      <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full">
        <div 
          className={`h-3 rounded-full ${color}`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

// New component for ticket notifications
const TicketNotification = ({ ticket, onAssign, isAssigned = false }) => {
  return (
    <div className="bg-gray-700 border-l-4 border-yellow-600 rounded-lg shadow p-4 mb-3">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-white">{ticket.template?.name || 'Unknown Form'}</h3>
          <p className="text-xs text-gray-300">
            Submitted by {ticket.submitter?.name} • {new Date(ticket.created_at).toLocaleString()}
          </p>
        </div>
        <span className="bg-yellow-900 text-yellow-300 text-xs font-medium px-2 py-0.5 rounded-full">
          {ticket.status.replace('_', ' ').charAt(0).toUpperCase() + ticket.status.replace('_', ' ').slice(1)}
        </span>
      </div>
      <div className="mt-2 flex justify-end">
        {!isAssigned && (
          <button 
            onClick={() => onAssign(ticket)} 
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded"
          >
            Assign
          </button>
        )}
      </div>
    </div>
  );
};

// Helpdesk Card component for displaying helpdesk details
const HelpdeskCard = ({ staffData, assignedTickets }) => {
  const openTickets = assignedTickets.filter(t => t.status === 'open').length;
  const resolvedTickets = assignedTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
  
  return (
    <div className="bg-gray-700 rounded-lg shadow-md p-4 border border-gray-600">
      <div className="flex items-center mb-3">
        <div className="w-12 h-12 rounded-full bg-indigo-900 flex items-center justify-center mr-3">
          {staffData.avatar ? (
            <img src={staffData.avatar} alt={staffData.name} className="w-12 h-12 rounded-full" />
          ) : (
            <span className="text-xl font-bold text-indigo-300">
              {staffData.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h3 className="font-medium text-lg text-white">{staffData.name}</h3>
          <p className="text-gray-300 text-sm">{staffData.email}</p>
        </div>
      </div>
      
      <div className="mb-3">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-300">Assigned Tickets</span>
          <span className="bg-blue-900 text-blue-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {assignedTickets.length}
          </span>
        </div>
        
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Open: {openTickets}</span>
          <span>Resolved: {resolvedTickets}</span>
        </div>
        
        <div className="flex flex-wrap gap-1 mb-2">
          {assignedTickets.length > 0 ? (
            assignedTickets.slice(0, 3).map(ticket => (
              <span key={ticket.id} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded">
                {ticket.template?.name || 'Ticket'}
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-400 italic">No tickets assigned</span>
          )}
          {assignedTickets.length > 3 && (
            <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded">
              +{assignedTickets.length - 3} more
            </span>
          )}
        </div>
      </div>
      
      <div className="border-t border-gray-600 pt-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full bg-gray-600 hover:bg-gray-700 text-white border-gray-500"
          onClick={() => {}} // Could show a modal with full list of assigned tickets
        >
          View Details
        </Button>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [statistics, setStatistics] = useState({
    totalHelpdesks: 0,
    totalTickets: 0,
    totalUsers: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    urgentTickets: 0,
    highPriorityTickets: 0,
    pendingReviewTickets: 0,
    helpdesks: [],
    ticketTypes: []
  });
  const [loadingStats, setLoadingStats] = useState(true);
  
  // New state for recent tickets and notifications
  const [recentTickets, setRecentTickets] = useState([]);
  const [unassignedTickets, setUnassignedTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [helpdesks, setHelpdesks] = useState([]);
  const [selectedHelpdesk, setSelectedHelpdesk] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [currentHelpdeskFilter, setCurrentHelpdeskFilter] = useState(null);

  // New state for user management
  const [users, setUsers] = useState([]);
  const [helpdeskStaff, setHelpdeskStaff] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Verify user authentication and role
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    } else if (!loading && user?.role !== 'admin') {
      router.replace(`/${user?.role}`);
    }
  }, [loading, isAuthenticated, user, router]);

  // Fetch dashboard statistics
  useEffect(() => {
    const fetchStatistics = async () => {
      if (!isAuthenticated || !user || user.role !== 'admin') return;
      
      try {
        setLoadingStats(true);
        console.log("Fetching statistics - START");
        
        // Fetch all helpdesk users
        const helpdeskResponse = await fetch('/api/admin/helpdesk-users', {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        const helpdesks = helpdeskResponse.ok ? await helpdeskResponse.json() : [];
        console.log("Helpdesk users for statistics:", helpdesks.length);
        
        // Fetch regular users count
        const usersResponse = await fetch('/api/admin/users?role=user', {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        const regularUsers = usersResponse.ok ? await usersResponse.json() : [];
        console.log("Regular users for statistics:", regularUsers.length);
        
        // If no helpdesks found, try debug mode as fallback
        if (helpdesks.length === 0) {
          console.log("No helpdesks found for statistics, trying debug mode...");
          const debugResponse = await fetch('/api/admin/helpdesk-users?debug=true', {
            headers: { 'Cache-Control': 'no-cache' }
          });
          if (debugResponse.ok) {
            const debugHelpdesks = await debugResponse.json();
            console.log("DEBUG: Using test helpdesk data for statistics:", debugHelpdesks.length);
            if (debugHelpdesks.length > 0) {
              // Use debug data for statistics
              const helpdeskWorkloads = debugHelpdesks.map(helpdesk => ({
                id: helpdesk.id,
                name: helpdesk.name,
                assignedTickets: 0,
                totalTickets: 0,
                openTickets: 0,
                resolvedTickets: 0,
                performance: 0
              }));
              
              setStatistics({
                totalHelpdesks: debugHelpdesks.length,
                totalTickets: 0,
                totalUsers: regularUsers.length,
                openTickets: 0,
                inProgressTickets: 0,
                resolvedTickets: 0,
                closedTickets: 0,
                urgentTickets: 0,
                highPriorityTickets: 0,
                pendingReviewTickets: 0,
                helpdesks: helpdeskWorkloads,
                ticketTypes: [],
                refreshTimestamp: Date.now()
              });
              setLoadingStats(false);
              console.log("Fetching statistics - END (debug data)");
              return;
            }
          }
        }
        
        // Fetch tickets
        const ticketsResponse = await fetch('/api/forms/submissions', {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        if (!ticketsResponse.ok) {
          const errorText = await ticketsResponse.text();
          console.error("Error response from tickets API:", errorText);
          console.error("Status code:", ticketsResponse.status);
          throw new Error(`Failed to fetch tickets: ${ticketsResponse.status} - ${errorText.substring(0, 100)}`);
        }
        
        const tickets = await ticketsResponse.json();
        
        // Fetch ticket types
        const typesResponse = await fetch('/api/forms/templates', {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        const ticketTypes = typesResponse.ok ? await typesResponse.json() : [];
        
        // Fetch ticket assignments
        const assignmentsResponse = await fetch('/api/assignments', {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        const assignments = assignmentsResponse.ok ? await assignmentsResponse.json() : [];
        console.log("Assignments for statistics:", assignments.length);
        
        // Calculate ticket statistics
        const openTickets = tickets.filter(t => t.status === 'open').length;
        const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
        const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
        const closedTickets = tickets.filter(t => t.status === 'closed').length;
        
        const urgentTickets = tickets.filter(t => t.priority === 'urgent').length;
        const highPriorityTickets = tickets.filter(t => t.priority === 'high').length;
        const pendingReviewTickets = tickets.filter(t => t.priority === 'pending').length;
        
        // Calculate helpdesk workloads based on ticket assignments
        const helpdeskWorkloads = helpdesks.map(helpdesk => {
          const helpdeskAssignments = assignments.filter(a => a.helpdesk_id === helpdesk.id);
          const assignedTicketIds = helpdeskAssignments.map(a => a.ticket_id);
          const helpdeskTickets = tickets.filter(t => assignedTicketIds.includes(t.id));
          
          return {
            id: helpdesk.id,
            name: helpdesk.name,
            assignedTickets: helpdeskAssignments.length,
            totalTickets: helpdeskTickets.length,
            openTickets: helpdeskTickets.filter(t => t.status === 'open').length,
            resolvedTickets: helpdeskTickets.filter(t => t.status === 'resolved').length,
            performance: helpdeskTickets.length > 0 
              ? Math.round((helpdeskTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length / helpdeskTickets.length) * 100) 
              : 0
          };
        });
        
        // Calculate form template usage
        const formUsage = ticketTypes.map(type => {
          const typeTickets = tickets.filter(t => t.form_template_id === type.id);
          return {
            id: type.id,
            name: type.name,
            count: typeTickets.length
          };
        }).sort((a, b) => b.count - a.count);
        
        // Update statistics with all collected data
        setStatistics({
          totalHelpdesks: helpdesks.length,
          totalTickets: tickets.length,
          totalUsers: regularUsers.length,
          openTickets,
          inProgressTickets,
          resolvedTickets,
          closedTickets,
          urgentTickets,
          highPriorityTickets,
          pendingReviewTickets,
          helpdesks: helpdeskWorkloads,
          ticketTypes: formUsage,
          refreshTimestamp: Date.now()
        });

        console.log("Fetching statistics - END (real data)");
        
      } catch (error) {
        console.error("Error fetching statistics:", error);
        setNotification({
          type: 'error',
          message: `Failed to load dashboard data: ${error.message}`
        });
      } finally {
        setLoadingStats(false);
      }
    };
    
    fetchStatistics();
  }, [isAuthenticated, user]);

  // New useEffect to fetch recent and unassigned tickets
  useEffect(() => {
    const fetchRecentTickets = async () => {
      if (!isAuthenticated || !user || user.role !== 'admin') return;
      
      try {
        setLoadingTickets(true);
        console.log("Fetching recent tickets - START");
        
        // Fetch all tickets
        const ticketsResponse = await fetch('/api/forms/submissions', {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        if (!ticketsResponse.ok) {
          const errorText = await ticketsResponse.text();
          console.error("Error response from tickets API:", errorText);
          console.error("Status code:", ticketsResponse.status);
          throw new Error(`Failed to fetch tickets: ${ticketsResponse.status} - ${errorText.substring(0, 100)}`);
        }
        
        const tickets = await ticketsResponse.json();
        
        // Get assignments to identify unassigned tickets and assigned tickets
        const assignmentsResponse = await fetch('/api/assignments', {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        if (!assignmentsResponse.ok) {
          const errorText = await assignmentsResponse.text();
          console.error("Error response from assignments API:", errorText);
          console.error("Status code:", assignmentsResponse.status);
          throw new Error(`Failed to fetch assignments: ${assignmentsResponse.status} - ${errorText.substring(0, 100)}`);
        }
        const assignments = await assignmentsResponse.json();
        
        // Create a mapping of tickets to helpdesks
        const ticketAssignments = {};
        assignments.forEach(a => {
          if (a && a.ticket_id) {
            ticketAssignments[a.ticket_id] = a.helpdesk_id;
          }
        });
        
        // Filter for unassigned tickets
        const unassigned = tickets.filter(ticket => 
          !ticketAssignments[ticket.id] && ticket.status !== 'closed' && ticket.status !== 'resolved'
        );
        setUnassignedTickets(unassigned);
        
        // Get recently assigned tickets (last 5) - distinct from unassigned tickets
        const assignedTickets = tickets.filter(ticket => 
          ticketAssignments[ticket.id] && ticket.status !== 'closed' && ticket.status !== 'resolved'
        );
        const recent = [...assignedTickets].sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        ).slice(0, 5);
        setRecentTickets(recent);
        
        // Fetch available helpdesks for assignment
        const usersResponse = await fetch('/api/admin/helpdesk-users', {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        if (!usersResponse.ok) {
          const errorText = await usersResponse.text();
          console.error("Error response from helpdesk users API:", errorText);
          console.error("Status code:", usersResponse.status);
          throw new Error(`Failed to fetch helpdesk users: ${usersResponse.status} - ${errorText.substring(0, 100)}`);
        }
        const helpdeskUsers = await usersResponse.json();
        console.log("Helpdesk users for assignment:", helpdeskUsers.length);
        
        // If no helpdesks found, try debug mode as fallback
        if (helpdeskUsers.length === 0) {
          console.log("No helpdesks found for assignment, trying debug mode...");
          const debugResponse = await fetch('/api/admin/helpdesk-users?debug=true', {
            headers: { 'Cache-Control': 'no-cache' }
          });
          if (debugResponse.ok) {
            const debugHelpdesks = await debugResponse.json();
            console.log("DEBUG: Using test helpdesk data for assignment:", debugHelpdesks.length);
            if (debugHelpdesks.length > 0) {
              setHelpdeskStaff(debugHelpdesks);
            }
          }
        } else {
          setHelpdeskStaff(helpdeskUsers);
        }

        console.log("Fetching recent tickets - END");
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setNotification({
          type: 'error',
          message: 'Failed to load dashboard data: ' + error.message
        });
      } finally {
        setLoadingTickets(false);
      }
    };
    
    fetchRecentTickets();
  }, [isAuthenticated, user]);
  
  // Update fetchHelpdeskStaff to also fetch ticket assignments
  useEffect(() => {
    const fetchHelpdeskStaff = async () => {
      if (!isAuthenticated || !user || user.role !== 'admin') return;
      
      try {
        setLoadingUsers(true);
        console.log("Fetching helpdesk staff - START");
        
        // Fetch helpdesk staff from dedicated endpoint
        const usersResponse = await fetch('/api/admin/helpdesk-users', {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!usersResponse.ok) {
          const errorText = await usersResponse.text();
          console.error("Error response from helpdesk users API:", errorText);
          console.error("Status code:", usersResponse.status);
          throw new Error(`Failed to fetch helpdesk staff: ${usersResponse.status} - ${errorText.substring(0, 100)}`);
        }
        
        const helpdesks = await usersResponse.json();
        console.log("Helpdesk staff fetched:", helpdesks.length);
        
        // Set helpdesk staff data
        setHelpdeskStaff(helpdesks);
        
        // Fetch all tickets to have their data available
        const ticketsResponse = await fetch('/api/forms/submissions', {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!ticketsResponse.ok) {
          const errorText = await ticketsResponse.text();
          console.error("Error response from tickets API:", errorText);
          throw new Error(`Failed to fetch tickets: ${ticketsResponse.status}`);
        }
        
        const tickets = await ticketsResponse.json();
        setRecentTickets(tickets);
        
      } catch (error) {
        console.error('Error fetching helpdesk staff data:', error);
        setNotification({
          type: 'error',
          message: 'Failed to load helpdesk staff data: ' + error.message
        });
      } finally {
        setLoadingUsers(false);
      }
    };
    
    fetchHelpdeskStaff();
  }, [isAuthenticated, user]);
  
  // Handle opening the assign modal
  const handleOpenAssignModal = (ticket) => {
    setSelectedTicket(ticket);
    setSelectedHelpdesk('');
    setShowAssignModal(true);
  };
  
  // Handle assigning a ticket to a helpdesk
  const handleAssignTicket = async () => {
    if (!selectedTicket || !selectedHelpdesk) return;
    
    try {
      setAssigning(true);
      
      // Create assignment between ticket and helpdesk
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          helpdeskId: selectedHelpdesk
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error creating assignment:", errorText);
        console.error("Status code:", response.status);
        throw new Error(`Failed to create assignment: ${response.status} - ${errorText.substring(0, 100)}`);
      }
      
      // Remove ticket from unassigned list and add to recent tickets
      const updatedUnassignedTickets = unassignedTickets.filter(t => t.id !== selectedTicket.id);
      setUnassignedTickets(updatedUnassignedTickets);
      
      // Add the newly assigned ticket to recent tickets
      const updatedRecentTickets = [selectedTicket, ...recentTickets].slice(0, 5);
      setRecentTickets(updatedRecentTickets);
      
      // Show notification
      setNotification({
        type: 'success',
        message: `Ticket successfully assigned to helpdesk staff`
      });
      
      // Close modal
      setShowAssignModal(false);
    } catch (error) {
      console.error("Error assigning ticket:", error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to assign ticket'
      });
    } finally {
      setAssigning(false);
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };

  // Get tickets assigned to a specific helpdesk
  const getTicketsAssignedTo = (helpdeskId) => {
    // Find the helpdesk staff with the matching ID
    const helpdesk = helpdeskStaff.find(h => h.id === helpdeskId);
    
    // If helpdesk exists and has assignedTickets property, return those tickets
    if (helpdesk && helpdesk.assignedTickets) {
      return helpdesk.assignedTickets;
    }
    
    // Return empty array if no matches
    return [];
  };

  // Function to filter helpdesk data
  const getFilteredHelpdeskData = () => {
    if (!currentHelpdeskFilter) {
      return statistics.helpdesks;
    }
    return statistics.helpdesks.filter(helpdesk => helpdesk.id === currentHelpdeskFilter);
  };

  // Helper for helpdesk filter selection
  const handleHelpdeskFilterChange = (e) => {
    setCurrentHelpdeskFilter(e.target.value === "" ? null : e.target.value);
  };

  // Add a refresh function that can be called from a button click
  const refreshDashboard = () => {
    console.log("Manual dashboard refresh triggered");
    setLoadingStats(true);
    setLoadingTickets(true);
    setLoadingUsers(true);
    
    // Create a small delay to ensure state updates are processed before refetching
    setTimeout(() => {
      // These functions will be executed on next render due to state changes
      setStatistics(prev => ({
        ...prev,
        refreshTimestamp: Date.now() // This won't trigger re-renders due to our fixed dependency arrays
      }));
    }, 100);
  };

  if (loading || loadingStats) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Calculate maximum values for charts
  const maxTicketsValue = Math.max(
    statistics.openTickets,
    statistics.inProgressTickets, 
    statistics.resolvedTickets, 
    statistics.closedTickets
  );
  
  const maxPriorityValue = Math.max(
    statistics.pendingReviewTickets,
    statistics.highPriorityTickets,
    statistics.urgentTickets
  );
  
  const maxHelpdeskWorkload = Math.max(
    ...statistics.helpdesks.map(h => h.totalTickets)
  );

  // Priority labels for display
  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'urgent': return { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', text: 'Urgent' };
      case 'high': return { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', text: 'High' };
      case 'medium': return { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', text: 'Medium' };
      case 'low': return { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', text: 'Low' };
      default: return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', text: 'Pending' };
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold mb-2 text-white">Admin Dashboard</h1>
              <p className="text-gray-300">
                Welcome back, {user?.name}!
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/admin/create-ticket"
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Create new Ticket
              </Link>
              <Link 
                href="/admin/ticket-forms"
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Ticket Forms
              </Link>
              <Link 
                href="/admin/tickets"
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                All Tickets
              </Link>
            </div>
          </div>
        </div>
        
        {notification && (
          <div className={`mb-6 p-4 rounded-md ${
            notification.type === 'success' 
              ? 'bg-green-900 border border-green-700 text-green-300' 
              : 'bg-red-900 border border-red-700 text-red-300'
          }`}>
            {notification.message}
          </div>
        )}

        <>
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Users statistics card */}
            <StatCard
              title="Total Users"
              value={statistics.totalUsers || 0}
              icon={<Users className="h-6 w-6" />}
              color="bg-indigo-600"
            />
            
            {/* Helpdesk Staff statistics card */}
            <StatCard
              title="Helpdesk Staff"
              value={statistics.totalHelpdesks || 0}
              icon={<HeadsetIcon className="h-6 w-6" />}
              color="bg-blue-600"
            />
            
            {/* Total Tickets statistics card */}
            <StatCard
              title="Total Tickets"
              value={statistics.totalTickets || 0}
              icon={<TicketIcon className="h-6 w-6" />}
              color="bg-green-600"
            />
            
            {/* Urgent Tickets statistics card */}
            <StatCard
              title="Urgent Tickets"
              value={statistics.urgentTickets || 0}
              icon={<AlertTriangleIcon className="h-6 w-6" />}
              color="bg-red-600"
            />
          </div>

          {/* Ticket Status Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-white">Ticket Status Distribution</h2>
              <div className="space-y-4">
                <ChartBar 
                  label="Open" 
                  value={statistics.openTickets} 
                  maxValue={maxTicketsValue}
                  color="bg-blue-600" 
                />
                <ChartBar 
                  label="In Progress" 
                  value={statistics.inProgressTickets} 
                  maxValue={maxTicketsValue}
                  color="bg-yellow-600" 
                />
                <ChartBar 
                  label="Resolved" 
                  value={statistics.resolvedTickets} 
                  maxValue={maxTicketsValue}
                  color="bg-green-600" 
                />
                <ChartBar 
                  label="Closed" 
                  value={statistics.closedTickets} 
                  maxValue={maxTicketsValue}
                  color="bg-gray-600" 
                />
              </div>
            </div>

            {/* Ticket Priority Distribution */}
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-white">Ticket Priority Distribution</h2>
              <div className="space-y-4">
                <ChartBar 
                  label="Pending Review" 
                  value={statistics.pendingReviewTickets} 
                  maxValue={maxPriorityValue}
                  color="bg-gray-600" 
                />
                <ChartBar 
                  label="High Priority" 
                  value={statistics.highPriorityTickets} 
                  maxValue={maxPriorityValue}
                  color="bg-yellow-600" 
                />
                <ChartBar 
                  label="Urgent" 
                  value={statistics.urgentTickets} 
                  maxValue={maxPriorityValue}
                  color="bg-red-600" 
                />
              </div>
            </div>
          </div>
          
          {/* Helpdesk Performance Table */}
          <div className="bg-gray-800 rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Helpdesk Staff Performance</h2>
              <div className="flex items-center space-x-2">
                <label htmlFor="helpdeskFilter" className="text-sm text-gray-300">
                  Filter by Helpdesk:
                </label>
                <select
                  id="helpdeskFilter"
                  value={currentHelpdeskFilter || ""}
                  onChange={handleHelpdeskFilterChange}
                  className="border border-gray-700 rounded-md shadow-sm py-1 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-700 text-white"
                >
                  <option value="">All Helpdesks</option>
                  {statistics.helpdesks.map(helpdesk => (
                    <option key={helpdesk.id} value={helpdesk.id}>
                      {helpdesk.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {statistics.helpdesks.length === 0 ? (
              <p className="text-center text-gray-400 py-4">
                No helpdesk staff available.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Staff
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Assigned Tickets
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Total Tickets
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Open Tickets
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Resolved
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Performance
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Workload
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {getFilteredHelpdeskData().map(helpdesk => (
                      <tr key={helpdesk.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {helpdesk.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {helpdesk.assignedTickets.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {helpdesk.totalTickets}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {helpdesk.openTickets}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {helpdesk.resolvedTickets}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="mr-2 text-sm font-medium text-white">
                              {helpdesk.performance}%
                            </span>
                            <div className="w-24 h-2.5 bg-gray-700 rounded-full">
                              <div className="h-2.5 bg-green-600 rounded-full" style={{ width: `${helpdesk.performance}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-24 h-2.5 bg-gray-700 rounded-full">
                            <div 
                              className="h-2.5 bg-blue-600 rounded-full" 
                              style={{ 
                                width: maxHelpdeskWorkload > 0 
                                  ? `${(helpdesk.totalTickets / maxHelpdeskWorkload) * 100}%`
                                  : '0%'
                              }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>

        {/* Recent Tickets Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Tickets */}
          <div className="bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-white">Recently Assigned Tickets</h2>
            {loadingTickets ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : recentTickets.length === 0 ? (
              <p className="text-center text-gray-400 py-4">No recently assigned tickets found.</p>
            ) : (
              <div className="space-y-4">
                {recentTickets.map(ticket => (
                  <TicketNotification 
                    key={ticket.id} 
                    ticket={ticket} 
                    onAssign={handleOpenAssignModal}
                    isAssigned={true}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Unassigned Tickets */}
          <div className="bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-white">Unassigned Tickets</h2>
            {loadingTickets ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : unassignedTickets.length === 0 ? (
              <p className="text-center text-gray-400 py-4">No unassigned tickets found.</p>
            ) : (
              <div className="space-y-4">
                {unassignedTickets.map(ticket => (
                  <TicketNotification 
                    key={ticket.id} 
                    ticket={ticket} 
                    onAssign={handleOpenAssignModal}
                    isAssigned={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ticket Assignment Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4 text-white">Assign Ticket</h3>
              <p className="mb-4 text-gray-300">
                Ticket: {selectedTicket?.template?.name || 'Unknown Form'}
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Select Helpdesk Staff
                </label>
                <select 
                  value={selectedHelpdesk} 
                  onChange={(e) => setSelectedHelpdesk(e.target.value)}
                  className="w-full border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-700 text-white py-2"
                >
                  <option value="">Select a helpdesk staff</option>
                  {helpdeskStaff.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  onClick={() => setShowAssignModal(false)}
                  variant="outline"
                  size="sm"
                  disabled={assigning}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAssignTicket}
                  variant="primary"
                  size="sm"
                  disabled={!selectedHelpdesk || assigning}
                >
                  {assigning ? 'Assigning...' : 'Assign Ticket'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}