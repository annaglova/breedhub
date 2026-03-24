const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '../../../.env') });
const { createClient } = require("@supabase/supabase-js");
// Use cascade with proper parent-child waiting
const { cascadeUpdate } = require("./cascading-updates.cjs");
const { rebuildAfterChanges } = require('./rebuild-hierarchy.cjs');
const BatchProcessor = require("./batch-processor.cjs");

// Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Deep merge two objects - merges nested objects instead of replacing them
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      // If both target and source have this key as objects, merge them recursively
      if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        // Otherwise, use source value
        result[key] = source[key];
      }
    } else {
      // For non-objects or arrays, use source value
      result[key] = source[key];
    }
  }

  return result;
}

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
      mergedData = deepMerge(mergedData, depData);
    }
  }

  // Then apply self_data
  if (config.self_data) {
    mergedData = deepMerge(mergedData, config.self_data);
  }

  // Finally apply override_data (highest priority)
  if (config.override_data) {
    mergedData = deepMerge(mergedData, config.override_data);
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
      mergedData = deepMerge(mergedData, depConfig.data);
    } else if (depId.startsWith('property_')) {
      // For property dependencies that don't have configs yet
      const propertyData = getPropertyData(depId);
      mergedData = deepMerge(mergedData, propertyData);
    }
  }

  // Then apply own data (overrides)
  mergedData = deepMerge(mergedData, ownData);

  return mergedData;
}

// Paginated fetch helper — Supabase default limit is 1000
async function fetchAllPaginated(queryBuilder, pageSize = 1000) {
  const allRecords = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data: page, error } = await queryBuilder()
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (page && page.length > 0) {
      allRecords.push(...page);
      offset += page.length;
      hasMore = page.length === pageSize;
    } else {
      hasMore = false;
    }
  }
  return allRecords;
}

// Load existing configurations from database
async function loadExistingConfigs() {
  try {
    return await fetchAllPaginated(() =>
      supabase
        .from('app_config')
        .select('id, override_data, data, deps')
        .in('type', ['property', 'field', 'entity_field'])
    );
  } catch (error) {
    console.warn('Warning: Could not load existing configs:', error.message);
    return [];
  }
}

// Generate all SQL inserts
function generateAllInserts(tree, existingConfigs = []) {
  const inserts = [];
  const configs = [];
  
  console.log('Generating SQL inserts...');
  
  // 1. Field Properties (Level 1) - no dependencies
  console.log(`  Processing ${tree.properties.length} field properties...`);
  for (const prop of tree.properties) {
    // Properties from semantic tree already have correct structure
    // Just ensure all required fields are present
    const config = {
      ...prop,
      self_data: {}, // Properties have no dependencies, so self_data is empty
      override_data: prop.override_data || prop.data || {}, // Use existing override_data
      data: prop.data || prop.override_data || {}, // Use existing data
      deps: [], // Empty array for properties (RxDB requires array, not null)
      tags: prop.tags || [], // Keep tags from semantic tree
      caption: prop.caption || null,
      category: prop.category || null // Keep category from semantic tree
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
    
    // NEW APPROACH: Split data properly
    // self_data = only data from dependencies (properties)
    config.self_data = buildSelfData(config.deps, {}, configs); // Only deps data
    
    // override_data = field's own data MINUS what's already in self_data
    // ПЛЮС збереження кастомних властивостей
    
    // Завантажуємо існуючий override_data з БД (якщо є)
    const existingConfig = existingConfigs.find(c => c.id === config.id);
    const existingOverride = existingConfig?.override_data || {};
    
    // Визначаємо базові властивості (ті що генеруються)
    const generatedOverride = {};
    for (const [key, value] of Object.entries(ownData)) {
      // Only add to override_data if it's different from self_data
      if (JSON.stringify(config.self_data[key]) !== JSON.stringify(value)) {
        generatedOverride[key] = value;
      }
    }
    
    // Знаходимо кастомні властивості (ті що є в існуючому, але не в згенерованому)
    const customProperties = {};
    for (const [key, value] of Object.entries(existingOverride)) {
      if (!(key in generatedOverride) && !(key in config.self_data)) {
        // Це кастомна властивість, яку додав користувач
        customProperties[key] = value;
      }
    }
    
    // Об'єднуємо згенеровані та кастомні властивості
    config.override_data = {
      ...generatedOverride,
      ...customProperties  // Кастомні властивості перезаписують згенеровані якщо є конфлікт
    };
    
    // Calculate data = self_data + override_data
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
      ...entityField
    };
    
    // Merge existing custom deps with semantic tree deps
    const existingFieldConfig = existingConfigs.find(c => c.id === config.id);
    if (existingFieldConfig && existingFieldConfig.deps) {
      // Get custom deps (ones not in semantic tree)
      const semanticDeps = new Set(config.deps || []);
      const existingDeps = existingFieldConfig.deps || [];
      const customDeps = existingDeps.filter(dep => !semanticDeps.has(dep));
      
      // Merge semantic tree deps with custom deps
      if (customDeps.length > 0) {
        config.deps = [...(config.deps || []), ...customDeps];
        console.log(`    Merging custom deps for ${config.id}: ${customDeps.join(', ')}`);
      }
    }
    
    
    // ПРАВИЛЬНИЙ ПІДХІД:
    // 1. self_data = дані успадковані від залежностей
    // Збираємо ВСІ дані з deps (включаючи їх self_data + override_data)
    let inheritedData = {};
    for (const depId of (config.deps || [])) {
      // Спочатку шукаємо в новозгенерованих configs
      const depConfig = configs.find(c => c.id === depId);
      if (depConfig) {
        // Беремо повні дані залежності (self_data + override_data) з deep merge
        const depFullData = deepMerge(
          depConfig.self_data || {},
          depConfig.override_data || {}
        );
        inheritedData = deepMerge(inheritedData, depFullData);

        // Debug for specific problematic field
        if (config.id === 'breed_field_avatar_url') {
          console.log(`    - From ${depId}:`);
          console.log(`      self_data: ${Object.keys(depConfig.self_data || {}).length} keys`);
          console.log(`      override_data: ${Object.keys(depConfig.override_data || {}).length} keys`);
          console.log(`      combined: ${Object.keys(depFullData).length} keys`);
        }
      } else {
        // Якщо не знайшли в configs, шукаємо в існуючих (для кастомних property)
        const existingDep = existingConfigs.find(c => c.id === depId);
        if (existingDep) {
          // Беремо data з існуючого конфігу (це self_data + override_data)
          inheritedData = deepMerge(inheritedData, existingDep.data || {});

        } else if (depId.startsWith('property_')) {
          // Fallback for built-in properties
          const propertyData = getPropertyData(depId);
          inheritedData = deepMerge(inheritedData, propertyData);
        }
      }
    }
    config.self_data = inheritedData;
    
    // 2. Повні дані поля (з semantic tree, неправильна назва self_data там)
    const completeFieldData = entityField.self_data || {};
    
    // 3. override_data = повні дані МІНУС успадковані дані
    // ПЛЮС збереження кастомних властивостей
    
    // Спочатку завантажуємо існуючий override_data з БД (якщо є)
    const existingConfig = existingConfigs.find(c => c.id === config.id);
    const existingOverride = existingConfig?.override_data || {};
    
    // Визначаємо базові властивості (ті що генеруються)
    const generatedOverride = {};
    for (const [key, value] of Object.entries(completeFieldData)) {
      // Додаємо в override тільки те, що відрізняється від успадкованого
      if (JSON.stringify(inheritedData[key]) !== JSON.stringify(value)) {
        generatedOverride[key] = value;
      }
    }
    
    // Знаходимо кастомні властивості (ті що є в існуючому, але не в згенерованому)
    const customProperties = {};
    for (const [key, value] of Object.entries(existingOverride)) {
      if (!(key in generatedOverride) && !(key in inheritedData)) {
        // Це кастомна властивість, яку додав користувач
        customProperties[key] = value;
      }
    }
    
    // Об'єднуємо згенеровані та кастомні властивості
    config.override_data = {
      ...generatedOverride,
      ...customProperties  // Кастомні властивості перезаписують згенеровані якщо є конфлікт
    };
    
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

// Helper function to normalize JSON for comparison (handles key order differences)
function normalizeJSON(obj) {
  if (obj === null || obj === undefined) return {};
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(normalizeJSON).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  
  // Sort object keys and recursively normalize values
  const sorted = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = normalizeJSON(obj[key]);
  });
  return sorted;
}

// Helper function to detect if a record has changed
function hasRecordChanged(existing, generated, debug = false) {
  // Normalize and compare data fields
  const existingDataNorm = JSON.stringify(normalizeJSON(existing.data));
  const generatedDataNorm = JSON.stringify(normalizeJSON(generated.data));
  
  const existingDepsNorm = JSON.stringify(normalizeJSON(existing.deps));
  const generatedDepsNorm = JSON.stringify(normalizeJSON(generated.deps));
  
  const existingSelfDataNorm = JSON.stringify(normalizeJSON(existing.self_data));
  const generatedSelfDataNorm = JSON.stringify(normalizeJSON(generated.self_data));
  
  const existingOverrideDataNorm = JSON.stringify(normalizeJSON(existing.override_data));
  const generatedOverrideDataNorm = JSON.stringify(normalizeJSON(generated.override_data));
  
  const existingTagsNorm = JSON.stringify(normalizeJSON(existing.tags));
  const generatedTagsNorm = JSON.stringify(normalizeJSON(generated.tags));
  
  const dataChanged = existingDataNorm !== generatedDataNorm;
  const depsChanged = existingDepsNorm !== generatedDepsNorm;
  const selfDataChanged = existingSelfDataNorm !== generatedSelfDataNorm;
  const overrideDataChanged = existingOverrideDataNorm !== generatedOverrideDataNorm;
  const tagsChanged = existingTagsNorm !== generatedTagsNorm;
  
  if (debug && (dataChanged || depsChanged || selfDataChanged || overrideDataChanged || tagsChanged)) {
    console.log(`\nDEBUG: Changes detected for ${generated.id}:`);
    if (dataChanged) {
      console.log('  - data field changed');
      console.log('    existing:', existingDataNorm.substring(0, 100));
      console.log('    generated:', generatedDataNorm.substring(0, 100));
    }
    if (depsChanged) console.log('  - deps changed');
    if (selfDataChanged) {
      console.log('  - self_data changed');
      console.log('    existing:', existingSelfDataNorm.substring(0, 100));
      console.log('    generated:', generatedSelfDataNorm.substring(0, 100));
    }
    if (overrideDataChanged) {
      console.log('  - override_data changed');
      console.log('    existing:', existingOverrideDataNorm.substring(0, 100));
      console.log('    generated:', generatedOverrideDataNorm.substring(0, 100));
    }
    if (tagsChanged) console.log('  - tags changed');
  }
  
  return dataChanged || depsChanged || selfDataChanged || overrideDataChanged || tagsChanged;
}

// Batch insert directly to Supabase with change detection
async function batchInsertToSupabase(configs, batchSize = 50) {
  console.log(`\nProcessing ${configs.length} configuration records...`);
  
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let errors = 0;
  
  // First, fetch all existing records to preserve override_data and detect changes
  console.log('Fetching existing records for comparison and override preservation...');
  let existingRecords = [];
  try {
    existingRecords = await fetchAllPaginated(() =>
      supabase
        .from('app_config')
        .select('id, type, self_data, override_data, data, deps, tags, category, caption, deleted')
    );
  } catch (error) {
    console.error('Error fetching existing records:', error);
  }
  
  // Create a map of existing records by id
  const existingMap = new Map();
  if (existingRecords) {
    existingRecords.forEach(record => {
      existingMap.set(record.id, record);
    });
    console.log(`Found ${existingMap.size} existing records in database`);
  }
  
  // Separate records into new, changed, and unchanged
  const newRecords = [];
  const changedRecords = [];
  const unchangedRecords = [];
  
  // Process each config
  const configsWithData = configs.map(config => {
    const existing = existingMap.get(config.id);
    
    // NO LONGER PRESERVING override_data - we now generate it correctly
    // based on the difference between complete field data and inherited data
    
    // Preserve custom dependencies (Phase 3)
    if (existing && existing.deps && config.deps) {
      // Find custom deps that are not in the generated deps
      const customDeps = existing.deps.filter(dep => !config.deps.includes(dep));
      
      if (customDeps.length > 0) {
        console.log(`  Preserving custom deps for ${config.id}: ${customDeps.join(', ')}`);
        // Add custom deps to the end to preserve priority order
        config.deps = [...config.deps, ...customDeps];
      }
    }
    
    // Compute the final data field
    const processedConfig = {
      ...config,
      data: computeMergedData(config.id, configs)
    };
    
    // Categorize the record
    if (!existing) {
      newRecords.push(processedConfig);
    } else if (hasRecordChanged(existing, processedConfig, changedRecords.length < 3)) {
      changedRecords.push(processedConfig);
    } else {
      unchangedRecords.push(processedConfig);
    }
    
    return processedConfig;
  });
  
  // Report detection results
  console.log('\n📊 Change Detection Results:');
  console.log(`  🆕 New records: ${newRecords.length}`);
  console.log(`  🔄 Changed records: ${changedRecords.length}`);
  console.log(`  ✅ Unchanged records: ${unchangedRecords.length}`);
  
  // Soft-delete stale entity_field records (columns removed from DB schema)
  const generatedIds = new Set(configsWithData.map(c => c.id));
  const staleEntityFields = existingRecords.filter(r =>
    r.type === 'entity_field' &&
    !generatedIds.has(r.id) &&
    !r.deleted
  );

  if (staleEntityFields.length > 0) {
    console.log(`\n🗑️  Soft-deleting ${staleEntityFields.length} stale entity fields (columns removed from DB):`);
    for (const stale of staleEntityFields) {
      console.log(`  - ${stale.id}`);
    }
    const staleIds = staleEntityFields.map(r => r.id);
    for (let i = 0; i < staleIds.length; i += batchSize) {
      const batch = staleIds.slice(i, i + batchSize);
      const { error } = await supabase
        .from('app_config')
        .update({ deleted: true })
        .in('id', batch);
      if (error) {
        console.error('  Error soft-deleting stale fields:', error);
      }
    }
  }

  // Only process new and changed records
  const recordsToUpsert = [...newRecords, ...changedRecords];

  if (recordsToUpsert.length === 0) {
    console.log('\n✨ No changes detected! Database is already up to date.');
    return { inserted: 0, updated: 0, unchanged: unchangedRecords.length, errors: 0, softDeleted: staleEntityFields.length };
  }
  
  console.log(`\n📝 Upserting ${recordsToUpsert.length} records (${newRecords.length} new, ${changedRecords.length} modified)...`);
  
  // Batch upsert only changed records
  for (let i = 0; i < recordsToUpsert.length; i += batchSize) {
    const batch = recordsToUpsert.slice(i, i + batchSize);
    
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
        // Count new vs updated based on what was in the batch
        const batchNewCount = batch.filter(r => newRecords.some(n => n.id === r.id)).length;
        const batchUpdateCount = batch.length - batchNewCount;
        
        inserted += batchNewCount;
        updated += batchUpdateCount;
        console.log(`  Batch ${Math.floor(i/batchSize) + 1}: Processed ${batch.length} records (${batchNewCount} new, ${batchUpdateCount} updated)`);
      }
    } catch (err) {
      console.error(`Batch ${Math.floor(i/batchSize) + 1} exception:`, err);
      errors += batch.length;
    }
  }
  
  unchanged = unchangedRecords.length;

  // Cascade updates if any records were changed using optimized BatchProcessor
  if (changedRecords.length > 0) {
    // IMPORTANT: Include ALL generated configs in cascade, not just changed ones
    // This ensures fields propagate their updates even if they themselves didn't change
    const allGeneratedIds = [...changedRecords, ...unchangedRecords].map(r => r.id);
    
    console.log('\n🔄 Running optimized cascade updates for all generated configs...');
    console.log(`  Processing cascade from ${allGeneratedIds.length} configs (${changedRecords.length} changed, ${unchangedRecords.length} unchanged)`);
      
      try {
        // Run optimized cascading updates with BatchProcessor
        const cascadeResult = await cascadeUpdate(allGeneratedIds, { 
          verbose: false,
          dryRun: false,
          batchSize: 500,
          includeHierarchical: true // Enable hierarchical update for full cascade
        });
        
        if (cascadeResult.success) {
          console.log(`  ✅ Cascade complete:`);
          console.log(`     - Affected: ${cascadeResult.affected} configs`);
          console.log(`     - Updated: ${cascadeResult.updated} configs`);
          console.log(`     - Unchanged: ${cascadeResult.unchanged || 0} configs (skipped)`);
          if (cascadeResult.duration) {
            console.log(`     - Duration: ${cascadeResult.duration.toFixed(2)}s`);
            console.log(`     - Rate: ${(cascadeResult.updated / cascadeResult.duration).toFixed(0)} records/sec`);
          }
          
          // Trigger hierarchical update for changed fields AND their affected configs
          console.log('\n🏗️ Rebuilding hierarchy for cascaded changes...');
          
          // Get all configs that need hierarchy rebuild after cascade
          // This includes the originally changed fields AND any fields configs updated by cascade
          const configsToRebuild = new Set();
          
          // Add originally changed fields
          changedRecords
            .filter(r => r.type === 'entity_field' || r.type === 'field')
            .forEach(r => configsToRebuild.add(r.id));
          
          // Add ALL fields configs that might have been updated by cascade
          // This ensures page/space/workspace/app get rebuilt with fresh data
          if (configsToRebuild.size > 0 || cascadeResult.updated > 0) {
            console.log(`   Rebuilding full hierarchy after cascade updates`);
            const { rebuildFullHierarchy } = require('./rebuild-hierarchy.cjs');
            const rebuildResult = await rebuildFullHierarchy({ verbose: false });
            
            if (rebuildResult.success) {
              console.log(`   ✅ Full hierarchy rebuilt successfully`);
            } else {
              console.log(`   ⚠️ Hierarchy rebuild had issues: ${rebuildResult.error}`);
            }
          } else {
            console.log('   No changes detected, hierarchy rebuild not needed');
          }
        } else {
          console.warn('  ⚠️ Cascade update failed:', cascadeResult.error);
        }
      } catch (error) {
        console.error('  ❌ Error during cascade update:', error.message);
      }
  }
  
  return { inserted, updated, unchanged, errors };
}

// Main execution
async function main() {
  console.log('Loading semantic tree...');
  const tree = loadSemanticTree();
  
  console.log('\nLoading existing configurations from database...');
  const existingConfigs = await loadExistingConfigs();
  console.log(`  Loaded ${existingConfigs.length} existing configs`);
  
  console.log('\nGenerating SQL inserts...');
  const { inserts, configs } = generateAllInserts(tree, existingConfigs);
  
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
      console.log('\n=== Database Operation Complete ===');
      console.log(`🆕 New records inserted: ${result.inserted}`);
      console.log(`🔄 Existing records updated: ${result.updated}`);
      console.log(`✅ Unchanged records skipped: ${result.unchanged}`);
      console.log(`❌ Errors: ${result.errors}`);
      
      // Calculate performance improvement
      const totalProcessed = result.inserted + result.updated;
      const totalRecords = configs.length;
      const percentSkipped = ((result.unchanged / totalRecords) * 100).toFixed(1);
      
      if (result.unchanged > 0) {
        console.log(`\n🚀 Performance: Skipped ${percentSkipped}% of records (${result.unchanged}/${totalRecords}) due to no changes`);
      }
    } else {
      console.log('Skipping database insert.');
      console.log(`You can manually run the SQL file: ${OUTPUT_PATH}`);
    }
    
    rl.close();
  });
}

// Run generator
main().catch(console.error);