import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../supabase';
import { AuthUtils, SimpleUser } from './auth.utils';
import { User, Session, AuthError } from '@supabase/supabase-js';

interface AuthState {
  authenticated: boolean;
  token: string;
  user: SimpleUser;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  // Auth methods
  signInWithEmail: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signInWithGoogle: () => Promise<{ error?: AuthError }>;
  signOut: () => Promise<{ error?: AuthError }>;
  forgotPassword: (email: string) => Promise<{ error?: AuthError }>;
  
  // Token management
  refreshToken: () => Promise<void>;
  check: () => boolean;
}

const initialUser: SimpleUser = {
  avatar: '/assets/images/avatars/guest.png',
  email: '',
  id: '',
  name: 'Guest',
};

const initialState: AuthState = {
  authenticated: false,
  token: '',
  user: initialUser,
  loading: true,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    // Initialize from localStorage if available
    const cachedToken = localStorage.getItem('accessToken') ?? '';
    const cachedUser = AuthUtils.getUserFromToken(cachedToken, 100);
    
    return {
      authenticated: !!cachedUser,
      token: cachedUser ? cachedToken : '',
      user: cachedUser || initialUser,
      loading: true,
    };
  });

  // Update state helper
  const updateState = (newState: Partial<AuthState>) => {
    setState(prev => {
      const updated = { ...prev, ...newState };
      // Save token to localStorage when it changes
      if (newState.token !== undefined) {
        if (newState.token) {
          localStorage.setItem('accessToken', newState.token);
        } else {
          localStorage.removeItem('accessToken');
        }
      }
      return updated;
    });
  };

  // Convert Supabase User to SimpleUser
  const convertSupabaseUser = (user: User): SimpleUser => ({
    avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
    email: user.email || '',
    id: user.id,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'User',
  });

  // Handle auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        updateState({
          authenticated: true,
          token: session.access_token,
          user: convertSupabaseUser(session.user),
          loading: false,
        });
      } else {
        updateState({
          authenticated: false,
          token: '',
          user: initialUser,
          loading: false,
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          updateState({
            authenticated: true,
            token: session.access_token,
            user: convertSupabaseUser(session.user),
            loading: false,
          });
          
          // Set up token refresh
          setRefreshAccessToken(session.access_token);
        } else {
          updateState({
            authenticated: false,
            token: '',
            user: initialUser,
            loading: false,
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Token refresh logic
  const setRefreshAccessToken = (token: string) => {
    const expDate = AuthUtils.getTokenExpirationDate(token);

    if (!expDate) {
      return;
    }

    const expDiff = expDate.valueOf() - new Date().valueOf();
    
    if (expDiff > 0) {
      setTimeout(() => {
        refreshToken();
      }, expDiff - 10 * 1000); // Refresh 10 seconds before expiry
    } else {
      refreshToken();
    }
  };

  // Auth methods
  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (!error) {
      updateState({
        authenticated: false,
        token: '',
        user: initialUser,
      });
    }
    
    return { error };
  };

  const forgotPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  const refreshToken = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (data.session && !error) {
      updateState({
        token: data.session.access_token,
      });
      setRefreshAccessToken(data.session.access_token);
    }
  };

  const check = (): boolean => {
    // Check if the user is logged in
    if (state.authenticated) {
      return true;
    }

    // Check the access token availability
    if (!state.token) {
      return false;
    }

    // Check the access token expire date
    if (AuthUtils.isTokenExpired(state.token)) {
      return false;
    }

    return true;
  };

  const value: AuthContextType = {
    ...state,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    forgotPassword,
    refreshToken,
    check,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};