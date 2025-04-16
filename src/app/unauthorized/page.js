'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function UnauthorizedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('You do not have permission to access this page');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Get custom message from URL if provided
    const urlMessage = searchParams.get('message');
    if (urlMessage) {
      setMessage(urlMessage);
    }

    // Countdown to redirect
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4">
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-500 mb-4">Access Denied</h1>
        
        <div className="text-7xl mb-6">🚫</div>
        
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          {message}
        </p>
        
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Redirecting to home page in {countdown} seconds...
        </p>
        
        <div className="flex justify-center space-x-4">
          <Link href="/"
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
          >
            Go to Home
          </Link>
          
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
} 