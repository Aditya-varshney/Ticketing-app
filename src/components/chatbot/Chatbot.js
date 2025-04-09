'use client';

import React, { useState, useRef, useEffect } from 'react';
import RAGPipelineFactory from './ragPipeline';

const Chatbot = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [pipelineType, setPipelineType] = useState('gemini-base'); // Default to Gemini Base
    const [isMinimized, setIsMinimized] = useState(false);
    const messagesEndRef = useRef(null);
    const ragPipeline = useRef(null);

    useEffect(() => {
        try {
            ragPipeline.current = RAGPipelineFactory.createPipeline(pipelineType);
            console.log('Pipeline created successfully:', pipelineType);
        } catch (error) {
            console.error('Error creating pipeline:', error);
        }
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [pipelineType]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
        setIsLoading(true);

        try {
            console.log('Querying pipeline with:', userMessage);
            console.log('Current pipeline type:', pipelineType);
            console.log('Pipeline instance:', ragPipeline.current);
            
            const response = await ragPipeline.current.query(userMessage);
            console.log('Response received:', response);
            
            setMessages(prev => [...prev, { text: response, isUser: false }]);
        } catch (error) {
            console.error('Detailed error:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            setMessages(prev => [...prev, { 
                text: `Error: ${error.message || "I'm sorry, I encountered an error while processing your request."}`, 
                isUser: false 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const togglePipeline = () => {
        setPipelineType(prev => {
            switch (prev) {
                case 'gemini-base':
                    return 'gemini-pro';
                case 'gemini-pro':
                    return 'openai';
                case 'openai':
                    return 'gemini-base';
                default:
                    return 'gemini-base';
            }
        });
        setMessages([]); // Clear messages when switching pipelines
    };

    const getPipelineName = (type) => {
        switch (type) {
            case 'gemini-base':
                return 'Gemini Base';
            case 'gemini-pro':
                return 'Gemini Pro';
            case 'openai':
                return 'OpenAI';
            default:
                return 'Unknown';
        }
    };

    if (isMinimized) {
        return (
            <div className="fixed bottom-4 right-4 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Help Assistant</h3>
                    <div className="flex space-x-2">
                        <button
                            onClick={togglePipeline}
                            className="text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-2 py-1 rounded text-gray-800 dark:text-gray-200"
                        >
                            {getPipelineName(pipelineType)}
                        </button>
                        <button
                            onClick={() => setIsMinimized(false)}
                            className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                        >
                            Maximize
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Help Assistant</h3>
                <div className="flex space-x-2">
                    <button
                        onClick={togglePipeline}
                        className="text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 py-1 rounded text-gray-800 dark:text-gray-200"
                    >
                        Switch to {getPipelineName(pipelineType === 'gemini-base' ? 'gemini-pro' : 
                                                pipelineType === 'gemini-pro' ? 'openai' : 'gemini-base')}
                    </button>
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 py-1 rounded text-gray-800 dark:text-gray-200"
                    >
                        Minimize
                    </button>
                </div>
            </div>
            
            <div className="h-96 overflow-y-auto p-4">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`mb-4 p-3 rounded-lg ${
                            message.isUser
                                ? 'bg-blue-100 dark:bg-blue-900 ml-auto'
                                : 'bg-gray-100 dark:bg-gray-700'
                        }`}
                    >
                        <p className="text-gray-900 dark:text-gray-100">{message.text}</p>
                    </div>
                ))}
                {isLoading && (
                    <div className="mb-4 p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                        <p className="text-gray-900 dark:text-gray-100">Thinking...</p>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your question..."
                        className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-lg disabled:opacity-50"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Chatbot; 