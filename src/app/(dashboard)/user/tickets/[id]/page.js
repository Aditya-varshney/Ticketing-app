'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import { AlertTriangle } from 'lucide-react';

export default function UserTicketDetailsPage({ params }) {
  const ticketId = params.id;
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [ticket, setTicket] = useState(null);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [notification, setNotification] = useState(null);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Revoke state
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revoking, setRevoking] = useState(false);
  
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

  // Fetch ticket details
  const fetchTicket = async () => {
    try {
      setLoadingTicket(true);
      const response = await fetch(`/api/forms/submissions/${ticketId}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ticket: ${response.status}`);
      }
      
      const data = await response.json();
      setTicket(data);
      
      // After getting ticket, fetch messages
      fetchMessages(data.id);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load ticket details. Please try again later.'
      });
    } finally {
      setLoadingTicket(false);
    }
  };
  
  // Fetch messages for this ticket
  const fetchMessages = async (id) => {
    try {
      setLoadingMessages(true);
      const response = await fetch(`/api/chat/messages?ticketId=${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages(data);
      
      // Scroll to bottom after messages load
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };
  
  // Refresh data when authenticated
  useEffect(() => {
    if (isAuthenticated && ticketId) {
      fetchTicket();
    }
  }, [isAuthenticated, ticketId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    try {
      setSendingMessage(true);
      
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newMessage,
          ticketId: ticketId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      // Clear input
      setNewMessage('');
      
      // Refresh messages
      fetchMessages(ticketId);
    } catch (error) {
      console.error('Error sending message:', error);
      setNotification({
        type: 'error',
        message: 'Failed to send message. Please try again.'
      });
    } finally {
      setSendingMessage(false);
    }
  };
  
  // Add a function to handle revocation
  const handleRevokeTicket = async () => {
    try {
      setRevoking(true);
      const response = await fetch(`/api/forms/submissions/${params.id}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to revoke ticket');
      }
      
      // Refresh the page or update the UI
      router.refresh();
      
    } catch (error) {
      console.error('Error revoking ticket:', error);
      // Show an error toast or message
    } finally {
      setRevoking(false);
      setShowRevokeConfirm(false);
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
          <Button onClick={() => router.push('/user')}>
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
            onClick={() => router.push('/user')}
            variant="outline"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>

      {notification && (
        <div className={`mb-6 p-4 rounded-md ${
          notification.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' 
            : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'
        }`}>
          {notification.message}
        </div>
      )}

      {ticket && ticket.status === 'revoked' && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 dark:bg-red-900/20 dark:border-red-700">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
                This ticket has been revoked
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>
                  You have canceled this support request. If you still need assistance, please create a new ticket.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Section */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 lg:mb-0 flex flex-col h-[600px]">
            <h2 className="text-xl font-semibold mb-4">Support Conversation</h2>
            
            <div className="flex-1 overflow-y-auto p-4">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  {!ticket.helpdesk_id ? (
                    <>
                      <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4 w-full max-w-md">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-500 dark:text-yellow-400 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <h3 className="text-base font-medium text-yellow-800 dark:text-yellow-300 text-left">Ticket Not Assigned</h3>
                            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-200 text-left">
                              Your ticket is waiting to be assigned to a helpdesk agent. Chat will be available once assignment is complete.
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-4">
                        You'll receive a notification when your ticket has been assigned.
                      </p>
                    </>
                  ) : (
                    <>
                      <svg className="w-16 h-16 text-gray-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <p>No messages yet</p>
                      <p className="text-sm">Start the conversation by sending a message</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`rounded-lg p-3 max-w-xs lg:max-w-md ${
                          msg.sender_id === user?.id 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <span className="block text-xs mt-1 opacity-75">
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            
            <div className="border-t dark:border-gray-700 p-4">
              {!ticket.helpdesk_id ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                        Ticket Awaiting Assignment
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-200">
                        <p>
                          This ticket has not been assigned to a helpdesk agent yet. You'll be able to chat once an agent is assigned. Please check back later or contact the administrator if this issue is urgent.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex items-center">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={ticket.status === 'revoked' ? "Ticket has been revoked" : "Type your message here..."}
                    className="flex-grow p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={sendingMessage || ticket.status === 'revoked'}
                  />
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-r-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={sendingMessage || !newMessage.trim() || ticket.status === 'revoked'}
                  >
                    {sendingMessage ? (
                      <svg className="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </form>
              )}
              
              {ticket.status === 'revoked' && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  This ticket has been revoked. You cannot send new messages.
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Ticket Information Section */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Ticket Status</h3>
            
            {/* Add assignment status indicator */}
            <div className="mb-4 pb-4 border-b dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Assignment Status</h4>
              <div className={`flex items-center ${ticket.helpdesk_id ? 'text-green-500 dark:text-green-400' : 'text-yellow-500 dark:text-yellow-400'}`}>
                {ticket.helpdesk_id ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Assigned to Helpdesk</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span>Awaiting Assignment</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <StatusBadge status={ticket.status || 'open'} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Priority</p>
                <PriorityBadge priority={ticket.priority || 'medium'} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Date Submitted</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(ticket.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(ticket.updated_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Assigned To</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {ticket.helpdesk?.name || 'Not yet assigned'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Form Data Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Ticket Details</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Title</p>
                <p className="font-medium text-gray-900 dark:text-white">{ticket.title}</p>
              </div>
              {ticket.description && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Description</p>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{ticket.description}</p>
                </div>
              )}
              
              {/* Display form data if available */}
              {ticket.form_data && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-md font-medium mb-2">Form Information</h4>
                  {Object.entries(
                    typeof ticket.form_data === 'string' 
                      ? JSON.parse(ticket.form_data) 
                      : ticket.form_data
                  ).map(([key, value]) => (
                    <div key={key} className="mb-3">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{key}</p>
                      <p className="text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add a revoke button if the ticket is active */}
      {ticket && ticket.status !== 'revoked' && (
        <div className="mt-6">
          <button
            onClick={() => setShowRevokeConfirm(true)}
            className="text-red-500 hover:text-red-700 font-medium flex items-center"
            disabled={revoking}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Revoke Ticket
          </button>
          
          {showRevokeConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <h3 className="text-lg font-bold mb-4">Revoke Ticket</h3>
                <p className="mb-4">
                  Are you sure you want to revoke this ticket? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setShowRevokeConfirm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md"
                    disabled={revoking}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRevokeTicket}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                    disabled={revoking}
                  >
                    {revoking ? 'Revoking...' : 'Revoke Ticket'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
