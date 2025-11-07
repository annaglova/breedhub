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
    // Use deep merge to preserve nested properties
    const newData = deepMerge(newSelfData, fieldsConfig.override_data || {});
    
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

    // DEBUG: Log what we're building
    if (sortConfigId === 'config_sort_1759737147242') {
      console.log(`[DEBUG] rebuildSortConfig ${sortConfigId}:`);
      console.log(`  sortStructure keys:`, Object.keys(sortStructure));
      if (sortStructure.breed_field_measurements) {
        console.log(`  breed_field_measurements.fieldType:`, sortStructure.breed_field_measurements.fieldType || 'MISSING');
      }
      console.log(`  override_data keys:`, Object.keys(sortConfig.override_data || {}));
    }

    // Update self_data with nested structure
    const newSelfData = sortStructure;
    // Use deep merge to preserve nested properties like fieldType
    const newData = deepMerge(newSelfData, sortConfig.override_data || {});

    // DEBUG: Log final data
    if (sortConfigId === 'config_sort_1759737147242') {
      console.log(`  newData keys:`, Object.keys(newData));
      if (newData.breed_field_measurements) {
        console.log(`  FINAL breed_field_measurements.fieldType:`, newData.breed_field_measurements.fieldType || 'MISSING');
      }
    }
    
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
    // Use deep merge to preserve nested properties like fieldType
    const newData = deepMerge(newSelfData, filterConfig.override_data || {});
    
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
 * Rebuild a menu_item config (leaf node in menu hierarchy)
 */
async function rebuildMenuItem(menuItemId) {
  try {
    // Menu items are leaf nodes - they have no children to rebuild from
    // Their data comes from deps (properties) only
    const { data: menuItem, error: fetchError } = await supabase
      .from('app_config')
      .select('*')
      .eq('id', menuItemId)
      .single();

    if (fetchError || !menuItem) return false;

    // Menu items don't have nested structures - just return success
    // Their self_data and override_data are already correct
    return true;
  } catch (error) {
    console.error(`Error rebuilding menu_item ${menuItemId}:`, error);
    return false;
  }
}

/**
 * Rebuild a menu_section config from its menu_items
 */
async function rebuildMenuSection(menuSectionId) {
  try {
    // Get the menu_section config
    const { data: menuSection, error: fetchError } = await supabase
      .from('app_config')
      .select('*')
      .eq('id', menuSectionId)
      .single();

    if (fetchError || !menuSection) return false;

    // Menu section depends on menu_items - get them from section's deps
    const menuItemIds = menuSection.deps || [];

    // Get all menu_items that this section depends on
    const { data: menuItems, error: itemsError } = await supabase
      .from('app_config')
      .select('id, data')
      .in('id', menuItemIds)
      .eq('type', 'menu_item');

    if (itemsError) return false;

    // Build menu section structure - items nested by their IDs
    const sectionStructure = {};

    if (menuItems && menuItems.length > 0) {
      const itemsData = {};
      for (const item of menuItems) {
        itemsData[item.id] = (item.data && Object.keys(item.data).length > 0)
          ? item.data
          : {};
      }
      if (Object.keys(itemsData).length > 0) {
        sectionStructure.items = itemsData;
      }
    }

    const newSelfData = sectionStructure;
    const newData = deepMerge(newSelfData, menuSection.override_data || {});

    // Update the menu_section
    const { error: updateError } = await supabase
      .from('app_config')
      .update({
        self_data: newSelfData,
        data: newData,
        updated_at: new Date().toISOString()
      })
      .eq('id', menuSectionId);

    return !updateError;
  } catch (error) {
    console.error(`Error rebuilding menu_section ${menuSectionId}:`, error);
    return false;
  }
}

/**
 * Rebuild a menu_config from its menu_sections and menu_items
 */
async function rebuildMenuConfig(menuConfigId) {
  try {
    // Get the menu_config
    const { data: menuConfig, error: fetchError } = await supabase
      .from('app_config')
      .select('*')
      .eq('id', menuConfigId)
      .single();

    if (fetchError || !menuConfig) return false;

    // Menu config depends on menu_sections and menu_items - get them from config's deps
    const dependentIds = menuConfig.deps || [];

    // Query each type separately
    const sections = [];
    const items = [];

    // Query menu_sections
    const { data: sectionsData } = await supabase
      .from('app_config')
      .select('id, data')
      .in('id', dependentIds)
      .eq('type', 'menu_section');
    if (sectionsData) sections.push(...sectionsData);

    // Query menu_items (direct children, not in sections)
    const { data: itemsData } = await supabase
      .from('app_config')
      .select('id, data')
      .in('id', dependentIds)
      .eq('type', 'menu_item');
    if (itemsData) items.push(...itemsData);

    // Build menu config structure
    const menuStructure = {};

    // Add sections nested by their IDs
    if (sections && sections.length > 0) {
      const sectionsData = {};
      for (const section of sections) {
        sectionsData[section.id] = (section.data && Object.keys(section.data).length > 0)
          ? section.data
          : {};
      }
      if (Object.keys(sectionsData).length > 0) {
        menuStructure.sections = sectionsData;
      }
    }

    // Add direct items nested by their IDs
    if (items && items.length > 0) {
      const itemsData = {};
      for (const item of items) {
        itemsData[item.id] = (item.data && Object.keys(item.data).length > 0)
          ? item.data
          : {};
      }
      if (Object.keys(itemsData).length > 0) {
        menuStructure.items = itemsData;
      }
    }

    const newSelfData = menuStructure;
    const newData = deepMerge(newSelfData, menuConfig.override_data || {});

    // Update the menu_config
    const { error: updateError } = await supabase
      .from('app_config')
      .update({
        self_data: newSelfData,
        data: newData,
        updated_at: new Date().toISOString()
      })
      .eq('id', menuConfigId);

    return !updateError;
  } catch (error) {
    console.error(`Error rebuilding menu_config ${menuConfigId}:`, error);
    return false;
  }
}

/**
 * Rebuild a user_config from its menu_configs and properties
 */
async function rebuildUserConfig(userConfigId) {
  try {
    // Get the user_config
    const { data: userConfig, error: fetchError } = await supabase
      .from('app_config')
      .select('*')
      .eq('id', userConfigId)
      .single();

    if (fetchError || !userConfig) return false;

    // User config depends on menu_configs and properties
    const dependentIds = userConfig.deps || [];

    // Query menu_configs and properties separately
    const menuConfigs = [];
    const properties = [];

    // Query menu_configs
    const { data: menuConfigsData } = await supabase
      .from('app_config')
      .select('id, data')
      .in('id', dependentIds)
      .eq('type', 'menu_config');
    if (menuConfigsData) menuConfigs.push(...menuConfigsData);

    // Query properties
    const { data: propertiesData } = await supabase
      .from('app_config')
      .select('id, data')
      .in('id', dependentIds)
      .eq('type', 'property');
    if (propertiesData) properties.push(...propertiesData);

    // Build user config structure
    const userConfigStructure = {};

    // Add menu_configs nested by their IDs
    if (menuConfigs && menuConfigs.length > 0) {
      const menusData = {};
      for (const menuConfig of menuConfigs) {
        menusData[menuConfig.id] = (menuConfig.data && Object.keys(menuConfig.data).length > 0)
          ? menuConfig.data
          : {};
      }
      if (Object.keys(menusData).length > 0) {
        userConfigStructure.menus = menusData;
      }
    }

    // Add properties directly to structure (not nested)
    for (const property of properties) {
      if (property.data && Object.keys(property.data).length > 0) {
        Object.assign(userConfigStructure, property.data);
      }
    }

    const newSelfData = userConfigStructure;
    const newData = deepMerge(newSelfData, userConfig.override_data || {});

    // Update the user_config
    const { error: updateError } = await supabase
      .from('app_config')
      .update({
        self_data: newSelfData,
        data: newData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userConfigId);

    return !updateError;
  } catch (error) {
    console.error(`Error rebuilding user_config ${userConfigId}:`, error);
    return false;
  }
}

/**
 * Rebuild a page config from its fields config and menu_config
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

    // Page depends on fields configs and menu_configs - get them from page's deps
    const dependentIds = pageConfig.deps || [];

    // Query each type separately to ensure fresh data
    const fieldsConfigs = [];
    const menuConfigs = [];

    // Query fields configs
    const { data: fieldsData } = await supabase
      .from('app_config')
      .select('id, data')
      .in('id', dependentIds)
      .eq('type', 'fields');
    if (fieldsData) fieldsConfigs.push(...fieldsData);

    // Query menu configs
    const { data: menusData } = await supabase
      .from('app_config')
      .select('id, data')
      .in('id', dependentIds)
      .eq('type', 'menu_config');
    if (menusData) menuConfigs.push(...menusData);

    // Build page structure
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

    // Add menu configs nested by their IDs
    if (menuConfigs && menuConfigs.length > 0) {
      const menusData = {};
      for (const menuConfig of menuConfigs) {
        menusData[menuConfig.id] = (menuConfig.data && Object.keys(menuConfig.data).length > 0)
          ? menuConfig.data
          : {};
      }
      if (Object.keys(menusData).length > 0) {
        pageStructure.menus = menusData;
      }
    }

    const newSelfData = pageStructure;
    // Use deep merge to preserve nested properties
    const newData = deepMerge(newSelfData, pageConfig.override_data || {});

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

    // IMPORTANT: Query each type separately to ensure we get LATEST data
    // This fixes issues with Supabase replication lag for sort/filter configs
    const pages = [];
    const views = [];
    const properties = [];
    const sorts = [];
    const filters = [];

    // Query pages
    const { data: pagesData } = await supabase
      .from('app_config')
      .select('id, data')
      .in('id', dependentIds)
      .eq('type', 'page');
    if (pagesData) pages.push(...pagesData.map(d => ({ ...d, type: 'page' })));

    // Query views
    const { data: viewsData } = await supabase
      .from('app_config')
      .select('id, data')
      .in('id', dependentIds)
      .eq('type', 'view');
    if (viewsData) views.push(...viewsData.map(d => ({ ...d, type: 'view' })));

    // Query properties
    const { data: propertiesData } = await supabase
      .from('app_config')
      .select('id, data')
      .in('id', dependentIds)
      .eq('type', 'property');
    if (propertiesData) properties.push(...propertiesData.map(d => ({ ...d, type: 'property' })));

    // Query sorts - separate query ensures fresh data
    const { data: sortsData } = await supabase
      .from('app_config')
      .select('id, data')
      .in('id', dependentIds)
      .eq('type', 'sort');
    if (sortsData) sorts.push(...sortsData.map(d => ({ ...d, type: 'sort' })));

    // Query filters - separate query ensures fresh data
    const { data: filtersData } = await supabase
      .from('app_config')
      .select('id, data')
      .in('id', dependentIds)
      .eq('type', 'filter');
    if (filtersData) filters.push(...filtersData.map(d => ({ ...d, type: 'filter' })));

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

    // Add sort configs - merge all sort config data into sort_fields
    if (sorts && sorts.length > 0) {
      console.log(`[DEBUG] Processing sorts for space: ${spaceId}`);
      console.log(`[DEBUG] Found ${sorts.length} sort configs:`, sorts.map(s => s.id));

      spaceStructure.sort_fields = {};
      for (const sort of sorts) {
        // DEBUG: Log what we're getting from DB
        console.log(`[DEBUG]   Sort config ${sort.id}:`);
        console.log(`[DEBUG]     Keys in data: ${Object.keys(sort.data || {}).join(', ')}`);
        if (sort.data && sort.data.breed_field_measurements) {
          console.log(`[DEBUG]     breed_field_measurements has fieldType: ${sort.data.breed_field_measurements.fieldType || 'MISSING'}`);
        }

        // Sort config's data already has fields as objects with field IDs as keys
        // Just merge it into sort_fields container
        if (sort.data && Object.keys(sort.data).length > 0) {
          Object.assign(spaceStructure.sort_fields, sort.data);
        }
      }
    }

    // Add filter configs - merge all filter config data into filter_fields
    if (filters && filters.length > 0) {
      spaceStructure.filter_fields = {};
      for (const filter of filters) {
        // Filter config's data already has fields as objects with field IDs as keys
        // Just merge it into filter_fields container
        if (filter.data && Object.keys(filter.data).length > 0) {
          Object.assign(spaceStructure.filter_fields, filter.data);
        }
      }
    }

    const newSelfData = spaceStructure;
    // Use deep merge to preserve nested properties
    const newData = deepMerge(newSelfData, spaceConfig.override_data || {});

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
    // Use deep merge to preserve nested properties
    const newData = deepMerge(newSelfData, workspaceConfig.override_data || {});

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

    // Sort workspaces by deps order (Supabase doesn't preserve .in() order)
    const workspaceIds = allDeps.filter(id => workspaces.some(w => w.id === id));
    const sortedWorkspaces = sortByDepsOrder(workspaces, workspaceIds);

    if (appId === 'config_app_1757849573544') {
      console.log(`[DEBUG] App ${appId}:`);
      console.log('  allDeps:', allDeps);
      console.log('  workspaceIds:', workspaceIds);
      console.log('  workspaces from DB:', workspaces.map(w => w.id));
      console.log('  sortedWorkspaces:', sortedWorkspaces.map(w => w.id));
    }

    // Add workspaces to 'workspaces' container
    if (sortedWorkspaces && sortedWorkspaces.length > 0) {
      const workspacesData = {};
      for (const workspace of sortedWorkspaces) {
        // Always include workspace in structure
        // If it has data, use it; otherwise use empty object
        workspacesData[workspace.id] = (workspace.data && Object.keys(workspace.data).length > 0)
          ? workspace.data
          : {};
      }
      if (Object.keys(workspacesData).length > 0) {
        appStructure.workspaces = workspacesData;
      }

      if (appId === 'config_app_1757849573544') {
        console.log('  workspacesData keys:', Object.keys(workspacesData));
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
    // Use deep merge to preserve nested properties
    const newData = deepMerge(newSelfData, appConfig.override_data || {});

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
      .in('type', ['fields', 'sort', 'filter', 'page', 'space', 'workspace', 'app', 'user_config', 'menu_config', 'menu_section', 'menu_item'])
      .order('type');
    
    if (error) throw error;
    
    // Group by type
    const grouped = {};
    for (const config of configs) {
      if (!grouped[config.type]) grouped[config.type] = [];
      grouped[config.type].push(config.id);
    }
    
    // Rebuild in TWO PASSES to ensure leaf configs are fully saved before parents read them
    // Pass 1: Leaf configs (fields/sort/filter/menu_item) - these don't depend on other configs
    // Pass 2: Parent configs (page/space/workspace/app/menu_section/menu_config/user_config) - these depend on leaf configs

    const pass1 = ['fields', 'sort', 'filter', 'menu_item'];
    const pass2 = ['page', 'menu_section', 'menu_config', 'user_config', 'space', 'workspace', 'app'];
    const rebuildFunctions = {
      'fields': rebuildFieldsConfig,
      'sort': rebuildSortConfig,
      'filter': rebuildFilterConfig,
      'menu_item': rebuildMenuItem,
      'menu_section': rebuildMenuSection,
      'menu_config': rebuildMenuConfig,
      'user_config': rebuildUserConfig,
      'page': rebuildPageConfig,
      'space': rebuildSpaceConfig,
      'workspace': rebuildWorkspaceConfig,
      'app': rebuildAppConfig
    };

    // PASS 1: Rebuild leaf configs
    console.log('\n🔄 PASS 1: Rebuilding leaf configs (fields/sort/filter/menu_item)...');
    for (const type of pass1) {
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

    // Wait for DB to flush changes (helps with Supabase replication lag)
    console.log('\n⏳ Waiting for database flush (3 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // DEBUG: Verify sort config data BEFORE Pass 2
    console.log('\n[DEBUG] Verifying sort config data before Pass 2...');
    const { data: sortVerify } = await supabase
      .from('app_config')
      .select('id, data')
      .eq('id', 'config_sort_1759737147242')
      .single();
    if (sortVerify?.data?.breed_field_measurements) {
      console.log('[DEBUG] config_sort_1759737147242.breed_field_measurements.fieldType:',
                  sortVerify.data.breed_field_measurements.fieldType || 'MISSING');
    }

    // PASS 2: Rebuild parent configs
    console.log('\n🔄 PASS 2: Rebuilding parent configs (page/menu_section/menu_config/user_config/space/workspace/app)...');
    for (const type of pass2) {
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
          if (['fields', 'sort', 'filter', 'page', 'space', 'workspace', 'app', 'user_config', 'menu_config', 'menu_section', 'menu_item'].includes(dep.type)) {
            toRebuild.add(JSON.stringify({ id: dep.id, type: dep.type }));
          }
        }
      }
    }
    
    // Convert back to objects and sort by hierarchy level
    const configs = Array.from(toRebuild).map(str => JSON.parse(str));
    const typeOrder = { 'fields': 1, 'sort': 1, 'filter': 1, 'menu_item': 1, 'page': 2, 'menu_section': 2, 'menu_config': 3, 'user_config': 4, 'space': 3, 'workspace': 4, 'app': 5 };
    configs.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
    
    console.log(`\nFound ${configs.length} configs to rebuild`);
    
    // Rebuild each config
    const rebuildFunctions = {
      'fields': rebuildFieldsConfig,
      'sort': rebuildSortConfig,
      'filter': rebuildFilterConfig,
      'menu_item': rebuildMenuItem,
      'menu_section': rebuildMenuSection,
      'menu_config': rebuildMenuConfig,
      'user_config': rebuildUserConfig,
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
  rebuildMenuItem,
  rebuildMenuSection,
  rebuildMenuConfig,
  rebuildUserConfig,
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