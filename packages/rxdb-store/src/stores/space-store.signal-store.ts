import { signal, computed } from '@preact/signals-react';
import { getDatabase } from '../services/database.service';
import { Subscription } from 'rxjs';
import { RxCollection, RxDocument, RxJsonSchema } from 'rxdb';
import { EntityStore } from './base/entity-store';
import { appStore } from './app-store.signal-store';
import { entityReplicationService } from '../services/entity-replication.service';
import { breedChildrenSchema, breedChildrenMigrationStrategies, BreedChildrenDocument } from '../collections/breed-children.schema';
import { petChildrenSchema, petChildrenMigrationStrategies, PetChildrenDocument } from '../collections/pet-children.schema';
import { supabase } from '../supabase/client';

// Helpers
import {
  DEFAULT_TTL,
  cleanupExpiredDocuments,
  cleanupMultipleCollections,
  schedulePeriodicCleanup,
  runInitialCleanup,
  isNetworkError,
  isOffline
} from '../helpers';

// Utils
import { removeFieldPrefix, addFieldPrefix } from '../utils/field-normalization';

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
  slug?: string;
  path?: string;  // @deprecated use slug instead
  label?: string;
  order?: number;
  entitySchemaName?: string;
  entitySchemaModel?: string; // Rendering model (e.g., 'breed', 'kennel', 'club')
  totalFilterKey?: string; // Field to group totalCount by (e.g., 'breed_id' for pet, 'pet_type_id' for breed)
  fields?: Record<string, FieldConfig>;
  sort_fields?: Record<string, any>;
  filter_fields?: Record<string, any>;
  recordsCount?: number;
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

// OrderBy configuration with tie-breaker support
export interface OrderBy {
  field: string;
  direction: 'asc' | 'desc';
  tieBreaker?: {
    field: string;
    direction: 'asc' | 'desc';
  };
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

  // Child collections - lazy created on-demand
  private childCollections = new Map<string, RxCollection<any>>();

  // Cleanup interval reference
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  // Track which entity types are available
  availableEntityTypes = signal<string[]>([]);
  
  // Sync state
  syncProgress = signal<{ entity: string; loaded: number; total: number } | null>(null);
  isSyncing = signal<boolean>(false);

  // UI state - fullscreen mode for drawer (when opened from pretty URL or expand button)
  isFullscreen = signal<boolean>(false);

  // Tab loaded counts per entity - used to determine if fullscreen tab should be shown
  // Structure: { [entityId]: { [tabId]: loadedCount } }
  private tabLoadedCountsMap = signal<Record<string, Record<string, number>>>({});

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
      console.log(`[SpaceStore] Initialized in ${totalTime.toFixed(0)}ms`);

      // Run initial cleanup using helper
      runInitialCleanup(
        () => this.runCleanup(),
        '[SpaceStore]'
      );

      // Schedule periodic cleanup using helper
      this.cleanupInterval = schedulePeriodicCleanup(
        () => this.runCleanup(),
        '[SpaceStore]'
      );

      // ⚠️ DISABLED: Replication conflicts with ID-First pagination
      // ID-First загружає дані через applyFilters з правильним orderBy
      // Replication pull handler загружав би ІНШІ 30 записів (sorted by updated_at)
      // setTimeout(async () => {
      //   await this.setupEntityReplication('breed');
      // }, 1000);

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
  /**
   * Build entity schemas map from appConfig.entities
   * Key is entitySchemaName, value is the schema config
   */
  private buildEntitySchemasMap(appConfig: any): Map<string, any> {
    const entitySchemas = new Map<string, any>();

    if (!appConfig?.entities) {
      console.warn('[SpaceStore] No entities found in app config');
      return entitySchemas;
    }

    // Iterate through entities container (config_schema_xxx -> schema)
    Object.entries(appConfig.entities).forEach(([schemaKey, schema]: [string, any]) => {
      if (schema.entitySchemaName) {
        entitySchemas.set(schema.entitySchemaName, schema);
      }
    });

    console.log(`[SpaceStore] Built entity schemas map with ${entitySchemas.size} schemas:`, Array.from(entitySchemas.keys()));
    return entitySchemas;
  }

  /**
   * Get field schema from entity schema (from entities container)
   * entities.fields is the single source of truth for all available fields
   */
  private getEntityFieldsSchema(entitySchema: any, entitySchemaName: string): Map<string, FieldConfig> {
    const uniqueFields = new Map<string, FieldConfig>();

    // Get fields from entity schema
    if (!entitySchema?.fields || typeof entitySchema.fields !== 'object') {
      return uniqueFields;
    }

    Object.entries(entitySchema.fields).forEach(([fieldKey, fieldValue]: [string, any]) => {
      // Normalize field name: remove entity prefix (breed_field_pet_type_id -> pet_type_id)
      const normalizedFieldName = removeFieldPrefix(fieldKey, entitySchemaName);

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

    return uniqueFields;
  }
  
  /**
   * Parse space configurations from app config hierarchy
   * NOTE: appConfig is already the merged data (appConfig.data from DB)
   * In production it will be static pre-generated config from localStorage
   *
   * Fields are now sourced from appConfig.entities (entity schemas)
   * instead of from space.fields directly.
   */
  private parseSpaceConfigurations(appConfig: any) {
    if (!appConfig?.workspaces) {
      console.warn('[SpaceStore] No workspaces found in app config');
      return;
    }

    const entityTypes: string[] = [];
    this.spaceConfigs.clear();

    // Build entity schemas map from appConfig.entities
    const entitySchemas = this.buildEntitySchemasMap(appConfig);

    // Iterate through workspaces
    Object.entries(appConfig.workspaces).forEach(([workspaceKey, workspace]: [string, any]) => {
      if (workspace.spaces) {
        // Iterate through spaces in workspace
        Object.entries(workspace.spaces).forEach(([spaceKey, space]: [string, any]) => {
          // Check for entitySchemaName
          if (space.entitySchemaName) {
            // Get entity schema from entities map
            const entitySchema = entitySchemas.get(space.entitySchemaName);

            // Get field schema from entities (single source of truth)
            const uniqueFields = entitySchema
              ? this.getEntityFieldsSchema(entitySchema, space.entitySchemaName)
              : new Map<string, FieldConfig>();

            if (!entitySchema) {
              console.warn(`[SpaceStore] No entity schema found for ${space.entitySchemaName}`);
            }

            // Normalize keys in sort_fields and filter_fields too
            const normalizedSortFields = space.sort_fields
              ? Object.fromEntries(
                  Object.entries(space.sort_fields).map(([key, value]) => [
                    removeFieldPrefix(key, space.entitySchemaName),
                    value
                  ])
                )
              : undefined;

            const normalizedFilterFields = space.filter_fields
              ? Object.fromEntries(
                  Object.entries(space.filter_fields).map(([key, value]) => [
                    removeFieldPrefix(key, space.entitySchemaName),
                    value
                  ])
                )
              : undefined;

            // entitySchemaModel defines UI rendering model, should come from space config
            // Same schema (e.g., "account") can have different models in different spaces (e.g., "kennel", "federation")
            const entitySchemaModel = space.entitySchemaModel || space.entitySchemaName;

            const spaceConfig: SpaceConfig = {
              id: space.id || spaceKey,
              icon: space.icon,
              slug: space.slug || space.path?.replace(/^\//, ''), // Use slug or extract from path
              path: space.path, // @deprecated - keep for backwards compatibility
              label: space.label,
              order: space.order,
              entitySchemaName: space.entitySchemaName,
              entitySchemaModel: entitySchemaModel, // UI rendering model from space config
              totalFilterKey: space.totalFilterKey, // Field to group totalCount by
              fields: Object.fromEntries(uniqueFields),
              sort_fields: normalizedSortFields,
              filter_fields: normalizedFilterFields,
              recordsCount: space.recordsCount,
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
   * Get all space configurations for dynamic routing
   * Returns array of space configs sorted by order
   */
  getAllSpaceConfigs(): SpaceConfig[] {
    const configs = Array.from(this.spaceConfigs.values());
    // Sort by order, undefined order goes to end
    return configs.sort((a, b) => {
      const orderA = a.order ?? 999;
      const orderB = b.order ?? 999;
      return orderA - orderB;
    });
  }

  /**
   * Get space configuration for an entity type
   * Returns title, permissions, and other UI config
   */
  getSpaceConfig(entityType: string): any | null {
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

    // Extract views for convenience (viewTypes and viewConfigs)
    const viewConfigs: Array<{
      viewType: string;
      icon?: string;
      tooltip?: string;
      component?: string;
      itemHeight?: number;
      dividers?: boolean;
      overscan?: number;
      recordsCount?: number;
    }> = [];

    if (spaceConfig.views) {
      Object.values(spaceConfig.views).forEach((view: any) => {
        if (view && view.viewType) {
          viewConfigs.push({
            viewType: view.viewType,
            icon: view.icon,
            tooltip: view.tooltip,
            component: view.component,
            itemHeight: view.itemHeight,
            dividers: view.dividers,
            overscan: view.overscan,
            recordsCount: view.recordsCount,
          });
        }
      });
    }

    // Return FULL configuration with additional parsed fields
    return {
      ...spaceConfig,
      // Add convenience fields
      title: spaceConfig.label || spaceConfig.entitySchemaName || entityType,
      viewTypes: viewConfigs.length > 0 ? viewConfigs.map(v => v.viewType) : undefined,
      viewConfigs: viewConfigs.length > 0 ? viewConfigs : undefined,
    };
  }

  /**
   * Get default records count for entity (used for replication batch size)
   * Takes the first view's recordsCount or falls back to space-level recordsCount
   *
   * @param entityType - Entity type (e.g., 'breed', 'animal')
   * @returns Number of records, or default 50
   */
  getDefaultRecordsCount(entityType: string): number {
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
      console.warn(`[SpaceStore] No space config found for ${entityType}, using default recordsCount: 50`);
      return 50;
    }

    // Get recordsCount from first view (most common case)
    if (spaceConfig.views) {
      for (const [viewKey, viewConfig] of Object.entries(spaceConfig.views)) {
        if (viewConfig.recordsCount) {
          console.log(`[SpaceStore] Default recordsCount for ${entityType}: ${viewConfig.recordsCount} (from first view ${viewKey})`);
          return viewConfig.recordsCount;
        }
      }
    }

    // Fallback to space level recordsCount
    if (spaceConfig.recordsCount) {
      console.log(`[SpaceStore] Default recordsCount for ${entityType}: ${spaceConfig.recordsCount} (from space config)`);
      return spaceConfig.recordsCount;
    }

    console.warn(`[SpaceStore] No recordsCount config found for ${entityType}, using default: 50`);
    return 50;
  }

  /**
   * Get records count for specific view
   * This determines BOTH UI pagination AND replication batch size
   *
   * @param entityType - Entity type (e.g., 'breed', 'animal')
   * @param viewType - View type (e.g., 'list', 'grid')
   * @returns Number of records configured for this view, or default 50
   */
  getViewRecordsCount(entityType: string, viewType: string): number {
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
      console.warn(`[SpaceStore] No space config found for ${entityType}, using default recordsCount: 50`);
      return 50;
    }

    // Try to find view config by viewType inside views object
    // views structure: { "config_view_123": { viewType: "list", recordsCount: 60, ... }, ... }
    if (spaceConfig.views) {
      for (const [viewKey, viewConfig] of Object.entries(spaceConfig.views)) {
        if (viewConfig.viewType === viewType && viewConfig.recordsCount) {
          return viewConfig.recordsCount;
        }
      }
    }

    // Fallback to space level recordsCount
    if (spaceConfig.recordsCount) {
      return spaceConfig.recordsCount;
    }

    // Final fallback
    console.warn(`[SpaceStore] No recordsCount config found for ${entityType}/${viewType}, using default: 50`);
    return 50;
  }

  /**
   * Get default view (slug) from space config
   * Finds the view with isDefault: true
   *
   * @param entityType - Entity type (e.g., 'breed', 'animal')
   * @returns View slug (e.g., 'list') or first view's slug as fallback
   */
  getDefaultView(entityType: string): string {
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
      console.warn(`[SpaceStore] No space config found for ${entityType}, using default view: 'list'`);
      return 'list';
    }

    // Find view with isDefault: true
    if (spaceConfig.views) {
      for (const [viewKey, viewConfig] of Object.entries(spaceConfig.views)) {
        if (viewConfig.isDefault && viewConfig.slug) {
          return viewConfig.slug;
        }
      }

      // Fallback: return first view's slug
      const firstView = Object.values(spaceConfig.views)[0];
      if (firstView?.slug) {
        return firstView.slug;
      }

      // Fallback: return first view's viewType
      if (firstView?.viewType) {
        return firstView.viewType;
      }
    }

    // Final fallback
    console.warn(`[SpaceStore] No views config found for ${entityType}, using default: 'list'`);
    return 'list';
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
    tieBreaker?: {
      field: string;
      direction: 'asc' | 'desc';
      parameter?: string;
    };
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
            optionOrder: sortOption.order || 0,
            tieBreaker: sortOption.tieBreaker ? {
              field: sortOption.tieBreaker.field,
              direction: sortOption.tieBreaker.direction,
              parameter: sortOption.tieBreaker.parameter
            } : undefined
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
    dataSource?: 'dictionary' | 'collection';
    // Filter behavior props
    dependsOn?: string;
    disabledUntil?: string;
    filterBy?: string;
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
      dataSource?: 'dictionary' | 'collection';
      dependsOn?: string;
      disabledUntil?: string;
      filterBy?: string;
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
        referencedFieldName: field.referencedFieldName,
        dataSource: field.dataSource,
        // Filter behavior props
        dependsOn: field.dependsOn,
        disabledUntil: field.disabledUntil,
        filterBy: field.filterBy
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
    slug?: string;
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
          operator: field.operator, // Use operator from config
          slug: field.slug
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
          migrationStrategies: {
            // Version 0→1: Add cachedAt field for TTL cleanup
            1: (oldDoc: any) => {
              return {
                ...oldDoc,
                cachedAt: Date.now()
              };
            }
          }
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

      // Update store WITHOUT autoSelectFirst - let SpaceComponent handle selection
      // SpaceComponent knows about URL routing and will select appropriate entity
      entityStore.setAll(entities, false);
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
    console.log('  - Fields (single source of truth):', Object.keys(spaceConfig.fields || {}));

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

    // Process fields from spaceConfig.fields - single source of truth for schema
    if (spaceConfig.fields) {
      Object.entries(spaceConfig.fields).forEach(([fieldKey, fieldConfig]) => {
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
    // Add cachedAt for TTL cleanup (same pattern as dictionaries and child collections)
    if (!properties.cachedAt) {
      properties.cachedAt = {
        type: 'number',
        multipleOf: 1,
        minimum: 0,
        maximum: 9999999999999
      };
    }

    // Create schema
    const schema: RxJsonSchema<BusinessEntity> = {
      version: 1, // Bumped from 0 to 1 for cachedAt field addition
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
      orderBy?: OrderBy;  // ✅ Use OrderBy interface with tieBreaker support
      fieldConfigs?: Record<string, any>;
    }
  ): Promise<{ records: any[]; total: number; hasMore: boolean; nextCursor: string | null }> {
    const limit = options?.limit || 30;
    const cursor = options?.cursor ?? null;
    const orderBy: OrderBy = options?.orderBy || {
      field: 'name',
      direction: 'asc' as const,
      tieBreaker: {
        field: 'id',
        direction: 'asc' as const
      }
    };

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
    if (isOffline()) {

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
              const prefixedKey = addFieldPrefix(fieldKey, entityType);
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

      // On first page, fetch total count
      // For partitioned spaces (e.g., pet by breed_id), count within partition
      // TTL: 14 days - these counts don't change often
      const TOTAL_COUNT_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

      if (cursor === null) {
        const entityStore = this.entityStores.get(entityType);
        let shouldFetchCount = false;

        // Check if this space has a totalFilterKey (e.g., breed_id for pet, pet_type_id for breed)
        const totalFilterKey = spaceConfig?.totalFilterKey;
        const totalFilterValue = totalFilterKey ? filters[totalFilterKey] : null;
        const hasFilterKey = totalFilterKey && totalFilterValue;

        // Build cache key - include filter value if totalFilterKey is set and active
        const cacheKey = hasFilterKey
          ? `totalCount_${entityType}_${totalFilterKey}_${totalFilterValue}`
          : `totalCount_${entityType}`;

        // Check if we need to fetch (no cache or expired TTL)
        try {
          const cached = localStorage.getItem(cacheKey);

          if (cached) {
            const { value, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;

            if (age < TOTAL_COUNT_TTL_MS && value > 0) {
              // Cache is valid - use it
              if (entityStore && entityStore.totalFromServer.value === null) {
                entityStore.setTotalFromServer(value);
              }
              const filterInfo = hasFilterKey ? ` (${totalFilterKey}=${totalFilterValue})` : '';
              console.log(`[SpaceStore] 📊 Using cached total: ${value}${filterInfo} (age: ${Math.round(age / 1000 / 60 / 60)}h)`);
            } else {
              // Cache expired
              shouldFetchCount = true;
              console.log(`[SpaceStore] 📊 Cache expired, will refresh total count`);
            }
          } else {
            // No cache
            shouldFetchCount = true;
          }
        } catch (e) {
          // Invalid cache format or error - fetch fresh
          shouldFetchCount = true;
        }

        // Skip fetching if totalFilterKey is required but not provided
        // (user hasn't selected the mandatory filter yet)
        if (totalFilterKey && !totalFilterValue) {
          console.log(`[SpaceStore] 📊 Waiting for ${totalFilterKey} filter to be selected`);
          // Don't fetch - let UI show "..." until filter is selected
        } else if (shouldFetchCount) {
          // Fetch fresh count if needed
          try {
            const { supabase } = await import('../supabase/client');

            // Build query - add filter if totalFilterKey is set
            let countQuery = supabase
              .from(entityType)
              .select('*', { count: 'exact', head: true })
              .or('deleted.is.null,deleted.eq.false');

            // Add filter for grouped count
            if (hasFilterKey) {
              countQuery = countQuery.eq(totalFilterKey, totalFilterValue);
            }

            const { count: totalCount, error: countError } = await countQuery;

            if (!countError && totalCount !== null) {
              const filterInfo = hasFilterKey ? ` (${totalFilterKey}=${totalFilterValue})` : '';
              console.log(`[SpaceStore] 📊 Fresh total count: ${totalCount}${filterInfo}`);
              if (entityStore) {
                entityStore.setTotalFromServer(totalCount);
              }
              // Cache to localStorage with timestamp
              try {
                const cacheData = { value: totalCount, timestamp: Date.now() };
                localStorage.setItem(cacheKey, JSON.stringify(cacheData));
              } catch (e) {
                console.warn(`[SpaceStore] Failed to cache totalCount:`, e);
              }
            }
          } catch (e) {
            console.warn(`[SpaceStore] Failed to fetch total count:`, e);
          }
        }
      }

      if (!idsData || idsData.length === 0) {
        console.log('[SpaceStore] ⚠️ No IDs returned from Supabase');
        const entityStore = this.entityStores.get(entityType);
        return {
          records: [],
          total: entityStore?.totalFromServer.value ?? 0,
          hasMore: false,
          nextCursor: null
        };
      }

      console.log(`[SpaceStore] ✅ Got ${idsData.length} IDs from Supabase`);

      // Extract IDs and calculate nextCursor
      const ids = idsData.map(d => d.id);

      const lastRecord = idsData[idsData.length - 1];

      // ✅ Use COMPOSITE cursor (value + tieBreaker) for stable pagination
      // tieBreaker field comes from config (e.g., "name" or "id")
      const tieBreakerField = orderBy.tieBreaker?.field || 'id';
      let nextCursor: any = null;
      if (lastRecord) {
        const orderValue = lastRecord[orderBy.field] ?? null;
        const tieBreakerValue = lastRecord[tieBreakerField] ?? null;

        // Composite cursor: {value, tieBreaker, tieBreakerField} for proper pagination
        nextCursor = JSON.stringify({
          value: orderValue,
          tieBreaker: tieBreakerValue,
          tieBreakerField
        });
      }
      console.log('[SpaceStore] nextCursor extracted:', nextCursor);

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
      // 📴 OFFLINE FALLBACK: Use RxDB cache with proper filtering
      if (!isNetworkError(error)) {
        console.error('[SpaceStore] applyFilters error:', error);
      }

      try {
        if (!this.db) {
          throw new Error('Database not initialized');
        }

        const collection = this.db.collections[entityType];
        if (!collection) {
          throw new Error(`Collection ${entityType} not found`);
        }

        // Use proper filterLocalEntities() for offline mode
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
            const prefixedKey = addFieldPrefix(fieldKey, entityType);
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
   * Filter entities locally in RxDB
   * Builds RxDB query with AND logic for all filters
   */
  private async filterLocalEntities(
    entityType: string,
    filters: Record<string, any>,
    fieldConfigs: Record<string, any>,
    limit: number,
    cursor: string | null,
    orderBy: OrderBy
  ): Promise<any[]> {
    if (!this.db) {
      return [];
    }

    const collection = this.db.collections[entityType];
    if (!collection) {
      console.warn(`[SpaceStore] Collection ${entityType} not found for local filtering`);
      return [];
    }

    // Helper function for JavaScript sorting (for RxDB offline mode)
    // Supports tieBreaker from config for stable sorting when primary values are equal
    const sortResults = (results: any[]): any[] => {
      // Get tieBreaker from config, fallback to id
      const tieBreaker = orderBy.tieBreaker || { field: 'id', direction: 'asc' as const };

      return results.sort((a, b) => {
        const aVal = a[orderBy.field];
        const bVal = b[orderBy.field];

        // Handle null/undefined (push to end)
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        // Compare primary field values
        let primaryCompare: number;
        if (orderBy.direction === 'asc') {
          primaryCompare = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          primaryCompare = aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }

        // If primary values are equal, use tieBreaker
        if (primaryCompare === 0) {
          const aTieVal = a[tieBreaker.field];
          const bTieVal = b[tieBreaker.field];

          // Handle null/undefined in tieBreaker
          if (aTieVal === null || aTieVal === undefined) return 1;
          if (bTieVal === null || bTieVal === undefined) return -1;

          if (tieBreaker.direction === 'asc') {
            return aTieVal < bTieVal ? -1 : aTieVal > bTieVal ? 1 : 0;
          } else {
            return aTieVal > bTieVal ? -1 : aTieVal < bTieVal ? 1 : 0;
          }
        }

        return primaryCompare;
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
          const prefixedKey = addFieldPrefix(fieldKey, entityType);
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
            const prefixedKey = addFieldPrefix(fieldKey, entityType);
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
          // Only use RxDB sort for regular fields, include tieBreaker for stable sorting
          const tieBreaker = orderBy.tieBreaker || { field: 'id', direction: 'asc' as const };
          queryOptions.sort = [
            { [orderBy.field]: orderBy.direction === 'asc' ? 'asc' : 'desc' },
            { [tieBreaker.field]: tieBreaker.direction === 'asc' ? 'asc' : 'desc' }
          ];
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
              const prefixedKey = addFieldPrefix(fieldKey, entityType);
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
            // Only use RxDB sort for regular fields, include tieBreaker for stable sorting
            const tieBreaker = orderBy.tieBreaker || { field: 'id', direction: 'asc' as const };
            containsQueryOptions.sort = [
              { [orderBy.field]: orderBy.direction === 'asc' ? 'asc' : 'desc' },
              { [tieBreaker.field]: tieBreaker.direction === 'asc' ? 'asc' : 'desc' }
            ];
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
            const prefixedKey = addFieldPrefix(fieldKey, entityType);
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
          // Only use RxDB sort for regular fields, include tieBreaker for stable sorting
          const tieBreaker = orderBy.tieBreaker || { field: 'id', direction: 'asc' as const };
          regularQueryOptions.sort = [
            { [orderBy.field]: orderBy.direction === 'asc' ? 'asc' : 'desc' },
            { [tieBreaker.field]: tieBreaker.direction === 'asc' ? 'asc' : 'desc' }
          ];
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
          console.log(`[SpaceStore] 🔍 Filtered ${results.length} results after cursor`);
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
   * Helper: Apply orderBy with optional tieBreaker to Supabase query
   * Adds .order() calls for primary sort and tie-breaker sort
   */
  private applyOrderBy<T>(
    query: any,
    orderBy: OrderBy
  ): any {
    // Primary orderBy
    query = query.order(orderBy.field, { ascending: orderBy.direction === 'asc' });

    // TieBreaker orderBy (if provided)
    if (orderBy.tieBreaker) {
      query = query.order(orderBy.tieBreaker.field, { ascending: orderBy.tieBreaker.direction === 'asc' });
    }

    return query;
  }

  /**
   * 🆔 ID-First Phase 1: Fetch IDs + ordering field from Supabase
   * Lightweight query (~1KB for 30 records instead of ~30KB)
   *
   * 🔍 HYBRID SEARCH: For search queries with 'contains' operator, returns results in priority order:
   * 1. Starts with search term (70% of limit)
   * 2. Contains search term (30% of limit)
   * Both sorted by orderBy field
   */
  private async fetchIDsFromSupabase(
    entityType: string,
    filters: Record<string, any>,
    fieldConfigs: Record<string, any>,
    limit: number,
    cursor: string | null,
    orderBy: OrderBy
  ): Promise<Array<{ id: string; [key: string]: any }>> {
    const { supabase } = await import('../supabase/client');

    console.log(`[SpaceStore] 🆔 Fetching IDs for ${entityType}...`);

    // 🎯 HYBRID SEARCH: Detect string filters with 'contains' operator
    const searchFilters = Object.entries(filters).filter(([fieldKey, value]) => {
      if (value === undefined || value === null || value === '') return false;

      const fieldConfig = fieldConfigs[fieldKey] || {};
      const fieldType = fieldConfig.fieldType || 'string';
      const operator = this.detectOperator(fieldType, fieldConfig.operator);

      return (fieldType === 'string' || fieldType === 'text') && operator === 'contains';
    });

    // Use hybrid search if: (1) has search filter, (2) no cursor (first page)
    const useHybridSearch = searchFilters.length > 0 && cursor === null;

    if (useHybridSearch) {
      console.log('[SpaceStore] 🔍 HYBRID SEARCH mode (starts_with 70% + contains 30%)');

      // Separate search filters from other filters
      const searchField = searchFilters[0][0];
      const searchValue = searchFilters[0][1];
      const otherFilters = Object.fromEntries(
        Object.entries(filters).filter(([key]) => key !== searchField)
      );

      // Phase 1: Starts with (high priority, 70% of limit)
      const startsWithLimit = Math.ceil(limit * 0.7);
      let startsWithQuery = supabase
        .from(entityType)
        .select(`id, ${orderBy.field}`)
        .or('deleted.is.null,deleted.eq.false')
        .ilike(searchField, `${searchValue}%`); // Starts with

      // Apply other filters
      for (const [fieldKey, value] of Object.entries(otherFilters)) {
        if (value === undefined || value === null || value === '') continue;
        const fieldConfig = fieldConfigs[fieldKey] || {};
        const fieldType = fieldConfig.fieldType || 'string';
        const operator = this.detectOperator(fieldType, fieldConfig.operator);
        startsWithQuery = this.applySupabaseFilter(startsWithQuery, fieldKey, operator, value);
      }

      startsWithQuery = this.applyOrderBy(startsWithQuery, orderBy).limit(startsWithLimit);

      const { data: startsWithData, error: startsWithError } = await startsWithQuery;

      if (startsWithError) {
        console.error('[SpaceStore] ❌ Hybrid search (starts_with) failed:', startsWithError);
        throw startsWithError;
      }

      const startsWithResults = startsWithData || [];
      console.log(`[SpaceStore] ✅ Starts with: ${startsWithResults.length} results`);

      // Phase 2: Contains (lower priority) - only if we have room
      const remainingLimit = limit - startsWithResults.length;
      if (remainingLimit > 0) {
        let containsQuery = supabase
          .from(entityType)
          .select(`id, ${orderBy.field}`)
          .or('deleted.is.null,deleted.eq.false')
          .ilike(searchField, `%${searchValue}%`)  // Contains
          .not(searchField, 'ilike', `${searchValue}%`); // Exclude starts_with

        // Apply other filters
        for (const [fieldKey, value] of Object.entries(otherFilters)) {
          if (value === undefined || value === null || value === '') continue;
          const fieldConfig = fieldConfigs[fieldKey] || {};
          const fieldType = fieldConfig.fieldType || 'string';
          const operator = this.detectOperator(fieldType, fieldConfig.operator);
          containsQuery = this.applySupabaseFilter(containsQuery, fieldKey, operator, value);
        }

        containsQuery = this.applyOrderBy(containsQuery, orderBy).limit(remainingLimit);

        const { data: containsData, error: containsError } = await containsQuery;

        if (containsError) {
          console.warn('[SpaceStore] Contains search failed:', containsError);
        } else {
          const containsResults = containsData || [];
          console.log(`[SpaceStore] ✅ Contains: ${containsResults.length} results`);

          // Merge: starts_with first, then contains
          const mergedResults = [...startsWithResults, ...containsResults];
          console.log(`[SpaceStore] ✅ Fetched ${mergedResults.length} IDs (~${Math.round(mergedResults.length * 0.1)}KB) via HYBRID SEARCH`);
          return mergedResults;
        }
      }

      console.log(`[SpaceStore] ✅ Fetched ${startsWithResults.length} IDs (~${Math.round(startsWithResults.length * 0.1)}KB) via HYBRID SEARCH`);
      return startsWithResults;
    }

    // 📄 REGULAR QUERY: No search or cursor pagination
    // Include tieBreaker field in select for cursor pagination
    const tieBreakerField = orderBy.tieBreaker?.field || 'id';
    const selectFields = tieBreakerField !== orderBy.field && tieBreakerField !== 'id'
      ? `id, ${orderBy.field}, ${tieBreakerField}`
      : `id, ${orderBy.field}`;

    let query = supabase
      .from(entityType)
      .select(selectFields);

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

    // Apply cursor (keyset pagination with tie-breaker from config)
    let cursorData: { value: any; tieBreaker: any; tieBreakerField: string } | null = null;
    let data: any[] = [];
    let error: any = null;

    if (cursor !== null) {
      // Parse composite cursor {value, tieBreaker, tieBreakerField}
      try {
        cursorData = JSON.parse(cursor);
      } catch (e) {
        // Fallback for old cursor format
        cursorData = { value: cursor, tieBreaker: '', tieBreakerField: 'id' };
      }

      console.log(`[SpaceStore] 🔑 Cursor parsed:`, cursorData);

      // Use tieBreakerField from cursor (or fallback to config)
      const tbField = cursorData.tieBreakerField || tieBreakerField;
      const tbDirection = orderBy.tieBreaker?.direction || 'asc';

      // Composite cursor with tie-breaker from config
      // WHERE (field > value) OR (field = value AND tieBreakerField > tieBreakerValue)
      const mainOp = orderBy.direction === 'asc' ? 'gt' : 'lt';
      const tbOp = tbDirection === 'asc' ? 'gt' : 'lt';

      const orCondition = `${orderBy.field}.${mainOp}.${cursorData.value},and(${orderBy.field}.eq.${cursorData.value},${tbField}.${tbOp}.${cursorData.tieBreaker})`;

      console.log(`[SpaceStore] 🔑 Applying composite cursor filter:`, orCondition);
      query = query.or(orCondition);
    }

    // Apply order and limit
    query = this.applyOrderBy(query, orderBy).limit(limit);

    const { data: queryData, error: queryError } = await query;
    data = queryData || [];
    error = queryError;

    if (error) {
      if (!isNetworkError(error)) {
        console.error('[SpaceStore] IDs query error:', error);
      }
      throw error;
    }

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

    // Helper to check if schema allows null for a field
    const allowsNull = (fieldSchema: any): boolean => {
      if (!fieldSchema) return false;
      // Check if type is array with "null" in it: ["string", "null"]
      if (Array.isArray(fieldSchema.type)) {
        return fieldSchema.type.includes('null');
      }
      return false;
    };

    // If we have schema, use it to map fields
    if (schema?.properties) {
      for (const fieldName in schema.properties) {
        if (fieldName === '_deleted') {
          // Special handling for deleted field
          mapped._deleted = Boolean(supabaseDoc.deleted);
        } else if (supabaseDoc.hasOwnProperty(fieldName)) {
          const value = supabaseDoc[fieldName];
          const fieldSchema = schema.properties[fieldName];

          // Skip null values for fields that don't allow null
          if (value === null && !allowsNull(fieldSchema)) {
            continue;
          }

          mapped[fieldName] = value;
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

        // Skip null values in fallback mode
        if (supabaseDoc[key] === null) {
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

    // Add cachedAt for TTL cleanup (same pattern as dictionaries and child collections)
    mapped.cachedAt = Date.now();

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
    orderBy: OrderBy
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
      query = this.applyOrderBy(query, orderBy);

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
        // Case-INsensitive LIKE for search (same as hybrid search in RxDB)
        return query.ilike(fieldName, `%${value}%`);

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


  /**
   * Entity Selection Methods
   * Proxy calls to the underlying EntityStore for the given entity type
   */

  /**
   * Get the selected entity ID for a given entity type (static value)
   */
  getSelectedId(entityType: string): string | null {
    const entityStore = this.entityStores.get(entityType.toLowerCase());
    if (!entityStore) {
      console.warn(`[SpaceStore] No entity store found for ${entityType}`);
      return null;
    }
    return entityStore.getSelectedId();
  }

  /**
   * Get the selected entity ID as a reactive signal for a given entity type
   * Use this in React components for automatic re-renders on selection changes
   */
  getSelectedIdSignal(entityType: string): ReadonlySignal<string | null> {
    const entityStore = this.entityStores.get(entityType.toLowerCase());
    if (!entityStore) {
      console.warn(`[SpaceStore] No entity store found for ${entityType}`);
      return computed(() => null);
    }
    // Return a computed signal that tracks the selectedId
    return computed(() => entityStore.selectedId.value);
  }

  /**
   * Select an entity by ID for a given entity type
   * If entity is not in memory, loads it from RxDB collection
   */
  selectEntity(entityType: string, id: string | null): void {
    const entityStore = this.entityStores.get(entityType.toLowerCase());
    if (!entityStore) {
      console.warn(`[SpaceStore] No entity store found for ${entityType}`);
      return;
    }

    // Set selectedId immediately
    entityStore.selectEntity(id);

    // If entity not in memory, load from RxDB
    if (id && !entityStore.entityMap.value.has(id)) {
      this.loadEntityFromRxDB(entityType.toLowerCase(), id, entityStore);
    }
  }

  /**
   * Load entity from RxDB collection and add to entityStore
   * This ensures selectedEntity works even when entity is not in paginated list
   */
  private async loadEntityFromRxDB(entityType: string, id: string, entityStore: EntityStore<any>): Promise<void> {
    if (!this.db) {
      console.warn('[SpaceStore] Database not initialized');
      return;
    }

    const collection = this.db.collections[entityType];
    if (!collection) {
      console.warn(`[SpaceStore] Collection ${entityType} not found`);
      return;
    }

    try {
      const doc = await collection.findOne(id).exec();
      if (doc) {
        const entity = doc.toJSON();
        console.log(`[SpaceStore] Loaded entity ${id} from RxDB, adding to store`);
        entityStore.addOne(entity);
      } else {
        console.log(`[SpaceStore] Entity ${id} not found in RxDB, will fetch from Supabase`);
        // Entity not in RxDB - fetch from Supabase
        this.fetchEntityFromSupabase(entityType, id, entityStore);
      }
    } catch (err) {
      console.error(`[SpaceStore] Error loading entity from RxDB:`, err);
    }
  }

  /**
   * Fetch entity from Supabase and add to both RxDB and entityStore
   */
  private async fetchEntityFromSupabase(entityType: string, id: string, entityStore: EntityStore<any>): Promise<void> {
    try {
      const { supabase } = await import('../supabase/client');

      const { data, error } = await supabase
        .from(entityType)
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        console.warn(`[SpaceStore] Entity ${id} not found in Supabase`);
        return;
      }

      console.log(`[SpaceStore] Fetched entity ${id} from Supabase`);

      // Add to RxDB collection
      const collection = this.db?.collections[entityType];
      if (collection) {
        const mapped = this.mapToRxDBFormat(data, entityType);
        await collection.upsert(mapped);
      }

      // Add to entityStore
      entityStore.addOne(data);
    } catch (err) {
      console.error(`[SpaceStore] Error fetching entity from Supabase:`, err);
    }
  }

  /**
   * Fetch entity by ID from Supabase and add to store if not already present.
   * Used when navigating directly to entity via pretty URL (e.g., /akita).
   * The entity may not be in the paginated list, so we need to fetch it directly.
   */
  async fetchAndSelectEntity(entityType: string, id: string): Promise<boolean> {
    // Use getEntityStore which will create the store if it doesn't exist
    // This handles the case when navigating directly to pretty URL
    const entityStore = await this.getEntityStore(entityType.toLowerCase());

    if (!entityStore) {
      console.warn(`[SpaceStore] Could not get/create entity store for ${entityType}`);
      return false;
    }

    // Check if entity is already in store
    if (entityStore.entities.value.has(id)) {
      console.log(`[SpaceStore] Entity ${id} already in store, selecting`);
      entityStore.selectEntity(id);
      return true;
    }

    // Fetch from Supabase using imported client
    console.log(`[SpaceStore] Fetching entity ${id} from Supabase`);
    try {
      const { data, error } = await supabase
        .from(entityType)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`[SpaceStore] Error fetching entity ${id}:`, error);
        return false;
      }

      if (!data) {
        console.warn(`[SpaceStore] Entity ${id} not found in Supabase`);
        return false;
      }

      // Add to store using upsertOne
      console.log(`[SpaceStore] Adding entity ${id} to store:`, data.name || data.id);
      entityStore.upsertOne(data);
      entityStore.selectEntity(id);
      return true;
    } catch (err) {
      console.error(`[SpaceStore] Error in fetchAndSelectEntity:`, err);
      return false;
    }
  }

  /**
   * Fetch entity by slug - fast local-first lookup
   *
   * Unlike fetchAndSelectEntity, this doesn't wait for config/store initialization.
   * It queries RxDB collection directly if available, then falls back to Supabase.
   *
   * @param entityType - Entity type (e.g., 'pet')
   * @param slug - Entity slug
   * @returns Entity data or null
   */
  async fetchEntityBySlug<T = any>(entityType: string, slug: string): Promise<T | null> {
    const collectionName = entityType.toLowerCase();

    // 1. Try RxDB collection directly (instant if collection exists)
    if (this.db?.collections[collectionName]) {
      try {
        const docs = await this.db.collections[collectionName]
          .find({ selector: { slug } })
          .exec();

        if (docs.length > 0) {
          return docs[0].toJSON() as T;
        }
      } catch (err) {
        console.warn(`[SpaceStore] Error querying RxDB by slug:`, err);
      }
    }

    // 2. Fallback to Supabase
    try {
      const { data, error } = await supabase
        .from(entityType)
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        return null;
      }

      // Cache in RxDB if collection exists
      if (this.db?.collections[collectionName]) {
        const mapped = this.mapToRxDBFormat(data, collectionName);
        await this.db.collections[collectionName].upsert(mapped);
      }

      return data as T;
    } catch (err) {
      console.error(`[SpaceStore] Error fetching by slug from Supabase:`, err);
      return null;
    }
  }

  /**
   * Clear selection for a given entity type
   */
  clearSelection(entityType: string): void {
    const entityStore = this.entityStores.get(entityType.toLowerCase());
    if (!entityStore) {
      console.warn(`[SpaceStore] No entity store found for ${entityType}`);
      return;
    }
    entityStore.clearSelection();
  }

  /**
   * Get the selected entity signal for reactive updates
   * Returns a computed signal that automatically updates when entity store becomes available
   */
  getSelectedEntity(entityType: string) {
    // Return a computed that checks for entity store reactively
    return computed(() => {
      const entityStore = this.entityStores.get(entityType.toLowerCase());
      if (!entityStore) {
        return null;
      }
      return entityStore.selectedEntity.value;
    });
  }

  // ============================================================
  // CHILD COLLECTIONS - For child tables (achievement_in_breed, etc.)
  // ============================================================

  /**
   * Ensure child collection exists for entity type (lazy creation)
   *
   * Creates collection on first access, reuses existing one for subsequent calls.
   * Uses pre-defined schemas (breed_children, pet_children, kennel_children).
   */
  async ensureChildCollection(entityType: string): Promise<RxCollection<any> | null> {
    const collectionName = `${entityType}_children`;

    // Check if already created in memory
    if (this.childCollections.has(collectionName)) {
      return this.childCollections.get(collectionName)!;
    }

    if (!this.db) {
      console.error('[SpaceStore] Database not initialized for child collection');
      return null;
    }

    // Check if RxDB collection already exists
    const existingCollection = this.db.collections[collectionName];
    if (existingCollection) {
      this.childCollections.set(collectionName, existingCollection);
      return existingCollection;
    }

    // Get schema for child collection
    const schema = this.getChildCollectionSchema(entityType);
    if (!schema) {
      console.error(`[SpaceStore] No schema found for child collection: ${collectionName}`);
      return null;
    }

    try {
      // Get migration strategies for this entity type
      const migrationStrategies = this.getChildCollectionMigrationStrategies(entityType);

      // Create collection
      const collections = await this.db.addCollections({
        [collectionName]: {
          schema: schema,
          migrationStrategies: migrationStrategies
        }
      });

      const collection = collections[collectionName];
      this.childCollections.set(collectionName, collection);
      return collection;
    } catch (error) {
      console.error(`[SpaceStore] Failed to create child collection ${collectionName}:`, error);
      return null;
    }
  }

  /**
   * Get schema for child collection based on entity type
   */
  private getChildCollectionSchema(entityType: string): RxJsonSchema<any> | null {
    switch (entityType.toLowerCase()) {
      case 'breed':
        return breedChildrenSchema;
      case 'pet':
        return petChildrenSchema;
      // TODO: Add kennel_children schema when needed
      // case 'kennel':
      //   return kennelChildrenSchema;
      default:
        console.warn(`[SpaceStore] No child schema defined for entity type: ${entityType}`);
        return null;
    }
  }

  /**
   * Get migration strategies for child collection based on entity type
   */
  private getChildCollectionMigrationStrategies(entityType: string): any {
    switch (entityType.toLowerCase()) {
      case 'breed':
        return breedChildrenMigrationStrategies;
      case 'pet':
        return petChildrenMigrationStrategies;
      // TODO: Add migration strategies for other entities
      default:
        return {};
    }
  }

  /**
   * Load child records from Supabase for a specific parent entity
   *
   * @param parentId - ID of the parent entity (e.g., breed ID)
   * @param tableType - Type of child table (e.g., 'achievement_in_breed')
   * @param options - Loading options (limit, orderBy)
   * @returns Loaded records
   */
  async loadChildRecords(
    parentId: string,
    tableType: string,
    options: { limit?: number; orderBy?: string; orderDirection?: 'asc' | 'desc' } = {}
  ): Promise<any[]> {
    if (!parentId || !tableType) {
      console.warn('[SpaceStore] loadChildRecords: parentId and tableType are required');
      return [];
    }

    // Determine entity type from table name (e.g., 'achievement_in_breed' -> 'breed')
    const entityType = this.getEntityTypeFromTableType(tableType);
    if (!entityType) {
      console.error(`[SpaceStore] Cannot determine entity type from table: ${tableType}`);
      return [];
    }

    // Ensure child collection exists
    const collection = await this.ensureChildCollection(entityType);
    if (!collection) {
      return [];
    }

    // Check if data already exists in RxDB
    const existingRecords = await this.getChildRecords(parentId, tableType, options);
    if (existingRecords.length > 0) {
      return existingRecords;
    }

    // Load from Supabase
    try {
      const { supabase } = await import('../supabase/client');
      const { limit = 50, orderBy, orderDirection = 'asc' } = options;

      // Determine the parent ID field name (e.g., 'breed_id' for breed children)
      const parentIdField = `${entityType}_id`;

      // Build Supabase query
      let query = supabase
        .from(tableType)
        .select('*')
        .eq(parentIdField, parentId)
        .limit(limit);

      if (orderBy) {
        query = query.order(orderBy, { ascending: orderDirection === 'asc' });
      }

      const { data, error } = await query;

      if (error) {
        console.error(`[SpaceStore] Failed to load child records from ${tableType}:`, error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Normalize VIEW name to base table name for RxDB storage
      // e.g., 'top_pet_in_breed_with_pet' -> 'top_pet_in_breed'
      //       'top_patron_in_breed_with_contact' -> 'top_patron_in_breed'
      const normalizedTableType = tableType.replace(/_with_\w+$/, '');

      // Transform records: extract core fields + put everything else in 'additional'
      const transformedRecords = data.map((row: Record<string, any>) => {
        const { id, created_at, updated_at, created_by, updated_by, ...rest } = row;

        // Build additional object with all non-core fields
        const additional: Record<string, any> = {};
        for (const [key, value] of Object.entries(rest)) {
          // Skip the parent ID field (e.g., breed_id)
          if (key !== parentIdField && value !== undefined && value !== null) {
            additional[key] = value;
          }
        }

        return {
          id,
          tableType: normalizedTableType,
          parentId,
          additional: Object.keys(additional).length > 0 ? additional : undefined,
          cachedAt: Date.now()
        };
      });

      // Bulk upsert into RxDB collection (update if exists, insert if not)
      await collection.bulkUpsert(transformedRecords);

      return transformedRecords;
    } catch (error) {
      console.error(`[SpaceStore] Error loading child records:`, error);
      return [];
    }
  }

  /**
   * Get child records from RxDB (local cache)
   *
   * @param parentId - ID of the parent entity
   * @param tableType - Type of child table
   * @param options - Query options
   * @returns Records from local RxDB collection
   */
  async getChildRecords(
    parentId: string,
    tableType: string,
    options: { limit?: number; orderBy?: string; orderDirection?: 'asc' | 'desc' } = {}
  ): Promise<any[]> {
    if (!parentId || !tableType) {
      return [];
    }

    const entityType = this.getEntityTypeFromTableType(tableType);
    if (!entityType) {
      return [];
    }

    const collectionName = `${entityType}_children`;
    const collection = this.childCollections.get(collectionName) || this.db?.collections[collectionName];

    if (!collection) {
      return [];
    }

    // Normalize VIEW name to base table name for RxDB query
    // e.g., 'top_pet_in_breed_with_pet' -> 'top_pet_in_breed'
    const normalizedTableType = tableType.replace(/_with_\w+$/, '');

    try {
      const { limit = 50, orderBy, orderDirection = 'asc' } = options;

      // Child records schema only has: id, parentId, tableType, cachedAt, additional
      // Fields like 'placement', 'rating', etc. are stored inside 'additional'
      // RxDB cannot sort by nested fields, so we sort in JS after fetching
      const schemaFields = new Set(['id', 'parentId', 'tableType', 'cachedAt', 'additional']);
      const isSchemaField = orderBy ? schemaFields.has(orderBy) : false;

      // Build query options - RxDB doesn't allow undefined/null for limit
      const queryOptions: { selector: Record<string, any>; limit?: number } = {
        selector: {
          parentId: parentId,
          tableType: normalizedTableType
        }
      };

      // Only add limit if sorting by schema field (otherwise we fetch all for JS sorting)
      if (isSchemaField && limit > 0) {
        queryOptions.limit = limit;
      }

      let query = collection.find(queryOptions);

      // Only use RxDB sort for schema fields
      if (orderBy && isSchemaField) {
        query = query.sort({ [orderBy]: orderDirection });
      }

      const results = await query.exec();
      let records = results.map((doc: RxDocument<any>) => doc.toJSON());

      // For non-schema fields (stored in 'additional'), sort in JavaScript
      if (orderBy && !isSchemaField) {
        records.sort((a: any, b: any) => {
          const aVal = a.additional?.[orderBy] ?? null;
          const bVal = b.additional?.[orderBy] ?? null;

          // Handle nulls - push to end
          if (aVal === null && bVal === null) return 0;
          if (aVal === null) return 1;
          if (bVal === null) return -1;

          // Numeric comparison
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return orderDirection === 'asc' ? aVal - bVal : bVal - aVal;
          }

          // String comparison
          const comparison = String(aVal).localeCompare(String(bVal));
          return orderDirection === 'asc' ? comparison : -comparison;
        });

        // Apply limit after sorting
        if (limit > 0) {
          records = records.slice(0, limit);
        }
      }

      return records;
    } catch (error) {
      console.error(`[SpaceStore] Error querying child records:`, error);
      return [];
    }
  }

  /**
   * Determine entity type from child table name
   * e.g., 'achievement_in_breed' -> 'breed'
   *       'litter' -> 'pet' (if configured)
   */
  private getEntityTypeFromTableType(tableType: string): string | null {
    // Check for "_in_breed", "_in_pet", "_in_kennel" patterns
    if (tableType.includes('_in_breed') || tableType.includes('_breed')) {
      return 'breed';
    }
    if (tableType.includes('_in_pet') || tableType.includes('_pet')) {
      return 'pet';
    }
    if (tableType.includes('_in_kennel') || tableType.includes('_kennel')) {
      return 'kennel';
    }

    // For tables like 'litter', 'breed_division' etc., need explicit mapping
    const tableEntityMap: Record<string, string> = {
      'breed_division': 'breed',
      'breed_synonym': 'breed',
      'breed_forecast': 'breed',
      'related_breed': 'breed',
      'litter': 'pet',
      // Add more mappings as needed
    };

    return tableEntityMap[tableType] || null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Child Tables: ID-First Loading (same pattern as main entities)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Load child records with ID-First architecture (same as applyFilters)
   *
   * 4-phase loading:
   * 1. Fetch IDs + orderBy field from Supabase (lightweight ~1KB)
   * 2. Check RxDB cache for these IDs
   * 3. Fetch missing full records from Supabase
   * 4. Merge cached + fresh, maintain order
   *
   * @param parentId - Parent entity ID (e.g., breed_id)
   * @param tableType - Child table/view name (e.g., 'top_pet_in_breed_with_pet')
   * @param filters - Optional additional filters
   * @param options - Pagination options
   */
  async applyChildFilters(
    parentId: string,
    tableType: string,
    filters: Record<string, any> = {},
    options: {
      limit?: number;
      cursor?: string | null;
      orderBy?: OrderBy;
    } = {}
  ): Promise<{ records: any[]; total: number; hasMore: boolean; nextCursor: string | null }> {
    const limit = options.limit || 30;
    const cursor = options.cursor ?? null;
    const orderBy: OrderBy = options.orderBy || {
      field: 'id',
      direction: 'asc',
      tieBreaker: { field: 'id', direction: 'asc' }
    };

    // Determine entity type from table name
    const entityType = this.getEntityTypeFromTableType(tableType);
    if (!entityType) {
      console.error(`[SpaceStore] Cannot determine entity type from table: ${tableType}`);
      return { records: [], total: 0, hasMore: false, nextCursor: null };
    }

    const parentIdField = `${entityType}_id`;

    console.log('[SpaceStore] applyChildFilters (ID-First):', {
      parentId,
      tableType,
      filters,
      limit,
      cursor,
      orderBy
    });

    // 📴 PREVENTIVE OFFLINE CHECK
    if (isOffline()) {
      console.log('[SpaceStore] 📴 Offline mode for child records');
      try {
        const localResults = await this.filterLocalChildEntities(
          parentId,
          tableType,
          filters,
          limit,
          cursor,
          orderBy
        );

        const hasMore = localResults.length >= limit;
        const lastRecord = localResults[localResults.length - 1];
        const nextCursor = hasMore && lastRecord
          ? JSON.stringify({
              value: lastRecord.additional?.[orderBy.field] ?? lastRecord[orderBy.field],
              tieBreaker: lastRecord.id,
              tieBreakerField: 'id'
            })
          : null;

        return {
          records: localResults,
          total: localResults.length,
          hasMore,
          nextCursor
        };
      } catch (error) {
        console.error('[SpaceStore] Offline child loading failed:', error);
        return { records: [], total: 0, hasMore: false, nextCursor: null };
      }
    }

    try {
      // 🆔 PHASE 1: Fetch IDs + ordering field from Supabase
      console.log('[SpaceStore] 🆔 Phase 1: Fetching child IDs...');

      const idsData = await this.fetchChildIDsFromSupabase(
        parentId,
        tableType,
        parentIdField,
        filters,
        limit,
        cursor,
        orderBy
      );

      if (!idsData || idsData.length === 0) {
        console.log('[SpaceStore] ⚠️ No child IDs returned');
        return { records: [], total: 0, hasMore: false, nextCursor: null };
      }

      console.log(`[SpaceStore] ✅ Got ${idsData.length} child IDs`, idsData.slice(0, 3));

      // Extract IDs and calculate nextCursor
      const ids = idsData.map(d => d.id);
      const lastRecord = idsData[idsData.length - 1];
      const tieBreakerField = orderBy.tieBreaker?.field || 'id';

      let nextCursor: string | null = null;
      if (lastRecord && idsData.length >= limit) {
        nextCursor = JSON.stringify({
          value: lastRecord[orderBy.field] ?? null,
          tieBreaker: lastRecord[tieBreakerField] ?? lastRecord.id,
          tieBreakerField
        });
        console.log('[SpaceStore] 📍 nextCursor calculated:', {
          lastRecord,
          orderByField: orderBy.field,
          value: lastRecord[orderBy.field],
          tieBreaker: lastRecord[tieBreakerField],
          nextCursor
        });
      } else {
        console.log('[SpaceStore] ⚠️ No nextCursor:', {
          hasLastRecord: !!lastRecord,
          idsDataLength: idsData.length,
          limit,
          condition: `${idsData.length} >= ${limit} = ${idsData.length >= limit}`
        });
      }

      // 💾 PHASE 2: Check RxDB cache
      console.log('[SpaceStore] 💾 Phase 2: Checking RxDB cache...');

      const collection = await this.ensureChildCollection(entityType);
      if (!collection) {
        return { records: [], total: 0, hasMore: false, nextCursor: null };
      }

      const cached = await collection.find({
        selector: { id: { $in: ids } }
      }).exec();

      const cachedMap = new Map(cached.map(d => [d.id, d.toJSON()]));
      console.log(`[SpaceStore] 📦 Found ${cachedMap.size}/${ids.length} in cache`);

      // 🌐 PHASE 3: Fetch missing full records
      const missingIds = ids.filter(id => !cachedMap.has(id));

      let freshRecords: any[] = [];
      if (missingIds.length > 0) {
        console.log(`[SpaceStore] 🌐 Phase 3: Fetching ${missingIds.length} missing records...`);

        freshRecords = await this.fetchChildRecordsByIDs(
          tableType,
          missingIds,
          parentId,
          parentIdField
        );

        console.log(`[SpaceStore] ✅ Fetched ${freshRecords.length} fresh child records`);

        // Cache fresh records
        if (freshRecords.length > 0) {
          await collection.bulkUpsert(freshRecords);
          console.log(`[SpaceStore] 💾 Cached ${freshRecords.length} records`);
        }
      }

      // 🔀 PHASE 4: Merge & maintain order
      const recordsMap = new Map([
        ...cachedMap,
        ...freshRecords.map(r => [r.id, r])
      ]);

      const orderedRecords = ids
        .map(id => recordsMap.get(id))
        .filter(Boolean);

      const hasMore = idsData.length >= limit;

      console.log(`[SpaceStore] ✅ Returning ${orderedRecords.length} child records (hasMore: ${hasMore})`);

      return {
        records: orderedRecords,
        total: orderedRecords.length,
        hasMore,
        nextCursor
      };

    } catch (error) {
      // 📴 OFFLINE FALLBACK
      if (!isNetworkError(error)) {
        console.error('[SpaceStore] applyChildFilters error:', error);
      }

      try {
        const localResults = await this.filterLocalChildEntities(
          parentId,
          tableType,
          filters,
          limit,
          cursor,
          orderBy
        );

        return {
          records: localResults,
          total: localResults.length,
          hasMore: localResults.length >= limit,
          nextCursor: null
        };
      } catch (offlineError) {
        console.error('[SpaceStore] Offline fallback failed:', offlineError);
        return { records: [], total: 0, hasMore: false, nextCursor: null };
      }
    }
  }

  /**
   * 🆔 ID-First Phase 1: Fetch child IDs + ordering field from Supabase
   */
  private async fetchChildIDsFromSupabase(
    parentId: string,
    tableType: string,
    parentIdField: string,
    filters: Record<string, any>,
    limit: number,
    cursor: string | null,
    orderBy: OrderBy
  ): Promise<Array<{ id: string; [key: string]: any }>> {
    const { supabase } = await import('../supabase/client');

    // Select only id + orderBy fields for lightweight query
    const tieBreakerField = orderBy.tieBreaker?.field || 'id';
    const selectFields = tieBreakerField !== orderBy.field && tieBreakerField !== 'id'
      ? `id, ${orderBy.field}, ${tieBreakerField}`
      : `id, ${orderBy.field}`;

    let query = supabase
      .from(tableType)
      .select(selectFields)
      .eq(parentIdField, parentId);

    // Apply additional filters (for future use)
    for (const [fieldKey, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') continue;
      query = query.eq(fieldKey, value);
    }

    // Apply cursor (composite keyset pagination)
    if (cursor) {
      try {
        const cursorData = JSON.parse(cursor);
        const tbField = cursorData.tieBreakerField || tieBreakerField;
        const mainOp = orderBy.direction === 'asc' ? 'gt' : 'lt';
        const tbDirection = orderBy.tieBreaker?.direction || 'asc';
        const tbOp = tbDirection === 'asc' ? 'gt' : 'lt';

        const orCondition = `${orderBy.field}.${mainOp}.${cursorData.value},and(${orderBy.field}.eq.${cursorData.value},${tbField}.${tbOp}.${cursorData.tieBreaker})`;
        query = query.or(orCondition);
      } catch (e) {
        console.warn('[SpaceStore] Failed to parse child cursor:', e);
      }
    }

    // Apply order
    query = query.order(orderBy.field, { ascending: orderBy.direction === 'asc' });
    if (orderBy.tieBreaker) {
      query = query.order(orderBy.tieBreaker.field, { ascending: orderBy.tieBreaker.direction === 'asc' });
    }

    // Apply limit
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('[SpaceStore] Child IDs query error:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * 🌐 ID-First Phase 3: Fetch full child records by IDs
   */
  private async fetchChildRecordsByIDs(
    tableType: string,
    ids: string[],
    parentId: string,
    parentIdField: string
  ): Promise<any[]> {
    if (ids.length === 0) return [];

    const { supabase } = await import('../supabase/client');

    const { data, error } = await supabase
      .from(tableType)
      .select('*')
      .in('id', ids);

    if (error) {
      console.error('[SpaceStore] Fetch child records by IDs error:', error);
      throw error;
    }

    if (!data) return [];

    // Normalize VIEW name for RxDB storage
    const normalizedTableType = tableType.replace(/_with_\w+$/, '');

    // Transform to RxDB format
    return data.map((row: Record<string, any>) => {
      const { id, created_at, updated_at, created_by, updated_by, ...rest } = row;

      const additional: Record<string, any> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (key !== parentIdField && value !== undefined && value !== null) {
          additional[key] = value;
        }
      }

      return {
        id,
        tableType: normalizedTableType,
        parentId,
        additional: Object.keys(additional).length > 0 ? additional : undefined,
        cachedAt: Date.now()
      };
    });
  }

  /**
   * 🌐 Direct VIEW query with keyset pagination (Local-First with RxDB caching)
   *
   * For VIEWs with JOINs, WHERE id IN (...) is very slow due to query planner issues.
   * Instead, we fetch full records directly with WHERE parent_id = X and cursor pagination.
   *
   * Local-First flow:
   * 1. Query VIEW directly with parent_id filter + keyset pagination
   * 2. Transform records to RxDB format (breed_children schema)
   * 3. Cache in RxDB for offline access
   * 4. Return records with pagination cursor
   *
   * @param parentId - Parent entity ID (e.g., breed_id)
   * @param viewName - VIEW name (e.g., 'top_pet_in_breed_with_pet')
   * @param parentField - Field linking to parent (e.g., 'breed_id')
   * @param options - Pagination options
   */
  async loadChildViewDirect(
    parentId: string,
    viewName: string,
    parentField: string,
    options: {
      limit?: number;
      cursor?: string | null;
      orderBy?: OrderBy;
    } = {}
  ): Promise<{ records: any[]; total: number; hasMore: boolean; nextCursor: string | null }> {
    const limit = options.limit || 30;
    const cursor = options.cursor ?? null;
    const orderBy: OrderBy = options.orderBy || {
      field: 'placement',
      direction: 'asc',
      tieBreaker: { field: 'id', direction: 'asc' }
    };

    // Determine entity type from VIEW name
    const entityType = this.getEntityTypeFromTableType(viewName);
    if (!entityType) {
      console.error(`[SpaceStore] Cannot determine entity type from VIEW: ${viewName}`);
      return { records: [], total: 0, hasMore: false, nextCursor: null };
    }

    console.log('[SpaceStore] loadChildViewDirect (Local-First):', {
      viewName,
      parentId,
      parentField,
      entityType,
      limit,
      cursor: cursor ? '(set)' : null,
      orderBy
    });

    // 📴 PREVENTIVE OFFLINE CHECK - use cached data
    if (isOffline()) {
      console.log('[SpaceStore] 📴 Offline mode for VIEW');
      try {
        const localResults = await this.filterLocalChildEntities(
          parentId,
          viewName,
          {},
          limit,
          cursor,
          orderBy
        );

        const hasMore = localResults.length >= limit;
        const lastRecord = localResults[localResults.length - 1];
        const nextCursor = hasMore && lastRecord
          ? JSON.stringify({
              value: lastRecord.additional?.[orderBy.field] ?? lastRecord[orderBy.field],
              tieBreaker: lastRecord.id,
              tieBreakerField: 'id'
            })
          : null;

        return {
          records: localResults,
          total: localResults.length,
          hasMore,
          nextCursor
        };
      } catch (error) {
        console.error('[SpaceStore] Offline VIEW loading failed:', error);
        return { records: [], total: 0, hasMore: false, nextCursor: null };
      }
    }

    try {
      const { supabase } = await import('../supabase/client');

      // 🌐 PHASE 1: Query VIEW directly with full records
      console.log('[SpaceStore] 🌐 Phase 1: Fetching VIEW records...');

      let query = supabase
        .from(viewName)
        .select('*')
        .eq(parentField, parentId);

      // Apply cursor (keyset pagination)
      if (cursor) {
        try {
          const cursorData = JSON.parse(cursor);
          const tieBreakerField = cursorData.tieBreakerField || orderBy.tieBreaker?.field || 'id';
          const mainOp = orderBy.direction === 'asc' ? 'gt' : 'lt';
          const tbDirection = orderBy.tieBreaker?.direction || 'asc';
          const tbOp = tbDirection === 'asc' ? 'gt' : 'lt';

          const orCondition = `${orderBy.field}.${mainOp}.${cursorData.value},and(${orderBy.field}.eq.${cursorData.value},${tieBreakerField}.${tbOp}.${cursorData.tieBreaker})`;
          query = query.or(orCondition);
        } catch (e) {
          console.warn('[SpaceStore] Failed to parse VIEW cursor:', e);
        }
      }

      // Apply order
      query = query.order(orderBy.field, { ascending: orderBy.direction === 'asc' });
      if (orderBy.tieBreaker) {
        query = query.order(orderBy.tieBreaker.field, { ascending: orderBy.tieBreaker.direction === 'asc' });
      }

      // Apply limit
      query = query.limit(limit);

      const { data, error } = await query;

      if (error) {
        console.error('[SpaceStore] loadChildViewDirect error:', error);
        throw error;
      }

      const rawRecords = data || [];
      console.log(`[SpaceStore] ✅ Fetched ${rawRecords.length} VIEW records`);

      // 💾 PHASE 2: Transform & Cache in RxDB (Local-First!)
      console.log('[SpaceStore] 💾 Phase 2: Caching in RxDB...');

      const collection = await this.ensureChildCollection(entityType);
      if (!collection) {
        console.warn('[SpaceStore] ⚠️ No collection, returning raw records');
        // Still return records even without caching
        const hasMore = rawRecords.length >= limit;
        const lastRecord = rawRecords[rawRecords.length - 1];
        const nextCursor = hasMore && lastRecord
          ? JSON.stringify({
              value: lastRecord[orderBy.field] ?? null,
              tieBreaker: lastRecord[orderBy.tieBreaker?.field || 'id'] ?? lastRecord.id,
              tieBreakerField: orderBy.tieBreaker?.field || 'id'
            })
          : null;
        return { records: rawRecords, total: rawRecords.length, hasMore, nextCursor };
      }

      // Normalize VIEW name to base table for RxDB storage
      // e.g., 'top_pet_in_breed_with_pet' -> 'top_pet_in_breed'
      const normalizedTableType = viewName.replace(/_with_\w+$/, '');

      // Transform to RxDB format (breed_children schema)
      const transformedRecords = rawRecords.map((row: Record<string, any>) => {
        const { id, created_at, updated_at, created_by, updated_by, ...rest } = row;

        // Build additional object with all non-core fields
        const additional: Record<string, any> = {};
        for (const [key, value] of Object.entries(rest)) {
          // Skip the parent ID field (e.g., breed_id)
          if (key !== parentField && value !== undefined && value !== null) {
            additional[key] = value;
          }
        }

        return {
          id,
          tableType: normalizedTableType,
          parentId,
          additional: Object.keys(additional).length > 0 ? additional : undefined,
          cachedAt: Date.now()
        };
      });

      // Bulk upsert into RxDB collection (update if exists, insert if not)
      if (transformedRecords.length > 0) {
        await collection.bulkUpsert(transformedRecords);
        console.log(`[SpaceStore] 💾 Cached ${transformedRecords.length} records in RxDB`);
      }

      // Calculate nextCursor from raw records
      let nextCursor: string | null = null;
      if (rawRecords.length >= limit) {
        const lastRecord = rawRecords[rawRecords.length - 1];
        const tieBreakerField = orderBy.tieBreaker?.field || 'id';
        nextCursor = JSON.stringify({
          value: lastRecord[orderBy.field] ?? null,
          tieBreaker: lastRecord[tieBreakerField] ?? lastRecord.id,
          tieBreakerField
        });
      }

      const hasMore = rawRecords.length >= limit;

      console.log(`[SpaceStore] ✅ loadChildViewDirect: ${transformedRecords.length} records (hasMore: ${hasMore})`);

      // Return transformed records (RxDB format with additional field)
      return {
        records: transformedRecords,
        total: transformedRecords.length,
        hasMore,
        nextCursor
      };

    } catch (error) {
      // 📴 OFFLINE FALLBACK
      if (!isNetworkError(error)) {
        console.error('[SpaceStore] loadChildViewDirect failed:', error);
      }

      try {
        console.log('[SpaceStore] 📴 Falling back to local cache...');
        const localResults = await this.filterLocalChildEntities(
          parentId,
          viewName,
          {},
          limit,
          cursor,
          orderBy
        );

        return {
          records: localResults,
          total: localResults.length,
          hasMore: localResults.length >= limit,
          nextCursor: null
        };
      } catch (offlineError) {
        console.error('[SpaceStore] Offline fallback failed:', offlineError);
        return { records: [], total: 0, hasMore: false, nextCursor: null };
      }
    }
  }

  /**
   * 📴 Filter child entities from local RxDB cache (offline mode)
   */
  private async filterLocalChildEntities(
    parentId: string,
    tableType: string,
    filters: Record<string, any>,
    limit: number,
    cursor: string | null,
    orderBy: OrderBy
  ): Promise<any[]> {
    const entityType = this.getEntityTypeFromTableType(tableType);
    if (!entityType) return [];

    const collectionName = `${entityType}_children`;
    const collection = this.childCollections.get(collectionName) || this.db?.collections[collectionName];
    if (!collection) return [];

    const normalizedTableType = tableType.replace(/_with_\w+$/, '');

    // Build selector
    const selector: any = {
      parentId,
      tableType: normalizedTableType
    };

    // Apply additional filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        selector[`additional.${key}`] = value;
      }
    }

    const results = await collection.find({ selector }).exec();
    let records = results.map((doc: any) => doc.toJSON());

    // Sort by orderBy field (in additional)
    const tieBreaker = orderBy.tieBreaker || { field: 'id', direction: 'asc' as const };

    records.sort((a: any, b: any) => {
      const aVal = a.additional?.[orderBy.field] ?? a[orderBy.field];
      const bVal = b.additional?.[orderBy.field] ?? b[orderBy.field];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let cmp: number;
      if (orderBy.direction === 'asc') {
        cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        cmp = aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }

      if (cmp === 0) {
        const aTie = a[tieBreaker.field];
        const bTie = b[tieBreaker.field];
        if (tieBreaker.direction === 'asc') {
          return aTie < bTie ? -1 : aTie > bTie ? 1 : 0;
        } else {
          return aTie > bTie ? -1 : aTie < bTie ? 1 : 0;
        }
      }

      return cmp;
    });

    // Apply cursor filter
    if (cursor) {
      try {
        const cursorData = JSON.parse(cursor);
        const cursorValue = cursorData.value;
        const cursorTieBreaker = cursorData.tieBreaker;

        records = records.filter((r: any) => {
          const val = r.additional?.[orderBy.field] ?? r[orderBy.field];
          const tie = r[tieBreaker.field];

          if (orderBy.direction === 'asc') {
            return val > cursorValue || (val === cursorValue && tie > cursorTieBreaker);
          } else {
            return val < cursorValue || (val === cursorValue && tie > cursorTieBreaker);
          }
        });
      } catch (e) {
        // Ignore cursor parse errors
      }
    }

    // Apply limit
    return records.slice(0, limit);
  }

  /**
   * Cleanup expired records using helpers
   */
  private async runCleanup(): Promise<void> {
    if (!this.db) return;

    // Build collections list for cleanup
    const collections: Array<{ collection: RxCollection<any>; name: string }> = [];

    // 1. Add entity collections (breed, pet, kennel, etc.)
    for (const entityType of this.availableEntityTypes.value) {
      const collection = this.db.collections[entityType];
      if (collection) {
        collections.push({ collection, name: entityType });
      }
    }

    // 2. Add child collections (breed_children, etc.)
    for (const [name, collection] of this.childCollections.entries()) {
      collections.push({ collection, name });
    }

    // Use helper to cleanup all collections
    await cleanupMultipleCollections(collections, DEFAULT_TTL, '[SpaceStore]');
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
    this.isFullscreen.value = false;

    console.log('[SpaceStore] Disposed');
  }

  // UI state methods

  /**
   * Set fullscreen mode for drawer
   * Called when opening entity from pretty URL or expand button
   */
  setFullscreen(value: boolean): void {
    this.isFullscreen.value = value;
  }

  /**
   * Clear fullscreen mode
   * Called when closing drawer or navigating away
   */
  clearFullscreen(): void {
    this.isFullscreen.value = false;
  }

  // ==========================================
  // Tab Loaded Counts (for fullscreen filtering)
  // ==========================================

  private readonly TAB_COUNTS_STORAGE_KEY = 'breedhub_tab_loaded_counts';

  /**
   * Set loaded count for a specific tab
   * Called by TabsContainer when tab data is loaded
   * Also persists to sessionStorage for cross-navigation access
   */
  setTabLoadedCount(entityId: string, tabId: string, count: number): void {
    const current = this.tabLoadedCountsMap.value;
    const entityCounts = current[entityId] || {};

    // Skip if unchanged
    if (entityCounts[tabId] === count) return;

    const newCounts = {
      ...current,
      [entityId]: {
        ...entityCounts,
        [tabId]: count
      }
    };

    this.tabLoadedCountsMap.value = newCounts;

    // Persist to sessionStorage for fullscreen navigation
    try {
      sessionStorage.setItem(this.TAB_COUNTS_STORAGE_KEY, JSON.stringify(newCounts));
    } catch (e) {
      // Ignore storage errors
    }
  }

  /**
   * Get loaded count for a specific tab
   * Lazy loads from sessionStorage if needed
   */
  getTabLoadedCount(entityId: string, tabId: string): number | undefined {
    // Lazy load from storage if empty
    if (Object.keys(this.tabLoadedCountsMap.value).length === 0) {
      this.loadTabLoadedCountsFromStorage();
    }
    return this.tabLoadedCountsMap.value[entityId]?.[tabId];
  }

  /**
   * Get all loaded counts for an entity
   * Lazy loads from sessionStorage if needed
   */
  getTabLoadedCounts(entityId: string): Record<string, number> {
    // Lazy load from storage if empty
    if (Object.keys(this.tabLoadedCountsMap.value).length === 0) {
      this.loadTabLoadedCountsFromStorage();
    }
    return this.tabLoadedCountsMap.value[entityId] || {};
  }

  /**
   * Clear loaded counts for an entity (e.g., when drawer closes)
   */
  clearTabLoadedCounts(entityId: string): void {
    const current = this.tabLoadedCountsMap.value;
    if (!current[entityId]) return;

    const { [entityId]: _, ...rest } = current;
    this.tabLoadedCountsMap.value = rest;

    // Update sessionStorage
    try {
      sessionStorage.setItem(this.TAB_COUNTS_STORAGE_KEY, JSON.stringify(rest));
    } catch (e) {
      // Ignore storage errors
    }
  }

  /**
   * Load tab counts from sessionStorage (called on init or when needed)
   */
  loadTabLoadedCountsFromStorage(): void {
    try {
      const stored = sessionStorage.getItem(this.TAB_COUNTS_STORAGE_KEY);
      if (stored) {
        this.tabLoadedCountsMap.value = JSON.parse(stored);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  /**
   * Get the signal for reactive access in components
   */
  get tabLoadedCounts() {
    // Lazy load from storage if empty
    if (Object.keys(this.tabLoadedCountsMap.value).length === 0) {
      this.loadTabLoadedCountsFromStorage();
    }
    return this.tabLoadedCountsMap;
  }

  /**
   * Get a single record by ID from a collection
   * Used for pre-loading selected values in LookupInput
   */
  async getRecordById(
    tableName: string,
    id: string
  ): Promise<Record<string, unknown> | null> {
    const collection = this.db?.collections?.[tableName];

    if (!collection) {
      console.warn(`[SpaceStore] Collection ${tableName} not found`);
      return null;
    }

    try {
      const doc = await collection.findOne(id).exec();
      return doc ? doc.toJSON() : null;
    } catch (error) {
      console.error(`[SpaceStore] getRecordById failed for ${tableName}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const spaceStore = SpaceStore.getInstance();