import { createClient } from '@supabase/supabase-js';

// TODO: Додати змінні оточення
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Check Supabase connection
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    // Try simple query to check connection
    const { error } = await supabase
      .from('_any_table')
      .select('count')
      .limit(1)
      .single();
    
    // If we get 42P01 error, it means connection works but table doesn't exist
    // That's fine - connection is working
    if (error?.code === '42P01') {
      console.log('✅ Supabase connected (no tables found yet)');
      return true;
    }
    
    if (!error) {
      console.log('✅ Supabase connected');
      return true;
    }
    
    console.error('❌ Supabase error:', error);
    return false;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return false;
  }
}

export type Database = any; // TODO: Буде замінено на типи з Supabase