'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import TicketMessageInput from '@/components/chat/TicketMessageInput';
import TicketMessageItem from '@/components/chat/TicketMessageItem';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import TicketAuditTrail from '@/components/admin/TicketAuditTrail';

export default function AdminTicketDetailsPage({ params }) {
  const ticketId = params.id;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [notification, setNotification] = useState(null);
  const [priority, setPriority] = useState('low');
  const [status, setStatus] = useState('new');
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);
  
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  const checkIfAtBottom = () => {
    const messageList = messageListRef.current;
    if (messageList) {
      const isAtBottom = messageList.scrollHeight - messageList.scrollTop <= messageList.clientHeight + 100;
      setIsAtBottom(isAtBottom);
    }
  };
  
  const fetchMessages = async () => {
    if (!ticketId || !user?.id) return;

    try {
      setLoadingMessages(true);
      const response = await fetch(`/api/chat/messages?ticketId=${ticketId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setMessages(data);
      
      // Check if we have new messages
      if (data.length > lastMessageCount) {
        setLastMessageCount(data.length);
        // Only scroll if user was already at bottom
        if (isAtBottom) {
          scrollToBottom();
        }
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError(err.message);
    } finally {
      setLoadingMessages(false);
    }
  };
  
  // Fetch messages on mount and set up polling
  useEffect(() => {
    if (!authLoading) {
      fetchMessages();
      // Set up polling for new messages every 30 seconds
      const interval = setInterval(fetchMessages, 30000);
      return () => clearInterval(interval);
    }
  }, [ticketId, user, authLoading]);
  
  // Add scroll event listener
  useEffect(() => {
    const messageList = messageListRef.current;
    if (messageList) {
      messageList.addEventListener('scroll', checkIfAtBottom);
      return () => messageList.removeEventListener('scroll', checkIfAtBottom);
    }
  }, []);
  
  const handleStatusChange = async (newStatus) => {
    try {
      console.log("Updating ticket status:", {
        ticketId,
        newStatus,
        userId: user.id,
        userRole: user.role
      });

      const response = await fetch(`/api/forms/submissions/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus,
          priority: priority,
          form_data: ticket.form_data
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update ticket status');
      }

      const updatedTicket = await response.json();
      console.log("Ticket updated successfully:", updatedTicket);
      setTicket(updatedTicket);
      setStatus(newStatus);
    } catch (err) {
      console.error("Error updating ticket status:", err);
      setError(err.message);
    }
  };
  
  const handlePriorityChange = async (newPriority) => {
    try {
      console.log("Updating ticket priority:", {
        ticketId,
        newPriority,
        userId: user.id,
        userRole: user.role
      });

      const response = await fetch(`/api/forms/submissions/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          status: status,
          priority: newPriority,
          form_data: ticket.form_data
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update ticket priority');
      }

      const updatedTicket = await response.json();
      console.log("Ticket updated successfully:", updatedTicket);
      setTicket(updatedTicket);
      setPriority(newPriority);
    } catch (err) {
      console.error("Error updating ticket priority:", err);
      setError(err.message);
    }
  };
  
  const handleSendMessage = async (content, attachment = null) => {
    if (!content.trim() && !attachment) return;

    try {
      setSendingMessage(true);
      
      // Prepare message data
      const messageData = {
        content: content.trim() || "", // Empty string if no content
        ticketId,
        receiverId: ticket.submitter.id
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
        const errorData = await response.text();
        console.error("Error sending message:", errorData);
        throw new Error(`Failed to send message: ${errorData}`);
      }

      // Fetch updated messages after sending
      await fetchMessages();
      scrollToBottom();
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };
  
  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticketId || !user?.id || !user?.role) {
        console.log("Missing required data:", {
          ticketId,
          userId: user?.id,
          userRole: user?.role
        });
        return;
      }

      if (user.role !== 'admin') {
        console.log("Non-admin user attempting to access admin page:", user.role);
        router.push('/dashboard');
        return;
      }

      try {
        console.log("Fetching ticket details:", {
          ticketId,
          userId: user.id,
          userRole: user.role
        });

        const response = await fetch(`/api/forms/submissions/${ticketId}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch ticket');
        }

        const data = await response.json();
        console.log("Received ticket data:", data);

        setTicket(data);
        setStatus(data.status || 'new');
        setPriority(data.priority || 'low');
      } catch (err) {
        console.error("Error fetching ticket:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchTicket();
    }
  }, [ticketId, user, authLoading, router]);

  if (authLoading || loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  if (!ticket) {
    return <div className="p-4">Ticket not found</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Ticket Details
        </h1>
        <Button
          onClick={() => router.push('/admin/tickets')}
          variant="outline"
          className="flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to All Tickets
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h1 className="text-2xl font-bold mb-2">Ticket Details</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Ticket ID: {ticket.id}
            </p>
          </div>

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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden h-[calc(100vh-20rem)]">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">
                Chat with {ticket?.submitter?.name || 'User'}
              </h3>
            </div>

            <div 
              ref={messageListRef}
              className="flex-1 overflow-y-auto p-4 h-[calc(100%-10rem)] bg-gray-50 dark:bg-gray-900"
            >
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <p className="text-gray-500 dark:text-gray-400">No messages yet. Start the conversation.</p>
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

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <TicketMessageInput
                onSendMessage={handleSendMessage}
                disabled={sendingMessage || ticket?.status === 'closed'}
                disableAttachments={!ticket?.assignment?.helpdesk}
                placeholder={ticket?.status === 'closed' ? "Ticket is closed" : "Type your message here..."}
              />
            </div>
          </div>
        </div>
        
        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
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
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="new">New</option>
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
              onClick={() => {}}
              disabled={updating}
              className="w-full"
            >
              {updating ? 'Updating...' : 'Update Ticket'}
            </Button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <TicketAuditTrail ticketId={ticketId} />
          </div>
        </div>
      </div>
    </div>
  );
}
