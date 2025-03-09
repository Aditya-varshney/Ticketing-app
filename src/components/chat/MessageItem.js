import React from 'react';
import Avatar from '../ui/Avatar';

export default function MessageItem({ message, isOwn }) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isOwn && (
          <div className="flex-shrink-0 mr-2">
            <Avatar 
              src={message.senderAvatar} 
              alt={message.senderName || 'User'} 
              size="sm" 
            />
          </div>
        )}
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {!isOwn && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {message.senderName || 'Anonymous'}
            </span>
          )}
          <div 
            className={`rounded-lg py-2 px-3 ${
              isOwn 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
          >
            <p>{message.content}</p>
          </div>
          <span className="text-xs text-gray-400 mt-1">{time}</span>
        </div>
      </div>
    </div>
  );
}
