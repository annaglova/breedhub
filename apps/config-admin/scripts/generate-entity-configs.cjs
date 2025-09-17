const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require("@supabase/supabase-js");

// System fields that are common across all tables
const SYSTEM_FIELDS = [
  "id",
  "created_at",
  "created_by",
  "updated_at", 
  "updated_by",
  "deleted",
  "deleted_at",
  "deleted_by"
];

// Load resources list
const resources = require("../src/data/resourcesList.json");
const MAIN_RESOURCES = resources.MAIN_RESOURCES || [];
const LOOKUP_RESOURCES = resources.LOOKUP_RESOURCES || [];
const CHILD_RESOURCES = resources.CHILD_RESOURCES || [];

// Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Cache for table schemas to avoid multiple queries
const tableSchemaCache = {};

// Map Postgres types to field types
function mapPostgresType(pgType) {
  const typeMap = {
    'uuid': 'uuid',
    'character varying': 'string',
    'text': 'text',
    'integer': 'number',
    'bigint': 'number',
    'smallint': 'number',
    'numeric': 'number',
    'real': 'number',
    'double precision': 'number',
    'boolean': 'boolean',
    'timestamp with time zone': 'datetime',
    'timestamp without time zone': 'datetime',
    'date': 'date',
    'time': 'time',
    'jsonb': 'json',
    'json': 'json',
    'ARRAY': 'array'
  };
  
  return typeMap[pgType] || 'string';
}

// Detect display column for a table (name, title, label, code, etc.)
function detectDisplayColumn(columns) {
  // Priority order for display columns
  const displayColumnPriority = [
    'name',
    'title',
    'label',
    'display_name',
    'full_name',
    'code',
    'description',
    'value',
    'text'
  ];
  
  const columnNames = columns.map(c => c.column_name);
  
  // Find first matching display column
  for (const displayCol of displayColumnPriority) {
    if (columnNames.includes(displayCol)) {
      return displayCol;
    }
  }
  
  // If no standard display column found, use first non-system string column
  const nonSystemColumns = columns.filter(c => 
    !SYSTEM_FIELDS.includes(c.column_name) &&
    !c.column_name.endsWith('_id') &&
    (c.data_type === 'character varying' || c.data_type === 'text')
  );
  
  if (nonSystemColumns.length > 0) {
    return nonSystemColumns[0].column_name;
  }
  
  // Fallback to id if nothing else found
  return 'id';
}

// Map field type to UI component
function getUIComponent(fieldType, fieldName, isForeignKey = false) {
  // Foreign keys should use select/lookup component
  if (isForeignKey || fieldName.endsWith('_id')) {
    return 'select';  // or 'lookup' for advanced selection
  }
  
  // By type first (more specific)
  const componentMap = {
    'uuid': 'text',
    'string': 'text',
    'text': 'textarea',
    'number': 'number',
    'boolean': 'checkbox',
    'datetime': 'datetime',
    'date': 'date',
    'time': 'time',
    'json': 'json',
    'array': 'tags'
  };
  
  // Special cases by name (only for non-boolean fields)
  if (fieldType !== 'boolean') {
    if (fieldName.includes('email')) return 'email';
    if (fieldName.includes('phone')) return 'phone';
    if (fieldName.includes('url') || fieldName.includes('link')) return 'url';
    if (fieldName.includes('password')) return 'password';
    if (fieldName.includes('description') || fieldName.includes('note')) return 'textarea';
    if (fieldName.includes('color') && !fieldName.includes('_by_')) return 'color';
    if (fieldName.includes('date')) return 'date';
    if (fieldName.includes('time')) return 'time';
    if (fieldName.includes('image') || fieldName.includes('photo')) return 'image';
  }
  
  return componentMap[fieldType] || 'text';
}

// Generate validation rules based on column constraints
function generateValidation(col) {
  const validation = {};
  
  // Add maxLength for string types
  if (col.character_maximum_length) {
    validation.maxLength = col.character_maximum_length;
  }
  
  // Add numeric constraints
  if (col.numeric_precision) {
    validation.precision = col.numeric_precision;
  }
  if (col.numeric_scale !== null) {
    validation.scale = col.numeric_scale;
  }
  
  // Add URL validation for URL fields
  if (col.column_name.includes('url') || col.column_name.includes('link')) {
    validation.pattern = '^https?://.+';
    validation.message = 'Invalid URL format';
  }
  
  // Add email validation for email fields
  if (col.column_name.includes('email')) {
    validation.pattern = '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$';
    validation.message = 'Invalid email format';
  }
  
  return Object.keys(validation).length > 0 ? validation : null;
}

// Generate field configuration from column info
function generateFieldConfig(col, constraints, foreignKeys) {
  const fieldName = col.column_name;
  const fieldType = mapPostgresType(col.data_type);
  const isSystem = SYSTEM_FIELDS.includes(fieldName);
  
  // Find constraints for this column
  const columnConstraints = constraints.filter(c => c.column_name === fieldName);
  const isRequired = col.is_nullable === 'NO' || columnConstraints.some(c => c.constraint_type === 'NOT NULL');
  
  // Check actual constraints from database
  const isPrimaryKey = columnConstraints.some(c => c.constraint_type === 'PRIMARY KEY');
  const isUnique = columnConstraints.some(c => c.constraint_type === 'UNIQUE') || isPrimaryKey;
  const foreignKey = foreignKeys[fieldName]; // Get FK info from the map
  
  // Don't skip foreign key fields - we need them for proper configuration
  // Foreign keys should be treated as regular fields with special component type
  
  const config = {
    id: `field_${fieldName}`,
    name: fieldName,
    fieldType: fieldType,
    component: getUIComponent(fieldType, fieldName, !!foreignKey),
    required: isRequired,
    isSystem: isSystem,
    isPrimaryKey: isPrimaryKey,
    isUnique: isUnique,
    sortOrder: isSystem ? 1000 : 10, // System fields at the end
    permissions: {
      read: ["*"],
      write: isSystem ? ["system"] : ["admin", "editor"]
    }
  };
  
  // Add maxLength for string/text fields if database provides it
  if ((fieldType === 'string' || fieldType === 'text') && col.character_maximum_length) {
    config.maxLength = col.character_maximum_length;
  }
  
  // Add foreign key information if exists
  if (foreignKey) {
    config.isForeignKey = true;
    config.referencedTable = foreignKey.ref_table;
    config.referencedFieldID = foreignKey.ref_column || 'id';
    
    // We'll detect the display column later when we have all table schemas
    // For now, mark it for post-processing
    config.needsDisplayColumn = true;
  }
  
  // If no FK from RPC but field ends with _id, still treat it as potential FK
  if (!foreignKey && fieldName.endsWith('_id') && fieldName !== 'id') {
    // Still mark as FK for UI purposes
    config.isForeignKey = true;
    
    // Derive table name from field name
    let referencedTable = fieldName.slice(0, -3); // remove '_id'
    
    // Special cases for table name mapping
    const tableNameMap = {
      'language': 'sys_language',
      'category': 'breed_category',
      // Fields that reference contact table
      'owner': 'contact',
      'breeder': 'contact',
      'handler': 'contact',
      'trainer': 'contact',
      'judge': 'contact',
      'created_by': 'contact',
      'updated_by': 'contact',
      'deleted_by': 'contact',
      'verified_by': 'contact',
      'approved_by': 'contact',
      'rejected_by': 'contact',
      'primary_contact': 'contact'
    };
    
    if (tableNameMap[referencedTable]) {
      referencedTable = tableNameMap[referencedTable];
    }
    
    config.referencedTable = referencedTable;
    config.referencedFieldID = 'id';
    config.needsDisplayColumn = true;
  }
  
  // Add display name
  // For foreign keys, remove '_id' suffix from display name
  if ((foreignKey || fieldName.endsWith('_id')) && fieldName !== 'id') {
    config.displayName = fieldName
      .replace(/_id$/, '') // remove _id suffix
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } else {
    config.displayName = fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  // Add placeholder
  if (!isSystem && config.component !== 'checkbox') {
    config.placeholder = `Enter ${config.displayName.toLowerCase()}`;
  }
  
  // Add maxLength for string/text fields if database provides it
  if ((fieldType === 'string' || fieldType === 'text') && col.character_maximum_length) {
    config.maxLength = col.character_maximum_length;
  }
  
  // Add validation if needed
  const validation = generateValidation(col);
  if (validation) {
    config.validation = validation;
  }
  
  // Add default value if exists
  if (col.column_default !== null && !isSystem) {
    let defaultValue = col.column_default;
    // Clean up Postgres default syntax
    if (defaultValue.includes('::')) {
      defaultValue = defaultValue.split('::')[0].replace(/'/g, '');
    }
    config.defaultValue = defaultValue;
  }
  
  return config;
}

// Get table columns and constraints
async function getTableSchema(tableName) {
  // Always use execute_sql_select to get ALL column information including character_maximum_length
  const { data: sqlColumnsResult, error: sqlError } = await supabase.rpc("execute_sql_select", {
    sql: `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
      ORDER BY ordinal_position
    `
  });
  
  // Extract the actual data from the result format
  const columns = sqlColumnsResult?.map(row => row.result) || [];
  const columnsError = sqlError;
  
  if (columnsError) {
    console.error(`Error fetching columns for ${tableName}:`, columnsError);
    return null;
  }
  
  // Get foreign keys using RPC
  const { data: foreignKeys, error: fkError } = await supabase.rpc("get_foreign_keys_from", {
    table_name: tableName
  });
  
  // Create FK map: column_name -> { ref_table, ref_column }
  const fkMap = {};
  if (Array.isArray(foreignKeys) && !fkError) {
    for (const fk of foreignKeys) {
      fkMap[fk.column_name] = {
        ref_table: fk.ref_table,
        ref_column: fk.ref_column || 'id'
      };
    }
  }
  
  // Get other constraints (PRIMARY KEY, UNIQUE, etc)
  const { data: constraintsResult, error: constraintsError } = await supabase.rpc("execute_sql_select", {
    sql: `
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public' 
        AND tc.table_name = '${tableName}'
        AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'NOT NULL', 'CHECK')
    `
  });
  
  // Extract the actual data from the result format
  const constraints = constraintsResult?.map(row => row.result) || [];
  
  if (constraintsError) {
    console.error(`Error fetching constraints for ${tableName}:`, constraintsError);
  }
  
  return {
    columns: columns || [],
    constraints: constraints || [],
    foreignKeys: fkMap
  };
}

// Generate entity configuration
async function generateEntityConfig(tableName, category) {
  console.log(`Generating config for ${tableName}...`);
  
  const schema = await getTableSchema(tableName);
  if (!schema || !schema.columns.length) {
    console.warn(`No schema found for ${tableName}`);
    return null;
  }
  
  const fields = [];
  
  for (const col of schema.columns) {
    const fieldConfig = generateFieldConfig(col, schema.constraints, schema.foreignKeys || {});
    if (fieldConfig) {
      fields.push(fieldConfig);
    }
  }
  
  // Post-process FK fields to add display columns
  for (const field of fields) {
    if (field.needsDisplayColumn && field.referencedTable) {
      // Get schema for referenced table
      let referencedSchema;
      if (tableSchemaCache[field.referencedTable]) {
        referencedSchema = tableSchemaCache[field.referencedTable];
      } else {
        referencedSchema = await getTableSchema(field.referencedTable);
        if (referencedSchema) {
          tableSchemaCache[field.referencedTable] = referencedSchema;
        }
      }
      
      if (referencedSchema && referencedSchema.columns) {
        const displayColumn = detectDisplayColumn(referencedSchema.columns);
        field.referencedFieldName = displayColumn;
      } else {
        // Default to 'name' if we can't detect
        field.referencedFieldName = 'name';
      }
      
      // Clean up temporary flag
      delete field.needsDisplayColumn;
    }
  }
  
  // Sort fields: non-system first, then system
  fields.sort((a, b) => {
    if (a.isSystem !== b.isSystem) {
      return a.isSystem ? 1 : -1;
    }
    return a.sortOrder - b.sortOrder;
  });
  
  // Update sort order
  fields.forEach((field, index) => {
    field.sortOrder = (index + 1) * 10;
  });
  
  const entityConfig = {
    id: `entity_${tableName}`,
    type: 'entity',
    name: tableName,
    displayName: tableName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    category: category,
    fields: fields,
    metadata: {
      tableName: tableName,
      totalFields: fields.length,
      systemFields: fields.filter(f => f.isSystem).length,
      customFields: fields.filter(f => !f.isSystem).length,
      generatedAt: new Date().toISOString()
    }
  };
  
  return entityConfig;
}

// Generate all entity configurations
async function generateAllConfigs() {
  const outputDir = path.join(__dirname, '../src/data/entities');
  
  // Create directories
  ['main', 'lookup', 'child'].forEach(category => {
    const dir = path.join(outputDir, category);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  const summary = {
    total: 0,
    successful: 0,
    failed: [],
    generatedAt: new Date().toISOString()
  };
  
  // Process each category
  {
    const categories = [
      { name: 'main', resources: MAIN_RESOURCES },
      { name: 'lookup', resources: LOOKUP_RESOURCES },
      { name: 'child', resources: CHILD_RESOURCES }
    ];
    
    for (const category of categories) {
      console.log(`\n=== Processing ${category.name.toUpperCase()} resources ===\n`);
      
      for (const tableName of category.resources) {
        summary.total++;
        
        try {
          const config = await generateEntityConfig(tableName, category.name);
          
          if (config) {
            const outputPath = path.join(outputDir, category.name, `${tableName}.json`);
            fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
            console.log(`✅ Generated: ${outputPath}`);
            summary.successful++;
          } else {
            console.log(`⚠️ Skipped: ${tableName} (no schema)`);
            summary.failed.push({ table: tableName, reason: 'No schema found' });
          }
        } catch (error) {
          console.error(`❌ Failed: ${tableName}`, error.message);
          summary.failed.push({ table: tableName, reason: error.message });
        }
      }
    }
  }
  
  // Write summary
  const summaryPath = path.join(outputDir, 'generation-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log('\n=== Generation Complete ===');
  console.log(`Total: ${summary.total}`);
  console.log(`Successful: ${summary.successful}`);
  console.log(`Failed: ${summary.failed.length}`);
  
  if (summary.failed.length > 0) {
    console.log('\nFailed tables:');
    summary.failed.forEach(f => {
      console.log(`  - ${f.table}: ${f.reason}`);
    });
  }
}

// Run the generator
generateAllConfigs().catch(console.error);