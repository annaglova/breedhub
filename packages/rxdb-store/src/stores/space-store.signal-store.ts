import { signal, computed } from '@preact/signals-react';
import { getDatabase } from '../services/database.service';
import { Subscription } from 'rxjs';
import { RxCollection, RxDocument, RxJsonSchema } from 'rxdb';
import { EntityStore } from './base/entity-store';
import { appStore } from './app-store.signal-store';

// Universal entity interface for all business entities
interface BusinessEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
  _deleted?: boolean;
  [key: string]: any;
}

// Configuration interfaces
interface SpaceConfig {
  id: string;
  icon?: string;
  path?: string;
  label?: string;
  entitySchemaName?: string;
  fields?: Record<string, FieldConfig>;
  sort_fields?: Record<string, any>;
  rows?: number;
  pages?: Record<string, any>;
  views?: Record<string, any>;
}

interface FieldConfig {
  fieldType: string;
  displayName: string;
  required?: boolean;
  isSystem?: boolean;
  isUnique?: boolean;
  isPrimaryKey?: boolean;
  maxLength?: number;
  validation?: any;
  permissions?: any;
  defaultValue?: any;
  component?: string;
}

/**
 * SpaceStore - Universal dynamic store for ALL business entities
 * 
 * This store dynamically creates and manages entity stores for any business entity type
 * based on configurations. It creates RxDB collections on-the-fly and provides
 * a unified interface for all CRUD operations.
 * 
 * Key features:
 * - Dynamic entity store creation
 * - Configuration-driven schema generation
 * - Automatic RxDB collection creation
 * - Universal CRUD operations
 * - Real-time sync with RxDB
 */
class SpaceStore {
  private static instance: SpaceStore;
  
  // Core state
  loading = signal<boolean>(false);
  error = signal<Error | null>(null);
  initialized = signal<boolean>(false);
  
  // Reference to AppStore
  private appStore = appStore;
  
  // Dynamic entity stores - one EntityStore per entity type
  private entityStores = new Map<string, EntityStore<BusinessEntity>>();
  private entitySubscriptions = new Map<string, Subscription>();
  private spaceConfigs = new Map<string, SpaceConfig>();
  
  // Track which entity types are available
  availableEntityTypes = signal<string[]>([]);
  
  // Computed values
  isLoading = computed(() => this.loading.value);
  hasError = computed(() => this.error.value !== null);
  
  private constructor() {
    this.initialize();
  }
  
  static getInstance(): SpaceStore {
    if (!SpaceStore.instance) {
      SpaceStore.instance = new SpaceStore();
    }
    return SpaceStore.instance;
  }
  
  async initialize() {
    if (this.initialized.value) {
      return;
    }
    
    console.log('[SpaceStore] Initializing...');
    
    try {
      this.loading.value = true;
      this.error.value = null;
      
      // Wait for AppStore to initialize
      if (!this.appStore.initialized.value) {
        await this.appStore.initialize();
      }
      
      // Get app config from AppStore
      const appConfig = this.appStore.appConfig.value;
      
      if (!appConfig) {
        throw new Error('App config not available');
      }
      
      // Parse space configurations
      this.parseSpaceConfigurations(appConfig);
      
      // Subscribe to app config changes
      // TODO: Add subscription to appConfig changes
      
      this.initialized.value = true;
      console.log('[SpaceStore] Initialized with entity types:', this.availableEntityTypes.value);
      
    } catch (err) {
      console.error('[SpaceStore] Failed to initialize:', err);
      this.error.value = err as Error;
    } finally {
      this.loading.value = false;
    }
  }
  
  /**
   * Collect all unique fields from all levels of space config
   * Fields can be in: space.fields, pages, views, tabs
   * According to config-types.ts:
   * - view can have fields
   * - page can have fields and tabs
   * - tab can have fields
   */
  private collectUniqueFields(space: any, appConfig: any): Map<string, FieldConfig> {
    const uniqueFields = new Map<string, FieldConfig>();
    
    // Helper function to process fields taking only self_data
    const processFields = (fields: any) => {
      if (!fields) return;
      
      Object.entries(fields).forEach(([fieldKey, fieldValue]: [string, any]) => {
        // Skip if already processed
        if (uniqueFields.has(fieldKey)) return;
        
        // Take only self_data as the source of truth (as user requested)
        const fieldData = fieldValue.self_data || fieldValue;
        
        // These are the true field definitions from database
        const fieldConfig: FieldConfig = {
          fieldType: fieldData.fieldType || 'string',
          displayName: fieldData.displayName || fieldKey,
          required: fieldData.required || false,
          isSystem: fieldData.isSystem || false,
          isUnique: fieldData.isUnique || false,
          isPrimaryKey: fieldData.isPrimaryKey || false,
          maxLength: fieldData.maxLength,
          validation: fieldData.validation,
          permissions: fieldData.permissions,
          defaultValue: fieldData.defaultValue,
          component: fieldData.component
        };
        
        uniqueFields.set(fieldKey, fieldConfig);
      });
    };
    
    // Soft recursive search for any 'fields' property in the JSON tree
    const recursiveFieldSearch = (obj: any, visited: Set<any> = new Set()) => {
      // Avoid circular references
      if (!obj || typeof obj !== 'object' || visited.has(obj)) return;
      visited.add(obj);
      
      // Process fields if found at this level
      if (obj.fields && typeof obj.fields === 'object') {
        processFields(obj.fields);
      }
      
      // Recursively search all properties
      Object.values(obj).forEach((value: any) => {
        if (value && typeof value === 'object') {
          recursiveFieldSearch(value, visited);
        }
      });
    };
    
    // Start recursive search from space root
    recursiveFieldSearch(space);
    
    // Also process deps if present (load field configs from deps array)
    if (space.deps && Array.isArray(space.deps)) {
      // Find the configs for deps in appConfig
      space.deps.forEach((depId: string) => {
        const depConfig = this.findConfigById(depId, appConfig);
        if (depConfig) {
          recursiveFieldSearch(depConfig);
        }
      });
    }
    
    console.log(`[SpaceStore] Collected ${uniqueFields.size} unique fields for space using soft recursive search`);
    return uniqueFields;
  }
  
  /**
   * Helper to find a config by ID in the full app config
   */
  private findConfigById(id: string, appConfig: any): any {
    // Recursive search for config by id
    const search = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return null;
      
      if (obj.id === id) return obj;
      
      // Search in all properties
      for (const value of Object.values(obj)) {
        const result = search(value);
        if (result) return result;
      }
      
      return null;
    };
    
    return search(appConfig);
  }
  
  /**
   * Parse space configurations from app config hierarchy
   */
  private parseSpaceConfigurations(appConfig: any) {
    if (!appConfig?.data?.workspaces) {
      console.warn('[SpaceStore] No workspaces found in app config');
      return;
    }
    
    const entityTypes: string[] = [];
    this.spaceConfigs.clear();
    
    // Iterate through workspaces
    Object.entries(appConfig.data.workspaces).forEach(([workspaceKey, workspace]: [string, any]) => {
      if (workspace.spaces) {
        // Iterate through spaces in workspace
        Object.entries(workspace.spaces).forEach(([spaceKey, space]: [string, any]) => {
          // Check for entitySchemaName
          if (space.entitySchemaName) {
            // Collect all unique fields from all levels
            const uniqueFields = this.collectUniqueFields(space, appConfig);
            
            const spaceConfig: SpaceConfig = {
              id: space.id || spaceKey,
              icon: space.icon,
              path: space.path,
              label: space.label,
              entitySchemaName: space.entitySchemaName,
              fields: Object.fromEntries(uniqueFields),
              sort_fields: space.sort_fields,
              rows: space.rows,
              pages: space.pages,
              views: space.views
            };
            
            this.spaceConfigs.set(space.entitySchemaName, spaceConfig);
            entityTypes.push(space.entitySchemaName);
            
            console.log(`[SpaceStore] Found entity '${space.entitySchemaName}' in space '${spaceKey}'`);
          }
        });
      }
    });
    
    this.availableEntityTypes.value = entityTypes;
  }
  
  /**
   * Get or create an entity store for the given entity type
   */
  async getEntityStore<T extends BusinessEntity>(entityType: string): Promise<EntityStore<T> | null> {
    // Check if store already exists
    if (this.entityStores.has(entityType)) {
      console.log(`[SpaceStore] Returning existing store for ${entityType}`);
      return this.entityStores.get(entityType) as EntityStore<T>;
    }
    
    // Check if we have config for this entity
    if (!this.spaceConfigs.has(entityType)) {
      console.error(`[SpaceStore] No space config found for entity type: ${entityType}`);
      return null;
    }
    
    // Create new entity store
    console.log(`[SpaceStore] Creating new store for ${entityType}`);
    
    try {
      const entityStore = new EntityStore<T>();
      entityStore.setLoading(true);
      
      // Store it
      this.entityStores.set(entityType, entityStore as EntityStore<BusinessEntity>);
      
      // Initialize with RxDB collection
      await this.initializeEntityCollection(entityType, entityStore);
      
      return entityStore;
      
    } catch (err) {
      console.error(`[SpaceStore] Failed to create entity store for ${entityType}:`, err);
      return null;
    }
  }
  
  /**
   * Initialize RxDB collection for entity type
   */
  private async initializeEntityCollection<T extends BusinessEntity>(
    entityType: string, 
    entityStore: EntityStore<T>
  ) {
    const db = await getDatabase();
    
    // Check if collection already exists
    let collection = (db as any)[entityType] as RxCollection<T> | undefined;
    
    if (!collection) {
      // Create dynamic collection from config
      console.log(`[SpaceStore] Creating dynamic collection for ${entityType}`);
      
      const schema = await this.generateSchemaForEntity(entityType);
      
      if (schema) {
        // Create collection dynamically
        const collections = await db.addCollections({
          [entityType]: {
            schema: schema,
            migrationStrategies: {}
          }
        });
        
        collection = collections[entityType];
        console.log(`[SpaceStore] Created collection ${entityType}`);
      }
    }
    
    if (collection) {
      // LIFECYCLE HOOK: onInit - Load initial data
      const allDocs = await collection.find().exec();
      const entities: T[] = allDocs.map((doc: RxDocument<T>) => doc.toJSON() as T);
      
      // Update store with autoSelectFirst enabled
      entityStore.setAll(entities, true); // Auto-select first entity
      entityStore.setLoading(false);
      
      // Store collection reference
      (entityStore as any).collection = collection;
      
      // Subscribe to changes
      const subscription = collection.$.subscribe((changeEvent: any) => {
        console.log(`[SpaceStore] ${entityType} change event:`, changeEvent.operation);
        
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
      
      this.entitySubscriptions.set(entityType, subscription);
      
    } else {
      entityStore.setLoading(false);
      entityStore.setError(`Failed to create collection for ${entityType}`);
    }
  }
  
  /**
   * Generate RxDB schema from space configuration
   */
  private async generateSchemaForEntity(entityType: string): Promise<RxJsonSchema<BusinessEntity> | null> {
    const spaceConfig = this.spaceConfigs.get(entityType);
    
    if (!spaceConfig || !spaceConfig.fields) {
      console.error(`[SpaceStore] No space configuration or fields found for ${entityType}`);
      return null;
    }
    
    // Build schema properties from unique collected fields
    const properties: any = {};
    const required: string[] = [];
    
    // Process collected unique fields
    Object.entries(spaceConfig.fields).forEach(([fieldKey, fieldConfig]: [string, FieldConfig]) => {
      // Extract field name (remove prefix like 'breed_field_')
      const fieldName = fieldKey.replace(new RegExp(`^${entityType}_field_`), '');
      
      // Map fieldType to RxDB schema type
      let schemaType = 'string';
      switch (fieldConfig.fieldType) {
        case 'uuid':
        case 'string':
        case 'text':
          schemaType = 'string';
          break;
        case 'number':
        case 'integer':
          schemaType = 'number';
          break;
        case 'boolean':
          schemaType = 'boolean';
          break;
        case 'json':
        case 'object':
          schemaType = 'object';
          break;
        case 'array':
          schemaType = 'array';
          break;
      }
      
      properties[fieldName] = {
        type: schemaType
      };
      
      // Add maxLength if specified
      if (fieldConfig.maxLength && schemaType === 'string') {
        properties[fieldName].maxLength = fieldConfig.maxLength;
      }
      
      // Mark as required if needed
      if (fieldConfig.required || fieldConfig.isPrimaryKey) {
        required.push(fieldName);
      }
    });
    
    // Add system fields if not already present
    if (!properties.id) {
      properties.id = { type: 'string', maxLength: 100 };
      required.push('id');
    }
    if (!properties.created_at) {
      properties.created_at = { type: 'string' };
    }
    if (!properties.updated_at) {
      properties.updated_at = { type: 'string' };
    }
    if (!properties._deleted) {
      properties._deleted = { type: 'boolean' };
    }
    
    // Create schema
    const schema: RxJsonSchema<BusinessEntity> = {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties,
      required: required.length > 0 ? required : ['id']
    };
    
    console.log(`[SpaceStore] Generated schema for ${entityType} with ${Object.keys(properties).length} properties`);
    return schema;
  }
  
  // Universal CRUD operations
  
  /**
   * Create a new entity
   */
  async create<T extends BusinessEntity>(entityType: string, data: Partial<T>): Promise<T | null> {
    const entityStore = await this.getEntityStore<T>(entityType);
    
    if (!entityStore) {
      console.error(`[SpaceStore] Entity store for ${entityType} not available`);
      return null;
    }
    
    const collection = (entityStore as any).collection;
    
    if (!collection) {
      console.error(`[SpaceStore] Collection for ${entityType} not available`);
      return null;
    }
    
    try {
      const id = crypto.randomUUID();
      const newEntity = {
        ...data,
        id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _deleted: false
      } as T;
      
      await collection.insert(newEntity);
      entityStore.addOne(newEntity);
      
      console.log(`[SpaceStore] Created ${entityType}:`, id);
      return newEntity;
      
    } catch (error) {
      console.error(`[SpaceStore] Failed to create ${entityType}:`, error);
      throw error;
    }
  }
  
  /**
   * Update an entity
   */
  async update<T extends BusinessEntity>(
    entityType: string, 
    id: string, 
    updates: Partial<T>
  ): Promise<void> {
    const entityStore = await this.getEntityStore<T>(entityType);
    
    if (!entityStore) {
      console.error(`[SpaceStore] Entity store for ${entityType} not available`);
      return;
    }
    
    const collection = (entityStore as any).collection;
    
    if (!collection) {
      console.error(`[SpaceStore] Collection for ${entityType} not available`);
      return;
    }
    
    try {
      const doc = await collection.findOne(id).exec();
      
      if (!doc) {
        throw new Error(`${entityType} ${id} not found`);
      }
      
      const patchData = {
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      await doc.patch(patchData);
      entityStore.updateOne(id, patchData);
      
      console.log(`[SpaceStore] Updated ${entityType}:`, id);
      
    } catch (error) {
      console.error(`[SpaceStore] Failed to update ${entityType}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete an entity (soft delete)
   */
  async delete(entityType: string, id: string): Promise<void> {
    const entityStore = await this.getEntityStore<BusinessEntity>(entityType);
    
    if (!entityStore) {
      console.error(`[SpaceStore] Entity store for ${entityType} not available`);
      return;
    }
    
    const collection = (entityStore as any).collection;
    
    if (!collection) {
      console.error(`[SpaceStore] Collection for ${entityType} not available`);
      return;
    }
    
    try {
      const doc = await collection.findOne(id).exec();
      
      if (!doc) {
        throw new Error(`${entityType} ${id} not found`);
      }
      
      // Soft delete
      await doc.patch({
        _deleted: true,
        updated_at: new Date().toISOString()
      });
      
      entityStore.removeOne(id);
      
      console.log(`[SpaceStore] Deleted ${entityType}:`, id);
      
    } catch (error) {
      console.error(`[SpaceStore] Failed to delete ${entityType}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all entities of a type
   */
  async getAll<T extends BusinessEntity>(entityType: string): Promise<T[]> {
    const entityStore = await this.getEntityStore<T>(entityType);
    
    if (!entityStore) {
      return [];
    }
    
    return entityStore.entityList.value;
  }
  
  /**
   * Get entity by ID
   */
  async getById<T extends BusinessEntity>(entityType: string, id: string): Promise<T | undefined> {
    const entityStore = await this.getEntityStore<T>(entityType);
    
    if (!entityStore) {
      return undefined;
    }
    
    return entityStore.selectById(id);
  }
  
  /**
   * Find entities by predicate
   */
  async find<T extends BusinessEntity>(
    entityType: string, 
    predicate: (entity: T) => boolean
  ): Promise<T[]> {
    const entityStore = await this.getEntityStore<T>(entityType);
    
    if (!entityStore) {
      return [];
    }
    
    return entityStore.selectWhere(predicate);
  }
  
  /**
   * Initialize entity with lifecycle hooks
   * Similar to Angular's withHooks onInit
   */
  async initializeEntity(entityType: string): Promise<void> {
    const entityStore = await this.getEntityStore(entityType);
    
    if (!entityStore) {
      throw new Error(`Failed to initialize entity: ${entityType}`);
    }
    
    console.log(`[SpaceStore] Entity ${entityType} initialized with ${entityStore.total.value} items`);
    
    // Auto-select first if not already selected
    if (!entityStore.hasSelection.value && !entityStore.isEmpty.value) {
      entityStore.selectFirst();
      console.log(`[SpaceStore] Auto-selected first ${entityType}`);
    }
  }
  
  /**
   * Cleanup entity with lifecycle hooks
   * Similar to Angular's withHooks onDestroy
   */
  cleanupEntity(entityType: string): void {
    console.log(`[SpaceStore] Cleaning up entity ${entityType}`);
    
    // Clean up subscription
    const subscription = this.entitySubscriptions.get(entityType);
    if (subscription) {
      subscription.unsubscribe();
      this.entitySubscriptions.delete(entityType);
    }
    
    // Clear store data
    const entityStore = this.entityStores.get(entityType);
    if (entityStore) {
      entityStore.reset();
      this.entityStores.delete(entityType);
    }
    
    console.log(`[SpaceStore] Entity ${entityType} cleaned up`);
  }
  
  /**
   * Dispose of all resources
   * LIFECYCLE: Global cleanup
   */
  dispose() {
    console.log('[SpaceStore] Disposing all resources...');
    
    // Clean up all entities
    this.availableEntityTypes.value.forEach(entityType => {
      this.cleanupEntity(entityType);
    });
    
    // Clear configurations
    this.spaceConfigs.clear();
    
    // Reset state
    this.initialized.value = false;
    this.availableEntityTypes.value = [];
    
    console.log('[SpaceStore] Disposed');
  }
}

// Export singleton instance
export const spaceStore = SpaceStore.getInstance();