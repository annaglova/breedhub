import { createClient } from '@supabase/supabase-js';

// Supabase configuration - must be set in .env
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file'
  );
}

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Check connection
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    // Try to get any table structure to test connection
    const { error } = await supabase
      .from('service_item')  // Use a known table from landing
      .select('id')
      .limit(1);
    
    // If table doesn't exist, try another known table
    if (error?.code === '42P01') {
      // Try breeds table
      const { error: breedsError } = await supabase
        .from('breeds')
        .select('id')
        .limit(1);
      
      if (breedsError?.code === '42P01') {
        console.log('⚠️ Supabase connected but tables not found (need migration)');
        return true; // Connection works, just no tables yet
      }
      
      if (!breedsError) {
        console.log('✅ Supabase connected (breeds table exists)');
        return true;
      }
    }
    
    if (!error) {
      console.log('✅ Supabase connected successfully');
      return true;
    }
    
    console.error('❌ Supabase connection error:', error);
    return false;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return false;
  }
}

// Get current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return user;
}

// Sign in anonymously (for testing)
export async function signInAnonymously() {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error('Error signing in anonymously:', error);
    return null;
  }
  console.log('✅ Signed in anonymously:', data.user?.id);
  return data.user;
}