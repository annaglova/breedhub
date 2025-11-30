import { signal, computed } from '@preact/signals-react';
import { getDatabase } from '../services/database.service';
import { Subscription } from 'rxjs';
import { RxCollection, RxDocument } from 'rxdb';
import { EntityStore } from './base/entity-store';
import { dictionaryStore } from './dictionary-store.signal-store';
import { routeStore } from './route-store.signal-store';

// App config ID we're working with
const APP_CONFIG_ID = 'config_app_1757849573544';

// Types
export interface IconConfig {
  name: string;
  source: 'lucide' | 'custom';
}

interface Workspace {
  id: string;
  icon: string | IconConfig; // Support both string (legacy) and object (new)
  path: string;
  label: string;
  order?: number; // Order for display sorting
  spaces?: any;
}

interface AppConfig {
  id: string;
  data: {
    workspaces: Record<string, Workspace>;
  };
  deps?: string[];
  type?: string;
  caption?: string;
  version?: number;
}

// Universal entity interface
interface EntityData {
  id: string;
  [key: string]: any;
}

class AppStore {
  private static instance: AppStore;
  
  // Core signals
  appConfig = signal<AppConfig | null>(null);
  loading = signal<boolean>(true);
  error = signal<Error | null>(null);
  initialized = signal<boolean>(false);
  
  // Dynamic entity stores - each entity type gets its own EntityStore instance
  private entityStores = new Map<string, EntityStore<any>>();
  private entitySubscriptions = new Map<string, Subscription>();
  
  // Computed values
  workspaces = computed(() => {
    // Return empty array if config not loaded yet
    if (!this.appConfig.value?.data?.workspaces) return [];
    
    // Convert workspaces object to array
    return Object.entries(this.appConfig.value.data.workspaces).map(([key, workspace]) => ({
      ...workspace,
      configKey: key
    }));
  });
  
  // Computed to check if data is really loaded
  isDataLoaded = computed(() => {
    return !this.loading.value && this.appConfig.value !== null;
  });
  
  private dbSubscription: Subscription | null = null;
  
  private constructor() {
    this.initialize();
  }
  
  static getInstance(): AppStore {
    if (!AppStore.instance) {
      AppStore.instance = new AppStore();
    }
    return AppStore.instance;
  }
  
  async initialize() {
    // Prevent multiple initializations
    if (this.initialized.value) {
      return;
    }

    console.log('[AppStore] Initializing...');

    try {
      this.loading.value = true;
      this.error.value = null;

      // Get RxDB database
      const db = await getDatabase();

      if (!db.app_config) {
        console.error('[AppStore] app_config collection not found');
        this.error.value = new Error('app_config collection not initialized');
        return;
      }

      // Load app config
      const appConfigDoc = await db.app_config
        .findOne()
        .where('id')
        .eq(APP_CONFIG_ID)
        .exec();

      if (appConfigDoc) {
        this.appConfig.value = appConfigDoc.toJSON() as AppConfig;
        console.log('[AppStore] Loaded app config:', APP_CONFIG_ID);
      } else {
        console.warn('[AppStore] App config not found:', APP_CONFIG_ID);
      }

      // Subscribe to changes
      this.dbSubscription = db.app_config
        .findOne()
        .where('id')
        .eq(APP_CONFIG_ID)
        .$
        .subscribe(doc => {
          if (doc) {
            this.appConfig.value = doc.toJSON() as AppConfig;
            console.log('[AppStore] App config updated');
          }
        });

      this.initialized.value = true;

      // Initialize stores асинхронно (без await!)
      // Не блокуємо AppStore initialization
      this.initializeDictionaryStore();
      this.initializeRouteStore();

    } catch (err) {
      console.error('[AppStore] Failed to initialize:', err);
      this.error.value = err as Error;
    } finally {
      this.loading.value = false;
    }
  }

  /**
   * Initialize DictionaryStore in background
   * Called after AppStore is initialized
   * Runs asynchronously - doesn't block app startup
   */
  private async initializeDictionaryStore() {
    try {
      await dictionaryStore.initialize();
    } catch (error) {
      console.error('[AppStore] DictionaryStore initialization failed:', error);
      // Don't throw - app can work without dictionaries cache
    }
  }

  /**
   * Initialize RouteStore in background
   * Called after AppStore is initialized
   * Runs asynchronously - doesn't block app startup
   */
  private async initializeRouteStore() {
    try {
      await routeStore.initialize();
    } catch (error) {
      console.error('[AppStore] RouteStore initialization failed:', error);
      // Don't throw - app can work without route cache
    }
  }
  
  async reloadConfig() {
    console.log('[AppStore] Reloading config...');
    this.initialized.value = false;
    await this.initialize();
  }
  
  getWorkspaceById(id: string) {
    return this.workspaces.value.find(w => w.id === id);
  }
  
  getWorkspaceByPath(path: string) {
    return this.workspaces.value.find(w => w.path === path);
  }
  
  // Dynamic entity store methods
  getEntityStore<T extends EntityData>(entityName: string): EntityStore<T> | undefined {
    return this.entityStores.get(entityName) as EntityStore<T> | undefined;
  }
  
  async loadEntityConfig(entityName: string) {
    console.log(`[AppStore] Loading config for entity: ${entityName}`);
    
    try {
      const db = await getDatabase();
      
      // Look for entity-specific configs
      const fieldsConfig = await db.app_config
        .findOne()
        .where('id')
        .eq(`config_fields_${entityName}`)
        .exec();
      
      const sortConfig = await db.app_config
        .findOne()
        .where('id')
        .eq(`config_sort_${entityName}`)
        .exec();
      
      return {
        fields: fieldsConfig?.toJSON(),
        sort: sortConfig?.toJSON()
      };
    } catch (err) {
      console.error(`[AppStore] Failed to load config for ${entityName}:`, err);
      return null;
    }
  }
  
  async initializeEntityStore<T extends EntityData>(entityName: string) {
    console.log(`[AppStore] Initializing entity store: ${entityName}`);
    
    // Check if already initialized
    if (this.entityStores.has(entityName)) {
      console.log(`[AppStore] Entity store ${entityName} already initialized`);
      return this.entityStores.get(entityName);
    }
    
    // Create new entity store instance
    const entityStore = new EntityStore<T>();
    entityStore.setLoading(true);
    
    this.entityStores.set(entityName, entityStore);
    
    try {
      const db = await getDatabase();
      
      // Check if collection exists (for existing hardcoded collections like breeds, books)
      const collection = db[entityName as keyof typeof db] as RxCollection<T> | undefined;
      
      if (collection) {
        console.log(`[AppStore] Using existing collection: ${entityName}`);
        
        // Load initial data
        const allDocs = await collection.find().exec();
        const entities: T[] = allDocs.map((doc: RxDocument<T>) => doc.toJSON() as T);
        
        // Update store using Entity Store methods
        entityStore.setAll(entities);
        entityStore.setLoading(false);
        
        // Store collection reference separately if needed
        (entityStore as any).collection = collection;
        
        // Subscribe to changes
        const subscription = collection.$.subscribe((changeEvent: any) => {
          console.log(`[AppStore] ${entityName} change event:`, changeEvent.operation);
          
          if (changeEvent.operation === 'INSERT') {
            const data = changeEvent.documentData;
            if (data && data.id) {
              entityStore.addOne(data);
            }
          } else if (changeEvent.operation === 'UPDATE') {
            const data = changeEvent.documentData;
            if (data && data.id) {
              entityStore.upsertOne(data);
            }
          } else if (changeEvent.operation === 'DELETE') {
            const deleteId = changeEvent.documentId || changeEvent.documentData?.id;
            if (deleteId) {
              entityStore.removeOne(deleteId);
            }
          }
        });
        
        this.entitySubscriptions.set(entityName, subscription);
      } else {
        console.log(`[AppStore] Collection ${entityName} not found, will be created dynamically in future`);
        // TODO: Create dynamic collection from config
        entityStore.setLoading(false);
        entityStore.setError(`Collection ${entityName} not yet implemented`);
      }
    } catch (err) {
      console.error(`[AppStore] Failed to initialize entity store ${entityName}:`, err);
      entityStore.setLoading(false);
      entityStore.setError(err instanceof Error ? err.message : 'Failed to initialize entity store');
    }
    
    return entityStore;
  }
  
  // CRUD operations for dynamic entities
  async createEntity<T extends EntityData>(entityName: string, data: Partial<T>): Promise<T | null> {
    const entityStore = this.entityStores.get(entityName) as any;
    if (!entityStore?.collection) {
      console.error(`[AppStore] Collection ${entityName} not available`);
      return null;
    }
    
    try {
      const id = crypto.randomUUID();
      const newEntity = {
        ...data,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _deleted: false
      } as T;
      
      await entityStore.collection.insert(newEntity);
      entityStore.addOne(newEntity);
      console.log(`[AppStore] Created ${entityName}:`, id);
      return newEntity;
    } catch (error) {
      console.error(`[AppStore] Failed to create ${entityName}:`, error);
      throw error;
    }
  }
  
  async updateEntity<T extends EntityData>(entityName: string, id: string, updates: Partial<T>): Promise<void> {
    const entityStore = this.entityStores.get(entityName) as any;
    if (!entityStore?.collection) {
      console.error(`[AppStore] Collection ${entityName} not available`);
      return;
    }
    
    try {
      const doc = await entityStore.collection.findOne(id).exec();
      if (!doc) {
        throw new Error(`${entityName} ${id} not found`);
      }
      
      const patchData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await doc.patch(patchData);
      
      entityStore.updateOne(id, patchData);
      console.log(`[AppStore] Updated ${entityName}:`, id);
    } catch (error) {
      console.error(`[AppStore] Failed to update ${entityName}:`, error);
      throw error;
    }
  }
  
  async deleteEntity(entityName: string, id: string): Promise<void> {
    const entityStore = this.entityStores.get(entityName) as any;
    if (!entityStore?.collection) {
      console.error(`[AppStore] Collection ${entityName} not available`);
      return;
    }
    
    try {
      const doc = await entityStore.collection.findOne(id).exec();
      if (!doc) {
        throw new Error(`${entityName} ${id} not found`);
      }
      
      // Soft delete
      await doc.patch({
        _deleted: true,
        updatedAt: new Date().toISOString()
      });
      
      entityStore.removeOne(id);
      console.log(`[AppStore] Deleted ${entityName}:`, id);
    } catch (error) {
      console.error(`[AppStore] Failed to delete ${entityName}:`, error);
      throw error;
    }
  }
  
  dispose() {
    // Clean up entity subscriptions
    this.entitySubscriptions.forEach(sub => sub.unsubscribe());
    this.entitySubscriptions.clear();
    
    // Clean up main subscription
    if (this.dbSubscription) {
      this.dbSubscription.unsubscribe();
      this.dbSubscription = null;
    }
  }
}

// Export singleton instance
export const appStore = AppStore.getInstance();