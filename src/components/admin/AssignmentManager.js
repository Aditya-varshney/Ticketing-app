'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';

export default function AssignmentManager({ users, helpdesks }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedHelpdesk, setSelectedHelpdesk] = useState(null);
  const [notification, setNotification] = useState(null);

  // Fetch existing assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/assignments');
        if (!response.ok) {
          throw new Error('Failed to fetch assignments');
        }
        
        const data = await response.json();
        setAssignments(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching assignments:', err);
        setError('Failed to load assignments. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  // Find the helpdesk assigned to a user
  const findHelpdeskForUser = (userId) => {
    const assignment = assignments.find(a => a.user._id === userId);
    return assignment ? assignment.helpdesk._id : null;
  };

  // Handle assignment update
  const handleAssignment = async (userId, helpdeskId) => {
    try {
      setLoading(true);
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, helpdeskId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update assignment');
      }

      // Refresh assignments
      const assignmentsResponse = await fetch('/api/assignments');
      if (assignmentsResponse.ok) {
        const updatedAssignments = await assignmentsResponse.json();
        setAssignments(updatedAssignments);
      }

      setNotification({
        type: 'success',
        message: 'Assignment updated successfully'
      });
      
    } catch (err) {
      console.error('Error updating assignment:', err);
      setError(err.message || 'Failed to update assignment');
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update assignment'
      });
    } finally {
      setLoading(false);
      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Handle assignment removal
  const handleRemoveAssignment = async (userId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/assignments?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove assignment');
      }

      // Refresh assignments
      const assignmentsResponse = await fetch('/api/assignments');
      if (assignmentsResponse.ok) {
        const updatedAssignments = await assignmentsResponse.json();
        setAssignments(updatedAssignments);
      }

      setNotification({
        type: 'success',
        message: 'Assignment removed successfully'
      });
      
    } catch (err) {
      console.error('Error removing assignment:', err);
      setError(err.message || 'Failed to remove assignment');
      setNotification({
        type: 'error',
        message: err.message || 'Failed to remove assignment'
      });
    } finally {
      setLoading(false);
      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    }
  };

  if (loading && assignments.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Manage User Assignments</h2>
      
      {notification && (
        <div className={`mb-4 p-3 rounded-md ${
          notification.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {notification.message}
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Create New Assignment</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select User
            </label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={selectedUser || ''}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="">Select User</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>{user.name} ({user.email})</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Helpdesk Staff
            </label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={selectedHelpdesk || ''}
              onChange={(e) => setSelectedHelpdesk(e.target.value)}
            >
              <option value="">Select Helpdesk</option>
              {helpdesks.map(helpdesk => (
                <option key={helpdesk._id} value={helpdesk._id}>{helpdesk.name} ({helpdesk.email})</option>
              ))}
            </select>
          </div>
          
          <div className="self-end">
            <Button 
              onClick={() => handleAssignment(selectedUser, selectedHelpdesk)} 
              disabled={!selectedUser || !selectedHelpdesk || loading}
            >
              {loading ? 'Processing...' : 'Assign User'}
            </Button>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-medium mb-3">Current Assignments</h3>
      
      {assignments.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 italic">
          No assignments found. Create your first assignment above.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Assigned Helpdesk
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Assigned By
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {assignments.map((assignment) => (
                <tr key={assignment._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar src={assignment.user.avatar} alt={assignment.user.name} size="sm" />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {assignment.user.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {assignment.user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar src={assignment.helpdesk.avatar} alt={assignment.helpdesk.name} size="sm" />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {assignment.helpdesk.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {assignment.helpdesk.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">{assignment.assignedBy.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button 
                      variant="danger" 
                      size="sm"
                      onClick={() => handleRemoveAssignment(assignment.user._id)}
                      disabled={loading}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
