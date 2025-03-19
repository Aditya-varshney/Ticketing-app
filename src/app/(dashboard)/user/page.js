'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';

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

export default function UserDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [helpdeskAssigned, setHelpdeskAssigned] = useState(null);
  const [loadingHelpdesk, setLoadingHelpdesk] = useState(true);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Check if user is authenticated and has the correct role
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    } else if (!loading && user?.role !== 'user') {
      router.replace(`/${user?.role}`);
    }
  }, [loading, isAuthenticated, user, router]);
  
  useEffect(() => {
    // Fetch user's tickets
    const fetchTickets = async () => {
      if (!isAuthenticated) return;
      
      try {
        setLoadingTickets(true);
        const response = await fetch('/api/forms/submissions');
        
        if (!response.ok) {
          throw new Error('Failed to fetch tickets');
        }
        
        const data = await response.json();
        setTickets(data);
      } catch (error) {
        console.error('Error fetching tickets:', error);
      } finally {
        setLoadingTickets(false);
      }
    };
    
    fetchTickets();
  }, [isAuthenticated]);
  
  // Check if user has an assigned helpdesk
  useEffect(() => {
    const fetchHelpdesk = async () => {
      if (!isAuthenticated) return;
      
      try {
        setLoadingHelpdesk(true);
        const response = await fetch('/api/chat');
        
        if (!response.ok) {
          throw new Error('Failed to fetch helpdesk assignment');
        }
        
        const contacts = await response.json();
        // If there's a helpdesk assigned, it will be in the contacts list
        const helpdesk = contacts.find(contact => contact.role === 'helpdesk');
        setHelpdeskAssigned(helpdesk || null);
      } catch (error) {
        console.error('Error fetching helpdesk:', error);
        setHelpdeskAssigned(null);
      } finally {
        setLoadingHelpdesk(false);
      }
    };
    
    fetchHelpdesk();
  }, [isAuthenticated]);
  
  // Fetch messages when a ticket is selected and helpdesk is assigned
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedTicket || !helpdeskAssigned) return;
      
      try {
        setLoadingMessages(true);
        const response = await fetch(`/api/chat/messages?userId=${helpdeskAssigned.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    };
    
    if (selectedTicket && helpdeskAssigned) {
      fetchMessages();
    }
  }, [selectedTicket, helpdeskAssigned]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleRaiseTicket = () => {
    router.push('/user/raise-ticket');
  };
  
  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
  };
  
  // Sorting handler
  const handleSort = (field) => {
    if (sortField === field) {
      // If already sorting by this field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field with default direction
      setSortField(field);
      setSortDirection(field === 'created_at' ? 'desc' : 'asc'); // Newest first for dates, lowest priority first
    }
  };
  
  // Get sorted tickets
  const getSortedTickets = () => {
    if (!tickets.length) return [];
    
    return [...tickets].sort((a, b) => {
      if (sortField === 'priority') {
        // Define priority order for sorting
        const priorityOrder = { pending: 0, low: 1, medium: 2, high: 3, urgent: 4 };
        const valA = priorityOrder[a.priority] || 0;
        const valB = priorityOrder[b.priority] || 0;
        
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      } else {
        // Date sorting
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
    });
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !helpdeskAssigned) return;
    
    try {
      setSendingMessage(true);
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage,
          receiverId: helpdeskAssigned.id
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      setNewMessage('');
      // Fetch latest messages
      const messagesResponse = await fetch(`/api/chat/messages?userId=${helpdeskAssigned.id}`);
      if (messagesResponse.ok) {
        const data = await messagesResponse.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

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

  if (loading || loadingTickets || loadingHelpdesk) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-0 py-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 mx-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-1">User Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Welcome back, {user?.name}!
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={handleRaiseTicket}
              variant="success"
              className="px-6 py-2.5 text-base font-medium"
              size="lg"
            >
              Raise a New Ticket
            </Button>
            <Button 
              onClick={() => logout()}
              variant="danger"
              size="md"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-140px)] mx-4">
        {/* Left side - Chat section */}
        <div className="w-1/2 pr-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow h-full flex flex-col">
            <div className="p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold">
                {selectedTicket ? (
                  <div className="flex items-center">
                    <span className="mr-2">Support Chat</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                      {selectedTicket.template?.name} (#{selectedTicket.id.substring(0, 8)})
                    </span>
                  </div>
                ) : (
                  "Support Chat"
                )}
              </h2>
            </div>
            
            {!selectedTicket ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p>Select a ticket to view the chat</p>
                </div>
              </div>
            ) : !helpdeskAssigned ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a5 5 0 010-7.072m3.536 9.9a9 9 0 00-12.728 0m3.536-3.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728m3.536 3.536a5 5 0 010 7.072" />
                  </svg>
                  <p>No helpdesk assigned to your account yet</p>
                  <p className="mt-2 text-sm">An admin needs to assign a helpdesk to assist you</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
                  {loadingMessages ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 my-8">
                      <p>No messages yet</p>
                      <p className="text-sm">Start the conversation by sending a message</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map(message => (
                        <div 
                          key={message.id} 
                          className={`flex ${message.sender === user.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-[70%] rounded-lg p-3 ${
                              message.sender === user.id 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                            }`}
                          >
                            <div className="text-sm">{message.content}</div>
                            <div className={`text-xs mt-1 ${
                              message.sender === user.id 
                                ? 'text-blue-100' 
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                <form onSubmit={handleSendMessage} className="border-t dark:border-gray-700 p-4 flex">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    disabled={sendingMessage}
                  />
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
                    disabled={!newMessage.trim() || sendingMessage}
                  >
                    {sendingMessage ? (
                      <span className="inline-block w-5 h-5 border-t-2 border-white rounded-full animate-spin"></span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
        
        {/* Right side - Tickets section */}
        <div className="w-1/2 pl-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow h-full flex flex-col overflow-hidden">
            <div className="p-4 border-b dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Your Support Tickets</h2>
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Sort by:</div>
                  <button 
                    onClick={() => handleSort('priority')}
                    className={`px-3 py-1 text-xs rounded-md ${
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
                    onClick={() => handleSort('created_at')}
                    className={`px-3 py-1 text-xs rounded-md ${
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
                </div>
              </div>
            </div>
            
            {tickets.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>You haven't submitted any tickets yet</p>
                  <Button 
                    onClick={handleRaiseTicket}
                    variant="primary"
                    className="mt-4"
                  >
                    Create Your First Ticket
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {getSortedTickets().map((ticket) => (
                  <div 
                    key={ticket.id} 
                    className={`p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors ${
                      selectedTicket?.id === ticket.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                    }`}
                    onClick={() => handleSelectTicket(ticket)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{ticket.template?.name || 'Unknown Form'}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {ticket.id.substring(0, 8)}...
                        </div>
                        
                        {selectedTicket?.id === ticket.id && ticket.form_data && (
                          <div className="mt-3 text-sm">
                            <div className="font-medium mb-1">Details:</div>
                            {Object.entries(ticket.form_data).slice(0, 3).map(([key, value]) => (
                              <div key={key} className="text-gray-700 dark:text-gray-300">
                                <span className="font-medium">{key}:</span> {
                                  typeof value === 'string' && value.length > 30 
                                    ? value.substring(0, 30) + '...' 
                                    : value
                                }
                              </div>
                            ))}
                            {Object.keys(ticket.form_data).length > 3 && (
                              <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                                + {Object.keys(ticket.form_data).length - 3} more fields
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {formatDate(ticket.created_at)}
                        </div>
                        <div className="flex space-x-2">
                          <StatusBadge status={ticket.status} />
                          <PriorityBadge priority={ticket.priority} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
