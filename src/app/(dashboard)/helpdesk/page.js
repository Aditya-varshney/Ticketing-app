'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';

export default function HelpdeskDashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [assignedUsers, setAssignedUsers] = useState([]);

  useEffect(() => {
    // Check if user is authenticated and has the correct role
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    } else if (!loading && user?.role !== 'helpdesk') {
      router.replace(`/${user?.role}`);
    }
  }, [loading, isAuthenticated, user, router]);

  useEffect(() => {
    // Fetch assigned users for the helpdesk
    const fetchAssignedUsers = async () => {
      try {
        const response = await fetch('/api/chat');
        if (response.ok) {
          const data = await response.json();
          setAssignedUsers(data);
        }
      } catch (error) {
        console.error('Error fetching assigned users:', error);
      }
    };

    if (isAuthenticated) {
      fetchAssignedUsers();
    }
  }, [isAuthenticated]);

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
        <h1 className="text-2xl font-bold mb-4">Helpdesk Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Welcome back, {user?.name}!
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Your Assigned Users</h2>
        
        {assignedUsers.length > 0 ? (
          <div className="space-y-4">
            {assignedUsers.map(assignedUser => (
              <div key={assignedUser.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar
                      src={assignedUser.avatar}
                      alt={assignedUser.name}
                      size="md"
                    />
                    <div>
                      <h3 className="font-medium">{assignedUser.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {assignedUser.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push(`/chat/${assignedUser.id}`)}
                  >
                    Chat with User
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4">
            <p className="text-yellow-700 dark:text-yellow-200">
              You don't have any assigned users yet. Please contact an administrator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
