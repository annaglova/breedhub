import { signal, computed, batch, Signal } from '@preact/signals-react';
import type { RxDatabase, RxCollection, RxDocument } from 'rxdb';
import { getDatabase } from '../services/database.service';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// AppConfig type definition
export interface AppConfig {
  id: string;
  type: 'field' | 'entity' | 'mixin' | 'feature' | 'template' | 'ui_config';
  
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

class AppConfigStore {
  // Signals for reactive state
  configs = signal<Map<string, AppConfig>>(new Map());
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  syncEnabled = signal<boolean>(false);
  
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
  private supabase: SupabaseClient;
  private realtimeChannel: RealtimeChannel | null = null;
  
  constructor() {
    // Initialize Supabase client
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('[AppConfigStore] Constructor called');
    console.log('[AppConfigStore] Supabase URL:', supabaseUrl ? 'Found' : 'Missing');
    console.log('[AppConfigStore] Supabase Key:', supabaseKey ? 'Found' : 'Missing');
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[AppConfigStore] Supabase credentials not found');
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('[AppConfigStore] Supabase client created');
    }
    
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
        console.log('[AppConfigStore] Collection changed, documents:', docs.length);
        
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
      if (this.supabase) {
        try {
          await this.enableSync();
          await this.setupRealtimeSubscription();
        } catch (syncError) {
          console.error('[AppConfigStore] Failed to enable sync:', syncError);
        }
      }
      
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
    if (!this.supabase) {
      console.error('[AppConfigStore] Supabase client not initialized');
      throw new Error('Supabase client not initialized');
    }
    
    console.log('[AppConfigStore] Enabling Supabase sync...');
    console.log('[AppConfigStore] Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    
    try {
      const { data, error } = await this.supabase
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
          console.error('[AppConfigStore] BulkUpsert errors:', result.error);
          result.error.forEach(err => {
            console.error('[AppConfigStore] Error detail:', {
              id: err.documentId,
              error: err.status,
              validationErrors: err.validationErrors
            });
            if (err.validationErrors && err.validationErrors.length > 0) {
              err.validationErrors.forEach(valErr => {
                console.error('[AppConfigStore] Validation error:', {
                  field: valErr.instancePath || valErr.dataPath,
                  message: valErr.message,
                  keyword: valErr.keyword,
                  params: valErr.params,
                  schemaPath: valErr.schemaPath
                });
              });
            }
            console.error('[AppConfigStore] Document that failed:', err.writeRow?.document);
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
      if (this.syncEnabled.value && this.supabase) {
        // Map _deleted to deleted for Supabase
        const { _deleted, _rev, ...rest } = newConfig;
        const supabaseData = {
          ...rest,
          deleted: _deleted || false
        };
        try {
          const { error } = await this.supabase
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
      }
      
      await doc.patch(updatedData);
      
      // Update signal immediately
      const updatedDoc = await db.app_config.findOne(id).exec();
      if (updatedDoc) {
        const newConfigs = new Map(this.configs.value);
        const configData = { ...updatedDoc.toJSON() } as AppConfig;
        configData.data = this.computeMergedData(configData);
        newConfigs.set(id, configData);
        this.configs.value = newConfigs;
        
        // Update dependents
        this.updateDependents(id);
      }
      
      // Sync to Supabase if enabled
      if (this.syncEnabled.value && this.supabase) {
        // Map _deleted to deleted for Supabase
        const { _deleted, _rev, ...rest } = updatedData;
        const supabaseUpdates = {
          ...rest,
          deleted: _deleted || false
        };
        try {
          await this.supabase
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
    console.log('[AppConfigStore] Deleting config:', id);
    
    try {
      this.loading.value = true;
      this.error.value = null;
      
      const db = await getDatabase();
      const doc = await db.app_config.findOne(id).exec();
      
      if (!doc) {
        throw new Error(`Config ${id} not found`);
      }
      
      // Soft delete
      await doc.patch({
        deleted: true,
        _deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Remove from signal
      const newConfigs = new Map(this.configs.value);
      newConfigs.delete(id);
      this.configs.value = newConfigs;
      
      // Sync to Supabase if enabled
      if (this.syncEnabled.value && this.supabase) {
        try {
          await this.supabase
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
  
  private async setupRealtimeSubscription() {
    console.log('[AppConfigStore] Setting up realtime subscription...');
    
    if (this.realtimeChannel) {
      await this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    
    try {
      this.realtimeChannel = this.supabase
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
  
  async resetStore(): Promise<void> {
    console.log('[AppConfigStore] Resetting store...');
    
    if (this.dbSubscription) {
      this.dbSubscription.unsubscribe();
      this.dbSubscription = null;
    }
    
    if (this.realtimeChannel) {
      await this.supabase.removeChannel(this.realtimeChannel);
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