import { 
  createRxDatabase, 
  RxDatabase, 
  addRxPlugin,
  RxDatabaseCreator
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';

// Add plugins
addRxPlugin(RxDBQueryBuilderPlugin);

let dbInstance: RxDatabase | null = null;

export async function getSimpleDB(): Promise<RxDatabase> {
  // If database exists, return it
  if (dbInstance && !dbInstance.destroyed) {
    console.log('Returning existing database');
    return dbInstance;
  }

  console.log('Creating new database...');
  
  try {
    // Create database with unique name to avoid conflicts
    const dbName = `breedhub_${Date.now()}`;
    
    const db = await createRxDatabase({
      name: dbName,
      storage: getRxStorageDexie(),
      multiInstance: false,
      eventReduce: true,
      ignoreDuplicate: true
    });

    console.log('Database created successfully');
    dbInstance = db;
    return db;
  } catch (error: any) {
    console.error('Failed to create database:', error);
    throw error;
  }
}

export async function destroySimpleDB() {
  if (dbInstance && !dbInstance.destroyed) {
    await dbInstance.destroy();
    dbInstance = null;
    console.log('Database destroyed');
  }
}

export async function clearAllDatabases() {
  // Destroy current instance
  await destroySimpleDB();
  
  // Clear all IndexedDB databases
  if (typeof window !== 'undefined' && window.indexedDB) {
    if (window.indexedDB.databases) {
      const databases = await window.indexedDB.databases();
      for (const db of databases) {
        if (db.name?.includes('breedhub')) {
          await window.indexedDB.deleteDatabase(db.name);
          console.log(`Deleted database: ${db.name}`);
        }
      }
    }
  }
  
  console.log('All databases cleared');
}