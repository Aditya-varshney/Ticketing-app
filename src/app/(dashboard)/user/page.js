'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import Link from 'next/link';
import TicketMessageInput from '@/components/chat/TicketMessageInput';
import TicketMessageItem from '@/components/chat/TicketMessageItem';
import Logo from '@/components/ui/Logo';

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
  const [startTime, setStartTime] = useState(null);
  const [notification, setNotification] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'closed'
  
  // Store the start time to measure loading duration - client-side only
  useEffect(() => {
    setStartTime(Date.now());
  }, []);
  
  // Check for ticketSubmitted query parameter in URL for showing success notification
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const submitted = params.get('ticketSubmitted');
      
      if (submitted === 'true') {
        setNotification({
          type: 'success',
          message: 'Your ticket has been submitted successfully!'
        });
        
        // Clear the parameter from URL after showing notification
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        // Clear notification after 5 seconds
        setTimeout(() => {
          setNotification(null);
        }, 5000);
      }
    }
  }, []);
  
  // Add safety timeout to prevent infinite loading
  useEffect(() => {
    console.log("Auth status:", { loading, isAuthenticated, user: user?.id });
    
    // Safety timeout to prevent user from being stuck in loading
    const safetyTimeout = setTimeout(() => {
      if (loadingTickets) {
        console.log("Safety timeout triggered - forcing loadingTickets to false");
        setLoadingTickets(false);
      }
      if (loadingHelpdesk) {
        console.log("Safety timeout triggered - forcing loadingHelpdesk to false");
        setLoadingHelpdesk(false);
      }
    }, 5000); // 5 seconds timeout
    
    return () => clearTimeout(safetyTimeout);
  }, [loading, isAuthenticated, user, loadingTickets, loadingHelpdesk]);
  
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
      console.log("User not authenticated, redirecting to login");
      router.replace('/login');
    } else if (!loading && user?.role !== 'user') {
      console.log(`User has incorrect role: ${user?.role}, redirecting`);
      router.replace(`/${user?.role}`);
    }
  }, [loading, isAuthenticated, user, router]);
  
  useEffect(() => {
    // Fetch user's tickets
    const fetchTickets = async () => {
      if (!isAuthenticated) return;
      
      console.log("Fetching tickets...");
      try {
        setLoadingTickets(true);
        const response = await fetch('/api/forms/submissions', {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error response from tickets API:", errorText);
          console.error("Status code:", response.status);
          throw new Error(`Failed to fetch tickets: ${response.status} - ${errorText.substring(0, 100)}`);
        }
        
        const data = await response.json();
        console.log(`Fetched ${data.length} tickets`);
        setTickets(data);
        
        // Only fetch helpdesk assignments after tickets are loaded (staggered loading)
        if (selectedTicket) {
          setTimeout(() => fetchHelpdesk(), 100);
        }
      } catch (error) {
        console.error('Error fetching tickets:', error);
      } finally {
        setLoadingTickets(false);
        console.log("Ticket loading completed");
      }
    };
    
    fetchTickets();
  }, [isAuthenticated, user]);
  
  // Update the useEffect for fetching the helpdesk assignment to also fetch messages
  const fetchHelpdesk = async () => {
    if (!isAuthenticated || !selectedTicket?.id) return;
    
    console.log("Fetching helpdesk assignment for ticket:", selectedTicket.id);
    try {
      setLoadingHelpdesk(true);
      const response = await fetch(`/api/assignments?ticketId=${selectedTicket.id}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response from assignments API:", errorText);
        console.error("Status code:", response.status);
        throw new Error(`Failed to fetch ticket assignment: ${response.status} - ${errorText.substring(0, 100)}`);
      }
      
      const assignment = await response.json();
      console.log("Assignment data:", assignment);
      
      // If there's a helpdesk assigned to this ticket
      if (assignment?.helpdesk) {
        setHelpdeskAssigned(assignment.helpdesk);
        console.log("Helpdesk assigned:", assignment.helpdesk.id);
      } else {
        setHelpdeskAssigned(null);
        console.log("No helpdesk assigned to this ticket");
      }
      
      // Always fetch messages when a ticket is selected, regardless of helpdesk assignment
      fetchMessages();
    } catch (error) {
      console.error('Error fetching ticket helpdesk assignment:', error);
      setHelpdeskAssigned(null);
      // Still try to fetch messages even if helpdesk assignment fails
      fetchMessages();
    } finally {
      setLoadingHelpdesk(false);
      console.log("Helpdesk loading completed");
    }
  };
  
  // Function to fetch messages
  const fetchMessages = async () => {
    if (!selectedTicket?.id || !user?.id) return;
    
    try {
      setLoadingMessages(true);
      console.log(`Fetching messages for ticket: ${selectedTicket.id}`);
      
      const response = await fetch(`/api/chat/messages?userId=${user.id}&ticketId=${selectedTicket.id}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response from messages API:", errorText);
        console.error("Status code:", response.status);
        throw new Error(`Failed to fetch messages: ${response.status} - ${errorText.substring(0, 100)}`);
      }
      
      const data = await response.json();
      console.log(`Fetched ${data.length} messages for ticket ${selectedTicket.id}`);
      setMessages(data);
      
      // Scroll to bottom after messages load
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedTicket) {
      fetchHelpdesk();
    } else {
      // Clear messages if no ticket is selected
      setMessages([]);
      setHelpdeskAssigned(null);
    }
  }, [isAuthenticated, selectedTicket, user?.id]);
  
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
  
  // Add a function to filter tickets based on active tab
  const getFilteredTickets = () => {
    // First filter by search term if exists
    let filtered = tickets.filter(ticket => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (ticket.template?.name || '').toLowerCase().includes(searchLower) ||
        (ticket.priority || '').toLowerCase().includes(searchLower) ||
        (ticket.status || '').toLowerCase().includes(searchLower)
      );
    });
    
    // Then filter by active/closed status
    if (activeTab === 'active') {
      filtered = filtered.filter(ticket => ticket.status !== 'closed');
    } else if (activeTab === 'closed') {
      filtered = filtered.filter(ticket => ticket.status === 'closed');
    }
    
    return filtered;
  };
  
  // Update the getSortedTickets function to use the filtered tickets
  const getSortedTickets = () => {
    return getFilteredTickets().sort((a, b) => {
      let valueA, valueB;
      
      switch (sortField) {
        case 'priority':
          const priorityOrder = { pending: 0, low: 1, medium: 2, high: 3, urgent: 4 };
          valueA = priorityOrder[a.priority] || 0;
          valueB = priorityOrder[b.priority] || 0;
          break;
        case 'created_at':
        default:
          valueA = new Date(a.created_at);
          valueB = new Date(b.created_at);
          break;
      }
      
      if (sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  };
  
  // Handle sending a message
  const handleSendMessage = async (content, attachment = null) => {
    if ((!content.trim() && !attachment) || !helpdeskAssigned || !selectedTicket) return;
    
    try {
      setSendingMessage(true);
      
      // Prepare message data
      const messageData = {
        content: content || 'Attachment',
        userId: helpdeskAssigned.id,
        ticketId: selectedTicket.id
      };
      
      // Add attachment data if provided
      if (attachment) {
        messageData.attachmentUrl = attachment.url;
        messageData.attachmentType = attachment.type;
        messageData.attachmentName = attachment.name;
      }
      
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(messageData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response from send message API:", errorText);
        console.error("Status code:", response.status);
        throw new Error(`Failed to send message: ${response.status} - ${errorText.substring(0, 100)}`);
      }
      
      // Fetch latest messages
      const messagesResponse = await fetch(`/api/chat/messages?userId=${user.id}&ticketId=${selectedTicket.id}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!messagesResponse.ok) {
        const errorText = await messagesResponse.text();
        console.error("Error refreshing messages:", errorText);
        console.error("Status code:", messagesResponse.status);
        throw new Error(`Failed to refresh messages: ${messagesResponse.status} - ${errorText.substring(0, 100)}`);
      }
      
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

  // Modify the loading condition to handle authentication issues better
  if (loading || loadingTickets || loadingHelpdesk) {
    console.log("Loading state:", { authLoading: loading, loadingTickets, loadingHelpdesk });
    return (
      <div className="h-screen flex items-center justify-center flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        
        {/* Add a button that forces authentication to complete after 8 seconds */}
        {startTime && Date.now() - startTime > 8000 && (
          <button 
            onClick={() => {
              setLoadingTickets(false);
              setLoadingHelpdesk(false);
            }}
            className="px-4 py-2 mt-2 bg-blue-500 text-white rounded-md"
          >
            Continue anyway
          </button>
        )}
      </div>
    );
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="container mx-auto px-0 py-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 mx-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <Logo size="lg" className="text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold mb-1">User Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-300">
                {user?.name ? `Welcome back, ${user.name}!` : 'Loading user information...'}
              </p>
            </div>
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
          </div>
        </div>
      </div>

      {notification && (
        <div className={`mb-4 p-4 mx-4 rounded-md ${
          notification.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' 
            : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="flex h-[calc(100vh-140px)] mx-4">
        {/* Left side - Chat section */}
        <div className="w-1/2 pr-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow h-full flex flex-col">
            <div className="p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold">
                {selectedTicket ? (
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <span className="mr-2">Support Chat</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                        {selectedTicket.template?.name} (#{selectedTicket.id.substring(0, 8)})
                      </span>
                    </div>
                    {helpdeskAssigned ? (
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-normal mt-1">
                        Currently assigned to: {helpdeskAssigned.name}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-normal mt-1">
                        Not assigned to any helpdesk yet
                      </div>
                    )}
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
            ) : (
              <>
                <div className="flex-grow overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
                  {loadingMessages ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                      {!helpdeskAssigned ? (
                        <>
                          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4 w-full max-w-md">
                            <div className="flex items-start">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 dark:text-yellow-400 mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <div>
                                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Ticket Awaiting Assignment</h3>
                                <div className="mt-1 text-sm text-yellow-700 dark:text-yellow-200">
                                  This ticket has not been assigned to a helpdesk agent yet. You'll be able to chat once an administrator assigns this ticket.
                                </div>
                              </div>
                            </div>
                          </div>
                          <svg className="w-16 h-16 text-yellow-300 dark:text-yellow-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <p className="text-gray-700 dark:text-gray-300 font-medium">Waiting for Helpdesk Assignment</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Your ticket is in queue and will be assigned to a support agent soon.
                          </p>
                        </>
                      ) : (
                        <>
                          <svg className="w-16 h-16 text-gray-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          <p className="text-gray-600 dark:text-gray-300">No messages yet</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Start the conversation by sending a message
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <TicketMessageItem 
                          key={msg.id} 
                          message={msg}
                          isCurrentUser={msg.sender === user?.id}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                <div className="border-t dark:border-gray-700 p-4">
                  {!helpdeskAssigned ? (
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2 -mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Chat will be available after a helpdesk agent is assigned
                      </p>
                    </div>
                  ) : (
                    <TicketMessageInput
                      onSendMessage={handleSendMessage}
                      disabled={sendingMessage}
                      placeholder="Type your message here..."
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Right side - Tickets section */}
        <div className="w-1/2 pl-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow h-full flex flex-col overflow-hidden">
            {/* Add tab navigation */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                className={`px-6 py-3 text-md font-medium ${
                  activeTab === 'active'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('active')}
              >
                Active Tickets
              </button>
              <button
                className={`px-6 py-3 text-md font-medium ${
                  activeTab === 'closed'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('closed')}
              >
                Closed Tickets
              </button>
            </div>
            
            <div className="p-4 border-b dark:border-gray-700">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <h2 className="text-xl font-semibold">
                  {activeTab === 'active' ? '' : ''}
                </h2>
                
                {/* Search input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearch}
                    placeholder="Search tickets..."
                    className="pl-10 pr-4 py-2 w-full md:w-64 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 hover:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 md:ml-auto">
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
            
            {tickets.length > 0 && (
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? (
                  <>
                    <span className="font-medium">{getSortedTickets().length}</span> of <span className="font-medium">
                      {activeTab === 'active' 
                        ? tickets.filter(t => t.status !== 'closed').length 
                        : tickets.filter(t => t.status === 'closed').length}
                    </span> {activeTab} tickets match your search
                  </>
                ) : (
                  <>
                    <span className="font-medium">
                      {activeTab === 'active' 
                        ? tickets.filter(t => t.status !== 'closed').length 
                        : tickets.filter(t => t.status === 'closed').length}
                    </span> {activeTab} tickets
                  </>
                )}
              </div>
            )}
            
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
            ) : getSortedTickets().length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchTerm ? (
                    <>
                      <p>No tickets match your search</p>
                      <p className="text-sm mt-2">Try using different keywords or clear the search</p>
                      <Button 
                        onClick={() => setSearchTerm('')}
                        variant="outline"
                        className="mt-4"
                      >
                        Clear Search
                      </Button>
                    </>
                  ) : (
                    <>
                      <p>No {activeTab} tickets found</p>
                      {activeTab === 'closed' ? (
                        <p className="text-sm mt-2">Tickets will appear here once they are closed</p>
                      ) : (
                        <Button 
                          onClick={handleRaiseTicket}
                          variant="primary"
                          className="mt-4"
                        >
                          Raise a New Ticket
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {getSortedTickets().map((ticket) => (
                  <div 
                    key={ticket.id} 
                    className={`border rounded-lg p-4 mb-4 transition-colors duration-200 ${
                      ticket.status === 'revoked' 
                        ? 'opacity-70 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                    } ${selectedTicket?.id === ticket.id ? 'border-2 border-blue-500 dark:border-blue-500' : ''} cursor-pointer`}
                    onClick={() => handleSelectTicket(ticket)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
                          {ticket.template?.name || 'Support Request'}
                          
                          {/* Show revoked badge inline with title */}
                          {ticket.status === 'revoked' && (
                            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              Revoked
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(ticket.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <StatusBadge status={ticket.status || 'open'} />
                        <PriorityBadge priority={ticket.priority || 'medium'} />
                      </div>
                    </div>
                    
                    {/* Additional existing ticket information */}
                    
                    <div className="mt-4 flex justify-end">
                      <Link 
                        href={`/user/tickets/${ticket.id}`}
                        className={`text-sm font-medium ${
                          ticket.status === 'revoked' 
                            ? 'text-gray-500 dark:text-gray-400' 
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ticket.status === 'revoked' ? 'View Details' : 'View & Reply'} →
                      </Link>
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
