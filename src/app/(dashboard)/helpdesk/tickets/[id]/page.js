'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';

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
        
        // Also check if this ticket is assigned to this helpdesk
        const assignmentResponse = await fetch('/api/assignments');
        if (assignmentResponse.ok) {
          const assignments = await assignmentResponse.json();
          const isAssigned = assignments.some(
            a => a.user_id === data.submitted_by && a.helpdesk_id === user.id
          );
          
          if (!isAssigned) {
            router.replace('/helpdesk');
            return;
          }
        }
        
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
    
    fetchTicket();
  }, [isAuthenticated, ticketId, user]);
  
  // Function to fetch messages
  const fetchMessages = async (submitterId) => {
    try {
      setLoadingMessages(true);
      const response = await fetch(`/api/chat/messages?userId=${submitterId}`);
      
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
          receiverId: ticket.submitter.id
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
            receiverId: ticket.submitter.id
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
          receiverId: ticket.submitter.id
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
              Ticket ID: {ticket.id}
            </p>
          </div>
          <div>
            <Button 
              onClick={() => router.push('/helpdesk')}
              variant="outline"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left side - Chat Section (larger) */}
        <div className="md:w-2/3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow h-full flex flex-col">
            <div className="p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold">
                <div className="flex items-center">
                  <span className="mr-2">Chat with</span>
                  <Avatar 
                    src={ticket.submitter?.avatar} 
                    alt={ticket.submitter?.name || 'User'}
                    size="sm"
                    className="mr-1" 
                  />
                  <span>{ticket.submitter?.name || 'User'}</span>
                </div>
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 my-8">
                  <p>No messages yet</p>
                  <p className="text-sm mt-1">Start the conversation with {ticket.submitter?.name}</p>
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
            
            {/* Quick replies */}
            <div className="p-2 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-wrap gap-2">
              {quickReplies.map((reply, index) => (
                <button
                  key={index}
                  onClick={() => sendQuickReply(reply)}
                  disabled={sendingMessage}
                  className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-300 text-xs px-3 py-1.5 rounded-full transition-colors"
                >
                  {reply.length > 25 ? reply.substring(0, 25) + '...' : reply}
                </button>
              ))}
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
        
        {/* Right side - Ticket Details (smaller) */}
        <div className="md:w-1/3">
          {notification && (
            <div className={`mb-6 p-4 rounded-md ${
              notification.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {notification.message}
            </div>
          )}
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
            <h2 className="text-lg font-semibold mb-3">
              {ticket.template?.name || 'Ticket Information'}
            </h2>
            
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-4 overflow-auto max-h-80">
              <dl className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                {ticket.form_data && Object.entries(ticket.form_data).map(([key, value]) => (
                  <div key={key} className="py-2">
                    <dt className="font-medium text-gray-500 dark:text-gray-400">
                      {key}
                    </dt>
                    <dd className="mt-1 text-gray-900 dark:text-white break-words">
                      {typeof value === 'string' && value.includes('\n') ? (
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
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
            <h2 className="text-lg font-semibold mb-3">User Information</h2>
            <dl className="text-sm">
              <div className="py-2">
                <dt className="text-gray-500 dark:text-gray-400">Name</dt>
                <dd className="font-medium">{ticket.submitter?.name || 'Unknown'}</dd>
              </div>
              <div className="py-2">
                <dt className="text-gray-500 dark:text-gray-400">Email</dt>
                <dd className="font-medium">{ticket.submitter?.email || 'Unknown'}</dd>
              </div>
              <div className="py-2">
                <dt className="text-gray-500 dark:text-gray-400">Submitted On</dt>
                <dd>{new Date(ticket.created_at).toLocaleString()}</dd>
              </div>
              <div className="py-2">
                <dt className="text-gray-500 dark:text-gray-400">Priority</dt>
                <dd>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                    ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    ticket.priority === 'high' ? 'bg-yellow-100 text-yellow-800' :
                    ticket.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3">Update Status</h2>
            
            <div className="space-y-4">
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
              
              <Button
                onClick={handleUpdateTicket}
                className="w-full"
                disabled={updating || status === ticket.status}
                variant={status === 'resolved' ? 'success' : status === 'closed' ? 'secondary' : 'primary'}
                size="lg"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
