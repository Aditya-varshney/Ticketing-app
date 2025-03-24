'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';

export default function HelpdeskTicketDetailsPage({ params }) {
  const ticketId = params.id;
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [ticket, setTicket] = useState(null);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notification, setNotification] = useState(null);
  const [status, setStatus] = useState('open');
  
  // Chat state variables
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
  
  // Extract fetchTicket function outside of useEffect
  const fetchTicket = async () => {
    if (!isAuthenticated || !ticketId) return;
    
    try {
      setLoadingTicket(true);
      const response = await fetch(`/api/forms/submissions?id=${ticketId}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch ticket details');
      }
      
      const data = await response.json();
      setTicket(data);
      setStatus(data.status || 'open');
      
      // Once we have the ticket, fetch messages with the submitter
      if (data.submitter?.id) {
        fetchMessages(data.submitter.id);
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
  
  useEffect(() => {
    // Fetch ticket details when component mounts
    if (isAuthenticated && ticketId) {
      fetchTicket();
    }
  }, [isAuthenticated, ticketId, user]);
  
  // Function to fetch messages
  const fetchMessages = async (submitterId) => {
    try {
      setLoadingMessages(true);
      const response = await fetch(`/api/chat/messages?userId=${submitterId}&ticketId=${ticketId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setNotification({
        type: 'error',
        message: 'Could not load chat messages'
      });
    } finally {
      setLoadingMessages(false);
    }
  };
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
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
      fetchMessages(ticket.submitter.id);
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
  
  const handleUpdateTicket = async () => {
    try {
      setUpdating(true);
      
      const response = await fetch(`/api/forms/submissions?id=${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        const messageResponse = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: "I've marked this ticket as resolved. Please let me know if you need anything else.",
            receiverId: ticket.submitter.id,
            ticketId: ticketId
          }),
        });
        
        if (messageResponse.ok) {
          fetchMessages(ticket.submitter.id);
        }
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
  
  // Quick replies functionality
  const quickReplies = [
    "I'll look into this issue right away.",
    "Could you provide more details about the problem?",
    "Thank you for reporting this. I'm working on it now.",
    "This has been resolved. Please test and confirm.",
  ];
  
  const sendQuickReply = async (message) => {
    if (!ticket?.submitter?.id) return;
    
    try {
      setSendingMessage(true);
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          receiverId: ticket.submitter.id,
          ticketId: ticketId
        }),
      });
      
      // Refresh messages
      fetchMessages(ticket.submitter.id);
    } catch (error) {
      console.error('Error sending quick reply:', error);
      setNotification({
        type: 'error',
        message: 'Failed to send message'
      });
    } finally {
      setSendingMessage(false);
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
            The requested ticket could not be found or you don't have permission to view it.
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
          <div>
            <h1 className="text-2xl font-bold mb-2">Ticket Details</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Ticket ID: {ticketId}
            </p>
          </div>
          <Button 
            onClick={() => router.push('/helpdesk')}
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

      {loadingTicket ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : ticket ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Chat Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Chat with {ticket.submitter?.name}</h2>
                <div className="flex items-center space-x-4">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md dark:bg-gray-700 dark:border-gray-600"
                    disabled={updating}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <Button
                    onClick={handleUpdateTicket}
                    disabled={updating || status === ticket.status}
                  >
                    {updating ? 'Updating...' : 'Update Status'}
                  </Button>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg h-[500px] flex flex-col">
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
                    <div className="space-y-4">
                      {messages.map(message => (
                        <div 
                          key={message.id}
                          className={`flex ${message.sender === user.id ? 'justify-end' : 'justify-start'}`}
                        >
                          {message.sender !== user.id && (
                            <div className="flex-shrink-0 mr-2 mt-1">
                              <Avatar 
                                src={message.senderUser?.avatar} 
                                alt={message.senderUser?.name || "User"} 
                                size="sm" 
                              />
                            </div>
                          )}
                          <div className="flex flex-col max-w-[75%]">
                            {message.sender !== user.id && (
                              <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                                <span className="font-semibold">{message.senderUser?.name || 'Unknown'}</span>
                                <span className="ml-1">({message.senderUser?.role || 'unknown'})</span>
                              </div>
                            )}
                            <div 
                              className={`rounded-lg p-3 ${
                                message.sender === user.id 
                                  ? 'bg-blue-500 text-white ml-auto' 
                                  : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600'
                              }`}
                            >
                              <div className="text-sm">{message.content}</div>
                            </div>
                            <div className={`text-xs mt-1 ${
                              message.sender === user.id 
                                ? 'text-gray-500 dark:text-gray-400 text-right' 
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {message.sender === user.id ? (
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

                <form onSubmit={handleSendMessage} className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      disabled={sendingMessage}
                    />
                    <Button
                      type="submit"
                      disabled={!newMessage.trim() || sendingMessage}
                    >
                      {sendingMessage ? 'Sending...' : 'Send'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Ticket Information</h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={fetchTicket}
                  disabled={loadingTicket}
                >
                  {loadingTicket ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                  <dd className="mt-1">
                    <StatusBadge status={ticket.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Priority</dt>
                  <dd className="mt-1">
                    <PriorityBadge priority={ticket.priority} />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {new Date(ticket.created_at).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned To</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {ticket.assignment && ticket.assignment.helpdesk ? (
                      <div className="flex items-center">
                        <Avatar
                          name={ticket.assignment.helpdesk.name}
                          size="sm"
                          className="mr-2"
                        />
                        <span>{ticket.assignment.helpdesk.name}</span>
                      </div>
                    ) : (
                      <span className="text-yellow-600 dark:text-yellow-400">Unassigned</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Replies</h2>
              <div className="space-y-2">
                {quickReplies.map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => sendQuickReply(reply)}
                    disabled={sendingMessage}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>

            {ticket.priority && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Priority
                </h3>
                <PriorityBadge priority={ticket.priority} className="text-sm" />
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Submitted By
              </h3>
              <div className="flex items-center">
                <Avatar 
                  src={null} 
                  alt={ticket.submitter?.name || "User"} 
                  size="sm" 
                  className="mr-2"
                />
                <div>
                  <p className="text-sm font-medium">{ticket.submitter?.name || "Unknown"}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {ticket.submitter?.email || "Unknown email"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Submission Date
              </h3>
              <p className="text-sm">
                {new Date(ticket.created_at).toLocaleString()}
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Last Updated
              </h3>
              <p className="text-sm">
                {new Date(ticket.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Ticket not found</p>
        </div>
      )}
    </div>
  );
}
