import { signal, computed } from '@preact/signals-react';
import type { ReadonlySignal } from '@preact/signals-react';
import { getDatabase, type AppDatabase } from '../services/database.service';
import { Subscription } from 'rxjs';
import { RxCollection, RxDocument } from 'rxdb';
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
  type PartitionConfig,
  type SpaceFilterField,
  type SpaceMainFilterField,
  type SpaceMainFilterFieldsResult,
  getFilterFieldsFromConfig,
  getSupabaseSource,
  getMainFilterFieldFromConfig,
  getMainFilterFieldsFromConfig,
  parseSpaceConfigurations,
  getSortOptionsFromConfig,
  getViewRecordsCountFromConfig,
  resolveSpaceConfig,
  type SpaceConfig,
  type UiSpaceConfig,
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
  buildHybridSearchPlan,
  buildRxdbCountSelector,
  executeHybridSearch,
  executeOfflineFilterFlow,
  executeRegularIdFetch,
  hydrateFilteredEntities,
  getActiveFilterEntries,
  hasFilterValue,
  prepareFiltersWithDefaults,
  resolveFieldFilter,
  type FilterFieldConfigMap,
  type FilterMap,
  type HydratableEntityRecord,
  type HydrateFilteredEntitiesResult,
  type HybridSearchRecord,
  type SupabaseExecutableQuery,
} from './space-filter.helpers';
import {
  buildCompositeNextCursor,
  applySupabaseKeysetCursor,
  applySupabaseOrderBy,
  getSelectFieldsForOrderBy,
  parseKeysetCursor,
  type KeysetOrderBy,
} from './space-keyset.helpers';
import {
  filterLocalEntities,
} from './space-local-query.helpers';
import {
  applyChildListQueryOptions,
  buildChildSelectClause,
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
  type ChildCacheRecord,
  type ChildPageResult,
  type ChildSourceRow,
  type LoadChildViewPageResult,
} from './space-child.helpers';
import {
  buildMappingCacheKey,
  fetchRecordsByMappingRows,
  getMappingSelectFields,
  loadEntitiesViaMappingFlow,
  probeDependentRecords,
  type MappingRow,
} from './space-mapping.helpers';
import {
  fetchOrCacheTotalCount,
} from './space-total-count.helpers';
import {
  groupPartitionedEntityRefs,
  loadPartitionedEntitiesByRefs,
  normalizePartitionedEntityRefs,
  resolveChildPartitionContext,
  type PartitionedEntityRef,
} from './space-partition.helpers';
import {
  rebuildPetTitlesDisplayFlow,
} from './space-denorm.helpers';
import {
  fetchEntityBySlugFlow,
  wireReconnectRefresh,
} from './space-store.helpers';
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
  buildSupabaseSelectFromRxDBSchema,
  findDocumentById,
  findDocumentDataById,
  mapSupabaseToRxDBDoc,
} from '../utils/rxdb-document.helpers';
import type { RxDBSelectorLike } from '../utils/filter-builder';
import * as CC from '../utils/child-collection-registry';
import { generateSchemaForEntity as buildSchema } from '../utils/schema-builder';
import { rebuildTimelineOnDateChange } from '../utils/timeline-builder';
import { generateSlug } from '../utils/slug-generator';
import { buildEntityPayload, buildChildPayload, getOnConflict } from '../utils/sync-queue.helpers';
import { syncQueueService } from '../services/sync-queue.service';
import { checkSchemaVersion } from '../utils/schema-version-check';
import type { BusinessEntity } from '../types/business-entity.types';

type StoreCollection<TRecord extends Record<string, unknown> = BusinessEntity> =
  RxCollection<TRecord>;

type SpaceDatabase = AppDatabase & {
  collections: AppDatabase['collections'] & Record<string, StoreCollection>;
};

type EntityStoreWithCollection<T extends BusinessEntity> = EntityStore<T> & {
  collection?: StoreCollection<T>;
};

type SupabaseSelectClient<TRecord extends Record<string, unknown>> = {
  from(sourceName: string): {
    select(columns: string): SupabaseExecutableQuery<TRecord>;
  };
};

function getSupabaseSelectClient<
  TRecord extends Record<string, unknown>,
>(): SupabaseSelectClient<TRecord> {
  return supabase as unknown as SupabaseSelectClient<TRecord>;
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
 * This store dynamically creates and manages entity stores for every business entity type
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
  public db: SpaceDatabase | null = null;
  
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
  private childCollections = new Map<string, StoreCollection<ChildCacheRecord>>();

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
      this.db = await getDatabase() as unknown as SpaceDatabase;

      // Initialize sync queue service (V3 push)
      await syncQueueService.initialize(this.db);

      // Reconnect pull: refresh active entity stores when coming back online
      wireReconnectRefresh({
        syncQueueService,
        entityStores: this.entityStores,
        hasActiveData: (_entityType, store) => store.entityList.value.length > 0,
        refreshEntity: (entityType) => {
          this.applyFilters(entityType, {});
        },
      });

      // Create collections for all found entity types
      for (const entityType of this.availableEntityTypes.value) {
        await this.ensureCollection(entityType);
      }

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

  /** Case-insensitive lookup in spaceConfigs map */
  private resolveSpaceConfig(entityType: string): SpaceConfig | undefined {
    return resolveSpaceConfig(this.spaceConfigs, entityType);
  }

  /** Space config for entity type (title, permissions, UI config). */
  getSpaceConfig(entityType: string): any | null {
    const spaceConfig = this.resolveSpaceConfig(entityType);

    if (!spaceConfig) {
      console.warn(`[SpaceStore] No space config found for entity: ${entityType}`);
      return null;
    }

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

  /** Default view slug from space config (view with isDefault: true, or first view). */
  getDefaultView(entityType: string): string {
    return getDefaultViewFromConfig(this.resolveSpaceConfig(entityType), entityType);
  }

  /** Sort options from space.sort_fields (shared across views). viewType kept for backward compat. */
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
   * Filter fields from space.filter_fields, excluding mainFilterField entries
   * (those belong to search bar, not the filter modal).
   */
  getFilterFields(entityType: string, viewType?: string): SpaceFilterField[] {
    return getFilterFieldsFromConfig(this.resolveSpaceConfig(entityType), entityType);
  }

  /** Main filter field for the search bar (excluded from filter modal). */
  getMainFilterField(entityType: string): SpaceMainFilterField | null {
    return getMainFilterFieldFromConfig(this.resolveSpaceConfig(entityType));
  }

  /**
   * All main filter fields (when multiple mainFilterField: true entries exist,
   * e.g. litter: father_name + mother_name) — searched with OR logic.
   */
  getMainFilterFields(entityType: string): SpaceMainFilterFieldsResult {
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
      // This happens BEFORE async operations (config wait, collection creation, replication)
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
    } catch (error: unknown) {
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
    let collection = this.db.collections[entityType] as unknown as
      | StoreCollection<T>
      | undefined;

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
      (entityStore as EntityStoreWithCollection<T>).collection = collection;
      
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
      const slug = generateSlug(data.name || '', id);

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
        buildEntityPayload(newEntity),
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

      const patchData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
        ...(userStore.currentUserId.value && { updated_by: userStore.currentUserId.value }),
      };

      // If date_of_birth or date_of_death changed, rebuild timeline locally
      if ('date_of_birth' in updates || 'date_of_death' in updates) {
        const currentData = doc.toJSON() as Record<string, unknown>;
        const currentTimeline = Array.isArray(currentData.timeline)
          ? currentData.timeline as Parameters<typeof rebuildTimelineOnDateChange>[0]
          : [];
        const dateOfBirth =
          typeof patchData.date_of_birth === 'string' || patchData.date_of_birth === null
            ? patchData.date_of_birth
            : currentData.date_of_birth;
        const dateOfDeath =
          typeof patchData.date_of_death === 'string' || patchData.date_of_death === null
            ? patchData.date_of_death
            : currentData.date_of_death;
        patchData['timeline'] = rebuildTimelineOnDateChange(
          currentTimeline,
          typeof dateOfBirth === 'string' || dateOfBirth === null ? dateOfBirth : undefined,
          typeof dateOfDeath === 'string' || dateOfDeath === null ? dateOfDeath : undefined,
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
  
  /** Reactive space config as a computed signal. */
  getSpaceConfigSignal(entityType: string): ReadonlySignal<UiSpaceConfig | null> {
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
      ['pet_child', 'parent_id', 'Children'],
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
    const rawChecks = this.dependencyMap[entityType];
    if (!rawChecks || rawChecks.length === 0) {
      return { canDelete: true, dependencies: [] };
    }

    const dependencies = await probeDependentRecords({
      entityType,
      id,
      checks: rawChecks.map(([table, fkColumn, label]) => ({
        table,
        fkColumn,
        label,
      })),
      childCollections: this.db?.collections,
      mappingCache: this.mappingCache,
      supabase,
    });

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
    collection: StoreCollection<T>;
  } | null> {
    const entityStore = await this.getEntityStore<T>(entityType);

    if (!entityStore) {
      console.error(`[SpaceStore] Entity store for ${entityType} not available`);
      return null;
    }

    const collection = (entityStore as EntityStoreWithCollection<T>).collection;

    if (!collection) {
      console.error(`[SpaceStore] Collection for ${entityType} not available`);
      return null;
    }

    return { entityStore, collection };
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
    filters: FilterMap,
    options?: {
      limit?: number;
      cursor?: string | null;  // ✅ Cursor for IDs query (keyset pagination)
      orderBy?: OrderBy;  // ✅ Use OrderBy interface with tieBreaker support
      fieldConfigs?: FilterFieldConfigMap;
    }
  ): Promise<HydrateFilteredEntitiesResult<BusinessEntity>> {
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
    const offlineFlowBase = {
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
      countByCollection: async (selector: RxDBSelectorLike) => {
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
    };

    // 📴 PREVENTIVE OFFLINE CHECK: Skip Supabase if browser is offline
    if (isOffline()) {
      return await executeOfflineFilterFlow(offlineFlowBase) as unknown as
        HydrateFilteredEntitiesResult<BusinessEntity>;
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
      const nextCursor = buildCompositeNextCursor({ lastRecord, orderBy });

      // 💾 PHASE 2: Check RxDB cache for these IDs
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
      return await executeOfflineFilterFlow({
        ...offlineFlowBase,
        logPrefix: 'Offline mode',
        catchLogPrefix: 'Offline fallback also failed:',
        countSelectorExtraOptions: { preferStringSearchOperator: true },
      }) as unknown as HydrateFilteredEntitiesResult<BusinessEntity>;
    }
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
    filters: FilterMap,
    fieldConfigs: FilterFieldConfigMap,
    limit: number,
    cursor: string | null,
    orderBy: OrderBy
  ): Promise<HydratableEntityRecord[]> {
    console.log(`[SpaceStore] 🆔 Fetching IDs for ${entityType}...`);
    const sourceName = getSupabaseSource(entityType);

    // Use hybrid search if: (1) has search filter, (2) no cursor (first page)
    const hybridSearchPlan =
      cursor === null
        ? buildHybridSearchPlan(filters, fieldConfigs, limit)
        : null;
    if (hybridSearchPlan) {
      return await executeHybridSearch({
        supabase,
        sourceName,
        hybridSearchPlan,
        fieldConfigs,
        limit,
        orderBy,
      }) as HydratableEntityRecord[];
    }
    return await executeRegularIdFetch({
      supabase,
      sourceName,
      filters,
      fieldConfigs,
      limit,
      cursor,
      orderBy,
    }) as HydratableEntityRecord[];
  }

  /** 🌐 Phase 3: fetch full records for ids not cached in RxDB. */
  private async fetchRecordsByIDs(
    entityType: string,
    ids: string[]
  ): Promise<BusinessEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    // Use VIEW source if configured (e.g., litter_with_parents for litter)
    const sourceName = getSupabaseSource(entityType);
    const selectFields = buildSupabaseSelectFromRxDBSchema(
      this.db?.collections[entityType]?.schema?.jsonSchema,
    );
    console.log(`[SpaceStore] 🌐 Fetching ${ids.length} full records by IDs from ${sourceName}...`);

    const { data, error } = await supabase
      .from(sourceName)
      .select(selectFields)
      .in('id', ids);

    if (error) {
      console.error('[SpaceStore] ❌ Records fetch error:', error);
      throw error;
    }

    console.log(`[SpaceStore] ✅ Fetched ${data?.length || 0} full records (~${Math.round((data?.length || 0) * 1)}KB)`);

    return (data || []) as unknown as BusinessEntity[];
  }

  /**
   * 🌐 Fetch full records by ID with optional partition pruning
   */
  private async fetchRecordsByPartitionRefs(
    entityType: string,
    refs: PartitionedEntityRef[],
    partitionField?: string,
  ): Promise<BusinessEntity[]> {
    const normalizedRefs = normalizePartitionedEntityRefs(refs);
    if (normalizedRefs.length === 0) {
      return [];
    }

    const sourceName = getSupabaseSource(entityType);
    const selectFields = buildSupabaseSelectFromRxDBSchema(
      this.db?.collections[entityType]?.schema?.jsonSchema,
    );

    if (!partitionField) {
      const { data, error } = await supabase
        .from(sourceName)
        .select(selectFields)
        .in('id', normalizedRefs.map((ref) => ref.id))
        .or('deleted.is.null,deleted.eq.false');

      if (error) {
        console.error('[SpaceStore] ❌ Partition ref fetch error:', error);
        throw error;
      }

      return (data || []) as unknown as BusinessEntity[];
    }

    const { partitionedIds, unpartitionedIds } =
      groupPartitionedEntityRefs(normalizedRefs);
    const results: BusinessEntity[] = [];

    if (unpartitionedIds.length > 0) {
      const { data, error } = await supabase
        .from(sourceName)
        .select(selectFields)
        .in('id', unpartitionedIds)
        .or('deleted.is.null,deleted.eq.false');

      if (error) {
        console.error('[SpaceStore] ❌ Unpartitioned ref fetch error:', error);
        throw error;
      }

      if (data) {
        results.push(...data as unknown as BusinessEntity[]);
      }
    }

    for (const [partitionId, ids] of partitionedIds) {
      const { data, error } = await supabase
        .from(sourceName)
        .select(selectFields)
        .eq(partitionField, partitionId)
        .in('id', ids)
        .or('deleted.is.null,deleted.eq.false');

      if (error) {
        console.error('[SpaceStore] ❌ Partition-pruned ref fetch error:', error);
        throw error;
      }

      if (data) {
        results.push(...data as unknown as BusinessEntity[]);
      }
    }

    return results;
  }

  /** Map Supabase record to RxDB shape via the collection's jsonSchema. */
  public mapToRxDBFormat(
    supabaseDoc: Record<string, unknown>,
    entityType: string,
  ): Record<string, unknown> {
    const collection = this.db?.collections[entityType];
    if (!collection) {
      console.warn(`[SpaceStore] Collection ${entityType} not found for mapping`);
      return supabaseDoc;
    }

    return mapSupabaseToRxDBDoc(
      supabaseDoc,
      collection.schema.jsonSchema,
    ) as Record<string, unknown>;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Entity Selection (proxy to EntityStore)
  // ─────────────────────────────────────────────────────────────────────────────

  getSelectedId(entityType: string): string | null {
    const entityStore = this.entityStores.get(entityType.toLowerCase());
    if (!entityStore) {
      console.warn(`[SpaceStore] No entity store found for ${entityType}`);
      return null;
    }
    return entityStore.getSelectedId();
  }

  /** Selected entity ID as reactive signal for React re-renders. */
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

  /** Select entity by ID; lazy-loads from RxDB if not in memory. */
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

  /** Load entity from RxDB and add to entityStore (for selection outside paginated list). */
  private async loadEntityFromRxDB(
    entityType: string,
    id: string,
    entityStore: EntityStore<BusinessEntity>,
  ): Promise<void> {
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
      const entity = await this.findCachedEntityById<BusinessEntity>(entityType, id);
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
   * Fetch entity by ID from Supabase and add to store if absent. Used on direct
   * navigation via pretty URL (e.g. /akita) where the entity may not be in the
   * paginated list. partitionField is the fallback override when entitySchemas
   * isn't ready yet.
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
   * Fetch entity by slug — fast local-first lookup. Unlike fetchAndSelectEntity
   * this doesn't wait for config/store init: RxDB direct → Supabase fallback.
   */
  async fetchEntityBySlug<T = any>(entityType: string, slug: string): Promise<T | null> {
    return fetchEntityBySlugFlow<T>({
      supabase,
      entityType,
      slug,
      loadCachedBySlug: (eType, entitySlug) =>
        this.findCachedEntityBySlug<T>(eType, entitySlug),
      loadEntityById: (eType, id, partitionId, partitionField) =>
        this.fetchEntityById<T & BusinessEntity>(
          eType,
          id,
          partitionId,
          partitionField,
        ),
      cacheEntity: (eType, data) => this.cacheFetchedEntity(eType, data),
    });
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
      const selectFields = buildSupabaseSelectFromRxDBSchema(
        this.db?.collections[entityType]?.schema?.jsonSchema,
      );
      const { data, error } = await supabase
        .from(entityType)
        .select(selectFields)
        .eq('id', id)
        .or('deleted.is.null,deleted.eq.false')
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      await this.cacheFetchedEntity(
        entityType,
        data as unknown as Record<string, unknown>,
      );

      return data as unknown as T;
    } catch (err) {
      console.error(`[SpaceStore] Error fetching by id from Supabase:`, err);
      return null;
    }
  }

  private async findCachedEntityBySlug<T = unknown>(
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

  private async findCachedEntityById<T = unknown>(
    entityType: string,
    id: string,
  ): Promise<T | null> {
    const collection = this.db?.collections[entityType.toLowerCase()];
    if (!collection) {
      return null;
    }

    try {
      return await findDocumentDataById<T>(
        collection as unknown as RxCollection<T>,
        id,
      );
    } catch (err) {
      console.warn(`[SpaceStore] Error querying RxDB by id:`, err);
      return null;
    }
  }

  private async cacheFetchedEntity(
    entityType: string,
    data: Record<string, unknown>,
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

    return loadPartitionedEntitiesByRefs<T, Record<string, unknown>>({
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
  getSelectedEntity(entityType: string): ReadonlySignal<BusinessEntity | null> {
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
   * Lazy-create child collection for entity type (reuses if already in
   * this.childCollections or this.db.collections). Uses pre-defined child
   * schemas (breed_children, pet_children, kennel_children).
   */
  async ensureChildCollection(
    entityType: string,
  ): Promise<StoreCollection<ChildCacheRecord> | null> {
    const collectionName = getChildCollectionName(entityType);
    const existingCollection = getExistingChildCollection(entityType, {
      childCollections: this.childCollections,
      dbCollections: this.db?.collections as
        | Record<string, StoreCollection<ChildCacheRecord>>
        | undefined,
    });
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

      const collection = collections[collectionName] as StoreCollection<ChildCacheRecord>;
      this.childCollections.set(collectionName, collection);

      return collection;
    } catch (error) {
      console.error(`[SpaceStore] Failed to create child collection ${collectionName}:`, error);
      return null;
    }
  }
  /** Load child records from Supabase for a specific parent entity. */
  async loadChildRecords(
    parentId: string,
    tableType: string,
    options: {
      limit?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
      parentField?: string;
      select?: string[];
    } = {}
  ): Promise<ChildCacheRecord[]> {
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
    const selectFields = buildChildSelectClause({
      select: options.select,
      parentField: parentIdField,
      partitionField: partitionConfig?.childFilterField,
      orderingFields: options.orderBy ? [options.orderBy] : undefined,
    });

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
          getSupabaseSelectClient<ChildSourceRow>()
            .from(tableType)
            .select(selectFields),
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

        const response = await query;
        return {
          data: response.data ?? null,
          error: response.error ?? null,
        };
      },
    });
  }

  /**
   * Load child records for many parents in one shot. Replaces the
   * `Promise.all(parentIds.map(loadChildRecords))` pattern: one RxDB selector
   * with `parentId IN (...)`, one Supabase fallback per partition group, and
   * at most one staleness-driven background refresh per partition. The
   * matrix needs this — the per-pet fan-out triggered N independent
   * background refreshes for the same table.
   */
  async loadChildRecordsForParents(
    entityType: string,
    tableType: string,
    parentIds: string[],
    options: {
      limit?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
      parentField?: string;
      select?: string[];
    } = {},
  ): Promise<ChildCacheRecord[]> {
    if (!entityType || !tableType || parentIds.length === 0) return [];

    const collection = await this.ensureChildCollection(entityType);
    if (!collection) return [];

    const normalizedType = normalizeChildTableType(tableType);
    const parentIdField = options.parentField || `${entityType}_id`;
    const partitionConfig = this.entitySchemas.get(entityType)?.partition;
    const partitionField = partitionConfig?.childFilterField;

    // Resolve partition value for every parent in parallel (cache-only, fast).
    const partitionByParent = new Map<string, string | undefined>();
    if (partitionConfig) {
      await Promise.all(
        parentIds.map(async (parentId) => {
          const { partitionValue } = await resolveChildPartitionContext({
            ...this.partitionContextDeps,
            entityType,
            parentId,
            warnIfMissing: false,
            logResolved: false,
          });
          partitionByParent.set(parentId, partitionValue);
        }),
      );
    }

    // Single RxDB query for the whole batch.
    const findResult = await collection
      .find({
        selector: {
          parentId: { $in: parentIds },
          tableType: normalizedType,
        },
      })
      .exec();
    const cached = findResult.map((doc) => doc.toJSON()) as ChildCacheRecord[];

    const haveByParent = new Set(cached.map((r) => r.parentId).filter(Boolean) as string[]);
    const missingParentIds = parentIds.filter((id) => !haveByParent.has(id));

    // Cache miss → group missing parents by partition value, one Supabase
    // `IN (...)` per partition group.
    if (missingParentIds.length > 0) {
      const groupsByPartition = new Map<string | undefined, string[]>();
      for (const parentId of missingParentIds) {
        const partitionValue = partitionByParent.get(parentId);
        const group = groupsByPartition.get(partitionValue) ?? [];
        group.push(parentId);
        groupsByPartition.set(partitionValue, group);
      }

      const { limit = 50, orderBy, orderDirection = 'asc' } = options;
      const selectFields = buildChildSelectClause({
        select: options.select,
        parentField: parentIdField,
        partitionField,
        orderingFields: orderBy ? [orderBy] : undefined,
      });

      for (const [partitionValue, ids] of groupsByPartition) {
        try {
          let query = supabase
            .from(normalizedType)
            .select(selectFields)
            .in(parentIdField, ids)
            // Per-parent limit guard isn't enforceable in a single query;
            // multiply by ids.length so a hot batch doesn't truncate.
            .limit(limit * ids.length);
          if (partitionField && partitionValue) {
            query = query.eq(partitionField, partitionValue);
          }
          if (orderBy) {
            query = query.order(orderBy, {
              ascending: orderDirection === 'asc',
              nullsFirst: false,
            });
          }
          const { data, error } = await query;
          if (error || !data || data.length === 0) continue;
          const rows = data as unknown as ChildSourceRow[];

          // Hydrate per-parent so `mapChildRowsToCacheRecords` keeps its
          // single-parent assumption (`parentId` constant per call).
          for (const parentId of ids) {
            const parentRows = rows.filter(
              (row) => (row as Record<string, unknown>)[parentIdField] === parentId,
            );
            if (parentRows.length === 0) continue;
            const hydrated = await mapAndCacheChildRows(parentRows, {
              tableType: normalizedType,
              parentId,
              parentField: parentIdField,
              partitionField,
              partitionValue,
              collection,
            });
            cached.push(...(hydrated.transformedRecords as ChildCacheRecord[]));
          }
        } catch (err) {
          console.error(
            '[SpaceStore] loadChildRecordsForParents fetch error:',
            err,
          );
        }
      }
    }

    // Single staleness-driven background refresh per partition group, mirroring
    // loadChildRecords' per-parent behaviour but batched.
    if (cached.length > 0) {
      const CHILD_STALE_MS = 5 * 60 * 1000;
      if (hasStaleChildRecords(cached, CHILD_STALE_MS)) {
        const staleByPartition = new Map<string | undefined, string[]>();
        for (const id of parentIds) {
          const partitionValue = partitionByParent.get(id);
          const group = staleByPartition.get(partitionValue) ?? [];
          group.push(id);
          staleByPartition.set(partitionValue, group);
        }
        for (const [partitionValue, ids] of staleByPartition) {
          void this.refreshChildRecordsBatchInBackground(
            entityType,
            normalizedType,
            ids,
            parentIdField,
            options,
            partitionConfig,
            partitionValue,
          );
        }
      }
    }

    return cached;
  }

  /** Background refresh for many parents in a single Supabase IN query. */
  private async refreshChildRecordsBatchInBackground(
    entityType: string,
    tableType: string,
    parentIds: string[],
    parentIdField: string,
    options: {
      limit?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
      select?: string[];
    },
    partitionConfig: PartitionConfig | undefined,
    partitionValue: string | undefined,
  ): Promise<void> {
    if (parentIds.length === 0) return;
    try {
      const { limit = 50, orderBy, orderDirection = 'asc' } = options;
      const partitionField = partitionConfig?.childFilterField;
      const selectFields = buildChildSelectClause({
        select: options.select,
        parentField: parentIdField,
        partitionField,
        orderingFields: orderBy ? [orderBy] : undefined,
      });
      let query = supabase
        .from(tableType)
        .select(selectFields)
        .in(parentIdField, parentIds)
        .limit(limit * parentIds.length);
      if (partitionField && partitionValue) {
        query = query.eq(partitionField, partitionValue);
      }
      if (orderBy) {
        query = query.order(orderBy, {
          ascending: orderDirection === 'asc',
          nullsFirst: false,
        });
      }
      const { data, error } = await query;
      if (error || !data || data.length === 0) return;
      const rows = data as unknown as ChildSourceRow[];

      const collection = await this.ensureChildCollection(entityType);
      if (!collection) return;

      for (const parentId of parentIds) {
        const parentRows = rows.filter(
          (row) => (row as Record<string, unknown>)[parentIdField] === parentId,
        );
        if (parentRows.length === 0) continue;
        await mapAndCacheChildRows(parentRows, {
          tableType,
          parentId,
          parentField: parentIdField,
          partitionField,
          partitionValue,
          collection,
        });
        // Fire one signal per parent so subscribed UIs (matrix, useTabData)
        // refetch only their own data.
        this.childRefreshSignal.value = {
          tableType: normalizeChildTableType(tableType),
          parentId,
        };
      }
    } catch {
      // Silent background refresh.
    }
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
  private mappingCache = new Map<string, MappingRow[]>();

  /** Clear mapping ID cache — call after entity_child create/delete to force re-fetch */
  invalidateMappingCache(): void {
    this.mappingCache.clear();
  }

  /** Optimistically add a record to mapping cache (before server trigger creates it) */
  addToMappingCache(
    mappingTable: string,
    parentField: string,
    parentId: string,
    record: MappingRow,
  ): void {
    const cacheKey = buildMappingCacheKey(mappingTable, parentField, parentId);
    const existing = this.mappingCache.get(cacheKey) || [];
    if (!existing.some((r) => r.id === record.id)) {
      this.mappingCache.set(cacheKey, [...existing, record]);
    }
  }

  /** Remove a specific record from mapping cache (after entity_child delete) */
  removeFromMappingCache(recordId: string): void {
    for (const [key, entries] of this.mappingCache) {
      const filtered = entries.filter((r) => r.id !== recordId);
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
    entityIdField: string,
    entityPartitionField?: string,
    offlineScanPredicate?: (record: BusinessEntity) => boolean,
  ): Promise<BusinessEntity[]> {
    await this.ensureCollection(entityTable);
    const collection = this.db?.collections[entityTable];
    const cacheKey = buildMappingCacheKey(mappingTable, parentField, parentId);
    const STALE_MS = 5 * 60 * 1000;
    const selectFields = buildSupabaseSelectFromRxDBSchema(
      collection?.schema?.jsonSchema,
    );
    // Entity partition column mirrors the mapping-row partition column
    // (e.g., pet_in_litter.pet_breed_id → pet.breed_id). Mapping convention is
    // `{entity}_{partition}_id`; strip the `{entity}_` prefix to get the entity column.
    const entityPrefix = `${entityTable}_`;
    const entityPartitionColumn =
      entityPartitionField?.startsWith(entityPrefix)
        ? entityPartitionField.slice(entityPrefix.length)
        : entityPartitionField;

    return loadEntitiesViaMappingFlow<BusinessEntity, Record<string, unknown>>({
      entityTable,
      mappingTable,
      parentField,
      parentId,
      entityIdField,
      entityPartitionField,
      cacheKey,
      staleMs: STALE_MS,
      mappingCache: this.mappingCache,
      collection,
      isOffline: isOffline(),
      loadMappingRows: async () => {
        const mappingSelect = getMappingSelectFields(entityIdField, entityPartitionField);
        const { data } = await supabase
          .from(mappingTable)
          .select(mappingSelect)
          .eq(parentField, parentId);
        return data as MappingRow[] | null | undefined;
      },
      fetchRecords: (rows) =>
        fetchRecordsByMappingRows(rows, {
          entityIdField,
          entityPartitionField,
          fetchAll: async (ids) => {
            const { data } = await supabase
              .from(entityTable)
              .select(selectFields)
              .in('id', ids);
            return (data || []) as unknown as BusinessEntity[];
          },
          fetchPartition: async (partitionValue, ids) => {
            const { data } = await supabase.from(entityTable)
              .select(selectFields)
              .eq(entityPartitionColumn!, partitionValue)
              .in('id', ids);
            return (data || []) as unknown as BusinessEntity[];
          },
        }),
      mapRecordForCache: (record) => this.mapToRxDBFormat(record, entityTable),
      offlineScanPredicate: offlineScanPredicate ?? (() => false),
    });
  }

  /** Background refresh for stale child records — fetches fresh data without blocking UI */
  private async refreshChildRecordsInBackground(
    entityType: string,
    tableType: string,
    parentId: string,
    parentIdField: string,
    options: {
      limit?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
      select?: string[];
    },
    partitionConfig: PartitionConfig | undefined,
    partitionValue: string | undefined
  ): Promise<void> {
    try {
      const { limit = 50, orderBy, orderDirection = 'asc' } = options;
      const selectFields = buildChildSelectClause({
        select: options.select,
        parentField: parentIdField,
        partitionField: partitionConfig?.childFilterField,
        orderingFields: orderBy ? [orderBy] : undefined,
      });
      const query = applyChildListQueryOptions(
        getSupabaseSelectClient<ChildSourceRow>()
          .from(tableType)
          .select(selectFields),
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

  /** Get child records from RxDB local cache. */
  async getChildRecords(
    parentId: string,
    tableType: string,
    options: { limit?: number; orderBy?: string; orderDirection?: 'asc' | 'desc'; partitionId?: string } = {}
  ): Promise<ChildCacheRecord[]> {
    if (!parentId || !tableType) {
      return [];
    }

    const entityType = CC.getEntityTypeFromTableType(tableType);
    if (!entityType) {
      return [];
    }

    const collection = getExistingChildCollection(entityType, {
      childCollections: this.childCollections,
      dbCollections: this.db?.collections as
        | Record<string, StoreCollection<ChildCacheRecord>>
        | undefined,
    });
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
    await rebuildPetTitlesDisplayFlow({
      petId,
      petBreedId,
      loadTitleInPetRecords: (id, breedId) =>
        this.getChildRecords(id, 'title_in_pet', { partitionId: breedId, limit: 0 }),
      lookupTitleDictionary: (titleId) =>
        dictionaryStore.getRecordById('title', titleId, {
          additionalFields: ['rating'],
        }),
      collection: this.db?.collections['pet'],
      entityStore: this.entityStores.get('pet'),
    });
  }

  /** Create a new child record (Supabase + RxDB). Returns created id. */
  async createChildRecord(
    entityType: string,
    tableType: string,
    parentId: string,
    data: Record<string, unknown>
  ): Promise<{ id: string }> {
    const id = crypto.randomUUID();

    // Sanitize data: ensure plain JSON (no Date objects, Proxy, etc.)
    const plainData = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;

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
      const rxdbRecord: ChildCacheRecord = {
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

  /** Update an existing child record (Supabase + RxDB). */
  async updateChildRecord(
    entityType: string,
    tableType: string,
    recordId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    // Sanitize data: ensure plain JSON (no Date objects, Proxy, etc.)
    const plainData = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
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
        const updatedDoc = patchedDoc.toJSON() as ChildCacheRecord;
        await syncQueueService.enqueueChild(
          entityType, normalizedType, recordId, 'upsert',
          buildChildPayload(updatedDoc, entityType, partitionConfig),
          'id'
        );

        // Local rebuild of denormalized parent fields (mirrors server triggers)
        await this.rebuildParentDenormFields(
          entityType,
          normalizedType,
          updatedDoc.parentId!,
          updatedDoc.partitionId,
        );

        // Flush sync queue + refresh to pick up server-side trigger side-effects
        queueChildMutationRefresh(
          () => syncQueueService.processNow(),
          this.forceRefreshChildRecords.bind(this),
          entityType,
          normalizedType,
          updatedDoc.parentId!,
        );
      }
    }
  }

  /** Delete a child record (Supabase + RxDB). */
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
        const docData = doc.toJSON() as ChildCacheRecord;
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
          docData.parentId!,
          docData.partitionId,
        );
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Child Tables: ID-First Loading (same pattern as main entities)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Load child records with ID-First architecture (mirrors applyFilters):
   * fetch IDs from Supabase → check RxDB cache → fetch missing → merge
   * cached + fresh preserving order.
   */
  async applyChildFilters(
    parentId: string,
    tableType: string,
    filters: FilterMap = {},
    options: {
      limit?: number;
      cursor?: string | null;
      orderBy?: OrderBy;
      select?: string[];
    } = {}
  ): Promise<ChildPageResult<ChildCacheRecord>> {
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

    const tryLocalChildPage = async (errorLabel: string) => {
      try {
        return await this.loadLocalChildPage(parentId, tableType, filters, limit, cursor, orderBy);
      } catch (err) {
        console.error(`[SpaceStore] ${errorLabel}:`, err);
        return createEmptyChildPageResult();
      }
    };

    // 📴 PREVENTIVE OFFLINE CHECK
    if (isOffline()) {
      console.log('[SpaceStore] 📴 Offline mode for child records');
      return tryLocalChildPage('Offline child loading failed');
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
      const nextCursor = buildCompositeNextCursor({
        lastRecord,
        orderBy,
        hasMorePages: idsData.length >= limit,
      });

      // 💾 PHASE 2: Check RxDB cache
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
          orderBy,
          options.select,
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
      return tryLocalChildPage('Offline fallback failed');
    }
  }

  /**
   * 🆔 ID-First Phase 1: Fetch child IDs + ordering field from Supabase
   */
  private async fetchChildIDsFromSupabase(
    parentId: string,
    tableType: string,
    parentIdField: string,
    filters: FilterMap,
    limit: number,
    cursor: string | null,
    orderBy: OrderBy,
    partitionField?: string,
    partitionValue?: string
  ): Promise<HydratableEntityRecord[]> {
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

    return (data || []) as unknown as HydratableEntityRecord[];
  }

  /**
   * 🌐 ID-First Phase 3: Fetch full child records by IDs
   */
  private async fetchChildRecordsByIDs(
    tableType: string,
    ids: string[],
    parentId: string,
    parentIdField: string,
    orderBy?: OrderBy,
    select?: string[],
    partitionField?: string,
    partitionValue?: string
  ): Promise<ChildCacheRecord[]> {
    if (ids.length === 0) return [];

    const selectFields = buildChildSelectClause({
      select,
      parentField: parentIdField,
      partitionField,
      orderingFields: orderBy
        ? [orderBy.field, orderBy.tieBreaker?.field || 'id']
        : undefined,
    });

    const { data, error } = await supabase
      .from(tableType)
      .select(selectFields)
      .in('id', ids);

    if (error) {
      console.error('[SpaceStore] Fetch child records by IDs error:', error);
      throw error;
    }

    if (!data) return [];

    const hydrationResult = await mapAndCacheChildRows(
      data as unknown as Array<Record<string, unknown> & { id: string }>,
      {
        tableType,
        parentId,
        parentField: parentIdField,
        partitionField,
        partitionValue,
      },
    );

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
      select?: string[];
    } = {}
  ): Promise<LoadChildViewPageResult<ChildSourceRow | ChildCacheRecord>> {
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
    const selectFields = buildChildSelectClause({
      select: options.select,
      parentField,
      partitionField: partitionConfig?.childFilterField,
      orderingFields: [
        orderBy.field,
        ...(orderBy.tieBreaker?.field ? [orderBy.tieBreaker.field] : []),
      ],
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
            .select(selectFields)
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

          const response = await query;
          return response as unknown as {
            data: Array<Record<string, unknown> & { id: string }> | null;
            error: unknown;
          };
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
    filters: FilterMap,
    limit: number,
    cursor: string | null,
    orderBy: OrderBy,
  ): Promise<ChildPageResult<ChildCacheRecord>> {
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
    const collections: Array<{ collection: StoreCollection; name: string }> = [];

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

  /** Set drawer fullscreen (pretty-URL open or expand button). */
  setFullscreen(value: boolean): void {
    this.isFullscreen.value = value;
    // Always reset tab fullscreen — only setTabFullscreen() should set it.
    // This ensures returning from tab→page fullscreen clears the flag.
    this.isTabFullscreen.value = false;
  }

  /** Set tab-level fullscreen — enables infinite scroll (page fullscreen keeps limits). */
  setTabFullscreen(value: boolean): void {
    this.isTabFullscreen.value = value;
    if (value) this.isFullscreen.value = true;
  }

  /** Clear drawer fullscreen (on close / navigate away). */
  clearFullscreen(): void {
    this.isFullscreen.value = false;
    this.isTabFullscreen.value = false;
  }

  // ==========================================
  // Tab Loaded Counts (for fullscreen filtering)
  // ==========================================

  private readonly TAB_COUNTS_STORAGE_KEY = 'breedhub_tab_loaded_counts';

  /** Set tab loaded count + persist to sessionStorage for cross-navigation access. */
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

  /** Get tab loaded count (lazy-loads from sessionStorage). */
  getTabLoadedCount(entityId: string, tabId: string): number | undefined {
    // Lazy load from storage if empty
    if (Object.keys(this.tabLoadedCountsMap.value).length === 0) {
      this.loadTabLoadedCountsFromStorage();
    }
    return this.tabLoadedCountsMap.value[entityId]?.[tabId];
  }

  /** Get all tab loaded counts for an entity (lazy-loads from sessionStorage). */
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
