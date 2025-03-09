'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';

export default function ChatListPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    // Check if user is authenticated
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    // Fetch contacts for chat
    const fetchContacts = async () => {
      try {
        const response = await fetch('/api/chat');
        if (response.ok) {
          const data = await response.json();
          setContacts(data);
        }
      } catch (error) {
        console.error('Error fetching contacts:', error);
      }
    };

    if (isAuthenticated) {
      fetchContacts();
    }
  }, [isAuthenticated]);

  const handleChatClick = (contactId) => {
    router.push(`/chat/${contactId}`);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If there's only one contact, redirect directly to that chat
  useEffect(() => {
    if (contacts.length === 1) {
      router.push(`/chat/${contacts[0].id}`);
    }
  }, [contacts, router]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h1 className="text-2xl font-bold mb-4">Conversations</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Select a contact to start chatting.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {contacts.length > 0 ? (
          <div className="space-y-4">
            {contacts.map(contact => (
              <div 
                key={contact.id} 
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition"
                onClick={() => handleChatClick(contact.id)}
              >
                <div className="flex items-center">
                  <Avatar 
                    src={contact.avatar} 
                    alt={contact.name}
                    size="md"
                  />
                  <div className="ml-4">
                    <h3 className="font-medium">{contact.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {contact.role === 'helpdesk' ? 'Support Agent' : contact.role === 'admin' ? 'Administrator' : 'User'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="inline-block p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-gray-600 dark:text-gray-300">
                No contacts found. If you're a user, please wait for an administrator to assign you to a helpdesk.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
