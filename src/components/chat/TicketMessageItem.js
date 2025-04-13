import React from 'react';
import Avatar from '@/components/ui/Avatar';

export default function TicketMessageItem({ message, isCurrentUser }) {
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderAttachment = () => {
    if (!message.has_attachment || !message.attachment_url) return null;

    return (
      <div className="mt-2">
        {message.attachment_type?.startsWith('image/') ? (
          <img
            src={message.attachment_url}
            alt={message.attachment_name || 'Attachment'}
            className="max-w-xs rounded-lg"
          />
        ) : (
          <a
            href={message.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline flex items-center"
          >
            📎 {message.attachment_name || 'Download attachment'}
          </a>
        )}
      </div>
    );
  };

  // Get sender name from either senderUser object or direct sender property
  const senderName = message.senderUser?.name || message.sender_name || 'Unknown';
  const senderAvatar = message.senderUser?.avatar || message.sender_avatar;

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[70%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} items-start`}>
        {/* Avatar */}
        {!isCurrentUser && (
          <div className="flex-shrink-0 mr-3">
            <Avatar src={senderAvatar} alt={senderName} size="sm" />
          </div>
        )}

        {/* Message content */}
        <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
          {!isCurrentUser && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {senderName}
            </span>
          )}
          
          <div className={`rounded-lg py-2 px-3 ${
            isCurrentUser 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}>
            <p className="whitespace-pre-wrap">{message.content}</p>
            {renderAttachment()}
          </div>
          
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatTime(message.created_at || message.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
} 