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
  // Get active services from service_item table
  async getActiveServices() {
    if (!supabase) {
      console.log('Supabase client not initialized');
      return null;
    }
    
    try {
      console.log('Fetching services from service_item table...');
      
      const { data, error } = await supabase
        .from('service_item')
        .select('*')
        .eq('status_id', '9a32e65f-7d52-49ac-aef5-836a9a01f14e') // Only active services
        .order('sort_order', { ascending: true });
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Services fetched:', data);
      return data;
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