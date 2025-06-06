import { createContext, useContext, useState, useEffect } from 'react';
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
  resetPassword: (email: string) => Promise<void>;
  logout: () => void;
  updateApiKey: (apiKey: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Use Supabase Edge Functions for authentication
const SUPABASE_URL = 'https://whstudldcjncgyybfezn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indoc3R1ZGxkY2puY2d5eWJmZXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNDE4MjEsImV4cCI6MjA2NDcxNzgyMX0.carn2tL9vdzIF6DlL3SF1jqMQppSj_Y_9FHgjunVVIE';
const EDGE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

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
    console.log('🔍 LOGIN FUNCTION CALLED with:', { email, password: password.slice(0, 3) + '***', hasApiKey: !!userApiKey });
    setIsLoading(true);
    
    // DEVELOPMENT BYPASS - Remove this in production!
    if (email === 'dev@test.com' && password === 'dev123') {
      console.log('🚀🚀🚀 DEVELOPMENT BYPASS ACTIVATED - SUCCESS! 🚀🚀🚀');
      alert('DEVELOPMENT BYPASS ACTIVATED!'); // Make it super obvious
      const devUser: User = {
        id: 'dev-user-123',
        email: 'dev@test.com',
        last_used_style: '3d',
      };
      setUser(devUser);
      storeSession(devUser, { access_token: 'dev-token' });
      setApiKey(userApiKey);
      storeApiKey(userApiKey);
      setIsLoading(false);
      return;
    }
    
    console.log('❌ Development bypass NOT activated. Email:', email, 'Password length:', password.length);
    
    try {
      console.log('🌐 Making request to auth-signin:', `${EDGE_FUNCTIONS_URL}/auth-signin`);
      
      const response = await fetch(`${EDGE_FUNCTIONS_URL}/auth-signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('📡 Response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      const data = await response.json();
      
      console.log('📦 Login response data:', { 
        status: response.status, 
        data,
        responseOk: response.ok,
        fullResponse: response
      });

      if (!response.ok) {
        console.log('❌ Login failed with detailed error:', {
          status: response.status,
          statusText: response.statusText,
          errorData: data,
          errorMessage: data.error,
          originalError: data.originalError,
          errorCode: data.errorCode
        });
        
        // Use the more specific error message if available
        let errorMessage = data.originalError || data.error || 'Login failed';
        
        // Special handling for common Supabase auth issues
        if (errorMessage.includes('Invalid login credentials')) {
          errorMessage = 'Login failed. This could be due to: wrong password, unconfirmed email, or account issues. Please check your email for a confirmation link or try resetting your password.';
        }
        
        throw new Error(errorMessage);
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
      const response = await fetch(`${EDGE_FUNCTIONS_URL}/auth-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      console.log('Signup response:', { status: response.status, data });

      if (!response.ok) {
        console.log('Signup failed with error:', data.error);
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

  const resetPassword = async (email: string) => {
    console.log('🔑 Requesting password reset for:', email);
    
    // For now, we'll use a simple approach with Supabase client
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ 
          email,
          options: {
            redirectTo: window.location.origin
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Password reset failed');
      }

      console.log('✅ Password reset email sent successfully');
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
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
    resetPassword,
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