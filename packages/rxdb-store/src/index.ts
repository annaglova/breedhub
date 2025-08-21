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

// Signal Hooks
export { useBreedsSignals, useBreedByIdSignal, useBreedsBySizeSignal } from './hooks/useBreedsSignals';

// Components
export { BreedsList } from './components/BreedsList';
export { BreedDetail } from './components/BreedDetail';
export { BreedsListWithSignals } from './components/BreedsListWithSignals';

// Signal Store
export { 
  breedsStore,
  breeds,
  breedsBySize,
  breedsCount,
  loading,
  error,
  collection,
  replicationState
} from './stores/breeds.signal-store';

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