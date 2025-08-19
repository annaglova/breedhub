import { supabase } from './client';

/**
 * Fetch table schema directly from Supabase
 */
export async function fetchTableSchema(tableName: string) {
  try {
    // Method 1: Try to get one row to inspect structure
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (!error && data && data.length > 0) {
      console.log(`✅ Schema for ${tableName}:`, Object.keys(data[0]));
      return data[0];
    }

    // Method 2: Try OpenAPI spec
    const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://dev.dogarray.com:8020';
    const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${baseUrl}/rest/v1/`, {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/openapi+json'
      }
    });
    
    if (response.ok) {
      const spec = await response.json();
      const tableSchema = spec.definitions?.[tableName];
      if (tableSchema) {
        console.log(`✅ OpenAPI Schema for ${tableName}:`, tableSchema);
        return tableSchema;
      }
    }

    console.log(`❌ Could not fetch schema for ${tableName}`);
    return null;
  } catch (error) {
    console.error(`Error fetching schema for ${tableName}:`, error);
    return null;
  }
}

/**
 * Test fetching schemas
 */
export async function testSchemaFetch() {
  console.log('🔍 Testing schema fetch...');
  
  const breed = await fetchTableSchema('breed');
  const pet = await fetchTableSchema('pet');
  
  return { breed, pet };
}