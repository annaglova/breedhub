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

// Generate SQL insert statement
function generateInsert(config, allConfigs) {
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
  
  // Compute the merged data field
  const computedData = computeMergedData(config.id, allConfigs);
  
  const values = {
    id: config.id,
    type: config.type,
    self_data: config.self_data || {},
    override_data: {}, // Always empty for initial generation
    data: computedData, // Computed from deps + self_data
    deps: config.deps || [],
    caption: config.caption || null,
    category: config.category || null,
    tags: config.tags || [],
    version: 1,
    deleted: false
  };
  
  const fieldList = fields.join(', ');
  const valueList = fields.map(f => {
    const value = values[f];
    if (f === 'deps' || f === 'tags') {
      // Array fields
      if (Array.isArray(value) && value.length > 0) {
        return `ARRAY[${value.map(v => escapeSql(v)).join(', ')}]::text[]`;
      } else {
        return "'{}'::text[]";
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

// Generate all SQL inserts
function generateAllInserts(tree) {
  const inserts = [];
  const configs = [];
  
  console.log('Generating SQL inserts...');
  
  // 1. Field Properties (Level 1)
  console.log(`  Processing ${tree.properties.length} field properties...`);
  for (const prop of tree.properties) {
    configs.push(prop);
  }
  
  // 2. Base Fields (Level 2)
  console.log(`  Processing ${tree.baseFields.length} base fields...`);
  for (const field of tree.baseFields) {
    const config = {
      id: field.id,
      type: 'field',
      deps: [],
      self_data: {},
      caption: `Base field: ${field.name}`,
      category: field.category,
      tags: [`frequency:${Math.round(field.frequency * 100)}%`]
    };
    
    // Extract only non-property data for self_data
    const propsToKeep = ['fieldType', 'component', 'displayName', 'placeholder'];
    for (const prop of propsToKeep) {
      if (field.commonProps && field.commonProps[prop] !== undefined) {
        config.self_data[prop] = field.commonProps[prop];
      }
    }
    
    // Add permissions to self_data if not system field
    if (field.commonProps?.permissions && !field.commonProps?.isSystem) {
      config.self_data.permissions = field.commonProps.permissions;
    }
    
    // Add explicit property dependencies based on field characteristics
    if (field.commonProps?.required === true) {
      config.deps.push('field_property_required');
    } else if (field.commonProps?.required === false) {
      config.deps.push('field_property_not_required');
    }
    
    if (field.commonProps?.isSystem === true) {
      config.deps.push('field_property_readonly');
      config.deps.push('field_property_is_system');
    } else if (field.commonProps?.isSystem === false) {
      config.deps.push('field_property_not_system');
    }
    
    if (field.commonProps?.isPrimaryKey === true) {
      config.deps.push('field_property_primary_key');
    } else if (field.commonProps?.isPrimaryKey === false) {
      config.deps.push('field_property_not_primary_key');
    }
    
    if (field.commonProps?.isUnique === true && !field.commonProps?.isPrimaryKey) {
      config.deps.push('field_property_unique');
    } else if (field.commonProps?.isUnique === false) {
      config.deps.push('field_property_not_unique');
    }
    
    // Handle maxLength variations
    if (field.commonProps?.maxLengthVariations && field.commonProps.maxLengthVariations.length > 0) {
      // Use the most common maxLength
      const mostCommon = field.commonProps.maxLengthVariations[0];
      config.deps.push(`field_property_maxlength_${mostCommon}`);
    } else if (field.commonProps?.maxLength) {
      config.deps.push(`field_property_maxlength_${field.commonProps.maxLength}`);
    }
    
    configs.push(config);
  }
  
  // 3. Entity Fields (Level 3) - All entities
  console.log(`  Processing ${tree.entityFields.length} entity fields (all entities)...`);
  for (const entityField of tree.entityFields) {
    configs.push(entityField);
  }
  
  // Generate SQL for each config
  for (const config of configs) {
    inserts.push(generateInsert(config, configs));
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
    "-- DELETE FROM app_config WHERE type IN ('field_property', 'field', 'entity_field');",
    '',
    '-- Insert field properties, base fields, and entity fields',
    ...inserts
  ].join('\n');
  
  fs.writeFileSync(OUTPUT_PATH, sqlContent);
  console.log(`\n✅ SQL file saved: ${OUTPUT_PATH}`);
  console.log(`   Total SQL statements: ${inserts.length}`);
  
  // Show summary
  const summary = {
    fieldProperties: configs.filter(c => c.type === 'field_property').length,
    baseFields: configs.filter(c => c.type === 'field').length,
    entityFields: configs.filter(c => c.type === 'entity_field').length
  };
  
  console.log('\n=== Summary ===');
  console.log(`Field Properties: ${summary.fieldProperties}`);
  console.log(`Base Fields: ${summary.baseFields}`);
  console.log(`Entity Fields: ${summary.entityFields}`);
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