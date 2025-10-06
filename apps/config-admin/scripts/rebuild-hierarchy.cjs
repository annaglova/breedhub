/**
 * Rebuild Hierarchy - Properly rebuilds nested structures in hierarchy configs
 * 
 * When lower-level configs change, parent configs need to rebuild their nested structures:
 * fields → fields_config → page → space → workspace → app
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Rebuild a fields config from individual field configs
 */
async function rebuildFieldsConfig(fieldsConfigId) {
  try {
    // Get the fields config
    const { data: fieldsConfig, error: fetchError } = await supabase
      .from('app_config')
      .select('*')
      .eq('id', fieldsConfigId)
      .single();
    
    if (fetchError || !fieldsConfig) return false;
    
    // Get all fields that this config depends on
    const fieldIds = fieldsConfig.deps || [];
    if (fieldIds.length === 0) return false;
    
    // Fetch all dependent fields
    const { data: fields, error: fieldsError } = await supabase
      .from('app_config')
      .select('id, data')
      .in('id', fieldIds);
    
    if (fieldsError) return false;
    
    // Build nested structure
    const fieldsStructure = {};
    for (const field of fields) {
      fieldsStructure[field.id] = field.data || {};
    }
    
    // Update self_data with nested structure
    const newSelfData = fieldsStructure;
    const newData = { ...newSelfData, ...(fieldsConfig.override_data || {}) };
    
    // Update the fields config
    const { error: updateError } = await supabase
      .from('app_config')
      .update({
        self_data: newSelfData,
        data: newData,
        updated_at: new Date().toISOString()
      })
      .eq('id', fieldsConfigId);
    
    return !updateError;
  } catch (error) {
    console.error(`Error rebuilding fields config ${fieldsConfigId}:`, error);
    return false;
  }
}

/**
 * Rebuild a sort config from individual field configs
 */
async function rebuildSortConfig(sortConfigId) {
  try {
    // Get the sort config
    const { data: sortConfig, error: fetchError } = await supabase
      .from('app_config')
      .select('*')
      .eq('id', sortConfigId)
      .single();
    
    if (fetchError || !sortConfig) return false;
    
    // Get all fields that this config depends on
    const fieldIds = sortConfig.deps || [];
    if (fieldIds.length === 0) return false;
    
    // Fetch all dependent fields
    const { data: fields, error: fieldsError } = await supabase
      .from('app_config')
      .select('id, data')
      .in('id', fieldIds);
    
    if (fieldsError) return false;
    
    // Build nested structure - same as fields config
    const sortStructure = {};
    for (const field of fields) {
      sortStructure[field.id] = field.data || {};
    }
    
    // Update self_data with nested structure
    const newSelfData = sortStructure;
    const newData = { ...newSelfData, ...(sortConfig.override_data || {}) };
    
    // Update the sort config
    const { error: updateError } = await supabase
      .from('app_config')
      .update({
        self_data: newSelfData,
        data: newData,
        updated_at: new Date().toISOString()
      })
      .eq('id', sortConfigId);
    
    return !updateError;
  } catch (error) {
    console.error(`Error rebuilding sort config ${sortConfigId}:`, error);
    return false;
  }
}

/**
 * Rebuild a filter config from individual field configs
 */
async function rebuildFilterConfig(filterConfigId) {
  try {
    // Get the filter config
    const { data: filterConfig, error: fetchError } = await supabase
      .from('app_config')
      .select('*')
      .eq('id', filterConfigId)
      .single();
    
    if (fetchError || !filterConfig) return false;
    
    // Get all fields that this config depends on
    const fieldIds = filterConfig.deps || [];
    if (fieldIds.length === 0) return false;
    
    // Fetch all dependent fields
    const { data: fields, error: fieldsError } = await supabase
      .from('app_config')
      .select('id, data')
      .in('id', fieldIds);
    
    if (fieldsError) return false;
    
    // Build nested structure - same as fields config
    const filterStructure = {};
    for (const field of fields) {
      filterStructure[field.id] = field.data || {};
    }
    
    // Update self_data with nested structure
    const newSelfData = filterStructure;
    const newData = { ...newSelfData, ...(filterConfig.override_data || {}) };
    
    // Update the filter config
    const { error: updateError } = await supabase
      .from('app_config')
      .update({
        self_data: newSelfData,
        data: newData,
        updated_at: new Date().toISOString()
      })
      .eq('id', filterConfigId);
    
    return !updateError;
  } catch (error) {
    console.error(`Error rebuilding filter config ${filterConfigId}:`, error);
    return false;
  }
}

/**
 * Rebuild a page config from its fields config
 */
async function rebuildPageConfig(pageId) {
  try {
    // Get the page config
    const { data: pageConfig, error: fetchError } = await supabase
      .from('app_config')
      .select('*')
      .eq('id', pageId)
      .single();
    
    if (fetchError || !pageConfig) return false;
    
    // Page depends on fields configs - get them from page's deps
    const fieldConfigIds = pageConfig.deps || [];
    
    // Get all fields configs that this page depends on
    const { data: fieldsConfigs, error: fieldsError } = await supabase
      .from('app_config')
      .select('id, data')
      .in('id', fieldConfigIds)
      .eq('type', 'fields');
    
    if (fieldsError) return false;
    
    // Build page structure - ONLY fields from fields configs
    const pageStructure = {};
    
    // Add fields from fields configs (which already contain the actual field data)
    let hasFields = false;
    const fields = {};
    for (const fieldsConfig of fieldsConfigs || []) {
      if (fieldsConfig.data && typeof fieldsConfig.data === 'object' && Object.keys(fieldsConfig.data).length > 0) {
        // fieldsConfig.data already contains the fields structure
        Object.assign(fields, fieldsConfig.data);
        hasFields = true;
      }
    }
    
    // Only add fields property if we have actual fields
    if (hasFields) {
      pageStructure.fields = fields;
    }
    
    const newSelfData = pageStructure;
    const newData = { ...newSelfData, ...(pageConfig.override_data || {}) };
    
    // Update the page
    const { error: updateError } = await supabase
      .from('app_config')
      .update({
        self_data: newSelfData,
        data: newData,
        updated_at: new Date().toISOString()
      })
      .eq('id', pageId);
    
    return !updateError;
  } catch (error) {
    console.error(`Error rebuilding page ${pageId}:`, error);
    return false;
  }
}

/**
 * Rebuild a space config from its pages, views and properties
 */
async function rebuildSpaceConfig(spaceId) {
  try {
    // Get the space config
    const { data: spaceConfig, error: fetchError } = await supabase
      .from('app_config')
      .select('*')
      .eq('id', spaceId)
      .single();

    if (fetchError || !spaceConfig) return false;

    // Space depends on pages, views and properties - get them from space's deps
    const dependentIds = spaceConfig.deps || [];

    // Get all dependents (pages, views, properties, etc.) that this space depends on
    const { data: dependents, error: depsError } = await supabase
      .from('app_config')
      .select('id, type, data')
      .in('id', dependentIds);

    if (depsError) return false;

    const pages = dependents?.filter(d => d.type === 'page') || [];
    const views = dependents?.filter(d => d.type === 'view') || [];
    const properties = dependents?.filter(d => d.type === 'property') || [];
    const sorts = dependents?.filter(d => d.type === 'sort') || [];
    const filters = dependents?.filter(d => d.type === 'filter') || [];

    // Build space structure - include pages, views, properties, sorts, and filters
    const spaceStructure = {};

    // Add ALL pages - even empty ones should be included as {}
    if (pages && pages.length > 0) {
      const pagesData = {};
      for (const page of pages) {
        // Always include page in structure
        // If it has data, use it; otherwise use empty object
        pagesData[page.id] = (page.data && Object.keys(page.data).length > 0)
          ? page.data
          : {};
      }
      if (Object.keys(pagesData).length > 0) {
        spaceStructure.pages = pagesData;
      }
    }

    // Add ALL views - even empty ones should be included as {}
    if (views && views.length > 0) {
      const viewsData = {};
      for (const view of views) {
        // Always include view in structure
        // If it has data, use it; otherwise use empty object
        viewsData[view.id] = (view.data && Object.keys(view.data).length > 0)
          ? view.data
          : {};
      }
      if (Object.keys(viewsData).length > 0) {
        spaceStructure.views = viewsData;
      }
    }

    // Add properties directly to space structure (not nested under a 'properties' key)
    for (const property of properties) {
      if (property.data && Object.keys(property.data).length > 0) {
        // Properties go directly on the space structure
        Object.assign(spaceStructure, property.data);
      }
    }

    // Add sort configs
    if (sorts && sorts.length > 0) {
      const sortsData = {};
      for (const sort of sorts) {
        sortsData[sort.id] = (sort.data && Object.keys(sort.data).length > 0)
          ? sort.data
          : {};
      }
      if (Object.keys(sortsData).length > 0) {
        spaceStructure.sort = sortsData;
      }
    }

    // Add filter configs
    if (filters && filters.length > 0) {
      const filtersData = {};
      for (const filter of filters) {
        filtersData[filter.id] = (filter.data && Object.keys(filter.data).length > 0)
          ? filter.data
          : {};
      }
      if (Object.keys(filtersData).length > 0) {
        spaceStructure.filters = filtersData;
      }
    }

    const newSelfData = spaceStructure;
    const newData = { ...newSelfData, ...(spaceConfig.override_data || {}) };
    
    // Update the space
    const { error: updateError } = await supabase
      .from('app_config')
      .update({
        self_data: newSelfData,
        data: newData,
        updated_at: new Date().toISOString()
      })
      .eq('id', spaceId);
    
    return !updateError;
  } catch (error) {
    console.error(`Error rebuilding space ${spaceId}:`, error);
    return false;
  }
}

/**
 * Rebuild a workspace config from its spaces
 */
async function rebuildWorkspaceConfig(workspaceId) {
  try {
    // Get the workspace config
    const { data: workspaceConfig, error: fetchError } = await supabase
      .from('app_config')
      .select('*')
      .eq('id', workspaceId)
      .single();
    
    if (fetchError || !workspaceConfig) return false;
    
    // Workspace depends on spaces - get them from workspace's deps
    const spaceIds = workspaceConfig.deps || [];
    
    // Get all spaces that this workspace depends on
    const { data: spaces, error: spacesError } = await supabase
      .from('app_config')
      .select('id, data')
      .in('id', spaceIds);
    
    if (spacesError) return false;
    
    // Build workspace structure - ONLY spaces, no other fields
    const workspaceStructure = {};
    
    // Add ALL spaces - even empty ones should be included as {}
    if (spaces && spaces.length > 0) {
      const spacesData = {};
      for (const space of spaces) {
        // Always include space in structure
        // If it has data, use it; otherwise use empty object
        spacesData[space.id] = (space.data && Object.keys(space.data).length > 0) 
          ? space.data 
          : {};
      }
      if (Object.keys(spacesData).length > 0) {
        workspaceStructure.spaces = spacesData;
      }
    }
    
    const newSelfData = workspaceStructure;
    const newData = { ...newSelfData, ...(workspaceConfig.override_data || {}) };
    
    // Update the workspace
    const { error: updateError } = await supabase
      .from('app_config')
      .update({
        self_data: newSelfData,
        data: newData,
        updated_at: new Date().toISOString()
      })
      .eq('id', workspaceId);
    
    return !updateError;
  } catch (error) {
    console.error(`Error rebuilding workspace ${workspaceId}:`, error);
    return false;
  }
}

/**
 * Rebuild app config from its workspaces and user_config
 */
async function rebuildAppConfig(appId) {
  try {
    // Get the app config
    const { data: appConfig, error: fetchError } = await supabase
      .from('app_config')
      .select('*')
      .eq('id', appId)
      .single();

    if (fetchError || !appConfig) return false;

    // App depends on workspaces and user_config - get them from app's deps
    const allDeps = appConfig.deps || [];

    // Get all children with their types
    const { data: allChildren, error: childrenError } = await supabase
      .from('app_config')
      .select('id, type, data')
      .in('id', allDeps);

    if (childrenError) return false;

    // Build app structure
    const appStructure = {};

    // Separate by type
    const workspaces = allChildren.filter(c => c.type === 'workspace');
    const userConfigs = allChildren.filter(c => c.type === 'user_config');

    // Add workspaces to 'workspaces' container
    if (workspaces && workspaces.length > 0) {
      const workspacesData = {};
      for (const workspace of workspaces) {
        // Always include workspace in structure
        // If it has data, use it; otherwise use empty object
        workspacesData[workspace.id] = (workspace.data && Object.keys(workspace.data).length > 0)
          ? workspace.data
          : {};
      }
      if (Object.keys(workspacesData).length > 0) {
        appStructure.workspaces = workspacesData;
      }
    }

    // Add user_config directly to root (not in a container)
    // Each user_config is added with its id as key
    for (const userConfig of userConfigs) {
      appStructure[userConfig.id] = (userConfig.data && Object.keys(userConfig.data).length > 0)
        ? userConfig.data
        : {};
    }

    const newSelfData = appStructure;
    const newData = { ...newSelfData, ...(appConfig.override_data || {}) };

    // Update the app
    const { error: updateError } = await supabase
      .from('app_config')
      .update({
        self_data: newSelfData,
        data: newData,
        updated_at: new Date().toISOString()
      })
      .eq('id', appId);

    return !updateError;
  } catch (error) {
    console.error(`Error rebuilding app ${appId}:`, error);
    return false;
  }
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
      .in('type', ['fields', 'sort', 'filter', 'page', 'space', 'workspace', 'app'])
      .order('type');
    
    if (error) throw error;
    
    // Group by type
    const grouped = {};
    for (const config of configs) {
      if (!grouped[config.type]) grouped[config.type] = [];
      grouped[config.type].push(config.id);
    }
    
    // Rebuild in order: fields/sort/filter → page → space → workspace → app
    const order = ['fields', 'sort', 'filter', 'page', 'space', 'workspace', 'app'];
    const rebuildFunctions = {
      'fields': rebuildFieldsConfig,
      'sort': rebuildSortConfig,
      'filter': rebuildFilterConfig,
      'page': rebuildPageConfig,
      'space': rebuildSpaceConfig,
      'workspace': rebuildWorkspaceConfig,
      'app': rebuildAppConfig
    };
    
    for (const type of order) {
      const ids = grouped[type] || [];
      if (ids.length === 0) continue;
      
      console.log(`\n📦 Rebuilding ${ids.length} ${type} configs...`);
      
      let success = 0;
      for (const id of ids) {
        const rebuildFn = rebuildFunctions[type];
        if (rebuildFn) {
          const result = await rebuildFn(id);
          if (result) {
            success++;
            if (verbose) console.log(`  ✓ ${id}`);
          } else {
            if (verbose) console.log(`  ✗ ${id}`);
          }
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
          if (['fields', 'sort', 'filter', 'page', 'space', 'workspace', 'app'].includes(dep.type)) {
            toRebuild.add(JSON.stringify({ id: dep.id, type: dep.type }));
          }
        }
      }
    }
    
    // Convert back to objects and sort by hierarchy level
    const configs = Array.from(toRebuild).map(str => JSON.parse(str));
    const typeOrder = { 'fields': 1, 'sort': 1, 'filter': 1, 'page': 2, 'space': 3, 'workspace': 4, 'app': 5 };
    configs.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
    
    console.log(`\nFound ${configs.length} configs to rebuild`);
    
    // Rebuild each config
    const rebuildFunctions = {
      'fields': rebuildFieldsConfig,
      'sort': rebuildSortConfig,
      'filter': rebuildFilterConfig,
      'page': rebuildPageConfig,
      'space': rebuildSpaceConfig,
      'workspace': rebuildWorkspaceConfig,
      'app': rebuildAppConfig
    };
    
    for (const config of configs) {
      const rebuildFn = rebuildFunctions[config.type];
      if (rebuildFn) {
        if (verbose) console.log(`  Rebuilding ${config.type}: ${config.id}`);
        await rebuildFn(config.id);
      }
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
  rebuildFieldsConfig,
  rebuildSortConfig,
  rebuildFilterConfig,
  rebuildPageConfig,
  rebuildSpaceConfig,
  rebuildWorkspaceConfig,
  rebuildAppConfig,
  rebuildFullHierarchy,
  rebuildAfterChanges
};

// Run CLI if called directly
if (require.main === module) {
  main().catch(console.error).finally(() => process.exit(0));
}