'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [userTyping, setUserTyping] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const socketInitialized = useRef(false);
  const socketIORef = useRef(null);

  // Initialize socket connection - with lazy loading
  useEffect(() => {
    if (!session?.user?.id) return;
    
    // Only initialize socket when user is in a dashboard page and needs chat
    const shouldInitSocket = 
      (window.location.pathname.includes('/admin') || 
       window.location.pathname.includes('/helpdesk') || 
       window.location.pathname.includes('/user'));
       
    if (!shouldInitSocket || socketInitialized.current) return;

    // Lazy load socket.io-client
    const initSocketConnection = async () => {
      try {
        if (!socketIORef.current) {
          // Dynamically import socket.io-client only when needed
          const io = (await import('socket.io-client')).default;
          socketIORef.current = io;
        }
        
        const socketInstance = socketIORef.current(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
          transports: ['websocket'],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 10000
        });
        
        setSocket(socketInstance);
        socketInitialized.current = true;
        
        // Clean up function
        return () => {
          if (socketInstance) {
            socketInstance.disconnect();
            socketInitialized.current = false;
          }
        };
      } catch (err) {
        console.error('Failed to initialize socket:', err);
        return () => {};
      }
    };

    // Delay socket connection based on user role
    // For regular users, delay more to prioritize UI rendering
    const delayTime = session.user.role === 'user' ? 800 : 300;
    
    // Delay socket connection slightly to prioritize UI rendering
    const timeoutId = setTimeout(() => {
      initSocketConnection();
    }, delayTime);
    
    return () => clearTimeout(timeoutId);
  }, [session]);
  
  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !session?.user?.id) return;
    
    // Register with socket server
    socket.emit('register', session.user.id);
    
    function handleReceiveMessage(message) {
      if (currentChat && 
          ((message.sender === currentChat.id) || 
           (message.receiver === currentChat.id))) {
        setMessages((prevMessages) => [...prevMessages, message]);
      }
    }
    
    function handleUserTyping({ senderId }) {
      if (currentChat && senderId === currentChat.id) {
        setUserTyping(true);
      }
    }
    
    function handleUserStopTyping() {
      setUserTyping(false);
    }
    
    // Add event listeners
    socket.on('receive-message', handleReceiveMessage);
    socket.on('user-typing', handleUserTyping);
    socket.on('user-stop-typing', handleUserStopTyping);
    
    // Clean up function
    return () => {
      socket.off('receive-message', handleReceiveMessage);
      socket.off('user-typing', handleUserTyping);
      socket.off('user-stop-typing', handleUserStopTyping);
    };
  }, [socket, currentChat, session]);

  // Fetch messages when current chat changes - with debounce
  useEffect(() => {
    if (!currentChat || !session?.user?.id) return;
    
    const fetchTimeout = setTimeout(() => {
      fetchMessages(currentChat.id);
    }, 100);
    
    return () => clearTimeout(fetchTimeout);
  }, [currentChat, session]);

  const fetchMessages = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/chat/messages?userId=${userId}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content, attachment = null) => {
    if (!currentChat || !session?.user?.id || !(content.trim() || attachment)) return;
    
    console.log("ChatContext: sendMessage called", { 
      hasContent: !!content.trim(),
      hasAttachment: !!attachment,
      attachmentName: attachment?.name
    });
    
    try {
      let attachmentData = null;
      
      // If there's an attachment, upload it first
      if (attachment) {
        console.log("ChatContext: Uploading attachment", {
          name: attachment.name,
          type: attachment.type,
          size: attachment.size
        });
        
        const formData = new FormData();
        formData.append('file', attachment);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          const errorDetails = await uploadResponse.text();
          console.error("ChatContext: Upload failed", errorDetails);
          throw new Error(`Failed to upload attachment: ${errorDetails}`);
        }
        
        attachmentData = await uploadResponse.json();
        console.log("ChatContext: Upload successful", attachmentData);
      }
      
      const messageData = {
        sender: session.user.id,
        receiver: currentChat.id,
        content: content || 'Attachment',
        createdAt: new Date(),
        has_attachment: !!attachmentData,
        attachment_url: attachmentData?.url || null,
        attachment_type: attachmentData?.type || null,
        attachment_name: attachmentData?.name || null
      };
      
      console.log("ChatContext: Creating message with data", messageData);
      
      // Add message to local state first for immediate feedback
      setMessages((prev) => [...prev, messageData]);
      
      // Emit the message through socket
      if (socket) {
        socket.emit('send-message', {
          userId: currentChat.id,
          message: messageData
        });
      }
      
      // Send to backend
      console.log("ChatContext: Sending to API");
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentChat.id,
          content: content || 'Attachment',
          ticketId: currentChat.ticketId || null,
          attachmentUrl: attachmentData?.url || null,
          attachmentType: attachmentData?.type || null,
          attachmentName: attachmentData?.name || null
        }),
      });
      
      if (!response.ok) {
        const errorDetails = await response.text();
        console.error("ChatContext: API request failed", errorDetails);
        throw new Error(`Failed to send message: ${errorDetails}`);
      }
      
      console.log("ChatContext: Message sent successfully");
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message);
    }
  };

  const startTyping = () => {
    if (socket && currentChat) {
      socket.emit('typing', {
        userId: currentChat.id,
        senderId: session?.user?.id
      });
    }
  };

  const stopTyping = () => {
    if (socket && currentChat) {
      socket.emit('stop-typing', {
        userId: currentChat.id
      });
    }
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        currentChat,
        setCurrentChat,
        sendMessage,
        userTyping,
        startTyping,
        stopTyping,
        onlineUsers,
        loading,
        error
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
