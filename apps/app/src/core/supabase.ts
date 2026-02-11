export { supabase } from '@shared/core/supabase';
import { checkSupabaseConnection as checkConnection } from '@breedhub/rxdb-store';

// Re-export checkSupabaseConnection from rxdb-store
export const checkSupabaseConnection = checkConnection;

export type Database = any; // TODO: Replace with Supabase generated types
