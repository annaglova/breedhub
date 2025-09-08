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

// Cache for table schemas and policies
const tableSchemaCache = {};
const tablePolicyCache = {};

/**
 * Get RLS policies for a table using existing pg_policies view
 * @param {string} tableName 
 * @returns {Object} Policies organized by operation
 */
async function getTablePolicies(tableName) {
  // Check cache first
  if (tablePolicyCache[tableName]) {
    return tablePolicyCache[tableName];
  }

  try {
    const { data, error } = await supabase.rpc("get_table_policies", {
      tablename: tableName  // Note: parameter name is 'tablename' not 'table_name'
    });

    if (error) {
      console.warn(`Could not fetch RLS policies for ${tableName}:`, error.message);
      return null;
    }

    // Check if RLS is enabled
    if (!data || !data.rls_enabled) {
      console.log(`  RLS is not enabled for ${tableName}`);
      return null;
    }

    // Organize policies by command from pg_policies format
    const organizedPolicies = {
      SELECT: [],
      INSERT: [],
      UPDATE: [],
      DELETE: [],
      ALL: []
    };

    if (data.policies && Array.isArray(data.policies)) {
      for (const policy of data.policies) {
        // pg_policies view provides: schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        const command = policy.cmd ? policy.cmd.toUpperCase() : 'ALL';
        
        if (organizedPolicies[command]) {
          organizedPolicies[command].push({
            name: policy.policyname,
            roles: policy.roles || [],  // pg_policies provides roles as array
            permissive: policy.permissive === 'PERMISSIVE' || policy.permissive === true,
            qual: policy.qual,  // Using expression
            with_check: policy.with_check  // Check expression for writes
          });
        } else if (command === '*') {
          // Handle ALL command
          organizedPolicies.ALL.push({
            name: policy.policyname,
            roles: policy.roles || [],
            permissive: policy.permissive === 'PERMISSIVE' || policy.permissive === true,
            qual: policy.qual,
            with_check: policy.with_check
          });
        }
      }
    }

    // Cache the result
    tablePolicyCache[tableName] = organizedPolicies;
    return organizedPolicies;
  } catch (err) {
    console.warn(`Error fetching policies for ${tableName}:`, err.message);
    return null;
  }
}

/**
 * Extract permissions from RLS policies
 * Maps RLS policies to simplified permission model
 */
function extractPermissionsFromPolicies(policies, fieldName, isSystem) {
  // Default permissions if no policies exist
  const defaultPermissions = {
    read: ["*"],
    write: isSystem ? ["system"] : ["admin", "editor"]
  };

  if (!policies) {
    return defaultPermissions;
  }

  const permissions = {
    read: [],
    write: []
  };

  // Analyze SELECT policies for read permissions
  const selectPolicies = [...(policies.SELECT || []), ...(policies.ALL || [])];
  if (selectPolicies.length === 0) {
    permissions.read = ["*"]; // No policies = public read
  } else {
    // Extract roles and conditions from policies
    for (const policy of selectPolicies) {
      // Check for public access patterns
      if (policy.qual === 'true' || !policy.qual) {
        permissions.read.push("*");
        break;
      }
      
      // Check for authenticated user patterns
      if (policy.qual && policy.qual.includes('auth.uid()')) {
        if (policy.qual.includes('IS NOT NULL')) {
          permissions.read.push("authenticated");
        } else if (policy.qual.includes('=')) {
          permissions.read.push("owner");
        }
      }

      // Check for role-based patterns
      if (policy.qual && policy.qual.includes('auth.jwt()')) {
        // Extract role checks from policy
        const roleMatch = policy.qual.match(/role['"]\s*=\s*['"](\w+)['"]/);
        if (roleMatch) {
          permissions.read.push(roleMatch[1]);
        }
      }

      // Add specific roles if defined
      if (policy.roles && policy.roles.length > 0) {
        permissions.read.push(...policy.roles);
      }
    }
  }

  // Analyze INSERT/UPDATE/DELETE policies for write permissions
  const writePolicies = [
    ...(policies.INSERT || []),
    ...(policies.UPDATE || []),
    ...(policies.DELETE || []),
    ...(policies.ALL || [])
  ];

  if (writePolicies.length === 0) {
    // No write policies = restricted to admin/editor (or system for system fields)
    permissions.write = isSystem ? ["system"] : ["admin", "editor"];
  } else {
    const writeRoles = new Set();
    
    for (const policy of writePolicies) {
      // System fields should always be system-only
      if (isSystem) {
        writeRoles.add("system");
        continue;
      }

      // Check for authenticated user patterns
      if (policy.qual && policy.qual.includes('auth.uid()')) {
        if (policy.qual.includes('IS NOT NULL')) {
          writeRoles.add("authenticated");
        } else if (policy.qual.includes('=')) {
          writeRoles.add("owner");
        }
      }

      // Check for role-based patterns
      if (policy.qual && policy.qual.includes('auth.jwt()')) {
        const roleMatch = policy.qual.match(/role['"]\s*=\s*['"](\w+)['"]/);
        if (roleMatch) {
          writeRoles.add(roleMatch[1]);
        }
      }

      // Check for admin patterns
      if (policy.qual && (
        policy.qual.includes("'admin'") || 
        policy.qual.includes('"admin"') ||
        policy.qual.includes("'editor'") ||
        policy.qual.includes('"editor"')
      )) {
        writeRoles.add("admin");
        writeRoles.add("editor");
      }

      // Add specific roles if defined
      if (policy.roles && policy.roles.length > 0) {
        policy.roles.forEach(role => writeRoles.add(role));
      }
    }

    permissions.write = Array.from(writeRoles);
    
    // Fallback to default if no write permissions detected
    if (permissions.write.length === 0) {
      permissions.write = isSystem ? ["system"] : ["admin", "editor"];
    }
  }

  // Remove duplicates and sort
  permissions.read = [...new Set(permissions.read)].sort();
  permissions.write = [...new Set(permissions.write)].sort();

  return permissions;
}

/**
 * Check if column-level permissions exist
 * Some tables might have column-specific RLS
 */
function checkColumnLevelPermissions(policies, columnName) {
  // Look for column mentions in policy expressions
  const columnPermissions = {
    hasSpecificPolicy: false,
    read: null,
    write: null
  };

  if (!policies) return columnPermissions;

  // Check all policy expressions for this column
  const allPolicies = [
    ...(policies.SELECT || []),
    ...(policies.INSERT || []),
    ...(policies.UPDATE || []),
    ...(policies.DELETE || []),
    ...(policies.ALL || [])
  ];

  for (const policy of allPolicies) {
    if (policy.qual && policy.qual.includes(columnName)) {
      columnPermissions.hasSpecificPolicy = true;
      
      // Try to extract specific conditions for this column
      // This is a simplified check - real implementation might need more sophisticated parsing
      if (policy.command === 'SELECT' && policy.qual.includes(`${columnName} IS NOT NULL`)) {
        columnPermissions.read = ["authenticated"];
      }
      
      if ((policy.command === 'UPDATE' || policy.command === 'INSERT') && 
          policy.with_check && policy.with_check.includes(columnName)) {
        // Column is mentioned in write check
        columnPermissions.write = ["admin", "editor"];
      }
    }
  }

  return columnPermissions;
}

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

// Detect display column for a table
function detectDisplayColumn(columns) {
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
  
  for (const displayCol of displayColumnPriority) {
    if (columnNames.includes(displayCol)) {
      return displayCol;
    }
  }
  
  const nonSystemColumns = columns.filter(c => 
    !SYSTEM_FIELDS.includes(c.column_name) &&
    !c.column_name.endsWith('_id') &&
    (c.data_type === 'character varying' || c.data_type === 'text')
  );
  
  if (nonSystemColumns.length > 0) {
    return nonSystemColumns[0].column_name;
  }
  
  return 'id';
}

// Map field type to UI component
function getUIComponent(fieldType, fieldName, isForeignKey = false) {
  if (isForeignKey || fieldName.endsWith('_id')) {
    return 'select';
  }
  
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

// Generate validation rules
function generateValidation(col) {
  const validation = {};
  
  if (col.character_maximum_length) {
    validation.maxLength = col.character_maximum_length;
  }
  
  if (col.numeric_precision) {
    validation.precision = col.numeric_precision;
  }
  if (col.numeric_scale !== null) {
    validation.scale = col.numeric_scale;
  }
  
  if (col.column_name.includes('url') || col.column_name.includes('link')) {
    validation.pattern = '^https?://.+';
    validation.message = 'Invalid URL format';
  }
  
  if (col.column_name.includes('email')) {
    validation.pattern = '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$';
    validation.message = 'Invalid email format';
  }
  
  return Object.keys(validation).length > 0 ? validation : null;
}

// Generate field configuration with RLS-based permissions
async function generateFieldConfig(col, constraints, foreignKeys, tablePolicies, tableName) {
  const fieldName = col.column_name;
  const fieldType = mapPostgresType(col.data_type);
  const isSystem = SYSTEM_FIELDS.includes(fieldName);
  
  const columnConstraints = constraints.filter(c => c.column_name === fieldName);
  const isRequired = col.is_nullable === 'NO' || columnConstraints.some(c => c.constraint_type === 'NOT NULL');
  const isPrimaryKey = columnConstraints.some(c => c.constraint_type === 'PRIMARY KEY');
  const isUnique = columnConstraints.some(c => c.constraint_type === 'UNIQUE');
  const foreignKey = foreignKeys[fieldName];
  
  // Extract permissions from RLS policies
  const permissions = extractPermissionsFromPolicies(tablePolicies, fieldName, isSystem);
  
  // Check for column-specific permissions
  const columnPerms = checkColumnLevelPermissions(tablePolicies, fieldName);
  if (columnPerms.hasSpecificPolicy) {
    if (columnPerms.read) permissions.read = columnPerms.read;
    if (columnPerms.write) permissions.write = columnPerms.write;
  }
  
  const config = {
    id: `field_${fieldName}`,
    name: fieldName,
    fieldType: fieldType,
    component: getUIComponent(fieldType, fieldName, !!foreignKey),
    required: isRequired,
    isSystem: isSystem,
    isPrimaryKey: isPrimaryKey,
    isUnique: isUnique,
    sortOrder: isSystem ? 1000 : 10,
    permissions: permissions
  };
  
  // Add foreign key information
  if (foreignKey) {
    config.isForeignKey = true;
    config.referencedTable = foreignKey.ref_table;
    config.referencedFieldID = foreignKey.ref_column || 'id';
    config.needsDisplayColumn = true;
  }
  
  // Handle _id fields without explicit FK
  if (!foreignKey && fieldName.endsWith('_id') && fieldName !== 'id') {
    config.isForeignKey = true;
    
    let referencedTable = fieldName.slice(0, -3);
    const tableNameMap = {
      'language': 'sys_language',
      'category': 'breed_category'
    };
    
    if (tableNameMap[referencedTable]) {
      referencedTable = tableNameMap[referencedTable];
    }
    
    config.referencedTable = referencedTable;
    config.referencedFieldID = 'id';
    config.needsDisplayColumn = true;
  }
  
  // Add display name
  if ((foreignKey || fieldName.endsWith('_id')) && fieldName !== 'id') {
    config.displayName = fieldName
      .replace(/_id$/, '')
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
  
  // Add maxLength for string fields
  if (fieldType === 'string' && col.character_maximum_length) {
    config.maxLength = col.character_maximum_length;
  }
  
  // Add validation
  const validation = generateValidation(col);
  if (validation) {
    config.validation = validation;
  }
  
  // Add default value
  if (col.column_default !== null && !isSystem) {
    let defaultValue = col.column_default;
    if (defaultValue.includes('::')) {
      defaultValue = defaultValue.split('::')[0].replace(/'/g, '');
    }
    config.defaultValue = defaultValue;
  }
  
  // Add RLS policy info for debugging
  if (tablePolicies && process.env.DEBUG_RLS === 'true') {
    config._rlsPolicies = {
      table: tableName,
      hasTablePolicies: Object.values(tablePolicies).some(p => p.length > 0),
      columnSpecific: columnPerms.hasSpecificPolicy
    };
  }
  
  return config;
}

// Get table schema
async function getTableSchema(tableName) {
  let columns = null;
  let columnsError = null;
  
  const { data: rpcColumns, error: rpcError } = await supabase.rpc("get_table_columns", {
    tablename: tableName
  });
  
  if (rpcError || !rpcColumns) {
    const { data: sqlColumns, error: sqlError } = await supabase.rpc("execute_sql_select", {
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
    columns = sqlColumns;
    columnsError = sqlError;
  } else {
    columns = rpcColumns;
  }
  
  if (columnsError) {
    console.error(`Error fetching columns for ${tableName}:`, columnsError);
    return null;
  }
  
  const { data: foreignKeys, error: fkError } = await supabase.rpc("get_foreign_keys_from", {
    table_name: tableName
  });
  
  const fkMap = {};
  if (Array.isArray(foreignKeys) && !fkError) {
    for (const fk of foreignKeys) {
      fkMap[fk.column_name] = {
        ref_table: fk.ref_table,
        ref_column: fk.ref_column || 'id'
      };
    }
  }
  
  const { data: constraints, error: constraintsError } = await supabase.rpc("execute_sql_select", {
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
  
  if (constraintsError) {
    console.error(`Error fetching constraints for ${tableName}:`, constraintsError);
  }
  
  return {
    columns: columns || [],
    constraints: constraints || [],
    foreignKeys: fkMap
  };
}

// Generate entity configuration with RLS support
async function generateEntityConfig(tableName, category) {
  console.log(`Generating config for ${tableName}...`);
  
  const schema = await getTableSchema(tableName);
  if (!schema || !schema.columns.length) {
    console.warn(`No schema found for ${tableName}`);
    return null;
  }
  
  // Get RLS policies for this table
  const tablePolicies = await getTablePolicies(tableName);
  if (tablePolicies && Object.values(tablePolicies).some(p => p.length > 0)) {
    console.log(`  Found RLS policies for ${tableName}`);
  }
  
  const fields = [];
  
  for (const col of schema.columns) {
    const fieldConfig = await generateFieldConfig(
      col, 
      schema.constraints, 
      schema.foreignKeys || {},
      tablePolicies,
      tableName
    );
    if (fieldConfig) {
      fields.push(fieldConfig);
    }
  }
  
  // Post-process FK fields
  for (const field of fields) {
    if (field.needsDisplayColumn && field.referencedTable) {
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
        field.referencedFieldName = 'name';
      }
      
      delete field.needsDisplayColumn;
    }
  }
  
  // Sort fields
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
      hasRlsPolicies: !!tablePolicies && Object.values(tablePolicies).some(p => p.length > 0),
      generatedAt: new Date().toISOString()
    }
  };
  
  return entityConfig;
}

// Generate all configs
async function generateAllConfigs() {
  const outputDir = path.join(__dirname, '../src/data/entities');
  
  ['main', 'lookup', 'child'].forEach(category => {
    const dir = path.join(outputDir, category);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  const summary = {
    total: 0,
    successful: 0,
    withRlsPolicies: 0,
    failed: [],
    generatedAt: new Date().toISOString()
  };
  
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
          
          if (config.metadata.hasRlsPolicies) {
            summary.withRlsPolicies++;
          }
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
  
  const summaryPath = path.join(outputDir, 'generation-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log('\n=== Generation Complete ===');
  console.log(`Total: ${summary.total}`);
  console.log(`Successful: ${summary.successful}`);
  console.log(`With RLS Policies: ${summary.withRlsPolicies}`);
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