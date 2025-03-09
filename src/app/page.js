'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        // Redirect based on user role
        switch (user.role) {
          case 'admin':
            router.replace('/admin');
            break;
          case 'helpdesk':
            router.replace('/helpdesk');
            break;
          case 'user':
            router.replace('/user');
            break;
          default:
            // Default route for authenticated users
            router.replace('/chat');
        }
      } else {
        // Not authenticated, go to login
        router.replace('/login');
      }
    }
  }, [loading, isAuthenticated, user, router]);

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // This page will redirect, so return empty
  return null;
}
