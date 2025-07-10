import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseAnonKey);

let supabase = null;
let connectionError = null;

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
    console.log('Supabase client initialized:', !!supabase);
  } catch (error) {
    connectionError = error;
    console.error('Failed to initialize Supabase client:', error);
  }
}

export { supabase, connectionError };

// Landing page data service
export const landingService = {
  // Get active services from service_item table with their conf_items
  async getActiveServices() {
    if (!supabase) {
      console.log('Supabase client not initialized');
      return null;
    }
    
    try {
      console.log('Fetching services from service_item table...');
      
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
      
      console.log('Services fetched:', services);
      
      // For each service, get its conf_items
      if (services && services.length > 0) {
        const servicesWithConfItems = await Promise.all(
          services.map(async (service) => {
            // Get conf_items for this service
            const { data: confItemRelations, error: relError } = await supabase
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
            
            // Get status names for each conf_item
            const confItemsWithStatus = await Promise.all(
              (confItemRelations || []).map(async (rel) => {
                if (!rel.conf_item) return null;
                
                // Get status name from conf_item_status
                const { data: status } = await supabase
                  .from('conf_item_status')
                  .select('id, name')
                  .eq('id', rel.conf_item.status_id)
                  .single();
                
                return {
                  id: rel.conf_item.id,
                  name: rel.conf_item.name,
                  description: rel.conf_item.description,
                  icon: rel.conf_item.icon || '',
                  status: status || { id: rel.conf_item.status_id, name: '' },
                  url: '' // Add URL if needed
                };
              })
            );
            
            return {
              ...service,
              confItems: confItemsWithStatus.filter(item => item !== null)
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
  },

  // Get pricing plans
  async getPricingPlans() {
    if (!supabase) return null;
    
    try {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .order('price', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching pricing plans:', error);
      return null;
    }
  },

  // Get testimonials
  async getTestimonials() {
    if (!supabase) return null;
    
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      return null;
    }
  },

  // Get statistics
  async getStatistics() {
    if (!supabase) return null;
    
    try {
      const { data, error } = await supabase
        .from('platform_statistics')
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return null;
    }
  }
};