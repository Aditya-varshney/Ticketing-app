import React from 'react';
import Avatar from '../ui/Avatar';

export default function MessageItem({ message, isOwn }) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Function to render different attachment types
  const renderAttachment = () => {
    if (!message.has_attachment && !message.attachment_url) return null;
    
    const fileUrl = message.attachment_url;
    const fileName = message.attachment_name || 'Attachment';
    const fileType = message.attachment_type || '';
    
    // Check if it's an image
    const isImage = fileType.startsWith('image/') || 
                   fileUrl?.endsWith('.jpg') || 
                   fileUrl?.endsWith('.jpeg') || 
                   fileUrl?.endsWith('.png');
    
    // Check if it's a document
    const isDocument = fileType.startsWith('application/') || 
                      fileUrl?.endsWith('.pdf') || 
                      fileUrl?.endsWith('.docx');
    
    if (isImage) {
      return (
        <div className="mt-2 max-w-xs">
          <img 
            src={fileUrl} 
            alt={fileName} 
            className="rounded-md max-h-48 max-w-full object-contain" 
          />
          <div className="text-xs text-gray-500 mt-1">{fileName}</div>
        </div>
      );
    } else if (isDocument) {
      return (
        <div className="mt-2 flex items-center p-2 bg-gray-100 dark:bg-gray-600 rounded-md">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
          <a 
            href={fileUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-500 dark:text-blue-300 hover:underline text-sm"
          >
            {fileName}
          </a>
        </div>
      );
    }
    
    return (
      <div className="mt-2">
        <a 
          href={fileUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-500 dark:text-blue-300 hover:underline text-sm"
        >
          {fileName}
        </a>
      </div>
    );
  };

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
            {renderAttachment()}
          </div>
          <span className="text-xs text-gray-400 mt-1">{time}</span>
        </div>
      </div>
    </div>
  );
}
