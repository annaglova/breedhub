import { signal, computed } from '@preact/signals-react';
import type { ReadonlySignal } from '@preact/signals-react';
import { getDatabase } from '../services/database.service';
import { Subscription } from 'rxjs';
import { RxCollection, RxDocument, RxJsonSchema } from 'rxdb';
import { EntityStore } from './base/entity-store';
import { appStore } from './app-store.signal-store';
import { entityReplicationService } from '../services/entity-replication.service';
import { supabase } from '../supabase/client';
import { userStore } from './user-store.signal-store';
import { dictionaryStore } from './dictionary-store.signal-store';
import {
  buildUiSpaceConfig,
  getDefaultViewFromConfig,
  type EntitySchemaConfig,
  getFilterFieldsFromConfig,
  getSupabaseSource,
  getMainFilterFieldFromConfig,
  getMainFilterFieldsFromConfig,
  parseSpaceConfigurations,
  getSortOptionsFromConfig,
  getViewRecordsCountFromConfig,
  resolveSpaceConfig,
  SpaceConfig,
} from './space-config.helpers';
import {
  buildEntityCollectionConfig,
  createBufferedEntityChangeHandler,
  getCollectionReuseStatus,
  getExpectedCollectionBatchSize,
  isCollectionSchemaMismatchError,
  recoverCollectionSchemaMismatch,
} from './space-collection.helpers';
import { waitForReady } from './space-ready.helpers';
import {
  buildHybridBaseQuery,
  buildHybridSearchPhaseQuery,
  buildHybridSearchPlan,
  buildRxdbCountSelector,
  executeOfflineFilterFlow,
  hydrateFilteredEntities,
  mergeHybridPhaseResults,
  applyFiltersToSupabaseQuery,
  getActiveFilterEntries,
  hasFilterValue,
  prepareFiltersWithDefaults,
  resolveFieldFilter,
  type HybridSearchPlan,
  type HybridSearchRecord,
} from './space-filter.helpers';
import {
  applySupabaseKeysetCursor,
  applySupabaseOrderBy,
  buildNextKeysetCursor,
  getSelectFieldsForOrderBy,
  parseKeysetCursor,
  type KeysetOrderBy,
} from './space-keyset.helpers';
import {
  filterLocalEntities,
} from './space-local-query.helpers';
import {
  applyChildListQueryOptions,
  createEmptyChildPageResult,
  filterLocalChildEntities,
  getChildCollectionName,
  getExistingChildCollection,
  getDefaultChildOrderBy,
  fetchAndCacheChildRecords,
  loadChildViewPage,
  getChildMutationMetadata,
  hasStaleChildRecords,
  mapAndCacheChildRows,
  normalizeChildTableType,
  queryLocalChildRecords,
  queueChildMutationRefresh,
  toChildPageResult,
} from './space-child.helpers';
import {
  buildMappingCacheKey,
  fetchRecordsByMappingRows,
  getMappingSelectFields,
  hasStaleMappedRecords,
  orderMappedRecordsByIds,
  refreshMappingCache,
  splitCachedAndMissingMappingRows,
  type MappingRow,
} from './space-mapping.helpers';
import {
  cacheRecords,
  docMapToRecordMap,
} from './space-id-cache.helpers';
import {
  fetchOrCacheTotalCount,
} from './space-total-count.helpers';
import {
  groupPartitionedEntityRefs,
  loadPartitionedEntitiesByRefs,
  normalizePartitionedEntityRefs,
  recordMatchesPartition,
  resolveChildPartitionContext,
  type PartitionedEntityRef,
} from './space-partition.helpers';
import {
  buildPedigreeResult,
  getPedigreeAncestorRefs,
  resolvePedigreeCodeMaps,
  type PedigreeJsonb,
  type PedigreePet as HelperPedigreePet,
  type PedigreeResult as HelperPedigreeResult,
} from './space-pedigree.helpers';

// Helpers
import {
  DEFAULT_TTL,
  cleanupMultipleCollections,
  schedulePeriodicCleanup,
  runInitialCleanup,
  isNetworkError,
  isOffline
} from '../helpers';

import {
  findDocumentById,
  findDocumentDataById,
} from '../utils/rxdb-document.helpers';
import * as CC from '../utils/child-collection-registry';
import { generateSchemaForEntity as buildSchema } from '../utils/schema-builder';
import { rebuildTimelineOnDateChange } from '../utils/timeline-builder';
import { generateSlug } from '../utils/slug-generator';
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

// OrderBy configuration with tie-breaker support
export type OrderBy = KeysetOrderBy;

/**
 * VIEW source mapping for entities that should fetch from a VIEW instead of base table.
 * VIEWs are used to enrich entities with JOINed data (e.g., parent names).
 * Key: entityType, Value: { viewName, extraFields }
 *
 * NOTE: litter was removed from here because the litter_with_parents VIEW
 * was too slow (~1.1s) due to JOINs to the partitioned pet table.
 * Instead, LitterListCard uses useCollectionValue hooks for enrichment.
 */

export type PedigreePet = HelperPedigreePet;
export type PedigreeResult = HelperPedigreeResult<BusinessEntity>;

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
  private entityStoresVersion = signal<number>(0); // Bumped when entityStores Map changes
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
  // Tab-level fullscreen (expand button on specific tab) — infinite scroll enabled.
  // Distinct from page fullscreen (slug URL) where limits still apply.
  isTabFullscreen = signal<boolean>(false);
  /** Emitted after background child refresh completes — useTabData subscribes to auto-refetch */
  childRefreshSignal = signal<{ tableType: string; parentId: string } | null>(null);

  // Tab loaded counts per entity - used to determine if fullscreen tab should be shown
  // Structure: { [entityId]: { [tabId]: loadedCount } }
  private tabLoadedCountsMap = signal<Record<string, Record<string, number>>>({});

  // Computed values
  isLoading = computed(() => this.loading.value);
  hasError = computed(() => this.error.value !== null);

  private get partitionContextDeps() {
    return {
      entitySchemas: this.entitySchemas,
      loadFromMemory: this.getById.bind(this),
      loadFromCache: this.findCachedEntityById.bind(this),
    };
  }
  
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
      const parsedSpaceConfigurations = parseSpaceConfigurations(mergedConfig);
      if (parsedSpaceConfigurations) {
        this.entitySchemas = parsedSpaceConfigurations.entitySchemas;
        this.spaceConfigs = parsedSpaceConfigurations.spaceConfigs;
        this.availableEntityTypes.value = parsedSpaceConfigurations.entityTypes;
      }

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
  /** Case-insensitive lookup in spaceConfigs map */
  private resolveSpaceConfig(entityType: string): SpaceConfig | undefined {
    return resolveSpaceConfig(this.spaceConfigs, entityType);
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
    return buildUiSpaceConfig(spaceConfig, entityType);
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
    return getViewRecordsCountFromConfig(
      this.resolveSpaceConfig(entityType),
      entityType,
      viewType,
    );
  }

  /**
   * Get default view (slug) from space config
   * Finds the view with isDefault: true
   *
   * @param entityType - Entity type (e.g., 'breed', 'animal')
   * @returns View slug (e.g., 'list') or first view's slug as fallback
   */
  getDefaultView(entityType: string): string {
    return getDefaultViewFromConfig(this.resolveSpaceConfig(entityType), entityType);
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
    return getSortOptionsFromConfig(this.resolveSpaceConfig(entityType), entityType);
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
    return getFilterFieldsFromConfig(this.resolveSpaceConfig(entityType), entityType);
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
    return getMainFilterFieldFromConfig(this.resolveSpaceConfig(entityType));
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
    return getMainFilterFieldsFromConfig(this.resolveSpaceConfig(entityType));
  }

  /**
   * Get or create an entity store for the given entity type
   */
  async getEntityStore<T extends BusinessEntity>(entityType: string): Promise<EntityStore<T> | null> {
    // Wait for full initialization (config + DB) before creating entity stores
    if (!this.initialized.value) {
      try {
        await waitForReady(
          () => this.initialized.value,
          {
            retries: 100,
            delayMs: 50,
            errorMessage: 'SpaceStore not initialized',
          },
        );
      } catch {
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
      this.entityStoresVersion.value++; // Notify computed signals

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
    const reuseStatus = await getCollectionReuseStatus(entityType, existingCollection);
    if (reuseStatus === 'ready') {
      console.log(`[SpaceStore] Collection ${entityType} already exists and is valid`);
      return;
    }

    if (existingCollection) {
      console.warn(`[SpaceStore] Collection ${entityType} exists but is broken, will recreate`);
    }
    
    const spaceConfig = this.spaceConfigs.get(entityType);
    if (!spaceConfig) {
      console.error(`[SpaceStore] No space configuration found for ${entityType}`);
      return;
    }

    const schema = buildSchema(entityType, spaceConfig);
    if (!schema) {
      console.warn(`[SpaceStore] Could not generate schema for ${entityType}`);
      return;
    }
    
    // Create collection
    try {
      await this.db.addCollections({
        [entityType]: buildEntityCollectionConfig(schema),
      });
      console.log(`[SpaceStore] Created collection ${entityType}`);
    } catch (error: any) {
      // DB6 = schema mismatch — cached IndexedDB has old schema, config has new one.
      // Auto-clear and reload (same as checkSchemaVersion flow).
      if (isCollectionSchemaMismatchError(error)) {
        console.warn(`[SpaceStore] Schema mismatch for ${entityType}. Clearing RxDB and reloading...`);
        const recovered = await recoverCollectionSchemaMismatch({
          db: this.db,
          indexedDb: indexedDB,
          localStorage,
          window,
        });
        if (recovered) {
          return;
        }
      }
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
      const expectedBatchSize = getExpectedCollectionBatchSize(
        this.spaceConfigs.get(entityType),
      );
      const subscription = collection.$.subscribe(
        createBufferedEntityChangeHandler(entityStore, expectedBatchSize),
      );

      this.entitySubscriptions.set(entityType, subscription);
      
    } else {
      entityStore.setLoading(false);
      entityStore.setError(`Failed to create collection for ${entityType}`);
    }
  }
  
  // Universal CRUD operations
  
  /**
   * Create a new entity
   */
  async create<T extends BusinessEntity>(entityType: string, data: Partial<T>): Promise<T | null> {
    const context = await this.getEntityCollectionContext<T>(entityType);
    if (!context) {
      return null;
    }

    const { entityStore, collection } = context;
    
    try {
      const id = crypto.randomUUID();
      const userId = userStore.currentUserId.value;
      // Generate slug client-side (same algorithm as server trigger)
      const slug = generateSlug((data as any).name || '', id);

      const newEntity = {
        ...data,
        id,
        slug,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(userId && { created_by: userId, updated_by: userId }),
        _deleted: false
      } as unknown as T;
      
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
    const context = await this.getEntityCollectionContext<T>(entityType);
    if (!context) {
      return;
    }

    const { entityStore, collection } = context;
    
    try {
      const doc = await findDocumentById(collection, id);

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
        patchData.timeline = rebuildTimelineOnDateChange(
          currentData.timeline || [],
          updates.date_of_birth ?? currentData.date_of_birth,
          (updates as any).date_of_death ?? currentData.date_of_death,
        );
      }

      // Update RxDB locally
      const patchedDoc = await doc.patch(patchData as Partial<T>);
      // Update in-memory signal store
      entityStore.updateOne(id, patchData as Partial<T>);

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
      ['pet_child', 'pet_id', 'Children'],
      ['title_in_pet', 'pet_id', 'Titles'],
      ['pet_in_program', 'pet_id', 'Show results'],
      ['pet_service_in_pet', 'pet_id', 'Services'],
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

    // Check RxDB first (fast, local), fallback to Supabase if RxDB says 0
    await Promise.all(
      checks.map(async ([table, fkColumn, label]) => {
        try {
          // RxDB check: child collections
          let found = false;
          if (this.db) {
            // Try child collection (e.g., pet_children for pet)
            const childCollectionName = `${entityType}_children`;
            const childCollection = this.db.collections[childCollectionName];
            if (childCollection) {
              const docs = await childCollection.find({
                selector: { parentId: id, tableType: table }
              }).exec();
              if (docs.length > 0) found = true;
            }

            // Try mapping table (e.g., pet_child)
            if (!found && table === 'pet_child') {
              const cached = this.mappingCache.get(
                buildMappingCacheKey(table, 'pet_id', id),
              );
              if (cached && cached.length > 0) found = true;
            }
          }

          // Supabase fallback if RxDB found nothing
          if (!found) {
            const { count, error } = await supabase
              .from(table)
              .select('id', { count: 'exact', head: true })
              .eq(fkColumn, id)
              .eq('deleted', false);

            if (!error && count && count > 0) found = true;
          }

          if (found) {
            dependencies.push({ label, count: 1 });
          }
        } catch {
          // Silent — fail-open for local-first UX
        }
      })
    );

    return {
      canDelete: dependencies.length === 0,
      dependencies,
    };
  }

  /**
   * Delete an entity (soft delete: RxDB first, then sync to Supabase)
   */
  async delete(entityType: string, id: string): Promise<void> {
    const context = await this.getEntityCollectionContext<BusinessEntity>(entityType);
    if (!context) {
      return;
    }

    const { entityStore, collection } = context;

    try {
      const doc = await findDocumentById(collection, id);

      if (!doc) {
        throw new Error(`${entityType} ${id} not found`);
      }

      // Build payload for Supabase sync BEFORE removing from RxDB
      const fullDoc = doc.toJSON();
      const entitySchema = this.entitySchemas.get(entityType);
      const partitionKey = entitySchema?.partition?.keyField;
      const payload = buildEntityPayload(fullDoc);
      // Add deleted flag for Supabase (can't store in RxDB — reserved field name)
      payload.deleted = true;
      payload.updated_at = new Date().toISOString();
      if (userStore.currentUserId.value) {
        payload.updated_by = userStore.currentUserId.value;
      }

      // Remove from RxDB locally (uses _deleted internally)
      await doc.remove();
      entityStore?.removeOne(id);
      this.removeFromMappingCache(id);

      // Enqueue for Supabase sync
      await syncQueueService.enqueueEntity(
        entityType, id, 'delete',
        payload,
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

  private async getEntityCollectionContext<T extends BusinessEntity>(
    entityType: string,
  ): Promise<{
    entityStore: EntityStore<T>;
    collection: RxCollection<T>;
  } | null> {
    const entityStore = await this.getEntityStore<T>(entityType);

    if (!entityStore) {
      console.error(`[SpaceStore] Entity store for ${entityType} not available`);
      return null;
    }

    const collection = (entityStore as any).collection as RxCollection<T> | undefined;

    if (!collection) {
      console.error(`[SpaceStore] Collection for ${entityType} not available`);
      return null;
    }

    return { entityStore, collection };
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
    const baseFieldConfigs = options?.fieldConfigs || spaceConfig?.filter_fields || {};
    const preparedFilters = prepareFiltersWithDefaults(
      filters,
      defaultFilters,
      baseFieldConfigs,
    );
    filters = preparedFilters.filters;
    const fieldConfigs = preparedFilters.fieldConfigs;

    console.log('[SpaceStore] applyFilters (ID-First):', {
      entityType,
      filters,
      limit,
      cursor,
      orderBy
    });

    // 📴 PREVENTIVE OFFLINE CHECK: Skip Supabase if browser is offline
    if (isOffline()) {
      return executeOfflineFilterFlow({
        entityType,
        filters,
        fieldConfigs,
        runLocalQuery: () =>
          filterLocalEntities({
            collection: this.db?.collections[entityType],
            entityType,
            filters,
            fieldConfigs,
            limit,
            cursor,
            orderBy,
            logMissingCollection: !!this.db,
          }),
        buildCountSelector: buildRxdbCountSelector,
        countByCollection: async (selector) => {
          if (!this.db) {
            throw new Error('Database not initialized');
          }

          const collection = this.db.collections[entityType];
          if (!collection) {
            throw new Error(`Collection ${entityType} not found`);
          }

          const allMatchingDocs = await collection.find({ selector }).exec();
          return allMatchingDocs.length;
        },
      });
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
        await fetchOrCacheTotalCount({
          entityType,
          filters,
          defaultFilters,
          totalFilterKey: spaceConfig?.totalFilterKey,
          ttlMs: TOTAL_COUNT_TTL_MS,
          readCache: (key) => {
            try {
              return localStorage.getItem(key);
            } catch {
              return null;
            }
          },
          writeCache: (key, value) => {
            try {
              localStorage.setItem(key, value);
            } catch (e) {
              console.warn(`[SpaceStore] Failed to cache totalCount:`, e);
            }
          },
          fetchFreshCount: (applyFilters) =>
            applyFilters(
              supabase
                .from(entityType)
                .select('*', { count: 'exact', head: true })
                .or('deleted.is.null,deleted.eq.false'),
            ),
          onCountResolved: (count, source) => {
            if (!entityStore) {
              return;
            }

            if (source === 'cache') {
              if (entityStore.totalFromServer.value === null) {
                entityStore.setTotalFromServer(count);
              }
              return;
            }

            entityStore.setTotalFromServer(count);
          },
        });
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
        nextCursor = buildNextKeysetCursor(
          {
            [orderBy.field]: orderValue,
            [tieBreakerField]: tieBreakerValue,
            id: lastRecord.id,
          },
          orderBy,
        );
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
      return hydrateFilteredEntities({
        ids,
        idsData: idsData as Array<{ id: string; updated_at?: string }>,
        limit,
        nextCursor,
        collection,
        fetchRecords: (idsToFetch) => this.fetchRecordsByIDs(entityType, idsToFetch),
        mapRecordForCache: (record) => this.mapToRxDBFormat(record, entityType),
      });

    } catch (error) {
      // 📴 OFFLINE FALLBACK: Use RxDB cache with proper filtering
      if (!isNetworkError(error)) {
        console.error('[SpaceStore] applyFilters error:', error);
      }
      return executeOfflineFilterFlow({
        entityType,
        filters,
        fieldConfigs,
        runLocalQuery: () =>
          filterLocalEntities({
            collection: this.db?.collections[entityType],
            entityType,
            filters,
            fieldConfigs,
            limit,
            cursor,
            orderBy,
            logMissingCollection: !!this.db,
          }),
        buildCountSelector: buildRxdbCountSelector,
        countByCollection: async (selector) => {
          if (!this.db) {
            throw new Error('Database not initialized');
          }

          const collection = this.db.collections[entityType];
          if (!collection) {
            throw new Error(`Collection ${entityType} not found`);
          }

          const allMatchingDocs = await collection.find({ selector }).exec();
          return allMatchingDocs.length;
        },
        logPrefix: 'Offline mode',
        catchLogPrefix: 'Offline fallback also failed:',
        countSelectorExtraOptions: { preferStringSearchOperator: true },
      });
    }
  }

  private async executeHybridSearch(
    entityType: string,
    hybridSearchPlan: HybridSearchPlan,
    fieldConfigs: Record<string, any>,
    limit: number,
    orderBy: OrderBy,
  ): Promise<HybridSearchRecord[]> {
    console.log('[SpaceStore] 🔍 HYBRID SEARCH mode (starts_with 70% + contains 30%)');
    const hybridSelectFields = getSelectFieldsForOrderBy(orderBy, {
      includeUpdatedAt: true,
    });
    const {
      isOrSearch,
      orSearchFields,
      searchValue,
      startsWithLimit,
    } = hybridSearchPlan;

    if (isOrSearch) {
      console.log(`[SpaceStore] 🔀 OR SEARCH: Searching "${searchValue}" in fields:`, orSearchFields);
    }

    const sourceName = getSupabaseSource(entityType);
    let startsWithQuery = buildHybridSearchPhaseQuery(
      buildHybridBaseQuery(
        supabase,
        sourceName,
        hybridSelectFields,
      ),
      hybridSearchPlan,
      {
        phase: 'starts_with',
        fieldConfigs,
      },
    );

    startsWithQuery = applySupabaseOrderBy(startsWithQuery, orderBy).limit(startsWithLimit);

    const { data: startsWithData, error: startsWithError } = await startsWithQuery;

    if (startsWithError) {
      console.error('[SpaceStore] ❌ Hybrid search (starts_with) failed:', startsWithError);
      throw startsWithError;
    }

    const startsWithResults = (startsWithData || []) as HybridSearchRecord[];
    console.log(`[SpaceStore] ✅ Starts with: ${startsWithResults.length} results`);

    const remainingLimit = limit - startsWithResults.length;
    if (remainingLimit > 0) {
      let containsQuery = buildHybridSearchPhaseQuery(
        buildHybridBaseQuery(
          supabase,
          sourceName,
          hybridSelectFields,
        ),
        hybridSearchPlan,
        {
          phase: 'contains',
          fieldConfigs,
        },
      );

      containsQuery = applySupabaseOrderBy(containsQuery, orderBy).limit(remainingLimit);

      const { data: containsData, error: containsError } = await containsQuery;

      if (containsError) {
        console.warn('[SpaceStore] Contains search failed:', containsError);
      } else {
        const containsResults = (containsData || []) as HybridSearchRecord[];
        console.log(`[SpaceStore] ✅ Contains: ${containsResults.length} results`);

        const mergedResults = mergeHybridPhaseResults(
          startsWithResults,
          containsResults,
          limit,
        );

        console.log(`[SpaceStore] ✅ Fetched ${mergedResults.length} IDs (~${Math.round(mergedResults.length * 0.1)}KB) via HYBRID SEARCH`);
        return mergedResults;
      }
    }

    console.log(`[SpaceStore] ✅ Fetched ${startsWithResults.length} IDs (~${Math.round(startsWithResults.length * 0.1)}KB) via HYBRID SEARCH`);
    return startsWithResults;
  }

  private async executeRegularIdFetch(
    entityType: string,
    filters: Record<string, any>,
    fieldConfigs: Record<string, any>,
    limit: number,
    cursor: string | null,
    orderBy: OrderBy,
  ): Promise<HybridSearchRecord[]> {
    const selectFields = getSelectFieldsForOrderBy(orderBy, {
      includeUpdatedAt: true,
    });

    const sourceName = getSupabaseSource(entityType);
    let query = supabase
      .from(sourceName)
      .select(selectFields);

    query = query.or('deleted.is.null,deleted.eq.false');
    query = applyFiltersToSupabaseQuery(query, filters, fieldConfigs);

    let data: any[] = [];
    let error: any = null;

    if (cursor !== null) {
      const cursorData = parseKeysetCursor(cursor, orderBy);

      console.log(`[SpaceStore] 🔑 Cursor parsed:`, cursorData);
      if (cursorData) {
        query = applySupabaseKeysetCursor(query, orderBy, cursorData);
      }
    }

    query = applySupabaseOrderBy(query, orderBy).limit(limit);

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
    console.log(`[SpaceStore] 🆔 Fetching IDs for ${entityType}...`);

    // Use hybrid search if: (1) has search filter, (2) no cursor (first page)
    const hybridSearchPlan =
      cursor === null
        ? buildHybridSearchPlan(filters, fieldConfigs, limit)
        : null;
    if (hybridSearchPlan) {
      return this.executeHybridSearch(
        entityType,
        hybridSearchPlan,
        fieldConfigs,
        limit,
        orderBy,
      );
    }
    return this.executeRegularIdFetch(
      entityType,
      filters,
      fieldConfigs,
      limit,
      cursor,
      orderBy,
    );
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

    // Use VIEW source if configured (e.g., litter_with_parents for litter)
    const sourceName = getSupabaseSource(entityType);
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
   * 🌐 Fetch full records by ID with optional partition pruning
   */
  private async fetchRecordsByPartitionRefs(
    entityType: string,
    refs: PartitionedEntityRef[],
    partitionField?: string,
  ): Promise<any[]> {
    const normalizedRefs = normalizePartitionedEntityRefs(refs);
    if (normalizedRefs.length === 0) {
      return [];
    }

    const sourceName = getSupabaseSource(entityType);

    if (!partitionField) {
      const { data, error } = await supabase
        .from(sourceName)
        .select('*')
        .in('id', normalizedRefs.map((ref) => ref.id))
        .or('deleted.is.null,deleted.eq.false');

      if (error) {
        console.error('[SpaceStore] ❌ Partition ref fetch error:', error);
        throw error;
      }

      return data || [];
    }

    const { partitionedIds, unpartitionedIds } =
      groupPartitionedEntityRefs(normalizedRefs);
    const results: any[] = [];

    if (unpartitionedIds.length > 0) {
      const { data, error } = await supabase
        .from(sourceName)
        .select('*')
        .in('id', unpartitionedIds)
        .or('deleted.is.null,deleted.eq.false');

      if (error) {
        console.error('[SpaceStore] ❌ Unpartitioned ref fetch error:', error);
        throw error;
      }

      if (data) {
        results.push(...data);
      }
    }

    for (const [partitionId, ids] of partitionedIds) {
      const { data, error } = await supabase
        .from(sourceName)
        .select('*')
        .eq(partitionField, partitionId)
        .in('id', ids)
        .or('deleted.is.null,deleted.eq.false');

      if (error) {
        console.error('[SpaceStore] ❌ Partition-pruned ref fetch error:', error);
        throw error;
      }

      if (data) {
        results.push(...data);
      }
    }

    return results;
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
    return computed(() => {
      void this.entityStoresVersion.value; // Subscribe to Map changes
      const entityStore = this.entityStores.get(entityType.toLowerCase());
      if (!entityStore) {
        return null;
      }
      return entityStore.getSelectedId();
    });
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
      const entity = await this.findCachedEntityById(entityType, id);
      if (entity) {
        console.log(`[SpaceStore] Loaded entity ${id} from RxDB, adding to store`);
        entityStore.addOne(entity);
      } else {
        console.log(`[SpaceStore] Entity ${id} not found in RxDB, will use shared fetch-by-id path`);
        const data = await this.fetchEntityById<BusinessEntity>(entityType, id);

        if (!data) {
          console.warn(`[SpaceStore] Entity ${id} not found by shared fetch-by-id path`);
          return;
        }

        console.log(`[SpaceStore] Loaded entity ${id} via shared fetch-by-id path`);
        entityStore.addOne(data);
      }
    } catch (err) {
      console.error(`[SpaceStore] Error loading entity from RxDB:`, err);
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
    if (entityStore.entityMap.value.has(id)) {
      console.log(`[SpaceStore] Entity ${id} already in store, selecting`);
      entityStore.selectEntity(id);
      return true;
    }

    // Shared local-first lookup with partition-aware fallback
    console.log(`[SpaceStore] Fetching entity ${id}`, partitionId ? `(partition: ${partitionId})` : '');
    try {
      const data = await this.fetchEntityById<BusinessEntity>(
        entityType,
        id,
        partitionId,
        partitionField,
      );

      if (!data) {
        console.warn(`[SpaceStore] Entity ${id} not found`);
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
    // 1. Try RxDB collection directly (instant if collection exists)
    const cachedEntity = await this.findCachedEntityBySlug<T>(entityType, slug);
    if (cachedEntity) {
      return cachedEntity;
    }

    // 2. Resolve via routes table (fast PK lookup → partition-pruned query)
    try {
      const { data: route, error } = await supabase
        .from('routes')
        .select('entity_id, entity_partition_id, partition_field')
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (route?.entity_id) {
        const data = await this.fetchEntityById<T & BusinessEntity>(
          entityType,
          route.entity_id,
          route.entity_partition_id ?? undefined,
          route.partition_field ?? undefined,
        );

        if (data) {
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
        .or('deleted.is.null,deleted.eq.false')
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      await this.cacheFetchedEntity(entityType, data);

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
   * @param partitionId - Optional partition key value for partitioned tables
   * @param partitionField - Optional partition key column name override
   * @returns Entity data or null
   */
  async fetchEntityById<T = any>(
    entityType: string,
    id: string,
    partitionId?: string,
    partitionField?: string,
  ): Promise<T | null> {
    if (partitionId) {
      const records = await this.loadEntitiesByPartitionRefs<T & BusinessEntity>(
        entityType,
        [{ id, partitionId }],
        { partitionField },
      );
      return records[0] ?? null;
    }

    // 1. Try RxDB collection directly (instant if cached)
    const cachedEntity = await this.findCachedEntityById<T>(entityType, id);
    if (cachedEntity) {
      return cachedEntity;
    }

    // 2. Fallback to Supabase
    try {
      const { data, error } = await supabase
        .from(entityType)
        .select('*')
        .eq('id', id)
        .or('deleted.is.null,deleted.eq.false')
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      await this.cacheFetchedEntity(entityType, data);

      return data as T;
    } catch (err) {
      console.error(`[SpaceStore] Error fetching by id from Supabase:`, err);
      return null;
    }
  }

  private async findCachedEntityBySlug<T = any>(
    entityType: string,
    slug: string,
  ): Promise<T | null> {
    const collection = this.db?.collections[entityType.toLowerCase()];
    if (!collection) {
      return null;
    }

    try {
      const docs = await collection.find({ selector: { slug } }).exec();
      const doc = docs[0];
      return doc ? (doc.toJSON() as T) : null;
    } catch (err) {
      console.warn(`[SpaceStore] Error querying RxDB by slug:`, err);
      return null;
    }
  }

  private async findCachedEntityById<T = any>(
    entityType: string,
    id: string,
  ): Promise<T | null> {
    const collection = this.db?.collections[entityType.toLowerCase()];
    if (!collection) {
      return null;
    }

    try {
      return await findDocumentDataById(collection, id);
    } catch (err) {
      console.warn(`[SpaceStore] Error querying RxDB by id:`, err);
      return null;
    }
  }

  private async cacheFetchedEntity(
    entityType: string,
    data: Record<string, any>,
  ): Promise<void> {
    const collectionName = entityType.toLowerCase();
    const collection = this.db?.collections[collectionName];
    if (!collection) {
      return;
    }

    const mapped = this.mapToRxDBFormat(data, collectionName);
    await collection.upsert(mapped);
  }

  /**
   * Load entities by ID + partition refs (Local-First: RxDB → Supabase fallback).
   *
   * Useful for partitioned entity lookups like pet records referenced from child tables.
   */
  async loadEntitiesByPartitionRefs<T extends BusinessEntity = BusinessEntity>(
    entityType: string,
    refs: PartitionedEntityRef[],
    options: {
      partitionField?: string;
    } = {},
  ): Promise<T[]> {
    const normalizedRefs = normalizePartitionedEntityRefs(refs);
    if (normalizedRefs.length === 0) {
      return [];
    }

    const partitionField =
      options.partitionField ||
      this.entitySchemas.get(entityType)?.partition?.keyField;

    if (this.db && !this.db.collections[entityType]) {
      try {
        await this.ensureCollection(entityType);
      } catch (error) {
        console.warn(
          `[SpaceStore] Failed to ensure collection for ${entityType}:`,
          error,
        );
      }
    }

    return loadPartitionedEntitiesByRefs<T>({
      entityType,
      refs: normalizedRefs,
      partitionField,
      collection: this.db?.collections[entityType],
      isOffline: isOffline(),
      fetchMissing: async (missingRefs) =>
        (await this.fetchRecordsByPartitionRefs(
          entityType,
          missingRefs,
          partitionField,
        )) as T[],
      mapRecordForCache: (record) => this.mapToRxDBFormat(record, entityType),
    });
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
    // Read entityStoresVersion to re-evaluate when new stores are added
    return computed(() => {
      void this.entityStoresVersion.value; // Subscribe to Map changes
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
    const collectionName = getChildCollectionName(entityType);
    const existingCollection = getExistingChildCollection(entityType, { childCollections: this.childCollections, dbCollections: this.db?.collections });
    if (existingCollection) {
      this.childCollections.set(collectionName, existingCollection);
      return existingCollection;
    }

    if (!this.db) {
      console.error('[SpaceStore] Database not initialized for child collection');
      return null;
    }

    // Get schema for child collection
    const schema = CC.getChildCollectionSchema(entityType);
    if (!schema) {
      console.error(`[SpaceStore] No schema found for child collection: ${collectionName}`);
      return null;
    }

    try {
      const migrationStrategies = CC.getChildCollectionMigrationStrategies(entityType);

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
    const entityType = CC.getEntityTypeFromTableType(tableType);
    if (!entityType) {
      console.error(`[SpaceStore] Cannot determine entity type from table: ${tableType}`);
      return [];
    }

    // Ensure child collection exists
    const collection = await this.ensureChildCollection(entityType);
    if (!collection) {
      return [];
    }

    const { partitionConfig, partitionValue } =
      await resolveChildPartitionContext({
        ...this.partitionContextDeps,
        entityType,
        parentId,
        targetLabel: `Table: ${tableType}`,
      });

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
      if (hasStaleChildRecords(existingRecords, CHILD_STALE_MS)) {
        // Return stale data immediately, refresh in background
        this.refreshChildRecordsInBackground(entityType, tableType, parentId, parentIdField, options, partitionConfig, partitionValue);
      }
      return existingRecords;
    }

    return fetchAndCacheChildRecords({
      tableType,
      parentId,
      parentIdField,
      partitionField: partitionConfig?.childFilterField,
      partitionValue,
      collection,
      fetchChildRecords: async () => {
        const { limit = 50, orderBy, orderDirection = 'asc' } = options;
        const query = applyChildListQueryOptions(
          (supabase as any)
            .from(tableType)
            .select('*'),
          {
            parentField: parentIdField,
            parentId,
            limit,
            orderBy,
            orderDirection,
            partitionField: partitionConfig?.childFilterField,
            partitionValue,
          },
        );

        return await query;
      },
    });
  }

  /** Force refresh child records from Supabase — use after operations with server-side triggers */
  async forceRefreshChildRecords(
    entityType: string,
    tableType: string,
    parentId: string,
    parentField?: string
  ): Promise<void> {
    const parentIdField = parentField || `${entityType}_id`;
    const { partitionConfig, partitionValue } =
      await resolveChildPartitionContext({
        ...this.partitionContextDeps,
        entityType,
        parentId,
        contextLabel: 'forceRefreshChildRecords',
        targetLabel: `Table: ${tableType}`,
        warnIfMissing: false,
      });
    await this.refreshChildRecordsInBackground(
      entityType, tableType, parentId, parentIdField,
      { limit: 200 }, partitionConfig, partitionValue
    );
  }

  // Mapping ID cache: avoids Supabase call on tab switch
  private mappingCache = new Map<string, any[]>();

  /** Clear mapping ID cache — call after entity_child create/delete to force re-fetch */
  invalidateMappingCache(): void {
    this.mappingCache.clear();
  }

  /** Optimistically add a record to mapping cache (before server trigger creates it) */
  addToMappingCache(mappingTable: string, parentField: string, parentId: string, record: { id: string; [key: string]: any }): void {
    const cacheKey = buildMappingCacheKey(mappingTable, parentField, parentId);
    const existing = this.mappingCache.get(cacheKey) || [];
    if (!existing.some((r: any) => r.id === record.id)) {
      this.mappingCache.set(cacheKey, [...existing, record]);
    }
  }

  /** Remove a specific record from mapping cache (after entity_child delete) */
  removeFromMappingCache(recordId: string): void {
    for (const [key, entries] of this.mappingCache) {
      const filtered = entries.filter((r: any) => r.id !== recordId);
      if (filtered.length !== entries.length) {
        this.mappingCache.set(key, filtered);
      }
    }
  }

  /**
   * Load entities via a mapping table (e.g., pet_child → pet).
   * Local-first: cached mapping IDs → RxDB → return instantly.
   * First load: Supabase mapping → RxDB check → fetch missing → cache all.
   */
  async loadEntitiesViaMapping(
    entityTable: string,
    mappingTable: string,
    parentField: string,
    parentId: string,
    partitionField?: string,
  ): Promise<any[]> {
    await this.ensureCollection(entityTable);
    const collection = this.db?.collections[entityTable];
    const cacheKey = buildMappingCacheKey(mappingTable, parentField, parentId);
    const STALE_MS = 5 * 60 * 1000;
    const fetchMappingRecords = (rows: MappingRow[]) =>
      fetchRecordsByMappingRows(rows, {
        partitionField,
        fetchAll: async (ids) => {
          const { data } = await supabase.from(entityTable).select('*').in('id', ids);
          return data || [];
        },
        fetchPartition: async (partitionValue, ids) => {
          const { data } = await supabase.from(entityTable)
            .select('*')
            .eq(partitionField!, partitionValue)
            .in('id', ids);
          return data || [];
        },
      });
    const refreshMapping = () =>
      refreshMappingCache({
        loadMappingRows: async () => {
          const selectFields = getMappingSelectFields(partitionField);
          const { data } = await supabase.from(mappingTable).select(selectFields).eq(parentField, parentId);
          return data as MappingRow[] | null | undefined;
        },
        cacheKey,
        mappingCache: this.mappingCache,
        fetchRecords: fetchMappingRecords,
        collection,
        mapRecordForCache: (record) => this.mapToRxDBFormat(record, entityTable),
      });

    // Step 1: Try cached mapping IDs → RxDB (instant, zero Supabase calls)
    const cachedMapping = this.mappingCache.get(cacheKey);
    if (cachedMapping && cachedMapping.length > 0 && collection) {
      const ids = cachedMapping.map((r: any) => r.id);
      const docs = await collection.findByIds(ids).exec();
      if (docs.size > 0) {
        const cachedMap = docMapToRecordMap<any>(docs);
        const results = orderMappedRecordsByIds<any>(ids, cachedMap);
        // Background refresh if stale
        if (!isOffline() && hasStaleMappedRecords(results, STALE_MS)) {
          refreshMapping();
        }
        return results;
      }
    }

    // Offline without cached mapping: scan RxDB
    if (isOffline()) {
      if (!collection) return [];
      const allDocs = await collection.find().exec();
      return allDocs.map((d: any) => d.toJSON())
        .filter((r: any) => r.father_id === parentId || r.mother_id === parentId);
    }

    // Step 2: First load — get mapping IDs from Supabase
    const selectFields = getMappingSelectFields(partitionField);
    const { data: mappingRows } = await supabase
      .from(mappingTable).select(selectFields).eq(parentField, parentId);

    if (!mappingRows?.length) return [];
    const safeMappingRows = mappingRows as unknown as MappingRow[];
    this.mappingCache.set(cacheKey, safeMappingRows);

    // Step 3: Check RxDB, fetch missing
    if (!collection) return fetchMappingRecords(safeMappingRows);

    const cachedDocs = await collection.findByIds(safeMappingRows.map((r: any) => r.id)).exec();
    const cachedMap = docMapToRecordMap<any>(cachedDocs);
    const { cached, missing } = splitCachedAndMissingMappingRows(
      safeMappingRows,
      cachedMap,
      STALE_MS,
    );
    if (missing.length === 0) return cached;

    // Step 4: Fetch missing, cache, return all
    try {
      const fresh = await fetchMappingRecords(missing);
      await cacheRecords(fresh, {
        collection,
        mapRecordForCache: (record) => this.mapToRxDBFormat(record, entityTable),
      });

      // Always read from RxDB — source of truth (Supabase → RxDB → UI)
      const allIds = safeMappingRows.map((r: any) => r.id);
      const allDocs = await collection.findByIds(allIds).exec();
      return orderMappedRecordsByIds<any>(allIds, docMapToRecordMap<any>(allDocs));
    } catch {
      return cached;
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
      const { limit = 50, orderBy, orderDirection = 'asc' } = options;
      const query = applyChildListQueryOptions(
        (supabase as any)
          .from(tableType)
          .select('*'),
        {
          parentField: parentIdField,
          parentId,
          limit,
          orderBy,
          orderDirection,
          partitionField: partitionConfig?.childFilterField,
          partitionValue,
        },
      );

      const { data, error } = await query;
      if (error || !data || data.length === 0) return;

      const collection = await this.ensureChildCollection(entityType);
      if (!collection) return;

      await mapAndCacheChildRows(data, {
        tableType,
        parentId,
        parentField: parentIdField,
        partitionField: partitionConfig?.childFilterField,
        partitionValue,
        collection,
      });

      // Notify UI to refetch (useTabData subscribes to this signal)
      this.childRefreshSignal.value = {
        tableType: normalizeChildTableType(tableType),
        parentId,
      };
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

    const entityType = CC.getEntityTypeFromTableType(tableType);
    if (!entityType) {
      return [];
    }

    const collection = getExistingChildCollection(entityType, { childCollections: this.childCollections, dbCollections: this.db?.collections });
    if (!collection) {
      return [];
    }

    return queryLocalChildRecords({
      collection,
      parentId,
      tableType,
      ...options,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Child Tables: CRUD Operations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Registry of local-rebuild handlers per (parentEntityType, childTableType) pair.
   * To add a new denormalized field: implement a private rebuild method, then
   * add an entry here. See `breedhub-docs/general/DENORMALIZATION_PATTERN.md`.
   */
  private readonly denormRebuilders: Record<
    string,
    (parentId: string, partitionId?: string) => Promise<void>
  > = {
    'pet:title_in_pet': (parentId, partitionId) =>
      this.rebuildPetTitlesDisplay(parentId, partitionId),
  };

  /**
   * Rebuild denormalized parent fields after a child record changes.
   * Mirrors server-side triggers — see `breedhub-docs/general/DENORMALIZATION_PATTERN.md`.
   *
   * Server trigger is canonical (still runs after sync); local rebuild gives
   * instant UX without waiting for round-trip.
   */
  private async rebuildParentDenormFields(
    parentEntityType: string,
    childTableType: string,
    parentId: string,
    partitionId?: string,
  ): Promise<void> {
    const rebuilder = this.denormRebuilders[`${parentEntityType}:${childTableType}`];
    if (!rebuilder) return;
    try {
      await rebuilder(parentId, partitionId);
    } catch (e) {
      console.error('[SpaceStore] rebuildParentDenormFields failed:', e);
    }
  }

  /**
   * Locally rebuild pet.titles_display from cached title_in_pet rows.
   * Mirrors SQL trigger `trg_title_in_pet_rebuild_titles_display`.
   * Pure builder lives in `utils/titles-display-builder.ts`.
   */
  private async rebuildPetTitlesDisplay(petId: string, petBreedId?: string): Promise<void> {
    // 1. Read all title_in_pet rows for this pet from RxDB child cache
    const childRecords = await this.getChildRecords(
      petId,
      'title_in_pet',
      { partitionId: petBreedId, limit: 0 },
    );

    // Map RxDB child shape → builder input shape
    const titlesInPet = childRecords
      .map((r: any) => {
        const a = r.additional || {};
        return {
          title_id: a.title_id,
          country_id: a.country_id ?? null,
          amount: a.amount ?? null,
          date: a.date ?? null,
          is_confirmed: a.is_confirmed ?? null,
          deleted: a.deleted ?? r.deleted ?? null,
        };
      })
      .filter((t) => !!t.title_id);

    // 2. Lookup title name+rating from dictionary (parallel)
    const titleIds = Array.from(new Set(titlesInPet.map((t) => t.title_id as string)));
    const titleLookup = new Map<string, { name?: string | null; rating?: number | string | null }>();
    if (titleIds.length > 0) {
      const lookups = await Promise.all(
        titleIds.map((id) => dictionaryStore.getRecordById('title', id)),
      );
      for (let i = 0; i < titleIds.length; i++) {
        const rec = lookups[i];
        if (rec) {
          titleLookup.set(titleIds[i], {
            name: rec.name as string | null,
            rating: rec.rating as number | string | null,
          });
        }
      }
    }

    // 3. Pure builder (mirrors SQL aggregation)
    const { buildTitlesDisplay } = await import('../utils/titles-display-builder');
    const titlesDisplay = buildTitlesDisplay(titlesInPet, titleLookup);

    // 4. Patch local pet doc and signal store
    // Pet cache is keyed only by id, so guard against cross-breed collisions
    // before mutating denormalized local state.
    const collection = this.db?.collections['pet'];
    if (collection) {
      const doc = await findDocumentById(collection, petId);
      if (doc) {
        const petRecord = doc.toJSON() as Record<string, any>;
        const cachedBreedId = petRecord.breed_id;
        if (recordMatchesPartition(petRecord, 'breed_id', petBreedId)) {
          await doc.patch({ titles_display: titlesDisplay });
        } else {
          console.warn('[SpaceStore] Skipping titles_display patch for mismatched pet partition', {
            petId,
            expectedBreedId: petBreedId,
            cachedBreedId,
          });
        }
      }
    }
    const entityStore = this.entityStores.get('pet');
    if (entityStore) {
      const cachedPet = entityStore.entityMap.value.get(petId) as Record<string, any> | undefined;
      const cachedBreedId = cachedPet?.breed_id;
      if (recordMatchesPartition(cachedPet, 'breed_id', petBreedId)) {
        entityStore.updateOne(petId, { titles_display: titlesDisplay });
      } else if (cachedPet) {
        console.warn('[SpaceStore] Skipping titles_display store update for mismatched pet partition', {
          petId,
          expectedBreedId: petBreedId,
          cachedBreedId,
        });
      }
    }
  }

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

    // Sanitize data: ensure plain JSON (no Date objects, Proxy, etc.)
    const plainData = JSON.parse(JSON.stringify(data));

    const now = new Date().toISOString();
    const userId = userStore.currentUserId.value;

    const { normalizedType } = getChildMutationMetadata(this.entitySchemas, entityType, tableType);
    const { partitionConfig, partitionValue } =
      await resolveChildPartitionContext({
        ...this.partitionContextDeps,
        entityType,
        parentId,
        contextLabel: 'createChildRecord',
        targetLabel: `Table: ${normalizedType}`,
        logResolved: false,
        warnIfMissing: false,
      });
    // Insert into RxDB
    const collection = await this.ensureChildCollection(entityType);
    if (collection) {
      const rxdbRecord: Record<string, any> = {
        id,
        tableType: normalizedType,
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
        entityType, normalizedType, id, 'upsert',
        buildChildPayload(rxdbRecord, entityType, partitionConfig),
        'id'
      );

      // Local rebuild of denormalized parent fields (mirrors server triggers)
      await this.rebuildParentDenormFields(entityType, normalizedType, parentId, partitionValue);

      // Flush sync queue + refresh to pick up server-side trigger side-effects
      queueChildMutationRefresh(
        () => syncQueueService.processNow(),
        this.forceRefreshChildRecords.bind(this),
        entityType,
        normalizedType,
        parentId,
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
    const { normalizedType, partitionConfig } = getChildMutationMetadata(this.entitySchemas, entityType, tableType);

    // Update RxDB
    const collection = await this.ensureChildCollection(entityType);
    if (collection) {
      const doc = await findDocumentById(collection, recordId);
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
        await syncQueueService.enqueueChild(
          entityType, normalizedType, recordId, 'upsert',
          buildChildPayload(updatedDoc, entityType, partitionConfig),
          'id'
        );

        // Local rebuild of denormalized parent fields (mirrors server triggers)
        await this.rebuildParentDenormFields(
          entityType,
          normalizedType,
          updatedDoc.parentId,
          updatedDoc.partitionId,
        );

        // Flush sync queue + refresh to pick up server-side trigger side-effects
        queueChildMutationRefresh(
          () => syncQueueService.processNow(),
          this.forceRefreshChildRecords.bind(this),
          entityType,
          normalizedType,
          updatedDoc.parentId,
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
    const { normalizedType, partitionConfig } = getChildMutationMetadata(this.entitySchemas, entityType, tableType);

    // Enqueue delete BEFORE removing from RxDB (need doc data for payload)
    const collection = await this.ensureChildCollection(entityType);
    if (collection) {
      const doc = await findDocumentById(collection, recordId);
      if (doc) {
        const docData = doc.toJSON();
        await syncQueueService.enqueueChild(
          entityType, normalizedType, recordId, 'delete',
          buildChildPayload(docData, entityType, partitionConfig),
          'id'
        );
        await doc.remove();

        // Local rebuild of denormalized parent fields (mirrors server triggers).
        // Done AFTER remove so the deleted row is no longer in the cached set.
        await this.rebuildParentDenormFields(
          entityType,
          normalizedType,
          docData.parentId,
          docData.partitionId,
        );
      }
    }
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
    const orderBy: OrderBy = options.orderBy || getDefaultChildOrderBy();

    // Determine entity type from table name
    const entityType = CC.getEntityTypeFromTableType(tableType);
    if (!entityType) {
      console.error(`[SpaceStore] Cannot determine entity type from table: ${tableType}`);
      return createEmptyChildPageResult();
    }

    const parentIdField = `${entityType}_id`;

    const { partitionConfig, partitionValue } =
      await resolveChildPartitionContext({
        ...this.partitionContextDeps,
        entityType,
        parentId,
        contextLabel: 'applyChildFilters',
        targetLabel: `Table: ${tableType}`,
      });

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
        return await this.loadLocalChildPage(
          parentId,
          tableType,
          filters,
          limit,
          cursor,
          orderBy,
        );
      } catch (error) {
        console.error('[SpaceStore] Offline child loading failed:', error);
        return createEmptyChildPageResult();
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
        return createEmptyChildPageResult();
      }

      console.log(`[SpaceStore] ✅ Got ${idsData.length} child IDs`, idsData.slice(0, 3));

      // Extract IDs and calculate nextCursor
      const ids = idsData.map(d => d.id);
      const lastRecord = idsData[idsData.length - 1];
      let nextCursor: string | null = null;
      if (lastRecord && idsData.length >= limit) {
        nextCursor = buildNextKeysetCursor(lastRecord, orderBy);
        console.log('[SpaceStore] 📍 nextCursor calculated:', {
          lastRecord,
          orderByField: orderBy.field,
          value: lastRecord[orderBy.field],
          tieBreaker: lastRecord[orderBy.tieBreaker?.field || 'id'],
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
        return createEmptyChildPageResult();
      }
      return hydrateFilteredEntities({
        ids,
        idsData: idsData as Array<{ id: string; updated_at?: string }>,
        limit,
        nextCursor,
        collection,
        fetchRecords: (idsToFetch) => this.fetchChildRecordsByIDs(
          tableType,
          idsToFetch,
          parentId,
          parentIdField,
          partitionConfig?.childFilterField,
          partitionValue
        ),
        logLabels: {
          cacheTitle: 'Child cache',
          recordNoun: 'child records',
          cachedFreshDescriptor: 'records',
        },
      });

    } catch (error) {
      // 📴 OFFLINE FALLBACK
      if (!isNetworkError(error)) {
        console.error('[SpaceStore] applyChildFilters error:', error);
      }

      try {
        return await this.loadLocalChildPage(
          parentId,
          tableType,
          filters,
          limit,
          cursor,
          orderBy,
        );
      } catch (offlineError) {
        console.error('[SpaceStore] Offline fallback failed:', offlineError);
        return createEmptyChildPageResult();
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
    const selectFields = getSelectFieldsForOrderBy(orderBy);

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
      const cursorData = parseKeysetCursor(cursor, orderBy);
      query = applySupabaseKeysetCursor(query, orderBy, cursorData);
    }

    query = applySupabaseOrderBy(query, orderBy);

    // Apply limit
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('[SpaceStore] Child IDs query error:', error);
      throw error;
    }

    return (data || []) as unknown as Array<{ [key: string]: any; id: string }>;
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

    const { data, error } = await supabase
      .from(tableType)
      .select('*')
      .in('id', ids);

    if (error) {
      console.error('[SpaceStore] Fetch child records by IDs error:', error);
      throw error;
    }

    if (!data) return [];

    const hydrationResult = await mapAndCacheChildRows(data, {
      tableType,
      parentId,
      parentField: parentIdField,
      partitionField,
      partitionValue,
    });

    return hydrationResult.transformedRecords;
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
    const orderBy: OrderBy = options.orderBy || getDefaultChildOrderBy();

    // Determine entity type from VIEW name
    const entityType = CC.getEntityTypeFromTableType(viewName);
    if (!entityType) {
      console.error(`[SpaceStore] Cannot determine entity type from VIEW: ${viewName}`);
      return createEmptyChildPageResult();
    }

    const { partitionConfig, partitionValue } =
      await resolveChildPartitionContext({
        ...this.partitionContextDeps,
        entityType,
        parentId,
        contextLabel: 'VIEW',
        targetLabel: `VIEW: ${viewName}`,
      });

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
        return await this.loadLocalChildPage(
          parentId,
          viewName,
          {},
          limit,
          cursor,
          orderBy,
        );
      } catch (error) {
        console.error('[SpaceStore] Offline VIEW loading failed:', error);
        return createEmptyChildPageResult();
      }
    }

    try {
      const collection = await this.ensureChildCollection(entityType);
      return await loadChildViewPage({
        viewName,
        parentId,
        parentField,
        limit,
        orderBy,
        partitionConfig,
        partitionValue,
        collection: collection || undefined,
        fetchViewRecords: async () => {
          let query = supabase
            .from(viewName)
            .select('*')
            .eq(parentField, parentId);

          if (partitionConfig && partitionValue) {
            query = query.eq(partitionConfig.childFilterField, partitionValue);
            console.log(`[SpaceStore] 🔧 Partition filter: ${partitionConfig.childFilterField} = ${partitionValue}`);
          }

          if (cursor) {
            const cursorData = parseKeysetCursor(cursor, orderBy);
            query = applySupabaseKeysetCursor(query, orderBy, cursorData);
          }

          query = applySupabaseOrderBy(query, orderBy);
          query = query.limit(limit);

          return await query;
        },
      });

    } catch (error) {
      // 📴 OFFLINE FALLBACK
      if (!isNetworkError(error)) {
        console.error('[SpaceStore] loadChildViewDirect failed:', error);
      }

      try {
        console.log('[SpaceStore] 📴 Falling back to local cache...');
        return await this.loadLocalChildPage(
          parentId,
          viewName,
          {},
          limit,
          cursor,
          orderBy,
        );
      } catch (offlineError) {
        console.error('[SpaceStore] Offline fallback failed:', offlineError);
        return createEmptyChildPageResult();
      }
    }
  }

  private async loadLocalChildPage(
    parentId: string,
    tableType: string,
    filters: Record<string, any>,
    limit: number,
    cursor: string | null,
    orderBy: OrderBy,
  ): Promise<{ records: any[]; total: number; hasMore: boolean; nextCursor: string | null }> {
    const entityType = CC.getEntityTypeFromTableType(tableType);
    const localQuery = await filterLocalChildEntities({
      collection: entityType
        ? getExistingChildCollection(entityType, { childCollections: this.childCollections, dbCollections: this.db?.collections })
        : undefined,
      parentId,
      tableType,
      filters,
      limit,
      cursor,
      orderBy,
    });

    return toChildPageResult(localQuery);
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
   * 1. Normalizes ancestor refs with partition context
   * 2. Loads ancestors through the shared local-first partition-aware path
   * 3. Builds tree structure from JSONB keys
   *
   * @param pedigree - JSONB pedigree object from pet entity
   * @returns Pedigree tree with father and mother branches
   */
  async loadPedigreeFromJsonb(
    pedigree: PedigreeJsonb,
  ): Promise<PedigreeResult> {
    if (!pedigree || Object.keys(pedigree).length === 0) {
      return { ancestors: [] };
    }

    console.log(`[SpaceStore] Loading pedigree from JSONB (${Object.keys(pedigree).length} entries)`);
    const ancestorRefs = getPedigreeAncestorRefs(pedigree);
    if (ancestorRefs.length === 0) {
      return { ancestors: [] };
    }

    try {
      const allAncestors = await this.loadEntitiesByPartitionRefs<BusinessEntity>(
        'pet',
        ancestorRefs,
        { partitionField: 'breed_id' },
      );
      console.log(
        `[SpaceStore] Pedigree: resolved ${allAncestors.length}/${ancestorRefs.length} unique ancestor refs`,
      );

      const { sexCodeMap, countryCodeMap } = await resolvePedigreeCodeMaps(
        allAncestors,
        (type, id) => dictionaryStore.getRecordById(type, id),
      );

      return buildPedigreeResult(pedigree, allAncestors, {
        sexCodeMap,
        countryCodeMap,
      });
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
    // Always reset tab fullscreen — only setTabFullscreen() should set it.
    // This ensures returning from tab→page fullscreen clears the flag.
    this.isTabFullscreen.value = false;
  }

  /**
   * Set tab-level fullscreen (expand button on specific tab).
   * Enables infinite scroll. Distinct from page fullscreen where limits apply.
   */
  setTabFullscreen(value: boolean): void {
    this.isTabFullscreen.value = value;
    if (value) this.isFullscreen.value = true;
  }

  /**
   * Clear fullscreen mode
   * Called when closing drawer or navigating away
   */
  clearFullscreen(): void {
    this.isFullscreen.value = false;
    this.isTabFullscreen.value = false;
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

    const data = await this.fetchEntityById<Record<string, unknown>>(
      tableName,
      id,
      partitionKey?.value,
      partitionKey?.field,
    );

    if (!data) {
      console.warn(`[SpaceStore] getRecordById: ${tableName}/${id} not found`);
      return null;
    }

    return data;
  }
}

// Export singleton instance
export const spaceStore = SpaceStore.getInstance();
