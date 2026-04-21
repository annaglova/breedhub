import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../supabase';
import { AuthUtils, SimpleUser } from './auth.utils';
import { User, AuthError } from '@supabase/supabase-js';

interface AuthState {
  authenticated: boolean;
  token: string;
  user: SimpleUser;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signInWithFacebook: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  forgotPassword: (email: string) => Promise<{ error: AuthError | null }>;
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
  const [state, setState] = useState<AuthState>(initialState);

  const updateState = (newState: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...newState }));
  };

  const convertSupabaseUser = (user: User): SimpleUser => ({
    avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
    email: user.email || '',
    id: user.id,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'User',
  });

  useEffect(() => {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          updateState({
            authenticated: true,
            token: session.access_token,
            user: convertSupabaseUser(session.user),
            loading: false,
          });

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

  const setRefreshAccessToken = (token: string) => {
    const expDate = AuthUtils.getTokenExpirationDate(token);

    if (!expDate) {
      return;
    }

    const expDiff = expDate.valueOf() - new Date().valueOf();

    if (expDiff > 0) {
      setTimeout(() => {
        refreshToken();
      }, expDiff - 10 * 1000);
    } else {
      refreshToken();
    }
  };

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
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return { error };
  };

  const signInWithFacebook = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
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

    return { error: error || null };
  };

  const forgotPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
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
    if (state.authenticated) {
      return true;
    }

    if (!state.token) {
      return false;
    }

    if (AuthUtils.isTokenExpired(state.token)) {
      return false;
    }

    return true;
  };

  const value: AuthContextType = {
    ...state,
    signInWithEmail,
    signInWithGoogle,
    signInWithFacebook,
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
