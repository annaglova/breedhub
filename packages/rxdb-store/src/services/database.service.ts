import {
  createRxDatabase,
  RxDatabase,
  RxStorage,
  addRxPlugin
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
      return this.db;
    }

    if (!this.dbPromise) {
      this.dbPromise = this.createDatabase();
    }

    this.db = await this.dbPromise;
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

    const db = await createRxDatabase<DatabaseCollections>({
      name: 'breedhub',
      storage,
      multiInstance: true,
      eventReduce: true,
      cleanupPolicy: {
        minimumDeletedTime: 1000 * 60 * 60 * 24 * 7, // 7 days
        minimumCollectionAge: 1000 * 60, // 1 minute
        runEach: 1000 * 60 * 5, // 5 minutes
        awaitReplicationsInSync: true,
        waitForLeadership: true
      }
    });

    console.log('[DatabaseService] Database created, adding collections...');

    // Add collections
    await db.addCollections({
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
      }
    });

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
  }
}

export const databaseService = DatabaseService.getInstance();