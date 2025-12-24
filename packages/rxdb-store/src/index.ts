// Base Store Classes
export { EntityStore } from './stores/base';
export type { EntityStoreInstance } from './stores/base';

// Services
export { databaseService, getDatabase } from './services/database.service';
export { entityReplicationService, EntityReplicationService } from './services/entity-replication.service';

// Hooks
export { useReplicationState, SyncStatusIndicator } from './hooks/useReplicationState';
export {
  useRxData,
  useRxDB,
  useRxDocument,
  useRxCollection,
  useOfflineQueue
} from './hooks/useRxCollection';
export { useTabData } from './hooks/useTabData';
export { useInfiniteTabData } from './hooks/useInfiniteTabData';

// Database types
export type { DatabaseCollections, AppDatabase } from './services/database.service';

// App Config Store
export { appConfigStore } from './stores/app-config.signal-store';
export type { AppConfig, AppConfigDocument, AppConfigCollection } from './stores/app-config.signal-store';

// App Store
export { appStore } from './stores/app-store.signal-store';
export type { IconConfig } from './stores/app-store.signal-store';

// Space Store - Universal dynamic store for all business entities
export { spaceStore } from './stores/space-store.signal-store';

// Dictionary Store - Universal cache for dictionary tables
export { dictionaryStore } from './stores/dictionary-store.signal-store';
export type { DictionaryCollection } from './stores/dictionary-store.signal-store';
export type { DictionaryDocument } from './collections/dictionaries.schema';

// Route Store - URL slug resolution for fullscreen pages
export { routeStore } from './stores/route-store.signal-store';
export type { RouteCollection, ResolvedRoute } from './stores/route-store.signal-store';
export type { RouteDocument } from './collections/routes.schema';

// Loading Store - Global loading state management
export { loadingStore } from './stores/loading-store';

// Navigation History Store - Recent pages for quick navigation
export { navigationHistoryStore } from './stores/navigation-history.store';
export type { NavigationEntry } from './stores/navigation-history.store';

// Toast Store - Ephemeral toast notifications
export { toastStore, toast } from './stores/toast.store';
export type { Toast, ToastType, ToastOptions } from './stores/toast.store';

// Mixin Engine
export { mixinEngine, MixinEngineService } from './services/mixin-engine.service';

// Supabase utilities
export { supabase, checkSupabaseConnection } from './supabase/client';

// Tab Data Service - Universal tab data loading
export { tabDataService } from './services/tab-data.service';
export type {
  DataSourceConfig,
  DataSourceType,
  ChildTableConfig,
  DictionaryMergeConfig,
  MainEntityConfig,
  RpcConfig,
  OrderConfig,
  TabDataResult,
  UseTabDataOptions,
  MergedDictionaryItem,
  EnrichedChildItem,
  // Infinite scroll types
  PaginationOptions,
  PaginatedResult,
  InfiniteTabDataResult,
  UseInfiniteTabDataOptions,
} from './types/tab-data.types';

// Export OrderBy type from SpaceStore
export type { OrderBy } from './stores/space-store.signal-store';

// Utils - Field normalization helpers
export {
  removeFieldPrefix,
  addFieldPrefix,
  hasFieldPrefix,
  extractFieldName,
  normalizeToDbField,
  normalizeToConfigField
} from './utils';