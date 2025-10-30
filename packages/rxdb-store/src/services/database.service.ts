import {
  createRxDatabase,
  RxDatabase,
  RxStorage,
  addRxPlugin,
  removeRxDatabase
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBMigrationPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBCleanupPlugin } from 'rxdb/plugins/cleanup';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';

import { appConfigSchema } from '../collections/app-config.schema';
import { AppConfigCollection } from '../stores/app-config.signal-store';
import { dictionariesSchema } from '../collections/dictionaries.schema';
import type { DictionaryCollection } from '../stores/dictionary-store.signal-store';

// Add plugins
if (process.env.NODE_ENV !== 'production') {
  addRxPlugin(RxDBDevModePlugin);
}
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBMigrationPlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBCleanupPlugin);

// Database type
export type DatabaseCollections = {
  app_config: AppConfigCollection;
  dictionaries: DictionaryCollection;
};

export type AppDatabase = RxDatabase<DatabaseCollections>;

// Database singleton
class DatabaseService {
  private static instance: DatabaseService;
  private dbPromise: Promise<AppDatabase> | null = null;
  private db: AppDatabase | null = null;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async getDatabase(): Promise<AppDatabase> {
    if (this.db) {
      // console.log('[DatabaseService] Returning cached database');
      return this.db;
    }

    if (!this.dbPromise) {
      console.log('[DatabaseService] Creating new database promise');
      this.dbPromise = this.createDatabase();
    }

    console.log('[DatabaseService] Awaiting database promise');
    this.db = await this.dbPromise;
    console.log('[DatabaseService] Database ready with collections:', Object.keys(this.db.collections));
    return this.db;
  }

  private async createDatabase(): Promise<AppDatabase> {
    console.log('[DatabaseService] Creating database...');

    // Wrap storage with validator for dev mode
    let storage: RxStorage<any, any>;
    if (process.env.NODE_ENV !== 'production') {
      storage = wrappedValidateAjvStorage({
        storage: getRxStorageDexie()
      });
    } else {
      storage = getRxStorageDexie();
    }

    let db: AppDatabase;
    
    try {
      db = await createRxDatabase<DatabaseCollections>({
        name: 'breedhub',
        storage,
        multiInstance: true,
        eventReduce: true,
        ignoreDuplicate: true,
        closeDuplicates: true,
        cleanupPolicy: {
          minimumDeletedTime: 1000 * 60 * 60, // 1 hour (для тестування можна менше)
          minimumCollectionAge: 1000 * 60, // 1 minute
          runEach: 1000 * 60 * 2, // 2 minutes (частіше перевірка)
          awaitReplicationsInSync: true, // Чекати синхронізації перед видаленням
          waitForLeadership: false // Don't wait for leadership
        }
      });
    } catch (error: any) {
      console.error('[DatabaseService] Error creating database:', error);
      // If database already exists with wrong schema, try to remove it
      if (error.code === 'DB6' || error.code === 'DXE1') {
        console.log('[DatabaseService] Attempting to remove and recreate database due to schema conflict...');
        try {
          await removeRxDatabase('breedhub', storage);
        } catch (removeError) {
          console.error('[DatabaseService] Failed to remove database:', removeError);
        }
        // Clear any cached instance
        this.db = null;
        this.dbPromise = null;
        // Try again
        db = await createRxDatabase<DatabaseCollections>({
          name: 'breedhub',
          storage,
          multiInstance: true,
          eventReduce: true,
          cleanupPolicy: {
            minimumDeletedTime: 1000 * 60 * 60 * 24 * 7, // 7 days
            minimumCollectionAge: 1000 * 60, // 1 minute
            runEach: 1000 * 60 * 5, // 5 minutes
            awaitReplicationsInSync: false, // Don't wait for replications
            waitForLeadership: false // Don't wait for leadership
          }
        });
      } else {
        throw error;
      }
    }

    console.log('[DatabaseService] Database created, adding collections...');

    // Add collections with error handling
    try {
      const collectionsToAdd = {
      app_config: {
        schema: appConfigSchema
      }
    };
    
      console.log('[DatabaseService] Adding collections:', Object.keys(collectionsToAdd));
      const result = await db.addCollections(collectionsToAdd);
      console.log('[DatabaseService] Collections added result:', Object.keys(result));
      console.log('[DatabaseService] Database now has collections:', Object.keys(db.collections));
    } catch (error: any) {
      if (error.code === 'DB6' || error.code === 'DXE1') {
        console.error('[DatabaseService] Schema conflict detected:', error.code);
        console.error('Error message:', error.message);
        // In development, we can try to remove and recreate
        if (process.env.NODE_ENV !== 'production') {
          console.log('[DatabaseService] Attempting to remove and recreate database...');
          // Don't call destroy on failed db object
          try {
            await removeRxDatabase('breedhub', storage);
          } catch (removeError) {
            console.error('[DatabaseService] Failed to remove database:', removeError);
          }
          // Clear instance
          this.db = null;
          this.dbPromise = null;
          // Recursively call to recreate
          return this.createDatabase();
        }
      }
      throw error;
    }

    console.log('[DatabaseService] Collections added successfully');

    return db;
  }

  public async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.destroy();
      this.db = null;
      this.dbPromise = null;
    }
  }

  public async clearAllData(): Promise<void> {
    const db = await this.getDatabase();
    // Clear books collection if it exists
    if (db.books) {
      await db.books.find().remove();
    }
    // Clear app_config collection if it exists
    if (db.app_config) {
      await db.app_config.find().remove();
    }
  }

  public async removeDatabase(): Promise<void> {
    console.log('[DatabaseService] Removing database...');
    
    // Close existing connection
    if (this.db) {
      await this.db.destroy();
      this.db = null;
      this.dbPromise = null;
    }
    
    // Remove the database completely
    await removeRxDatabase('breedhub', getRxStorageDexie());
    console.log('[DatabaseService] Database removed successfully');
  }
}

export const databaseService = DatabaseService.getInstance();

// Export convenience functions
export const getDatabase = () => databaseService.getDatabase();
export const resetDatabase = () => databaseService.removeDatabase();
export const cleanAllDatabases = async () => {
  console.log('[DatabaseService] Cleaning all IndexedDB databases...');
  
  // Get all database names
  const databases = await indexedDB.databases();
  
  for (const db of databases) {
    if (db.name) {
      console.log(`[DatabaseService] Deleting database: ${db.name}`);
      await new Promise<void>((resolve, reject) => {
        const deleteReq = indexedDB.deleteDatabase(db.name!);
        deleteReq.onsuccess = () => resolve();
        deleteReq.onerror = () => reject(deleteReq.error);
      });
    }
  }
  
  console.log('[DatabaseService] All databases cleaned');
};