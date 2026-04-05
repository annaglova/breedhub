import { signal, computed } from '@preact/signals-react';
import { getDatabase } from '../services/database.service';
import { Subscription } from 'rxjs';
import { RxCollection, RxDocument, RxJsonSchema } from 'rxdb';
import { EntityStore } from './base/entity-store';
import { appStore } from './app-store.signal-store';
import { entityReplicationService } from '../services/entity-replication.service';
import { supabase } from '../supabase/client';
import { userStore } from './user-store.signal-store';

// Helpers
import {
  DEFAULT_TTL,
  cleanupMultipleCollections,
  schedulePeriodicCleanup,
  runInitialCleanup,
  isNetworkError,
  isOffline
} from '../helpers';

// Utils
import { removeFieldPrefix, addFieldPrefix } from '../utils/field-normalization';
import * as F from '../utils/filter-builder';
import * as CC from '../utils/child-collection-registry';
import { generateSchemaForEntity as buildSchema, ENTITY_VIEW_SOURCES } from '../utils/schema-builder';
import { buildEntityPayload, buildChildPayload, getOnConflict } from '../utils/sync-queue.helpers';
import { syncQueueService } from '../services/sync-queue.service';
import { checkSchemaVersion } from '../utils/schema-version-check';

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
  defaultFilters?: Record<string, any>; // Always applied (e.g., type_id for kennel)
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
 * Partition configuration for partitioned tables (e.g., pet partitioned by breed_id)
 * When present, child table queries will include the partition filter field
 */
interface PartitionConfig {
  /** Field name in the main entity (e.g., 'breed_id' for pet) */
  keyField: string;
  /** Corresponding field name in child tables (e.g., 'pet_breed_id') */
  childFilterField: string;
}

/**
 * Entity schema configuration (from entities container in app_config)
 */
interface EntitySchemaConfig {
  entitySchemaName: string;
  fields: Record<string, any>;
  partition?: PartitionConfig;
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
 * Escape a value for use in PostgREST filter strings.
 * Values containing special characters (comma, parentheses, quotes) must be quoted.
 * @see https://postgrest.org/en/stable/references/api/tables_views.html#reserved-characters
 */
function escapePostgrestValue(value: any): string {
  if (value === null || value === undefined) return 'null';
  const str = String(value);
  // If value contains special chars (comma, parentheses, quotes), wrap in double quotes
  if (/[,()"]/.test(str)) {
    // Escape internal double quotes by doubling them
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * VIEW source mapping for entities that should fetch from a VIEW instead of base table.
 * VIEWs are used to enrich entities with JOINed data (e.g., parent names).
 * Key: entityType, Value: { viewName, extraFields }
 *
 * NOTE: litter was removed from here because the litter_with_parents VIEW
 * was too slow (~1.1s) due to JOINs to the partitioned pet table.
 * Instead, LitterListCard uses useCollectionValue hooks for enrichment.
 */

/**
 * Pedigree pet for UI (tree structure)
 */
export interface PedigreePet {
  id: string;
  name: string;
  slug?: string;
  breedId?: string;
  dateOfBirth?: string;
  titles?: string;
  avatarUrl?: string;
  sex?: {
    code?: string;
    name?: string;
  };
  countryOfBirth?: {
    code?: string;
  };
  father?: PedigreePet;
  mother?: PedigreePet;
}

/**
 * Result from loadPedigree method
 */
export interface PedigreeResult {
  father?: PedigreePet;
  mother?: PedigreePet;
  ancestors: any[];
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
  public db: any = null;
  
  // Dynamic entity stores - one EntityStore per entity type
  private entityStores = new Map<string, EntityStore<BusinessEntity>>();
  private entitySubscriptions = new Map<string, Subscription>();
  private spaceConfigs = new Map<string, SpaceConfig>();

  // Pedigree cache - tracks which pedigrees have been loaded
  // Key: "fatherId|motherId" (sorted), Value: Set of ancestor IDs that were returned

  // Entity schemas from app_config.entities (includes partition config)
  private entitySchemas = new Map<string, EntitySchemaConfig>();

  // Child collections - lazy created on-demand
  private childCollections = new Map<string, RxCollection<any>>();

  // Cleanup interval reference
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  // Track which entity types are available
  availableEntityTypes = signal<string[]>([]);
  
  // Sync state
  isSyncing = signal<boolean>(false);

  // UI state - fullscreen mode for drawer (when opened from pretty URL or expand button)
  isFullscreen = signal<boolean>(false);
  /** Emitted after background child refresh completes — useTabData subscribes to auto-refetch */
  childRefreshSignal = signal<{ tableType: string; parentId: string } | null>(null);

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

      // Auto-clear RxDB if config version changed (schema migration)
      const reloading = await checkSchemaVersion();
      if (reloading) return;

      // Get database instance from AppStore
      this.db = await getDatabase();

      // Initialize sync queue service (V3 push)
      await syncQueueService.initialize(this.db);

      // Reconnect pull: refresh active entity stores when coming back online
      syncQueueService.onReconnect(() => {
        for (const [entityType, entityStore] of this.entityStores.entries()) {
          if (entityStore.entityList.value.length > 0) {
            console.log(`[SpaceStore] Reconnect refresh: ${entityType}`);
            this.applyFilters(entityType, {});
          }
        }
      });

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
  private buildEntitySchemasMap(appConfig: any): Map<string, EntitySchemaConfig> {
    const entitySchemas = new Map<string, EntitySchemaConfig>();

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

    // Build entity schemas map from appConfig.entities and store as class property
    this.entitySchemas = this.buildEntitySchemasMap(appConfig);
    const entitySchemas = this.entitySchemas;

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
              canAdd: !!space.canAdd,
              canEdit: !!space.canEdit,
              canDelete: !!space.canDelete,
              defaultFilters: space.defaultFilters
            };

            this.spaceConfigs.set(space.entitySchemaName, spaceConfig);
            entityTypes.push(space.entitySchemaName);
          }
        });
      }
    });

    this.availableEntityTypes.value = entityTypes;
  }

  /** Case-insensitive lookup in spaceConfigs map */
  private resolveSpaceConfig(entityType: string): SpaceConfig | undefined {
    const exact = this.spaceConfigs.get(entityType);
    if (exact) return exact;

    const lower = entityType.toLowerCase();
    for (const [key, config] of this.spaceConfigs.entries()) {
      if (key.toLowerCase() === lower) return config;
    }
    return undefined;
  }

  /**
   * Get space configuration for an entity type
   * Returns title, permissions, and other UI config
   */
  getSpaceConfig(entityType: string): any | null {
    const spaceConfig = this.resolveSpaceConfig(entityType);

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
   * Get records count for specific view
   * This determines BOTH UI pagination AND replication batch size
   *
   * @param entityType - Entity type (e.g., 'breed', 'animal')
   * @param viewType - View type (e.g., 'list', 'grid')
   * @returns Number of records configured for this view, or default 50
   */
  getViewRecordsCount(entityType: string, viewType: string): number {
    const spaceConfig = this.resolveSpaceConfig(entityType);

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
    const spaceConfig = this.resolveSpaceConfig(entityType);

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
    const spaceConfig = this.resolveSpaceConfig(entityType);

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
    // Junction table filtering (many-to-many)
    junctionTable?: string;
    junctionField?: string;
    junctionFilterField?: string;
    // OR fields (single filter applies to multiple DB fields)
    orFields?: string[];
  }> {
    const spaceConfig = this.resolveSpaceConfig(entityType);

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
      junctionTable?: string;
      junctionField?: string;
      junctionFilterField?: string;
      orFields?: string[];
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
        filterBy: field.filterBy,
        // Junction table filtering (many-to-many)
        junctionTable: field.junctionTable,
        junctionField: field.junctionField,
        junctionFilterField: field.junctionFilterField,
        // OR fields
        orFields: field.orFields
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
    const spaceConfig = this.resolveSpaceConfig(entityType);

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
   * Get ALL main filter fields from space config's filter_fields
   * Used when multiple fields have mainFilterField: true (e.g., litter: father_name, mother_name)
   * These fields will be searched with OR logic
   *
   * @param entityType - Entity type (e.g., 'breed', 'litter')
   * @returns Object with fields array and optional searchSlug for URL
   */
  getMainFilterFields(entityType: string): {
    fields: Array<{
      id: string;
      displayName: string;
      component: string;
      placeholder?: string;
      fieldType: string;
      operator?: string;
      slug?: string;
    }>;
    /** Shared slug for URL when multiple mainFilterFields (e.g., "parent" for father_name + mother_name) */
    searchSlug?: string;
  } {
    const spaceConfig = this.resolveSpaceConfig(entityType);

    if (!spaceConfig?.filter_fields) {
      return { fields: [] };
    }

    const mainFields: Array<{
      id: string;
      displayName: string;
      component: string;
      placeholder?: string;
      fieldType: string;
      operator?: string;
      slug?: string;
    }> = [];

    let searchSlug: string | undefined;

    // Find ALL fields with mainFilterField: true
    for (const [fieldId, fieldConfig] of Object.entries(spaceConfig.filter_fields)) {
      const field = fieldConfig as any;
      if (field.mainFilterField === true) {
        mainFields.push({
          id: fieldId,
          displayName: field.displayName || fieldId,
          component: field.component || 'TextInput',
          placeholder: field.placeholder,
          fieldType: field.fieldType || 'string',
          operator: field.operator,
          slug: field.slug
        });
        // Use searchSlug from any of the mainFilterFields (they should all have the same)
        if (field.searchSlug && !searchSlug) {
          searchSlug = field.searchSlug;
        }
      }
    }

    return { fields: mainFields, searchSlug };
  }

  /**
   * Get or create an entity store for the given entity type
   */
  async getEntityStore<T extends BusinessEntity>(entityType: string): Promise<EntityStore<T> | null> {
    // Wait for full initialization (config + DB) before creating entity stores
    if (!this.initialized.value) {
      let retries = 100;
      while (!this.initialized.value && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms polling, up to 5s
        retries--;
      }
      if (!this.initialized.value) {
        console.error(`[SpaceStore] Not initialized after waiting for ${entityType}`);
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
    const hasConfig = !!this.resolveSpaceConfig(entityType);

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
            },
            // Version 1→2: Add VIEW extra fields (pass through, fields added on next fetch)
            2: (oldDoc: any) => oldDoc
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
    return buildSchema(entityType, spaceConfig);
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
      const userId = userStore.currentUserId.value;
      // Generate slug client-side (same algorithm as server trigger)
      const { generateSlug } = await import('../utils/slug-generator');
      const slug = generateSlug((data as any).name || '', id);

      const newEntity = {
        ...data,
        id,
        slug,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(userId && { created_by: userId, updated_by: userId }),
        _deleted: false
      } as T;
      
      await collection.insert(newEntity);
      entityStore.addOne(newEntity);

      // Enqueue for Supabase sync (V3 queue-based push)
      const entitySchema = this.entitySchemas.get(entityType);
      const partitionKey = entitySchema?.partition?.keyField;
      await syncQueueService.enqueueEntity(
        entityType, id, 'upsert',
        buildEntityPayload(newEntity as Record<string, any>),
        getOnConflict(entityType, partitionKey)
      );

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

      const patchData: Record<string, any> = {
        ...updates,
        updated_at: new Date().toISOString(),
        ...(userStore.currentUserId.value && { updated_by: userStore.currentUserId.value }),
      };

      // If date_of_birth or date_of_death changed, rebuild timeline locally
      if ('date_of_birth' in updates || 'date_of_death' in updates) {
        const currentData = doc.toJSON();
        const { rebuildTimelineOnDateChange } = await import('../utils/timeline-builder');
        patchData.timeline = rebuildTimelineOnDateChange(
          currentData.timeline || [],
          updates.date_of_birth ?? currentData.date_of_birth,
          (updates as any).date_of_death ?? currentData.date_of_death,
        );
      }

      // Update RxDB locally
      const patchedDoc = await doc.patch(patchData);
      // Update in-memory signal store
      entityStore.updateOne(id, patchData);

      // Enqueue for Supabase sync (V3 queue-based push)
      const fullDoc = patchedDoc.toJSON();
      const entitySchema = this.entitySchemas.get(entityType);
      const partitionKey = entitySchema?.partition?.keyField;
      await syncQueueService.enqueueEntity(
        entityType, id, 'upsert',
        buildEntityPayload(fullDoc),
        getOnConflict(entityType, partitionKey)
      );

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
   * Dependency check configuration per entity type.
   * Each entry: [tableName, fkColumn, humanLabel]
   */
  private readonly dependencyMap: Record<string, [string, string, string][]> = {
    pet: [
      ['title_in_pet', 'pet_id', 'Titles'],
      ['pet_identifier', 'pet_id', 'Identifiers'],
      ['pet_health_exam_result', 'pet_id', 'Health exams'],
      ['dna_marker_in_pet', 'pet_id', 'DNA markers'],
      ['contact_in_pet', 'pet_id', 'Contacts'],
      ['pet_in_program', 'pet_id', 'Programs'],
      ['activity', 'pet_id', 'Activities'],
      ['pet', 'father_id', 'Children (as father)'],
      ['pet', 'mother_id', 'Children (as mother)'],
      ['litter', 'father_id', 'Litters (as father)'],
      ['litter', 'mother_id', 'Litters (as mother)'],
    ],
    breed: [
      ['pet', 'breed_id', 'Pets'],
      ['breed_division', 'breed_id', 'Divisions'],
      ['breed_synonym', 'breed_id', 'Synonyms'],
      ['coat_color_in_breed', 'breed_id', 'Coat colors'],
      ['coat_type_in_breed', 'breed_id', 'Coat types'],
      ['size_in_breed', 'breed_id', 'Sizes'],
      ['body_feature_in_breed', 'breed_id', 'Body features'],
      ['achievement_in_breed', 'breed_id', 'Achievements'],
      ['breed_in_kennel', 'breed_id', 'Kennels'],
      ['related_breed', 'breed_id', 'Related breeds'],
    ],
    litter: [
      ['pet_in_litter', 'litter_id', 'Puppies'],
      ['title_in_litter', 'litter_id', 'Titles'],
      ['contact_in_litter', 'litter_id', 'Contacts'],
    ],
    contact: [
      ['contact_communication', 'contact_id', 'Communications'],
      ['contact_language', 'contact_id', 'Languages'],
      ['contact_in_pet', 'contact_id', 'Pets'],
      ['contact_in_litter', 'contact_id', 'Litters'],
    ],
    account: [
      ['account_communication', 'account_id', 'Communications'],
      ['breed_in_kennel', 'account_id', 'Breeds'],
      ['contact', 'account_id', 'Contacts'],
      ['litter', 'kennel_id', 'Litters'],
    ],
  };

  /**
   * Check if an entity has dependent records that prevent deletion.
   * Returns { canDelete, dependencies[] } where dependencies lists
   * tables with record counts that block deletion.
   */
  async checkDependencies(entityType: string, id: string): Promise<{
    canDelete: boolean;
    dependencies: { label: string; count: number }[];
  }> {
    const checks = this.dependencyMap[entityType];
    if (!checks || checks.length === 0) {
      return { canDelete: true, dependencies: [] };
    }

    const dependencies: { label: string; count: number }[] = [];

    // Run all count queries in parallel
    const results = await Promise.all(
      checks.map(async ([table, fkColumn, label]) => {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('id', { count: 'exact', head: true })
            .eq(fkColumn, id);

          if (error) {
            console.warn(`[SpaceStore] checkDependencies: ${table}.${fkColumn} query failed:`, error.message);
            return { label, count: 0 };
          }
          return { label, count: count || 0 };
        } catch {
          return { label, count: 0 };
        }
      })
    );

    for (const result of results) {
      if (result.count > 0) {
        dependencies.push(result);
      }
    }

    return {
      canDelete: dependencies.length === 0,
      dependencies,
    };
  }

  /**
   * Delete an entity (soft delete: RxDB first, then sync to Supabase)
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

      const patchData: Record<string, any> = {
        deleted: true,
        updated_at: new Date().toISOString(),
      };
      if (userStore.currentUserId.value) {
        patchData.updated_by = userStore.currentUserId.value;
      }

      // Update RxDB locally
      await doc.patch(patchData);
      entityStore.removeOne(id);

      // Enqueue for Supabase sync (V3 queue-based push)
      const fullDoc = doc.toJSON();
      const entitySchema = this.entitySchemas.get(entityType);
      const partitionKey = entitySchema?.partition?.keyField;
      await syncQueueService.enqueueEntity(
        entityType, id, 'delete',
        buildEntityPayload(fullDoc),
        getOnConflict(entityType, partitionKey)
      );

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

    // Get space config and merge defaultFilters (e.g., type_id for kennel)
    const spaceConfig = this.spaceConfigs.get(entityType);
    const defaultFilters = spaceConfig?.defaultFilters || {};
    filters = { ...defaultFilters, ...filters };

    console.log('[SpaceStore] applyFilters (ID-First):', {
      entityType,
      filters,
      limit,
      cursor,
      orderBy
    });
    // Inject field configs for defaultFilter keys so they use 'eq' operator (not ilike)
    const baseFieldConfigs = options?.fieldConfigs || spaceConfig?.filter_fields || {};
    const fieldConfigs = { ...baseFieldConfigs };
    for (const key of Object.keys(defaultFilters)) {
      if (!fieldConfigs[key]) {
        fieldConfigs[key] = { fieldType: 'uuid', operator: 'eq' };
      }
    }

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
        // Also include defaultFilters in cache key (e.g., account with type_id=kennel vs type_id=federation)
        const defaultFiltersSuffix = Object.keys(defaultFilters).length > 0
          ? '_df_' + Object.entries(defaultFilters).map(([k, v]) => `${k}=${v}`).join('_')
          : '';
        const cacheKey = hasFilterKey
          ? `totalCount_${entityType}_${totalFilterKey}_${totalFilterValue}${defaultFiltersSuffix}`
          : `totalCount_${entityType}${defaultFiltersSuffix}`;

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

            // Apply defaultFilters to count query (e.g., type_id for kennel)
            for (const [key, value] of Object.entries(defaultFilters)) {
              if (value !== undefined && value !== null && value !== '') {
                countQuery = countQuery.eq(key, value);
              }
            }

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
      // Phase 2: Check RxDB cache

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

      // 🔍 Staleness check: compare cached updated_at with server updated_at
      const serverUpdatedAtMap = new Map(idsData.map((r: any) => [r.id, r.updated_at]));
      const missingIds: string[] = [];
      const staleIds: string[] = [];

      for (const id of ids) {
        const cachedDoc = cachedMap.get(id);
        if (!cachedDoc) {
          missingIds.push(id);
        } else {
          const serverUpdatedAt = serverUpdatedAtMap.get(id);
          if (serverUpdatedAt && cachedDoc.updated_at && serverUpdatedAt > cachedDoc.updated_at) {
            staleIds.push(id);
          }
        }
      }

      const toFetchIds = [...missingIds, ...staleIds];
      console.log(`[SpaceStore] 📦 Cache: ${cachedMap.size}/${ids.length} hit, ${missingIds.length} missing, ${staleIds.length} stale`);

      // 🌐 PHASE 3: Fetch missing + stale full records from Supabase
      let freshRecords = [];
      if (toFetchIds.length > 0) {
        console.log(`[SpaceStore] 🌐 Phase 3: Fetching ${toFetchIds.length} records (${missingIds.length} missing + ${staleIds.length} stale)...`);

        freshRecords = await this.fetchRecordsByIDs(
          entityType,
          toFetchIds
        );

        console.log(`[SpaceStore] ✅ Fetched ${freshRecords.length} fresh records`);

        // Cache fresh records in RxDB
        if (freshRecords.length > 0) {
          const mapped = freshRecords.map(r => this.mapToRxDBFormat(r, entityType));
          await collection.bulkUpsert(mapped);
          console.log(`[SpaceStore] 💾 Cached ${mapped.length} fresh records in RxDB`);
        }
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

        // Apply non-string filters to selector (with orFields support)
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
          this.applyFilterToRxDBSelector(startsWithSelector, fieldKey, operator, value, fieldConfig);
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

          // Apply non-string filters to selector (with orFields support)
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
            this.applyFilterToRxDBSelector(containsSelector, fieldKey, operator, value, fieldConfig);
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
            hasFieldConfig: !!fieldConfig,
            orFields: finalFieldConfig.orFields
          });

          // Apply filter to selector (with orFields support)
          this.applyFilterToRxDBSelector(selector, fieldKey, operator, value, finalFieldConfig);
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
   * Uses nullsFirst: false to push NULL values to the end (NULLS LAST)
   */
  private applyOrderBy<T>(
    query: any,
    orderBy: OrderBy
  ): any {
    // Primary orderBy (NULLS LAST to keep empty values at the end)
    query = query.order(orderBy.field, { ascending: orderBy.direction === 'asc', nullsFirst: false });

    // TieBreaker orderBy (if provided)
    if (orderBy.tieBreaker) {
      query = query.order(orderBy.tieBreaker.field, { ascending: orderBy.tieBreaker.direction === 'asc', nullsFirst: false });
    }

    return query;
  }

  /**
   * Get Supabase source table/VIEW name for an entity type.
   * If entity has a VIEW configured, returns VIEW name; otherwise returns entity type.
   */
  private getSupabaseSource(entityType: string): string {
    const viewConfig = ENTITY_VIEW_SOURCES[entityType];
    return viewConfig?.viewName || entityType;
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

      return (fieldType === 'string' || fieldType === 'text') && (operator === 'contains' || operator === 'ilike');
    });

    // Use hybrid search if: (1) has search filter, (2) no cursor (first page)
    const useHybridSearch = searchFilters.length > 0 && cursor === null;

    if (useHybridSearch) {
      console.log('[SpaceStore] 🔍 HYBRID SEARCH mode (starts_with 70% + contains 30%)');

      // 🔀 OR LOGIC: Check if multiple search fields have the same value (main filter fields)
      // Group search filters by value to detect OR-combined main filter fields
      const firstSearchValue = searchFilters[0][1];
      const orSearchFields = searchFilters
        .filter(([_, value]) => value === firstSearchValue)
        .map(([fieldKey]) => fieldKey);

      const isOrSearch = orSearchFields.length > 1;
      const searchValue = firstSearchValue;

      // Remove all OR search fields from filters
      const otherFilters = Object.fromEntries(
        Object.entries(filters).filter(([key]) => !orSearchFields.includes(key))
      );

      if (isOrSearch) {
        console.log(`[SpaceStore] 🔀 OR SEARCH: Searching "${searchValue}" in fields:`, orSearchFields);
      }

      // Phase 1: Starts with (high priority, 70% of limit)
      const startsWithLimit = Math.ceil(limit * 0.7);
      const sourceName = this.getSupabaseSource(entityType);
      let startsWithQuery = supabase
        .from(sourceName)
        .select(`id, ${orderBy.field}, updated_at`)
        .or('deleted.is.null,deleted.eq.false');

      // Apply search filter: OR for multiple fields, single ilike for one field
      if (isOrSearch) {
        // Build OR condition: father_name.ilike.John%,mother_name.ilike.John%
        const orCondition = orSearchFields
          .map(field => `${field}.ilike.${searchValue}%`)
          .join(',');
        startsWithQuery = startsWithQuery.or(orCondition);
      } else {
        startsWithQuery = startsWithQuery.ilike(orSearchFields[0], `${searchValue}%`);
      }

      // Apply other filters (with orFields support)
      for (const [fieldKey, value] of Object.entries(otherFilters)) {
        if (value === undefined || value === null || value === '') continue;
        const fieldConfig = fieldConfigs[fieldKey] || {};
        const fieldType = fieldConfig.fieldType || 'string';
        const operator = this.detectOperator(fieldType, fieldConfig.operator);
        startsWithQuery = this.applySupabaseFilterWithOrFields(startsWithQuery, fieldKey, operator, value, fieldConfig);
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
          .from(sourceName)
          .select(`id, ${orderBy.field}, updated_at`)
          .or('deleted.is.null,deleted.eq.false');

        // Apply contains filter: OR for multiple fields, single ilike for one field
        if (isOrSearch) {
          // For OR search: contains in any field, excluding starts_with matches
          // Build: (father_name ILIKE %val% AND father_name NOT ILIKE val%) OR (mother_name ILIKE %val% AND mother_name NOT ILIKE val%)
          // This is complex in PostgREST, so we use a simpler approach:
          // Contains in any field, then filter out starts_with results client-side (already done via mergedResults)
          const orContainsCondition = orSearchFields
            .map(field => `${field}.ilike.%${searchValue}%`)
            .join(',');
          containsQuery = containsQuery.or(orContainsCondition);
        } else {
          containsQuery = containsQuery
            .ilike(orSearchFields[0], `%${searchValue}%`)
            .not(orSearchFields[0], 'ilike', `${searchValue}%`);
        }

        // Apply other filters (with orFields support)
        for (const [fieldKey, value] of Object.entries(otherFilters)) {
          if (value === undefined || value === null || value === '') continue;
          const fieldConfig = fieldConfigs[fieldKey] || {};
          const fieldType = fieldConfig.fieldType || 'string';
          const operator = this.detectOperator(fieldType, fieldConfig.operator);
          containsQuery = this.applySupabaseFilterWithOrFields(containsQuery, fieldKey, operator, value, fieldConfig);
        }

        containsQuery = this.applyOrderBy(containsQuery, orderBy).limit(remainingLimit);

        const { data: containsData, error: containsError } = await containsQuery;

        if (containsError) {
          console.warn('[SpaceStore] Contains search failed:', containsError);
        } else {
          const containsResults = containsData || [];
          console.log(`[SpaceStore] ✅ Contains: ${containsResults.length} results`);

          // Merge: starts_with first, then contains (deduplicate for OR search)
          const startsWithIds = new Set(startsWithResults.map((r: any) => r.id));
          const uniqueContainsResults = containsResults.filter((r: any) => !startsWithIds.has(r.id));
          const mergedResults = [...startsWithResults, ...uniqueContainsResults];

          console.log(`[SpaceStore] ✅ Fetched ${mergedResults.length} IDs (~${Math.round(mergedResults.length * 0.1)}KB) via HYBRID SEARCH`);
          return mergedResults;
        }
      }

      console.log(`[SpaceStore] ✅ Fetched ${startsWithResults.length} IDs (~${Math.round(startsWithResults.length * 0.1)}KB) via HYBRID SEARCH`);
      return startsWithResults;
    }

    // 📄 REGULAR QUERY: No search or cursor pagination
    // Include tieBreaker field + updated_at (for staleness check) in select
    const tieBreakerField = orderBy.tieBreaker?.field || 'id';
    const selectFields = tieBreakerField !== orderBy.field && tieBreakerField !== 'id'
      ? `id, ${orderBy.field}, ${tieBreakerField}, updated_at`
      : `id, ${orderBy.field}, updated_at`;

    // Use VIEW source if configured (e.g., litter_with_parents for litter)
    const sourceName = this.getSupabaseSource(entityType);
    let query = supabase
      .from(sourceName)
      .select(selectFields);

    // Filter out deleted records
    query = query.or('deleted.is.null,deleted.eq.false');

    // Apply filters (AND logic, with orFields support for OR across multiple DB fields)
    for (const [fieldKey, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // fieldKey is already normalized (pet_type_id), so direct lookup works
      const fieldConfig = fieldConfigs[fieldKey] || {};
      const fieldType = fieldConfig.fieldType || 'string';
      const operator = this.detectOperator(fieldType, fieldConfig.operator);

      // Apply filter (with orFields support for OR across multiple DB fields)
      query = this.applySupabaseFilterWithOrFields(query, fieldKey, operator, value, fieldConfig);
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

      const escapedValue = escapePostgrestValue(cursorData.value);
      const escapedTieBreaker = escapePostgrestValue(cursorData.tieBreaker);
      const orCondition = `${orderBy.field}.${mainOp}.${escapedValue},and(${orderBy.field}.eq.${escapedValue},${tbField}.${tbOp}.${escapedTieBreaker})`;

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

    // Use VIEW source if configured (e.g., litter_with_parents for litter)
    const sourceName = this.getSupabaseSource(entityType);
    console.log(`[SpaceStore] 🌐 Fetching ${ids.length} full records by IDs from ${sourceName}...`);

    const { data, error } = await supabase
      .from(sourceName)
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
  public mapToRxDBFormat(supabaseDoc: any, entityType: string): any {
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
   * Detect operator based on field type
   */
  private detectOperator(fieldType: string, configOperator?: string): string {
    return F.detectOperator(fieldType, configOperator);
  }

  private applyFilterToRxDBSelector(selector: any, fieldKey: string, operator: string, value: any, fieldConfig: any): void {
    F.applyFilterToRxDBSelector(selector, fieldKey, operator, value, fieldConfig);
  }

  private applySupabaseFilterWithOrFields(query: any, fieldKey: string, operator: string, value: any, fieldConfig: any): any {
    return F.applySupabaseFilterWithOrFields(query, fieldKey, operator, value, fieldConfig);
  }

  /**
   * Dispose of all resources
   * LIFECYCLE: Global cleanup
   */
  /**
   * Setup bidirectional replication for an entity
   * Uses EntityReplicationService for sync with Supabase
   */
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
   *
   * @param entityType - Entity type (e.g., 'pet', 'breed')
   * @param id - Entity UUID
   * @param partitionId - Optional partition key value for partition pruning (e.g., breed_id for pet)
   * @param partitionField - Optional partition key column name (e.g., 'breed_id') - fallback when entitySchemas not ready
   */
  async fetchAndSelectEntity(entityType: string, id: string, partitionId?: string, partitionField?: string): Promise<boolean> {
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
    console.log(`[SpaceStore] Fetching entity ${id} from Supabase`, partitionId ? `(partition: ${partitionId})` : '');
    try {
      // Get partition config from entity schema, with fallback to route-provided field name
      const entitySchema = this.entitySchemas.get(entityType);
      const partitionKeyField = entitySchema?.partition?.keyField || partitionField;

      // Build query with partition pruning if available
      let query = supabase.from(entityType).select('*');

      if (partitionId && partitionKeyField) {
        // Use partition key for partition pruning (much faster for partitioned tables)
        console.log(`[SpaceStore] Using partition pruning: ${partitionKeyField}=${partitionId}`);
        query = query.eq(partitionKeyField, partitionId);
      }

      const { data, error } = await query.eq('id', id).single();

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

    // 2. Resolve via routes table (fast PK lookup → partition-pruned query)
    try {
      const { data: route } = await supabase
        .from('routes')
        .select('entity_id, entity_partition_id, partition_field')
        .eq('slug', slug)
        .single();

      if (route?.entity_id && route.partition_field && route.entity_partition_id) {
        // Partition-pruned query using route info
        const { data, error } = await supabase
          .from(entityType)
          .select('*')
          .eq(route.partition_field, route.entity_partition_id)
          .eq('id', route.entity_id)
          .single();

        if (!error && data) {
          if (this.db?.collections[collectionName]) {
            const mapped = this.mapToRxDBFormat(data, collectionName);
            await this.db.collections[collectionName].upsert(mapped);
          }
          return data as T;
        }
      } else if (route?.entity_id) {
        // Route found but no partition info — direct ID lookup
        const { data, error } = await supabase
          .from(entityType)
          .select('*')
          .eq('id', route.entity_id)
          .single();

        if (!error && data) {
          if (this.db?.collections[collectionName]) {
            const mapped = this.mapToRxDBFormat(data, collectionName);
            await this.db.collections[collectionName].upsert(mapped);
          }
          return data as T;
        }
      }
    } catch (err) {
      console.warn(`[SpaceStore] Route lookup failed, falling back to slug query:`, err);
    }

    // 3. Fallback: direct slug query (for entities without routes)
    try {
      const { data, error } = await supabase
        .from(entityType)
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        return null;
      }

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
   * Fetch entity by ID (ID-First: RxDB → Supabase fallback)
   *
   * Similar to fetchEntityBySlug but uses primary key lookup.
   * Used for preloading entities when ID is known (e.g., modal preselection).
   *
   * @param entityType - Entity type (e.g., 'pet', 'breed')
   * @param id - Entity UUID
   * @returns Entity data or null
   */
  async fetchEntityById<T = any>(entityType: string, id: string): Promise<T | null> {
    const collectionName = entityType.toLowerCase();

    // 1. Try RxDB collection directly (instant if cached)
    if (this.db?.collections[collectionName]) {
      try {
        const doc = await this.db.collections[collectionName].findOne(id).exec();
        if (doc) {
          return doc.toJSON() as T;
        }
      } catch (err) {
        console.warn(`[SpaceStore] Error querying RxDB by id:`, err);
      }
    }

    // 2. Fallback to Supabase
    try {
      const { data, error } = await supabase
        .from(entityType)
        .select('*')
        .eq('id', id)
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
      console.error(`[SpaceStore] Error fetching by id from Supabase:`, err);
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
    return CC.getChildCollectionSchema(entityType);
  }

  private getChildCollectionMigrationStrategies(entityType: string): any {
    return CC.getChildCollectionMigrationStrategies(entityType);
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
    options: { limit?: number; orderBy?: string; orderDirection?: 'asc' | 'desc'; parentField?: string } = {}
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

    // Check for partition config in entity schema
    const entitySchema = this.entitySchemas.get(entityType);
    const partitionConfig = entitySchema?.partition;
    let partitionValue: string | undefined;

    // If entity is partitioned, get partition key value from parent entity
    if (partitionConfig) {
      // First try memory store (fast)
      let parentEntity = await this.getById(entityType, parentId);
      let partitionSource = 'memory';

      // If not in memory, try RxDB collection
      if (!parentEntity && this.db?.collections[entityType]) {
        const doc = await this.db.collections[entityType].findOne(parentId).exec();
        if (doc) {
          parentEntity = doc.toJSON();
          partitionSource = 'RxDB';
        }
      }

      if (parentEntity) {
        partitionValue = (parentEntity as any)[partitionConfig.keyField];
        console.log(`[SpaceStore] Partition filter: ${partitionConfig.childFilterField}=${partitionValue} (from ${partitionSource})`);
      } else {
        console.warn(`[SpaceStore] Could not find parent entity for partition key. Table: ${tableType}, parentId: ${parentId}`);
      }
    }

    // Check if data already exists in RxDB (with partition filter for partitioned entities)
    const existingRecords = await this.getChildRecords(parentId, tableType, {
      ...options,
      partitionId: partitionValue,
    });

    // Determine parent ID field early (needed for both staleness refresh and Supabase query)
    const parentIdField = options.parentField || `${entityType}_id`;

    if (existingRecords.length > 0) {
      // Staleness check: if oldest record cached > 5 min ago, refetch in background
      const CHILD_STALE_MS = 5 * 60 * 1000; // 5 minutes
      const oldestCachedAt = Math.min(...existingRecords.map((r: any) => r.cachedAt || 0));
      if ((Date.now() - oldestCachedAt) > CHILD_STALE_MS) {
        // Return stale data immediately, refresh in background
        this.refreshChildRecordsInBackground(entityType, tableType, parentId, parentIdField, options, partitionConfig, partitionValue);
      }
      return existingRecords;
    }

    // Load from Supabase
    try {
      const { supabase } = await import('../supabase/client');
      const { limit = 50, orderBy, orderDirection = 'asc' } = options;

      // Build Supabase query
      let query = supabase
        .from(tableType)
        .select('*')
        .eq(parentIdField, parentId)
        .limit(limit);

      // Add partition filter if configured (for partition pruning)
      if (partitionConfig && partitionValue) {
        query = query.eq(partitionConfig.childFilterField, partitionValue);
      }

      if (orderBy) {
        query = query.order(orderBy, { ascending: orderDirection === 'asc', nullsFirst: false });
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

      // Transform records: extract core + service fields as top-level, rest in 'additional'
      const transformedRecords = data.map((row: Record<string, any>) => {
        const { id, created_at, updated_at, created_by, updated_by, ...rest } = row;

        // Build additional object with all non-core fields
        const additional: Record<string, any> = {};
        for (const [key, value] of Object.entries(rest)) {
          if (key === parentIdField) continue;
          if (partitionConfig && key === partitionConfig.childFilterField) continue;
          if (value !== undefined && value !== null) {
            additional[key] = value;
          }
        }

        // Build record with service fields as top-level
        const record: Record<string, any> = {
          id,
          tableType: normalizedTableType,
          parentId,
          updated_at: updated_at || undefined,
          created_at: created_at || undefined,
          created_by: created_by || undefined,
          updated_by: updated_by || undefined,
          additional: Object.keys(additional).length > 0 ? additional : undefined,
          cachedAt: Date.now()
        };

        // Add partitionId as top-level field if entity is partitioned
        if (partitionConfig && partitionValue) {
          record.partitionId = partitionValue;
        }

        return record;
      });

      // Bulk upsert into RxDB collection (update if exists, insert if not)
      await collection.bulkUpsert(transformedRecords);

      return transformedRecords;
    } catch (error) {
      console.error(`[SpaceStore] Error loading child records:`, error);
      return [];
    }
  }

  /** Background refresh for stale child records — fetches fresh data without blocking UI */
  private async refreshChildRecordsInBackground(
    entityType: string,
    tableType: string,
    parentId: string,
    parentIdField: string,
    options: any,
    partitionConfig: any,
    partitionValue: string | undefined
  ): Promise<void> {
    try {
      const { supabase } = await import('../supabase/client');
      const { limit = 50, orderBy, orderDirection = 'asc' } = options;

      let query = supabase
        .from(tableType)
        .select('*')
        .eq(parentIdField, parentId)
        .limit(limit);

      if (partitionConfig && partitionValue) {
        query = query.eq(partitionConfig.childFilterField, partitionValue);
      }
      if (orderBy) {
        query = query.order(orderBy, { ascending: orderDirection === 'asc', nullsFirst: false });
      }

      const { data, error } = await query;
      if (error || !data || data.length === 0) return;

      const normalizedTableType = tableType.replace(/_with_\w+$/, '');
      const collection = await this.ensureChildCollection(entityType);
      if (!collection) return;

      const transformedRecords = data.map((row: Record<string, any>) => {
        const { id, created_at, updated_at, created_by, updated_by, ...rest } = row;
        const additional: Record<string, any> = {};
        for (const [key, value] of Object.entries(rest)) {
          if (key === parentIdField) continue;
          if (partitionConfig && key === partitionConfig.childFilterField) continue;
          if (value !== undefined && value !== null) additional[key] = value;
        }
        const record: Record<string, any> = {
          id, tableType: normalizedTableType, parentId,
          updated_at: updated_at || undefined,
          created_at: created_at || undefined,
          created_by: created_by || undefined,
          updated_by: updated_by || undefined,
          additional: Object.keys(additional).length > 0 ? additional : undefined,
          cachedAt: Date.now()
        };
        if (partitionConfig && partitionValue) record.partitionId = partitionValue;
        return record;
      });

      await collection.bulkUpsert(transformedRecords);

      // Notify UI to refetch (useTabData subscribes to this signal)
      this.childRefreshSignal.value = { tableType: normalizedTableType, parentId };
    } catch {
      // Silent background refresh — don't break UI
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
    options: { limit?: number; orderBy?: string; orderDirection?: 'asc' | 'desc'; partitionId?: string } = {}
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
      const { limit = 50, orderBy, orderDirection = 'asc', partitionId } = options;

      // Child records schema only has: id, parentId, tableType, cachedAt, additional, partitionId
      // Fields like 'placement', 'rating', etc. are stored inside 'additional'
      // RxDB cannot sort by nested fields, so we sort in JS after fetching
      const schemaFields = new Set(['id', 'parentId', 'tableType', 'cachedAt', 'additional', 'partitionId']);
      const isSchemaField = orderBy ? schemaFields.has(orderBy) : false;

      // Build query options - RxDB doesn't allow undefined/null for limit
      const selector: Record<string, any> = {
        parentId: parentId,
        tableType: normalizedTableType,
      };
      // Filter by partitionId for partitioned entities (e.g., pet by breed_id)
      if (partitionId) {
        selector.partitionId = partitionId;
      }
      const queryOptions: { selector: Record<string, any>; limit?: number } = {
        selector,
      };

      // Add limit to RxDB query when safe:
      // - No sorting needed (no orderBy) → safe to limit in query
      // - Sorting by schema field → RxDB handles sort + limit
      // - Sorting by additional field → need all records for JS sort, limit applied after
      if (limit > 0 && (!orderBy || isSchemaField)) {
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Child Tables: CRUD Operations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a new child record (Supabase + RxDB)
   *
   * @param entityType - Parent entity type (e.g., 'pet', 'breed')
   * @param tableType - Child table name (e.g., 'title_in_pet')
   * @param parentId - Parent entity ID
   * @param data - Record data (field values)
   * @returns Created record ID
   */
  async createChildRecord(
    entityType: string,
    tableType: string,
    parentId: string,
    data: Record<string, any>
  ): Promise<{ id: string }> {
    const id = crypto.randomUUID();

    // Normalize VIEW name to base table for RxDB
    const normalizedTableType = tableType.replace(/_with_\w+$/, '');

    // Sanitize data: ensure plain JSON (no Date objects, Proxy, etc.)
    const plainData = JSON.parse(JSON.stringify(data));

    const now = new Date().toISOString();
    const userId = userStore.currentUserId.value;

    // Handle partition: resolve partition value from parent entity
    const entitySchema = this.entitySchemas.get(entityType);
    const partitionConfig = entitySchema?.partition;
    let partitionValue: string | undefined;

    if (partitionConfig) {
      let parentEntity = await this.getById(entityType, parentId);
      if (!parentEntity && this.db?.collections[entityType]) {
        const doc = await this.db.collections[entityType].findOne(parentId).exec();
        if (doc) parentEntity = doc.toJSON();
      }
      if (parentEntity) {
        partitionValue = (parentEntity as any)[partitionConfig.keyField];
      }
    }

    // Insert into RxDB
    const collection = await this.ensureChildCollection(entityType);
    if (collection) {
      const rxdbRecord: Record<string, any> = {
        id,
        tableType: normalizedTableType,
        parentId,
        created_at: now,
        updated_at: now,
        ...(userId && { created_by: userId, updated_by: userId }),
        additional: { ...plainData },
        cachedAt: Date.now(),
      };
      if (partitionConfig && partitionValue) {
        rxdbRecord.partitionId = partitionValue;
      }
      await collection.upsert(rxdbRecord);

      // Enqueue for Supabase sync (V3 queue-based push)
      await syncQueueService.enqueueChild(
        entityType, normalizedTableType, id, 'upsert',
        buildChildPayload(rxdbRecord, entityType, partitionConfig),
        'id'
      );
    }

    return { id };
  }

  /**
   * Update an existing child record (Supabase + RxDB)
   *
   * @param entityType - Parent entity type (e.g., 'pet', 'breed')
   * @param tableType - Child table name (e.g., 'title_in_pet')
   * @param recordId - Record ID to update
   * @param data - Fields to update
   */
  async updateChildRecord(
    entityType: string,
    tableType: string,
    recordId: string,
    data: Record<string, any>
  ): Promise<void> {
    // Sanitize data: ensure plain JSON (no Date objects, Proxy, etc.)
    const plainData = JSON.parse(JSON.stringify(data));

    // Update RxDB
    const collection = await this.ensureChildCollection(entityType);
    if (collection) {
      const doc = await collection.findOne(recordId).exec();
      if (doc) {
        const currentAdditional = doc.toJSON().additional || {};
        const patchedDoc = await doc.patch({
          updated_at: new Date().toISOString(),
          ...(userStore.currentUserId.value && { updated_by: userStore.currentUserId.value }),
          additional: {
            ...currentAdditional,
            ...plainData,
          },
          cachedAt: Date.now(),
        });

        // Enqueue for Supabase sync (V3 queue-based push)
        const updatedDoc = patchedDoc.toJSON();
        const entitySchema = this.entitySchemas.get(entityType);
        const partitionConfig = entitySchema?.partition;
        await syncQueueService.enqueueChild(
          entityType, tableType.replace(/_with_\w+$/, ''), recordId, 'upsert',
          buildChildPayload(updatedDoc, entityType, partitionConfig),
          'id'
        );
      }
    }
  }

  /**
   * Delete a child record (Supabase + RxDB)
   *
   * @param entityType - Parent entity type (e.g., 'pet', 'breed')
   * @param tableType - Child table name (e.g., 'title_in_pet')
   * @param recordId - Record ID to delete
   */
  async deleteChildRecord(
    entityType: string,
    tableType: string,
    recordId: string
  ): Promise<void> {
    // Enqueue delete BEFORE removing from RxDB (need doc data for payload)
    const collection = await this.ensureChildCollection(entityType);
    if (collection) {
      const doc = await collection.findOne(recordId).exec();
      if (doc) {
        const docData = doc.toJSON();
        const entitySchema = this.entitySchemas.get(entityType);
        const partitionConfig = entitySchema?.partition;
        await syncQueueService.enqueueChild(
          entityType, tableType.replace(/_with_\w+$/, ''), recordId, 'delete',
          buildChildPayload(docData, entityType, partitionConfig),
          'id'
        );
        await doc.remove();
      }
    }
  }

  /**
   * Determine entity type from child table name
   * e.g., 'achievement_in_breed' -> 'breed'
   *       'litter' -> 'pet' (if configured)
   */
  private getEntityTypeFromTableType(tableType: string): string | null {
    return CC.getEntityTypeFromTableType(tableType);
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

    // Check for partition config in entity schema
    const entitySchema = this.entitySchemas.get(entityType);
    const partitionConfig = entitySchema?.partition;
    let partitionValue: string | undefined;

    // If entity is partitioned, get partition key value from parent entity
    if (partitionConfig) {
      // First try memory store (fast)
      let parentEntity = await this.getById(entityType, parentId);
      let partitionSource = 'memory';

      // If not in memory, try RxDB collection
      if (!parentEntity && this.db?.collections[entityType]) {
        const doc = await this.db.collections[entityType].findOne(parentId).exec();
        if (doc) {
          parentEntity = doc.toJSON();
          partitionSource = 'RxDB';
        }
      }

      if (parentEntity) {
        partitionValue = (parentEntity as any)[partitionConfig.keyField];
        console.log(`[SpaceStore] applyChildFilters partition filter: ${partitionConfig.childFilterField}=${partitionValue} (from ${partitionSource})`);
      } else {
        console.warn(`[SpaceStore] Could not find parent entity for partition key. Table: ${tableType}, parentId: ${parentId}`);
      }
    }

    console.log('[SpaceStore] applyChildFilters (ID-First):', {
      parentId,
      tableType,
      filters,
      limit,
      cursor,
      orderBy,
      partitionField: partitionConfig?.childFilterField,
      partitionValue
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
        orderBy,
        partitionConfig?.childFilterField,
        partitionValue
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
      // Phase 2: Check RxDB cache

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
          parentIdField,
          partitionConfig?.childFilterField,
          partitionValue
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
    orderBy: OrderBy,
    partitionField?: string,
    partitionValue?: string
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

    // Apply partition filter if configured (for partition pruning)
    if (partitionField && partitionValue) {
      query = query.eq(partitionField, partitionValue);
    }

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

        const escapedValue = escapePostgrestValue(cursorData.value);
      const escapedTieBreaker = escapePostgrestValue(cursorData.tieBreaker);
      const orCondition = `${orderBy.field}.${mainOp}.${escapedValue},and(${orderBy.field}.eq.${escapedValue},${tbField}.${tbOp}.${escapedTieBreaker})`;
        query = query.or(orCondition);
      } catch (e) {
        console.warn('[SpaceStore] Failed to parse child cursor:', e);
      }
    }

    // Apply order (NULLS LAST)
    query = query.order(orderBy.field, { ascending: orderBy.direction === 'asc', nullsFirst: false });
    if (orderBy.tieBreaker) {
      query = query.order(orderBy.tieBreaker.field, { ascending: orderBy.tieBreaker.direction === 'asc', nullsFirst: false });
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
    parentIdField: string,
    partitionField?: string,
    partitionValue?: string
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
        // Skip parentIdField and partitionField - stored as top-level fields
        if (key === parentIdField) continue;
        if (partitionField && key === partitionField) continue;
        if (value !== undefined && value !== null) {
          additional[key] = value;
        }
      }

      // Build record with optional partitionId for partitioned entities
      const record: Record<string, any> = {
        id,
        tableType: normalizedTableType,
        parentId,
        additional: Object.keys(additional).length > 0 ? additional : undefined,
        cachedAt: Date.now()
      };

      // Add partitionId as top-level field if entity is partitioned
      if (partitionValue) {
        record.partitionId = partitionValue;
      }

      return record;
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
      field: 'id',
      direction: 'asc',
      tieBreaker: { field: 'id', direction: 'asc' }
    };

    // Determine entity type from VIEW name
    const entityType = this.getEntityTypeFromTableType(viewName);
    if (!entityType) {
      console.error(`[SpaceStore] Cannot determine entity type from VIEW: ${viewName}`);
      return { records: [], total: 0, hasMore: false, nextCursor: null };
    }

    // Check for partition config in entity schema (e.g., pet partitioned by breed_id)
    const entitySchema = this.entitySchemas.get(entityType);
    const partitionConfig = entitySchema?.partition;
    let partitionValue: string | undefined;

    // If entity is partitioned, get partition key value from parent entity
    if (partitionConfig) {
      // First try memory store (fast)
      let parentEntity = await this.getById(entityType, parentId);
      let partitionSource = 'memory';

      // If not in memory, try RxDB collection
      if (!parentEntity && this.db?.collections[entityType]) {
        const doc = await this.db.collections[entityType].findOne(parentId).exec();
        if (doc) {
          parentEntity = doc.toJSON();
          partitionSource = 'RxDB';
        }
      }

      if (parentEntity) {
        partitionValue = (parentEntity as any)[partitionConfig.keyField];
        console.log(`[SpaceStore] VIEW partition filter: ${partitionConfig.childFilterField}=${partitionValue} (from ${partitionSource})`);
      } else {
        console.warn(`[SpaceStore] Could not find parent entity for partition key. VIEW: ${viewName}, parentId: ${parentId}`);
      }
    }

    console.log('[SpaceStore] loadChildViewDirect (Local-First):', {
      viewName,
      parentId,
      parentField,
      entityType,
      limit,
      cursor: cursor ? '(set)' : null,
      orderBy,
      partitionField: partitionConfig?.childFilterField,
      partitionValue
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

      // Add partition filter if configured (for partition pruning on partitioned tables)
      if (partitionConfig && partitionValue) {
        query = query.eq(partitionConfig.childFilterField, partitionValue);
        console.log(`[SpaceStore] 🔧 Partition filter: ${partitionConfig.childFilterField} = ${partitionValue}`);
      }

      // Apply cursor (keyset pagination)
      if (cursor) {
        try {
          const cursorData = JSON.parse(cursor);
          const tieBreakerField = cursorData.tieBreakerField || orderBy.tieBreaker?.field || 'id';
          const mainOp = orderBy.direction === 'asc' ? 'gt' : 'lt';
          const tbDirection = orderBy.tieBreaker?.direction || 'asc';
          const tbOp = tbDirection === 'asc' ? 'gt' : 'lt';

          const escapedValue = escapePostgrestValue(cursorData.value);
          const escapedTieBreaker = escapePostgrestValue(cursorData.tieBreaker);
          const orCondition = `${orderBy.field}.${mainOp}.${escapedValue},and(${orderBy.field}.eq.${escapedValue},${tieBreakerField}.${tbOp}.${escapedTieBreaker})`;
          query = query.or(orCondition);
        } catch (e) {
          console.warn('[SpaceStore] Failed to parse VIEW cursor:', e);
        }
      }

      // Apply order (NULLS LAST)
      query = query.order(orderBy.field, { ascending: orderBy.direction === 'asc', nullsFirst: false });
      if (orderBy.tieBreaker) {
        query = query.order(orderBy.tieBreaker.field, { ascending: orderBy.tieBreaker.direction === 'asc', nullsFirst: false });
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

  // ==========================================
  // Pedigree Loading (JSONB-based)
  // ==========================================

  /**
   * Load pedigree from pet's JSONB pedigree field
   *
   * The pedigree field contains ancestor references as keys:
   * 'f' = father, 'm' = mother, 'ff' = father's father, etc.
   * Each value is { id: string, bid: string } (pet ID + breed ID for partition pruning)
   *
   * This method:
   * 1. Groups ancestor IDs by breed_id for efficient partition-pruned queries
   * 2. Batch fetches all ancestors from supabase
   * 3. Builds tree structure from JSONB keys
   *
   * @param pedigree - JSONB pedigree object from pet entity
   * @returns Pedigree tree with father and mother branches
   */
  async loadPedigreeFromJsonb(
    pedigree: Record<string, { id: string; bid: string }>,
  ): Promise<PedigreeResult> {
    if (!pedigree || Object.keys(pedigree).length === 0) {
      return { ancestors: [] };
    }

    console.log(`[SpaceStore] Loading pedigree from JSONB (${Object.keys(pedigree).length} entries)`);

    // Phase 1: Extract unique IDs from JSONB (dedup for inbreeding — same ancestor in multiple positions)
    const allIds = [...new Set(Object.values(pedigree).map(e => e.id))];
    const idToBreed = new Map(Object.values(pedigree).map(e => [e.id, e.bid]));

    // Phase 2: Check RxDB cache
    const collection = this.db?.collections['pet'];
    let cachedMap = new Map<string, any>();

    if (collection) {
      const cached = await collection.find({
        selector: { id: { $in: allIds } }
      }).exec();
      cachedMap = new Map(cached.map((d: any) => [d.id, d.toJSON()]));
    }

    const cacheHitRate = allIds.length > 0
      ? Math.round((cachedMap.size / allIds.length) * 100)
      : 0;
    console.log(`[SpaceStore] Pedigree cache: ${cachedMap.size}/${allIds.length} ancestors in RxDB (${cacheHitRate}% hit rate)`);

    // Phase 3: Fetch only missing ancestors from Supabase (grouped by breed_id for partition pruning)
    const missingIds = allIds.filter(id => !cachedMap.has(id));
    let freshRecords: any[] = [];

    try {
      if (missingIds.length > 0) {
        const missingByBreed = new Map<string, string[]>();
        for (const id of missingIds) {
          const bid = idToBreed.get(id)!;
          if (!missingByBreed.has(bid)) missingByBreed.set(bid, []);
          missingByBreed.get(bid)!.push(id);
        }

        const { supabase } = await import('../supabase/client');

        // Parallel fetch across breed partitions (instead of sequential N+1)
        const results = await Promise.all(
          Array.from(missingByBreed.entries()).map(([breedId, ids]) =>
            supabase
              .from('pet')
              .select('*')
              .eq('breed_id', breedId)
              .in('id', ids)
              .then(({ data, error }) => {
                if (error) console.error(`[SpaceStore] Failed to fetch ancestors for breed ${breedId}:`, error);
                return data || [];
              })
          )
        );
        freshRecords = results.flat();

        // Cache fresh records in RxDB
        if (freshRecords.length > 0 && collection) {
          const mapped = freshRecords.map(r => this.mapToRxDBFormat(r, 'pet'));
          await collection.bulkUpsert(mapped);
          console.log(`[SpaceStore] Pedigree: cached ${freshRecords.length} fresh records in RxDB`);
        }
      }

      // Phase 4: Merge cached + fresh
      const allAncestors = [...cachedMap.values(), ...freshRecords];

      // Resolve sex and country codes via dictionaryStore (local-first, RxDB cached)
      const { dictionaryStore } = await import('./dictionary-store.signal-store');

      const countryIds = new Set<string>();
      const sexIds = new Set<string>();
      for (const a of allAncestors) {
        if (a.country_of_birth_id) countryIds.add(a.country_of_birth_id);
        if (a.sex_id) sexIds.add(a.sex_id);
      }

      // Parallel lookup via dictionaryStore.getRecordById()
      const lookupPromises: Promise<[string, string, Record<string, unknown> | null]>[] = [];

      for (const id of sexIds) {
        lookupPromises.push(
          dictionaryStore.getRecordById('sex', id)
            .then(record => ['sex', id, record] as [string, string, Record<string, unknown> | null])
        );
      }
      for (const id of countryIds) {
        lookupPromises.push(
          dictionaryStore.getRecordById('country', id)
            .then(record => ['country', id, record] as [string, string, Record<string, unknown> | null])
        );
      }

      const lookupResults = await Promise.all(lookupPromises);

      const sexCodeMap = new Map<string, string>();
      const countryCodeMap = new Map<string, string>();
      for (const [type, id, record] of lookupResults) {
        if (!record) continue;
        if (type === 'sex' && record.code) sexCodeMap.set(id, String(record.code));
        if (type === 'country' && record.code) countryCodeMap.set(id, String(record.code));
      }

      // Build ancestor map
      const ancestorMap = new Map<string, any>();
      for (const a of allAncestors) {
        ancestorMap.set(a.id, a);
      }

      // Build tree from JSONB keys
      // Key 'f' = father, 'fm' = father.mother, 'mff' = mother.father.father, etc.
      const buildNode = (key: string): PedigreePet | undefined => {
        const entry = pedigree[key];
        if (!entry) return undefined;

        const ancestor = ancestorMap.get(entry.id);
        if (!ancestor) return undefined;

        const countryCode = ancestor.country_of_birth_id
          ? countryCodeMap.get(ancestor.country_of_birth_id)
          : undefined;

        return {
          id: ancestor.id,
          name: ancestor.name,
          slug: ancestor.slug || undefined,
          breedId: ancestor.breed_id,
          dateOfBirth: ancestor.date_of_birth || undefined,
          titles: ancestor.titles || undefined,
          avatarUrl: ancestor.avatar_url || undefined,
          sex: ancestor.sex_id ? {
            code: sexCodeMap.get(ancestor.sex_id),
          } : undefined,
          countryOfBirth: countryCode ? {
            code: countryCode
          } : undefined,
          father: buildNode(key + 'f'),
          mother: buildNode(key + 'm'),
        };
      };

      return {
        father: buildNode('f'),
        mother: buildNode('m'),
        ancestors: allAncestors,
      };
    } catch (error) {
      console.error('[SpaceStore] Error loading pedigree from JSONB:', error);
      throw error;
    }
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
  /**
   * Get a single record by ID (ID-First pattern)
   *
   * 1. Check RxDB cache first
   * 2. If not found, fetch from Supabase
   * 3. Cache in RxDB for future requests
   * 4. Return record
   *
   * @param tableName - Table/collection name (e.g., 'pet', 'breed')
   * @param id - Record UUID
   * @param partitionKey - Optional partition key for partitioned tables (e.g., { field: 'breed_id', value: 'uuid' } for pet)
   */
  async getRecordById(
    tableName: string,
    id: string,
    partitionKey?: { field: string; value: string }
  ): Promise<Record<string, unknown> | null> {
    if (!id) return null;

    const collection = this.db?.collections?.[tableName];

    if (!collection) {
      console.warn(`[SpaceStore] Collection ${tableName} not found`);
      return null;
    }

    try {
      // Phase 1: Check RxDB cache
      const doc = await collection.findOne(id).exec();
      if (doc) {
        return doc.toJSON();
      }

      // Phase 2: Fetch from Supabase
      // For partitioned tables (e.g., pet), include partition key for efficient query
      let query = supabase
        .from(tableName)
        .select('*')
        .eq('id', id);

      // Add partition key filter if provided (enables partition pruning)
      if (partitionKey?.field && partitionKey?.value) {
        query = query.eq(partitionKey.field, partitionKey.value);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        console.warn(`[SpaceStore] getRecordById: ${tableName}/${id} not found in Supabase`);
        return null;
      }

      // Phase 3: Cache in RxDB
      const mapped = this.mapToRxDBFormat(data, tableName);
      await collection.upsert(mapped);

      return data;
    } catch (error) {
      console.error(`[SpaceStore] getRecordById failed for ${tableName}/${id}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const spaceStore = SpaceStore.getInstance();