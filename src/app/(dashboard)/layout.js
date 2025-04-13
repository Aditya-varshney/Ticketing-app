'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import ClientProviders from '@/components/ClientProviders';
import Logo from '@/components/ui/Logo';
import Chatbot from '@/components/chatbot/Chatbot';
import DarkModeToggle from '@/components/DarkModeToggle';

export default function DashboardLayout({ children }) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // Determine if the current route is admin, helpdesk, or user
  const isDashboardPath = pathname.includes('/admin') || 
                           pathname.includes('/helpdesk') || 
                           pathname.includes('/user');
  
  useEffect(() => {
    // If the user is authenticated but tries to access a role they don't have
    if (!loading && isAuthenticated && user) {
      if (pathname.includes('/admin') && user.role !== 'admin') {
        router.replace(`/${user.role}`);
      } else if (pathname.includes('/helpdesk') && user.role !== 'helpdesk') {
        router.replace(`/${user.role}`);
      } else if (pathname.includes('/user') && user.role !== 'user') {
        router.replace(`/${user.role}`);
      }
    }
  }, [loading, isAuthenticated, user, router, pathname]);

  // Wait for auth to complete before showing anything
  if (loading || !isDashboardPath) {
    return children;
  }
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Logo size="md" className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {/* Navigation links */}
              </div>
            </div>
            <div className="flex items-center">
              {user && (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {user.name} ({user.role})
                  </span>
                  <button 
                    onClick={logout}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="py-10">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
} 