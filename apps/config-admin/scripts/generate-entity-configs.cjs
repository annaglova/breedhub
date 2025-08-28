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

// Map field type to UI component
function getUIComponent(fieldType, fieldName) {
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
  
  if (col.character_maximum_length) {
    validation.maxLength = col.character_maximum_length;
  }
  
  if (col.numeric_precision) {
    validation.precision = col.numeric_precision;
  }
  
  if (col.numeric_scale) {
    validation.scale = col.numeric_scale;
  }
  
  // Add patterns for common fields
  if (col.column_name.includes('email')) {
    validation.pattern = '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$';
    validation.message = 'Invalid email format';
  }
  
  if (col.column_name.includes('phone')) {
    validation.pattern = '^[+]?[0-9]{1,4}?[-. ]?[(]?[0-9]{1,3}?[)]?[-. ]?[0-9]{1,4}[-. ]?[0-9]{1,4}$';
    validation.message = 'Invalid phone format';
  }
  
  if (col.column_name.includes('url') || col.column_name.includes('link')) {
    validation.pattern = '^https?://.+';
    validation.message = 'Invalid URL format';
  }
  
  return Object.keys(validation).length > 0 ? validation : undefined;
}

// Generate field configuration
function generateFieldConfig(col, constraints = []) {
  const fieldName = col.column_name;
  const fieldType = mapPostgresType(col.data_type);
  const isSystem = SYSTEM_FIELDS.includes(fieldName);
  
  // Find constraints for this column
  const columnConstraints = constraints.filter(c => c.column_name === fieldName);
  const isRequired = col.is_nullable === 'NO' || columnConstraints.some(c => c.constraint_type === 'NOT NULL');
  const isPrimaryKey = columnConstraints.some(c => c.constraint_type === 'PRIMARY KEY');
  const isUnique = columnConstraints.some(c => c.constraint_type === 'UNIQUE');
  const foreignKey = columnConstraints.find(c => c.constraint_type === 'FOREIGN KEY');
  
  // Skip foreign key fields - we don't include relationships
  if (foreignKey) {
    return null;
  }
  
  const config = {
    id: `field_${fieldName}`,
    name: fieldName,
    fieldType: fieldType,
    component: getUIComponent(fieldType, fieldName),
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
  
  // Add display name
  config.displayName = fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Add placeholder
  if (!isSystem && config.component !== 'checkbox') {
    config.placeholder = `Enter ${config.displayName.toLowerCase()}`;
  }
  
  // Add maxLength for string fields
  if (fieldType === 'string' && col.character_maximum_length) {
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
  // Get columns
  const { data: columns, error: columnsError } = await supabase.rpc("execute_sql_select", {
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
  
  if (columnsError) {
    console.error(`Error fetching columns for ${tableName}:`, columnsError);
    return null;
  }
  
  // Get constraints
  const { data: constraints, error: constraintsError } = await supabase.rpc("execute_sql_select", {
    sql: `
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public' 
        AND tc.table_name = '${tableName}'
    `
  });
  
  if (constraintsError) {
    console.error(`Error fetching constraints for ${tableName}:`, constraintsError);
  }
  
  return {
    columns: columns?.map(row => row.result) || [],
    constraints: constraints?.map(row => row.result) || []
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
    const fieldConfig = generateFieldConfig(col, schema.constraints);
    if (fieldConfig) { // Skip foreign key fields
      fields.push(fieldConfig);
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

// Main function
async function generateAllConfigs() {
  console.log('Starting entity config generation...\n');
  
  const outputDir = path.join(__dirname, '../src/data/entities');
  
  // Create output directories
  const dirs = ['main', 'lookup', 'child'];
  for (const dir of dirs) {
    const dirPath = path.join(outputDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
  
  // TEST MODE - Only process 'breed' table
  const TEST_MODE = false;
  
  const summary = {
    total: 0,
    successful: 0,
    failed: [],
    generatedAt: new Date().toISOString()
  };
  
  if (TEST_MODE) {
    console.log('=== TEST MODE: Processing only "breed" table ===\n');
    
    const tableName = 'breed';
    const category = 'main';
    summary.total = 1;
    
    try {
      const config = await generateEntityConfig(tableName, category);
      
      if (config) {
        const outputPath = path.join(outputDir, category, `${tableName}.json`);
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
  } else {
    // Process each category
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