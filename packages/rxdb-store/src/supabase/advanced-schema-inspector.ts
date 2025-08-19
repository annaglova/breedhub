import { supabase } from './client';

/**
 * Get ALL tables from database using SQL
 */
export async function getAllTablesSQL() {
  try {
    // Try to execute raw SQL to get all tables
    const { data, error } = await supabase.rpc('get_all_tables', {});
    
    if (error) {
      console.log('RPC failed, trying direct query...');
      
      // Alternative: Query pg_tables directly
      const query = `
        SELECT 
          schemaname,
          tablename,
          tableowner
        FROM pg_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY schemaname, tablename;
      `;
      
      // Try to get tables list another way
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_database_tables', {})
        .single();
      
      if (tablesError) {
        console.error('Failed to get tables via RPC:', tablesError);
        
        // Last resort - try direct REST API call
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        });
        
        if (response.ok) {
          const apiDefinition = await response.json();
          console.log('API Definition:', apiDefinition);
          
          // Extract table names from API definition
          const tables = Object.keys(apiDefinition.definitions || {})
            .filter(key => !key.startsWith('rpc.'));
          
          return tables;
        }
      }
      
      return tables || [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Failed to get all tables:', error);
    return [];
  }
}

/**
 * Get tables using Supabase REST API introspection
 */
export async function introspectSupabaseAPI() {
  try {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://dev.dogarray.com:8020';
    const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    // Get OpenAPI spec from Supabase
    const response = await fetch(`${baseUrl}/rest/v1/`, {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/openapi+json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const openApiSpec = await response.json();
    console.log('OpenAPI Spec:', openApiSpec);
    
    // Extract tables from paths
    const tables = new Set<string>();
    const paths = openApiSpec.paths || {};
    
    for (const path in paths) {
      // Extract table name from path like /table_name
      const match = path.match(/^\/([^\/\?]+)/);
      if (match && match[1] !== 'rpc') {
        tables.add(match[1]);
      }
    }
    
    return Array.from(tables);
  } catch (error) {
    console.error('Failed to introspect API:', error);
    return [];
  }
}

/**
 * Get table information including partitions
 */
export async function getTableWithPartitions(tableName: string) {
  try {
    // Check if table is partitioned
    const { data: partitions, error } = await supabase.rpc('get_table_partitions', {
      table_name: tableName
    });
    
    if (error) {
      // Try alternative method
      console.log(`Checking partitions for ${tableName}...`);
      
      // Try pattern matching for partition tables
      const partitionPattern = `${tableName}_p_`;
      const possiblePartitions = [];
      
      // Test common partition patterns
      const patterns = [
        `${tableName}_p_*`,
        `${tableName}_part_*`,
        `${tableName}_*_partition`,
        `${tableName}_breed_*`
      ];
      
      for (const pattern of patterns) {
        // Try to query a partition
        const testTableName = pattern.replace('*', 'test');
        const { error: testError } = await supabase
          .from(testTableName)
          .select('id')
          .limit(1);
        
        if (testError?.code !== '42P01') {
          // Table exists or other error
          possiblePartitions.push(pattern);
        }
      }
      
      return {
        mainTable: tableName,
        isPartitioned: possiblePartitions.length > 0,
        partitionPattern: possiblePartitions[0] || null,
        partitions: []
      };
    }
    
    return {
      mainTable: tableName,
      isPartitioned: partitions && partitions.length > 0,
      partitions: partitions || []
    };
  } catch (error) {
    console.error(`Failed to get partitions for ${tableName}:`, error);
    return {
      mainTable: tableName,
      isPartitioned: false,
      partitions: []
    };
  }
}

/**
 * Smart table discovery - finds all tables including partitions
 */
export async function discoverAllTables() {
  console.log('🔍 Starting smart table discovery...');
  
  const discovered = {
    tables: new Set<string>(),
    partitionedTables: new Map<string, string[]>(),
    apiTables: new Set<string>(),
    patterns: new Set<string>()
  };
  
  // Step 1: Get tables from API introspection
  console.log('Step 1: Introspecting API...');
  const apiTables = await introspectSupabaseAPI();
  apiTables.forEach(t => discovered.apiTables.add(t));
  console.log(`Found ${apiTables.length} tables from API`);
  
  // Step 2: Test known table patterns
  console.log('Step 2: Testing known patterns...');
  const knownPatterns = [
    // Core tables
    'breeds', 'dogs', 'persons', 'kennels', 'litters',
    'breedings', 'health_tests', 'pedigrees', 'puppies',
    
    // Partitioned tables (base names)
    'pets', 'pet_photos', 'pet_health', 'pet_documents',
    'breed_pets', 'breed_data',
    
    // Service tables
    'service_item', 'conf_item', 'conf_item_status',
    'service_in_conf_item', 'service_item_status',
    
    // User tables
    'users', 'profiles', 'subscriptions', 'permissions',
    
    // System tables
    'migrations', 'settings', 'audit_log'
  ];
  
  for (const table of knownPatterns) {
    const { error } = await supabase
      .from(table)
      .select('id')
      .limit(1);
    
    if (!error || error.code !== '42P01') {
      discovered.tables.add(table);
      
      // Check for partitions
      const partitionInfo = await getTableWithPartitions(table);
      if (partitionInfo.isPartitioned) {
        discovered.partitionedTables.set(table, partitionInfo.partitions);
      }
    }
  }
  
  // Step 3: Try to find partition tables by pattern
  console.log('Step 3: Searching for partitions...');
  
  // Test breed-specific partitions
  const testBreeds = ['labrador', 'poodle', 'german_shepherd', 'golden_retriever'];
  for (const breed of testBreeds) {
    const partitionTables = [
      `pets_p_${breed}`,
      `pets_breed_${breed}`,
      `pet_photos_p_${breed}`,
      `breed_${breed}_pets`
    ];
    
    for (const tableName of partitionTables) {
      const { error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);
      
      if (!error || (error.code !== '42P01' && error.code !== 'PGRST116')) {
        discovered.tables.add(tableName);
        
        // Extract pattern
        const pattern = tableName.replace(breed, '*');
        discovered.patterns.add(pattern);
      }
    }
  }
  
  console.log('Discovery complete!');
  console.log(`Total tables found: ${discovered.tables.size}`);
  console.log(`Partitioned tables: ${discovered.partitionedTables.size}`);
  console.log(`Patterns detected: ${Array.from(discovered.patterns)}`);
  
  return {
    allTables: Array.from(discovered.tables).sort(),
    partitionedTables: Object.fromEntries(discovered.partitionedTables),
    apiTables: Array.from(discovered.apiTables).sort(),
    patterns: Array.from(discovered.patterns),
    summary: {
      totalTables: discovered.tables.size,
      totalPartitioned: discovered.partitionedTables.size,
      totalFromAPI: discovered.apiTables.size
    }
  };
}

/**
 * Get table count estimation
 */
export async function estimateTableCount() {
  try {
    // Try to get count from system tables
    const { data, error } = await supabase.rpc('count_all_tables', {});
    
    if (error) {
      // Alternative: count by trying common patterns
      let count = 0;
      
      // Base tables
      const baseTables = ['breeds', 'dogs', 'persons', 'kennels', 'pets'];
      for (const table of baseTables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (!error) count++;
      }
      
      // Estimate partitions (if pets is partitioned by breed)
      const { count: breedCount } = await supabase
        .from('breeds')
        .select('*', { count: 'exact', head: true });
      
      if (breedCount) {
        // Assume each breed might have partition tables
        count += breedCount * 3; // pets, pet_photos, pet_health per breed
      }
      
      return { 
        estimated: true, 
        count,
        message: `Estimated ${count} tables (including partitions)`
      };
    }
    
    return { 
      estimated: false, 
      count: data,
      message: `Found ${data} tables in database`
    };
  } catch (error) {
    console.error('Failed to estimate table count:', error);
    return { 
      estimated: true, 
      count: 0,
      message: 'Could not estimate table count'
    };
  }
}

/**
 * Create RPC functions in database (SQL to execute)
 */
export function getRequiredRPCFunctions() {
  return `
-- Function to get all tables
CREATE OR REPLACE FUNCTION get_all_tables()
RETURNS TABLE(schema_name text, table_name text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    schemaname::text as schema_name,
    tablename::text as table_name
  FROM pg_tables
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  ORDER BY schemaname, tablename;
$$;

-- Function to count all tables
CREATE OR REPLACE FUNCTION count_all_tables()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer
  FROM pg_tables
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast');
$$;

-- Function to get table partitions
CREATE OR REPLACE FUNCTION get_table_partitions(table_name text)
RETURNS TABLE(partition_name text, parent_table text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    inhrelid::regclass::text as partition_name,
    inhparent::regclass::text as parent_table
  FROM pg_inherits
  WHERE inhparent = table_name::regclass;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_tables() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION count_all_tables() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_table_partitions(text) TO anon, authenticated;
  `;
}