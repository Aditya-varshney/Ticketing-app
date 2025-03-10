import React from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';

export default function ChatInterface({ receiverId, receiverName }) {
  const { currentChat, setCurrentChat, messages, loading, sendMessage, userTyping, startTyping, stopTyping } = useChat();
  const { user } = useAuth();

  React.useEffect(() => {
    if (receiverId) {
      setCurrentChat({
        id: receiverId,
        name: receiverName
      });
    }
    
    return () => {
      setCurrentChat(null);
    };
  }, [receiverId, receiverName, setCurrentChat]);

  if (!currentChat) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">Select a conversation to start chatting</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold">{currentChat.name}</h2>
      </div>

      {/* Messages Container */}
      <div className="flex-grow overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
        <MessageList messages={messages} currentUserId={user?.id} />
        {userTyping && (
          <div className="text-sm text-gray-500 italic mt-2">
            {currentChat.name} is typing...
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <MessageInput 
          onSendMessage={sendMessage} 
          onStartTyping={startTyping}
          onStopTyping={stopTyping}
        />
      </div>
    </div>
  );
}
