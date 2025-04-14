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
const ChartBar = ({ label, value, maxValue, color, totalTickets }) => {
  // Calculate percentage for the bar width and display
  const percentage = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
  const displayPercentage = totalTickets > 0 ? Math.round((value / totalTickets) * 100) : 0;
  
  return (
    <div className="mb-4 group relative">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-medium invisible group-hover:visible transition-all duration-200">
          {displayPercentage}%
        </span>
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
  const activeTickets = assignedTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
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
          <span>Active: {activeTickets}</span>
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

  // New state for user management
  const [users, setUsers] = useState([]);
  const [helpdeskStaff, setHelpdeskStaff] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // New state for ticket types and tickets
  const [ticketTypes, setTicketTypes] = useState([]);
  const [tickets, setTickets] = useState([]);

  // Add a new state variable for loading templates
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Add a new state for search query
  const [helpdeskSearchQuery, setHelpdeskSearchQuery] = useState('');

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
              const helpdeskWorkloads = debugHelpdesks.map((helpdesk, index) => {
                // Generate some sample performance data for debug mode
                // This creates varied performance metrics for visualization testing
                const samplePerformance = [75, 60, 85, 40][index % 4];
                
                // Generate random ticket counts
                const assignedTickets = Math.floor(Math.random() * 10) + 1; // 1-10 random tickets
                const openTickets = Math.floor(Math.random() * 3);          // 0-2 open tickets
                const inProgressTickets = Math.floor(Math.random() * 3);    // 0-2 in progress tickets
                const resolvedTickets = Math.floor(Math.random() * 5);      // 0-4 resolved tickets
                const closedTickets = Math.floor(Math.random() * 5);        // 0-4 closed tickets
                // Only count non-closed urgent and high priority tickets
                const urgentTickets = Math.floor(Math.random() * 3);        // Sample urgent tickets (not closed)
                const highPriorityTickets = Math.floor(Math.random() * 4);  // Sample high priority tickets (not closed)

                return {
                  id: helpdesk.id,
                  name: helpdesk.name,
                  assignedTickets,
                  openTickets,
                  inProgressTickets,
                  resolvedTickets,
                  closedTickets,
                  urgentTickets,
                  highPriorityTickets,
                  performance: samplePerformance  // Use predefined performance values
                };
              });
              
              setStatistics({
                totalHelpdesks: debugHelpdesks.length,
                totalTickets: 0,
                totalUsers: regularUsers.length,
                openTickets: 0,
                inProgressTickets: 0,
                resolvedTickets: 0,
                closedTickets: 0,
                urgentTickets: urgentTickets,
                highPriorityTickets: highPriorityTickets,
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
        
        // Filter out closed tickets with high priority or urgent status
        const urgentTickets = tickets.filter(t => t.priority === 'urgent' && t.status !== 'closed').length;
        const highPriorityTickets = tickets.filter(t => t.priority === 'high' && t.status !== 'closed').length;
        const pendingReviewTickets = tickets.filter(t => t.priority === 'pending').length;
        
        // Calculate helpdesk workloads based on ticket assignments
        const helpdeskWorkloads = helpdesks.map(helpdesk => {
          // Find tickets assigned to this helpdesk
          const assignedTickets = assignments.filter(a => a.helpdesk_id === helpdesk.id);
          const assignedTicketIds = assignedTickets.map(a => a.ticket_id);
          
          // Get the tickets to calculate metrics
          const helpdeskTickets = tickets.filter(t => assignedTicketIds.includes(t.id));
          
          // Count tickets by status
          const openTickets = helpdeskTickets.filter(t => t.status === 'open' || !t.status).length;
          const inProgressTickets = helpdeskTickets.filter(t => t.status === 'in_progress').length;
          const resolvedTickets = helpdeskTickets.filter(t => t.status === 'resolved').length;
          const closedTickets = helpdeskTickets.filter(t => t.status === 'closed').length;
          const totalAssigned = helpdeskTickets.length;
          
          // Calculate performance: (resolved + closed) / total assigned tickets
          // Add a safety check to prevent division by zero
          let performance = totalAssigned > 0 ? 
              Math.round(((resolvedTickets + closedTickets) / totalAssigned) * 100) : 0;
          
          // Ensure performance is a valid percentage between 0-100
          performance = Math.max(0, Math.min(100, performance));
          
          return {
            id: helpdesk.id,
            name: helpdesk.name,
            assignedTickets: totalAssigned,
            openTickets,
            inProgressTickets,
            resolvedTickets,
            closedTickets,
            urgentTickets,
            highPriorityTickets,
            performance
          };
        });
        
        // Calculate form template usage
        const formUsage = Array.isArray(ticketTypes) 
          ? ticketTypes.map(type => {
              const typeTickets = tickets.filter(t => t.form_template_id === type.id);
              return {
                id: type.id,
                name: type.name,
                count: typeTickets.length
              };
            }).sort((a, b) => b.count - a.count)
          : [];
        
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
        console.error("Error calculating helpdesk performance:", error);
        // Set default values to prevent UI breakage
        const defaultHelpdeskWorkloads = helpdesks.map(helpdesk => ({
          id: helpdesk.id,
          name: helpdesk.name,
          assignedTickets: 0,
          openTickets: 0,
          inProgressTickets: 0,
          resolvedTickets: 0,
          closedTickets: 0,
          urgentTickets: 0,
          highPriorityTickets: 0,
          performance: 0 // Default to 0% if calculation fails
        }));
        
        // Update statistics with the default values
        setStatistics(prev => ({
          ...prev, 
          helpdesks: defaultHelpdeskWorkloads,
          calculationErrorOccurred: true // Flag to show error message in UI
        }));
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
        // Set an empty array if no tickets are returned (tickets could be null or undefined)
        setRecentTickets(Array.isArray(tickets) ? tickets : []);
        
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

  // Replace the getFilteredHelpdeskData function with a new implementation
  const getFilteredHelpdeskData = () => {
    if (!helpdeskSearchQuery) {
      return statistics.helpdesks;
    }
    
    const query = helpdeskSearchQuery.toLowerCase();
    return statistics.helpdesks.filter(helpdesk => 
      helpdesk.name.toLowerCase().includes(query)
    );
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

  // Update the useEffect that fetches templates
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingTemplates(true);
        // Fetch ticket templates
        const templatesResponse = await fetch('/api/forms/templates');
        if (templatesResponse.ok) {
          const templatesData = await templatesResponse.json();
          console.log("Admin dashboard - templates data:", templatesData);
          
          // Extract the templates array from the response
          const templates = templatesData.templates || [];
          setTicketTypes(Array.isArray(templates) ? templates : []);
        } else {
          // Handle error response
          console.error("Error response from templates API:", templatesResponse.status);
          setTicketTypes([]); // Set empty array on error
        }
        
      } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
        setTicketTypes([]); // Ensure ticketTypes is always an array even on error
        setNotification({
          type: 'error',
          message: 'Failed to load dashboard data. Please try again.'
        });
      } finally {
        setLoadingTemplates(false);
      }
    };
    
    if (isAuthenticated && user?.role === 'admin') {
      fetchData();
    }
  }, [isAuthenticated, user]);

  if (loading || loadingStats) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Only keep the maxHelpdeskWorkload calculation
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
              <h1 className="text-2xl font-bold mb-2 text-white">iTicket Admin Dashboard</h1>
              <p className="text-gray-300">
                Welcome back, {user?.name}!
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/admin/create-ticket"
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Create New Ticket Type
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
              title="Active Tickets"
              value={(statistics.totalTickets || 0) - (statistics.closedTickets || 0)}
              icon={<TicketIcon className="h-6 w-6" />}
              color="bg-green-600"
            />
            
            {/* Urgent Tickets statistics card with note */}
            <div>
              <StatCard
                title="Urgent Tickets"
                value={statistics.urgentTickets || 0}
                icon={<AlertTriangleIcon className="h-6 w-6" />}
                color="bg-red-600"
              />
              <p className="mt-1 text-xs text-gray-400 italic text-center">Excludes closed tickets</p>
            </div>
          </div>

          {/* Ticket Status Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-white">Ticket Status Distribution</h2>
              <div className="space-y-4">
                <ChartBar 
                  label="Open" 
                  value={statistics.openTickets} 
                  maxValue={statistics.totalTickets || 1}
                  totalTickets={statistics.totalTickets}
                  color="bg-blue-600" 
                />
                <ChartBar 
                  label="In Progress" 
                  value={statistics.inProgressTickets} 
                  maxValue={statistics.totalTickets || 1}
                  totalTickets={statistics.totalTickets}
                  color="bg-yellow-600" 
                />
                <ChartBar 
                  label="Resolved" 
                  value={statistics.resolvedTickets} 
                  maxValue={statistics.totalTickets || 1}
                  totalTickets={statistics.totalTickets}
                  color="bg-green-600" 
                />
                <ChartBar 
                  label="Closed" 
                  value={statistics.closedTickets} 
                  maxValue={statistics.totalTickets || 1}
                  totalTickets={statistics.totalTickets}
                  color="bg-green-500" 
                />
              </div>
            </div>

            {/* Ticket Priority Distribution */}
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-white">Ticket Priority Distribution (Active)</h2>
              <div className="space-y-4">
                <ChartBar 
                  label="Pending Review" 
                  value={statistics.pendingReviewTickets} 
                  maxValue={statistics.totalTickets || 1}
                  totalTickets={statistics.totalTickets}
                  color="bg-gray-600" 
                />
                <ChartBar 
                  label="High Priority" 
                  value={statistics.highPriorityTickets} 
                  maxValue={statistics.totalTickets || 1}
                  totalTickets={statistics.totalTickets}
                  color="bg-yellow-600" 
                />
                <ChartBar 
                  label="Urgent" 
                  value={statistics.urgentTickets} 
                  maxValue={statistics.totalTickets || 1}
                  totalTickets={statistics.totalTickets}
                  color="bg-red-600" 
                />
              </div>
              <p className="mt-3 text-xs text-gray-400 italic">Note: Closed high priority and urgent tickets are excluded from these statistics.</p>
            </div>
          </div>
          
          {/* Helpdesk Performance Table */}
          <div className="bg-gray-800 rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Helpdesk Staff Performance</h2>
              <div className="relative w-64">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
                <input
                  type="search"
                  className="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  placeholder="Search helpdesk staff..."
                  value={helpdeskSearchQuery}
                  onChange={(e) => setHelpdeskSearchQuery(e.target.value)}
                />
                {helpdeskSearchQuery && (
                  <button 
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    onClick={() => setHelpdeskSearchQuery('')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {/* Show search results count */}
            <div className="mb-4 text-sm text-gray-400">
              {helpdeskSearchQuery ? 
                `Showing ${getFilteredHelpdeskData().length} of ${statistics.helpdesks.length} helpdesk staff matching "${helpdeskSearchQuery}"` : 
                `Showing all ${statistics.helpdesks.length} helpdesk staff`
              }
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
                        Active Tickets
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
                      <tr key={helpdesk.id} className="hover:bg-gray-700">
                        <td className="py-2.5 px-4 whitespace-nowrap">{helpdesk.name}</td>
                        <td className="py-2.5 px-4">{helpdesk.assignedTickets}</td>
                        <td className="py-2.5 px-4">{helpdesk.openTickets + helpdesk.inProgressTickets}</td>
                        <td className="py-2.5 px-4">{helpdesk.resolvedTickets + helpdesk.closedTickets}</td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center">
                            <div className="w-full h-2.5 bg-gray-700 rounded-full mr-2">
                              <div 
                                className={`h-2.5 rounded-full ${
                                  helpdesk.assignedTickets > 0 
                                    ? (helpdesk.resolvedTickets + helpdesk.closedTickets) / helpdesk.assignedTickets >= 0.8 ? 'bg-green-600' : 
                                      (helpdesk.resolvedTickets + helpdesk.closedTickets) / helpdesk.assignedTickets >= 0.5 ? 'bg-yellow-500' : 
                                      'bg-red-500'
                                    : 'bg-gray-600'
                                }`}
                                style={{ width: `${helpdesk.assignedTickets > 0 ? Math.round(((helpdesk.resolvedTickets + helpdesk.closedTickets) / helpdesk.assignedTickets) * 100) : 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-white font-medium">
                              {helpdesk.assignedTickets > 0 ? Math.round(((helpdesk.resolvedTickets + helpdesk.closedTickets) / helpdesk.assignedTickets) * 100) : 0}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="w-16 h-2.5 bg-gray-700 rounded-full">
                            <div 
                              className={`h-2.5 rounded-full ${
                                (helpdesk.openTickets + helpdesk.inProgressTickets) / (statistics.openTickets + statistics.inProgressTickets) > 0.3 ? 'bg-red-600' : 
                                (helpdesk.openTickets + helpdesk.inProgressTickets) / (statistics.openTickets + statistics.inProgressTickets) > 0.15 ? 'bg-yellow-600' : 'bg-blue-600'
                              }`}
                              style={{ 
                                width: `${(statistics.openTickets + statistics.inProgressTickets) > 0 
                                  ? Math.min(((helpdesk.openTickets + helpdesk.inProgressTickets) / (statistics.openTickets + statistics.inProgressTickets)) * 100, 100) 
                                  : 0}%` 
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
      </div>
    </div>
  );
}