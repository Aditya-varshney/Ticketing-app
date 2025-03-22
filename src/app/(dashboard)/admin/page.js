'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';

// Statistic Card Component
const StatCard = ({ title, value, icon, color }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-opacity-20 ${color.replace('border', 'bg')}`}>
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
const TicketNotification = ({ ticket, onAssign }) => {
  return (
    <div className="bg-white dark:bg-gray-800 border-l-4 border-yellow-500 rounded-lg shadow p-4 mb-3">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold">{ticket.template?.name || 'Unknown Form'}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Submitted by {ticket.submitter?.name} • {new Date(ticket.created_at).toLocaleString()}
          </p>
        </div>
        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full dark:bg-yellow-900/30 dark:text-yellow-300">
          New!
        </span>
      </div>
      <div className="mt-2 flex justify-end">
        <button 
          onClick={() => onAssign(ticket)} 
          className="text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded"
        >
          Assign
        </button>
      </div>
    </div>
  );
};

// User Card component for displaying user details
const UserCard = ({ userData, helpdeskStaff, currentAssignment, onAssign, isAssigning }) => {
  const [selectedHelpdesk, setSelectedHelpdesk] = useState(currentAssignment || '');
  
  const handleAssignChange = (e) => {
    setSelectedHelpdesk(e.target.value);
  };
  
  const handleSubmit = () => {
    onAssign(userData.id, selectedHelpdesk);
  };
  
  const isAssigned = !!currentAssignment;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center mb-3">
        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
          {userData.avatar ? (
            <img src={userData.avatar} alt={userData.name} className="w-12 h-12 rounded-full" />
          ) : (
            <span className="text-xl font-bold text-blue-600 dark:text-blue-300">
              {userData.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h3 className="font-medium text-lg">{userData.name}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{userData.email}</p>
        </div>
      </div>
      
      <div className="mb-3">
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 mb-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Role: <span className="font-medium">{userData.role}</span></span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Joined: <span className="font-medium">{new Date(userData.created_at).toLocaleDateString()}</span></span>
        </div>
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Assigned Helpdesk
        </label>
        <div className="flex space-x-2">
          <select 
            value={selectedHelpdesk} 
            onChange={handleAssignChange}
            className="flex-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2"
            disabled={isAssigning}
          >
            <option value="">Not Assigned</option>
            {helpdeskStaff.map(staff => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>
          <Button
            onClick={handleSubmit}
            disabled={isAssigning || selectedHelpdesk === currentAssignment}
            variant={isAssigned ? "info" : "success"}
            size="sm"
          >
            {isAssigning ? 'Saving...' : isAssigned ? 'Reassign' : 'Assign'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Helpdesk Card component for displaying helpdesk details
const HelpdeskCard = ({ staffData, assignedUsers }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center mb-3">
        <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mr-3">
          {staffData.avatar ? (
            <img src={staffData.avatar} alt={staffData.name} className="w-12 h-12 rounded-full" />
          ) : (
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-300">
              {staffData.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h3 className="font-medium text-lg">{staffData.name}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{staffData.email}</p>
        </div>
      </div>
      
      <div className="mb-3">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">Assigned Users</span>
          <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {assignedUsers.length}
          </span>
        </div>
        
        <div className="flex flex-wrap gap-1 mb-2">
          {assignedUsers.length > 0 ? (
            assignedUsers.slice(0, 3).map(user => (
              <span key={user.id} className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded">
                {user.name}
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400 italic">No users assigned</span>
          )}
          {assignedUsers.length > 3 && (
            <span className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded">
              +{assignedUsers.length - 3} more
            </span>
          )}
        </div>
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {}} // Could show a modal with full list of assigned users
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
    totalUsers: 0,
    totalHelpdesks: 0,
    totalTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    pendingTickets: 0,
    urgentTickets: 0,
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
  const [userAssignments, setUserAssignments] = useState({});
  const [currentHelpdeskFilter, setCurrentHelpdeskFilter] = useState('all');
  const [isAssigning, setIsAssigning] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);

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
        
        // Fetch users
        const usersResponse = await fetch('/api/chat');
        const users = usersResponse.ok ? await usersResponse.json() : [];
        
        // Fetch tickets
        const ticketsResponse = await fetch('/api/forms/submissions');
        const tickets = ticketsResponse.ok ? await ticketsResponse.json() : [];
        
        // Fetch ticket types
        const typesResponse = await fetch('/api/forms/templates');
        const ticketTypes = typesResponse.ok ? await typesResponse.json() : [];
        
        // Fetch assignments to calculate helpdesk workload
        const assignmentsResponse = await fetch('/api/assignments');
        const assignments = assignmentsResponse.ok ? await assignmentsResponse.json() : [];
        
        // Filter users by role
        const regularUsers = users.filter(u => u.role === 'user');
        const helpdesks = users.filter(u => u.role === 'helpdesk');
        
        // Calculate ticket statistics
        const openTickets = tickets.filter(t => t.status === 'open').length;
        const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
        const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
        const closedTickets = tickets.filter(t => t.status === 'closed').length;
        
        const urgentTickets = tickets.filter(t => t.priority === 'urgent').length;
        const highPriorityTickets = tickets.filter(t => t.priority === 'high').length;
        const pendingReviewTickets = tickets.filter(t => t.priority === 'pending').length;
        
        // Calculate helpdesk workloads
        const helpdeskWorkloads = helpdesks.map(helpdesk => {
          const helpdeskAssignments = assignments.filter(a => a.helpdesk_id === helpdesk.id);
          const helpdeskTickets = tickets.filter(t => 
            helpdeskAssignments.some(a => a.user_id === t.submitted_by)
          );
          
          return {
            id: helpdesk.id,
            name: helpdesk.name,
            assignedUsers: helpdeskAssignments.length,
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
        
        setStatistics({
          totalUsers: regularUsers.length,
          totalHelpdesks: helpdesks.length,
          totalTickets: tickets.length,
          openTickets,
          inProgressTickets,
          resolvedTickets,
          closedTickets,
          urgentTickets,
          highPriorityTickets,
          pendingReviewTickets,
          helpdesks: helpdeskWorkloads,
          ticketTypes: formUsage
        });
      } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
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
        
        // Add debugging console log
        console.log("Fetching tickets for admin dashboard...");
        
        // Fetch all tickets
        const ticketsResponse = await fetch('/api/forms/submissions');
        if (!ticketsResponse.ok) {
          console.error("Error response:", await ticketsResponse.text());
          throw new Error('Failed to fetch tickets');
        }
        
        const tickets = await ticketsResponse.json();
        console.log("Fetched tickets for admin:", tickets.length);
        
        // Get recent tickets (last 5)
        const recent = [...tickets].sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        ).slice(0, 5);
        setRecentTickets(recent);
        
        // Get assignments to identify unassigned tickets
        const assignmentsResponse = await fetch('/api/assignments');
        if (!assignmentsResponse.ok) throw new Error('Failed to fetch assignments');
        const assignments = await assignmentsResponse.json();
        
        // Create a mapping of users to helpdesks
        const userAssignments = {};
        assignments.forEach(a => {
          userAssignments[a.user_id] = a.helpdesk_id;
        });
        
        // Filter for unassigned tickets (tickets whose submitters are not assigned to helpdesk)
        const unassigned = tickets.filter(ticket => 
          !userAssignments[ticket.submitted_by] && ticket.status !== 'closed' && ticket.status !== 'resolved'
        );
        setUnassignedTickets(unassigned);
        
        // Fetch available helpdesks for assignment
        const usersResponse = await fetch('/api/chat');
        if (usersResponse.ok) {
          const users = await usersResponse.json();
          setHelpdesks(users.filter(u => u.role === 'helpdesk'));
        }
      } catch (error) {
        console.error("Error fetching tickets:", error);
      } finally {
        setLoadingTickets(false);
      }
    };
    
    fetchRecentTickets();
    
    // Set up polling to check for new tickets every 60 seconds
    const intervalId = setInterval(fetchRecentTickets, 60000);
    return () => clearInterval(intervalId);
  }, [isAuthenticated, user]);
  
  // Fetch users, helpdestk staff and assignments
  useEffect(() => {
    const fetchUsersAndAssignments = async () => {
      if (!isAuthenticated || !user || user.role !== 'admin') return;
      
      try {
        setLoadingUsers(true);
        
        // Fetch all users
        const usersResponse = await fetch('/api/chat');
        if (!usersResponse.ok) throw new Error('Failed to fetch users');
        const allUsers = await usersResponse.json();
        
        // Separate regular users and helpdesk staff
        const regularUsers = allUsers.filter(u => u.role === 'user');
        const helpdesks = allUsers.filter(u => u.role === 'helpdesk');
        
        setUsers(regularUsers);
        setHelpdeskStaff(helpdesks);
        
        // Fetch assignments to create user-helpdesk mapping
        const assignmentsResponse = await fetch('/api/assignments');
        if (!assignmentsResponse.ok) throw new Error('Failed to fetch assignments');
        const assignments = await assignmentsResponse.json();
        
        // Create a mapping of user_id to helpdesk_id
        const assignmentMap = {};
        assignments.forEach(a => {
          assignmentMap[a.user_id] = a.helpdesk_id;
        });
        
        setUserAssignments(assignmentMap);
      } catch (error) {
        console.error("Error fetching users and assignments:", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    
    fetchUsersAndAssignments();
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
      
      // Create assignment between user and helpdesk
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedTicket.submitted_by,
          helpdeskId: selectedHelpdesk
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create assignment');
      }
      
      // Remove ticket from unassigned list
      setUnassignedTickets(prev => prev.filter(t => t.id !== selectedTicket.id));
      
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

  // Handle assigning user to helpdesk
  const handleAssignUser = async (userId, helpdeskId) => {
    if (isAssigning) return;
    
    try {
      setIsAssigning(true);
      
      if (helpdeskId) {
        // Assign user to helpdesk
        const response = await fetch('/api/assignments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            helpdeskId
          }),
        });
        
        if (!response.ok) throw new Error('Failed to assign user');
        
        // Update local state
        setUserAssignments(prev => ({
          ...prev,
          [userId]: helpdeskId
        }));
      } else {
        // Remove assignment
        const response = await fetch(`/api/assignments?userId=${userId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to remove assignment');
        
        // Update local state
        setUserAssignments(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      }
      
      setNotification({
        type: 'success',
        message: helpdeskId ? 'User assigned successfully' : 'Assignment removed successfully'
      });
    } catch (error) {
      console.error("Error assigning user:", error);
      setNotification({
        type: 'error',
        message: error.message
      });
    } finally {
      setIsAssigning(false);
      
      // Clear notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    }
  };
  
  // Filter users by assigned helpdesk
  const filteredUsers = users.filter(user => {
    if (currentHelpdeskFilter === 'all') return true;
    if (currentHelpdeskFilter === 'unassigned') return !userAssignments[user.id];
    return userAssignments[user.id] === currentHelpdeskFilter;
  });
  
  // Get users assigned to a specific helpdesk
  const getUsersAssignedTo = (helpdeskId) => {
    return users.filter(user => userAssignments[user.id] === helpdeskId);
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
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Welcome back, {user?.name}!
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              onClick={() => router.push('/admin/ticket-forms')}
              variant="info"
              size="md"
            >
              Ticket Forms
            </Button>
            <Button 
              onClick={() => router.push('/admin/tickets')}
              variant="success"
              size="md"
            >
              All Tickets
            </Button>
            <Button 
              onClick={() => setShowUserManagement(!showUserManagement)}
              variant={showUserManagement ? "primary" : "warning"}
              size="md"
            >
              {showUserManagement ? "Show Statistics" : "User Management"}
            </Button>
            <Button onClick={() => logout()} variant="danger" size="md">
              Logout
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
      
      {showUserManagement ? (
        // User Management Section
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User & Helpdesk Management</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Helpdesk Staff</h3>
            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : helpdeskStaff.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                No helpdesk staff found. Create helpdesk accounts first.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {helpdeskStaff.map(staff => (
                  <HelpdeskCard 
                    key={staff.id}
                    staffData={staff}
                    assignedUsers={getUsersAssignedTo(staff.id)}
                  />
                ))}
              </div>
            )}
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">Regular Users</h3>
              
              <div className="flex items-center">
                <span className="text-sm mr-2">Filter by:</span>
                <select
                  value={currentHelpdeskFilter}
                  onChange={(e) => setCurrentHelpdeskFilter(e.target.value)}
                  className="border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2"
                >
                  <option value="all">All Users</option>
                  <option value="unassigned">Unassigned</option>
                  {helpdeskStaff.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}'s Users
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                No users match the selected filter.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map(userData => (
                  <UserCard
                    key={userData.id}
                    userData={userData}
                    helpdeskStaff={helpdeskStaff}
                    currentAssignment={userAssignments[userData.id]}
                    onAssign={handleAssignUser}
                    isAssigning={isAssigning}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Statistics Dashboard Section - your existing statistics code
        <>
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard 
              title="Total Users" 
              value={statistics.totalUsers}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
              color="border-blue-500"
            />
            <StatCard 
              title="Helpdesk Staff" 
              value={statistics.totalHelpdesks}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
              color="border-indigo-500"
            />
            <StatCard 
              title="Total Tickets" 
              value={statistics.totalTickets}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              color="border-green-500"
            />
            <StatCard 
              title="Urgent Tickets" 
              value={statistics.urgentTickets}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
              color="border-red-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Ticket Status Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Ticket Status Distribution</h2>
              <div className="space-y-4">
                <ChartBar 
                  label="Open" 
                  value={statistics.openTickets} 
                  maxValue={maxTicketsValue}
                  color="bg-blue-500" 
                />
                <ChartBar 
                  label="In Progress" 
                  value={statistics.inProgressTickets} 
                  maxValue={maxTicketsValue}
                  color="bg-yellow-500" 
                />
                <ChartBar 
                  label="Resolved" 
                  value={statistics.resolvedTickets} 
                  maxValue={maxTicketsValue}
                  color="bg-green-500" 
                />
                <ChartBar 
                  label="Closed" 
                  value={statistics.closedTickets} 
                  maxValue={maxTicketsValue}
                  color="bg-gray-500" 
                />
              </div>
            </div>

            {/* Ticket Priority Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Ticket Priority Distribution</h2>
              <div className="space-y-4">
                <ChartBar 
                  label="Pending Review" 
                  value={statistics.pendingReviewTickets} 
                  maxValue={maxPriorityValue}
                  color="bg-gray-500" 
                />
                <ChartBar 
                  label="High Priority" 
                  value={statistics.highPriorityTickets} 
                  maxValue={maxPriorityValue}
                  color="bg-yellow-500" 
                />
                <ChartBar 
                  label="Urgent" 
                  value={statistics.urgentTickets} 
                  maxValue={maxPriorityValue}
                  color="bg-red-500" 
                />
              </div>
            </div>
          </div>
          
          {/* Helpdesk Performance Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Helpdesk Staff Performance</h2>
            
            {statistics.helpdesks.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No helpdesk staff available.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Staff
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Assigned Users
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Total Tickets
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Open Tickets
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Resolved
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Performance
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Workload
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                    {statistics.helpdesks.map(helpdesk => (
                      <tr key={helpdesk.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {helpdesk.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {helpdesk.assignedUsers}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {helpdesk.totalTickets}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {helpdesk.openTickets}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {helpdesk.resolvedTickets}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="mr-2 text-sm font-medium">
                              {helpdesk.performance}%
                            </span>
                            <div className="w-24 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                              <div className="h-2.5 bg-green-500 rounded-full" style={{ width: `${helpdesk.performance}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-24 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                            <div 
                              className="h-2.5 bg-blue-500 rounded-full" 
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
          
          {/* Popular Form Types */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            {/* ...existing code... */}
          </div>
        </>
      )}
    </div>
  );
}