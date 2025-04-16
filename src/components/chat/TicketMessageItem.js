import React from 'react';
import Avatar from '@/components/ui/Avatar';

export default function TicketMessageItem({ message, isCurrentUser }) {
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderAttachment = () => {
    // Check if there's an attachment using multiple possible property structures
    const hasAttachment = Boolean(
      message.attachment_url || 
      message.attachmentUrl || 
      (message.attachment && message.attachment.url) ||
      message.has_attachment
    );
    
    if (!hasAttachment) return null;
    
    // Use our new API endpoint to get the attachment directly
    const apiAttachmentUrl = `/api/attachments/${message.id}`;
    
    // Get attachment metadata from various possible properties
    const attachmentType = message.attachment_type || 
                          message.attachmentType || 
                          (message.attachment && message.attachment.type) || 
                          'application/octet-stream';
    
    const attachmentName = message.attachment_name || 
                           message.attachmentName || 
                           (message.attachment && message.attachment.name) || 
                           'file';

    // Log attachment details for debugging
    console.log("Rendering attachment via API endpoint:", {
      url: apiAttachmentUrl,
      type: attachmentType,
      name: attachmentName,
      messageId: message.id
    });

    // Handle different attachment types
    if (attachmentType?.startsWith('image/')) {
      return (
        <div className="mt-2">
          <div className="relative">
            <img
              src={apiAttachmentUrl}
              alt={attachmentName || 'Image attachment'}
              className="max-w-xs rounded-lg border border-gray-200 dark:border-gray-700"
              onError={(e) => {
                console.error("Image failed to load:", {
                  url: apiAttachmentUrl,
                  error: e.type
                });
                e.target.src = '/file.svg';
                e.target.className = "w-8 h-8";
                e.target.alt = "Failed to load image";
              }}
            />
          </div>
          <a
            href={apiAttachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline mt-1 block"
            download={attachmentName}
          >
            {attachmentName || 'Download image'}
          </a>
        </div>
      );
    }
    
    // Handle PDF files with preview
    else if (attachmentType?.includes('pdf')) {
      return (
        <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
          <div className="flex items-center mb-2">
            <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="font-medium">{attachmentName || 'PDF Document'}</span>
          </div>
          <div className="flex space-x-2">
            <a
              href={apiAttachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline flex items-center"
              download={attachmentName}
            >
              <span className="mr-1">📥</span> Download
            </a>
            <a
              href={apiAttachmentUrl}
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
            <span className="font-medium truncate max-w-[200px]">{attachmentName || 'Attachment'}</span>
          </div>
          <a
            href={apiAttachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-500 hover:underline mt-1 flex items-center"
            download={attachmentName}
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