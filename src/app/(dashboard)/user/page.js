'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import Button from '@/components/ui/Button';

export default function UserDashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [helpdesk, setHelpdesk] = useState(null);

  useEffect(() => {
    // Check if user is authenticated and has the correct role
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    } else if (!loading && user?.role !== 'user') {
      router.replace(`/${user?.role}`);
    }
  }, [loading, isAuthenticated, user, router]);

  useEffect(() => {
    // Fetch assigned helpdesk for the user
    const fetchHelpdesk = async () => {
      try {
        const response = await fetch('/api/chat');
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            setHelpdesk(data[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching helpdesk:', error);
      }
    };

    if (isAuthenticated) {
      fetchHelpdesk();
    }
  }, [isAuthenticated]);

  const handleChatClick = () => {
    if (helpdesk) {
      router.push(`/chat/${helpdesk._id}`);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h1 className="text-2xl font-bold mb-4">User Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Welcome back, {user?.name}!
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Your Helpdesk Support</h2>
        
        {helpdesk ? (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{helpdesk.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {helpdesk.email}
                </p>
              </div>
              <Button onClick={handleChatClick}>
                Chat with Support
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4">
            <p className="text-yellow-700 dark:text-yellow-200">
              You don't have an assigned helpdesk yet. Please contact an administrator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
