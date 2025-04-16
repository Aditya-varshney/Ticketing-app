import React, { useState, useRef } from 'react';
import Button from '../ui/Button';

export default function TicketMessageInput({ onSendMessage, disabled = false, disableAttachments = false, placeholder = "Type your message..." }) {
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!message.trim() && !attachment) || disabled) return;
    
    try {
      if (attachment) {
        setUploadingAttachment(true);
        
        // Upload the attachment first
        const formData = new FormData();
        formData.append('file', attachment);
        
        console.log("Uploading attachment:", {
          name: attachment.name, 
          type: attachment.type, 
          size: attachment.size
        });
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.text();
          console.error("Upload failed:", errorData);
          throw new Error('Failed to upload attachment: ' + errorData);
        }
        
        const attachmentData = await uploadResponse.json();
        console.log("Attachment uploaded successfully:", attachmentData);
        
        // Send message with attachment - ensuring data is properly structured
        const attachmentInfo = {
          attachmentUrl: attachmentData.url,
          attachmentType: attachmentData.type || attachment.type,
          attachmentName: attachmentData.name || attachment.name,
          attachmentSize: attachmentData.size || attachment.size
        };
        
        console.log("Sending with attachment info:", attachmentInfo);
        
        // Always pass the message content (even if empty) and the well-structured attachment info
        await onSendMessage(message.trim(), attachmentInfo);
      } else {
        // Send text-only message
        await onSendMessage(message);
      }
      
      // Reset form
      setMessage('');
      setAttachment(null);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message: ' + error.message);
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachment(file);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {/* Attachment preview */}
      {attachment && (
        <div className="p-2 mb-2 bg-gray-100 dark:bg-gray-700 rounded flex items-center">
          <span className="text-sm mr-2 dark:text-white">{attachment.name}</span>
          <button 
            type="button"
            onClick={() => setAttachment(null)}
            className="text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      )}
      
      {/* Input area */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-grow p-2 border rounded-l-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={placeholder}
          disabled={disabled || uploadingAttachment}
        />
        
        {/* Attachment button */}
        <button
          type="button"
          onClick={() => !disableAttachments && fileInputRef.current?.click()}
          className={`px-3 py-2 ${disableAttachments 
            ? 'bg-gray-400 cursor-not-allowed opacity-50' 
            : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          disabled={disabled || uploadingAttachment || disableAttachments}
          aria-label="Attach file"
          title={disableAttachments ? "Attachments are only available for assigned tickets" : "Attach file"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".png,.jpg,.jpeg,.pdf,.docx,.xlsx,.txt"
            disabled={disableAttachments}
          />
        </button>
        
        {/* Send button */}
        <button
          type="submit"
          className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={disabled || uploadingAttachment || (!message.trim() && !attachment)}
        >
          {uploadingAttachment ? (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
} 