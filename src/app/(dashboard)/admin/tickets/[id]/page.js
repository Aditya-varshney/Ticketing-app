'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';

export default function AdminTicketDetailsPage({ params }) {
  const ticketId = params.id;
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [ticket, setTicket] = useState(null);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notification, setNotification] = useState(null);
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('open');
  
  // Chat state
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
    } else if (!loading && user?.role !== 'admin') {
      router.replace(`/${user?.role}`);
    }
  }, [loading, isAuthenticated, user, router]);
  
  useEffect(() => {
    // Fetch ticket details
    const fetchTicket = async () => {
      if (!isAuthenticated || !ticketId) return;
      
      try {
        setLoadingTicket(true);
        const response = await fetch(`/api/forms/submissions?id=${ticketId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch ticket details');
        }
        
        const data = await response.json();
        setTicket(data);
        setPriority(data.priority || 'medium');
        setStatus(data.status || 'open');
        
        // Now that we have the ticket data, fetch messages
        if (data.submitter?.id) {
          fetchMessages();
        }
      } catch (error) {
        console.error('Error fetching ticket:', error);
        setNotification({
          type: 'error',
          message: 'Could not load ticket details. Please try again later.'
        });
      } finally {
        setLoadingTicket(false);
      }
    };
    
    fetchTicket();
  }, [isAuthenticated, ticketId]);
  
  // Fetch messages for this ticket
  const fetchMessages = async () => {
    try {
      setLoadingMessages(true);
      const response = await fetch(`/api/chat/messages?ticketId=${ticketId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setNotification({
        type: 'error',
        message: 'Could not load messages. Please try again later.'
      });
    } finally {
      setLoadingMessages(false);
    }
  };
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleUpdateTicket = async () => {
    try {
      setUpdating(true);
      
      const response = await fetch(`/api/forms/submissions?id=${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priority,
          status
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update ticket');
      }
      
      setNotification({
        type: 'success',
        message: 'Ticket updated successfully'
      });
      
      // Refresh the ticket data
      const updatedTicketResponse = await fetch(`/api/forms/submissions?id=${ticketId}`);
      if (updatedTicketResponse.ok) {
        const updatedTicket = await updatedTicketResponse.json();
        setTicket(updatedTicket);
      }
      
      // If status was changed to resolved, send automatic message
      if (status === 'resolved' && ticket.status !== 'resolved') {
        await handleSendStatusUpdateMessage();
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to update ticket'
      });
    } finally {
      setUpdating(false);
      
      // Clear notification after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !ticket?.submitter?.id) return;
    
    try {
      setSendingMessage(true);
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage,
          receiverId: ticket.submitter.id,
          ticketId: ticketId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      setNewMessage('');
      // Refresh messages
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      setNotification({
        type: 'error',
        message: 'Failed to send message'
      });
    } finally {
      setSendingMessage(false);
    }
  };
  
  // Send automatic status update message
  const handleSendStatusUpdateMessage = async () => {
    if (!ticket?.submitter?.id) return;
    
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: `Ticket status has been updated to: ${status.toUpperCase()}`,
          receiverId: ticket.submitter.id,
          ticketId: ticketId
        }),
      });
      
      // No need to refresh messages, as handleUpdateTicket will call it
    } catch (error) {
      console.error('Error sending status update message:', error);
    }
  };
  
  if (loading || loadingTicket) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!ticket) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Ticket Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            The requested ticket could not be found.
          </p>
          <Button onClick={() => router.push('/admin/tickets')}>
            Back to Tickets
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Ticket Details</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Ticket ID: {ticket.id}
            </p>
          </div>
          <div>
            <Button 
              onClick={() => router.push('/admin/tickets')}
              variant="outline"
            >
              Back to All Tickets
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {ticket.template?.name || 'Ticket Information'}
            </h2>
            
            {notification && (
              <div className={`mb-6 p-4 rounded-md ${
                notification.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {notification.message}
              </div>
            )}
            
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <dl className="divide-y divide-gray-200 dark:divide-gray-700">
                {ticket.form_data && Object.entries(ticket.form_data).map(([key, value]) => (
                  <div key={key} className="py-3 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {key}
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-white col-span-2">
                      {typeof value === 'string' && (value.length > 100 || value.includes('\n')) ? (
                        <div className="whitespace-pre-wrap">{value}</div>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">User Information</h2>
            <dl className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="py-3 grid grid-cols-3">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</dt>
                <dd className="text-sm text-gray-900 dark:text-white col-span-2">
                  {ticket.submitter?.name || 'Unknown'}
                </dd>
              </div>
              <div className="py-3 grid grid-cols-3">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                <dd className="text-sm text-gray-900 dark:text-white col-span-2">
                  {ticket.submitter?.email || 'Unknown'}
                </dd>
              </div>
              <div className="py-3 grid grid-cols-3">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Submitted On</dt>
                <dd className="text-sm text-gray-900 dark:text-white col-span-2">
                  {new Date(ticket.created_at).toLocaleString()}
                </dd>
              </div>
              <div className="py-3 grid grid-cols-3">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</dt>
                <dd className="text-sm text-gray-900 dark:text-white col-span-2">
                  {new Date(ticket.updated_at).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
          
          {/* Chat Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Ticket Communication</h2>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg h-[400px] flex flex-col">
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                <div className="text-sm font-medium">
                  <span className="text-blue-600 dark:text-blue-400">Admin View:</span> All communications for this ticket
                </div>
              </div>
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
                        className={`flex ${message.sender === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        {message.sender !== user?.id && (
                          <div className="flex-shrink-0 mr-2 mt-1">
                            <Avatar 
                              src={message.senderUser?.avatar} 
                              alt={message.senderUser?.name || "User"} 
                              size="sm" 
                            />
                          </div>
                        )}
                        <div className="flex flex-col max-w-[70%]">
                          {message.sender !== user?.id && (
                            <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-semibold">{message.senderUser?.name || 'Unknown'}</span>
                              <span className="ml-1">({message.senderUser?.role || 'user'})</span>
                            </div>
                          )}
                          <div 
                            className={`rounded-lg p-3 ${
                              message.sender === user?.id 
                                ? 'bg-blue-500 text-white ml-auto' 
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                            }`}
                          >
                            <div className="text-sm">{message.content}</div>
                          </div>
                          <div className={`text-xs mt-1 ${
                            message.sender === user?.id 
                              ? 'text-gray-500 dark:text-gray-400 text-right' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {message.sender === user?.id ? (
                              <span>You • {new Date(message.created_at).toLocaleString()}</span>
                            ) : (
                              <span>{new Date(message.created_at).toLocaleString()}</span>
                            )}
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
                  placeholder="Type a message to the user..."
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={sendingMessage || !ticket?.submitter?.id}
                />
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
                  disabled={!newMessage.trim() || sendingMessage || !ticket?.submitter?.id}
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
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-fit">
          <h2 className="text-xl font-semibold mb-6">Ticket Management</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="pending">Pending Review</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assignment
              </label>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
                {ticket.assignment ? (
                  <div>
                    <p className="text-sm font-medium">
                      Assigned to: {ticket.assignment.helpdesk?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Assigned on: {ticket.assignment.assigned_at ? new Date(ticket.assignment.assigned_at).toLocaleString() : 'Unknown date'}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Not assigned to any helpdesk staff yet
                  </p>
                )}
              </div>
            </div>
            
            <Button
              onClick={handleUpdateTicket}
              disabled={updating}
              className="w-full"
            >
              {updating ? 'Updating...' : 'Update Ticket'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
