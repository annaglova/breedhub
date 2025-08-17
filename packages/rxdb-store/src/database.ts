import { 
  createRxDatabase, 
  RxDatabase, 
  addRxPlugin,
  RxDatabaseCreator
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBCleanupPlugin } from 'rxdb/plugins/cleanup';
import { addRxPlugin as addPlugin } from 'rxdb';

// Schemas
import { 
  breedSchema, 
  breedMethods, 
  breedStatics,
  type Breed 
} from './schemas/breed.schema.js';

// Simple storage setup - disable dev mode for Phase 0
async function setupValidatorStorage() {
  console.log('🚀 Running in production mode for Phase 0 testing');
  return { storage: getRxStorageDexie(), devMode: false };
}

// Add useful plugins
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBCleanupPlugin);

// Database collections type
export interface BreedHubCollections {
  breeds: any; // Will be properly typed after createRxDatabase
}

export type BreedHubDatabase = RxDatabase<BreedHubCollections>;

let dbInstance: BreedHubDatabase | null = null;

export async function createBreedHubDB(
  name: string = 'breedhub',
  options?: Partial<RxDatabaseCreator>
): Promise<BreedHubDatabase> {
  
  // Return existing instance if available
  if (dbInstance) {
    return dbInstance;
  }

  console.log('🗄️ Creating BreedHub database...');

  // Setup validator storage for dev mode
  const { storage, devMode } = await setupValidatorStorage();
  
  if (devMode) {
    console.log('🔧 Running in dev mode with schema validation');
  } else {
    console.log('🚀 Running in production mode without validation');
  }

  const db = await createRxDatabase<BreedHubCollections>({
    name,
    storage,
    multiInstance: false, // Disable multi-instance for dev mode
    eventReduce: true,
    ignoreDuplicate: true, // Allow duplicate database creation
    allowSlowCount: true, // Allow slow counting operations
    cleanupPolicy: {
      minimumDeletedTime: 1000 * 60 * 60 * 24 * 7, // 7 days
      minimumCollectionAge: 1000 * 60 * 60 * 24,    // 1 day
      runEach: 1000 * 60 * 60 * 4,                  // 4 hours
      awaitReplicationsInSync: true
    },
    ...options
  });

  console.log('📚 Adding collections...');

  // Add collections with schemas
  await db.addCollections({
    breeds: {
      schema: breedSchema,
      methods: breedMethods,
      statics: breedStatics
    }
    // TODO: Add more collections (dogs, kennels, litters)
  });

  console.log('✅ BreedHub database ready!');
  
  dbInstance = db;
  return db;
}

// Utility function to get existing database instance
export function getBreedHubDB(): BreedHubDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call createBreedHubDB() first.');
  }
  return dbInstance;
}

// Close database (useful for cleanup)
export async function closeBreedHubDB(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
    console.log('🗄️ Database closed');
  }
}

// Type helpers
export type BreedCollection = BreedHubDatabase['breeds'];
export type { Breed };