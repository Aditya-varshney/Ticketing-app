import React from 'react';
import MessageItem from './MessageItem';
import { formatDate } from '@/utils/formatDate';

export default function MessageList({ messages, currentUserId }) {
  const endOfMessagesRef = React.useRef(null);

  // Scroll to bottom when messages update
  React.useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Group messages by date
  const groupMessagesByDate = (messages) => {
    const groups = {};
    
    messages.forEach(message => {
      const date = formatDate(message.createdAt);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="space-y-8">
      {messages.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-block p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-gray-600 dark:text-gray-300">
              No messages yet. Start the conversation!
            </p>
          </div>
        </div>
      ) : (
        Object.entries(messageGroups).map(([date, messages]) => (
          <div key={date} className="message-group">
            <div className="flex items-center my-4">
              <div className="flex-grow h-px bg-gray-200 dark:bg-gray-700"></div>
              <span className="px-4 text-sm text-gray-500 dark:text-gray-400">{date}</span>
              <div className="flex-grow h-px bg-gray-200 dark:bg-gray-700"></div>
            </div>
            <div className="space-y-3">
              {messages.map(message => (
                <MessageItem 
                  key={message._id || `${message.sender}-${message.createdAt}`}
                  message={message} 
                  isOwn={message.sender === currentUserId} 
                />
              ))}
            </div>
          </div>
        ))
      )}
      <div ref={endOfMessagesRef} />
    </div>
  );
}
