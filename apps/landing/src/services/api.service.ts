import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
let connectionError: unknown = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Using mock data.');
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  } catch (error) {
    connectionError = error;
    console.error('Failed to initialize Supabase client:', error);
  }
}

export { supabase, connectionError };

// Landing page data service
// NOTE: landing owns its own Supabase client (separate from packages/rxdb-store).
// This causes a "Multiple GoTrueClient instances detected" warning in the app.
// Consolidation deferred to a cross-cutting slice that touches both landing
// and packages/rxdb-store.
export const landingService = {
  // Get active services from service_item table with their conf_items
  async getActiveServices() {
    if (!supabase) {
      return null;
    }

    try {
      // First get active services
      const { data: services, error: servicesError } = await supabase
        .from('service_item')
        .select('*')
        .eq('status_id', '9a32e65f-7d52-49ac-aef5-836a9a01f14e') // Only active services
        .order('sort_order', { ascending: true });

      if (servicesError) {
        console.error('Supabase error:', servicesError);
        throw servicesError;
      }

      // For each service, get its conf_items
      if (services && services.length > 0) {
        // Capture narrowed client so TS doesn't lose the non-null narrowing
        // inside the Promise.all callbacks (flow analysis can't carry it
        // across await boundaries).
        const client = supabase;
        interface ConfItemRow {
          id: string;
          name: string;
          description: string | null;
          icon: string | null;
          status_id: string;
        }
        interface ConfItemRelationRow {
          conf_item_id: string;
          // PostgREST returns embedded relations as an array when the
          // relationship isn't explicitly single — treat both shapes.
          conf_item: ConfItemRow | ConfItemRow[] | null;
        }

        const servicesWithConfItems = await Promise.all(
          services.map(async (service: { id: string } & Record<string, unknown>) => {
            // Get conf_items for this service
            const { data: confItemRelations, error: relError } = await client
              .from('service_in_conf_item')
              .select(`
                conf_item_id,
                conf_item:conf_item_id (
                  id,
                  name,
                  description,
                  icon,
                  status_id
                )
              `)
              .eq('service_item_id', service.id);

            if (relError) {
              console.error('Error fetching conf_items for service:', service.id, relError);
              return { ...service, confItems: [] };
            }

            // Status is hardcoded as fallback — conf_item_status lookup table
            // doesn't exist in this environment. See P3 audit in
            // CODEX_LANDING_WAVE_HANDOFF.md.
            const confItems = ((confItemRelations ?? []) as unknown as ConfItemRelationRow[])
              .map((rel) => {
                const confItem = Array.isArray(rel.conf_item)
                  ? rel.conf_item[0]
                  : rel.conf_item;
                if (!confItem) return null;
                return {
                  id: confItem.id,
                  name: confItem.name,
                  description: confItem.description,
                  icon: confItem.icon || '',
                  status: { id: confItem.status_id, name: '' },
                  url: '',
                };
              })
              .filter((item): item is NonNullable<typeof item> => item !== null);

            return {
              ...service,
              confItems,
            };
          })
        );

        return servicesWithConfItems;
      }

      return services;
    } catch (error) {
      console.error('Error fetching services:', error);
      return null;
    }
  }
};
