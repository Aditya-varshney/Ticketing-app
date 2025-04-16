'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminOnly({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Check if the authentication is still loading
    if (status === 'loading') return;

    // Check if the user is authenticated and is an admin
    if (!session || session.user?.role !== 'admin') {
      router.push('/unauthorized?message=Admin access required');
    } else {
      setAuthorized(true);
    }
  }, [session, status, router]);

  // Show loading while checking authorization or if not yet authorized
  if (status === 'loading' || !authorized) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  // If authorized, show children
  return <>{children}</>;
} 