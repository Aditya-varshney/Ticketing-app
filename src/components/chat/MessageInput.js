'use client';

import React, { useState, useRef } from 'react';
import Button from '../ui/Button';

export default function MessageInput({ onSendMessage, onStartTyping, onStopTyping, isSending }) {
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);
  
  // Handle typing indicator timers
  const typingTimeoutRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  
  // Handle typing indicator
  React.useEffect(() => {
    if (message && !isTyping) {
      setIsTyping(true);
      onStartTyping?.();
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    if (message) {
      typingTimeoutRef.current = setTimeout(() => {
        if (isTyping) {
          setIsTyping(false);
          onStopTyping?.();
        }
      }, 1500);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, isTyping, onStartTyping, onStopTyping]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending) return;

    try {
      await onSendMessage(trimmedMessage, attachment);
      setMessage('');
      setAttachment(null);
      setIsTyping(false);
      onStopTyping?.();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log("File selected:", file.name);
      setAttachment(file);
    }
  };

  return (
    <div className="w-full border-t border-gray-200 dark:border-gray-700">
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
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 min-h-[40px] max-h-[120px] p-2 border rounded-lg resize-y dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            disabled={isSending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          
          {/* Attachment button - styled very distinctively */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-500 text-white font-bold rounded-md hover:bg-blue-600"
            id="attachment-button"
            disabled={isSending}
          >
            Attach
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".png,.jpg,.jpeg,.pdf,.docx"
            />
          </button>
          
          <Button 
            type="submit" 
            disabled={!message.trim() && !attachment || isSending}
            className={`px-4 py-2 rounded-lg font-medium ${
              !message.trim() && !attachment || isSending
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  );
}
