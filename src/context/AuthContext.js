'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setUser(session.user);
    } else {
      setUser(null);
    }
    setLoading(status === 'loading');
  }, [session, status]);

  const login = async (credentials) => {
    try {
      console.log("AuthContext: Login attempt", { email: credentials.email });
      
      const result = await signIn('credentials', {
        ...credentials,
        redirect: false,
      });
      
      console.log("AuthContext: Login result", result);
      
      if (result.error) {
        console.error("AuthContext: Login failed", result.error);
        throw new Error(result.error);
      }
      
      console.log("AuthContext: Login successful");
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
