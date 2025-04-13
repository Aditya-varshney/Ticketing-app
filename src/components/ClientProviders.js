'use client';

import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ChatProvider with SSR disabled
const DynamicChatProvider = dynamic(
  () => import('@/context/ChatContext').then(mod => ({ default: mod.ChatProvider })),
  { ssr: false }
);

// Dynamic wrapper to conditionally load ChatProvider
const ConditionalChatProvider = ({ children }) => {
  const pathname = usePathname();
  const [isChatRequired, setIsChatRequired] = useState(false);
  
  useEffect(() => {
    // Check if the current route requires chat functionality
    const pathRequiresChatImmediate = pathname && (
      pathname.includes('/admin') || 
      pathname.includes('/helpdesk')
    );
    
    const pathRequiresChatDelayed = pathname && pathname.includes('/user');
    
    // Load immediately for admin/helpdesk, delayed for user
    if (pathRequiresChatImmediate) {
      setIsChatRequired(true);
    } else if (pathRequiresChatDelayed) {
      // Delay chat provider for user routes to prioritize UI loading
      const timeoutId = setTimeout(() => {
        setIsChatRequired(true);
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [pathname]);
  
  if (!isChatRequired) {
    return children;
  }
  
  return (
    <Suspense fallback={children}>
      <DynamicChatProvider>{children}</DynamicChatProvider>
    </Suspense>
  );
};

export default function ClientProviders({ children, session }) {
  return (
    <SessionProvider session={session}>
      <AuthProvider>
        <ConditionalChatProvider>
          {children}
        </ConditionalChatProvider>
      </AuthProvider>
    </SessionProvider>
  );
}
