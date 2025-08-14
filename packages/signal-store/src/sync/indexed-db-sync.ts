import { Entity, EntityId, SyncConfig, SyncState } from '../types';

/**
 * IndexedDB Sync Manager
 * Provides offline-first data persistence with conflict resolution
 */
export class IndexedDBSyncManager<T extends Entity> {
  private db: IDBDatabase | null = null;
  private syncState: SyncState = {
    lastSyncTimestamp: null,
    syncStatus: 'idle',
    pendingChanges: 0,
    conflictResolution: 'local',
  };
  private changeQueue: Array<{
    type: 'add' | 'update' | 'delete';
    entity?: T;
    id?: EntityId;
    timestamp: number;
  }> = [];

  constructor(private config: SyncConfig) {}

  /**
   * Initialize IndexedDB connection
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version || 1);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const objectStore = db.createObjectStore(
            this.config.storeName,
            { keyPath: this.config.keyPath || 'id' }
          );

          // Create indexes
          if (this.config.indexes) {
            this.config.indexes.forEach(index => {
              objectStore.createIndex(
                index.name,
                index.keyPath,
                index.options || {}
              );
            });
          }

          // Create metadata store for sync state
          if (!db.objectStoreNames.contains('_sync_metadata')) {
            db.createObjectStore('_sync_metadata', { keyPath: 'key' });
          }
        }
      };
    });
  }

  /**
   * Load all entities from IndexedDB
   */
  async loadAll(): Promise<T[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.config.storeName);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        resolve(request.result as T[]);
      };

      request.onerror = () => {
        reject(new Error(`Failed to load entities: ${request.error}`));
      };
    });
  }

  /**
   * Save entity to IndexedDB
   */
  async save(entity: T): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.config.storeName);
      const request = objectStore.put(entity);

      request.onsuccess = () => {
        this.trackChange('update', entity);
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to save entity: ${request.error}`));
      };
    });
  }

  /**
   * Save multiple entities
   */
  async saveMany(entities: T[]): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.config.storeName);
      
      let completed = 0;
      const total = entities.length;

      entities.forEach(entity => {
        const request = objectStore.put(entity);
        
        request.onsuccess = () => {
          this.trackChange('update', entity);
          completed++;
          if (completed === total) {
            resolve();
          }
        };

        request.onerror = () => {
          reject(new Error(`Failed to save entities: ${request.error}`));
        };
      });

      if (total === 0) {
        resolve();
      }
    });
  }

  /**
   * Delete entity from IndexedDB
   */
  async delete(id: EntityId): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.config.storeName);
      const request = objectStore.delete(id as IDBValidKey);

      request.onsuccess = () => {
        this.trackChange('delete', undefined, id);
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete entity: ${request.error}`));
      };
    });
  }

  /**
   * Clear all entities
   */
  async clear(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.config.storeName);
      const request = objectStore.clear();

      request.onsuccess = () => {
        this.changeQueue = [];
        this.syncState.pendingChanges = 0;
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to clear entities: ${request.error}`));
      };
    });
  }

  /**
   * Track changes for sync
   */
  private trackChange(type: 'add' | 'update' | 'delete', entity?: T, id?: EntityId): void {
    this.changeQueue.push({
      type,
      entity,
      id,
      timestamp: Date.now(),
    });
    this.syncState.pendingChanges = this.changeQueue.length;
  }

  /**
   * Get sync state
   */
  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  /**
   * Sync with remote server
   */
  async syncWithRemote(
    remoteFetch: () => Promise<T[]>,
    remotePush: (changes: any[]) => Promise<void>
  ): Promise<void> {
    this.syncState.syncStatus = 'syncing';

    try {
      // Push local changes to remote
      if (this.changeQueue.length > 0) {
        await remotePush(this.changeQueue);
        this.changeQueue = [];
        this.syncState.pendingChanges = 0;
      }

      // Fetch remote data
      const remoteData = await remoteFetch();
      
      // Merge with local data based on conflict resolution strategy
      if (this.syncState.conflictResolution === 'remote') {
        // Replace local with remote
        await this.clear();
        await this.saveMany(remoteData);
      } else if (this.syncState.conflictResolution === 'local') {
        // Keep local changes, only add new remote entities
        const localData = await this.loadAll();
        const localIds = new Set(localData.map(e => e.id));
        const newEntities = remoteData.filter(e => !localIds.has(e.id));
        await this.saveMany(newEntities);
      } else {
        // Merge strategy - custom logic needed
        await this.mergeData(remoteData);
      }

      this.syncState.lastSyncTimestamp = Date.now();
      this.syncState.syncStatus = 'synced';
    } catch (error) {
      this.syncState.syncStatus = 'error';
      throw error;
    }
  }

  /**
   * Custom merge strategy
   */
  private async mergeData(remoteData: T[]): Promise<void> {
    const localData = await this.loadAll();
    const merged = new Map<EntityId, T>();

    // Add all local data
    localData.forEach(entity => {
      merged.set(entity.id, entity);
    });

    // Merge remote data
    remoteData.forEach(remoteEntity => {
      const localEntity = merged.get(remoteEntity.id);
      if (localEntity) {
        // Conflict - resolve based on timestamp or other logic
        // For now, take the newer one (would need timestamp field)
        merged.set(remoteEntity.id, remoteEntity);
      } else {
        merged.set(remoteEntity.id, remoteEntity);
      }
    });

    await this.clear();
    await this.saveMany(Array.from(merged.values()));
  }

  /**
   * Query entities with filter
   */
  async query(filter: (entity: T) => boolean): Promise<T[]> {
    const all = await this.loadAll();
    return all.filter(filter);
  }

  /**
   * Get entity by ID
   */
  async getById(id: EntityId): Promise<T | undefined> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.config.storeName);
      const request = objectStore.get(id as IDBValidKey);

      request.onsuccess = () => {
        resolve(request.result as T);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get entity: ${request.error}`));
      };
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

/**
 * React hook for IndexedDB sync
 */
export function useIndexedDBSync<T extends Entity>(
  config: SyncConfig,
  entities: T[],
  onSync?: (entities: T[]) => void
) {
  const [syncManager] = React.useState(() => new IndexedDBSyncManager<T>(config));
  const [syncState, setSyncState] = React.useState<SyncState>(syncManager.getSyncState());
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Initialize on mount
  React.useEffect(() => {
    syncManager.init().then(() => {
      setIsInitialized(true);
      // Load initial data
      syncManager.loadAll().then(data => {
        if (onSync && data.length > 0) {
          onSync(data);
        }
      });
    });

    return () => {
      syncManager.close();
    };
  }, []);

  // Sync entities to IndexedDB when they change
  React.useEffect(() => {
    if (isInitialized && entities.length > 0) {
      syncManager.saveMany(entities).then(() => {
        setSyncState(syncManager.getSyncState());
      });
    }
  }, [entities, isInitialized]);

  const syncNow = React.useCallback(async (
    remoteFetch: () => Promise<T[]>,
    remotePush: (changes: any[]) => Promise<void>
  ) => {
    await syncManager.syncWithRemote(remoteFetch, remotePush);
    setSyncState(syncManager.getSyncState());
    const data = await syncManager.loadAll();
    if (onSync) {
      onSync(data);
    }
  }, [onSync]);

  return {
    syncState,
    syncNow,
    syncManager,
  };
}

// Import React for hook
import * as React from 'react';