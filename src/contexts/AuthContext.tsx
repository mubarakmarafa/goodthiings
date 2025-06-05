import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  last_used_style: 'handdrawn' | '3d';
}

interface AuthContextType {
  user: User | null;
  apiKey: string | null;
  isLoading: boolean;
  login: (email: string, password: string, apiKey: string) => Promise<void>;
  signup: (email: string, password: string, apiKey: string) => Promise<void>;
  logout: () => void;
  updateApiKey: (apiKey: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// API Key storage utilities (localStorage)
const API_KEY_STORAGE_KEY = 'goodthiings_api_key';

const storeApiKey = (apiKey: string) => {
  localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
};

const getStoredApiKey = (): string | null => {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
};

const removeStoredApiKey = () => {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
};

// Auth session storage
const SESSION_STORAGE_KEY = 'goodthiings_session';

const storeSession = (user: User, session: any) => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user, session }));
};

const getStoredSession = () => {
  const stored = localStorage.getItem(SESSION_STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
};

const removeStoredSession = () => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedSession = getStoredSession();
    const storedApiKey = getStoredApiKey();

    if (storedSession && storedSession.user) {
      setUser(storedSession.user);
    }

    if (storedApiKey) {
      setApiKey(storedApiKey);
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, userApiKey: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store user data and session
      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        last_used_style: '3d', // Default style
      };

      setUser(userData);
      storeSession(userData, data.session);

      // Store API key securely in localStorage
      setApiKey(userApiKey);
      storeApiKey(userApiKey);

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, userApiKey: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Store user data and session
      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        last_used_style: '3d', // Default style
      };

      setUser(userData);
      storeSession(userData, data.session);

      // Store API key securely in localStorage
      setApiKey(userApiKey);
      storeApiKey(userApiKey);

    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setApiKey(null);
    removeStoredSession();
    removeStoredApiKey();
  };

  const updateApiKey = (newApiKey: string) => {
    setApiKey(newApiKey);
    storeApiKey(newApiKey);
  };

  const value: AuthContextType = {
    user,
    apiKey,
    isLoading,
    login,
    signup,
    logout,
    updateApiKey,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 