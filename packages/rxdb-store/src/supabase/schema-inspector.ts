import { supabase } from './client';

export interface TableInfo {
  table_name: string;
  columns: ColumnInfo[];
  relationships?: any[];
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  is_primary: boolean;
  is_unique: boolean;
  foreign_key?: {
    table: string;
    column: string;
  };
}

/**
 * Get all tables in the database
 */
export async function getAllTables(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_tables_list', {
    schema_name: 'public'
  }).single();

  if (error) {
    // Fallback: try to query information_schema directly
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables' as any)
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');
    
    if (tablesError) {
      console.error('Failed to get tables:', tablesError);
      
      // Ultimate fallback: try known tables
      return [
        'breeds', 'dogs', 'persons', 'kennels', 'litters',
        'service_item', 'conf_item', 'conf_item_status',
        'service_in_conf_item', 'pricing_plans'
      ];
    }
    
    return tables?.map(t => t.table_name) || [];
  }

  return data || [];
}

/**
 * Get table structure using Supabase
 */
export async function getTableStructure(tableName: string): Promise<TableInfo | null> {
  try {
    // Try to get a single row to inspect structure
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') {
      console.error(`Error getting structure for ${tableName}:`, error);
      return null;
    }
    
    // Get column info from the response
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]).map(key => ({
        column_name: key,
        data_type: typeof data[0][key],
        is_nullable: 'YES',
        column_default: null,
        is_primary: key === 'id',
        is_unique: key === 'id'
      }));
      
      return {
        table_name: tableName,
        columns
      };
    }
    
    // If no data, at least we know table exists
    return {
      table_name: tableName,
      columns: []
    };
  } catch (error) {
    console.error(`Failed to inspect ${tableName}:`, error);
    return null;
  }
}

/**
 * Inspect entire database schema
 */
export async function inspectDatabaseSchema() {
  console.log('🔍 Inspecting database schema...');
  
  const knownTables = [
    // Core breeding tables
    'breeds', 'dogs', 'persons', 'kennels', 'litters',
    'breedings', 'health_tests', 'pedigrees',
    
    // Service/config tables  
    'service_item', 'conf_item', 'conf_item_status',
    'service_in_conf_item', 'service_item_status',
    
    // Other tables
    'pricing_plans', 'testimonials', 'platform_statistics',
    'users', 'profiles', 'subscriptions'
  ];
  
  const schema: Record<string, TableInfo | null> = {};
  const results = {
    found: [] as string[],
    notFound: [] as string[],
    error: [] as string[]
  };
  
  for (const tableName of knownTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01') {
          results.notFound.push(tableName);
        } else {
          results.error.push(`${tableName}: ${error.message}`);
        }
      } else {
        results.found.push(tableName);
        
        // Get structure
        const structure = await getTableStructure(tableName);
        if (structure) {
          schema[tableName] = structure;
        }
      }
    } catch (err) {
      results.error.push(`${tableName}: ${err}`);
    }
  }
  
  console.log('✅ Found tables:', results.found);
  console.log('❌ Not found:', results.notFound);
  if (results.error.length > 0) {
    console.log('⚠️ Errors:', results.error);
  }
  
  return {
    schema,
    results
  };
}

/**
 * Get detailed table info with sample data
 */
export async function getDetailedTableInfo(tableName: string) {
  try {
    // Get structure
    const structure = await getTableStructure(tableName);
    
    // Get row count
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    // Get sample data
    const { data: sampleData } = await supabase
      .from(tableName)
      .select('*')
      .limit(5);
    
    return {
      structure,
      rowCount: count || 0,
      sampleData: sampleData || []
    };
  } catch (error) {
    console.error(`Failed to get detailed info for ${tableName}:`, error);
    return null;
  }
}

/**
 * Generate RxDB schema from Supabase table
 */
export function generateRxDBSchema(tableInfo: TableInfo) {
  const properties: any = {};
  const required: string[] = [];
  const indexes: string[] = [];
  
  for (const column of tableInfo.columns) {
    // Map PostgreSQL types to RxDB types
    let type = 'string';
    if (column.data_type === 'number' || column.data_type === 'bigint') {
      type = 'number';
    } else if (column.data_type === 'boolean') {
      type = 'boolean';
    } else if (column.data_type === 'object' || column.data_type === 'jsonb') {
      type = 'object';
    }
    
    properties[column.column_name] = {
      type,
      maxLength: type === 'string' ? 255 : undefined
    };
    
    if (column.is_nullable === 'NO' && !column.column_default) {
      required.push(column.column_name);
    }
    
    if (column.is_unique || column.is_primary) {
      indexes.push(column.column_name);
    }
  }
  
  // Always add updatedAt for sync
  if (!properties.updated_at && !properties.updatedAt) {
    properties.updated_at = {
      type: 'string',
      format: 'date-time'
    };
  }
  
  return {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties,
    required: required.length > 0 ? required : ['id'],
    indexes
  };
}