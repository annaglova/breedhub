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

/**
 * Build reverse dependency graph
 * Returns Map where key is config ID and value is array of dependent config IDs
 */
function buildDependencyGraph(records) {
  const dependents = new Map(); // id -> [dependent record ids]
  
  for (const record of records) {
    if (record.deps && Array.isArray(record.deps)) {
      for (const dep of record.deps) {
        if (!dependents.has(dep)) {
          dependents.set(dep, []);
        }
        dependents.get(dep).push(record.id);
      }
    }
  }
  
  return dependents;
}

/**
 * Find all records affected by changes to specified config IDs
 * Returns Set of all affected record IDs (including initial ones)
 */
function findAffectedRecords(changedIds, graph) {
  const affected = new Set(changedIds);
  const queue = [...changedIds];
  
  while (queue.length > 0) {
    const current = queue.shift();
    const dependents = graph.get(current) || [];
    
    for (const dependent of dependents) {
      if (!affected.has(dependent)) {
        affected.add(dependent);
        queue.push(dependent);
      }
    }
  }
  
  return affected;
}

/**
 * Perform topological sort on affected records to determine update order
 * Ensures dependencies are updated before their dependents
 */
function topologicalSort(recordIds, allRecords) {
  const recordMap = new Map();
  for (const record of allRecords) {
    recordMap.set(record.id, record);
  }
  
  // Build adjacency list for affected records only
  const adjacency = new Map();
  const inDegree = new Map();
  
  for (const id of recordIds) {
    adjacency.set(id, []);
    inDegree.set(id, 0);
  }
  
  // Calculate in-degrees
  for (const id of recordIds) {
    const record = recordMap.get(id);
    if (record && record.deps) {
      for (const dep of record.deps) {
        if (recordIds.has(dep)) {
          adjacency.get(dep).push(id);
          inDegree.set(id, inDegree.get(id) + 1);
        }
      }
    }
  }
  
  // Find nodes with no dependencies
  const queue = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }
  
  const sorted = [];
  while (queue.length > 0) {
    const current = queue.shift();
    sorted.push(current);
    
    // Reduce in-degree of dependents
    const dependents = adjacency.get(current) || [];
    for (const dependent of dependents) {
      const newDegree = inDegree.get(dependent) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) {
        queue.push(dependent);
      }
    }
  }
  
  // Check for cycles
  if (sorted.length !== recordIds.size) {
    console.warn('Warning: Circular dependency detected. Some records may not be updated correctly.');
    // Add remaining records to ensure all are processed
    for (const id of recordIds) {
      if (!sorted.includes(id)) {
        sorted.push(id);
      }
    }
  }
  
  return sorted;
}

/**
 * Deep merge objects (right overwrites left)
 */
function deepMerge(target, source) {
  if (!source) return target;
  if (!target) return source;
  
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

/**
 * Recalculate data for a single record based on its dependencies
 */
function recalculateRecord(record, allRecords) {
  const recordMap = new Map();
  for (const r of allRecords) {
    recordMap.set(r.id, r);
  }
  
  let newSelfData = record.self_data || {};
  let shouldUpdateSelfData = false;
  
  // Rebuild self_data from dependencies
  // self_data = merge of all deps' data fields
  if (record.deps && Array.isArray(record.deps) && record.deps.length > 0) {
    shouldUpdateSelfData = true;
    newSelfData = {};
    
    // Merge all dependency DATA (not self_data!) into our self_data
    for (const depId of record.deps) {
      const depRecord = recordMap.get(depId);
      if (depRecord && depRecord.data) {
        // self_data = merge of deps' DATA
        newSelfData = deepMerge(newSelfData, depRecord.data);
      }
    }
    
    // Preserve field-specific data that's not from dependencies
    // (like displayName, permissions that are unique to this field)
    const originalSelfData = record.self_data || {};
    for (const key in originalSelfData) {
      // If this key doesn't come from deps, keep it
      if (!(key in newSelfData)) {
        newSelfData[key] = originalSelfData[key];
      }
    }
  }
  
  // Calculate final data = self_data + override_data
  const selfDataToUse = shouldUpdateSelfData ? newSelfData : (record.self_data || {});
  let computedData = { ...selfDataToUse };
  
  // Apply override_data on top (highest priority)
  if (record.override_data) {
    computedData = deepMerge(computedData, record.override_data);
  }
  
  const result = {
    ...record,
    data: computedData
  };
  
  // Include updated self_data if it was rebuilt
  if (shouldUpdateSelfData) {
    result.self_data = newSelfData;
  }
  
  return result;
}

/**
 * Main cascading update function
 * Updates all affected records when base configs change
 */
async function cascadeUpdate(changedIds, options = {}) {
  const { dryRun = false, verbose = false } = options;
  
  console.log('\n=== Starting Cascading Update ===');
  console.log(`Changed IDs: ${changedIds.join(', ')}`);
  
  // Fetch all records from database
  const { data: allRecords, error } = await supabase
    .from('app_config')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching records:', error);
    return { success: false, error };
  }
  
  console.log(`Total records in database: ${allRecords.length}`);
  
  // Build dependency graph
  const graph = buildDependencyGraph(allRecords);
  
  // Find all affected records
  const affected = findAffectedRecords(changedIds, graph);
  console.log(`Affected records: ${affected.size}`);
  
  if (verbose) {
    console.log('Affected IDs:', Array.from(affected).join(', '));
  }
  
  // Sort affected records in update order
  const updateOrder = topologicalSort(affected, allRecords);
  console.log(`Update order determined for ${updateOrder.length} records`);
  
  // Recalculate data for affected records
  const updates = [];
  const recordMap = new Map();
  for (const record of allRecords) {
    recordMap.set(record.id, record);
  }
  
  for (const id of updateOrder) {
    const record = recordMap.get(id);
    if (record) {
      const updated = recalculateRecord(record, allRecords);
      
      // Check if data or self_data changed
      const dataChanged = JSON.stringify(record.data) !== JSON.stringify(updated.data);
      const selfDataChanged = JSON.stringify(record.self_data) !== JSON.stringify(updated.self_data);
      
      if (dataChanged || selfDataChanged) {
        const updateRecord = {
          id: updated.id,
          type: updated.type, // Preserve type field
          data: updated.data,
          updated_at: new Date().toISOString()
        };
        
        // Include self_data if it changed
        if (selfDataChanged) {
          updateRecord.self_data = updated.self_data;
        }
        
        updates.push(updateRecord);
        
        // Update in our local map for subsequent calculations
        recordMap.set(id, updated);
        
        if (verbose) {
          console.log(`Updated: ${id}`);
        }
      }
    }
  }
  
  console.log(`\nRecords requiring update: ${updates.length}`);
  
  if (dryRun) {
    console.log('\n=== DRY RUN - No changes made ===');
    return {
      success: true,
      affected: affected.size,
      updated: updates.length,
      dryRun: true
    };
  }
  
  // Batch update in database
  if (updates.length > 0) {
    const batchSize = 100;
    let successCount = 0;
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      const { error: updateError } = await supabase
        .from('app_config')
        .upsert(batch, { onConflict: 'id' });
      
      if (updateError) {
        console.error(`Error updating batch ${i / batchSize + 1}:`, updateError);
      } else {
        successCount += batch.length;
        console.log(`Updated batch ${i / batchSize + 1} (${batch.length} records)`);
      }
    }
    
    console.log(`\n✅ Successfully updated ${successCount} records`);
  } else {
    console.log('\n✅ No updates needed - all records already up to date');
  }
  
  return {
    success: true,
    affected: affected.size,
    updated: updates.length,
    dryRun: false
  };
}

/**
 * Update specific property and cascade changes
 */
async function updatePropertyAndCascade(propertyId, newSelfData, options = {}) {
  console.log(`\n=== Updating Property: ${propertyId} ===`);
  
  // For properties, data = self_data (they don't have override_data)
  const computedData = newSelfData;
  
  // Update the property itself
  const { error: updateError } = await supabase
    .from('app_config')
    .update({
      self_data: newSelfData,
      data: computedData, // Computed, not directly set
      updated_at: new Date().toISOString()
    })
    .eq('id', propertyId);
  
  if (updateError) {
    console.error('Error updating property:', updateError);
    return { success: false, error: updateError };
  }
  
  console.log('Property updated successfully');
  
  // Cascade the update
  return await cascadeUpdate([propertyId], options);
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: node cascading-updates.cjs <command> [options]

Commands:
  update <property-id> <self-data-json>  Update a property and cascade changes
  cascade <id1,id2,...>                  Manually trigger cascade for specific IDs
  test                                    Run a test cascade with dry-run

Options:
  --dry-run    Show what would be updated without making changes
  --verbose    Show detailed output

Examples:
  node cascading-updates.cjs update property_required '{"required":true,"validation":{"notNull":true}}'
  node cascading-updates.cjs cascade property_required,property_is_system --dry-run
  node cascading-updates.cjs test
    `);
    process.exit(0);
  }
  
  const command = args[0];
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  
  try {
    switch (command) {
      case 'update': {
        if (args.length < 3) {
          console.error('Usage: update <property-id> <self-data-json>');
          process.exit(1);
        }
        
        const propertyId = args[1];
        const selfData = JSON.parse(args[2]);
        
        const result = await updatePropertyAndCascade(propertyId, selfData, { dryRun, verbose });
        console.log('\nResult:', result);
        break;
      }
      
      case 'cascade': {
        if (args.length < 2) {
          console.error('Usage: cascade <id1,id2,...>');
          process.exit(1);
        }
        
        const ids = args[1].split(',').map(id => id.trim());
        const result = await cascadeUpdate(ids, { dryRun, verbose });
        console.log('\nResult:', result);
        break;
      }
      
      case 'test': {
        console.log('Running test cascade with property_required...');
        const result = await cascadeUpdate(['property_required'], { dryRun: true, verbose: true });
        console.log('\nTest Result:', result);
        break;
      }
      
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Export for use in other scripts
module.exports = {
  buildDependencyGraph,
  findAffectedRecords,
  topologicalSort,
  recalculateRecord,
  cascadeUpdate,
  updatePropertyAndCascade
};

// Run if called directly
if (require.main === module) {
  main();
}