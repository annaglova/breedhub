/**
 * React SignalStore - Fractal State Management Architecture
 * Inspired by NgRx SignalStore with self-similar patterns
 */

// ============= Core Types =============

export type EntityId = string | number;

export interface Entity {
  id: EntityId;
}

export interface RequestStatus {
  status: 'idle' | 'pending' | 'fulfilled' | 'error';
  error?: Error | null;
  timestamp?: number;
}

export interface CollectionState<T extends Entity> {
  entities: Map<EntityId, T>;
  ids: EntityId[];
  selectedId: EntityId | null;
  selectedIds: Set<EntityId>;
  requestStatus: RequestStatus;
}

// ============= Store Features =============

export interface StoreFeature<TState = any, TMethods = any> {
  initialState: TState;
  computed?: Record<string, (state: TState) => any>;
  methods?: (state: TState, set: (fn: (state: TState) => TState) => void) => TMethods;
  hooks?: {
    onInit?: () => void;
    onDestroy?: () => void;
  };
}

// ============= Filtering =============

export interface FilterConfig<T = any> {
  field: keyof T;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between';
  value: any;
  active?: boolean;
}

export interface FilterState<T = any> {
  filters: FilterConfig<T>[];
  searchQuery: string;
  sortBy?: keyof T;
  sortOrder?: 'asc' | 'desc';
}

// ============= Super Store (Hierarchical) =============

export interface SuperStoreConfig<T extends Entity = Entity> {
  id: string;
  parentId?: string;
  entityName: string;
  selectId?: (entity: T) => EntityId;
  features?: StoreFeature[];
  children?: SuperStoreConfig[];
}

export interface SuperStore<T extends Entity = Entity> {
  id: string;
  parentId?: string;
  config: SuperStoreConfig<T>;
  state: CollectionState<T> & FilterState<T>;
  children: Map<string, SuperStore>;
  parent?: SuperStore;
}

// ============= IndexedDB Sync =============

export interface SyncConfig {
  dbName: string;
  storeName: string;
  version?: number;
  keyPath?: string;
  indexes?: Array<{
    name: string;
    keyPath: string | string[];
    options?: IDBIndexParameters;
  }>;
}

export interface SyncState {
  lastSyncTimestamp: number | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  pendingChanges: number;
  conflictResolution: 'local' | 'remote' | 'merge';
}

// ============= Store Factory =============

export interface StoreFactoryConfig<T extends Entity = Entity> {
  name: string;
  features?: StoreFeature[];
  syncConfig?: SyncConfig;
  superConfig?: SuperStoreConfig<T>;
}

// ============= Computed Properties =============

export type ComputedProperty<TState, TResult> = (state: TState) => TResult;

export interface ComputedProperties<TState> {
  [key: string]: ComputedProperty<TState, any>;
}

// ============= Store Methods =============

export interface CollectionMethods<T extends Entity> {
  // CRUD Operations
  addEntity(entity: T): void;
  addEntities(entities: T[]): void;
  updateEntity(id: EntityId, changes: Partial<T>): void;
  updateEntities(updates: Array<{ id: EntityId; changes: Partial<T> }>): void;
  removeEntity(id: EntityId): void;
  removeEntities(ids: EntityId[]): void;
  setAllEntities(entities: T[]): void;
  clearEntities(): void;
  
  // Selection
  selectEntity(id: EntityId): void;
  selectEntities(ids: EntityId[]): void;
  toggleEntitySelection(id: EntityId): void;
  clearSelection(): void;
  
  // Filtering
  setFilter(filter: FilterConfig<T>): void;
  removeFilter(field: keyof T): void;
  clearFilters(): void;
  setSearchQuery(query: string): void;
  setSortBy(field: keyof T, order?: 'asc' | 'desc'): void;
  
  // Request Status
  setRequestStatus(status: RequestStatus['status'], error?: Error): void;
  resetRequestStatus(): void;
}

// ============= Hook Types =============

export interface UseStoreResult<T extends Entity, TComputed = any> {
  state: CollectionState<T> & FilterState<T>;
  computed: TComputed;
  methods: CollectionMethods<T>;
  sync?: {
    state: SyncState;
    syncNow(): Promise<void>;
    resolveConflict(entityId: EntityId, resolution: 'local' | 'remote'): void;
  };
}

// ============= Event System =============

export type StoreEvent<T = any> = {
  type: string;
  payload?: T;
  timestamp: number;
  storeId: string;
};

export interface EventBus {
  emit<T>(event: StoreEvent<T>): void;
  on<T>(type: string, handler: (event: StoreEvent<T>) => void): () => void;
  off(type: string, handler: Function): void;
}

// ============= Middleware =============

export type Middleware<TState = any> = (
  state: TState,
  action: { type: string; payload?: any },
  next: () => void
) => void;

// ============= Selectors =============

export interface Selectors<T extends Entity> {
  selectAll: (state: CollectionState<T>) => T[];
  selectById: (state: CollectionState<T>, id: EntityId) => T | undefined;
  selectSelected: (state: CollectionState<T>) => T | undefined;
  selectSelectedMany: (state: CollectionState<T>) => T[];
  selectFiltered: (state: CollectionState<T> & FilterState<T>) => T[];
  selectCount: (state: CollectionState<T>) => number;
  selectIsLoading: (state: CollectionState<T>) => boolean;
  selectError: (state: CollectionState<T>) => Error | null | undefined;
}