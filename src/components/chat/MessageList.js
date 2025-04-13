'use client';

import { format } from 'date-fns';
import { FaShieldAlt } from 'react-icons/fa';

const MessageList = ({ messages, currentUser }) => {
  if (!messages || messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No messages yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isCurrentUser = message.sender_id === currentUser?.id;
        const messageTime = format(new Date(message.created_at), 'MMM d, yyyy h:mm a');
        const isAdmin = message.sender?.role === 'admin';

        return (
          <div
            key={message.id}
            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                isCurrentUser
                  ? 'bg-blue-500 text-white'
                  : isAdmin
                  ? 'bg-purple-100 text-gray-900 border border-purple-200'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm flex items-center gap-1">
                  {isCurrentUser ? 'You' : message.sender?.name || 'Unknown User'}
                  {isAdmin && (
                    <FaShieldAlt 
                      className={`w-3 h-3 ${
                        isCurrentUser ? 'text-white' : 'text-purple-500'
                      }`} 
                      title="Admin"
                    />
                  )}
                </span>
                <span className={`text-xs ${
                  isCurrentUser ? 'opacity-75' : isAdmin ? 'text-purple-500' : 'text-gray-500'
                }`}>
                  {messageTime}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;
