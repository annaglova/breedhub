import { signal, computed } from '@preact/signals-react';
import { getDatabase } from '../services/database.service';
import { Subscription } from 'rxjs';
import { RxCollection, RxDocument, RxJsonSchema } from 'rxdb';
import { EntityStore } from './base/entity-store';
import { appStore } from './app-store.signal-store';
import { SupabaseLoaderService, LoaderOptions, SyncOptions } from '../services/supabase-loader.service';
import { entityReplicationService } from '../services/entity-replication.service';

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
  filter_fields?: Record<string, any>;
  rows?: number;
  pages?: Record<string, any>;
  views?: Record<string, any>;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
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
  configReady = signal<boolean>(false); // Config is ready for UI even before collections are created
  
  // Reference to AppStore
  private appStore = appStore;
  
  // Database reference
  private db: any = null;
  
  // Dynamic entity stores - one EntityStore per entity type
  private entityStores = new Map<string, EntityStore<BusinessEntity>>();
  private entitySubscriptions = new Map<string, Subscription>();
  private spaceConfigs = new Map<string, SpaceConfig>();
  
  // Supabase loader service
  private supabaseLoader: SupabaseLoaderService | null = null;
  
  // Track which entity types are available
  availableEntityTypes = signal<string[]>([]);
  
  // Sync state
  syncProgress = signal<{ entity: string; loaded: number; total: number } | null>(null);
  isSyncing = signal<boolean>(false);
  
  // Computed values
  isLoading = computed(() => this.loading.value);
  hasError = computed(() => this.error.value !== null);
  
  private constructor() {
    // Initialization happens externally when AppStore is ready
  }
  
  static getInstance(): SpaceStore {
    if (!SpaceStore.instance) {
      SpaceStore.instance = new SpaceStore();
    }
    return SpaceStore.instance;
  }
  
  
  async initialize() {
    const startTime = performance.now();
    console.log('[SpaceStore] Initialize called at', new Date().toISOString(), {
      initialized: this.initialized.value,
      loading: this.loading.value
    });
    
    if (this.initialized.value) {
      console.log('[SpaceStore] Already initialized, skipping');
      return;
    }
    
    console.log('[SpaceStore] Starting initialization...');
    
    try {
      this.loading.value = true;
      this.error.value = null;
      
      // Wait for AppStore to initialize
      if (!this.appStore.initialized.value) {
        const appStoreStart = performance.now();
        console.log('[SpaceStore] Waiting for AppStore.initialize()...');
        await this.appStore.initialize();
        console.log('[SpaceStore] AppStore.initialize() took', performance.now() - appStoreStart, 'ms');
      }
      
      // Get app config from AppStore
      const appConfig = this.appStore.appConfig.value;
      
      if (!appConfig) {
        throw new Error('App config not available');
      }
      
      console.log('[SpaceStore] Got appConfig:', appConfig);
      console.log('[SpaceStore] appConfig.data:', appConfig.data);
      console.log('[SpaceStore] appConfig.data.workspaces:', appConfig.data?.workspaces);
      
      // Parse space configurations
      console.log('[SpaceStore] Parsing space configurations...');
      this.parseSpaceConfigurations(appConfig);
      console.log('[SpaceStore] Available entity types after parsing:', this.availableEntityTypes.value);
      
      // Config is ready for UI - signal this immediately
      this.configReady.value = true;
      console.log('[SpaceStore] ✅ CONFIG READY for UI at', new Date().toISOString());
      
      // Get database instance from AppStore
      console.log('[SpaceStore] Getting database instance...');
      this.db = await getDatabase();
      console.log('[SpaceStore] Database obtained:', !!this.db);
      
      // Create collections for all found entity types
      console.log('[SpaceStore] Creating collections for entity types:', this.availableEntityTypes.value);
      for (const entityType of this.availableEntityTypes.value) {
        console.log(`[SpaceStore] Creating collection for: ${entityType}`);
        await this.ensureCollection(entityType);
      }
      console.log('[SpaceStore] All collections created');
      
      // Initialize Supabase loader
      this.supabaseLoader = new SupabaseLoaderService(this);
      
      // Subscribe to app config changes
      // TODO: Add subscription to appConfig changes
      
      this.initialized.value = true;
      const totalTime = performance.now() - startTime;
      console.log(`[SpaceStore] ✅ INITIALIZED IN ${totalTime.toFixed(0)}ms`);
      console.log('[SpaceStore] Initialized with entity types:', this.availableEntityTypes.value);
      console.log('[SpaceStore] Collections in database:', this.db ? Object.keys(this.db.collections) : 'No DB');

      // Setup replication for breed entity
      setTimeout(async () => {
        await this.setupEntityReplication('breed');
      }, 1000);
      
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
              filter_fields: space.filter_fields,
              rows: space.rows,
              pages: space.pages,
              views: space.views,
              canAdd: space.canAdd,
              canEdit: space.canEdit,
              canDelete: space.canDelete
            };
            
            this.spaceConfigs.set(space.entitySchemaName, spaceConfig);
            entityTypes.push(space.entitySchemaName);
          }
        });
      }
    });
    
    this.availableEntityTypes.value = entityTypes;
  }
  
  /**
   * Get space configuration for an entity type
   * Returns title, permissions, and other UI config
   */
  getSpaceConfig(entityType: string): {
    title: string;
    canAdd?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    entitySchemaName?: string;
    viewTypes?: string[];
  } | null {
    // Try exact match first
    let spaceConfig = this.spaceConfigs.get(entityType);
    
    // If not found, try case-insensitive match
    if (!spaceConfig) {
      const lowerEntityType = entityType.toLowerCase();
      for (const [key, config] of this.spaceConfigs.entries()) {
        if (key.toLowerCase() === lowerEntityType) {
          spaceConfig = config;
          console.log(`[SpaceStore] Found config with case-insensitive match: ${key} for requested ${entityType}`);
          break;
        }
      }
    }
    
    if (!spaceConfig) {
      console.warn(`[SpaceStore] No space config found for entity: ${entityType}`);
      return null;
    }
    
    console.log(`[SpaceStore] getSpaceConfig for ${entityType}:`, {
      label: spaceConfig.label,
      canAdd: spaceConfig.canAdd,
      canEdit: spaceConfig.canEdit,
      canDelete: spaceConfig.canDelete,
      rawConfig: spaceConfig
    });
    
    // Extract viewTypes from views property
    const viewTypes = new Set<string>();
    if (spaceConfig.views) {
      // Parse all view children and collect unique viewType values
      Object.values(spaceConfig.views).forEach((view: any) => {
        if (view && view.viewType) {
          viewTypes.add(view.viewType);
        }
      });
    }
    
    const viewTypesArray = Array.from(viewTypes);
    console.log(`[SpaceStore] Extracted viewTypes for ${entityType}:`, viewTypesArray);
    
    // Return the configuration with title, permissions, and viewTypes
    return {
      title: spaceConfig.label || spaceConfig.entitySchemaName || entityType,
      entitySchemaName: spaceConfig.entitySchemaName,
      canAdd: spaceConfig.canAdd,
      canEdit: spaceConfig.canEdit, 
      canDelete: spaceConfig.canDelete,
      viewTypes: viewTypesArray.length > 0 ? viewTypesArray : undefined
    };
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
   * Ensure collection exists for entity type
   */
  async ensureCollection(entityType: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    // Check if collection already exists
    if (this.db.collections[entityType]) {
      console.log(`[SpaceStore] Collection ${entityType} already exists`);
      return;
    }
    
    // Generate schema from config
    const schema = await this.generateSchemaForEntity(entityType);
    
    if (!schema) {
      console.warn(`[SpaceStore] Could not generate schema for ${entityType}`);
      return;
    }
    
    // Create collection
    try {
      await this.db.addCollections({
        [entityType]: {
          schema: schema,
          migrationStrategies: {}
        }
      });
      console.log(`[SpaceStore] Created collection ${entityType}`);
    } catch (error) {
      console.error(`[SpaceStore] Failed to create collection ${entityType}:`, error);
      throw error;
    }
  }
  

  /**
   * Initialize RxDB collection for entity type
   */
  private async initializeEntityCollection<T extends BusinessEntity>(
    entityType: string,
    entityStore: EntityStore<T>
  ) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Check if collection already exists
    let collection = this.db.collections[entityType] as RxCollection<T> | undefined;

    if (!collection) {
      // Collection should have been created during initialization
      console.warn(`[SpaceStore] Collection ${entityType} was not created during initialization`);
      // Try to create it now
      await this.ensureCollection(entityType);
      collection = this.db.collections[entityType] as RxCollection<T> | undefined;
    }

    if (collection) {
      // LIFECYCLE HOOK: onInit - Load data from RxDB
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

    if (!spaceConfig) {
      console.error(`[SpaceStore] No space configuration found for ${entityType}`);
      return null;
    }

    // Debug logging
    console.log(`[SpaceStore] Generating schema for ${entityType}:`);
    console.log('  - Fields:', Object.keys(spaceConfig.fields || {}));
    console.log('  - Sort fields:', Object.keys(spaceConfig.sort_fields || {}));
    console.log('  - Filter fields:', Object.keys(spaceConfig.filter_fields || {}));

    // Build schema properties from all field sources
    const properties: any = {};
    const required: string[] = [];

    // Helper function to process field and add to schema
    const addFieldToSchema = (fieldKey: string, fieldConfig: any) => {
      // Extract field name (remove prefix like 'breed_field_')
      const fieldName = fieldKey.replace(new RegExp(`^${entityType}_field_`), '');

      // Skip if already processed
      if (properties[fieldName]) return;

      // Map fieldType to RxDB schema type
      let schemaType = 'string';
      const fieldType = fieldConfig?.fieldType || fieldConfig?.type || 'string';

      switch (fieldType) {
        case 'uuid':
          schemaType = 'string';
          break;
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

      // Add maxLength if specified (for strings)
      if (schemaType === 'string') {
        const maxLength = fieldConfig?.maxLength;
        if (maxLength) {
          properties[fieldName].maxLength = maxLength;
        } else if (fieldType === 'uuid') {
          properties[fieldName].maxLength = 36; // Standard UUID length
        }
      }

      // Mark as required if needed
      if (fieldConfig?.required || fieldConfig?.isPrimaryKey) {
        required.push(fieldName);
      }
    };

    // 1. Process main fields
    if (spaceConfig.fields) {
      Object.entries(spaceConfig.fields).forEach(([fieldKey, fieldConfig]) => {
        addFieldToSchema(fieldKey, fieldConfig);
      });
    }

    // 2. Process sort_fields (ensure they're in schema for sorting)
    if (spaceConfig.sort_fields) {
      Object.entries(spaceConfig.sort_fields).forEach(([fieldKey, fieldConfig]) => {
        addFieldToSchema(fieldKey, fieldConfig);
      });
    }

    // 3. Process filter_fields (ensure they're in schema for filtering)
    if (spaceConfig.filter_fields) {
      Object.entries(spaceConfig.filter_fields).forEach(([fieldKey, fieldConfig]) => {
        addFieldToSchema(fieldKey, fieldConfig);
      });
    }
    
    // Ensure id field has proper configuration (UUID)
    if (!properties.id) {
      properties.id = { type: 'string', maxLength: 36 }; // Standard UUID length
      required.push('id');
    } else if (!properties.id.maxLength && properties.id.type === 'string') {
      // Add maxLength if missing for existing id field
      properties.id.maxLength = 36; // Standard UUID length
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
   * Get reactive space config as computed signal
   * Returns a computed signal that updates when config changes
   */
  getSpaceConfigSignal(entityType: string) {
    return computed(() => {
      // Return null if not ready
      if (!this.configReady.value) {
        return null;
      }
      
      // Get the space config
      return this.getSpaceConfig(entityType);
    });
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
   * Load data from Supabase for a specific entity type
   */
  async loadFromSupabase(
    entityType: string,
    options?: LoaderOptions,
    syncOptions?: SyncOptions
  ): Promise<boolean> {
    if (!this.supabaseLoader) {
      console.error('[SpaceStore] Supabase loader not initialized');
      return false;
    }

    try {
      this.isSyncing.value = true;
      
      const success = await this.supabaseLoader.loadAndSyncEntity(
        entityType,
        options,
        {
          ...syncOptions,
          onProgress: (progress) => {
            this.syncProgress.value = progress;
            console.log(`[SpaceStore] Sync progress: ${progress.entity} - ${progress.loaded}/${progress.total}`);
          }
        }
      );

      if (success) {
        console.log(`[SpaceStore] Successfully loaded ${entityType} from Supabase`);
      }

      return success;
    } catch (error) {
      console.error(`[SpaceStore] Failed to load ${entityType} from Supabase:`, error);
      return false;
    } finally {
      this.isSyncing.value = false;
      this.syncProgress.value = null;
    }
  }

  /**
   * Load multiple entity types from Supabase
   */
  async loadMultipleFromSupabase(
    entityTypes: string[],
    options?: LoaderOptions,
    syncOptions?: SyncOptions
  ): Promise<Map<string, boolean>> {
    if (!this.supabaseLoader) {
      console.error('[SpaceStore] Supabase loader not initialized');
      return new Map();
    }

    try {
      this.isSyncing.value = true;
      
      const results = await this.supabaseLoader.loadMultipleEntities(
        entityTypes,
        options,
        {
          ...syncOptions,
          onProgress: (progress) => {
            this.syncProgress.value = progress;
          }
        }
      );

      console.log(`[SpaceStore] Loaded ${results.size} entity types from Supabase`);
      return results;
    } catch (error) {
      console.error(`[SpaceStore] Failed to load multiple entities from Supabase:`, error);
      return new Map();
    } finally {
      this.isSyncing.value = false;
      this.syncProgress.value = null;
    }
  }

  /**
   * Load all available entities from Supabase
   */
  async loadAllFromSupabase(
    options?: LoaderOptions,
    syncOptions?: SyncOptions
  ): Promise<Map<string, boolean>> {
    if (!this.supabaseLoader) {
      console.error('[SpaceStore] Supabase loader not initialized');
      return new Map();
    }

    try {
      this.isSyncing.value = true;
      
      // First, check which tables are available
      const availableTables = await this.supabaseLoader.checkAvailableTables();
      console.log(`[SpaceStore] Found ${availableTables.length} available tables in Supabase`);

      // Load only available tables
      const results = await this.supabaseLoader.loadMultipleEntities(
        availableTables,
        options,
        {
          ...syncOptions,
          onProgress: (progress) => {
            this.syncProgress.value = progress;
          }
        }
      );

      console.log(`[SpaceStore] Loaded all available entities from Supabase`);
      return results;
    } catch (error) {
      console.error(`[SpaceStore] Failed to load all entities from Supabase:`, error);
      return new Map();
    } finally {
      this.isSyncing.value = false;
      this.syncProgress.value = null;
    }
  }

  /**
   * Load data with specific filters from Supabase
   * This is a generic method for loading filtered data for any entity type
   */
  async loadFilteredData(
    entityType: string,
    filters: Record<string, any>,
    options?: LoaderOptions,
    syncOptions?: SyncOptions
  ): Promise<boolean> {
    if (!this.supabaseLoader) {
      console.error('[SpaceStore] Supabase loader not initialized');
      return false;
    }

    try {
      this.isSyncing.value = true;
      
      const success = await this.supabaseLoader.loadAndSyncEntity(
        entityType,
        { ...options, filters },
        {
          ...syncOptions,
          onProgress: (progress) => {
            this.syncProgress.value = progress;
          }
        }
      );

      console.log(`[SpaceStore] Loaded filtered ${entityType} data from Supabase`);
      return success;
    } catch (error) {
      console.error(`[SpaceStore] Failed to load filtered data from Supabase:`, error);
      return false;
    } finally {
      this.isSyncing.value = false;
      this.syncProgress.value = null;
    }
  }

  /**
   * Enable realtime sync for an entity type
   */
  async enableRealtimeSync(entityType: string, filters?: Record<string, any>): Promise<void> {
    if (!this.supabaseLoader) {
      console.error('[SpaceStore] Supabase loader not initialized');
      return;
    }

    await this.loadFromSupabase(
      entityType,
      { filters },
      { realtime: true }
    );
  }

  /**
   * Disable all realtime syncs
   */
  async disableRealtimeSync(): Promise<void> {
    if (!this.supabaseLoader) {
      return;
    }

    await this.supabaseLoader.stopAllRealtimeSync();
  }

  /**
   * Dispose of all resources
   * LIFECYCLE: Global cleanup
   */
  /**
   * Setup bidirectional replication for an entity
   * Uses EntityReplicationService for sync with Supabase
   */
  async setupEntityReplication(entityType: string): Promise<boolean> {
    if (!this.db) {
      console.error('[SpaceStore] Database not initialized');
      return false;
    }

    // Ensure collection exists
    await this.ensureCollection(entityType);

    // Check if collection was created
    const collection = this.db.collections[entityType];
    if (!collection) {
      console.error(`[SpaceStore] Failed to create collection for ${entityType}`);
      return false;
    }

    console.log(`[SpaceStore] Setting up replication for ${entityType}...`);

    // Setup replication with default options
    const success = await entityReplicationService.setupReplication(
      this.db,
      entityType,
      {
        batchSize: 50,
        pullInterval: 60000, // 60 seconds
        enableRealtime: true,
        conflictHandler: 'last-write-wins'
      }
    );

    if (success) {
      console.log(`[SpaceStore] ✅ Replication active for ${entityType}`);

      // Initial data load
      await this.loadEntityData(entityType, 500);

      // Force a full sync to ensure we have latest data
      await entityReplicationService.forceFullSync(this.db, entityType);
    } else {
      console.error(`[SpaceStore] ❌ Failed to setup replication for ${entityType}`);
    }

    return success;
  }

  // UNIVERSAL METHOD FOR LOADING ENTITY DATA
  async loadEntityData(entityType: string, limit: number = 500) {
    console.log(`[SpaceStore] Starting ${entityType} data load...`);

    try {
      const { supabase } = await import('../supabase/client');

      // Load data from Supabase
      const { data, error } = await supabase
        .from(entityType)
        .select('*')
        .limit(limit);

      if (error) {
        console.error(`[SpaceStore] Supabase error for ${entityType}:`, error);
        return;
      }

      if (!data || data.length === 0) {
        console.log(`[SpaceStore] No ${entityType} data found in Supabase`);
        return;
      }

      console.log(`[SpaceStore] Fetched from Supabase: ${data.length} ${entityType} records`);

      // Get collection
      const collection = this.db?.[entityType];
      if (!collection) {
        console.error(`[SpaceStore] No ${entityType} collection found`);
        return;
      }

      // Get schema from collection to know which fields to include
      const schema = collection.schema.jsonSchema;
      const schemaProperties = schema.properties || {};

      console.log(`[SpaceStore] Schema properties for ${entityType}:`, Object.keys(schemaProperties));

      // Map data dynamically based on schema
      const mappedData = data.map(item => {
        const mapped: any = {};

        // Only include fields that exist in the schema
        for (const fieldName in schemaProperties) {
          if (fieldName === '_deleted') {
            // Special handling for _deleted field (maps from 'deleted' in Supabase)
            mapped._deleted = item.deleted || false;
          } else if (item.hasOwnProperty(fieldName)) {
            // Copy field if it exists in the source data
            mapped[fieldName] = item[fieldName];
          } else if (fieldName === 'created_at' || fieldName === 'updated_at') {
            // Add timestamp defaults if missing
            mapped[fieldName] = item[fieldName] || new Date().toISOString();
          } else if (schemaProperties[fieldName].type === 'object') {
            // Initialize empty objects for object fields
            mapped[fieldName] = item[fieldName] || {};
          } else if (schemaProperties[fieldName].type === 'boolean') {
            // Initialize booleans with false
            mapped[fieldName] = false;
          } else if (schemaProperties[fieldName].type === 'string') {
            // Don't add string fields if not present (unless required)
            if (schema.required?.includes(fieldName)) {
              mapped[fieldName] = '';
            }
          }
        }

        // Ensure required fields exist
        if (!mapped.id) {
          console.warn(`[SpaceStore] Missing id for ${entityType} record, skipping`);
          return null;
        }

        return mapped;
      }).filter(item => item !== null); // Remove any null entries

      // Bulk upsert into RxDB
      console.log(`[SpaceStore] Attempting to bulkUpsert: ${mappedData.length} ${entityType} records`);
      const result = await collection.bulkUpsert(mappedData);

      console.log(`[SpaceStore] BulkUpsert result for ${entityType}:`, {
        success: result.success.length,
        errors: result.error.length
      });

      if (result.error.length > 0) {
        console.error(`[SpaceStore] BulkUpsert errors for ${entityType}:`, result.error);
      }

      // Update entity store
      const entityStore = this.entityStores.get(entityType);
      if (entityStore) {
        const allDocs = await collection.find().exec();
        const entities = allDocs.map((doc: any) => doc.toJSON());
        entityStore.setAll(entities, true);
        console.log(`[SpaceStore] Updated entity store with ${entities.length} ${entityType} records`);
      }

    } catch (error) {
      console.error(`[SpaceStore] Failed to load ${entityType} data:`, error);
    }
  }

  dispose() {
    console.log('[SpaceStore] Disposing all resources...');
    
    // Stop all realtime syncs
    if (this.supabaseLoader) {
      this.supabaseLoader.stopAllRealtimeSync();
    }
    
    // Clean up all entities
    this.availableEntityTypes.value.forEach(entityType => {
      this.cleanupEntity(entityType);
    });
    
    // Clear configurations
    this.spaceConfigs.clear();
    
    // Reset state
    this.initialized.value = false;
    this.availableEntityTypes.value = [];
    this.supabaseLoader = null;
    
    console.log('[SpaceStore] Disposed');
  }
}

// Export singleton instance
export const spaceStore = SpaceStore.getInstance();