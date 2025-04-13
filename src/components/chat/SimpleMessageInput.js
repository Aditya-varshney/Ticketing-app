import React, { useState, useRef } from 'react';
import Button from '../ui/Button';

export default function SimpleMessageInput({ onSendMessage }) {
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);

  console.log("SimpleMessageInput rendering");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() || attachment) {
      console.log("Sending message", { message, attachment });
      onSendMessage?.(message, attachment);
      setMessage('');
      setAttachment(null);
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
    <div className="w-full p-4 bg-white border-t border-gray-200">
      <form onSubmit={handleSubmit} className="flex flex-col">
        {/* Message preview */}
        {attachment && (
          <div className="p-2 mb-2 bg-gray-100 rounded flex items-center">
            <span className="text-sm mr-2">{attachment.name}</span>
            <button 
              type="button"
              onClick={() => setAttachment(null)}
              className="text-red-500"
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
            className="flex-grow p-2 border rounded-md"
            placeholder="Type a message..."
          />
          
          {/* Attachment button - styled very distinctively */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-red-500 text-white font-bold rounded-md hover:bg-red-600"
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
            disabled={!message.trim() && !attachment}
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  );
} 