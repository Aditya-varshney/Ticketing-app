'use client';

import { useState, useEffect, useRef } from 'react';
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

export default function UserDetailPage({ params }) {
  const userId = params.id;
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [userData, setUserData] = useState(null);
  const [userTickets, setUserTickets] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    // Check if user is authenticated and has the correct role
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    } else if (!loading && user?.role !== 'helpdesk') {
      router.replace(`/${user?.role}`);
    }
  }, [loading, isAuthenticated, user, router]);
  
  // Fetch user details
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!isAuthenticated || !userId) return;
      
      try {
        setLoadingUser(true);
        
        // Check if the user is assigned to this helpdesk
        const assignmentsResponse = await fetch(`/api/assignments?helpdeskId=${user.id}`);
        if (!assignmentsResponse.ok) {
          throw new Error('Failed to fetch assignments');
        }
        
        const assignments = await assignmentsResponse.json();
        const isAssigned = assignments.some(a => a.user_id === userId);
        
        if (!isAssigned) {
          router.replace('/helpdesk');
          return;
        }
        
        // If assigned, get user data
        const userDataResponse = await fetch(`/api/chat`);
        if (userDataResponse.ok) {
          const contacts = await userDataResponse.json();
          const userData = contacts.find(contact => contact.id === userId);
          
          if (userData) {
            setUserData(userData);
          } else {
            throw new Error('User not found');
          }
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
      } finally {
        setLoadingUser(false);
      }
    };
    
    fetchUserDetails();
  }, [isAuthenticated, userId, user, router]);
  
  // Fetch user tickets
  useEffect(() => {
    const fetchUserTickets = async () => {
      if (!isAuthenticated || !userId) return;
      
      try {
        setLoadingTickets(true);
        const response = await fetch(`/api/helpdesk/tickets`);
        
        if (response.ok) {
          const allTickets = await response.json();
          // Filter tickets for this specific user
          const userTickets = allTickets.filter(ticket => ticket.submitted_by === userId);
          setUserTickets(userTickets);
        }
      } catch (error) {
        console.error('Error fetching user tickets:', error);
      } finally {
        setLoadingTickets(false);
      }
    };
    
    fetchUserTickets();
  }, [isAuthenticated, userId]);
  
  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!isAuthenticated || !userId) return;
      
      try {
        setLoadingMessages(true);
        const response = await fetch(`/api/chat/messages?userId=${userId}`);
        
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
    
    fetchMessages();
  }, [isAuthenticated, userId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId) return;
    
    try {
      setSendingMessage(true);
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage,
          receiverId: userId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      setNewMessage('');
      
      // Fetch latest messages
      const messagesResponse = await fetch(`/api/chat/messages?userId=${userId}`);
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
  
  if (loading || loadingUser) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!userData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            This user is not assigned to you or does not exist.
          </p>
          <Button onClick={() => router.push('/helpdesk')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Avatar 
              src={userData.avatar} 
              alt={userData.name}
              size="lg"
            />
            <div>
              <h1 className="text-2xl font-bold mb-1">{userData.name}</h1>
              <p className="text-gray-600 dark:text-gray-300">
                {userData.email}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => router.push('/helpdesk')}
            variant="outline"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Tickets Section */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">User's Tickets</h2>
            
            {loadingTickets ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : userTickets.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                This user has not submitted any tickets yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        ID
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
                    {userTickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {ticket.id}
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
        
        {/* Chat Section */}
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow h-[600px] flex flex-col">
            <div className="p-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold">Chat with {userData.name}</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 my-8">
                  <p>No messages yet</p>
                  <p className="text-sm mt-1">Start the conversation by sending a message</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map(message => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.sender === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[75%] rounded-lg p-3 ${
                          message.sender === user.id 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600'
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
          </div>
        </div>
      </div>
    </div>
  );
}
