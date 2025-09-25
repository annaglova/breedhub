// Base Store Classes
export { EntityStore } from './stores/base';
export type { EntityStoreInstance } from './stores/base';

// Services
export { databaseService } from './services/database.service';
export { SupabaseReplicationService } from './services/supabase-replication.service';

// Hooks
export { useBreeds } from './hooks/useBreeds';
export { useReplicationState, SyncStatusIndicator } from './hooks/useReplicationState';
export { 
  useRxData, 
  useRxDB, 
  useRxDocument, 
  useRxCollection,
  useOfflineQueue
} from './hooks/useRxCollection';

// Components
export { BreedsList } from './components/BreedsList';
export { BreedDetail } from './components/BreedDetail';

// Types
export type {
  BreedDocType,
  BreedDocument,
  BreedCollection,
  BreedDocMethods,
  BreedCollectionMethods,
  BreedCollectionTyped
} from './types/breed.types';

// Schemas
export { breedSchema, breedMigrationStrategies } from './collections/breeds.schema';

// Database types
export type { DatabaseCollections, AppDatabase } from './services/database.service';

// App Config Store
export { appConfigStore } from './stores/app-config.signal-store';
export type { AppConfig, AppConfigDocument, AppConfigCollection } from './stores/app-config.signal-store';

// App Store
export { appStore } from './stores/app-store.signal-store';

// Space Store - Universal dynamic store for all business entities
export { spaceStore } from './stores/space-store.signal-store';

// Mixin Engine
export { mixinEngine, MixinEngineService } from './services/mixin-engine.service';