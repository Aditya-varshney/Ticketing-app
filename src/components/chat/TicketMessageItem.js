import React from 'react';
import Avatar from '@/components/ui/Avatar';

export default function TicketMessageItem({ message, isCurrentUser }) {
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderAttachment = () => {
    if (!message.has_attachment || !message.attachment_url) return null;

    // Log attachment details for debugging
    console.log("Rendering attachment:", {
      url: message.attachment_url,
      type: message.attachment_type,
      name: message.attachment_name,
      hasAttachment: message.has_attachment,
      messageId: message.id
    });

    // Fix URL format - ensure it starts with / for proper loading
    const attachmentUrl = message.attachment_url.startsWith('/')
      ? message.attachment_url
      : `/${message.attachment_url}`;

    console.log("Using attachment URL:", attachmentUrl);

    // Handle different attachment types
    if (message.attachment_type?.startsWith('image/')) {
      return (
        <div className="mt-2">
          <div className="relative">
            <img
              src={attachmentUrl}
              alt={message.attachment_name || 'Image attachment'}
              className="max-w-xs rounded-lg border border-gray-200 dark:border-gray-700"
              onError={(e) => {
                console.error("Image failed to load:", {
                  url: attachmentUrl,
                  error: e.type
                });
                e.target.src = '/file.svg';
                e.target.className = "w-8 h-8";
                e.target.alt = "Failed to load image";
              }}
            />
          </div>
          <a
            href={attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline mt-1 block"
            download={message.attachment_name}
          >
            {message.attachment_name || 'Download image'}
          </a>
        </div>
      );
    }
    
    // Handle PDF files with preview
    else if (message.attachment_type?.includes('pdf')) {
      return (
        <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
          <div className="flex items-center mb-2">
            <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="font-medium">{message.attachment_name || 'PDF Document'}</span>
          </div>
          <div className="flex space-x-2">
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline flex items-center"
              download={message.attachment_name}
            >
              <span className="mr-1">📥</span> Download
            </a>
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline flex items-center"
            >
              <span className="mr-1">👁️</span> View
            </a>
          </div>
        </div>
      );
    }
    
    // Default for other files
    else {
      return (
        <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium truncate max-w-[200px]">{message.attachment_name || 'Attachment'}</span>
          </div>
          <a
            href={attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-500 hover:underline mt-1 flex items-center"
            download={message.attachment_name}
          >
            <span className="mr-1">📥</span> Download file
          </a>
        </div>
      );
    }
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