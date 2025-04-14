'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

const TicketAuditTrail = ({ ticketId }) => {
  const [auditTrail, setAuditTrail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAuditTrail = async () => {
      try {
        const response = await fetch(`/api/tickets/${ticketId}/audit`);
        if (!response.ok) {
          throw new Error('Failed to fetch audit trail');
        }
        const data = await response.json();
        setAuditTrail(data.auditTrail);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditTrail();
  }, [ticketId]);

  const getActionColor = (action) => {
    switch (action) {
      case 'created':
        return 'text-green-600 dark:text-green-400';
      case 'updated':
        return 'text-blue-600 dark:text-blue-400';
      case 'assigned':
        return 'text-purple-600 dark:text-purple-400';
      case 'status_changed':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'priority_changed':
        return 'text-orange-600 dark:text-orange-400';
      case 'revoked':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const formatActionText = (action) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Ticket Audit Trail
          </h3>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-center">
            No audit history is available yet. Changes to this ticket will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Ticket Audit Trail
        </h3>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {auditTrail.map((entry) => (
            <li key={entry.id} className="p-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${getActionColor(entry.action)}`}>
                    {formatActionText(entry.action)}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(entry.createdAt), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  By: {entry.user.name} ({entry.user.email})
                </div>
                {entry.previousValue && entry.newValue && (
                  <div className="text-sm">
                    <div className="text-gray-500 dark:text-gray-400">
                      From: <span className="text-gray-700 dark:text-gray-300">{entry.previousValue}</span>
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      To: <span className="text-gray-700 dark:text-gray-300">{entry.newValue}</span>
                    </div>
                  </div>
                )}
                {entry.details && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {entry.details}
                  </div>
                )}
              </div>
            </li>
          ))}
          {auditTrail.length === 0 && (
            <li className="p-4 text-center text-gray-500 dark:text-gray-400">
              No audit records found
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default TicketAuditTrail; 