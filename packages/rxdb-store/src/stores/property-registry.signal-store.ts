import { signal, computed, batch } from '@preact/signals-react';
import { getDatabase } from '../services/database.service';
import { createClient } from '@supabase/supabase-js';
import { Subscription } from 'rxjs';
import type { RxDatabase, RxCollection, RxDocument } from 'rxdb';

// Property types
export interface PropertyDefinition {
  uid: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'json' | 'array' | 'reference';
  data_type: string;  // Now required with default ''
  caption: string;
  component: number;
  config?: any;
  mixins?: string[];
  tags?: string[];
  category: string;  // Now required with default ''
  version?: number;
  is_system?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by: string;  // Now required with default ''
  _deleted?: boolean | number | string;
}

export type PropertyDocument = RxDocument<PropertyDefinition>;

// RxDB Schema
export const propertyRegistrySchema = {
  version: 0,
  primaryKey: 'uid',
  type: 'object',
  properties: {
    uid: {
      type: 'string',
      maxLength: 100
    },
    name: {
      type: 'string',
      maxLength: 255
    },
    type: {
      type: 'string',
      maxLength: 50
    },
    data_type: {
      type: 'string',
      maxLength: 100,
      default: ''
    },
    caption: {
      type: 'string',
      maxLength: 255
    },
    component: {
      type: 'number'
    },
    config: {
      type: 'object'
    },
    mixins: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    tags: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    category: {
      type: 'string',
      maxLength: 100,
      default: ''
    },
    version: {
      type: 'number'
    },
    is_system: {
      type: 'boolean'
    },
    created_at: {
      type: 'string'
    },
    updated_at: {
      type: 'string'
    },
    created_by: {
      type: 'string',
      default: ''
    },
    _deleted: {
      type: ['boolean', 'number', 'string', 'null']
    }
  },
  required: ['uid', 'name', 'type', 'caption', 'component'],
  indexes: ['name', 'type', 'category', 'created_at', 'updated_at']
};

class PropertyRegistrySignalStore {
  private static instance: PropertyRegistrySignalStore;
  
  // Signals
  properties = signal<Map<string, PropertyDefinition>>(new Map());
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  syncEnabled = signal<boolean>(false);
  
  // Computed values
  propertiesList = computed(() => {
    const propsMap = this.properties.value;
    return Array.from(propsMap.values())
      .filter(prop => {
        const isDeleted = prop._deleted === true || 
                         prop._deleted === 1 || 
                         prop._deleted === "1" || 
                         prop._deleted === "true";
        return !isDeleted;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  });
  
  systemProperties = computed(() => {
    return this.propertiesList.value.filter(p => p.is_system);
  });
  
  customProperties = computed(() => {
    return this.propertiesList.value.filter(p => !p.is_system);
  });
  
  categories = computed(() => {
    const cats = new Set<string>();
    this.propertiesList.value.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  });
  
  totalCount = computed(() => {
    return this.propertiesList.value.length;
  });
  
  private dbSubscription: Subscription | null = null;
  private supabase: any = null;
  private replicationState: any = null;
  
  private constructor() {
    console.log('[PropertyRegistryStore] Initializing...');
    this.initializeSupabase();
    this.initializeStore();
  }
  
  static getInstance(): PropertyRegistrySignalStore {
    if (!PropertyRegistrySignalStore.instance) {
      PropertyRegistrySignalStore.instance = new PropertyRegistrySignalStore();
    }
    return PropertyRegistrySignalStore.instance;
  }
  
  private initializeSupabase() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('[PropertyRegistryStore] Supabase client initialized');
    } else {
      console.warn('[PropertyRegistryStore] Supabase credentials not found');
    }
  }
  
  private async initializeStore() {
    try {
      console.log('[PropertyRegistryStore] Getting database...');
      const db = await getDatabase();
      
      // Add collection if it doesn't exist
      if (!db.collections.property_registry) {
        console.log('[PropertyRegistryStore] Creating property_registry collection...');
        await db.addCollections({
          property_registry: {
            schema: propertyRegistrySchema
          }
        });
      }
      
      const collection = db.collections.property_registry as RxCollection<PropertyDefinition>;
      console.log('[PropertyRegistryStore] Collection ready, subscribing to changes...');
      
      // Subscribe to collection changes
      this.dbSubscription = collection.find().$.subscribe({
        next: (docs: PropertyDocument[]) => {
          console.log(`[PropertyRegistryStore] Collection updated with ${docs.length} properties`);
          batch(() => {
            const newMap = new Map<string, PropertyDefinition>();
            docs.forEach(doc => {
              newMap.set(doc.uid, doc.toJSON() as PropertyDefinition);
            });
            this.properties.value = newMap;
            this.error.value = null;
          });
        },
        error: (err) => {
          console.error('[PropertyRegistryStore] Collection subscription error:', err);
          this.error.value = err.message;
        }
      });
      
      // Start sync if Supabase is available
      if (this.supabase) {
        await this.enableSync();
      }
      
    } catch (error) {
      console.error('[PropertyRegistryStore] Failed to initialize:', error);
      this.error.value = `Failed to initialize store: ${error}`;
    } finally {
      this.loading.value = false;
    }
  }
  
  async enableSync(): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    if (this.replicationState) {
      console.log('[PropertyRegistryStore] Sync already enabled');
      return;
    }
    
    try {
      console.log('[PropertyRegistryStore] Enabling Supabase sync...');
      const db = await getDatabase();
      const collection = db.collections.property_registry as RxCollection<PropertyDefinition>;
      
      // Simple pull from Supabase
      const pullProperties = async () => {
        const { data, error } = await this.supabase
          .from('property_registry')
          .select('*')
          .order('name');
        
        if (error) {
          console.error('[PropertyRegistryStore] Failed to pull from Supabase:', error);
          throw error;
        }
        
        if (data && data.length > 0) {
          console.log(`[PropertyRegistryStore] Pulled ${data.length} properties from Supabase`);
          
          // Bulk upsert into RxDB
          await collection.bulkUpsert(data);
        }
      };
      
      // Initial pull
      await pullProperties();
      
      // Set up periodic sync (every 30 seconds)
      setInterval(() => {
        if (this.syncEnabled.value) {
          pullProperties().catch(err => 
            console.error('[PropertyRegistryStore] Periodic sync failed:', err)
          );
        }
      }, 30000);
      
      this.syncEnabled.value = true;
      console.log('[PropertyRegistryStore] Sync enabled');
      
    } catch (error) {
      console.error('[PropertyRegistryStore] Failed to enable sync:', error);
      throw error;
    }
  }
  
  async disableSync(): Promise<void> {
    if (this.replicationState) {
      await this.replicationState.cancel();
      this.replicationState = null;
      this.syncEnabled.value = false;
      console.log('[PropertyRegistryStore] Sync disabled');
    }
  }
  
  async createProperty(property: Omit<PropertyDefinition, 'uid' | 'created_at' | 'updated_at'>): Promise<PropertyDefinition> {
    this.loading.value = true;
    try {
      const db = await getDatabase();
      const collection = db.collections.property_registry as RxCollection<PropertyDefinition>;
      
      const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      const newProperty: PropertyDefinition = {
        data_type: '',
        category: '',
        created_by: '',
        ...property,
        uid,
        created_at: now,
        updated_at: now,
        version: 1
      };
      
      const doc = await collection.insert(newProperty);
      
      // If sync is enabled, also push to Supabase
      if (this.syncEnabled.value && this.supabase) {
        await this.supabase
          .from('property_registry')
          .insert(newProperty);
      }
      
      return doc.toJSON() as PropertyDefinition;
    } catch (error) {
      console.error('[PropertyRegistryStore] Failed to create property:', error);
      this.error.value = `Failed to create property: ${error}`;
      throw error;
    } finally {
      this.loading.value = false;
    }
  }
  
  async updateProperty(uid: string, updates: Partial<PropertyDefinition>): Promise<void> {
    this.loading.value = true;
    try {
      const db = await getDatabase();
      const collection = db.collections.property_registry as RxCollection<PropertyDefinition>;
      
      const doc = await collection.findOne(uid).exec();
      if (!doc) {
        throw new Error(`Property ${uid} not found`);
      }
      
      await doc.patch({
        ...updates,
        updated_at: new Date().toISOString(),
        version: (doc.version || 0) + 1
      });
      
      // If sync is enabled, also update in Supabase
      if (this.syncEnabled.value && this.supabase) {
        await this.supabase
          .from('property_registry')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
            version: (doc.version || 0) + 1
          })
          .eq('uid', uid);
      }
      
    } catch (error) {
      console.error('[PropertyRegistryStore] Failed to update property:', error);
      this.error.value = `Failed to update property: ${error}`;
      throw error;
    } finally {
      this.loading.value = false;
    }
  }
  
  async deleteProperty(uid: string): Promise<void> {
    this.loading.value = true;
    try {
      const db = await getDatabase();
      const collection = db.collections.property_registry as RxCollection<PropertyDefinition>;
      
      const doc = await collection.findOne(uid).exec();
      if (!doc) {
        throw new Error(`Property ${uid} not found`);
      }
      
      if (doc.is_system) {
        throw new Error('Cannot delete system properties');
      }
      
      await doc.remove();
      
      // If sync is enabled, also delete from Supabase
      if (this.syncEnabled.value && this.supabase) {
        await this.supabase
          .from('property_registry')
          .delete()
          .eq('uid', uid);
      }
      
    } catch (error) {
      console.error('[PropertyRegistryStore] Failed to delete property:', error);
      this.error.value = `Failed to delete property: ${error}`;
      throw error;
    } finally {
      this.loading.value = false;
    }
  }
  
  async clearAllProperties(): Promise<void> {
    this.loading.value = true;
    try {
      const db = await getDatabase();
      const collection = db.collections.property_registry as RxCollection<PropertyDefinition>;
      await collection.remove();
      console.log('[PropertyRegistryStore] All local properties cleared');
    } catch (error) {
      console.error('[PropertyRegistryStore] Failed to clear properties:', error);
      this.error.value = `Failed to clear properties: ${error}`;
      throw error;
    } finally {
      this.loading.value = false;
    }
  }
  
  async resetStore(): Promise<void> {
    console.log('[PropertyRegistryStore] Resetting store...');
    
    // Cancel subscriptions
    if (this.dbSubscription) {
      this.dbSubscription.unsubscribe();
      this.dbSubscription = null;
    }
    
    // Disable sync
    await this.disableSync();
    
    // Clear signals
    batch(() => {
      this.properties.value = new Map();
      this.loading.value = false;
      this.error.value = null;
    });
    
    // Reinitialize
    await this.initializeStore();
  }
  
  cleanup() {
    if (this.dbSubscription) {
      this.dbSubscription.unsubscribe();
      this.dbSubscription = null;
    }
    this.disableSync();
  }
}

// Export singleton instance
export const propertyRegistryStore = PropertyRegistrySignalStore.getInstance();