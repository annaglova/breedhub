import { signal, computed, batch } from '@preact/signals-react';
import { getDatabase } from '../services/database.service';
import { createClient } from '@supabase/supabase-js';
import { Subscription } from 'rxjs';
import type { RxCollection } from 'rxdb';
import { PropertyDefinition, PropertyDocument } from '../types/property-registry.types';

// Re-export types for backward compatibility
export type { PropertyDefinition, PropertyDocument } from '../types/property-registry.types';

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
      .filter(prop => !prop._deleted)
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
  private realtimeChannel: any = null;
  private isRealTimeEnabled = false;
  
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
    console.log('[PropertyRegistryStore] Initializing store...');
    console.log('[PropertyRegistryStore] Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('[PropertyRegistryStore] Has Supabase client:', !!this.supabase);
    
    try {
      this.loading.value = true;
      const db = await getDatabase();
      console.log('[PropertyRegistryStore] Got database:', !!db);
      console.log('[PropertyRegistryStore] Database collections:', db.collections);
      console.log('[PropertyRegistryStore] Has property_registry?:', !!db.collections?.property_registry);
      console.log('[PropertyRegistryStore] Direct access property_registry?:', !!db.property_registry);
      
      // Try both ways to access collection
      const collection = db.property_registry || db.collections?.property_registry;
      
      if (!collection) {
        console.error('[PropertyRegistryStore] property_registry collection not found in database');
        console.error('[PropertyRegistryStore] Available collections:', Object.keys(db.collections || {}));
        this.error.value = 'Property registry collection not initialized';
        return;
      }
      
      // Load initial data
      console.log('[PropertyRegistryStore] Loading initial data from RxDB...');
      const allProperties = await collection.find().exec();
      console.log('[PropertyRegistryStore] Found properties in RxDB:', allProperties.length);
      const propsMap = new Map<string, PropertyDefinition>();
      
      allProperties.forEach((doc: PropertyDocument) => {
        const propData = doc.toJSON() as PropertyDefinition;
        console.log('[PropertyRegistryStore] Adding property to map:', propData.id, propData.name);
        propsMap.set(doc.id, propData);
      });
      
      this.properties.value = propsMap;
      console.log('[PropertyRegistryStore] Loaded initial properties:', propsMap.size);
      console.log('[PropertyRegistryStore] Properties list length:', this.propertiesList.value.length);
      
      // Subscribe to ALL collection changes with find().$ instead of just .$
      // This ensures we get bulk changes too
      this.dbSubscription = collection.find().$.subscribe((docs: PropertyDocument[]) => {
        console.log('[PropertyRegistryStore] Collection changed, documents:', docs.length);
        
        const newProps = new Map<string, PropertyDefinition>();
        docs.forEach((doc: PropertyDocument) => {
          if (!doc._deleted) {
            newProps.set(doc.id, doc.toJSON() as PropertyDefinition);
          }
        });
        
        this.properties.value = newProps;
        console.log('[PropertyRegistryStore] Updated properties map:', newProps.size);
      });
      
      // Automatically enable sync if Supabase is configured
      if (this.supabase) {
        try {
          await this.enableSync();
          // Setup real-time subscription for immediate updates
          await this.setupRealtimeSubscription();
        } catch (syncError) {
          console.error('[PropertyRegistryStore] Failed to enable sync:', syncError);
          // Don't fail initialization if sync fails - we can work offline
        }
      }
      
    } catch (error) {
      console.error('[PropertyRegistryStore] Initialization error:', error);
      this.error.value = error instanceof Error ? error.message : 'Failed to initialize store';
    } finally {
      this.loading.value = false;
    }
  }
  
  async enableSync(): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    try {
      console.log('[PropertyRegistryStore] Enabling Supabase sync...');
      const db = await getDatabase();
      const collection = db.collections.property_registry as RxCollection<PropertyDefinition>;
      
      // Pull from Supabase
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
        
        // Map Supabase fields to RxDB fields - simple mapping like books
        const mappedData = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          data_type: item.data_type || '',
          caption: item.caption,
          component: item.component,
          config: item.config,
          mixins: item.mixins || [],
          tags: item.tags || [],
          category: item.category || '',
          version: item.version,
          is_system: item.is_system,
          created_at: item.created_at,
          updated_at: item.updated_at,
          created_by: item.created_by || '', // Use empty string for RxDB schema compatibility
          _deleted: item.deleted || false
        }));
        
        // Bulk upsert into RxDB
        const result = await collection.bulkUpsert(mappedData);
        console.log('[PropertyRegistryStore] Properties synced successfully, upserted:', result.success.length);
        
        // Force update the signal because subscription might not trigger for bulkUpsert
        const afterSync = await collection.find().exec();
        const newPropsMap = new Map<string, PropertyDefinition>();
        afterSync.forEach((doc: PropertyDocument) => {
          if (!doc._deleted) {
            newPropsMap.set(doc.id, doc.toJSON() as PropertyDefinition);
          }
        });
        this.properties.value = newPropsMap;
        console.log('[PropertyRegistryStore] Force updated properties signal:', newPropsMap.size);
      }
      
      this.syncEnabled.value = true;
      
    } catch (error) {
      console.error('[PropertyRegistryStore] Failed to enable sync:', error);
      throw error;
    }
  }
  
  async disableSync(): Promise<void> {
    this.syncEnabled.value = false;
    console.log('[PropertyRegistryStore] Sync disabled');
  }
  
  async createProperty(property: Omit<PropertyDefinition, 'created_at' | 'updated_at'>): Promise<PropertyDefinition> {
    console.log('[PropertyRegistryStore] Creating property:', property);
    
    try {
      this.loading.value = true;
      this.error.value = null;
      
      const db = await getDatabase();
      // Use provided ID or generate new one
      const id = (property as any).id || crypto.randomUUID();
      
      const newProperty: PropertyDefinition = {
        id,
        name: property.name,
        type: property.type,
        caption: property.caption,
        component: property.component,
        data_type: property.data_type || '',
        category: property.category || '',
        config: property.config || {},
        mixins: property.mixins || [],
        tags: property.tags || [],
        version: property.version || 1,
        is_system: property.is_system || false,
        created_by: property.created_by || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _deleted: false
      };
      
      // Just insert into RxDB - let realtime sync handle Supabase
      await db.property_registry.insert(newProperty);
      console.log('[PropertyRegistryStore] Property created successfully:', id);
      
      // Force update the signal immediately for UI reactivity
      const newProps = new Map(this.properties.value);
      newProps.set(id, newProperty);
      this.properties.value = newProps;
      console.log('[PropertyRegistryStore] Signal updated with new property');
      
      // If sync is enabled, push to Supabase manually for immediate sync
      if (this.syncEnabled.value && this.supabase) {
        const { _deleted, created_by, ...supabaseData } = newProperty;
        try {
          const insertData: any = {
            ...supabaseData,
            deleted: _deleted || false
          };
          
          // Only add created_by if it's a valid UUID
          if (created_by && created_by.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            insertData.created_by = created_by;
          }
          
          const { data, error } = await this.supabase
            .from('property_registry')
            .insert(insertData)
            .select();
            
          if (error) {
            console.error('[PropertyRegistryStore] Supabase insert error:', error);
            throw error;
          }
          
          console.log('[PropertyRegistryStore] Supabase insert successful:', data);
        } catch (syncError) {
          console.error('[PropertyRegistryStore] Supabase sync error (non-blocking):', syncError);
          // Don't throw - let it work offline
        }
      }
      
      return newProperty;
    } catch (error) {
      console.error('[PropertyRegistryStore] Create property error:', error);
      this.error.value = error instanceof Error ? error.message : 'Failed to create property';
      throw error;
    } finally {
      this.loading.value = false;
    }
  }
  
  async updateProperty(id: string, updates: Partial<PropertyDefinition>): Promise<void> {
    console.log('[PropertyRegistryStore] Updating property:', id, updates);
    
    try {
      this.loading.value = true;
      this.error.value = null;
      
      const db = await getDatabase();
      const doc = await db.property_registry.findOne(id).exec();
      
      if (!doc) {
        throw new Error(`Property ${id} not found`);
      }
      
      console.log('[PropertyRegistryStore] Before update:', doc.toJSON());
      
      await doc.patch({
        ...updates,
        updated_at: new Date().toISOString()
      });
      
      // patch() automatically saves to IndexedDB
      
      // Verify the update
      const updatedDoc = await db.property_registry.findOne(id).exec();
      console.log('[PropertyRegistryStore] After update:', updatedDoc?.toJSON());
      
      // Force update the signal immediately for UI reactivity
      if (updatedDoc) {
        const newProps = new Map(this.properties.value);
        newProps.set(id, updatedDoc.toJSON() as PropertyDefinition);
        this.properties.value = newProps;
        console.log('[PropertyRegistryStore] Signal updated with updated property');
      }
      
      console.log('[PropertyRegistryStore] Property updated successfully:', id);
      
      // If sync is enabled, push update to Supabase for immediate sync
      if (this.syncEnabled.value && this.supabase) {
        const { _deleted, created_by, ...supabaseUpdates } = updates;
        try {
          const supabaseData: any = {
            ...supabaseUpdates,
            updated_at: new Date().toISOString()
          };
          
          if (_deleted !== undefined) {
            supabaseData.deleted = _deleted;
          }
          if (created_by !== undefined) {
            supabaseData.created_by = created_by || null;
          }
          
          await this.supabase
            .from('property_registry')
            .update(supabaseData)
            .eq('id', id);
        } catch (syncError) {
          console.error('[PropertyRegistryStore] Supabase sync error (non-blocking):', syncError);
          // Don't throw - let it work offline
        }
      }
      
    } catch (error) {
      console.error('[PropertyRegistryStore] Update property error:', error);
      this.error.value = error instanceof Error ? error.message : 'Failed to update property';
      throw error;
    } finally {
      this.loading.value = false;
    }
  }
  
  async deleteProperty(id: string): Promise<void> {
    console.log('[PropertyRegistryStore] Deleting property:', id);
    
    try {
      this.loading.value = true;
      this.error.value = null;
      
      const db = await getDatabase();
      const doc = await db.property_registry.findOne(id).exec();
      
      if (!doc) {
        throw new Error(`Property ${id} not found`);
      }
      
      console.log('[PropertyRegistryStore] Before delete, _deleted:', doc._deleted);
      
      // Soft delete
      await doc.patch({
        _deleted: true,
        updated_at: new Date().toISOString()
      });
      
      // Verify the deletion
      const updatedDoc = await db.property_registry.findOne(id).exec();
      console.log('[PropertyRegistryStore] After delete, _deleted:', updatedDoc?._deleted);
      
      // Force remove from signal immediately for UI reactivity
      const newProps = new Map(this.properties.value);
      newProps.delete(id);
      this.properties.value = newProps;
      console.log('[PropertyRegistryStore] Signal updated - property removed');
      
      console.log('[PropertyRegistryStore] Property deleted successfully:', id);
      
      // If sync is enabled, also soft delete in Supabase for immediate sync
      if (this.syncEnabled.value && this.supabase) {
        try {
          await this.supabase
            .from('property_registry')
            .update({ 
              deleted: true, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', id);
        } catch (syncError) {
          console.error('[PropertyRegistryStore] Supabase sync error (non-blocking):', syncError);
          // Don't throw - let it work offline
        }
      }
      
    } catch (error) {
      console.error('[PropertyRegistryStore] Delete property error:', error);
      this.error.value = error instanceof Error ? error.message : 'Failed to delete property';
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
      this.properties.value = new Map();
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
    
    // Clear signals
    batch(() => {
      this.properties.value = new Map();
      this.loading.value = false;
      this.error.value = null;
      this.syncEnabled.value = false;
    });
    
    // Reinitialize
    await this.initializeStore();
  }
  
  private async setupRealtimeSubscription() {
    console.log('[PropertyRegistryStore] Setting up realtime subscription...');
    
    // Check if we already have a channel
    if (this.realtimeChannel) {
      console.log('[PropertyRegistryStore] Realtime channel already exists, cleaning up...');
      await this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    
    try {
      // Subscribe to all changes on the property_registry table
      this.realtimeChannel = this.supabase
        .channel('property-registry-changes')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'property_registry' 
          },
          async (payload: any) => {
            console.log('[PropertyRegistryStore] 🔴 REALTIME EVENT RECEIVED:', {
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
              timestamp: new Date().toISOString()
            });
            
            const db = await getDatabase();
            const collection = db.collections.property_registry as RxCollection<PropertyDefinition>;
            if (!collection) return;
            
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const supabaseProperty = payload.new;
              
              // Map Supabase fields to RxDB fields
              const rxdbProperty: PropertyDefinition = {
                id: supabaseProperty.id,
                name: supabaseProperty.name,
                type: supabaseProperty.type,
                data_type: supabaseProperty.data_type || '',
                caption: supabaseProperty.caption,
                component: supabaseProperty.component,
                config: supabaseProperty.config,
                mixins: supabaseProperty.mixins || [],
                tags: supabaseProperty.tags || [],
                category: supabaseProperty.category || '',
                version: supabaseProperty.version,
                is_system: supabaseProperty.is_system,
                created_at: supabaseProperty.created_at,
                updated_at: supabaseProperty.updated_at,
                created_by: supabaseProperty.created_by || '', // Use empty string for RxDB schema compatibility
                _deleted: supabaseProperty.deleted || false
              };
              
              try {
                // Check if document exists
                const existing = await collection.findOne(rxdbProperty.id).exec();
                
                if (existing) {
                  // Only update if Supabase version is newer
                  if (new Date(rxdbProperty.updated_at) > new Date(existing.updated_at)) {
                    await existing.patch(rxdbProperty);
                    console.log('[PropertyRegistryStore] Realtime: Updated property', rxdbProperty.id);
                  }
                } else {
                  // Insert new document
                  await collection.insert(rxdbProperty);
                  console.log('[PropertyRegistryStore] Realtime: Inserted property', rxdbProperty.id);
                }
              } catch (err) {
                console.error('[PropertyRegistryStore] Realtime sync error:', err);
              }
            } else if (payload.eventType === 'DELETE') {
              const propertyId = (payload.old as any).id;
              
              try {
                const existing = await collection.findOne(propertyId).exec();
                if (existing) {
                  await existing.patch({ 
                    _deleted: true,
                    updated_at: new Date().toISOString()
                  });
                  console.log('[PropertyRegistryStore] Realtime: Marked as deleted', propertyId);
                }
              } catch (err) {
                console.error('[PropertyRegistryStore] Realtime delete error:', err);
              }
            }
          }
        )
        .subscribe((status: string) => {
          console.log('[PropertyRegistryStore] 🟢 Realtime subscription status:', status);
          if (status === 'SUBSCRIBED') {
            this.isRealTimeEnabled = true;
            console.log('[PropertyRegistryStore] ✅ REALTIME WEBSOCKET CONNECTED! Listening for changes...');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[PropertyRegistryStore] ❌ Realtime connection error!');
            this.isRealTimeEnabled = false;
          } else if (status === 'TIMED_OUT') {
            console.error('[PropertyRegistryStore] ⏱️ Realtime connection timeout!');
            this.isRealTimeEnabled = false;
          } else if (status === 'CLOSED') {
            console.log('[PropertyRegistryStore] Realtime connection closed');
            this.isRealTimeEnabled = false;
          }
        });
    } catch (error) {
      console.error('[PropertyRegistryStore] Realtime setup failed:', error);
      this.isRealTimeEnabled = false;
    }
  }
  
  cleanup() {
    if (this.dbSubscription) {
      this.dbSubscription.unsubscribe();
      this.dbSubscription = null;
    }
    
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
      this.isRealTimeEnabled = false;
    }
  }
}

// Export singleton instance
export const propertyRegistryStore = PropertyRegistrySignalStore.getInstance();