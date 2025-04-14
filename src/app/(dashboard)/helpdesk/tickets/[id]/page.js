'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import TicketMessageInput from '@/components/chat/TicketMessageInput';
import TicketMessageItem from '@/components/chat/TicketMessageItem';
import { format } from 'date-fns';

export default function HelpdeskTicketDetailsPage({ params }) {
  const ticketId = params.id;
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [ticket, setTicket] = useState(null);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notification, setNotification] = useState(null);
  const [status, setStatus] = useState('open');
  const [assigningTicket, setAssigningTicket] = useState(false);
  
  // Chat state variables
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Add new state variables at the top of your component
  const [customReply, setCustomReply] = useState('');
  const [showCustomReplyInput, setShowCustomReplyInput] = useState(false);
  const [customQuickReplies, setCustomQuickReplies] = useState(() => {
    // Try to load from localStorage if available (client-side only)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('customQuickReplies');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  
  // Add state for audit trail
  const [auditTrail, setAuditTrail] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  
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
      
      // Ensure form_data is properly parsed if it's a string
      if (data.form_data && typeof data.form_data === 'string') {
        try {
          data.form_data = JSON.parse(data.form_data);
        } catch (e) {
          console.error('Error parsing form data:', e);
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
  
  // Fetch audit trail
  const fetchAuditTrail = async () => {
    if (!isAuthenticated || !ticketId) return;
    
    try {
      setLoadingAudit(true);
      const response = await fetch(`/api/tickets/${ticketId}/audit`);
      
      if (!response.ok) {
        console.warn('Failed to fetch audit trail - may not have permission');
        return;
      }
      
      const data = await response.json();
      setAuditTrail(data.auditTrail || []);
    } catch (error) {
      console.error('Error fetching audit trail:', error);
    } finally {
      setLoadingAudit(false);
    }
  };
  
  useEffect(() => {
    // Fetch ticket details when component mounts
    if (isAuthenticated && ticketId) {
      fetchTicket();
      fetchAuditTrail();
    }
  }, [isAuthenticated, ticketId, user]);
  
  // Function to fetch messages
  const fetchMessages = async (submitterId) => {
    if (!submitterId) {
      console.log('No submitter ID available, skipping message fetch');
      setLoadingMessages(false);
      return;
    }
    
    try {
      setLoadingMessages(true);
      console.log(`Fetching messages for user ${submitterId} (submitter) - ticketId: ${ticketId}, userId: ${submitterId}`);
      
      const response = await fetch(`/api/chat/messages?ticketId=${ticketId}&userId=${submitterId}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
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
  
  // Function to send messages with attachment support
  const handleSendMessage = async (content, attachment = null) => {
    if ((!content.trim() && !attachment) || !ticket?.submitter?.id) return;
    
    try {
      setSendingMessage(true);
      
      // Prepare message data
      const messageData = {
        content: content.trim() || "", // Empty string if no content
        receiverId: ticket.submitter.id,
        ticketId: ticketId
      };
      
      // Add attachment data if provided
      if (attachment) {
        messageData.attachmentUrl = attachment.url;
        messageData.attachmentType = attachment.type || 'application/octet-stream';
        messageData.attachmentName = attachment.name || 'file';
        
        console.log("Adding attachment to message:", {
          url: attachment.url,
          type: attachment.type,
          name: attachment.name
        });
      }
      
      console.log("Sending message data:", messageData);
      
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error('Failed to send message: ' + errorText);
      }
      
      // Refresh messages
      fetchMessages(ticket.submitter.id);
    } catch (error) {
      console.error('Error sending message:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to send message'
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
        
        if (!messageResponse.ok) {
          console.warn('Failed to send resolved notification message:', await messageResponse.text());
        } else {
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
      
      // Send the quick reply through the same message path as normal messages
      const messageData = {
        content: message.trim(),
        receiverId: ticket.submitter.id,
        ticketId: ticketId
      };
      
      console.log("Sending quick reply:", messageData);
      
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Quick reply error:", errorText);
        throw new Error('Failed to send quick reply');
      }
      
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
  
  // Add function to handle adding a new custom quick reply
  const addCustomQuickReply = () => {
    if (customReply.trim()) {
      const newReplies = [...customQuickReplies, customReply.trim()];
      setCustomQuickReplies(newReplies);
      setCustomReply('');
      setShowCustomReplyInput(false);
      
      // Save to localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('customQuickReplies', JSON.stringify(newReplies));
      }
    }
  };
  
  // Function to assign ticket to current user
  const handleAssignToMe = async () => {
    if (!isAuthenticated || !user?.id || !ticketId) return;
    
    try {
      setAssigningTicket(true);
      
      // First assign the ticket to current user
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: ticketId,
          helpdeskId: user.id
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to assign ticket');
      }
      
      // Then update ticket status to "in_progress" if it's not already resolved or closed
      if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
        const statusUpdateResponse = await fetch(`/api/forms/submissions?id=${ticketId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'in_progress'
          }),
        });
        
        if (!statusUpdateResponse.ok) {
          console.warn('Failed to update ticket status, but assignment was successful');
        } else {
          // Update local state
          setStatus('in_progress');
        }
      }
      
      // Send an automatic message to the submitter
      if (ticket.submitter?.id) {
        try {
          const messageResponse = await fetch('/api/chat/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: `Hi ${ticket.submitter.name}, I've been assigned to help with your ticket. I'll be reviewing the details and will get back to you shortly.`,
              userId: ticket.submitter.id,
              ticketId: ticketId
            }),
          });
          
          if (!messageResponse.ok) {
            console.warn('Failed to send automatic assignment message:', await messageResponse.text());
          } else {
            // Refresh messages
            fetchMessages(ticket.submitter.id);
          }
        } catch (msgError) {
          console.error('Failed to send automatic message, but assignment was successful:', msgError);
        }
      }
      
      // Refresh the ticket data
      await fetchTicket();
      
      setNotification({
        type: 'success',
        message: 'Ticket assigned to you successfully'
      });
    } catch (error) {
      console.error('Error assigning ticket:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to assign ticket'
      });
    } finally {
      setAssigningTicket(false);
      
      // Clear notification after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };
  
  // Function to unassign ticket
  const handleUnassignTicket = async () => {
    if (!isAuthenticated || !user?.id || !ticketId) return;
    
    try {
      setAssigningTicket(true);
      
      const response = await fetch(`/api/assignments?ticketId=${ticketId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to unassign ticket');
      }
      
      // Refresh the ticket data
      await fetchTicket();
      
      setNotification({
        type: 'success',
        message: 'Ticket unassigned successfully'
      });
    } catch (error) {
      console.error('Error unassigning ticket:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to unassign ticket'
      });
    } finally {
      setAssigningTicket(false);
      
      // Clear notification after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };
  
  // Function to format audit action text
  const formatActionText = (action) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };
  
  // Function to determine color based on action type
  const getActionColor = (action) => {
    switch (action) {
      case 'status_change':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'priority_change':
        return 'text-orange-600 dark:text-orange-400';
      case 'ticket_assigned':
      case 'ticket_reassigned':
        return 'text-purple-600 dark:text-purple-400';
      case 'assignment_removed':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };
  
  // Early return if loading auth or user is not available yet
  if (loading || !user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content - Now spans 3 columns instead of 2 */}
          <div className="lg:col-span-3">
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

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg h-[600px] flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
                  {loadingMessages ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                      <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <TicketMessageItem 
                          key={message.id} 
                          message={message}
                          isCurrentUser={message.sender === user?.id}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                  <TicketMessageInput
                    onSendMessage={handleSendMessage}
                    disabled={sendingMessage || ticket?.status === 'closed'}
                    placeholder={ticket?.status === 'closed' ? "Ticket is closed" : "Type your message here..."}
                    disableAttachments={!ticket?.assignment || !ticket?.assignment?.helpdesk}
                  />
                  
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Quick Replies:</p>
                    <div className="flex flex-wrap gap-2">
                      {quickReplies.map((reply, index) => (
                        <button
                          key={index}
                          onClick={() => sendQuickReply(reply)}
                          className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-full text-xs hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          {reply}
                        </button>
                      ))}
                      {customQuickReplies.map((reply, index) => (
                        <button
                          key={`custom-${index}`}
                          onClick={() => sendQuickReply(reply)}
                          className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900 rounded-full text-xs hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                        >
                          {reply}
                        </button>
                      ))}
                      {!showCustomReplyInput && (
                        <button
                          onClick={() => setShowCustomReplyInput(true)}
                          className="px-3 py-1.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                        >
                          + Add Custom
                        </button>
                      )}
                    </div>
                    
                    {showCustomReplyInput && (
                      <div className="mt-2 flex">
                        <input
                          type="text"
                          value={customReply}
                          onChange={(e) => setCustomReply(e.target.value)}
                          placeholder="Type your custom quick reply..."
                          className="flex-grow p-2 text-sm border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        <button
                          onClick={addCustomQuickReply}
                          className="px-3 py-1 bg-green-500 text-white rounded-r-md hover:bg-green-600 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setCustomReply('');
                            setShowCustomReplyInput(false);
                          }}
                          className="px-3 py-1 ml-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Now spans 1 column and is narrower */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Ticket Summary</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <StatusBadge status={ticket.status || 'open'} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Priority</p>
                    <PriorityBadge priority={ticket.priority || 'medium'} />
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Submitted By</p>
                  <div className="flex items-center mt-1">
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
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Assigned To</p>
                  <div className="mt-1">
                    {ticket.assignment && ticket.assignment.helpdesk ? (
                      <div className="flex flex-col">
                        <div className="flex items-center mb-2">
                          <Avatar
                            name={ticket.assignment.helpdesk.name}
                            size="sm"
                            className="mr-2"
                          />
                          <span>{ticket.assignment.helpdesk.name}</span>
                        </div>
                        {ticket.assignment.helpdesk.id === user?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={handleUnassignTicket}
                            disabled={assigningTicket}
                          >
                            {assigningTicket ? 'Processing...' : 'Unassign'}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-yellow-600 dark:text-yellow-400 mb-2">Unassigned</span>
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={handleAssignToMe}
                          disabled={assigningTicket}
                        >
                          {assigningTicket ? 'Assigning...' : 'Assign to Me'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                    <p className="text-sm font-medium">
                      {new Date(ticket.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Updated</p>
                    <p className="text-sm font-medium">
                      {new Date(ticket.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Ticket Information</h3>
              
              {loadingTicket ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : ticket ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">ID</p>
                      <p className="font-medium">{ticketId}</p>
                    </div>
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
                      <p className="font-medium">
                        {new Date(ticket.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* Form Fields - Added to display ticket form data */}
                  <div className="mt-6 border-t pt-4">
                    <h4 className="text-md font-semibold mb-3">Form Details</h4>
                    {ticket.form_data && typeof ticket.form_data === 'object' ? (
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(ticket.form_data).map(([key, value]) => (
                          <div key={key} className="border-b pb-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{key.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                            <p className="font-medium">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No form details available</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Ticket not found</p>
              )}
            </div>

            {/* Ticket Audit Trail */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Ticket History</h3>
              
              {loadingAudit ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : auditTrail.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No history available</p>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {auditTrail.map(entry => (
                    <div key={entry.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${getActionColor(entry.action)}`}>
                          {formatActionText(entry.action)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(entry.createdAt), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {entry.details || (
                          <>
                            Changed from <span className="font-medium">{entry.previousValue}</span> to <span className="font-medium">{entry.newValue}</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        By: {entry.user?.name || 'Unknown user'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
