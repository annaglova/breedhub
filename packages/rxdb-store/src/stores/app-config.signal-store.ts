import { signal, computed, batch, Signal } from '@preact/signals-react';
import type { RxDatabase, RxCollection, RxDocument } from 'rxdb';
import { getDatabase } from '../services/database.service';
import { supabase } from '../supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getAvailableChildTypes } from '../../../../apps/config-admin/src/types/config-types';

// Tree node interface for config tree
export interface TreeNode {
  id: string;
  name: string;
  configType: string;
  children: TreeNode[];
  data: any;
  deps?: string[];
}

// AppConfig type definition
export interface AppConfig {
  id: string;
  type: 'field' | 'entity' | 'mixin' | 'feature' | 'template' | 'ui_config' | 'property' | 'field_property' | 'entity_field';
  
  // Configuration data
  self_data: any;
  override_data: any;
  data: any; // Computed from merge
  
  // Dependencies
  deps: string[];
  
  // Metadata
  caption?: string;
  category?: string;
  tags?: string[];
  version: number;
  
  // Audit
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  deleted_at?: string;
  
  // RxDB fields (Note: _deleted maps to 'deleted' in Supabase)
  _deleted?: boolean;
  _rev?: string;
}

// Document type for RxDB
export type AppConfigDocument = RxDocument<AppConfig>;

// Collection type
export type AppConfigCollection = RxCollection<AppConfig>;

// Deep merge utility
function deepMerge(target: any, source: any): any {
  if (!source) return target;
  if (!target) return source;
  
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

// Hierarchical structure mappings
const childContainerMapping: Record<string, Record<string, string | null>> = {
  'app': {
    'workspace': 'workspaces',
    'user_config': 'user_config',
    'property': null  // goes to root
  },
  'workspace': {
    'space': 'spaces',
    'property': null
  },
  'space': {
    'view': 'views',
    'page': 'pages',
    'fields': 'fields',
    'sort': 'sort_fields',
    'filter': 'filter_fields',
    'extension': 'extensions',
    'property': null
  },
  'view': {
    'fields': 'fields',
    'extension': 'extensions',
    'block': 'blocks',
    'property': null
  },
  'fields': {
    'field': null,  // fields directly contain field configs
    'entity_field': null,  // and entity_field configs
    'property': null
  },
  'sort': {
    'field': null,  // sort configs directly contain field configs
    'entity_field': null,
    'property': null
  },
  'filter': {
    'field': null,  // filter configs directly contain field configs
    'entity_field': null,
    'property': null
  },
  'page': {
    'tab': 'tabs',
    'fields': 'fields',
    'menu_config': 'menus',
    'extension': 'extensions',
    'block': 'blocks',
    'property': null
  },
  'block': {
    'tab': 'tabs',
    'fields': 'fields',
    'sort': 'sort',
    'filter': 'filter',
    'property': null
  },
  'tab': {
    'fields': 'fields',
    'sort': 'sort_fields',
    'filter': 'filter_fields',
    'view': 'views',
    'property': null
  },
  'user_config': {
    'menu_config': 'menus',
    'property': null
  },
  'menu_config': {
    'menu_section': 'sections',
    'menu_item': 'items',
    'property': null
  },
  'menu_section': {
    'menu_item': 'items',
    'property': null
  },
  'extension': {
    'fields': 'fields',
    'sort': 'sort',
    'filter': 'filter',
    'property': null
  },
  'menu_item': {
    'property': null
  }
};

// Types that cannot have properties
const noPropertyTypes = ['fields', 'sort_fields', 'filter_fields'];

// High-level structure types
const highLevelTypes = ['app', 'workspace', 'space', 'view', 'page', 'block', 'tab', 'user_config', 'menu_config', 'menu_section', 'menu_item'];
const groupingTypes = ['fields', 'sort', 'filter']; // Grouping configs that don't merge deps data

class AppConfigStore {
  // Signals for reactive state
  configs = signal<Map<string, AppConfig>>(new Map());
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  syncEnabled = signal<boolean>(false);
  initialized = signal<boolean>(false);
  
  // Computed values
  configsList = computed(() => Array.from(this.configs.value.values()));
  totalCount = computed(() => this.configs.value.size);
  
  // Filtered lists by type
  fields = computed(() => 
    this.configsList.value.filter(c => c.type === 'field' && !c._deleted)
  );
  entities = computed(() => 
    this.configsList.value.filter(c => c.type === 'entity' && !c._deleted)
  );
  mixins = computed(() => 
    this.configsList.value.filter(c => c.type === 'mixin' && !c._deleted)
  );
  templates = computed(() => 
    this.configsList.value.filter(c => c.type === 'template' && !c._deleted)
  );
  
  // Categories
  categories = computed(() => {
    const cats = new Set<string>();
    this.configsList.value.forEach(c => {
      if (c.category && !c._deleted) cats.add(c.category);
    });
    return Array.from(cats).sort();
  });
  
  private dbSubscription: any = null;
  private realtimeChannel: RealtimeChannel | null = null;

  constructor() {
    // Using centralized Supabase client from supabase/client.ts
    console.log('[AppConfigStore] Constructor called - using centralized Supabase client');

    // Auto-initialize
    this.initializeStore();
  }
  
  async initializeStore(): Promise<void> {
    console.log('[AppConfigStore] Initializing...');
    this.loading.value = true;
    this.error.value = null;
    
    try {
      const db = await getDatabase();
      
      // Check if collection exists
      if (!db.app_config) {
        console.error('[AppConfigStore] Collection app_config not found');
        this.error.value = 'Collection app_config not found';
        return;
      }
      
      const collection = db.app_config as AppConfigCollection;
      
      // Load initial data
      console.log('[AppConfigStore] Loading initial data from RxDB...');
      const allConfigs = await collection.find().exec();
      console.log('[AppConfigStore] Found configs in RxDB:', allConfigs.length);
      
      const configsMap = new Map<string, AppConfig>();
      
      allConfigs.forEach((doc: AppConfigDocument) => {
        const configData = { ...doc.toJSON() } as AppConfig;
        // Compute merged data
        configData.data = this.computeMergedData(configData);
        configsMap.set(doc.id, configData);
      });
      
      this.configs.value = configsMap;
      console.log('[AppConfigStore] Loaded configs:', configsMap.size);
      
      // Subscribe to collection changes
      this.dbSubscription = collection.find().$.subscribe((docs: AppConfigDocument[]) => {
        const newConfigs = new Map<string, AppConfig>();
        docs.forEach((doc: AppConfigDocument) => {
          if (!doc._deleted) {
            const configData = { ...doc.toJSON() } as AppConfig;
            configData.data = this.computeMergedData(configData);
            newConfigs.set(doc.id, configData);
          }
        });
        
        this.configs.value = newConfigs;
      });
      
      // Enable Supabase sync if available
      if (supabase) {
        try {
          await this.enableSync();
          await this.setupRealtimeSubscription();
        } catch (syncError) {
          console.error('[AppConfigStore] Failed to enable sync:', syncError);
        }
      }
      
      
      // Mark as initialized
      this.initialized.value = true;
      console.log('[AppConfigStore] Store initialized with', this.configs.value.size, 'configs');
      
    } catch (error) {
      console.error('[AppConfigStore] Initialization error:', error);
      this.error.value = error instanceof Error ? error.message : 'Failed to initialize store';
    } finally {
      this.loading.value = false;
    }
  }
  
  // Compute merged data from deps + self_data + override_data
  private computeMergedData(config: AppConfig): any {
    
    let merged = {};
    
    // For high-level hierarchical structures and grouping configs, DON'T merge deps data
    // Their self_data already contains the proper nested structure
    if (highLevelTypes.includes(config.type) || groupingTypes.includes(config.type)) {
      // For high-level and grouping types, just merge self_data + override_data
      if (config.self_data) {
        merged = deepMerge(merged, config.self_data);
      }
      if (config.override_data) {
        merged = deepMerge(merged, config.override_data);
      }
    } else {
      // For other types (fields, properties), use old logic
      // 1. Merge data from dependencies
      if (config.deps && config.deps.length > 0) {
        for (const depId of config.deps) {
          const parent = this.configs.value.get(depId);
          if (parent && parent.data) {
            merged = deepMerge(merged, parent.data);
          }
        }
      }
      
      // 2. Apply self_data
      if (config.self_data) {
        merged = deepMerge(merged, config.self_data);
      }
      
      // 3. Apply override_data
      if (config.override_data) {
        merged = deepMerge(merged, config.override_data);
      }
    }
    
    return merged;
  }
  
  // Update all configs that depend on a given config
  private updateDependents(configId: string): void {
    const dependents = this.configsList.value.filter(c => 
      c.deps && c.deps.includes(configId)
    );
    
    for (const dependent of dependents) {
      dependent.data = this.computeMergedData(dependent);
      // Recursively update their dependents
      this.updateDependents(dependent.id);
    }
  }
  
  async enableSync(): Promise<void> {
    if (!supabase) {
      console.error('[AppConfigStore] Supabase client not initialized');
      throw new Error('Supabase client not initialized');
    }
    
    console.log('[AppConfigStore] Enabling Supabase sync...');
    console.log('[AppConfigStore] Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .or('deleted.eq.false,deleted.is.null');
      
      console.log('[AppConfigStore] Supabase query result:', { data, error });
      
      if (error) {
        console.error('[AppConfigStore] Supabase query error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.warn('[AppConfigStore] No data found in Supabase app_config table');
        this.syncEnabled.value = true;
        return;
      }
      
      if (data && data.length > 0) {
        console.log('[AppConfigStore] Fetched from Supabase:', data.length, 'records');
        console.log('[AppConfigStore] First record sample:', data[0]);
        
        const db = await getDatabase();
        const collection = db.app_config as AppConfigCollection;
        
        // Map Supabase data to RxDB format (deleted -> _deleted)
        const mappedData = data.map(item => {
          const { deleted, ...rest } = item;
          return {
            ...rest,
            // Ensure all required fields have values
            self_data: rest.self_data || {},
            override_data: rest.override_data || {},
            data: rest.data || {},
            deps: rest.deps || [],
            version: rest.version || 1,
            created_at: rest.created_at || new Date().toISOString(),
            updated_at: rest.updated_at || new Date().toISOString(),
            _deleted: deleted || false
          };
        });
        
        // Bulk upsert into RxDB
        console.log('[AppConfigStore] Attempting to bulkUpsert:', mappedData.length, 'records');
        console.log('[AppConfigStore] First mapped record:', mappedData[0]);
        
        const result = await collection.bulkUpsert(mappedData);
        console.log('[AppConfigStore] BulkUpsert result:', {
          success: result.success.length,
          errors: result.error.length
        });
        
        if (result.error.length > 0) {
          console.error('[AppConfigStore] BulkUpsert errors:', result.error.length, 'documents failed');
          
          // Group errors by type
          const errorGroups = new Map<string, any[]>();
          
          result.error.forEach(err => {
            if (err.validationErrors && err.validationErrors.length > 0) {
              err.validationErrors.forEach(valErr => {
                const key = `${valErr.instancePath || valErr.dataPath}_${valErr.message}`;
                if (!errorGroups.has(key)) {
                  errorGroups.set(key, []);
                }
                errorGroups.get(key)!.push({
                  id: err.documentId,
                  field: valErr.instancePath || valErr.dataPath,
                  message: valErr.message,
                  value: err.writeRow?.document?.[valErr.instancePath?.replace('/', '') || '']
                });
              });
            }
          });
          
          // Log grouped errors
          errorGroups.forEach((errors, key) => {
            console.error(`[AppConfigStore] Validation issue (${errors.length} docs):`, {
              field: errors[0].field,
              message: errors[0].message,
              sampleIds: errors.slice(0, 3).map(e => e.id),
              sampleValue: errors[0].value
            });
          });
        }
        
        console.log('[AppConfigStore] Synced successfully, upserted:', result.success.length);
        
        // Force update the signal
        const afterSync = await collection.find().exec();
        const newConfigsMap = new Map<string, AppConfig>();
        afterSync.forEach((doc: AppConfigDocument) => {
          if (!doc._deleted) {
            const configData = { ...doc.toJSON() } as AppConfig;
            configData.data = this.computeMergedData(configData);
            newConfigsMap.set(doc.id, configData);
          }
        });
        this.configs.value = newConfigsMap;
      }
      
      this.syncEnabled.value = true;
      
    } catch (error) {
      console.error('[AppConfigStore] Failed to enable sync:', error);
      throw error;
    }
  }
  
  async createConfig(config: Omit<AppConfig, 'created_at' | 'updated_at' | 'data'>): Promise<AppConfig> {
    console.log('[AppConfigStore] Creating config:', config);
    
    try {
      this.loading.value = true;
      this.error.value = null;
      
      const db = await getDatabase();
      
      const newConfig: AppConfig = {
        ...config,
        data: {}, // Will be computed
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _deleted: false
      };
      
      // Compute merged data
      newConfig.data = this.computeMergedData(newConfig);
      
      // Insert into RxDB
      await db.app_config.insert(newConfig);
      console.log('[AppConfigStore] Config created successfully:', newConfig.id);
      
      // Update signal immediately
      const newConfigs = new Map(this.configs.value);
      newConfigs.set(newConfig.id, newConfig);
      this.configs.value = newConfigs;
      
      // Sync to Supabase if enabled
      if (this.syncEnabled.value && supabase) {
        // Map _deleted to deleted for Supabase
        const { _deleted, _rev, ...rest } = newConfig;
        const supabaseData = {
          ...rest,
          deleted: _deleted || false
        };
        try {
          const { error } = await supabase
            .from('app_config')
            .insert(supabaseData);
          
          if (error) {
            console.error('[AppConfigStore] Supabase insert error:', error);
          }
        } catch (syncError) {
          console.error('[AppConfigStore] Supabase sync error:', syncError);
        }
      }
      
      // Update any configs that depend on this one
      this.updateDependents(newConfig.id);
      
      return newConfig;
      
    } catch (error) {
      console.error('[AppConfigStore] Create config error:', error);
      this.error.value = error instanceof Error ? error.message : 'Failed to create config';
      throw error;
    } finally {
      this.loading.value = false;
    }
  }
  
  async updateConfig(id: string, updates: Partial<AppConfig>): Promise<void> {
    console.log('[AppConfigStore] Updating config:', id, updates);
    
    // Allow override_data for all config types including grouping configs
    const existingConfig = this.configs.value.get(id);
    
    try {
      this.loading.value = true;
      this.error.value = null;
      
      const db = await getDatabase();
      const doc = await db.app_config.findOne(id).exec();
      
      if (!doc) {
        throw new Error(`Config ${id} not found`);
      }
      
      const updatedData = {
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      // Recompute data if dependencies or data fields changed
      if (updates.deps || updates.self_data || updates.override_data) {
        const configData = { ...doc.toJSON(), ...updatedData } as AppConfig;
        updatedData.data = this.computeMergedData(configData);
        
        // Debug logging for user_config
        if (configData.type === 'user_config') {
          console.log('[updateConfig] Computing data for user_config:');
          console.log('  self_data:', JSON.stringify(configData.self_data, null, 2));
          console.log('  override_data:', JSON.stringify(configData.override_data, null, 2));
          console.log('  computed data:', JSON.stringify(updatedData.data, null, 2));
        }
        
        // Debug: log what we're about to patch
        if (configData.type === 'app') {
          console.log('[updateConfig] About to patch app with:');
          console.log('  self_data:', JSON.stringify(updatedData.self_data, null, 2));
          console.log('  computed data:', JSON.stringify(updatedData.data, null, 2));
        }
      }
      
      await doc.patch(updatedData);
      
      // Update signal immediately
      const updatedDoc = await db.app_config.findOne(id).exec();
      if (updatedDoc) {
        const newConfigs = new Map(this.configs.value);
        const configData = { ...updatedDoc.toJSON() } as AppConfig;
        
        // Debug: log what we got from RxDB after update
        if (configData.type === 'app') {
          console.log('[updateConfig] After patch, app from RxDB:');
          console.log('  self_data:', JSON.stringify(configData.self_data, null, 2));
          console.log('  data from DB:', JSON.stringify(configData.data, null, 2));
        }
        
        configData.data = this.computeMergedData(configData);
        newConfigs.set(id, configData);
        this.configs.value = newConfigs;
        
        // Update dependents only for non-hierarchical and non-grouping types
        // Hierarchical and grouping types use cascadeUpdateUp instead
        if (!highLevelTypes.includes(configData.type) && !groupingTypes.includes(configData.type)) {
          this.updateDependents(id);
        }
      }
      
      // Sync to Supabase if enabled
      if (this.syncEnabled.value && supabase) {
        // Map _deleted to deleted for Supabase
        const { _deleted, _rev, ...rest } = updatedData;
        const supabaseUpdates = {
          ...rest,
          deleted: _deleted || false
        };
        try {
          await supabase
            .from('app_config')
            .update(supabaseUpdates)
            .eq('id', id);
        } catch (syncError) {
          console.error('[AppConfigStore] Supabase sync error:', syncError);
        }
      }
      
    } catch (error) {
      console.error('[AppConfigStore] Update config error:', error);
      this.error.value = error instanceof Error ? error.message : 'Failed to update config';
      throw error;
    } finally {
      this.loading.value = false;
    }
  }
  
  async deleteConfig(id: string): Promise<void> {
    const config = this.configs.value.get(id);
    console.log(`[deleteConfig] Deleting config: ${id} (type: ${config?.type || 'unknown'})`);
    
    // Protect system properties from deletion
    if (config?.type === 'property' && config?.category === 'system') {
      console.warn(`[deleteConfig] Cannot delete system property: ${id}`);
      throw new Error(`System property "${id}" cannot be deleted`);
    }
    
    try {
      this.loading.value = true;
      this.error.value = null;
      
      const db = await getDatabase();
      const doc = await db.app_config.findOne(id).exec();
      
      if (!doc) {
        throw new Error(`Config ${id} not found`);
      }
      
      // Soft delete - only RxDB fields, not Supabase 'deleted' field
      await doc.patch({
        _deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      console.log(`[deleteConfig] Successfully soft-deleted: ${id}`);
      
      // Remove from signal
      const newConfigs = new Map(this.configs.value);
      newConfigs.delete(id);
      this.configs.value = newConfigs;
      
      // Sync to Supabase if enabled
      if (this.syncEnabled.value && supabase) {
        try {
          await supabase
            .from('app_config')
            .update({ 
              deleted: true, 
              deleted_at: new Date().toISOString() 
            })
            .eq('id', id);
        } catch (syncError) {
          console.error('[AppConfigStore] Supabase sync error:', syncError);
        }
      }
      
    } catch (error) {
      console.error('[AppConfigStore] Delete config error:', error);
      this.error.value = error instanceof Error ? error.message : 'Failed to delete config';
      throw error;
    } finally {
      this.loading.value = false;
    }
  }
  
  // ============= TEMPLATE OPERATIONS =============
  
  // Build tree structure from templates
  buildTemplateTree(templates: AppConfig[]): any[] {
    const nodeMap = new Map<string, any>();
    const roots: any[] = [];
    
    // Create nodes
    templates.forEach((template) => {
      const node = {
        id: template.id,
        name: template.caption || template.id.replace('template_', '').replace(/_/g, ' '),
        templateType: template.type,
        children: [],
        data: template.self_data || {},
      };
      nodeMap.set(template.id, node);
      roots.push(node); // Initially all are roots
    });
    
    // Build parent-child relationships from deps
    templates.forEach((template) => {
      const parentNode = nodeMap.get(template.id);
      if (!parentNode) return;
      
      // If this template has deps, those are its children
      if (template.deps && template.deps.length > 0) {
        template.deps.forEach((childId) => {
          const childNode = nodeMap.get(childId);
          if (childNode) {
            parentNode.children.push(childNode);
            // Remove child from roots since it has a parent
            const rootIndex = roots.indexOf(childNode);
            if (rootIndex > -1) {
              roots.splice(rootIndex, 1);
            }
          }
        });
      }
    });
    
    return roots;
  }
  
  // Recalculate template data based on deps hierarchy
  recalculateTemplateData(templates: AppConfig[]): AppConfig[] {
    // For high-level structures, the self_data is already correctly maintained
    // through rebuildParentSelfData and cascading updates.
    // We should NOT recalculate self_data here as it would corrupt the hierarchical structure.
    // Just ensure that data = self_data + override_data
    return templates.map(template => ({
      ...template,
      data: {
        ...(template.self_data || {}),
        ...(template.override_data || {})
      }
    }));
  }
  
  /**
   * Get available templates for a given parent type
   */
  getAvailableTemplatesForParent(parentType: string | null): AppConfig[] {
    const allConfigs = this.configsList.value || [];
    const templates = allConfigs.filter(
      (c) => c.tags?.includes("template") && !c._deleted
    );

    if (!parentType) {
      return templates.filter((t) => t.type === "app");
    }

    const childTypes: { [key: string]: string[] } = {
      app: ["workspace"],
      workspace: ["space"],
      space: ["view", "page", "sort", "filter"],
      view: ["fields"],
      page: ["fields", "tab"],
      tab: ["fields"],
    };

    const allowedTypes = childTypes[parentType] || [];
    return templates.filter((t) => allowedTypes.includes(t.type));
  }

  async createTemplate(type: string, parentId: string | null = null): Promise<AppConfig> {
    // Check if this config type can be added to parent
    if (parentId && !this.canAddConfigType(parentId, type)) {
      throw new Error(`Cannot add ${type} template - it already exists in parent`);
    }
    
    const timestamp = Date.now();
    const newId = `template_${type}_${timestamp}`;
    
    const templateTypes: any = {
      app: 'App',
      workspace: 'Workspace',
      space: 'Space',
      view: 'View',
      page: 'Page',
      tab: 'Tab',
      sort: 'Sort Config',
      fields: 'Fields Config',
      sort_fields: 'Sort Fields',
      filter_fields: 'Filter Fields',
      user_config: 'User Config',
      menu_config: 'Menu Config',
      menu_section: 'Menu Section',
      menu_item: 'Menu Item'
    };
    
    const newTemplate = {
      id: newId,
      type: type as AppConfig['type'],
      tags: ['template'],
      self_data: {},  // Always start with empty self_data
      override_data: {},
      deps: [],
      caption: `New ${templateTypes[type] || type}`,
      version: 1
    };
    
    // Create the template
    const created = await this.createConfig(newTemplate);

    // If there's a parent, add child to parent using universal method
    if (parentId) {
      await this.addChildToParent(parentId, newId);
    }

    return created;
  }
  
  async deleteTemplateWithChildren(templateId: string): Promise<void> {
    // First find parent and remove from its self_data
    const parents = Array.from(this.configs.value.values()).filter(
      config => config.deps?.includes(templateId)
    );
    
    for (const parent of parents) {
      await this.removeChildFromParent(parent.id, templateId);
    }
    
    // Then delete the template and its children
    const result = await this.deleteWithDependencies(templateId, { deleteChildren: true });
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete template');
    }
  }
  
  async cloneTemplate(templateId: string): Promise<AppConfig> {
    const template = this.configs.value.get(templateId);
    if (!template) throw new Error(`Template ${templateId} not found`);
    
    // Helper function to recursively clone template and its children
    const cloneRecursive = async (originalId: string, parentCloneId: string | null = null): Promise<AppConfig> => {
      const original = this.configs.value.get(originalId);
      if (!original) throw new Error(`Template ${originalId} not found`);
      
      const timestamp = Date.now();
      const cloneId = parentCloneId ? 
        `${original.id}_copy_${timestamp}` : 
        `${original.id}_copy_${timestamp}`;
      
      // Create the clone without children initially
      const cloned = await this.createConfig({
        ...original,
        id: cloneId,
        caption: parentCloneId ? original.caption : `${original.caption || original.id} (copy)`,
        deps: [], // Will be populated with cloned children
        _deleted: false,
        _rev: undefined
      });
      
      // Clone all children recursively
      if (original.deps && original.deps.length > 0) {
        const clonedChildIds: string[] = [];
        
        for (const childId of original.deps) {
          const child = this.configs.value.get(childId);
          
          // Only clone configs that are part of the template structure
          // Skip field references as they are shared
          if (child && child.type !== 'field') {
            const clonedChild = await cloneRecursive(childId, cloneId);
            clonedChildIds.push(clonedChild.id);
          } else if (child && child.type === 'field') {
            // Keep field references as is
            clonedChildIds.push(childId);
          }
        }
        
        // Update clone with children
        if (clonedChildIds.length > 0) {
          await this.updateConfig(cloneId, { deps: clonedChildIds });
          
          // Rebuild self_data for high-level structures
          if (this.isHighLevelType(cloned.type)) {
            await this.rebuildParentSelfData(cloneId);
          }
        }
      }
      
      return cloned;
    };
    
    // Clone the template and all its children
    const clonedTemplate = await cloneRecursive(templateId);
    
    // Find parent template (template that has the original templateId in its deps)
    const allConfigs = Array.from(this.configs.value.values());
    const parent = allConfigs.find(config => 
      config.tags?.includes('template') && 
      config.deps?.includes(templateId)
    );
    
    // If parent exists, add the cloned template to parent's deps and rebuild
    if (parent) {
      const updatedDeps = [...(parent.deps || []), clonedTemplate.id];
      await this.updateConfig(parent.id, { deps: updatedDeps });
      
      // Rebuild parent's self_data
      if (this.isHighLevelType(parent.type)) {
        await this.rebuildParentSelfData(parent.id);
        await this.cascadeUpdateUp(parent.id);
      }
    }
    
    return clonedTemplate;
  }
  
  // Unified update method for both templates and configs
  async updateConfigWithCascade(configId: string, updates: {
    caption?: string;
    version?: number;
    override_data?: any;
    self_data?: any;
  }): Promise<void> {
    const config = this.configs.value.get(configId);
    if (!config) throw new Error(`Config ${configId} not found`);
    
    console.log('[updateConfigWithCascade] Updating:', configId, 'with:', updates);
    
    // Update the config
    await this.updateConfig(configId, updates);
    
    // If this is a high-level structure or grouping type, cascade updates up the tree
    if (highLevelTypes.includes(config.type) || groupingTypes.includes(config.type) || config.type === 'property') {
      await this.cascadeUpdateUp(configId);
    } else {
      // For other types, use old cascade logic
      await this.cascadeUpdate(configId);
    }
  }

  // Alias for backward compatibility
  async updateTemplate(templateId: string, updates: any): Promise<void> {
    return this.updateConfigWithCascade(templateId, updates);
  }
  
  // Create working config from template (recursive)
  async createConfigFromTemplate(templateId: string, parentId: string | null = null): Promise<AppConfig> {
    const template = this.configs.value.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Generate unique ID for working config
    const timestamp = Date.now();
    const configId = template.id.replace('template_', 'config_').replace(/_\d+$/, `_${timestamp}`);
    
    // First, create the main config (initially with empty deps)
    const newConfig: Omit<AppConfig, 'created_at' | 'updated_at' | 'data'> = {
      id: configId,
      type: template.type,
      self_data: {}, // Start with empty self_data, will be rebuilt from children
      override_data: { ...template.override_data },
      deps: [], // Will be filled with child config IDs
      tags: [], // No template tag for working config
      caption: template.caption,
      version: template.version || 1,
      _deleted: false
    };

    const created = await this.createConfig(newConfig);

    // Recursively create child configs from template children
    if (template.deps && template.deps.length > 0) {
      const childConfigIds: string[] = [];
      
      for (const childTemplateId of template.deps) {
        // Check if this is actually a template child (not a property or field)
        const childTemplate = this.configs.value.get(childTemplateId);
        
        // For templates, deps contain child template IDs directly
        // We should check if the child is also a high-level type, not just if it has template tag
        if (childTemplate && (childTemplate.tags?.includes('template') || this.isHighLevelType(childTemplate.type))) {
          // Recursively create config from child template
          const childConfig = await this.createConfigFromTemplate(childTemplateId, configId);
          childConfigIds.push(childConfig.id);
        }
      }
      
      // Update the created config's deps with the new child config IDs
      if (childConfigIds.length > 0) {
        await this.updateConfig(configId, { deps: childConfigIds });
        
        // Rebuild self_data from children for high-level structures
        if (this.isHighLevelType(created.type)) {
          await this.rebuildParentSelfData(configId);
        }
      }
    }

    // If has parent, add child to parent using universal method
    if (parentId) {
      await this.addChildToParent(parentId, configId);
    }

    return created;
  }

  // Check if a config type can be added to parent (for singleton configs)
  canAddConfigType(parentId: string, configType: string): boolean {
    const parent = this.configs.value.get(parentId);
    if (!parent) return false;
    
    // Check if this is a singleton config type (fields, sort, filter)
    const singletonTypes = ['fields', 'sort', 'filter'];
    if (!singletonTypes.includes(configType)) {
      // Non-singleton types can always be added
      return true;
    }
    
    // Check if parent already has this config type in deps
    if (parent.deps && parent.deps.length > 0) {
      for (const depId of parent.deps) {
        const dep = this.configs.value.get(depId);
        if (dep && dep.type === configType) {
          // This config type already exists
          return false;
        }
      }
    }
    
    return true;
  }
  
  // Get already added singleton config types for a parent
  getExistingSingletonTypes(parentId: string): string[] {
    const parent = this.configs.value.get(parentId);
    if (!parent || !parent.deps) return [];
    
    const singletonTypes = ['fields', 'sort', 'filter'];
    const existingTypes: string[] = [];
    
    for (const depId of parent.deps) {
      const dep = this.configs.value.get(depId);
      if (dep && singletonTypes.includes(dep.type)) {
        existingTypes.push(dep.type);
      }
    }
    
    return existingTypes;
  }
  
  // Get available child types that can be added to a parent
  getAvailableChildTypesForParent(parentId: string | null, parentType: string): string[] {
    // Get all possible child types for this parent type
    const allChildTypes = this.getChildTypesForParentType(parentType);
    
    if (!parentId) {
      // No parent, return all possible types
      return allChildTypes;
    }
    
    // Filter out singleton types that already exist
    return allChildTypes.filter(type => this.canAddConfigType(parentId, type));
  }
  
  // Get child types for a parent type (from config mapping)
  getChildTypesForParentType(parentType: string): string[] {
    // Import childTypeMapping or define it here
    const childTypeMapping: Record<string, string[]> = {
      app: ["workspace", "user_config"],
      workspace: ["space"],
      space: ["view", "page", "fields", "extension"],
      view: ["fields", "sort", "filter", "extension", "block"],
      page: ["fields", "tab", "menu_config", "extension", "block"],
      block: ["tab", "fields", "sort", "filter"],
      tab: ["fields", "sort", "filter", "view"],
      extension: ["fields", "sort", "filter"],
      user_config: ["menu_config"],
      menu_config: ["menu_section", "menu_item"],
      menu_section: ["menu_item"],
      menu_item: [],
    };

    return childTypeMapping[parentType] || [];
  }

  // Create working config (without template)
  async createWorkingConfig(type: string, parentId: string | null = null): Promise<AppConfig> {
    // Check if this config type can be added to parent
    if (parentId && !this.canAddConfigType(parentId, type)) {
      throw new Error(`Cannot add ${type} config - it already exists in parent`);
    }
    
    const timestamp = Date.now();
    const configId = `config_${type}_${timestamp}`;
    
    // For high-level types, always start with empty self_data
    // It will be built from children automatically
    const newConfig: Omit<AppConfig, 'created_at' | 'updated_at' | 'data'> = {
      id: configId,
      type,
      self_data: {}, // Always empty for high-level configs
      override_data: {},
      deps: [],
      tags: [],
      caption: `${type.charAt(0).toUpperCase() + type.slice(1)} ${timestamp}`,
      version: 1,
      _deleted: false
    };

    const created = await this.createConfig(newConfig);

    // If has parent, add child to parent using universal method
    if (parentId) {
      await this.addChildToParent(parentId, configId);
    }

    return created;
  }

  // Universal method to add child to parent's deps and rebuild hierarchy
  async addChildToParent(parentId: string, childId: string): Promise<void> {
    const parent = this.configs.value.get(parentId);
    if (!parent) {
      throw new Error(`Parent config ${parentId} not found`);
    }

    // Add child to parent's deps if not already present
    const currentDeps = parent.deps || [];
    if (!currentDeps.includes(childId)) {
      await this.updateConfig(parentId, {
        deps: [...currentDeps, childId]
      });
    }

    // Rebuild parent's self_data from all deps (uses childContainerMapping)
    if (this.isHighLevelType(parent.type)) {
      await this.rebuildParentSelfData(parentId);

      // Cascade update further up the tree
      await this.cascadeUpdateUp(parentId);
    }
  }

  // Check if type is a high-level structure type
  isHighLevelType(type: string): boolean {
    return ['app', 'workspace', 'space', 'view', 'page', 'block', 'tab', 'sort', 'filter', 'fields', 'extension',
            'user_config', 'menu_config', 'menu_section', 'menu_item'].includes(type);
  }
  
  // Check if type is a grouping config (cannot have override_data)
  isGroupingConfigType(type: string): boolean {
    return ['fields', 'sort', 'filter'].includes(type);
  }

  // Delete config with its children and update parents
  async deleteConfigWithChildren(configId: string): Promise<void> {
    // First find parent and remove from its self_data
    const parents = Array.from(this.configs.value.values()).filter(
      config => config.deps?.includes(configId)
    );
    
    for (const parent of parents) {
      await this.removeChildFromParent(parent.id, configId);
    }
    
    // Then delete the config and its children
    const result = await this.deleteWithDependencies(configId, { deleteChildren: true });
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete config');
    }
  }

  // Alias for backward compatibility with old name
  async updateConfigAndCascade(configId: string, updates: any): Promise<void> {
    return this.updateConfigWithCascade(configId, updates);
  }

  // ============= PROPERTY OPERATIONS =============
  
  async createProperty(id: string, data: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate property ID
      if (!id.startsWith('property_')) {
        return { success: false, error: 'Property ID must start with "property_"' };
      }
      
      // Check if already exists
      if (this.configs.value.has(id)) {
        return { success: false, error: 'Property with this ID already exists' };
      }
      
      await this.createConfig({
        id,
        type: 'property',
        self_data: {},  // Properties have no dependencies
        override_data: data,  // Property data goes to override_data
        deps: [],
        category: 'custom',  // Default category for new properties
        tags: ['property'],
        version: 1
      });
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create property' 
      };
    }
  }
  
  async updateProperty(id: string, data: any): Promise<{ success: boolean; error?: string }> {
    try {
      const property = this.configs.value.get(id);
      if (!property || property.type !== 'property') {
        return { success: false, error: 'Property not found' };
      }
      
      await this.updateConfig(id, { override_data: data });
      
      // Cascade update all configs that depend on this property
      await this.cascadeUpdate(id);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update property' 
      };
    }
  }
  
  async deleteProperty(id: string): Promise<{ success: boolean; error?: string }> {
    // Use base deleteWithDependencies method
    return this.deleteWithDependencies(id);
  }

  // New method to create property with tags
  async createPropertyWithTags(
    id: string, 
    data: any,
    tags: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate property ID
      if (!id.startsWith('property_')) {
        return { success: false, error: 'Property ID must start with "property_"' };
      }
      
      // Check if already exists
      if (this.configs.value.has(id)) {
        return { success: false, error: 'Property with this ID already exists' };
      }
      
      // Ensure tags is always an array
      const tagsArray = Array.isArray(tags) ? tags : [];
      
      await this.createConfig({
        id,
        type: 'property',
        self_data: {},  // Properties have no dependencies
        override_data: data,  // Property data goes to override_data
        deps: [],
        category: 'custom',  // Default category for new properties
        tags: tagsArray,  // Allow empty tags array - means property can be applied anywhere
        version: 1
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('[createPropertyWithTags] Error:', error);
      return { success: false, error: error.message || 'Failed to create property' };
    }
  }

  // New method to update property with ID change and tags
  async updatePropertyWithIdChangeAndTags(
    oldId: string, 
    newId: string, 
    selfData: any,
    tags: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate new ID format
      if (!newId.startsWith('property_')) {
        return { success: false, error: 'Property ID must start with "property_"' };
      }
      
      // Get the existing property
      const existingProperty = this.configs.value.get(oldId);
      if (!existingProperty) {
        return { success: false, error: 'Property not found' };
      }
      
      // If ID hasn't changed, just update the data and tags
      if (oldId === newId) {
        // Ensure tags is always an array
        const tagsArray = Array.isArray(tags) ? tags : [];
        const existingTags = Array.isArray(existingProperty.tags) ? existingProperty.tags : [];
        
        const updates: Partial<AppConfig> = {
          override_data: selfData,
          data: selfData,
          tags: tagsArray  // Allow empty tags array - user explicitly wants to clear tags
        };
        await this.updateConfigWithCascade(oldId, updates);
        return { success: true };
      }
      
      // Check if new ID already exists
      if (this.configs.value.has(newId)) {
        return { success: false, error: 'Property with this ID already exists' };
      }
      
      // Find all configs that depend on the old property
      const dependents = this.configsList.value.filter(c => 
        c.deps && c.deps.includes(oldId)
      );
      
      // Create the new property with updated data and tags
      await this.createConfig({
        ...existingProperty,
        id: newId,
        override_data: selfData,
        data: selfData,
        tags: tags,  // Use the new tags array as provided (can be empty)
        version: (existingProperty.version || 0) + 1
      });
      
      // Update all dependent configs
      for (const dependent of dependents) {
        const newDeps = dependent.deps!.map(dep => dep === oldId ? newId : dep);
        await this.updateConfigWithCascade(dependent.id, { deps: newDeps });
      }
      
      // Delete the old property
      await this.deleteConfig(oldId);
      
      return { success: true };
    } catch (error: any) {
      console.error('[updatePropertyWithIdChangeAndTags] Error:', error);
      return { success: false, error: error.message || 'Failed to update property' };
    }
  }
  
  async updatePropertyWithIdChange(
    oldId: string, 
    newId: string, 
    selfData: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate new ID format
      if (!newId.startsWith('property_')) {
        return { success: false, error: 'Property ID must start with "property_"' };
      }
      
      // Get the existing property
      const existingProperty = this.configs.value.get(oldId);
      if (!existingProperty) {
        return { success: false, error: 'Property not found' };
      }
      
      // If ID hasn't changed, just update the data
      if (oldId === newId) {
        return await this.updateProperty(oldId, selfData);
      }
      
      // Check if new ID already exists
      if (this.configs.value.has(newId)) {
        return { success: false, error: 'Property with this ID already exists' };
      }
      
      // Find all configs that depend on the old property
      const dependents = this.configsList.value.filter(c => 
        c.deps && c.deps.includes(oldId)
      );
      
      // Create new property with new ID
      await this.createConfig({
        id: newId,
        type: 'property',
        self_data: {},  // Properties have no dependencies
        override_data: selfData,  // Property data goes to override_data
        deps: existingProperty.deps || [],
        tags: existingProperty.tags || [],
        version: existingProperty.version || 1,
        caption: existingProperty.caption || null,
        category: existingProperty.category || null,
        created_by: existingProperty.created_by || null,
        updated_by: existingProperty.updated_by || null,
        deleted_at: null,
        _deleted: false
      });
      
      // Update all dependents to use new property ID
      for (const dependent of dependents) {
        const updatedDeps = dependent.deps.map(d => d === oldId ? newId : d);
        await this.updateConfig(dependent.id, { deps: updatedDeps });
      }
      
      // Delete old property
      await this.delete(oldId);
      
      // Cascade update all affected configs
      await this.cascadeUpdate(newId);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update property' 
      };
    }
  }
  
  // ============= FIELD OPERATIONS =============
  
  async addPropertyToField(fieldId: string, propertyId: string): Promise<{ success: boolean; error?: string }> {
    // Validate that it's a property being added
    const property = this.configs.value.get(propertyId);
    if (!property || property.type !== 'property') {
      return { success: false, error: 'Property not found' };
    }
    
    // Use base addDependency method
    return this.addDependency(fieldId, propertyId);
  }
  
  async removePropertyFromField(fieldId: string, propertyId: string): Promise<{ success: boolean; error?: string }> {
    // Use base removeDependency method
    return this.removeDependency(fieldId, propertyId);
  }
  
  async updateFieldOverride(fieldId: string, overrideData: any): Promise<{ success: boolean; error?: string }> {
    try {
      const field = this.configs.value.get(fieldId);
      
      if (!field) {
        return { success: false, error: 'Field not found' };
      }
      
      await this.updateConfig(fieldId, { override_data: overrideData });
      
      // Trigger cascade update to propagate changes up the tree
      // This ensures that when field override_data changes, 
      // all parent configs (fields, page, space, workspace, app) are updated
      await this.cascadeUpdate(fieldId);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update field' 
      };
    }
  }
  
  // UI-oriented dependency management with user confirmation
  async addDependencyWithUI(fieldId: string, propertyId: string): Promise<void> {
    try {
      const result = await this.addPropertyToField(fieldId, propertyId);
      
      if (!result.success) {
        if (result.error === "Dependency already exists") {
          console.log("Dependency already exists");
        } else {
          alert(result.error || "Failed to add dependency");
        }
        return;
      }
      
      console.log(`Successfully added ${propertyId} to ${fieldId}`);
    } catch (error) {
      console.error("Error adding dependency:", error);
      alert("Failed to add dependency");
    }
  }
  
  async removeDependencyWithUI(fieldId: string, depToRemove: string): Promise<void> {
    if (!confirm(
      `Remove dependency "${depToRemove.replace("property_", "")}" from field "${fieldId}"?`
    )) {
      return;
    }
    
    try {
      const result = await this.removePropertyFromField(fieldId, depToRemove);
      
      if (!result.success) {
        alert(result.error || "Failed to remove dependency");
        return;
      }
      
      console.log(`Successfully removed ${depToRemove} from ${fieldId}`);
    } catch (error) {
      console.error("Error removing dependency:", error);
      alert("Failed to remove dependency");
    }
  }
  
  // ============= UTILITY OPERATIONS =============
  
  // Get color class based on property content
  getPropertyColor(property: AppConfig): string {
    // Special styling for system properties
    if (property.id === 'property_is_system' || property.id === 'property_not_system') {
      return 'text-yellow-600';
    }
    const data = JSON.stringify(property.data || {});
    if (data.includes('required')) return 'text-red-600';
    if (data.includes('system')) return 'text-yellow-600';
    if (data.includes('primary')) return 'text-purple-600';
    if (data.includes('unique')) return 'text-blue-600';
    if (data.includes('maxLength')) return 'text-green-600';
    return 'text-gray-600';
  }
  
  // Get property border color for cards
  getPropertyBorderColor(property: AppConfig): string {
    // Special styling for system properties
    if (property.id === 'property_is_system' || property.id === 'property_not_system') {
      return 'border-yellow-400 bg-yellow-100';
    }
    const data = JSON.stringify(property.data || {});
    if (data.includes('required')) return 'border-red-200 bg-red-50';
    if (data.includes('system')) return 'border-yellow-200 bg-yellow-50';
    if (data.includes('primary')) return 'border-purple-200 bg-purple-50';
    if (data.includes('unique')) return 'border-blue-200 bg-blue-50';
    if (data.includes('maxLength')) return 'border-green-200 bg-green-50';
    return 'border-gray-200 bg-gray-50';
  }
  
  // Get field display name
  getFieldDisplayName(field: AppConfig): string {
    const id = field.id;
    if (id.startsWith('field_')) {
      return id.substring(6);
    }
    // Remove entity prefix for entity fields
    const parts = id.split('_field_');
    return parts.length > 1 ? parts[1] : id;
  }
  
  // Build hierarchical structure for fields
  buildFieldsStructure(fields: AppConfig[]): any {
    const structure = {
      base: [] as AppConfig[],
      main: {} as Record<string, { fields: AppConfig[]; children: Record<string, AppConfig[]> }>,
      dictionaries: {} as Record<string, AppConfig[]>,
    };
    
    fields.forEach((field) => {
      // Base fields - all fields with type 'field' (includes base, common, frequent)
      if (field.type === 'field') {
        structure.base.push(field);
      }
      // Entity fields
      else if (field.type === 'entity_field' && field.tags) {
        if (field.tags.includes('main')) {
          // Main entity field
          const entityName = field.tags.find((t) => t !== 'main') || field.category || '';
          if (!structure.main[entityName]) {
            structure.main[entityName] = { fields: [], children: {} };
          }
          structure.main[entityName].fields.push(field);
        } else if (field.tags.includes('child')) {
          // Child entity field
          const parentEntity = field.tags.find((t) => t !== 'child') || '';
          if (parentEntity) {
            if (!structure.main[parentEntity]) {
              structure.main[parentEntity] = { fields: [], children: {} };
            }
            const category = field.category || 'unknown';
            if (!structure.main[parentEntity].children[category]) {
              structure.main[parentEntity].children[category] = [];
            }
            structure.main[parentEntity].children[category].push(field);
          }
        } else if (field.tags.includes('dictionary')) {
          // Dictionary field
          const category = field.category || 'unknown';
          if (!structure.dictionaries[category]) {
            structure.dictionaries[category] = [];
          }
          structure.dictionaries[category].push(field);
        }
      }
      // Fallback for entity fields without tags
      else if (field.type === 'entity_field') {
        const category = field.category || 'unknown';
        if (!structure.dictionaries[category]) {
          structure.dictionaries[category] = [];
        }
        structure.dictionaries[category].push(field);
      }
    });
    
    // Sort everything
    structure.base.sort((a, b) => a.id.localeCompare(b.id));
    Object.values(structure.main).forEach(entity => {
      entity.fields.sort((a, b) => a.id.localeCompare(b.id));
      Object.values(entity.children).forEach(childFields => {
        childFields.sort((a, b) => a.id.localeCompare(b.id));
      });
    });
    Object.values(structure.dictionaries).forEach(dictFields => {
      dictFields.sort((a, b) => a.id.localeCompare(b.id));
    });
    
    return structure;
  }
  
  // Build tree structure for working configs
  buildConfigTree(configs: AppConfig[]): TreeNode[] {
    const nodeMap = new Map<string, TreeNode>();
    const childIds = new Set<string>();

    // First pass: Create all nodes
    configs.forEach((config) => {
      const node: TreeNode = {
        id: config.id,
        name: config.caption || config.id,
        configType: config.type,
        children: [],
        data: config.data || {},
        deps: config.deps,
      };
      nodeMap.set(config.id, node);
    });

    // Second pass: Build parent-child relationships and track children
    configs.forEach((config) => {
      const parentNode = nodeMap.get(config.id);
      if (!parentNode) return;

      if (config.deps && config.deps.length > 0) {
        config.deps.forEach((childId) => {
          // Check if it's a field dependency
          if (childId.includes('field') &&
              ['fields', 'sort', 'filter'].includes(config.type)) {
            // Create a virtual node for the field
            const fieldNode: TreeNode = {
              id: childId,
              name: childId,
              configType: 'field_ref', // Special type for field references
              children: [],
              data: {},
              deps: [],
            };
            parentNode.children.push(fieldNode);
          } else {
            // Regular config dependency
            const childNode = nodeMap.get(childId);
            const childConfig = configs.find((c) => c.id === childId);
            if (childNode && childConfig) {
              parentNode.children.push(childNode);
              // Track this as a child so we don't include it in roots
              childIds.add(childId);
            }
          }
        });
      }
    });

    // Third pass: Collect only root nodes (configs that are not children of any other config)
    const roots: TreeNode[] = [];
    configs.forEach((config) => {
      if (!childIds.has(config.id)) {
        const node = nodeMap.get(config.id);
        if (node) {
          roots.push(node);
        }
      }
    });

    return roots;
  }
  
  // Filter configs for display
  getWorkingConfigs(): AppConfig[] {
    const allConfigs = this.configsList.value || [];
    return allConfigs.filter(
      (c) =>
        !c.tags?.includes("template") &&
        c.type !== "field" &&
        c.type !== "entity_field" &&
        c.type !== "property" &&
        !c._deleted
    );
  }
  
  // Get fields for display (excluding deleted)
  getFields(): AppConfig[] {
    const allConfigs = this.configsList.value || [];
    return allConfigs.filter(
      (c) => (c.type === "field" || c.type === "entity_field") && !c._deleted
    );
  }
  
  // Get properties for display (excluding system properties)
  getProperties(): AppConfig[] {
    const allConfigs = this.configsList.value || [];
    return allConfigs.filter(
      (c) =>
        c.type === "property" && !c._deleted && c.id !== "property_is_system"
    );
  }
  
  // Get available templates for a parent type
  getAvailableTemplates(parentType: string | null): AppConfig[] {
    const allConfigs = this.configsList.value || [];
    return allConfigs.filter(
      (config) =>
        config.tags?.includes("template") &&
        !config._deleted &&
        (parentType === null || this.canAddChildType(parentType, config.type))
    );
  }
  
  // Check if a child type can be added to a parent type
  canAddChildType(parentType: string, childType: string): boolean {
    const availableTypes = getAvailableChildTypes(parentType);
    return availableTypes.includes(childType);
  }
  
  // ============= FILTERING METHODS =============
  
  // Universal filter for any config items
  filterConfigItems<T extends { id: string; caption?: string; data?: any }>(
    items: T[],
    searchQuery: string
  ): T[] {
    if (!searchQuery) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      // Search in ID
      if (item.id.toLowerCase().includes(query)) return true;
      
      // Search in caption
      if (item.caption && item.caption.toLowerCase().includes(query)) return true;
      
      // Search in data (JSON)
      if (item.data) {
        const dataStr = JSON.stringify(item.data).toLowerCase();
        if (dataStr.includes(query)) return true;
      }
      
      return false;
    });
  }
  
  // Filter config tree nodes recursively
  filterConfigTree(nodes: TreeNode[], searchQuery: string): TreeNode[] {
    if (!searchQuery) return nodes;
    
    const query = searchQuery.toLowerCase();
    
    return nodes.reduce<TreeNode[]>((acc, node) => {
      const matchesSearch =
        node.name.toLowerCase().includes(query) ||
        node.id.toLowerCase().includes(query);
      
      const filteredChildren = this.filterConfigTree(node.children, searchQuery);
      
      if (matchesSearch || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren,
        });
      }
      
      return acc;
    }, []);
  }
  
  // Get all node IDs from tree recursively (for auto-expand)
  getAllNodeIds(nodes: TreeNode[]): string[] {
    const ids: string[] = [];
    
    const collectIds = (nodeList: TreeNode[]) => {
      for (const node of nodeList) {
        ids.push(node.id);
        if (node.children && node.children.length > 0) {
          collectIds(node.children);
        }
      }
    };
    
    collectIds(nodes);
    return ids;
  }
  
  // Filter fields structure with search
  filterFieldsStructure(
    structure: any,
    searchQuery: string
  ): any {
    if (!searchQuery) return structure;
    
    const filtered = {
      base: this.filterConfigItems(structure.base, searchQuery),
      main: {} as Record<string, { fields: AppConfig[]; children: Record<string, AppConfig[]> }>,
      dictionaries: {} as Record<string, AppConfig[]>,
    };
    
    // Filter main entities
    Object.entries(structure.main).forEach(([entityName, entityData]: [string, any]) => {
      const filteredFields = this.filterConfigItems(entityData.fields, searchQuery);
      const filteredChildren: Record<string, AppConfig[]> = {};
      
      Object.entries(entityData.children).forEach(([childName, childFields]: [string, any]) => {
        const filteredChildFields = this.filterConfigItems(childFields, searchQuery);
        if (filteredChildFields.length > 0) {
          filteredChildren[childName] = filteredChildFields;
        }
      });
      
      if (filteredFields.length > 0 || Object.keys(filteredChildren).length > 0) {
        filtered.main[entityName] = {
          fields: filteredFields,
          children: filteredChildren,
        };
      }
    });
    
    // Filter dictionaries
    Object.entries(structure.dictionaries).forEach(([dictName, dictFields]: [string, any]) => {
      const filteredDictFields = this.filterConfigItems(dictFields, searchQuery);
      if (filteredDictFields.length > 0) {
        filtered.dictionaries[dictName] = filteredDictFields;
      }
    });
    
    return filtered;
  }
  
  // ============= BASE OPERATIONS =============
  
  /**
   * Recalculates self_data for a config based on its dependencies
   */
  private async recalculateSelfData(configId: string): Promise<any> {
    const config = this.configs.value.get(configId);
    if (!config) return {};
    
    let newSelfData = {};
    
    // Aggregate data from all dependencies
    for (const depId of (config.deps || [])) {
      const dep = this.configs.value.get(depId);
      if (dep && dep.data) {
        newSelfData = deepMerge(newSelfData, dep.data);
      }
    }
    
    // DO NOT preserve existing self_data - it should be fully recalculated from deps
    // This was causing stale data to persist when properties were updated
    
    return newSelfData;
  }
  
  /**
   * Get opposite property ID if exists
   */
  getOppositeProperty(propertyId: string): string | null {
    // Define opposite property mappings
    const opposites: Record<string, string> = {
      'property_unique': 'property_not_unique',
      'property_not_unique': 'property_unique',
      'property_required': 'property_not_required',
      'property_not_required': 'property_required',
      'property_nullable': 'property_not_nullable',
      'property_not_nullable': 'property_nullable',
      'property_readonly': 'property_not_readonly',
      'property_not_readonly': 'property_readonly',
      'property_indexed': 'property_not_indexed',
      'property_not_indexed': 'property_indexed',
      'property_primary': 'property_not_primary',
      'property_not_primary': 'property_primary',
      'property_searchable': 'property_not_searchable',
      'property_not_searchable': 'property_searchable',
      'property_sortable': 'property_not_sortable',
      'property_not_sortable': 'property_sortable',
      'property_filterable': 'property_not_filterable',
      'property_not_filterable': 'property_filterable',
      'property_hidden': 'property_not_hidden',
      'property_not_hidden': 'property_hidden',
      'property_editable': 'property_not_editable',
      'property_not_editable': 'property_editable',
      'property_visible': 'property_not_visible',
      'property_not_visible': 'property_visible'
    };
    
    return opposites[propertyId] || null;
  }

  /**
   * Universal method for adding a dependency to a config
   */
  async addDependency(
    configId: string, 
    depId: string,
    options: { skipCascade?: boolean } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const config = this.configs.value.get(configId);
      const dependency = this.configs.value.get(depId);
      
      if (!config) {
        return { success: false, error: 'Config not found' };
      }
      
      if (!dependency) {
        return { success: false, error: 'Dependency not found' };
      }
      
      // Check if already exists
      if (config.deps && config.deps.includes(depId)) {
        return { success: false, error: 'Dependency already exists' };
      }
      
      // Check for opposite properties and auto-remove if exists
      let currentDeps = [...(config.deps || [])];
      
      if (dependency.type === 'property') {
        const oppositeId = this.getOppositeProperty(depId);
        if (oppositeId && currentDeps.includes(oppositeId)) {
          console.log(`[addDependency] Auto-removing opposite property: ${oppositeId}`);
          // Remove the opposite property
          currentDeps = currentDeps.filter(d => d !== oppositeId);
        }
      }
      
      // Add to deps
      const updatedDeps = [...currentDeps, depId];
      
      // Recalculate self_data based on all deps
      let newSelfData = {};
      for (const id of updatedDeps) {
        const dep = this.configs.value.get(id);
        if (dep && dep.data) {
          newSelfData = deepMerge(newSelfData, dep.data);
        }
      }
      
      // Update config
      await this.updateConfig(configId, { 
        deps: updatedDeps,
        self_data: newSelfData 
      });
      
      // Cascade update to parents
      if (!options.skipCascade) {
        await this.cascadeUpdate(configId);
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add dependency' 
      };
    }
  }
  
  /**
   * Universal method for removing a dependency from a config
   */
  async removeDependency(
    configId: string,
    depId: string,
    options: { skipCascade?: boolean } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const config = this.configs.value.get(configId);

      if (!config) {
        return { success: false, error: 'Config not found' };
      }

      if (!config.deps || !config.deps.includes(depId)) {
        return { success: false, error: 'Dependency not found' };
      }

      // Remove from deps
      const updatedDeps = config.deps.filter(d => d !== depId);

      // Recalculate self_data without this dependency
      let newSelfData = {};
      for (const id of updatedDeps) {
        const dep = this.configs.value.get(id);
        if (dep && dep.data) {
          newSelfData = deepMerge(newSelfData, dep.data);
        }
      }

      // Update config
      await this.updateConfig(configId, {
        deps: updatedDeps,
        self_data: newSelfData
      });

      // Cascade update to parents
      if (!options.skipCascade) {
        await this.cascadeUpdate(configId);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove dependency'
      };
    }
  }

  /**
   * Cascade update to all parents (configs that depend on this one)
   */
  async cascadeUpdate(configId: string): Promise<void> {
    const allConfigs = this.configsList.value || [];
    const processedIds = new Set<string>();
    
    const updateParents = async (id: string) => {
      if (processedIds.has(id)) return;
      processedIds.add(id);
      
      // Find all configs that have this config in their deps (parents)
      const parents = allConfigs.filter(c => c.deps && c.deps.includes(id));
      
      for (const parent of parents) {
        // Don't recalculate self_data only for properties - they don't have dependencies
        // BUT fields (field & entity_field) MUST be updated when their property deps change
        if (parent.type === 'property') {
            continue;
        }
        
        // Check if parent is a high-level type that needs special handling
        if (this.isHighLevelType(parent.type)) {
          // High-level types (fields, page, space, etc) need rebuildParentSelfData
          // to maintain their hierarchical structure
          await this.rebuildParentSelfData(parent.id);
          // Use cascadeUpdateUp for hierarchical propagation
          await this.cascadeUpdateUp(parent.id);
        } else {
          // Regular configs (individual fields) use simple recalculation
          const newSelfData = await this.recalculateSelfData(parent.id);
          await this.updateConfig(parent.id, { self_data: newSelfData });
          // Recursively update parent's parents
          await updateParents(parent.id);
        }
      }
    };
    
    await updateParents(configId);
  }
  
  /**
   * Universal delete with dependencies handling
   */
  async deleteWithDependencies(
    configId: string,
    options: { deleteChildren?: boolean } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const config = this.configs.value.get(configId);
      if (!config) {
        return { success: false, error: 'Config not found' };
      }
      
      console.log(`[deleteWithDependencies] Starting deletion for: ${configId} (type: ${config.type})`);
      console.log(`[deleteWithDependencies] Config has deps:`, config.deps);
      
      // If deleteChildren is true and config has deps (children), process them
      if (options.deleteChildren && config.deps && config.deps.length > 0) {
        for (const childId of config.deps) {
          // Get the child config to check its type
          const childConfig = this.configs.value.get(childId);
          
          if (!childConfig) {
            // If it's not a config, it might be a field reference
            console.log(`[deleteWithDependencies] Child not found in configs: ${childId}, skipping`);
            continue;
          }
          
          // Skip deletion for shared resources: fields and properties
          // But delete grouping configs (type: 'fields', 'sort', 'filter') and all other configs
          if (childConfig.type === 'field' || 
              childConfig.type === 'entity_field' || 
              childConfig.type === 'property' ||
              childConfig.type === 'field_property') {
            // Fields and properties are shared resources, don't delete them
            // They will be automatically removed from deps when the parent is deleted
            console.log(`[deleteWithDependencies] Skipping shared resource deletion: ${childId} (type: ${childConfig.type})`);
          } else {
            // Delete all other config types recursively (including grouping configs)
            console.log(`[deleteWithDependencies] Deleting child config: ${childId} (type: ${childConfig.type})`);
            await this.deleteWithDependencies(childId, { deleteChildren: true });
          }
        }
      }
      
      // Remove this config from all parents' deps
      const allConfigs = this.configsList.value || [];
      const parents = allConfigs.filter(c => c.deps && c.deps.includes(configId));
      
      for (const parent of parents) {
        await this.removeDependency(parent.id, configId, { skipCascade: true });
      }
      
      // Delete the config
      await this.deleteConfig(configId);
      
      // Cascade update all affected parents (but not fields or properties)
      for (const parent of parents) {
        // Don't cascade update fields and properties - they are independent entities
        if (parent.type !== 'field' && 
            parent.type !== 'entity_field' && 
            parent.type !== 'property' &&
            parent.type !== 'field_property') {
          await this.cascadeUpdate(parent.id);
        }
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete config' 
      };
    }
  }
  
  // ============= HELPER OPERATIONS =============
  
  private async setupRealtimeSubscription() {
    console.log('[AppConfigStore] Setting up realtime subscription...');
    
    if (this.realtimeChannel) {
      await supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    
    try {
      this.realtimeChannel = supabase
        .channel('app-config-changes')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'app_config' 
          },
          async (payload: any) => {
            console.log('[AppConfigStore] Realtime event:', payload.eventType);
            
            const db = await getDatabase();
            const collection = db.app_config as AppConfigCollection;
            
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const newData = {
                ...payload.new,
                _deleted: payload.new.deleted || false
              };
              await collection.upsert(newData);
            } else if (payload.eventType === 'DELETE') {
              const doc = await collection.findOne(payload.old.id).exec();
              if (doc) {
                await doc.remove();
              }
            }
          }
        )
        .subscribe();
      
      console.log('[AppConfigStore] Realtime subscription established');
    } catch (error) {
      console.error('[AppConfigStore] Failed to setup realtime:', error);
    }
  }
  
  // ============= HIERARCHICAL STRUCTURE METHODS =============
  
  /**
   * Update parent's self_data when a child is added or modified
   */
  async updateParentSelfData(parentId: string, childId: string): Promise<void> {
    const parent = this.configs.value.get(parentId);
    const child = this.configs.value.get(childId);
    
    if (!parent || !child) {
      console.error('[updateParentSelfData] Parent or child not found');
      return;
    }
    
    console.log('[updateParentSelfData] Updating parent:', parentId, 'with child:', childId, 'type:', child.type);
    
    let newSelfData = { ...parent.self_data };
    
    // If child is a property, merge to root
    if (child.type === 'property') {
      // Properties merge their data (self_data + override_data) to parent's root
      const childData = {
        ...child.self_data,
        ...child.override_data
      };
      Object.assign(newSelfData, childData);
      console.log('[updateParentSelfData] Merged property to root:', childData);
    } else {
      // Find the container for this child type
      const containerKey = childContainerMapping[parent.type]?.[child.type];
      
      if (containerKey) {
        // Special handling for fields, sort, filter configs
        if (child.type === 'fields' || child.type === 'sort' || child.type === 'filter') {
          // These configs populate parent's containers directly without nesting
          
          if (child.type === 'fields') {
            if (!newSelfData.fields) {
              newSelfData.fields = {};
            }
            
            // Process field dependencies with overrides
            if (child.deps && child.deps.length > 0) {
              for (const fieldId of child.deps) {
                if (fieldId.includes('field')) {
                  const fieldConfig = this.configs.value.get(fieldId);
                  if (fieldConfig) {
                    // Start with base field data
                    let fieldData = fieldConfig.data || fieldConfig.self_data || {};
                    
                    // Apply field overrides if they exist
                    if (child.self_data?._field_overrides?.[fieldId]) {
                      fieldData = { ...fieldData, ...child.self_data._field_overrides[fieldId] };
                    }
                    
                    // Apply extra properties if they exist
                    if (child.self_data?._field_extra_props?.[fieldId]) {
                      const extraProps = child.self_data._field_extra_props[fieldId];
                      for (const propId of extraProps) {
                        const propConfig = this.configs.value.get(propId);
                        if (propConfig) {
                          fieldData = { ...fieldData, ...(propConfig.data || propConfig.self_data || {}) };
                        }
                      }
                    }
                    
                    // Update field data in the fields container
                    newSelfData.fields[fieldId] = fieldData;
                  }
                }
              }
            }
            
            // Also merge any additional fields data from self_data/override_data
            const { tags, type, deps, caption, version, created_at, updated_at, _deleted, _rev, 
                    _field_overrides, _field_extra_props, ...cleanSelfData } = child.self_data || {};
            const { tags: t2, type: ty2, deps: d2, caption: c2, version: v2, ...cleanOverrideData } = child.override_data || {};
            if (cleanSelfData.fields && typeof cleanSelfData.fields === 'object') {
              Object.assign(newSelfData.fields, cleanSelfData.fields);
            }
            if (cleanOverrideData.fields && typeof cleanOverrideData.fields === 'object') {
              Object.assign(newSelfData.fields, cleanOverrideData.fields);
            }
            
          } else if (child.type === 'sort') {
            // Sort config creates sort_fields object in parent
            if (!newSelfData.sort_fields) {
              newSelfData.sort_fields = {};
            }
            const { tags, type, deps, caption, version, created_at, updated_at, _deleted, _rev, ...cleanSelfData } = child.self_data || {};
            const { tags: t2, type: ty2, deps: d2, caption: c2, version: v2, ...cleanOverrideData } = child.override_data || {};
            const mergedData = { ...cleanSelfData, ...cleanOverrideData };
            Object.assign(newSelfData.sort_fields, mergedData);
            
          } else if (child.type === 'filter') {
            // Filter config creates filter_fields object in parent
            if (!newSelfData.filter_fields) {
              newSelfData.filter_fields = {};
            }
            const { tags, type, deps, caption, version, created_at, updated_at, _deleted, _rev, ...cleanSelfData } = child.self_data || {};
            const { tags: t2, type: ty2, deps: d2, caption: c2, version: v2, ...cleanOverrideData } = child.override_data || {};
            const mergedData = { ...cleanSelfData, ...cleanOverrideData };
            Object.assign(newSelfData.filter_fields, mergedData);
          }
          console.log('[updateParentSelfData] Updated', child.type, 'config in parent');
        } else {
          // Standard hierarchical configs
          const isArrayContainer = containerKey === 'sort_fields' || containerKey === 'filter_fields';
        
        if (isArrayContainer) {
          // Initialize array if needed
          if (!Array.isArray(newSelfData[containerKey])) {
            newSelfData[containerKey] = [];
          }
          
          // Find or add child in array
          // Filter out system fields
          const { tags, type, deps, caption, version, created_at, updated_at, _deleted, _rev, ...cleanSelfData } = child.self_data || {};
          const { tags: t2, type: ty2, deps: d2, caption: c2, version: v2, ...cleanOverrideData } = child.override_data || {};
          
          const childData = {
            ...cleanSelfData,
            ...cleanOverrideData,
            id: childId  // Include ID for reference
          };
          
          const existingIndex = newSelfData[containerKey].findIndex(
            (item: any) => item.id === childId
          );
          
          if (existingIndex >= 0) {
            newSelfData[containerKey][existingIndex] = childData;
          } else {
            newSelfData[containerKey].push(childData);
          }
          console.log('[updateParentSelfData] Updated array container:', containerKey, childData);
        } else {
          // Initialize object if needed
          if (!newSelfData[containerKey]) {
            newSelfData[containerKey] = {};
          }
          
          // For hierarchical structures, include the full child data with its nested structure
          // This ensures proper nesting (e.g., workspace contains its spaces)
          // But filter out system fields
          let childData: any = {};
          
          if (child.self_data) {
            const { tags, type, deps, caption, version, created_at, updated_at, _deleted, _rev, ...cleanSelfData } = child.self_data;
            if (Object.keys(cleanSelfData).length > 0) {
              childData = { ...cleanSelfData };
            }
          }
          
          if (child.override_data) {
            const { tags, type, deps, caption, version, created_at, updated_at, _deleted, _rev, ...cleanOverrideData } = child.override_data;
            if (Object.keys(cleanOverrideData).length > 0) {
              Object.assign(childData, cleanOverrideData);
            }
          }
          
          newSelfData[containerKey][childId] = childData;
          console.log('[updateParentSelfData] Updated object container:', containerKey, childId);
        }
        }
      } else {
        console.warn('[updateParentSelfData] No container mapping for', child.type, 'in', parent.type);
      }
    }
    
    // Update parent config
    await this.updateConfig(parentId, { self_data: newSelfData });
    
    // Cascade update up the tree
    await this.cascadeUpdateUp(parentId);
  }
  
  /**
   * Rebuild parent's self_data from all its deps
   */
  async rebuildParentSelfData(parentId: string): Promise<void> {
    const parent = this.configs.value.get(parentId);
    if (!parent) return;
    
    console.log('[rebuildParentSelfData] Starting for parent:', parentId, 'type:', parent.type);
    console.log('[rebuildParentSelfData] Parent deps:', parent.deps);
    console.log('[rebuildParentSelfData] Parent current self_data:', JSON.stringify(parent.self_data, null, 2));
    console.log('[rebuildParentSelfData] Parent override_data:', JSON.stringify(parent.override_data, null, 2));
    
    let newSelfData: any = {};
    
    // Don't initialize empty structures - they will be created only when children of that type are added
    
    // Special handling when parent is a fields, sort, or filter config
    if (parent.type === 'fields' || parent.type === 'sort' || parent.type === 'filter') {
      
      // All grouping configs store fields as objects with field ID as key
      for (const childId of parent.deps || []) {
        const child = this.configs.value.get(childId);
        if (!child) continue;
        
        if (child.type === 'field' || child.type === 'entity_field') {
          // Get field's complete data
          const fieldData = child.data || { ...child.self_data, ...child.override_data };
          
          // Store field data with field ID as key
          newSelfData[childId] = fieldData;
        } else if (child.type === 'property' && parent.type === 'fields') {
          // Properties merge to root only for fields config
          const childData = {
            ...child.self_data,
            ...child.override_data
          };
          Object.assign(newSelfData, childData);
        }
      }
      
      // Clean up override_data - remove entries for fields that are no longer in deps
      let cleanedOverrideData = parent.override_data ? { ...parent.override_data } : {};
      let overrideChanged = false;
      
      for (const fieldId in cleanedOverrideData) {
        if (!parent.deps?.includes(fieldId)) {
          delete cleanedOverrideData[fieldId];
          overrideChanged = true;
        }
      }
      
      // Update the config with new self_data and cleaned override_data if needed
      const updates: any = { self_data: newSelfData };
      if (overrideChanged) {
        updates.override_data = cleanedOverrideData;
      }
      
      await this.updateConfig(parentId, updates);
      return;
    }
    
    // Process ONLY DIRECT children in deps (not descendants)
    for (const childId of parent.deps || []) {
      const child = this.configs.value.get(childId);
      if (!child) continue;
      
      
      // Check if this child type can be a direct child of parent
      const allowedChildren = childContainerMapping[parent.type];
      if (!allowedChildren) {
        console.warn('[rebuildParentSelfData] Parent type', parent.type, 'has no allowed children');
        continue;
      }
      
      // If child is a property, merge to root
      if (child.type === 'property') {
        const childData = {
          ...child.self_data,
          ...child.override_data
        };
        Object.assign(newSelfData, childData);
      } else if (child.type in allowedChildren && child.type !== 'property') {
        // Only process if this child type is allowed for this parent (skip property as it's already handled)
        const containerKey = allowedChildren[child.type];
          
        if (containerKey) {
          // Special handling for fields, sort, filter configs - they populate parent's containers directly
          if (child.type === 'fields' || child.type === 'sort' || child.type === 'filter') {
            // These configs don't create nested structures, they populate parent's containers
            
            if (child.type === 'fields') {
              // Fields config passes its complete data to parent's fields container
              // Use child.data which is the merged self_data + override_data
              const childData = child.data || { ...child.self_data, ...child.override_data };
              
              console.log('[rebuildParentSelfData] Processing fields config for parent type:', parent.type);
              
              // Pass the fields config's data to parent
              if (childData && Object.keys(childData).length > 0) {
                if (!newSelfData.fields) {
                  newSelfData.fields = {};
                }
                Object.assign(newSelfData.fields, childData);
              } else {
                // Even if empty, create the container
                if (!newSelfData.fields) {
                  newSelfData.fields = {};
                }
              }
              
            } else if (child.type === 'sort') {
              // Sort config creates sort_fields object in parent
              // Always create sort_fields container when sort config exists (even if empty)
              if (!newSelfData.sort_fields) {
                newSelfData.sort_fields = {};
              }
              
              // Use child.data which is the merged self_data + override_data (same as fields)
              const childData = child.data || { ...child.self_data, ...child.override_data };
              
              // Sort config's data already has fields as objects with field IDs as keys
              // Just pass it to parent's sort_fields container
              if (childData && Object.keys(childData).length > 0) {
                Object.assign(newSelfData.sort_fields, childData);
              }
              
            } else if (child.type === 'filter') {
              // Filter config creates filter_fields object in parent
              // Always create filter_fields container when filter config exists (even if empty)
              if (!newSelfData.filter_fields) {
                newSelfData.filter_fields = {};
              }
              
              // Use child.data which is the merged self_data + override_data (same as fields)
              const childData = child.data || { ...child.self_data, ...child.override_data };
              
              // Filter config's data already has fields as objects with field IDs as keys
              // Just pass it to parent's filter_fields container
              if (childData && Object.keys(childData).length > 0) {
                Object.assign(newSelfData.filter_fields, childData);
              }
            }
          } else {
            // Standard hierarchical configs (workspace, space, view, page, tabs)
            // Note: sort_fields and filter_fields are handled by sort/filter configs above
            // so we don't need array container logic here
            
            if (!newSelfData[containerKey]) {
              newSelfData[containerKey] = {};
            }
            
            // For hierarchical types, include their complete structure
            // This includes their own children (e.g., workspace includes its spaces)
            let childData: any = {};
            
            // Start with child's self_data (which includes its nested children)
            // But filter out system fields
            if (child.self_data) {
              const { tags, type, deps, caption, version, created_at, updated_at, _deleted, _rev, ...cleanSelfData } = child.self_data;
              if (Object.keys(cleanSelfData).length > 0) {
                childData = { ...cleanSelfData };
              }
            }
            
            // Apply override_data on top (at root level of child)
            // Also filter out system fields from override_data
            if (child.override_data) {
              const { tags, type, deps, caption, version, created_at, updated_at, _deleted, _rev, ...cleanOverrideData } = child.override_data;
              if (Object.keys(cleanOverrideData).length > 0) {
                Object.assign(childData, cleanOverrideData);
              }
            }
            
            // Debug logging for fields config
            if (child.type === 'fields' && parent.type === 'view') {
              console.log('[DEBUG] Adding fields to view:', {
                childId,
                self_data: child.self_data,
                override_data: child.override_data,
                childData
              });
            }
            
            // Only add to container if childData has content
            // For empty configs (like fields config), store empty object
            newSelfData[containerKey][childId] = childData;
          }
        }
      } else {
        console.warn('[rebuildParentSelfData] Child type', child.type, 'is not allowed for parent type', parent.type);
      }
    }
    
    
    // Add empty containers for specific types only if they have corresponding children
    if (parent.type === 'view') {
      // Only add containers if there are children of that type
      const hasFieldsChild = parent.deps?.some(depId => {
        const dep = this.configs.value.get(depId);
        return dep && dep.type === 'fields';
      });
      if (hasFieldsChild && !('fields' in newSelfData)) {
        newSelfData.fields = {};
      }
      
      // Sort and filter configs now pass their data as fields objects,
      // so we don't need to create sort_fields or filter_fields arrays
    } else if (parent.type === 'page') {
      // For page, only add fields container if there are fields children
      const hasFieldsChild = parent.deps?.some(depId => {
        const dep = this.configs.value.get(depId);
        return dep && dep.type === 'fields';
      });
      if (hasFieldsChild && !('fields' in newSelfData)) {
        newSelfData.fields = {};
      }
      // Only add tabs container if there are tab children
      const hasTabChild = parent.deps?.some(depId => {
        const dep = this.configs.value.get(depId);
        return dep && dep.type === 'tab';
      });
      if (hasTabChild && !('tabs' in newSelfData)) {
        newSelfData.tabs = {};
      }
    } else if (parent.type === 'tab') {
      // Tab should have fields container only if it has fields children
      const hasFieldsChild = parent.deps?.some(depId => {
        const dep = this.configs.value.get(depId);
        return dep && dep.type === 'fields';
      });
      if (hasFieldsChild && !('fields' in newSelfData)) {
        newSelfData.fields = {};
      }
    }
    
    console.log('[rebuildParentSelfData] Final newSelfData for', parent.type, ':', newSelfData);
    
    // Update parent with completely new self_data (replacing old one)
    await this.updateConfig(parentId, { self_data: newSelfData });
  }
  
  /**
   * Cascade updates up the hierarchy tree
   */
  async cascadeUpdateUp(configId: string): Promise<void> {
    // Find DIRECT parents only (configs that have this config in their deps)
    const parents = Array.from(this.configs.value.values()).filter(
      config => config.deps?.includes(configId)
    );
    
    for (const parent of parents) {
      // Rebuild parent's self_data from all its deps
      await this.rebuildParentSelfData(parent.id);
      // Then cascade further up
      await this.cascadeUpdateUp(parent.id);
    }
  }
  
  /**
   * Remove child from parent's self_data
   */
  async removeChildFromParent(parentId: string, childId: string): Promise<void> {
    const parent = this.configs.value.get(parentId);
    const child = this.configs.value.get(childId);
    
    if (!parent) return;
    
    console.log('[removeChildFromParent] Removing:', childId, 'from:', parentId);
    
    // Remove from deps
    const newDeps = (parent.deps || []).filter(d => d !== childId);
    
    // Rebuild self_data without this child
    await this.updateConfig(parentId, { deps: newDeps });
    await this.rebuildParentSelfData(parentId);
    
    // Cascade up
    await this.cascadeUpdateUp(parentId);
  }
  
  async resetStore(): Promise<void> {
    console.log('[AppConfigStore] Resetting store...');
    
    if (this.dbSubscription) {
      this.dbSubscription.unsubscribe();
      this.dbSubscription = null;
    }
    
    if (this.realtimeChannel) {
      await supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    
    batch(() => {
      this.configs.value = new Map();
      this.loading.value = false;
      this.error.value = null;
      this.syncEnabled.value = false;
    });
    
    await this.initializeStore();
  }
}

// Export singleton instance
export const appConfigStore = new AppConfigStore();