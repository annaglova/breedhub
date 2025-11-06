/**
 * Cascading Updates v3 - Fixed parent update logic
 * 
 * Critical fix: Parents only update after ALL their children are updated
 * This ensures complete data propagation in hierarchical structures
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const BatchProcessor = require('./batch-processor.cjs');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

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

/**
 * Build complete dependency graph
 */
function buildFullDependencyGraph(allConfigs) {
  const childToParents = new Map(); // child -> [parents]
  const parentToChildren = new Map(); // parent -> [children]
  
  for (const config of allConfigs) {
    if (!parentToChildren.has(config.id)) {
      parentToChildren.set(config.id, []);
    }
    
    for (const dep of config.deps || []) {
      // Record parent -> child relationship
      if (!parentToChildren.has(config.id)) {
        parentToChildren.set(config.id, []);
      }
      parentToChildren.get(config.id).push(dep);
      
      // Record child -> parent relationship
      if (!childToParents.has(dep)) {
        childToParents.set(dep, []);
      }
      childToParents.get(dep).push(config.id);
    }
  }
  
  return { childToParents, parentToChildren };
}

/**
 * Find all affected records WITH proper ordering
 */
function findAffectedWithOrder(changedIds, graph, allConfigs) {
  const { childToParents } = graph;
  const affected = new Set(changedIds);
  const queue = [...changedIds];
  const visited = new Set();
  
  // Find all affected records
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    
    const parents = childToParents.get(current) || [];
    for (const parent of parents) {
      affected.add(parent);
      if (!visited.has(parent)) {
        queue.push(parent);
      }
    }
  }
  
  // Create update order using dependency levels
  const levels = new Map();
  const configMap = new Map(allConfigs.map(c => [c.id, c]));
  
  // Calculate dependency depth for each config
  function getDepth(configId, visiting = new Set()) {
    if (levels.has(configId)) return levels.get(configId);
    if (visiting.has(configId)) return 0; // Circular dependency
    
    visiting.add(configId);
    const config = configMap.get(configId);
    if (!config || !config.deps || config.deps.length === 0) {
      levels.set(configId, 0);
      return 0;
    }
    
    let maxDepth = 0;
    for (const dep of config.deps) {
      if (affected.has(dep)) {
        maxDepth = Math.max(maxDepth, getDepth(dep, visiting) + 1);
      }
    }
    
    levels.set(configId, maxDepth);
    return maxDepth;
  }
  
  // Calculate depths for all affected
  for (const id of affected) {
    getDepth(id);
  }
  
  // Sort by depth (lower depth = update first)
  const ordered = Array.from(affected).sort((a, b) => {
    const depthA = levels.get(a) || 0;
    const depthB = levels.get(b) || 0;
    return depthA - depthB;
  });
  
  return { affected, ordered };
}

/**
 * Recalculate config with ALL dependencies updated
 */
function recalculateConfig(config, allConfigs, updatedConfigs) {
  try {
    // Handle different config types appropriately
    
    // Build new self_data from dependencies
    let newSelfData = {};
    
    // Special handling for grouping configs (fields, sort, filter)
    const groupingConfigTypes = ['fields', 'sort', 'filter'];
    
    if (groupingConfigTypes.includes(config.type)) {
      // For grouping configs, build structure as object with field IDs as keys
      if (config.deps && Array.isArray(config.deps)) {
        for (const depId of config.deps) {
          // Get the field config and use its data
          const fieldConfig = updatedConfigs.get(depId) || allConfigs.find(c => c.id === depId);
          
          if (fieldConfig && fieldConfig.data) {
            // Use the field's full data, grouped by field ID
            newSelfData[depId] = fieldConfig.data;
          } else {
            // Fallback to simple structure if field not found
            newSelfData[depId] = {
              id: depId,
              isActive: true
            };
          }
        }
      }
    } else {
      // Regular configs - check if dependencies include grouping configs
      if (config.deps && Array.isArray(config.deps)) {
        // First, categorize dependencies by type
        const depsByType = {
          fields: [],
          sort: [],
          filter: [],
          other: []
        };
        
        for (const depId of config.deps) {
          const depConfig = updatedConfigs.get(depId) || allConfigs.find(c => c.id === depId);
          if (depConfig) {
            if (depConfig.type === 'fields') {
              depsByType.fields.push(depConfig);
            } else if (depConfig.type === 'sort') {
              depsByType.sort.push(depConfig);
            } else if (depConfig.type === 'filter') {
              depsByType.filter.push(depConfig);
            } else {
              depsByType.other.push(depConfig);
            }
          }
        }
        
        // Check if we have any grouping configs (fields, sort, filter)
        const hasGroupingConfigs = depsByType.fields.length > 0 || depsByType.sort.length > 0 || depsByType.filter.length > 0;
        
        if (hasGroupingConfigs) {
          // Build structured data for grouping configs - ALWAYS USE DATA
          // Only create sections if we have configs of that type
          if (depsByType.fields.length > 0) {
            const fieldsData = {};
            for (const fieldConfig of depsByType.fields) {
              if (fieldConfig.data) {
                Object.assign(fieldsData, fieldConfig.data);
              }
            }
            if (Object.keys(fieldsData).length > 0) {
              newSelfData.fields = fieldsData;
            }
          }
          
          if (depsByType.sort.length > 0) {
            const sortData = {};
            for (const sortConfig of depsByType.sort) {
              if (sortConfig.data) {
                Object.assign(sortData, sortConfig.data);
              }
            }
            if (Object.keys(sortData).length > 0) {
              newSelfData.sort_fields = sortData;
            }
          }
          
          if (depsByType.filter.length > 0) {
            const filterData = {};
            for (const filterConfig of depsByType.filter) {
              if (filterConfig.data) {
                Object.assign(filterData, filterConfig.data);
              }
            }
            if (Object.keys(filterData).length > 0) {
              newSelfData.filter_fields = filterData;
            }
          }
          
          // Merge other non-grouping configs normally
          for (const otherConfig of depsByType.other) {
            if (otherConfig.data) {
              newSelfData = deepMerge(newSelfData, otherConfig.data);
            }
          }
        } else {
          // No grouping configs - merge all normally
          for (const otherConfig of depsByType.other) {
            if (otherConfig.data) {
              newSelfData = deepMerge(newSelfData, otherConfig.data);
            }
          }
        }
      }
    }
    
    // Calculate new data - use deep merge for all configs to preserve nested properties
    const newData = deepMerge(newSelfData, config.override_data || {});
    
    // Deep comparison for changes
    const selfDataChanged = JSON.stringify(config.self_data) !== JSON.stringify(newSelfData);
    const dataChanged = JSON.stringify(config.data) !== JSON.stringify(newData);
    
    if (selfDataChanged || dataChanged) {
      return {
        ...config,
        self_data: newSelfData,
        data: newData,
        updated_at: new Date().toISOString()
      };
    }
    
    return null; // No changes
    
  } catch (error) {
    console.error(`Error recalculating config ${config.id}:`, error);
    return null;
  }
}

/**
 * Main cascade update function with proper parent waiting
 */
async function cascadeUpdate(changedIds, options = {}) {
  const {
    verbose = false,
    dryRun = false,
    batchSize = 500
  } = options;
  
  console.log('\n' + '='.repeat(60));
  console.log('🔄 CASCADING UPDATES v3 - Parent-aware');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Fetch all configs
    console.log('\n📥 Loading all configurations...');
    const { data: allConfigs, error } = await supabase
      .from('app_config')
      .select('*')
      .order('id');
    
    if (error) throw error;
    console.log(`  ✓ Loaded ${allConfigs.length} configurations`);
    
    // Step 2: Build complete dependency graph
    console.log('\n🔗 Building dependency graph...');
    const graph = buildFullDependencyGraph(allConfigs);
    console.log(`  ✓ Mapped ${graph.childToParents.size} dependency relationships`);
    
    // Step 3: Find affected records with proper order
    console.log('\n🎯 Finding affected records with dependency order...');
    const { affected, ordered } = findAffectedWithOrder(changedIds, graph, allConfigs);
    console.log(`  ✓ Found ${affected.size} affected records`);
    console.log(`  ✓ Ordered by dependency depth`);
    
    // Show update order if verbose
    if (verbose) {
      console.log('\n📊 Update Order:');
      ordered.slice(0, 20).forEach(id => {
        const config = allConfigs.find(c => c.id === id);
        console.log(`  ${id} (${config?.type || 'unknown'})`);
      });
      if (ordered.length > 20) {
        console.log(`  ... and ${ordered.length - 20} more`);
      }
    }
    
    // Step 4: Process updates in order
    console.log('\n🔧 Processing updates in dependency order...');
    const updatedConfigs = new Map();
    const recordsToUpdate = [];
    
    for (const configId of ordered) {
      // Skip the originally changed records (they're already updated)
      if (changedIds.includes(configId)) {
        // Add them to updatedConfigs map for dependency resolution
        const config = allConfigs.find(c => c.id === configId);
        if (config) {
          updatedConfigs.set(configId, config);
        }
        continue;
      }
      
      const config = allConfigs.find(c => c.id === configId);
      if (!config) continue;
      
      // Check if all dependencies are ready
      let allDepsReady = true;
      if (config.deps) {
        for (const depId of config.deps) {
          if (affected.has(depId) && !updatedConfigs.has(depId) && !changedIds.includes(depId)) {
            allDepsReady = false;
            if (verbose) {
              console.log(`  ⏳ Skipping ${configId} - waiting for ${depId}`);
            }
            break;
          }
        }
      }
      
      if (!allDepsReady) {
        console.log(`  ⚠️ WARNING: ${configId} has unready dependencies`);
        continue;
      }
      
      // Recalculate with updated dependencies
      const updated = recalculateConfig(config, allConfigs, updatedConfigs);
      if (updated) {
        recordsToUpdate.push(updated);
        updatedConfigs.set(configId, updated);
      } else {
        // Even if no changes, add to updatedConfigs so dependencies know it's been processed
        updatedConfigs.set(configId, config);
      }
    }
    
    console.log(`  ✓ ${recordsToUpdate.length} configs need updating`);
    
    // Step 5: Dry run or execute
    if (dryRun) {
      console.log('\n🔍 DRY RUN - No changes will be made');
      return { 
        success: true, 
        dryRun: true, 
        affected: recordsToUpdate.length
      };
    }
    
    // Step 6: Execute batch update
    if (recordsToUpdate.length > 0) {
      const processor = new BatchProcessor(supabase, { batchSize, verbose });
      const result = await processor.processRecords(recordsToUpdate, 'Cascade update v3');
      
      
      return {
        success: result.success,
        affected: affected.size,
        updated: result.metrics.processedRecords,
        duration: (result.metrics.endTime - result.metrics.startTime) / 1000,
        metrics: result.metrics
      };
    } else {
      console.log('\n✨ No updates needed');
      return { 
        success: true, 
        affected: 0, 
        updated: 0
      };
    }
    
  } catch (error) {
    console.error('\n❌ Cascade update failed:', error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * CLI interface
 */
async function main() {
  const [,, command, ...args] = process.argv;
  
  switch (command) {
    case 'test':
      console.log('🧪 Testing cascade update v3...');
      await cascadeUpdate(['breed_field_account_id'], { verbose: true, dryRun: true });
      break;
      
    case 'update':
      if (args.length === 0) {
        console.log('Usage: node cascading-updates-v3.cjs update <configId1> [configId2] ...');
        break;
      }
      await cascadeUpdate(args, { verbose: true });
      break;
      
    default:
      console.log('Cascading Updates v3 - Parent-aware cascade');
      console.log('\nUsage:');
      console.log('  node cascading-updates-v3.cjs test              - Test with breed_field_account_id');
      console.log('  node cascading-updates-v3.cjs update <ids...>   - Update specific configs');
  }
}

// Export for use in other scripts
module.exports = {
  cascadeUpdate
};

// Run CLI if called directly
if (require.main === module) {
  main().catch(console.error).finally(() => process.exit(0));
}