'use client';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Use memo to prevent unnecessary re-renders
  const authUser = useMemo(() => {
    return session?.user || null;
  }, [session]);

  useEffect(() => {
    // Add timeout to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      if (loading && status !== 'loading') {
        setLoading(false);
      }
    }, 5000); // 5-second safety timeout

    if (status === 'authenticated' && session?.user) {
      setUser(session.user);
      setLoading(false);
      
      // Handle role-based redirect
      const path = window.location.pathname;
      if (path === '/login' || path === '/') {
        const role = session.user.role || 'user';
        router.push(`/${role}`);
      }
    } else if (status === 'unauthenticated') {
      setUser(null);
      setLoading(false);
      
      // Only redirect if not already on login page
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register') {
        router.push('/login');
      }
    }

    return () => clearTimeout(timeoutId);
  }, [authUser, status, router]);

  const login = async (credentials) => {
    try {
      const result = await signIn('credentials', {
        ...credentials,
        redirect: false,
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
