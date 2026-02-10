import { createClient } from '@supabase/supabase-js';
import { checkSupabaseConnection as checkConnection } from '@breedhub/rxdb-store';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file');
}

// Capture hash tokens before Supabase client processes them
const _initialHash = window.location.hash;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
});

// If detectSessionInUrl failed to establish session, manually set it from captured hash
if (_initialHash && _initialHash.includes('access_token')) {
  const params = new URLSearchParams(_initialHash.substring(1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        console.log("[Supabase] detectSessionInUrl failed, setting session manually");
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }
    });
  }
}

// Re-export checkSupabaseConnection from rxdb-store
export const checkSupabaseConnection = checkConnection;

export type Database = any; // TODO: Буде замінено на типи з Supabase