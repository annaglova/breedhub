/**
 * Rebuild Hierarchy - Properly rebuilds nested structures in hierarchy configs
 *
 * When lower-level configs change, parent configs need to rebuild their nested structures:
 * fields → fields_config → page → space → workspace → app
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

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
 * Sort items array by the order specified in deps array
 * Supabase .in() does NOT preserve array order, so we need to manually sort
 */
function sortByDepsOrder(items, depsArray) {
  if (!items || !depsArray || items.length === 0) {
    return items || [];
  }

  const itemsMap = new Map(items.map(item => [item.id, item]));
  return depsArray
    .map(depId => itemsMap.get(depId))
    .filter(item => item !== undefined);
}

/**
 * Universal grouping config processor
 * Handles fields, sort, and filter configs in a consistent way
 *
 * @param {string[]} dependentIds - Array of dependent config IDs
 * @param {Object} groupingTypes - Object mapping type to container key
 *   Example: { 'fields': 'fields', 'sort': 'sort_fields', 'filter': 'filter_fields' }
 * @returns {Object} Object with merged grouping configs
 */
async function processGroupingConfigs(dependentIds, groupingTypes) {
  if (!dependentIds || dependentIds.length === 0) {
    return {};
  }

  const result = {};

  // Process each grouping type
  for (const [configType, containerKey] of Object.entries(groupingTypes)) {
    const { data } = await supabase
      .from('app_config')
      .select('id, data')
      .in('id', dependentIds)
      .eq('type', configType);

    if (data && data.length > 0) {
      // Merge all configs of this type into a single container
      const container = {};
      for (const config of data) {
        if (config.data && typeof config.data === 'object') {
          Object.assign(container, config.data);
        }
      }

      // Only add to result if we have data
      if (Object.keys(container).length > 0) {
        result[containerKey] = container;
      }
    }
  }

  return result;
}

/**
 * Configuration mapping for all config types
 * Defines how each config type should be rebuilt
 */
const configTypeMapping = {
  // Grouping configs - collect field configs into a single structure
  'fields': {
    type: 'grouping'
  },
  'sort': {
    type: 'grouping'
  },
  'filter': {
    type: 'grouping'
  },

  // Leaf node - no children to rebuild from
  'menu_item': {
    type: 'leaf'
  },

  // Menu hierarchy
  'menu_section': {
    type: 'container',
    children: {
      'menu_item': 'items'
    }
  },
  'menu_config': {
    type: 'container',
    children: {
      'menu_section': 'sections',
      'menu_item': 'items'
    }
  },

  // View hierarchy
  'view': {
    type: 'container',
    grouping: {
      'fields': 'fields'
    },
    children: {
      'extension': 'extensions'
    }
  },
  'tab': {
    type: 'container',
    grouping: {
      'fields': 'fields',
      'sort': 'sort',
      'filter': 'filter'
    },
    children: {
      'view': 'views'
    }
  },
  'extension': {
    type: 'container',
    grouping: {
      'fields': 'fields',
      'sort': 'sort',
      'filter': 'filter'
    }
  },
  'page': {
    type: 'container',
    grouping: {
      'fields': 'fields'
    },
    children: {
      'tab': 'tabs',
      'menu_config': 'menus',
      'extension': 'extensions'
    }
  },

  // Space hierarchy
  'space': {
    type: 'container',
    grouping: {
      'fields': 'fields',
      'sort': 'sort_fields',
      'filter': 'filter_fields'
    },
    children: {
      'page': 'pages',
      'view': 'views',
      'extension': 'extensions'
    },
    properties: true
  },

  // Top-level hierarchy
  'workspace': {
    type: 'container',
    children: {
      'space': 'spaces'
    }
  },
  'user_config': {
    type: 'container',
    children: {
      'menu_config': 'menus'
    },
    properties: true
  },
  'app': {
    type: 'container',
    children: {
      'workspace': 'workspaces',
      'user_config': null  // user_config goes directly to root, not in a container
    },
    sortChildren: ['workspace']  // These children need to preserve deps order
  }
};

/**
 * Universal config rebuilder
 * Rebuilds any config type based on configTypeMapping
 */
async function rebuildConfig(configId) {
  try {
    // Fetch the config
    const { data: config, error: fetchError } = await supabase
      .from('app_config')
      .select('*')
      .eq('id', configId)
      .single();

    if (fetchError || !config) {
      console.error(`Failed to fetch config ${configId}:`, fetchError);
      return false;
    }

    const mapping = configTypeMapping[config.type];
    if (!mapping) {
      console.error(`No mapping found for config type: ${config.type}`);
      return false;
    }

    // Handle different config types
    let structure = {};

    switch (mapping.type) {
      case 'leaf':
        // Leaf nodes have no children to rebuild from
        return true;

      case 'grouping':
        // Grouping configs collect field configs
        structure = await buildGroupingStructure(config);
        break;

      case 'container':
        // Container configs have children and/or grouping configs
        structure = await buildContainerStructure(config, mapping);
        break;

      default:
        console.error(`Unknown mapping type: ${mapping.type}`);
        return false;
    }

    // Update config with new structure
    const newSelfData = structure;
    const newData = deepMerge(newSelfData, config.override_data || {});

    const { error: updateError } = await supabase
      .from('app_config')
      .update({
        self_data: newSelfData,
        data: newData,
        updated_at: new Date().toISOString()
      })
      .eq('id', configId);

    if (updateError) {
      console.error(`Failed to update config ${configId}:`, updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error rebuilding config ${configId}:`, error);
    return false;
  }
}

/**
 * Build structure for grouping configs (fields/sort/filter)
 */
async function buildGroupingStructure(config) {
  const fieldIds = config.deps || [];
  if (fieldIds.length === 0) return {};

  // Fetch all dependent fields
  const { data: fields, error } = await supabase
    .from('app_config')
    .select('id, data')
    .in('id', fieldIds);

  if (error || !fields) return {};

  // Build nested structure: { [fieldId]: fieldData }
  const structure = {};
  for (const field of fields) {
    structure[field.id] = field.data || {};
  }

  return structure;
}

/**
 * Build structure for container configs
 */
async function buildContainerStructure(config, mapping) {
  const dependentIds = config.deps || [];
  const structure = {};

  // Process grouping configs if defined
  if (mapping.grouping) {
    const groupingConfigs = await processGroupingConfigs(dependentIds, mapping.grouping);
    Object.assign(structure, groupingConfigs);
  }

  // Process child configs if defined
  if (mapping.children) {
    for (const [childType, containerKey] of Object.entries(mapping.children)) {
      // Query children of this type
      const { data: childConfigs } = await supabase
        .from('app_config')
        .select('id, data')
        .in('id', dependentIds)
        .eq('type', childType);

      if (childConfigs && childConfigs.length > 0) {
        // Sort children if needed (for workspace in app)
        let sortedChildren = childConfigs;
        if (mapping.sortChildren && mapping.sortChildren.includes(childType)) {
          const childIds = dependentIds.filter(id => childConfigs.some(c => c.id === id));
          sortedChildren = sortByDepsOrder(childConfigs, childIds);
        }

        // Build children container
        const childrenData = {};
        for (const child of sortedChildren) {
          childrenData[child.id] = (child.data && Object.keys(child.data).length > 0)
            ? child.data
            : {};
        }

        // Add to structure
        if (Object.keys(childrenData).length > 0) {
          if (containerKey === null) {
            // user_config goes directly to root (for app)
            Object.assign(structure, childrenData);
          } else {
            structure[containerKey] = childrenData;
          }
        }
      }
    }
  }

  // Process properties if defined
  if (mapping.properties) {
    const { data: properties } = await supabase
      .from('app_config')
      .select('id, data')
      .in('id', dependentIds)
      .eq('type', 'property');

    if (properties) {
      for (const property of properties) {
        if (property.data && Object.keys(property.data).length > 0) {
          Object.assign(structure, property.data);
        }
      }
    }
  }

  return structure;
}

/**
 * Rebuild entire hierarchy from bottom to top
 */
async function rebuildFullHierarchy(options = {}) {
  const { verbose = false } = options;

  console.log('\n🏗️ REBUILDING FULL HIERARCHY');
  console.log('=' .repeat(60));

  try {
    // Get all hierarchy configs
    const { data: configs, error } = await supabase
      .from('app_config')
      .select('id, type')
      .in('type', ['fields', 'sort', 'filter', 'view', 'tab', 'page', 'space', 'workspace', 'app', 'user_config', 'menu_config', 'menu_section', 'menu_item', 'extension'])
      .order('type');

    if (error) throw error;

    // Group by type
    const grouped = {};
    for (const config of configs) {
      if (!grouped[config.type]) grouped[config.type] = [];
      grouped[config.type].push(config.id);
    }

    // Rebuild in TWO PASSES to ensure leaf configs are fully saved before parents read them
    // Pass 1: Leaf configs (fields/sort/filter/menu_item/view/extension) - these don't depend on other configs
    // Pass 2: Parent configs (tab/page/space/workspace/app/menu_section/menu_config/user_config) - these depend on leaf configs

    const pass1 = ['fields', 'sort', 'filter', 'menu_item', 'view', 'extension'];
    const pass2 = ['tab', 'page', 'menu_section', 'menu_config', 'user_config', 'space', 'workspace', 'app'];

    // PASS 1: Rebuild leaf configs
    console.log('\n🔄 PASS 1: Rebuilding leaf configs (fields/sort/filter/menu_item/view/extension)...');
    for (const type of pass1) {
      const ids = grouped[type] || [];
      if (ids.length === 0) continue;

      console.log(`\n📦 Rebuilding ${ids.length} ${type} configs...`);

      let success = 0;
      for (const id of ids) {
        const result = await rebuildConfig(id);
        if (result) {
          success++;
          if (verbose) console.log(`  ✓ ${id}`);
        } else {
          if (verbose) console.log(`  ✗ ${id}`);
        }
      }

      console.log(`  ✅ Rebuilt ${success}/${ids.length} ${type} configs`);
    }

    // Wait for DB to flush changes (helps with Supabase replication lag)
    console.log('\n⏳ Waiting for database flush (3 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // PASS 2: Rebuild parent configs
    console.log('\n🔄 PASS 2: Rebuilding parent configs (tab/page/menu_section/menu_config/user_config/space/workspace/app)...');
    for (const type of pass2) {
      const ids = grouped[type] || [];
      if (ids.length === 0) continue;

      console.log(`\n📦 Rebuilding ${ids.length} ${type} configs...`);

      let success = 0;
      for (const id of ids) {
        const result = await rebuildConfig(id);
        if (result) {
          success++;
          if (verbose) console.log(`  ✓ ${id}`);
        } else {
          if (verbose) console.log(`  ✗ ${id}`);
        }
      }

      console.log(`  ✅ Rebuilt ${success}/${ids.length} ${type} configs`);
    }

    console.log('\n✅ Hierarchy rebuild complete!');
    return { success: true };

  } catch (error) {
    console.error('❌ Hierarchy rebuild failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Rebuild hierarchy after specific changes
 */
async function rebuildAfterChanges(changedConfigIds, options = {}) {
  const { verbose = false } = options;

  console.log('\n🎯 REBUILDING AFFECTED HIERARCHY');
  console.log('=' .repeat(60));
  console.log(`Changed configs: ${changedConfigIds.join(', ')}`);

  try {
    // Find all configs that need rebuilding based on changes
    const toRebuild = new Set();

    // For each changed config, find what needs to rebuild
    for (const configId of changedConfigIds) {
      // Find configs that depend on this one
      const { data: dependents, error } = await supabase
        .from('app_config')
        .select('id, type')
        .contains('deps', [configId]);

      if (!error && dependents) {
        for (const dep of dependents) {
          if (['fields', 'sort', 'filter', 'view', 'tab', 'page', 'space', 'workspace', 'app', 'user_config', 'menu_config', 'menu_section', 'menu_item', 'extension'].includes(dep.type)) {
            toRebuild.add(JSON.stringify({ id: dep.id, type: dep.type }));
          }
        }
      }
    }

    // Convert back to objects and sort by hierarchy level
    const configs = Array.from(toRebuild).map(str => JSON.parse(str));
    const typeOrder = { 'fields': 1, 'sort': 1, 'filter': 1, 'menu_item': 1, 'view': 1, 'extension': 1, 'tab': 2, 'page': 2, 'menu_section': 2, 'menu_config': 3, 'user_config': 4, 'space': 3, 'workspace': 4, 'app': 5 };
    configs.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

    console.log(`\nFound ${configs.length} configs to rebuild`);

    // Rebuild each config
    for (const config of configs) {
      if (verbose) console.log(`  Rebuilding ${config.type}: ${config.id}`);
      await rebuildConfig(config.id);
    }

    console.log('\n✅ Affected hierarchy rebuilt!');
    return { success: true, rebuilt: configs.length };

  } catch (error) {
    console.error('❌ Hierarchy rebuild failed:', error.message);
    return { success: false, error: error.message };
  }
}

// CLI interface
async function main() {
  const [,, command, ...args] = process.argv;

  switch (command) {
    case 'full':
      console.log('🔨 Rebuilding full hierarchy...');
      await rebuildFullHierarchy({ verbose: true });
      break;

    case 'after':
      if (args.length === 0) {
        console.log('Usage: node rebuild-hierarchy.cjs after <configId1> [configId2] ...');
        break;
      }
      await rebuildAfterChanges(args, { verbose: true });
      break;

    case 'test':
      console.log('🧪 Testing hierarchy rebuild...');
      await rebuildAfterChanges(['breed_field_account_id'], { verbose: true });
      break;

    default:
      console.log('Hierarchy Rebuild - Rebuilds nested structures');
      console.log('\nUsage:');
      console.log('  node rebuild-hierarchy.cjs full        - Rebuild entire hierarchy');
      console.log('  node rebuild-hierarchy.cjs after <ids> - Rebuild after specific changes');
      console.log('  node rebuild-hierarchy.cjs test        - Test with breed_field_account_id');
  }
}

// Export for use in other scripts
module.exports = {
  rebuildConfig,
  rebuildFullHierarchy,
  rebuildAfterChanges,
  configTypeMapping
};

// Run CLI if called directly
if (require.main === module) {
  main().catch(console.error).finally(() => process.exit(0));
}
