'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ChatInterface from '@/components/chat/ChatInterface';
import Button from '@/components/ui/Button';

export default function ChatPage() {
  const { receiverId } = useParams();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [receiver, setReceiver] = useState(null);

  useEffect(() => {
    // Check authentication
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    // Fetch receiver info
    const fetchReceiverInfo = async () => {
      try {
        // Assuming we have an API to get user info
        const response = await fetch(`/api/users/${receiverId}`);
        if (response.ok) {
          const data = await response.json();
          setReceiver(data);
        } else {
          console.error('Failed to fetch receiver info');
        }
      } catch (error) {
        console.error('Error fetching receiver info:', error);
      }
    };

    if (receiverId && isAuthenticated) {
      fetchReceiverInfo();
    }
  }, [receiverId, isAuthenticated]);

  const handleBackClick = () => {
    router.push('/chat');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Chat header */}
      <div className="bg-white dark:bg-gray-800 shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={handleBackClick}
              className="mr-3 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold">
                {receiver?.name || 'Loading...'}
              </h1>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {receiver?.role === 'helpdesk'
                  ? 'Support Agent'
                  : receiver?.role === 'admin'
                  ? 'Administrator'
                  : 'User'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleBackClick} variant="secondary" size="sm">
              Back to Contacts
            </Button>
            <Button onClick={() => logout()} variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Chat interface */}
      <div className="flex-grow overflow-hidden">
        <ChatInterface
          receiverId={receiverId}
          receiverName={receiver?.name || 'User'}
        />
      </div>
    </div>
  );
}
