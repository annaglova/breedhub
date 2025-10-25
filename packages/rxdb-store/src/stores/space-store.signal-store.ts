import { signal, computed } from '@preact/signals-react';
import { getDatabase } from '../services/database.service';
import { Subscription } from 'rxjs';
import { RxCollection, RxDocument, RxJsonSchema } from 'rxdb';
import { EntityStore } from './base/entity-store';
import { appStore } from './app-store.signal-store';
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

    if (this.initialized.value) {
      return;
    }

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

      // Extract merged data from appConfig (in production this will be the whole config)
      const mergedConfig = appConfig.data || appConfig;

      // Parse space configurations
      this.parseSpaceConfigurations(mergedConfig);

      // Config is ready for UI - signal this immediately
      this.configReady.value = true;
      console.log('[SpaceStore] ✅ CONFIG READY at', new Date().toISOString());

      // Get database instance from AppStore
      this.db = await getDatabase();

      // Create collections for all found entity types
      for (const entityType of this.availableEntityTypes.value) {
        await this.ensureCollection(entityType);
      }

      // Subscribe to app config changes
      // TODO: Add subscription to appConfig changes

      this.initialized.value = true;
      const totalTime = performance.now() - startTime;
      console.log(`[SpaceStore] ✅ INITIALIZED IN ${totalTime.toFixed(0)}ms`);

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
   *
   * Fields can be found in:
   * - space.sort_fields (space level - shared across all views)
   * - space.filter_fields (space level - shared across all views)
   * - space.fields, pages.fields, views.fields, tabs.fields
   *
   * According to config-types.ts:
   * - space can have sort_fields, filter_fields
   * - view can have fields
   * - page can have fields and tabs
   * - tab can have fields
   */
  private collectUniqueFields(space: any, appConfig: any, entitySchemaName: string): Map<string, FieldConfig> {
    const uniqueFields = new Map<string, FieldConfig>();

    // Helper function to process fields - in static config fields are already merged data
    const processFields = (fields: any) => {
      if (!fields) return;

      Object.entries(fields).forEach(([fieldKey, fieldValue]: [string, any]) => {
        // Normalize field name: remove entity prefix (breed_field_pet_type_id -> pet_type_id)
        const normalizedFieldName = this.removeFieldPrefix(fieldKey, entitySchemaName);

        // Skip if already processed
        if (uniqueFields.has(normalizedFieldName)) return;

        // In static config, fieldValue is already merged data
        const fieldData = fieldValue;

        // Collect only schema-critical parameters for RxDB
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
          component: fieldData.component,
          originalConfigKey: fieldKey // Keep original for debugging
        };

        uniqueFields.set(normalizedFieldName, fieldConfig);
      });
    };

    // Recursive search for 'fields', 'sort_fields', and 'filter_fields' properties
    // sort_fields and filter_fields are now at space level (not view level)
    const recursiveFieldSearch = (obj: any, visited: Set<any> = new Set()) => {
      // Avoid circular references
      if (!obj || typeof obj !== 'object' || visited.has(obj)) return;
      visited.add(obj);

      // Process fields if found at this level
      if (obj.fields && typeof obj.fields === 'object') {
        processFields(obj.fields);
      }

      // Process sort_fields if found at this level
      if (obj.sort_fields && typeof obj.sort_fields === 'object') {
        processFields(obj.sort_fields);
      }

      // Process filter_fields if found at this level
      if (obj.filter_fields && typeof obj.filter_fields === 'object') {
        processFields(obj.filter_fields);
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

    return uniqueFields;
  }
  
  /**
   * Parse space configurations from app config hierarchy
   * NOTE: appConfig is already the merged data (appConfig.data from DB)
   * In production it will be static pre-generated config from localStorage
   */
  private parseSpaceConfigurations(appConfig: any) {
    if (!appConfig?.workspaces) {
      console.warn('[SpaceStore] No workspaces found in app config');
      return;
    }

    const entityTypes: string[] = [];
    this.spaceConfigs.clear();

    // Iterate through workspaces
    Object.entries(appConfig.workspaces).forEach(([workspaceKey, workspace]: [string, any]) => {
      if (workspace.spaces) {
        // Iterate through spaces in workspace
        Object.entries(workspace.spaces).forEach(([spaceKey, space]: [string, any]) => {
          // Check for entitySchemaName
          if (space.entitySchemaName) {
            // Collect all unique fields from all levels (with normalized names)
            const uniqueFields = this.collectUniqueFields(space, appConfig, space.entitySchemaName);

            // Normalize keys in sort_fields and filter_fields too
            const normalizedSortFields = space.sort_fields
              ? Object.fromEntries(
                  Object.entries(space.sort_fields).map(([key, value]) => [
                    this.removeFieldPrefix(key, space.entitySchemaName),
                    value
                  ])
                )
              : undefined;

            const normalizedFilterFields = space.filter_fields
              ? Object.fromEntries(
                  Object.entries(space.filter_fields).map(([key, value]) => [
                    this.removeFieldPrefix(key, space.entitySchemaName),
                    value
                  ])
                )
              : undefined;

            const spaceConfig: SpaceConfig = {
              id: space.id || spaceKey,
              icon: space.icon,
              path: space.path,
              label: space.label,
              entitySchemaName: space.entitySchemaName,
              fields: Object.fromEntries(uniqueFields),
              sort_fields: normalizedSortFields,
              filter_fields: normalizedFilterFields,
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
    viewConfigs?: Array<{
      viewType: string;
      icon?: string;
      tooltip?: string;
    }>;
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

    // Extract views with full configuration (viewType, icon, tooltip)
    const viewConfigs: Array<{
      viewType: string;
      icon?: string;
      tooltip?: string;
    }> = [];

    if (spaceConfig.views) {
      // Parse all view children and collect view configurations
      Object.values(spaceConfig.views).forEach((view: any) => {
        if (view && view.viewType) {
          viewConfigs.push({
            viewType: view.viewType,
            icon: view.icon,
            tooltip: view.tooltip
          });
        }
      });
    }

    console.log(`[SpaceStore] Extracted view configs for ${entityType}:`, viewConfigs);

    // Return the configuration with title, permissions, and full view configs
    return {
      title: spaceConfig.label || spaceConfig.entitySchemaName || entityType,
      entitySchemaName: spaceConfig.entitySchemaName,
      canAdd: spaceConfig.canAdd,
      canEdit: spaceConfig.canEdit,
      canDelete: spaceConfig.canDelete,
      viewTypes: viewConfigs.length > 0 ? viewConfigs.map(v => v.viewType) : undefined,
      viewConfigs: viewConfigs.length > 0 ? viewConfigs : undefined
    };
  }

  /**
   * Get default rows for entity (used for replication batch size)
   * Takes the first view's rows or falls back to space-level rows
   *
   * @param entityType - Entity type (e.g., 'breed', 'animal')
   * @returns Number of rows, or default 50
   */
  getDefaultViewRows(entityType: string): number {
    let spaceConfig = this.spaceConfigs.get(entityType);

    if (!spaceConfig) {
      const lowerEntityType = entityType.toLowerCase();
      for (const [key, config] of this.spaceConfigs.entries()) {
        if (key.toLowerCase() === lowerEntityType) {
          spaceConfig = config;
          break;
        }
      }
    }

    if (!spaceConfig) {
      console.warn(`[SpaceStore] No space config found for ${entityType}, using default rows: 50`);
      return 50;
    }

    // Get rows from first view (most common case)
    if (spaceConfig.views) {
      for (const [viewKey, viewConfig] of Object.entries(spaceConfig.views)) {
        if (viewConfig.rows) {
          console.log(`[SpaceStore] Default rows for ${entityType}: ${viewConfig.rows} (from first view ${viewKey})`);
          return viewConfig.rows;
        }
      }
    }

    // Fallback to space level rows
    if (spaceConfig.rows) {
      console.log(`[SpaceStore] Default rows for ${entityType}: ${spaceConfig.rows} (from space config)`);
      return spaceConfig.rows;
    }

    console.warn(`[SpaceStore] No rows config found for ${entityType}, using default: 50`);
    return 50;
  }

  /**
   * Get rows per page for specific view
   * This determines BOTH UI pagination AND replication batch size
   *
   * @param entityType - Entity type (e.g., 'breed', 'animal')
   * @param viewType - View type (e.g., 'list', 'grid')
   * @returns Number of rows configured for this view, or default 50
   */
  getViewRows(entityType: string, viewType: string): number {
    // Try exact match first
    let spaceConfig = this.spaceConfigs.get(entityType);

    // If not found, try case-insensitive match
    if (!spaceConfig) {
      const lowerEntityType = entityType.toLowerCase();
      for (const [key, config] of this.spaceConfigs.entries()) {
        if (key.toLowerCase() === lowerEntityType) {
          spaceConfig = config;
          break;
        }
      }
    }

    if (!spaceConfig) {
      console.warn(`[SpaceStore] No space config found for ${entityType}, using default rows: 50`);
      return 50;
    }

    // Try to find view config by viewType inside views object
    // views structure: { "config_view_123": { viewType: "list", rows: 60, ... }, ... }
    if (spaceConfig.views) {
      for (const [viewKey, viewConfig] of Object.entries(spaceConfig.views)) {
        if (viewConfig.viewType === viewType && viewConfig.rows) {
          return viewConfig.rows;
        }
      }
    }

    // Fallback to space level rows
    if (spaceConfig.rows) {
      return spaceConfig.rows;
    }

    // Final fallback
    console.warn(`[SpaceStore] No rows config found for ${entityType}/${viewType}, using default: 50`);
    return 50;
  }

  /**
   * Get sort options from space config's sort_fields
   * Sort options are defined at space level and shared across all views
   *
   * @param entityType - Entity type (e.g., 'breed', 'animal')
   * @param viewType - Deprecated parameter, kept for backward compatibility
   * @returns Array of sort options with id, name, icon, direction, parameter
   */
  getSortOptions(entityType: string, viewType?: string): Array<{
    id: string;
    name: string;
    icon?: string;
    field: string;
    direction?: string;
    parameter?: string;
    isDefault?: boolean;
  }> {
    // Try exact match first
    let spaceConfig = this.spaceConfigs.get(entityType);

    // If not found, try case-insensitive match
    if (!spaceConfig) {
      const lowerEntityType = entityType.toLowerCase();
      for (const [key, config] of this.spaceConfigs.entries()) {
        if (key.toLowerCase() === lowerEntityType) {
          spaceConfig = config;
          break;
        }
      }
    }

    if (!spaceConfig) {
      console.warn(`[SpaceStore] No space config found for ${entityType}`);
      return [];
    }

    // Read sort_fields directly from space config (not from view)
    const sortFields = spaceConfig.sort_fields;

    if (!sortFields) {
      console.warn(`[SpaceStore] No sort_fields found for ${entityType}`);
      return [];
    }

    const sortOptions: Array<{
      id: string;
      name: string;
      icon?: string;
      field: string;
      direction?: string;
      parameter?: string;
      isDefault?: boolean;
      fieldOrder?: number;
      optionOrder?: number;
    }> = [];

    for (const [fieldId, fieldConfig] of Object.entries(sortFields)) {
      const field = fieldConfig as any;
      const fieldOrder = field.order || 0;

      if (field.sortOrder && Array.isArray(field.sortOrder)) {
        // Each sortOrder item is a separate sort option
        field.sortOrder.forEach((sortOption: any) => {
          // Use slug from config if available, otherwise generate ID
          const optionId = sortOption.slug || (
            sortOption.parametr
              ? `${fieldId}_${sortOption.parametr}_${sortOption.direction}`
              : `${fieldId}_${sortOption.direction}`
          );

          const option = {
            id: optionId,
            name: sortOption.label || field.displayName || fieldId,
            icon: sortOption.icon,
            field: fieldId,
            direction: sortOption.direction,
            parameter: sortOption.parametr, // For JSON fields
            isDefault: sortOption.isDefault === 'true' || sortOption.isDefault === true,
            fieldOrder,
            optionOrder: sortOption.order || 0
          };

          sortOptions.push(option);
        });
      }
    }

    // Sort by field order, then by option order within each field
    sortOptions.sort((a, b) => {
      if (a.fieldOrder !== b.fieldOrder) {
        return (a.fieldOrder || 0) - (b.fieldOrder || 0);
      }
      return (a.optionOrder || 0) - (b.optionOrder || 0);
    });

    // Remove temporary ordering fields
    return sortOptions.map(({ fieldOrder, optionOrder, ...rest }) => rest);
  }

  /**
   * Get filter fields from space config's filter_fields
   * Filter fields are defined at space level and shared across all views
   *
   * Note: Fields with mainFilterField=true are excluded (they're for search bar, not modal)
   *
   * @param entityType - Entity type (e.g., 'breed', 'animal')
   * @param viewType - Deprecated parameter, kept for backward compatibility
   * @returns Array of filter field configurations (excluding main filter field)
   */
  getFilterFields(entityType: string, viewType?: string): Array<{
    id: string;
    displayName: string;
    component: string;
    placeholder?: string;
    fieldType: string;
    required?: boolean;
    operator?: string;
    slug?: string;
    value?: any;
    validation?: any;
    order: number;
    referencedTable?: string;
    referencedFieldID?: string;
    referencedFieldName?: string;
  }> {
    // Try exact match first
    let spaceConfig = this.spaceConfigs.get(entityType);

    // If not found, try case-insensitive match
    if (!spaceConfig) {
      const lowerEntityType = entityType.toLowerCase();
      for (const [key, config] of this.spaceConfigs.entries()) {
        if (key.toLowerCase() === lowerEntityType) {
          spaceConfig = config;
          break;
        }
      }
    }

    if (!spaceConfig) {
      console.warn(`[SpaceStore] No space config found for ${entityType}`);
      return [];
    }

    // Read filter_fields directly from space config (not from view)
    const filterFields = spaceConfig.filter_fields;

    if (!filterFields) {
      console.warn(`[SpaceStore] No filter_fields found for ${entityType}`);
      return [];
    }

    const filterOptions: Array<{
      id: string;
      displayName: string;
      component: string;
      placeholder?: string;
      fieldType: string;
      required?: boolean;
      operator?: string;
      slug?: string;
      value?: any;
      validation?: any;
      order: number;
      referencedTable?: string;
      referencedFieldID?: string;
      referencedFieldName?: string;
    }> = [];

    // Parse filter fields (exclude mainFilterField - it's for search bar, not modal)
    for (const [fieldId, fieldConfig] of Object.entries(filterFields)) {
      const field = fieldConfig as any;

      // Skip main filter field - it's used for primary search, not in filter dialog
      if (field.mainFilterField === true) {
        continue;
      }

      filterOptions.push({
        id: fieldId,
        displayName: field.displayName || fieldId,
        component: field.component || 'TextInput',
        placeholder: field.placeholder,
        fieldType: field.fieldType || 'string',
        required: field.required,
        operator: field.operator,
        slug: field.slug,
        value: field.value,
        validation: field.validation,
        order: field.order || 0,
        referencedTable: field.referencedTable,
        referencedFieldID: field.referencedFieldID,
        referencedFieldName: field.referencedFieldName
      });
    }

    // Sort by order
    filterOptions.sort((a, b) => a.order - b.order);

    return filterOptions;
  }

  /**
   * Get main filter field for primary search (search bar)
   * This field is excluded from filter dialog modal
   *
   * @param entityType - Entity type (e.g., 'breed', 'animal')
   * @returns Main filter field configuration or null if not found
   */
  getMainFilterField(entityType: string): {
    id: string;
    displayName: string;
    component: string;
    placeholder?: string;
    fieldType: string;
    operator?: string;
  } | null {
    // Try exact match first
    let spaceConfig = this.spaceConfigs.get(entityType);

    // If not found, try case-insensitive match
    if (!spaceConfig) {
      const lowerEntityType = entityType.toLowerCase();
      for (const [key, config] of this.spaceConfigs.entries()) {
        if (key.toLowerCase() === lowerEntityType) {
          spaceConfig = config;
          break;
        }
      }
    }

    if (!spaceConfig?.filter_fields) {
      return null;
    }

    // Find field with mainFilterField: true
    for (const [fieldId, fieldConfig] of Object.entries(spaceConfig.filter_fields)) {
      const field = fieldConfig as any;
      if (field.mainFilterField === true) {
        return {
          id: fieldId,
          displayName: field.displayName || fieldId,
          component: field.component || 'TextInput',
          placeholder: field.placeholder,
          fieldType: field.fieldType || 'string',
          operator: field.operator || 'contains'
        };
      }
    }

    return null;
  }

  /**
   * Load more entities for pagination (manual pull)
   * @param entityType - тип сутності
   * @param viewType - тип view (list, grid, etc.)
   * @returns Promise<number> - кількість нових записів
   */
  async loadMore(entityType: string, viewType: string): Promise<number> {
    // Get rows from view config
    const rows = this.getViewRows(entityType, viewType);

    // Trigger manual pull
    const count = await entityReplicationService.manualPull(entityType, rows);

    return count;
  }

  /**
   * Get or create an entity store for the given entity type
   */
  async getEntityStore<T extends BusinessEntity>(entityType: string): Promise<EntityStore<T> | null> {
    // Wait for config to be ready first (fast polling for instant response)
    if (!this.configReady.value) {
      let retries = 50;
      while (!this.configReady.value && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms polling
        retries--;
      }
      if (!this.configReady.value) {
        console.error(`[SpaceStore] Config not ready after waiting for ${entityType}`);
        return null;
      }
    }

    // Check if store already exists
    if (this.entityStores.has(entityType)) {
      // Also ensure collection still exists (in case it was deleted)
      await this.ensureCollection(entityType);

      return this.entityStores.get(entityType) as EntityStore<T>;
    }

    // Check if we have config for this entity (case-insensitive)
    let hasConfig = this.spaceConfigs.has(entityType);
    if (!hasConfig) {
      const lowerEntityType = entityType.toLowerCase();
      for (const key of this.spaceConfigs.keys()) {
        if (key.toLowerCase() === lowerEntityType) {
          hasConfig = true;
          break;
        }
      }
    }

    if (!hasConfig) {
      console.error(`[SpaceStore] No space config found for entity type: ${entityType}`);
      console.error(`[SpaceStore] Available configs:`, Array.from(this.spaceConfigs.keys()));
      return null;
    }

    try {
      const entityStore = new EntityStore<T>();
      entityStore.setLoading(true);

      // ⚡ INSTANT: Load totalFromServer from localStorage cache synchronously
      // This happens BEFORE any async operations (config wait, collection creation, replication)
      entityStore.initTotalFromCache(entityType);

      // Store it
      this.entityStores.set(entityType, entityStore as EntityStore<BusinessEntity>);

      // Subscribe to totalCount updates from replication
      entityReplicationService.onTotalCountUpdate(entityType, (newTotal) => {
        entityStore.setTotalFromServer(newTotal);
      });

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

    // Check if collection already exists and is valid
    const existingCollection = this.db.collections[entityType];
    if (existingCollection && existingCollection.name === entityType) {
      // Verify collection is actually working
      try {
        await existingCollection.count().exec();
        console.log(`[SpaceStore] Collection ${entityType} already exists and is valid`);
        return;
      } catch (err) {
        console.warn(`[SpaceStore] Collection ${entityType} exists but is broken, will recreate`);
        // Collection is broken, continue to recreate it
      }
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

    // Always ensure collection exists (handles deleted/broken collections)
    await this.ensureCollection(entityType);

    // Get collection
    let collection = this.db.collections[entityType] as RxCollection<T> | undefined;

    if (!collection) {
      console.error(`[SpaceStore] Failed to get/create collection ${entityType}`);
    }

    if (collection) {
      // LIFECYCLE HOOK: onInit - Load data from RxDB
      const allDocs = await collection.find().exec();
      const entities: T[] = allDocs.map((doc: RxDocument<T>) => doc.toJSON() as T);

      console.log(`[SpaceStore] 📊 Loaded ${entities.length} entities from RxDB collection ${entityType}`);

      // Update store with autoSelectFirst enabled
      entityStore.setAll(entities, true); // Auto-select first entity
      entityStore.setLoading(false);
      
      // Store collection reference
      (entityStore as any).collection = collection;
      
      // Unsubscribe previous subscription if exists
      const existingSubscription = this.entitySubscriptions.get(entityType);
      if (existingSubscription) {
        existingSubscription.unsubscribe();
      }

      // Get expected batch size from space config once (not on every INSERT)
      const spaceConfig = this.spaceConfigs.get(entityType);
      let expectedBatchSize = 50; // RxDB default

      // Try to find rows from any view config
      if (spaceConfig?.views) {
        for (const viewConfig of Object.values(spaceConfig.views)) {
          if (viewConfig.rows) {
            expectedBatchSize = viewConfig.rows;
            break;
          }
        }
      } else if (spaceConfig?.rows) {
        expectedBatchSize = spaceConfig.rows;
      }

      // Batch buffer for INSERT operations to avoid UI flickering
      let insertBuffer: any[] = [];
      let insertTimeout: any = null;

      const flushInserts = () => {
        if (insertBuffer.length > 0) {
          entityStore.addMany(insertBuffer);
          insertBuffer = [];
        }
        if (insertTimeout) {
          clearTimeout(insertTimeout);
          insertTimeout = null;
        }
      };

      // Subscribe to changes
      const subscription = collection.$.subscribe((changeEvent: any) => {
        if (changeEvent.operation === 'INSERT') {
          const data = changeEvent.documentData;
          if (data && data.id) {
            // Batch INSERT operations
            insertBuffer.push(data);

            // Flush immediately if we reached the expected batch size
            if (insertBuffer.length >= expectedBatchSize) {
              flushInserts();
            } else {
              // Otherwise, set/reset timeout as fallback (100ms)
              if (insertTimeout) {
                clearTimeout(insertTimeout);
              }
              insertTimeout = setTimeout(flushInserts, 100);
            }
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
      // fieldKey is already normalized (pet_type_id, not breed_field_pet_type_id)
      // Skip if already processed
      if (properties[fieldKey]) return;

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

      properties[fieldKey] = {
        type: schemaType
      };

      // Add maxLength if specified (for strings)
      if (schemaType === 'string') {
        const maxLength = fieldConfig?.maxLength;
        if (maxLength) {
          properties[fieldKey].maxLength = maxLength;
        } else if (fieldType === 'uuid') {
          properties[fieldKey].maxLength = 36; // Standard UUID length
        }
      }

      // Mark as required if needed
      if (fieldConfig?.required || fieldConfig?.isPrimaryKey) {
        required.push(fieldKey);
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
   * Apply filters to entity data
   * Universal filtering method used by both SpaceView and LookupInput
   *
   * @param entityType - Entity type (e.g., 'breed', 'pet', 'account')
   * @param filters - Filter values as key-value pairs (e.g., { name: 'golden', pet_type_id: 'uuid' })
   * @param options - Optional configuration (limit, offset, fieldConfigs)
   * @returns Promise with { records, total, hasMore }
   *
   * Strategy:
   * 1. Try RxDB local search first (fast)
   * 2. If not enough results, fetch from Supabase (with filters)
   * 3. Cache results in RxDB
   * 4. Return standardized format
   */
  async applyFilters(
    entityType: string,
    filters: Record<string, any>,
    options?: {
      limit?: number;
      cursor?: string | null;  // ✅ Cursor for IDs query (keyset pagination)
      orderBy?: {
        field: string;
        direction: 'asc' | 'desc';
      };
      fieldConfigs?: Record<string, any>;
    }
  ): Promise<{ records: any[]; total: number; hasMore: boolean; nextCursor: string | null }> {
    const limit = options?.limit || 30;
    const cursor = options?.cursor ?? null;
    const orderBy = options?.orderBy || { field: 'name', direction: 'asc' as const };

    console.log('[SpaceStore] applyFilters (ID-First):', {
      entityType,
      filters,
      limit,
      cursor,
      orderBy
    });

    // Get field configs for operator detection
    const spaceConfig = this.spaceConfigs.get(entityType);
    const fieldConfigs = options?.fieldConfigs || spaceConfig?.filter_fields || {};

    // 📴 PREVENTIVE OFFLINE CHECK: Skip Supabase if browser is offline
    if (!navigator.onLine) {
      console.warn('[SpaceStore] 📴 Browser is offline, using RxDB directly (no network attempt)');

      try {
        const localResults = await this.filterLocalEntities(
          entityType,
          filters,
          fieldConfigs,
          limit,
          cursor,
          orderBy
        );

        // Get total count
        if (!this.db) {
          throw new Error('Database not initialized');
        }

        const collection = this.db.collections[entityType];
        if (!collection) {
          throw new Error(`Collection ${entityType} not found`);
        }

        const countSelector: any = { _deleted: false };
        // Apply same filters for count (simplified version)
        for (const [fieldKey, value] of Object.entries(filters)) {
          if (value !== undefined && value !== null && value !== '') {
            let fieldConfig = fieldConfigs[fieldKey];
            if (!fieldConfig) {
              const prefixedKey = `${entityType}_field_${fieldKey}`;
              fieldConfig = fieldConfigs[prefixedKey];
            }
            const fieldType = fieldConfig?.fieldType || 'string';
            const operator = this.detectOperator(fieldType, fieldConfig?.operator);

            if (operator === 'ilike' || operator === 'contains') {
              const escapedValue = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              countSelector[fieldKey] = { $regex: escapedValue, $options: 'i' };
            } else if (operator === 'eq') {
              countSelector[fieldKey] = value;
            }
          }
        }

        const allMatchingDocs = await collection.find({ selector: countSelector }).exec();
        const totalCount = allMatchingDocs.length;

        const hasMore = localResults.length >= limit;
        const nextCursor = localResults.length > 0
          ? (orderBy.parameter
              ? localResults[localResults.length - 1]?.[orderBy.field]?.[orderBy.parameter]
              : localResults[localResults.length - 1]?.[orderBy.field]) ?? null
          : null;

        console.log(`[SpaceStore] 📴 Offline mode (preventive): returning ${localResults.length}/${totalCount} records (hasMore: ${hasMore})`);

        return {
          records: localResults,
          total: totalCount,
          hasMore,
          nextCursor,
          offline: true
        } as any;
      } catch (error) {
        console.error('[SpaceStore] Offline mode failed:', error);
        return {
          records: [],
          total: 0,
          hasMore: false,
          nextCursor: null,
          offline: true
        } as any;
      }
    }

    try {
      // 🆔 PHASE 1: Fetch IDs + ordering field from Supabase (lightweight ~1KB for 30 records)
      console.log('[SpaceStore] 🆔 Phase 1: Fetching IDs from Supabase...');

      const idsData = await this.fetchIDsFromSupabase(
        entityType,
        filters,
        fieldConfigs,
        limit,
        cursor,
        orderBy
      );

      if (!idsData || idsData.length === 0) {
        console.log('[SpaceStore] ⚠️ No IDs returned from Supabase');
        return {
          records: [],
          total: 0,
          hasMore: false,
          nextCursor: null
        };
      }

      console.log(`[SpaceStore] ✅ Got ${idsData.length} IDs from Supabase`);

      // Extract IDs and calculate nextCursor
      const ids = idsData.map(d => d.id);
      // For JSONB fields, Supabase returns value under "field->>parameter" key
      const orderFieldKey = orderBy.parameter
        ? `${orderBy.field}->>${orderBy.parameter}`
        : orderBy.field;
      const nextCursor = idsData[idsData.length - 1]?.[orderFieldKey] ?? null;

      // 💾 PHASE 2: Check RxDB cache for these IDs
      console.log('[SpaceStore] 💾 Phase 2: Checking RxDB cache...');

      if (!this.db) {
        console.warn('[SpaceStore] Database not initialized');
        return {
          records: [],
          total: 0,
          hasMore: false,
          nextCursor: null
        };
      }

      const collection = this.db.collections[entityType];
      if (!collection) {
        console.warn(`[SpaceStore] Collection ${entityType} not found`);
        return {
          records: [],
          total: 0,
          hasMore: false,
          nextCursor: null
        };
      }

      const cached = await collection.find({
        selector: { id: { $in: ids } }
      }).exec();

      const cachedMap = new Map(cached.map(d => [d.id, d.toJSON()]));
      console.log(`[SpaceStore] 📦 Found ${cachedMap.size}/${ids.length} in cache (${Math.round(cachedMap.size / ids.length * 100)}% hit rate)`);

      // 🌐 PHASE 3: Fetch missing full records from Supabase
      const missingIds = ids.filter(id => !cachedMap.has(id));

      let freshRecords = [];
      if (missingIds.length > 0) {
        console.log(`[SpaceStore] 🌐 Phase 3: Fetching ${missingIds.length} missing full records...`);

        freshRecords = await this.fetchRecordsByIDs(
          entityType,
          missingIds
        );

        console.log(`[SpaceStore] ✅ Fetched ${freshRecords.length} fresh records`);

        // Cache fresh records in RxDB
        if (freshRecords.length > 0) {
          const mapped = freshRecords.map(r => this.mapToRxDBFormat(r, entityType));
          await collection.bulkUpsert(mapped);
          console.log(`[SpaceStore] 💾 Cached ${mapped.length} fresh records in RxDB`);
        }
      } else {
        console.log('[SpaceStore] ✨ All records in cache! (100% hit rate)');
      }

      // 🔀 PHASE 4: Merge cached + fresh, maintain order from IDs query
      const recordsMap = new Map([
        ...cachedMap,
        ...freshRecords.map(r => [r.id, r])
      ]);

      // CRITICAL: Maintain exact order from IDs query!
      const orderedRecords = ids
        .map(id => recordsMap.get(id))
        .filter(Boolean);

      console.log(`[SpaceStore] ✅ Returning ${orderedRecords.length} records (hasMore: ${idsData.length >= limit})`);

      return {
        records: orderedRecords,
        total: orderedRecords.length,
        hasMore: idsData.length >= limit,
        nextCursor
      };

    } catch (error) {
      // Check if this is a network error (offline mode)
      const errorMessage = ((error as any)?.message || '').toLowerCase();
      const errorName = ((error as any)?.name || '').toLowerCase();
      const errorCode = ((error as any)?.code || '').toLowerCase();
      const errorString = String(error).toLowerCase();

      const isNetworkError = errorMessage.includes('fetch') ||
                            errorMessage.includes('network') ||
                            errorMessage.includes('disconnected') ||
                            errorMessage.includes('failed to fetch') ||
                            errorName.includes('network') ||
                            errorName.includes('fetch') ||
                            errorName.includes('disconnected') ||
                            errorCode.includes('network') ||
                            errorCode.includes('disconnected') ||
                            errorCode.includes('err_internet_disconnected') ||
                            errorString.includes('err_internet_disconnected') ||
                            (error instanceof TypeError && errorMessage.includes('fetch')) ||
                            !navigator.onLine; // Fallback: check browser online status

      // 📴 OFFLINE FALLBACK: Use RxDB cache with proper filtering
      if (isNetworkError) {
        console.warn('[SpaceStore] ⚠️ Network unavailable, using offline fallback (RxDB only)');
      } else {
        console.warn('[SpaceStore] ⚠️ Error, using offline fallback (RxDB only)');
        console.error('[SpaceStore] Error details:', error);
      }

      try {
        if (!this.db) {
          throw new Error('Database not initialized');
        }

        const collection = this.db.collections[entityType];
        if (!collection) {
          throw new Error(`Collection ${entityType} not found`);
        }

        // ✅ Use proper filterLocalEntities() for offline mode
        console.log('[SpaceStore] 🔍 Filtering locally in RxDB with same logic as online...');

        const localResults = await this.filterLocalEntities(
          entityType,
          filters,
          fieldConfigs,
          limit,
          cursor,
          orderBy
        );

        // Get total count from RxDB (with same filters, no limit)
        // Build selector for count query
        const countSelector: any = { _deleted: false };

        // Apply same filters for count
        for (const [fieldKey, value] of Object.entries(filters)) {
          if (value === undefined || value === null || value === '') continue;

          let fieldConfig = fieldConfigs[fieldKey];
          if (!fieldConfig) {
            const prefixedKey = `${entityType}_field_${fieldKey}`;
            fieldConfig = fieldConfigs[prefixedKey];
          }

          const finalFieldConfig = fieldConfig || {};
          const fieldType = finalFieldConfig.fieldType || 'string';

          // For string/text fields in search, always use 'ilike' (ignore 'eq' from config)
          let configOperator = finalFieldConfig.operator;
          if ((fieldType === 'string' || fieldType === 'text') && configOperator === 'eq') {
            configOperator = undefined; // Let detectOperator use default 'ilike' for string
          }

          const operator = this.detectOperator(fieldType, configOperator);

          // Add to selector
          if (operator === 'ilike' || operator === 'contains') {
            // Escape regex special characters and use string pattern
            const escapedValue = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            countSelector[fieldKey] = { $regex: escapedValue, $options: 'i' };
          } else if (operator === 'eq') {
            countSelector[fieldKey] = value;
          } else if (operator === 'gt') {
            countSelector[fieldKey] = { $gt: value };
          } else if (operator === 'gte') {
            countSelector[fieldKey] = { $gte: value };
          } else if (operator === 'lt') {
            countSelector[fieldKey] = { $lt: value };
          } else if (operator === 'lte') {
            countSelector[fieldKey] = { $lte: value };
          }
        }

        // Get total count by fetching all matching records (without limit)
        // Note: We use find() instead of count() to avoid "slow count" errors when selector doesn't match index
        const allMatchingDocs = await collection.find({
          selector: countSelector
        }).exec();
        const totalCount = allMatchingDocs.length;

        // Calculate hasMore based on cursor
        const hasMore = localResults.length >= limit;
        // For JSONB fields, extract nested value for cursor
        const nextCursor = localResults.length > 0
          ? (orderBy.parameter
              ? localResults[localResults.length - 1]?.[orderBy.field]?.[orderBy.parameter]
              : localResults[localResults.length - 1]?.[orderBy.field]) ?? null
          : null;

        console.log(`[SpaceStore] 📴 Offline mode: returning ${localResults.length}/${totalCount} records (hasMore: ${hasMore})`);

        return {
          records: localResults,
          total: totalCount,
          hasMore,
          nextCursor,
          offline: true  // ✅ Flag for UI to show "You're offline" message
        } as any;
      } catch (offlineError) {
        console.error('[SpaceStore] Offline fallback also failed:', offlineError);
        return {
          records: [],
          total: 0,
          hasMore: false,
          nextCursor: null,
          offline: true
        } as any;
      }
    }
  }

  /**
   * 🔧 Helper: Remove entity_field_ prefix from field name
   * Used for converting config field names to DB field names
   * Example: breed_field_measurements -> measurements
   */
  private removeFieldPrefix(fieldName: string, entityType: string): string {
    return fieldName.replace(new RegExp(`^${entityType}_field_`), '');
  }

  /**
   * Filter entities locally in RxDB
   * Builds RxDB query with AND logic for all filters
   */
  private async filterLocalEntities(
    entityType: string,
    filters: Record<string, any>,
    fieldConfigs: Record<string, any>,
    limit: number,
    cursor: string | null,
    orderBy: { field: string; direction: 'asc' | 'desc'; parameter?: string }
  ): Promise<any[]> {
    if (!this.db) {
      return [];
    }

    const collection = this.db.collections[entityType];
    if (!collection) {
      console.warn(`[SpaceStore] Collection ${entityType} not found for local filtering`);
      return [];
    }

    // Helper function for JSONB-aware sorting in JavaScript
    const sortResults = (results: any[]): any[] => {
      return results.sort((a, b) => {
        let aVal, bVal;

        if (orderBy.parameter) {
          // JSONB field - extract nested value (e.g., measurements->achievement_progress)
          aVal = a[orderBy.field]?.[orderBy.parameter];
          bVal = b[orderBy.field]?.[orderBy.parameter];
        } else {
          // Regular field
          aVal = a[orderBy.field];
          bVal = b[orderBy.field];
        }

        // Handle null/undefined (push to end)
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        // Compare values
        if (orderBy.direction === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });
    };

    // orderBy.field is already normalized (e.g., pet_type_id)
    try {
      // First check: how many docs in collection?
      const totalDocs = await collection.count().exec();
      console.log(`[SpaceStore] 📊 Collection ${entityType} has ${totalDocs} docs in RxDB`);

      // 🎯 HYBRID SEARCH: Detect if we have a string/text filter for hybrid search
      const stringFilters = Object.entries(filters).filter(([fieldKey, value]) => {
        if (value === undefined || value === null || value === '') return false;

        let fieldConfig = fieldConfigs[fieldKey];
        if (!fieldConfig) {
          const prefixedKey = `${entityType}_field_${fieldKey}`;
          fieldConfig = fieldConfigs[prefixedKey];
        }

        const fieldType = fieldConfig?.fieldType || 'string';
        return fieldType === 'string' || fieldType === 'text';
      });

      // Use hybrid search if: (1) has string filter, (2) no cursor (first page)
      const useHybridSearch = stringFilters.length > 0 && cursor === null;

      if (useHybridSearch) {
        console.log('[SpaceStore] 🔍 HYBRID SEARCH mode (starts_with 70% + contains 30%)');

        // Phase 1: Starts with (high priority, 70% of limit)
        const startsWithLimit = Math.ceil(limit * 0.7);

        // Build selector for starts_with
        const startsWithSelector: any = { _deleted: false };

        // Apply string filters as starts_with (using $regex string pattern)
        for (const [fieldKey, value] of stringFilters) {
          const escapedValue = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          startsWithSelector[fieldKey] = { $regex: `^${escapedValue}`, $options: 'i' };
        }

        // Apply non-string filters to selector
        for (const [fieldKey, value] of Object.entries(filters)) {
          if (stringFilters.some(([k]) => k === fieldKey)) continue; // Skip string filters
          if (value === undefined || value === null || value === '') continue;

          let fieldConfig = fieldConfigs[fieldKey];
          if (!fieldConfig) {
            const prefixedKey = `${entityType}_field_${fieldKey}`;
            fieldConfig = fieldConfigs[prefixedKey];
          }

          const fieldType = fieldConfig?.fieldType || 'string';
          const operator = this.detectOperator(fieldType, fieldConfig?.operator);

          // Add to selector based on operator
          if (operator === 'eq') {
            startsWithSelector[fieldKey] = value;
          } else if (operator === 'gt') {
            startsWithSelector[fieldKey] = { $gt: value };
          } else if (operator === 'gte') {
            startsWithSelector[fieldKey] = { $gte: value };
          } else if (operator === 'lt') {
            startsWithSelector[fieldKey] = { $lt: value };
          } else if (operator === 'lte') {
            startsWithSelector[fieldKey] = { $lte: value };
          }
        }

        // Execute starts_with query
        // For JSONB fields, don't use RxDB sort (not supported), sort in JS instead
        const queryOptions: any = { selector: startsWithSelector };
        if (!orderBy.parameter) {
          // Only use RxDB sort for regular fields
          queryOptions.sort = [{ [orderBy.field]: orderBy.direction === 'asc' ? 'asc' : 'desc' }];
        }

        const startsWithDocs = await collection.find(queryOptions).exec();
        let startsWithResults = startsWithDocs.map(doc => doc.toJSON());

        // Sort in JavaScript (handles both regular and JSONB fields)
        startsWithResults = sortResults(startsWithResults);

        // Apply limit after sorting
        startsWithResults = startsWithResults.slice(0, startsWithLimit);

        console.log(`[SpaceStore] ✅ Got ${startsWithResults.length} starts_with results`);

        // Phase 2: Contains (lower priority, 30% of limit)
        const remainingLimit = limit - startsWithResults.length;
        let allResults = startsWithResults;

        if (remainingLimit > 0) {
          // Build selector for contains
          const containsSelector: any = { _deleted: false };

          // Apply string filters as contains (using $regex string pattern)
          for (const [fieldKey, value] of stringFilters) {
            const escapedValue = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            containsSelector[fieldKey] = { $regex: escapedValue, $options: 'i' };
          }

          // Apply non-string filters to selector
          for (const [fieldKey, value] of Object.entries(filters)) {
            if (stringFilters.some(([k]) => k === fieldKey)) continue;
            if (value === undefined || value === null || value === '') continue;

            let fieldConfig = fieldConfigs[fieldKey];
            if (!fieldConfig) {
              const prefixedKey = `${entityType}_field_${fieldKey}`;
              fieldConfig = fieldConfigs[prefixedKey];
            }

            const fieldType = fieldConfig?.fieldType || 'string';
            const operator = this.detectOperator(fieldType, fieldConfig?.operator);

            // Add to selector based on operator
            if (operator === 'eq') {
              containsSelector[fieldKey] = value;
            } else if (operator === 'gt') {
              containsSelector[fieldKey] = { $gt: value };
            } else if (operator === 'gte') {
              containsSelector[fieldKey] = { $gte: value };
            } else if (operator === 'lt') {
              containsSelector[fieldKey] = { $lt: value };
            } else if (operator === 'lte') {
              containsSelector[fieldKey] = { $lte: value };
            }
          }

          // Execute contains query
          // For JSONB fields, don't use RxDB sort (not supported), sort in JS instead
          const containsQueryOptions: any = { selector: containsSelector };
          if (!orderBy.parameter) {
            // Only use RxDB sort for regular fields
            containsQueryOptions.sort = [{ [orderBy.field]: orderBy.direction === 'asc' ? 'asc' : 'desc' }];
          }

          const containsDocs = await collection.find(containsQueryOptions).exec();

          // Filter out records that start with search (already in startsWithResults)
          const startsWithIds = new Set(startsWithResults.map(r => r.id));
          let containsResults = containsDocs
            .map(doc => doc.toJSON())
            .filter(record => !startsWithIds.has(record.id));

          // Sort in JavaScript (handles both regular and JSONB fields)
          containsResults = sortResults(containsResults);

          // Apply limit after sorting
          containsResults = containsResults.slice(0, remainingLimit);

          console.log(`[SpaceStore] ✅ Got ${containsResults.length} contains results (after filtering)`);

          allResults = [...startsWithResults, ...containsResults];
        }

        console.log(`[SpaceStore] 📦 Hybrid search returned ${allResults.length} total results`);
        return allResults;

      } else {
        // Regular search (no hybrid) - use selector approach
        console.log('[SpaceStore] 🔍 Regular search mode (cursor or no string filters)');

        // Build selector
        const selector: any = { _deleted: false };

        // Apply each filter to selector
        for (const [fieldKey, value] of Object.entries(filters)) {
          if (value === undefined || value === null || value === '') {
            continue; // Skip empty filters
          }

          // Try to find field config (with and without prefix)
          let fieldConfig = fieldConfigs[fieldKey];
          if (!fieldConfig) {
            const prefixedKey = `${entityType}_field_${fieldKey}`;
            fieldConfig = fieldConfigs[prefixedKey];
          }

          const finalFieldConfig = fieldConfig || {};
          const fieldType = finalFieldConfig.fieldType || 'string';

          // For string/text fields in search, always use 'ilike' (ignore 'eq' from config)
          let configOperator = finalFieldConfig.operator;
          if ((fieldType === 'string' || fieldType === 'text') && configOperator === 'eq') {
            configOperator = undefined; // Let detectOperator use default 'ilike' for string
          }

          const operator = this.detectOperator(fieldType, configOperator);

          console.log('[SpaceStore] 🔍 Applying filter:', {
            fieldKey,
            fieldType,
            operator,
            value,
            hasFieldConfig: !!fieldConfig
          });

          // Add to selector based on operator
          if (operator === 'ilike' || operator === 'contains') {
            const escapedValue = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            selector[fieldKey] = { $regex: escapedValue, $options: 'i' };
          } else if (operator === 'eq') {
            selector[fieldKey] = value;
          } else if (operator === 'gt') {
            selector[fieldKey] = { $gt: value };
          } else if (operator === 'gte') {
            selector[fieldKey] = { $gte: value };
          } else if (operator === 'lt') {
            selector[fieldKey] = { $lt: value };
          } else if (operator === 'lte') {
            selector[fieldKey] = { $lte: value };
          }
        }

        // ✅ KEYSET PAGINATION: Apply cursor to selector
        // Note: For JSONB fields, we can't use RxDB selector, will filter in JS after query
        if (cursor !== null && !orderBy.parameter) {
          // Only apply cursor in selector for regular fields
          if (orderBy.direction === 'asc') {
            selector[orderBy.field] = { $gt: cursor };
          } else {
            selector[orderBy.field] = { $lt: cursor };
          }
          console.log(`[SpaceStore] 🔑 Applied cursor: ${orderBy.field} ${orderBy.direction === 'asc' ? '>' : '<'} '${cursor}'`);
        } else if (cursor !== null && orderBy.parameter) {
          console.log(`[SpaceStore] 🔑 JSONB cursor (will filter in JS): ${orderBy.field}.${orderBy.parameter} ${orderBy.direction === 'asc' ? '>' : '<'} '${cursor}'`);
        }

        // Execute query with selector
        // For JSONB fields, don't use RxDB sort (not supported), sort in JS instead
        const regularQueryOptions: any = { selector };
        if (!orderBy.parameter) {
          // Only use RxDB sort for regular fields
          regularQueryOptions.sort = [{ [orderBy.field]: orderBy.direction === 'asc' ? 'asc' : 'desc' }];
        }
        // Don't apply limit in RxDB query if we have JSONB sorting (need to sort all, then limit)
        if (!orderBy.parameter && limit > 0) {
          regularQueryOptions.limit = limit;
        }

        const docs = await collection.find(regularQueryOptions).exec();
        let results = docs.map((doc: any) => doc.toJSON());

        // For JSONB fields with cursor, filter in JavaScript (RxDB can't filter by nested fields)
        if (cursor !== null && orderBy.parameter) {
          results = results.filter((record: any) => {
            const value = record[orderBy.field]?.[orderBy.parameter];
            if (orderBy.direction === 'asc') {
              return value > cursor;
            } else {
              return value < cursor;
            }
          });
          console.log(`[SpaceStore] 🔍 Filtered ${results.length} results after JSONB cursor`);
        }

        // Sort in JavaScript (handles both regular and JSONB fields)
        if (orderBy.parameter) {
          results = sortResults(results);
          // Apply limit after sorting for JSONB fields
          if (limit > 0) {
            results = results.slice(0, limit);
          }
        }

        console.log(`[SpaceStore] 📦 Local query returned ${results.length} results`);

        // Log first result for debugging
        if (results.length > 0) {
          console.log('[SpaceStore] 👁️ First result:', results[0]);
        }

        return results;
      }

    } catch (error) {
      console.error('[SpaceStore] ❌ Local filtering error:', error);
      return [];
    }
  }

  /**
   * 🆔 ID-First Phase 1: Fetch IDs + ordering field from Supabase
   * Lightweight query (~1KB for 30 records instead of ~30KB)
   */
  private async fetchIDsFromSupabase(
    entityType: string,
    filters: Record<string, any>,
    fieldConfigs: Record<string, any>,
    limit: number,
    cursor: string | null,
    orderBy: { field: string; direction: 'asc' | 'desc'; parameter?: string }
  ): Promise<Array<{ id: string; [key: string]: any }>> {
    const { supabase } = await import('../supabase/client');

    console.log(`[SpaceStore] 🆔 Fetching IDs for ${entityType}...`);

    // orderBy.field is already normalized (e.g., pet_type_id, measurements)
    // For JSONB fields with parameter, use field->>parameter syntax
    const orderField = orderBy.parameter
      ? `${orderBy.field}->>${orderBy.parameter}`
      : orderBy.field;

    console.log(`[SpaceStore] 🔍 Order field for Supabase: ${orderField}`);

    // Build lightweight query: only ID + ordering field
    let query = supabase
      .from(entityType)
      .select(`id, ${orderField}`);

    // Filter out deleted records
    query = query.or('deleted.is.null,deleted.eq.false');

    // Apply filters (AND logic)
    for (const [fieldKey, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // fieldKey is already normalized (pet_type_id), so direct lookup works
      const fieldConfig = fieldConfigs[fieldKey] || {};
      const fieldType = fieldConfig.fieldType || 'string';
      const operator = this.detectOperator(fieldType, fieldConfig.operator);

      // fieldKey is already the DB field name (normalized)
      // Apply filter based on operator
      query = this.applySupabaseFilter(query, fieldKey, operator, value);
    }

    // Apply cursor (keyset pagination)
    if (cursor !== null) {
      if (orderBy.direction === 'asc') {
        query = query.gt(orderField, cursor);
      } else {
        query = query.lt(orderField, cursor);
      }
      console.log(`[SpaceStore] 🔑 Cursor: ${orderField} ${orderBy.direction === 'asc' ? '>' : '<'} '${cursor}'`);
    }

    // Apply order and limit
    query = query
      .order(orderField, { ascending: orderBy.direction === 'asc' })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      // Check if this is a network error (offline mode)
      const errorMessage = error.message?.toLowerCase() || '';
      const errorName = (error as any)?.name?.toLowerCase() || '';
      const errorCode = (error as any)?.code?.toLowerCase() || '';
      const errorString = String(error).toLowerCase();

      const isNetworkError = errorMessage.includes('fetch') ||
                            errorMessage.includes('network') ||
                            errorMessage.includes('disconnected') ||
                            errorMessage.includes('failed to fetch') ||
                            errorName.includes('network') ||
                            errorName.includes('fetch') ||
                            errorName.includes('disconnected') ||
                            errorCode.includes('network') ||
                            errorCode.includes('disconnected') ||
                            errorCode.includes('err_internet_disconnected') ||
                            errorString.includes('err_internet_disconnected') ||
                            (error instanceof TypeError && errorMessage.includes('fetch')) ||
                            !navigator.onLine; // Fallback: check browser online status

      if (isNetworkError) {
        console.warn('[SpaceStore] ⚠️ Network unavailable for IDs query, will use offline mode');
      } else {
        console.error('[SpaceStore] ❌ IDs query error:', error);
      }
      throw error;
    }

    console.log(`[SpaceStore] ✅ Fetched ${data?.length || 0} IDs (~${Math.round((data?.length || 0) * 0.1)}KB)`);

    return data || [];
  }

  /**
   * 🌐 ID-First Phase 3: Fetch full records by IDs
   * Only fetches missing records that aren't in RxDB cache
   */
  private async fetchRecordsByIDs(
    entityType: string,
    ids: string[]
  ): Promise<any[]> {
    if (ids.length === 0) {
      return [];
    }

    const { supabase } = await import('../supabase/client');

    console.log(`[SpaceStore] 🌐 Fetching ${ids.length} full records by IDs...`);

    const { data, error } = await supabase
      .from(entityType)
      .select('*')
      .in('id', ids);

    if (error) {
      console.error('[SpaceStore] ❌ Records fetch error:', error);
      throw error;
    }

    console.log(`[SpaceStore] ✅ Fetched ${data?.length || 0} full records (~${Math.round((data?.length || 0) * 1)}KB)`);

    return data || [];
  }

  /**
   * Map Supabase record to RxDB format
   * Extracted from fetchFilteredFromSupabase for reusability
   */
  private mapToRxDBFormat(supabaseDoc: any, entityType: string): any {
    const collection = this.db?.collections[entityType];
    if (!collection) {
      console.warn(`[SpaceStore] Collection ${entityType} not found for mapping`);
      return supabaseDoc;
    }

    const schema = collection.schema.jsonSchema;
    const mapped: any = {};

    // If we have schema, use it to map fields
    if (schema?.properties) {
      for (const fieldName in schema.properties) {
        if (fieldName === '_deleted') {
          // Special handling for deleted field
          mapped._deleted = Boolean(supabaseDoc.deleted);
        } else if (supabaseDoc.hasOwnProperty(fieldName)) {
          mapped[fieldName] = supabaseDoc[fieldName];
        }
      }
    } else {
      // Fallback: copy all fields, handling special cases
      // ⚠️ CRITICAL: Exclude RxDB service fields (_meta, _attachments, _rev)
      const serviceFields = ['_meta', '_attachments', '_rev'];

      for (const key in supabaseDoc) {
        // Skip RxDB service fields
        if (serviceFields.includes(key)) {
          continue;
        }

        if (key === 'deleted') {
          mapped._deleted = Boolean(supabaseDoc.deleted);
        } else {
          mapped[key] = supabaseDoc[key];
        }
      }
    }

    // Ensure required fields
    mapped.id = mapped.id || supabaseDoc.id;
    mapped.created_at = mapped.created_at || supabaseDoc.created_at;
    mapped.updated_at = mapped.updated_at || supabaseDoc.updated_at;

    // ✅ IMPORTANT: Remove service fields that might have been copied
    delete mapped._meta;
    delete mapped._attachments;
    delete mapped._rev;

    return mapped;
  }

  /**
   * Fetch filtered results from Supabase
   * Builds Supabase query with filters and caches results in RxDB
   * Supports keyset-based pagination for scroll (cursor)
   */
  private async fetchFilteredFromSupabase(
    entityType: string,
    filters: Record<string, any>,
    fieldConfigs: Record<string, any>,
    limit: number,
    cursor: string | null,
    orderBy: { field: string; direction: 'asc' | 'desc' }
  ): Promise<any[]> {
    if (!this.db) {
      return [];
    }

    const collection = this.db.collections[entityType];
    if (!collection) {
      console.warn(`[SpaceStore] Collection ${entityType} not found for Supabase fetch`);
      return [];
    }

    try {
      console.log(`[SpaceStore] 🚀 fetchFilteredFromSupabase START for ${entityType}`);

      // Import supabase client
      const { supabase } = await import('../supabase/client');

      // Build Supabase query
      let query = supabase.from(entityType).select('*');

      // CRITICAL: Filter out deleted records for UI pagination
      // (deleted records should not count towards offset/total)
      query = query.or('deleted.is.null,deleted.eq.false');

      console.log(`[SpaceStore] 🔨 Building Supabase query for ${entityType}...`);

      // Apply filters (AND logic)
      for (const [fieldKey, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === '') {
          continue; // Skip empty filters
        }

        // fieldKey is already normalized (pet_type_id), so direct lookup works
        const fieldConfig = fieldConfigs[fieldKey] || {};
        const fieldType = fieldConfig.fieldType || 'string';
        const operator = this.detectOperator(fieldType, fieldConfig.operator);

        console.log('[SpaceStore] Applying Supabase filter:', {
          fieldKey,
          fieldType,
          operator,
          value
        });

        // fieldKey is already the DB field name (normalized)
        // Apply filter based on operator
        query = this.applySupabaseFilter(query, fieldKey, operator, value);
      }

      // ✅ KEYSET PAGINATION: Apply cursor (WHERE field > cursor)
      if (cursor !== null) {
        if (orderBy.direction === 'asc') {
          query = query.gt(orderBy.field, cursor);
        } else {
          query = query.lt(orderBy.field, cursor);
        }
        console.log(`[SpaceStore] 🔑 Applied cursor: ${orderBy.field} ${orderBy.direction === 'asc' ? '>' : '<'} '${cursor}'`);
      }

      // Apply order for consistent pagination (CRITICAL! Must match RxDB sort)
      query = query.order(orderBy.field, { ascending: orderBy.direction === 'asc' });

      // Apply limit (NO range!)
      query = query.limit(limit);

      const { data, error } = await query;

      console.log(`[SpaceStore] 📡 Executed Supabase query: cursor=${cursor}, order(${orderBy.field}, ${orderBy.direction}), limit=${limit}`);

      console.log(`[SpaceStore] 📬 Supabase response received:`, {
        hasData: !!data,
        dataLength: data?.length,
        hasError: !!error
      });

      if (error) {
        console.error('[SpaceStore] ❌ Supabase query error:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('[SpaceStore] ⚠️ No data returned from Supabase');
        return [];
      }

      console.log(`[SpaceStore] ✅ Got ${data.length} records from Supabase`);

      // Map Supabase records to RxDB format (same logic as EntityReplicationService)
      const schema = collection.schema.jsonSchema;
      const mappedData = data.map(supabaseDoc => {
        const mapped: any = {};

        // If we have schema, use it to map fields
        if (schema?.properties) {
          for (const fieldName in schema.properties) {
            if (fieldName === '_deleted') {
              // Special handling for deleted field
              mapped._deleted = Boolean(supabaseDoc.deleted);
            } else if (supabaseDoc.hasOwnProperty(fieldName)) {
              mapped[fieldName] = supabaseDoc[fieldName];
            }
          }
        } else {
          // Fallback: copy all fields, handling special cases
          for (const key in supabaseDoc) {
            if (key === 'deleted') {
              mapped._deleted = Boolean(supabaseDoc.deleted);
            } else {
              mapped[key] = supabaseDoc[key];
            }
          }
        }

        // Ensure required fields
        mapped.id = mapped.id || supabaseDoc.id;
        mapped.created_at = mapped.created_at || supabaseDoc.created_at;
        mapped.updated_at = mapped.updated_at || supabaseDoc.updated_at;

        return mapped;
      });

      console.log('[SpaceStore] 🔄 Mapped to RxDB format, first record:', mappedData[0]);

      // Cache results in RxDB (bulk upsert for performance)
      try {
        console.log(`[SpaceStore] 💾 Attempting to cache ${mappedData.length} results in RxDB...`);
        console.log('[SpaceStore] 🗂️ Collection name:', collection.name);

        const beforeCount = await collection.count().exec();
        console.log(`[SpaceStore] 📊 Collection had ${beforeCount} docs before caching`);

        // Check which IDs already exist
        const incomingIds = mappedData.map(d => d.id);
        const existingDocs = await collection.findByIds(incomingIds).exec();
        const existingIds = Array.from(existingDocs.keys());
        const newIds = incomingIds.filter(id => !existingIds.includes(id));

        console.log(`[SpaceStore] 🔍 ID analysis:`, {
          incoming: incomingIds.length,
          alreadyExist: existingIds.length,
          willBeNew: newIds.length,
          incomingIds: incomingIds.slice(0, 3),
          existingIds: existingIds.slice(0, 3),
          newIds: newIds.slice(0, 3)
        });

        const result = await collection.bulkUpsert(mappedData);
        console.log(`[SpaceStore] 🔍 BulkUpsert result:`, {
          success: result.success.length,
          error: result.error.length,
          errorDetails: result.error.map(e => ({ id: e.documentId, error: e.error }))
        });

        // Verify caching worked
        const afterCount = await collection.count().exec();
        console.log(`[SpaceStore] ✅ Cached successfully! Collection now has ${afterCount} docs (was ${beforeCount}, added ${afterCount - beforeCount})`);
      } catch (upsertError) {
        console.error('[SpaceStore] ❌ Failed to cache results in RxDB:', upsertError);
        console.error('[SpaceStore] ❌ Error details:', {
          name: (upsertError as any).name,
          message: (upsertError as any).message,
          stack: (upsertError as any).stack
        });
        // Continue even if caching fails
      }

      return mappedData;

    } catch (error) {
      console.error('[SpaceStore] Supabase filtering error:', error);
      return [];
    }
  }

  /**
   * Detect operator based on field type
   * Automatic operator selection for smart filtering
   */
  private detectOperator(fieldType: string, configOperator?: string): string {
    // Use config operator if explicitly set
    if (configOperator) {
      console.log('[SpaceStore] 🎯 Using explicit operator from config:', configOperator);
      return configOperator;
    }

    // Auto-detect by field type
    let operator: string;
    switch (fieldType) {
      case 'string':
      case 'text':
        operator = 'ilike'; // Case-insensitive search
        break;

      case 'uuid':
        operator = 'eq'; // Exact match
        break;

      case 'number':
      case 'integer':
        operator = 'eq'; // Exact match (can be 'gt', 'lt' if needed)
        break;

      case 'boolean':
        operator = 'eq';
        break;

      case 'date':
      case 'timestamp':
        operator = 'gte'; // Greater than or equal (can be 'lte' for range end)
        break;

      default:
        operator = 'eq'; // Default to exact match
        break;
    }

    console.log('[SpaceStore] 🎯 Auto-detected operator:', {
      fieldType,
      operator
    });

    return operator;
  }

  /**
   * Apply filter to RxDB query
   * Translates operator to RxDB syntax
   */
  private applyRxDBFilter(query: any, fieldName: string, operator: string, value: any): any {
    switch (operator) {
      case 'ilike':
      case 'contains':
        // Case-insensitive regex search
        // Note: RxDB requires string patterns, not RegExp objects
        const escapedValue = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        console.log('[SpaceStore] 🔍 RxDB regex pattern:', escapedValue);

        // Use $regex selector syntax (string pattern with $options)
        return query.where(fieldName).regex(escapedValue);  // Pass string, not RegExp

      case 'eq':
        return query.where(fieldName).eq(value);

      case 'ne':
        return query.where(fieldName).ne(value);

      case 'gt':
        return query.where(fieldName).gt(value);

      case 'gte':
        return query.where(fieldName).gte(value);

      case 'lt':
        return query.where(fieldName).lt(value);

      case 'lte':
        return query.where(fieldName).lte(value);

      case 'in':
        // Value should be array
        const arrayValue = Array.isArray(value) ? value : [value];
        return query.where(fieldName).in(arrayValue);

      default:
        console.warn(`[SpaceStore] Unknown RxDB operator: ${operator}`);
        return query;
    }
  }

  /**
   * Apply filter to Supabase query
   * Translates operator to Supabase syntax
   */
  private applySupabaseFilter(query: any, fieldName: string, operator: string, value: any): any {
    switch (operator) {
      case 'ilike':
        // Case-insensitive LIKE with wildcards
        return query.ilike(fieldName, `%${value}%`);

      case 'contains':
        // Case-sensitive LIKE
        return query.like(fieldName, `%${value}%`);

      case 'eq':
        return query.eq(fieldName, value);

      case 'ne':
        return query.neq(fieldName, value);

      case 'gt':
        return query.gt(fieldName, value);

      case 'gte':
        return query.gte(fieldName, value);

      case 'lt':
        return query.lt(fieldName, value);

      case 'lte':
        return query.lte(fieldName, value);

      case 'in':
        // Value should be array
        const arrayValue = Array.isArray(value) ? value : [value];
        return query.in(fieldName, arrayValue);

      default:
        console.warn(`[SpaceStore] Unknown Supabase operator: ${operator}`);
        return query;
    }
  }

  /**
   * Deduplicate results by ID
   * Removes duplicate records from combined local + remote results
   */
  private deduplicateResults(results: any[]): any[] {
    const seen = new Set<string>();
    const deduplicated: any[] = [];

    for (const record of results) {
      if (record.id && !seen.has(record.id)) {
        seen.add(record.id);
        deduplicated.push(record);
      }
    }

    return deduplicated;
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

    // Get batchSize from view config
    const batchSize = this.getDefaultViewRows(entityType);
    console.log(`[SpaceStore] Using batchSize ${batchSize} for ${entityType} replication`);

    // Setup replication - it will handle all data loading
    const success = await entityReplicationService.setupReplication(
      this.db,
      entityType,
      {
        batchSize,  // ✅ Dynamic from view config!
        pullInterval: 5000, // 5 seconds for faster sync during development
        enableRealtime: true,
        conflictHandler: 'last-write-wins'
      }
    );

    if (success) {
      console.log(`[SpaceStore] ✅ Replication active for ${entityType}`);
      console.log(`[SpaceStore] Data will be loaded through replication pull handler`);
      // Note: totalFromServer setup moved to getEntityStore() for instant cache access
    } else {
      console.error(`[SpaceStore] ❌ Failed to setup replication for ${entityType}`);
    }

    return success;
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