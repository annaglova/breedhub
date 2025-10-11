import { createClient } from '@supabase/supabase-js';
import { checkSupabaseConnection as checkConnection } from '@breedhub/rxdb-store';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Re-export checkSupabaseConnection from rxdb-store
export const checkSupabaseConnection = checkConnection;

export type Database = any; // TODO: Буде замінено на типи з Supabase