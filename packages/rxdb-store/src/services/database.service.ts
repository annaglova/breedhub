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

import { breedSchema, breedMigrationStrategies } from '../collections/breeds.schema';
import { BreedCollectionTyped } from '../types/breed.types';
import { booksSchema } from '../collections/books.schema';
import { BookCollection } from '../types/book.types';
import { appConfigSchema } from '../collections/app-config.schema';
import { AppConfigCollection } from '../stores/app-config.signal-store';

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
  breeds: BreedCollectionTyped;
  books: BookCollection;
  app_config: AppConfigCollection;
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
      console.log('[DatabaseService] Returning cached database');
      console.log('[DatabaseService] All DB keys:', Object.keys(this.db));
      console.log('[DatabaseService] DB collections object:', this.db.collections);
      console.log('[DatabaseService] Has breeds?:', !!this.db.breeds);
      console.log('[DatabaseService] Has books?:', !!this.db.books);
      console.log('[DatabaseService] Has app_config?:', !!this.db.app_config);
      return this.db;
    }

    if (!this.dbPromise) {
      console.log('[DatabaseService] Creating new database promise');
      this.dbPromise = this.createDatabase();
    }

    console.log('[DatabaseService] Awaiting database promise');
    this.db = await this.dbPromise;
    console.log('[DatabaseService] Database ready with collections:', Object.keys(this.db).filter(k => !k.startsWith('_')));
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
      breeds: {
        schema: breedSchema,
        migrationStrategies: breedMigrationStrategies,
        methods: {
          // Document methods
          getFullName(this: any) {
            return this.name;
          },
          getAgeRange(this: any) {
            if (!this.lifespan) return 'Unknown';
            return `${this.lifespan.min}-${this.lifespan.max} years`;
          },
          isActive(this: any) {
            return !this._deleted;
          }
        },
        statics: {
          // Collection methods
          async findBySize(this: any, size: string) {
            return this.find({
              selector: { size }
            }).exec();
          },
          async findByWorkspace(this: any, workspaceId: string) {
            return this.find({
              selector: { workspaceId }
            }).exec();
          },
          async searchByName(this: any, query: string) {
            return this.find({
              selector: {
                name: {
                  $regex: new RegExp(query, 'i')
                }
              }
            }).exec();
          }
        }
      },
      books: {
        schema: booksSchema,
        methods: {
          // Document methods
          isAvailable(this: any) {
            return this.available && !this._deleted;
          },
          getDisplayTitle(this: any) {
            return `${this.title} by ${this.author}`;
          }
        },
        statics: {
          // Collection methods
          async findByAuthor(this: any, author: string) {
            return this.find({
              selector: { author }
            }).exec();
          },
          async findByGenre(this: any, genre: string) {
            return this.find({
              selector: { genre }
            }).exec();
          },
          async findAvailable(this: any) {
            return this.find({
              selector: { 
                available: true,
                _deleted: false
              }
            }).exec();
          }
        }
      },
      app_config: {
        schema: appConfigSchema
      }
    };
    
      console.log('[DatabaseService] Adding collections:', Object.keys(collectionsToAdd));
      const result = await db.addCollections(collectionsToAdd);
      console.log('[DatabaseService] Collections added result:', Object.keys(result));
      console.log('[DatabaseService] Database now has collections:', Object.keys(db).filter(k => !k.startsWith('_')));
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
    await db.breeds.find().remove();
    await db.books.find().remove();
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