import { 
  createRxDatabase, 
  RxDatabase,
  RxCollection,
  addRxPlugin
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';

// Add plugins
addRxPlugin(RxDBQueryBuilderPlugin);

// Store database globally
let globalDb: RxDatabase | null = null;

/**
 * Get or create a temporary database for testing
 */
export async function getTempDatabase(): Promise<RxDatabase> {
  // Return existing if available
  if (globalDb && !globalDb.destroyed) {
    console.log('Using existing database');
    return globalDb;
  }

  // Clear any old databases first
  await cleanupOldDatabases();

  console.log('Creating fresh database...');
  
  // Use memory storage for testing - no persistence issues!
  const db = await createRxDatabase({
    name: 'temp_' + Math.random().toString(36).substring(7),
    storage: getRxStorageDexie(),
    multiInstance: false,
    eventReduce: false,
    cleanupPolicy: {
      minimumDeletedTime: 0,
      minimumCollectionAge: 0,
      runEach: 999999999999,
      awaitReplicationsInSync: false
    }
  });

  globalDb = db;
  console.log('Database created successfully');
  return db;
}

/**
 * Clean up old databases
 */
async function cleanupOldDatabases() {
  // Destroy existing global database
  if (globalDb) {
    try {
      await globalDb.destroy();
    } catch (e) {
      console.log('Could not destroy old database:', e);
    }
    globalDb = null;
  }

  // Clear IndexedDB
  if (typeof window !== 'undefined' && window.indexedDB) {
    try {
      const dbs = await window.indexedDB.databases?.() || [];
      for (const db of dbs) {
        if (db.name?.includes('temp_') || db.name?.includes('breedhub')) {
          try {
            await window.indexedDB.deleteDatabase(db.name);
            console.log('Deleted old database:', db.name);
          } catch (e) {
            // Ignore
          }
        }
      }
    } catch (e) {
      console.log('Could not list databases');
    }
  }
}

/**
 * Destroy the database
 */
export async function destroyTempDatabase() {
  if (globalDb) {
    await globalDb.destroy();
    globalDb = null;
  }
}