'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import AssignmentManager from '@/components/admin/AssignmentManager';

export default function AdminDashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [helpdesks, setHelpdesks] = useState([]);
  const [showAssignments, setShowAssignments] = useState(false);

  useEffect(() => {
    // Check if user is authenticated and has the correct role
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    } else if (!loading && user?.role !== 'admin') {
      router.replace(`/${user?.role}`);
    }
  }, [loading, isAuthenticated, user, router]);

  useEffect(() => {
    // Fetch all users for the admin
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/chat');
        if (response.ok) {
          const data = await response.json();
          setUsers(data.filter(u => u.role === 'user'));
          setHelpdesks(data.filter(u => u.role === 'helpdesk'));
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    if (isAuthenticated) {
      fetchUsers();
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Welcome back, {user?.name}!
            </p>
          </div>
          <div>
            <Button 
              onClick={() => setShowAssignments(!showAssignments)}
              variant={showAssignments ? "secondary" : "primary"}
            >
              {showAssignments ? "View Users List" : "Manage Assignments"}
            </Button>
          </div>
        </div>
      </div>

      {showAssignments ? (
        <AssignmentManager users={users} helpdesks={helpdesks} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Users</h2>
            
            {users.length > 0 ? (
              <div className="space-y-4">
                {users.map(user => (
                  <div key={user.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar
                          src={user.avatar}
                          alt={user.name}
                          size="md"
                        />
                        <div>
                          <h3 className="font-medium">{user.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => router.push(`/chat/${user.id}`)}
                        size="sm"
                      >
                        Chat
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No users found.
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Helpdesk Staff</h2>
            
            {helpdesks.length > 0 ? (
              <div className="space-y-4">
                {helpdesks.map(helpdesk => (
                  <div key={helpdesk.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar
                          src={helpdesk.avatar}
                          alt={helpdesk.name}
                          size="md"
                        />
                        <div>
                          <h3 className="font-medium">{helpdesk.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {helpdesk.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => router.push(`/chat/${helpdesk.id}`)}
                        size="sm"
                      >
                        Chat
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No helpdesk staff found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
