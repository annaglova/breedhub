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
  breedSchema as oldBreedSchema, 
  breedMethods, 
  breedStatics,
  type Breed 
} from './schemas/breed.schema.js';
import { breedSchema } from './supabase/collections-config';

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
  breed: any; // New Supabase breed collection
}

export type BreedHubDatabase = RxDatabase<BreedHubCollections>;

let dbInstance: BreedHubDatabase | null = null;

export async function createBreedHubDB(
  name: string = 'breedhub',
  options?: Partial<RxDatabaseCreator>
): Promise<BreedHubDatabase> {
  
  // Return existing instance if available
  if (dbInstance) {
    console.log('📦 Returning existing database instance');
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

  try {
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

    // Add collections with schemas - check if they exist first
    const collectionsToAdd: any = {};
    
    if (!db.collections.breeds) {
      collectionsToAdd.breeds = {
        schema: oldBreedSchema,
        methods: breedMethods,
        statics: breedStatics
      };
    }
    
    if (!db.collections.breed) {
      collectionsToAdd.breed = {
        schema: breedSchema // Supabase breed schema
      };
    }
    
    if (Object.keys(collectionsToAdd).length > 0) {
      await db.addCollections(collectionsToAdd);
    }

    console.log('✅ BreedHub database ready!');
    
    dbInstance = db;
    return db;
  } catch (error: any) {
    // If DB already exists (error DB9), just log and throw
    if (error.code === 'DB9' || error.message?.includes('already exists')) {
      console.log('Database already exists error:', error.message);
      // Don't try to recreate - this causes infinite loop!
    }
    
    throw error;
  }
}

// Utility function to get existing database instance
export async function getBreedHubDB(): Promise<BreedHubDatabase> {
  if (!dbInstance) {
    // Auto-initialize database if not exists
    console.log('Database not initialized, creating new instance...');
    return await createBreedHubDB();
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