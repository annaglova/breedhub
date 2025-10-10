// Base Store Classes
export { EntityStore } from './stores/base';
export type { EntityStoreInstance } from './stores/base';

// Services
export { databaseService } from './services/database.service';
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

// Database types
export type { DatabaseCollections, AppDatabase } from './services/database.service';

// App Config Store
export { appConfigStore } from './stores/app-config.signal-store';
export type { AppConfig, AppConfigDocument, AppConfigCollection } from './stores/app-config.signal-store';

// App Store
export { appStore } from './stores/app-store.signal-store';

// Space Store - Universal dynamic store for all business entities
export { spaceStore } from './stores/space-store.signal-store';

// Dictionary Store - Universal cache for dictionary tables
export { dictionaryStore } from './stores/dictionary-store.signal-store';
export type { DictionaryCollection } from './stores/dictionary-store.signal-store';
export type { DictionaryDocument } from './collections/dictionaries.schema';

// Mixin Engine
export { mixinEngine, MixinEngineService } from './services/mixin-engine.service';

// Supabase utilities
export { supabase, checkSupabaseConnection } from './supabase/client';