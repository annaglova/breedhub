const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require("@supabase/supabase-js");

// Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Check for breed-only flag
const isBreedOnly = process.argv.includes('--breed-only');

// Load semantic tree
const SEMANTIC_TREE_PATH = path.join(__dirname, '../src/data/semantic-tree/semantic-tree.json');
const OUTPUT_PATH = path.join(__dirname, '../src/data/semantic-tree/app-config-inserts.sql');

function loadSemanticTree() {
  if (!fs.existsSync(SEMANTIC_TREE_PATH)) {
    console.error('Semantic tree not found. Run analyze-fields.cjs first.');
    process.exit(1);
  }
  
  return JSON.parse(fs.readFileSync(SEMANTIC_TREE_PATH, 'utf-8'));
}

// Escape SQL string
function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str === 'object') return escapeSql(JSON.stringify(str));
  return "'" + String(str).replace(/'/g, "''") + "'";
}

// Compute merged data from dependencies
function computeMergedData(configId, allConfigs, visited = new Set()) {
  // Prevent circular dependencies
  if (visited.has(configId)) {
    return {};
  }
  visited.add(configId);
  
  const config = allConfigs.find(c => c.id === configId);
  if (!config) {
    return {};
  }
  
  let mergedData = {};
  
  // First, merge all dependencies
  if (config.deps && config.deps.length > 0) {
    for (const depId of config.deps) {
      const depData = computeMergedData(depId, allConfigs, visited);
      mergedData = { ...mergedData, ...depData };
    }
  }
  
  // Then apply self_data
  if (config.self_data) {
    mergedData = { ...mergedData, ...config.self_data };
  }
  
  return mergedData;
}

// Get property data based on property ID
function getPropertyData(propertyId) {
  const propertyDataMap = {
    'property_required': { required: true, validation: { notNull: true } },
    'property_not_required': { required: false },
    'property_is_system': { isSystem: true },
    'property_not_system': { isSystem: false },
    'property_primary_key': { isPrimaryKey: true },
    'property_not_primary_key': { isPrimaryKey: false },
    'property_unique': { isUnique: true },
    'property_not_unique': { isUnique: false },
    'property_readonly': { permissions: { write: ['system'] } }
  };
  
  return propertyDataMap[propertyId] || {};
}

// Generate SQL insert statement
function generateInsert(config) {
  const fields = [
    'id',
    'type',
    'self_data',
    'override_data',
    'data',
    'deps',
    'caption',
    'category',
    'tags',
    'version',
    'deleted'
  ];
  
  const values = {
    id: config.id,
    type: config.type,
    self_data: config.self_data || {},
    override_data: config.override_data || {},
    data: config.data || config.self_data || {}, // Already computed in main loop
    deps: config.deps || [], // Always array, never null (RxDB requirement)
    caption: config.caption || null,
    category: config.category || null,
    tags: config.tags || [], // Always array, never null (RxDB requirement)
    version: config.version || 1,
    deleted: false
  };
  
  const fieldList = fields.join(', ');
  const valueList = fields.map(f => {
    const value = values[f];
    if (f === 'deps' || f === 'tags') {
      // deps and tags are always arrays (never null for RxDB compatibility)
      if (Array.isArray(value) && value.length > 0) {
        return `ARRAY[${value.map(v => escapeSql(v)).join(', ')}]::text[]`;
      } else {
        return "'{}'::text[]"; // Empty array, not NULL
      }
    } else if (f === 'self_data' || f === 'override_data' || f === 'data') {
      // JSONB fields
      return escapeSql(value) + '::jsonb';
    } else if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    } else {
      return escapeSql(value);
    }
  }).join(', ');
  
  return `INSERT INTO app_config (${fieldList}) VALUES (${valueList}) ON CONFLICT (id) WHERE deleted = false DO NOTHING;`;
}

// Build self_data by merging all dependencies' data
function buildSelfData(deps, ownData, allConfigs) {
  let mergedData = {};
  
  // First merge all dependencies' data
  for (const depId of deps) {
    const depConfig = allConfigs.find(c => c.id === depId);
    if (depConfig && depConfig.data) {
      mergedData = { ...mergedData, ...depConfig.data };
    } else if (depId.startsWith('property_')) {
      // For property dependencies that don't have configs yet
      const propertyData = getPropertyData(depId);
      mergedData = { ...mergedData, ...propertyData };
    }
  }
  
  // Then apply own data (overrides)
  mergedData = { ...mergedData, ...ownData };
  
  return mergedData;
}

// Generate all SQL inserts
function generateAllInserts(tree) {
  const inserts = [];
  const configs = [];
  
  console.log('Generating SQL inserts...');
  
  // 1. Field Properties (Level 1) - no dependencies
  console.log(`  Processing ${tree.properties.length} field properties...`);
  for (const prop of tree.properties) {
    // Properties have no dependencies, self_data is their own data
    const config = {
      ...prop,
      self_data: prop.self_data || {},
      data: prop.self_data || {}, // data = self_data for properties (no deps)
      deps: [], // Empty array for properties (RxDB requires array, not null)
      override_data: {},
      tags: [], // Empty array for properties (RxDB requires array, not null)
      caption: null,
      category: null
    };
    configs.push(config);
  }
  
  // 2. Base Fields (Level 2)
  console.log(`  Processing ${tree.baseFields.length} base fields...`);
  
  for (const field of tree.baseFields) {
    const config = {
      id: field.id,
      type: 'field',
      deps: [],
      self_data: {},
      override_data: {},
      caption: `Base field: ${field.name}`,
      category: field.category,
      tags: [`frequency:${Math.round(field.frequency * 100)}%`]
    };
    
    // Build dependencies list
    if (field.parentField) {
      config.deps.push(field.parentField);
      config.tags.push(`inherits_from:${field.parentField}`);
    }
    
    // For child fields, only add properties that differ from parent
    const isChildField = !!field.parentField;
    
    if (isChildField) {
      // Only add properties that override parent
      if (field.commonProps?.required !== undefined) {
        config.deps.push(field.commonProps.required ? 'property_required' : 'property_not_required');
      }
      if (field.commonProps?.isSystem === true) {
        // Child fields that are system (like created_by, updated_by)
        config.deps.push('property_readonly');
        config.deps.push('property_is_system');
      }
    } else {
      // For parent/standalone fields, add all property dependencies
      if (field.commonProps?.required === true) {
        config.deps.push('property_required');
      } else if (field.commonProps?.required === false) {
        config.deps.push('property_not_required');
      }
      
      if (field.commonProps?.isSystem === true) {
        config.deps.push('property_readonly');
        config.deps.push('property_is_system');
      } else if (field.commonProps?.isSystem === false) {
        config.deps.push('property_not_system');
      }
      
      if (field.commonProps?.isPrimaryKey === true) {
        config.deps.push('property_primary_key');
      } else if (field.commonProps?.isPrimaryKey === false) {
        config.deps.push('property_not_primary_key');
      }
      
      if (field.commonProps?.isUnique === true && !field.commonProps?.isPrimaryKey) {
        config.deps.push('property_unique');
      } else if (field.commonProps?.isUnique === false) {
        config.deps.push('property_not_unique');
      }
    }
    
    // Add metadata tags
    if (field.metadata?.isParentField) {
      config.tags.push('parent_field');
    }
    if (field.metadata?.inheritsFrom) {
      config.tags.push(`child_of:${field.metadata.inheritsFrom}`);
    }
    if (field.metadata?.referencedTable) {
      config.tags.push(`ref_table:${field.metadata.referencedTable}`);
    }
    
    // Extract own data for this field
    const ownData = {};
    if (field.commonProps) {
      // For child fields, include overrides but also inherit parent's commonProps
      if (field.parentField) {
        // For child fields, start with all commonProps (they need full data)
        Object.assign(ownData, field.commonProps);
        delete ownData.icon;
        delete ownData.fkTarget;
        
        // Ensure FK metadata is included
        if (field.metadata?.referencedTable || field.commonProps.referencedTable) {
          ownData.referencedTable = field.metadata?.referencedTable || field.commonProps.referencedTable;
          ownData.referencedFieldID = field.commonProps.referencedFieldID || 'id';
          ownData.referencedFieldName = field.commonProps.referencedFieldName || 'name';
        }
      } else {
        // For parent/standalone fields, include all commonProps except icon and fkTarget
        Object.assign(ownData, field.commonProps);
        delete ownData.icon;
        delete ownData.fkTarget;
      }
    }
    
    // Build self_data using unified approach
    config.self_data = buildSelfData(config.deps, ownData, configs);
    
    // Calculate data = self_data + override_data (override_data is empty for now)
    config.data = { ...config.self_data, ...config.override_data };
    
    // Handle maxLength variations
    if (field.commonProps?.maxLengthVariations && field.commonProps.maxLengthVariations.length > 0) {
      // Use the most common maxLength
      const mostCommon = field.commonProps.maxLengthVariations[0];
      config.deps.push(`property_maxlength_${mostCommon}`);
    } else if (field.commonProps?.maxLength) {
      config.deps.push(`property_maxlength_${field.commonProps.maxLength}`);
    }
    
    configs.push(config);
  }
  
  // 3. Entity Fields (Level 3) - All entities or breed-only
  const entityFieldsToProcess = isBreedOnly 
    ? tree.entityFields.filter(field => field.id.startsWith('breed_field_'))
    : tree.entityFields;
    
  console.log(`  Processing ${entityFieldsToProcess.length} entity fields...`);
  
  for (const entityField of entityFieldsToProcess) {
    // Entity fields already have deps, but need self_data computed
    const config = {
      ...entityField,
      override_data: entityField.override_data || {}
    };
    
    // Build self_data from dependencies
    config.self_data = buildSelfData(config.deps || [], entityField.self_data || {}, configs);
    
    // Calculate data = self_data + override_data
    config.data = { ...config.self_data, ...config.override_data };
    
    configs.push(config);
  }
  
  // Generate SQL for each config
  for (const config of configs) {
    inserts.push(generateInsert(config));
  }
  
  return { inserts, configs };
}

// Batch insert directly to Supabase
async function batchInsertToSupabase(configs, batchSize = 50) {
  console.log(`\nInserting ${configs.length} records to Supabase...`);
  
  let inserted = 0;
  let errors = 0;
  
  // Compute data field for all configs
  const configsWithData = configs.map(config => ({
    ...config,
    data: computeMergedData(config.id, configs)
  }));
  
  for (let i = 0; i < configsWithData.length; i += batchSize) {
    const batch = configsWithData.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from('app_config')
        .upsert(batch, { 
          onConflict: 'id',
          ignoreDuplicates: false  // Force update even if record exists
        });
      
      if (error) {
        console.error(`Batch ${Math.floor(i/batchSize) + 1} error:`, error);
        errors += batch.length;
      } else {
        inserted += batch.length;
        console.log(`  Batch ${Math.floor(i/batchSize) + 1}: Inserted ${batch.length} records`);
      }
    } catch (err) {
      console.error(`Batch ${Math.floor(i/batchSize) + 1} exception:`, err);
      errors += batch.length;
    }
  }
  
  return { inserted, errors };
}

// Main execution
async function main() {
  console.log('Loading semantic tree...');
  const tree = loadSemanticTree();
  
  console.log('\nGenerating SQL inserts...');
  const { inserts, configs } = generateAllInserts(tree);
  
  // Save SQL file
  const sqlContent = [
    '-- Semantic Tree SQL Inserts for app_config',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Total records: ${inserts.length}`,
    '',
    '-- Clear existing test data (optional)',
    "-- DELETE FROM app_config WHERE type IN ('property', 'field', 'entity_field');",
    '',
    '-- Insert field properties, base fields, and entity fields',
    ...inserts
  ].join('\n');
  
  fs.writeFileSync(OUTPUT_PATH, sqlContent);
  console.log(`\n✅ SQL file saved: ${OUTPUT_PATH}`);
  console.log(`   Total SQL statements: ${inserts.length}`);
  
  // Show summary
  const summary = {
    fieldProperties: configs.filter(c => c.type === 'property').length,
    baseFields: configs.filter(c => c.type === 'field' && c.category === 'base').length,
    entityFields: configs.filter(c => c.type === 'field' && (!c.category || c.category !== 'base')).length
  };
  
  console.log('\n=== Summary ===');
  console.log(`Field Properties: ${summary.fieldProperties}`);
  console.log(`Base Fields: ${summary.baseFields}`);
  if (isBreedOnly) {
    console.log(`Breed Entity Fields: ${summary.entityFields}`);
  } else {
    console.log(`Entity Fields: ${summary.entityFields}`);
  }
  console.log(`Total: ${configs.length}`);
  
  // Ask user if they want to insert to Supabase
  console.log('\n=== Database Insert ===');
  console.log('Do you want to insert these records to Supabase? (y/n)');
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Your choice: ', async (answer) => {
    if (answer.toLowerCase() === 'y') {
      const result = await batchInsertToSupabase(configs);
      console.log('\n=== Insert Complete ===');
      console.log(`Successfully inserted: ${result.inserted}`);
      console.log(`Errors: ${result.errors}`);
    } else {
      console.log('Skipping database insert.');
      console.log(`You can manually run the SQL file: ${OUTPUT_PATH}`);
    }
    
    rl.close();
  });
}

// Run generator
main().catch(console.error);