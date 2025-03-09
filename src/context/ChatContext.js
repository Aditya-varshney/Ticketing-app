'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
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

  // Initialize socket connection
  useEffect(() => {
    if (session?.user?.id) {
      const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000');
      setSocket(newSocket);
      
      return () => {
        newSocket.disconnect();
      };
    }
  }, [session]);
  
  // Register user with socket server once connected
  useEffect(() => {
    if (socket && session?.user?.id) {
      socket.emit('register', session.user.id);
      
      socket.on('receive-message', (message) => {
        if (currentChat && 
            ((message.sender === currentChat.id) || 
             (message.receiver === currentChat.id))) {
          setMessages((prevMessages) => [...prevMessages, message]);
        }
      });
      
      socket.on('user-typing', ({ senderId }) => {
        if (currentChat && senderId === currentChat.id) {
          setUserTyping(true);
        }
      });
      
      socket.on('user-stop-typing', () => {
        setUserTyping(false);
      });
    }
    
    return () => {
      if (socket) {
        socket.off('receive-message');
        socket.off('user-typing');
        socket.off('user-stop-typing');
      }
    };
  }, [socket, currentChat, session]);

  // Fetch messages when current chat changes
  useEffect(() => {
    if (currentChat && session?.user?.id) {
      fetchMessages(currentChat.id);
    }
  }, [currentChat, session]);

  const fetchMessages = async (receiverId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/chat/messages?receiverId=${receiverId}`);
      
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

  const sendMessage = async (content) => {
    if (!currentChat || !session?.user?.id || !content.trim()) return;
    
    try {
      const messageData = {
        sender: session.user.id,
        receiver: currentChat.id,
        content,
        createdAt: new Date()
      };
      
      // Add message to local state first for immediate feedback
      setMessages((prev) => [...prev, messageData]);
      
      // Emit the message through socket
      if (socket) {
        socket.emit('send-message', {
          receiverId: currentChat.id,
          message: messageData
        });
      }
      
      // Send to backend
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message);
    }
  };

  const startTyping = () => {
    if (socket && currentChat) {
      socket.emit('typing', {
        receiverId: currentChat.id,
        senderId: session?.user?.id
      });
    }
  };

  const stopTyping = () => {
    if (socket && currentChat) {
      socket.emit('stop-typing', {
        receiverId: currentChat.id
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
