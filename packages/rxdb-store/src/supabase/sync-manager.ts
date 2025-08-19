import { RxCollection, RxDatabase } from 'rxdb';
import { supabase } from './client';
import { signal, computed } from '@preact/signals-react';

// Sync status types
export interface SyncStatus {
  isActive: boolean;
  isPaused: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  errors: Error[];
  collections: Map<string, CollectionSyncStatus>;
}

export interface CollectionSyncStatus {
  name: string;
  isActive: boolean;
  lastPull: Date | null;
  lastPush: Date | null;
  pendingDocs: number;
  errors: Error[];
}

// Retry configuration
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

// Replication configuration
export interface ReplicationConfig {
  collections: string[];
  batchSize?: number;
  syncInterval?: number; // in milliseconds
  retryStrategy?: RetryConfig;
  enableRealtime?: boolean;
}

// Default retry strategy
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2
};

/**
 * Centralized Sync Manager for RxDB-Supabase replication
 */
export class SyncManager {
  private database: RxDatabase | null = null;
  private replicationStates = new Map<string, any>();
  private syncIntervalId: NodeJS.Timeout | null = null;
  
  // Reactive state using signals
  private _status = signal<SyncStatus>({
    isActive: false,
    isPaused: false,
    lastSync: null,
    pendingChanges: 0,
    errors: [],
    collections: new Map()
  });
  
  // Computed values
  public readonly status = computed(() => this._status.value);
  public readonly isActive = computed(() => this._status.value.isActive);
  public readonly hasPendingChanges = computed(() => this._status.value.pendingChanges > 0);
  public readonly hasErrors = computed(() => this._status.value.errors.length > 0);
  
  constructor() {
    console.log('📡 SyncManager initialized');
  }
  
  /**
   * Initialize sync manager with database
   */
  async initialize(database: RxDatabase) {
    this.database = database;
    console.log('🔗 SyncManager connected to database');
    
    // Check Supabase connection
    const { checkSupabaseConnection } = await import('./client');
    const isConnected = await checkSupabaseConnection();
    
    if (!isConnected) {
      console.warn('⚠️ Supabase connection failed - sync will work in offline mode');
    }
    
    return this;
  }
  
  /**
   * Start synchronization for specified collections
   */
  async startSync(config: ReplicationConfig) {
    if (!this.database) {
      throw new Error('Database not initialized');
    }
    
    console.log('🚀 Starting sync for collections:', config.collections);
    
    // Update status
    this._status.value = {
      ...this._status.value,
      isActive: true,
      isPaused: false
    };
    
    // Setup replication for each collection
    for (const collectionName of config.collections) {
      await this.setupCollectionReplication(
        collectionName,
        config
      );
    }
    
    // Setup periodic sync if configured
    if (config.syncInterval) {
      this.startPeriodicSync(config.syncInterval);
    }
    
    // Setup realtime subscriptions if enabled
    if (config.enableRealtime) {
      await this.setupRealtimeSubscriptions(config.collections);
    }
    
    console.log('✅ Sync started successfully');
  }
  
  /**
   * Setup replication for a single collection
   */
  private async setupCollectionReplication(
    collectionName: string,
    config: ReplicationConfig
  ) {
    if (!this.database || !this.database[collectionName]) {
      console.warn(`Collection ${collectionName} not found in database`);
      return;
    }
    
    const collection = this.database[collectionName];
    
    // Create replication state
    const replicationState = await this.createReplicationState(
      collection,
      collectionName,
      config
    );
    
    if (replicationState) {
      this.replicationStates.set(collectionName, replicationState);
      
      // Update collection status
      const collectionsStatus = new Map(this._status.value.collections);
      collectionsStatus.set(collectionName, {
        name: collectionName,
        isActive: true,
        lastPull: null,
        lastPush: null,
        pendingDocs: 0,
        errors: []
      });
      
      this._status.value = {
        ...this._status.value,
        collections: collectionsStatus
      };
    }
  }
  
  /**
   * Create replication state for a collection
   */
  private async createReplicationState(
    collection: RxCollection,
    tableName: string,
    config: ReplicationConfig
  ) {
    try {
      // Import replication plugin
      const { replicateRxCollection } = await import('rxdb/plugins/replication');
      
      const replicationState = replicateRxCollection({
        collection,
        replicationIdentifier: `${tableName}-supabase-sync`,
        
        // Pull changes from Supabase
        pull: {
          async handler(checkpoint: any) {
            console.log(`⬇️ Pulling ${tableName} from checkpoint:`, checkpoint);
            
            try {
              // Query Supabase for changes
              let query = supabase
                .from(tableName)
                .select('*')
                .order('updated_at', { ascending: true })
                .limit(config.batchSize || 100);
              
              // Add checkpoint filter if exists
              if (checkpoint?.updated_at) {
                query = query.gt('updated_at', checkpoint.updated_at);
              }
              
              const { data, error } = await query;
              
              if (error) {
                console.error(`Pull error for ${tableName}:`, error);
                throw error;
              }
              
              const documents = data || [];
              
              // Update checkpoint
              const newCheckpoint = documents.length > 0
                ? { updated_at: documents[documents.length - 1].updated_at }
                : checkpoint;
              
              console.log(`✅ Pulled ${documents.length} documents from ${tableName}`);
              
              return {
                documents,
                checkpoint: newCheckpoint
              };
            } catch (error) {
              console.error(`Failed to pull ${tableName}:`, error);
              throw error;
            }
          },
          batchSize: config.batchSize || 100,
          modifier: (doc: any) => {
            // Transform Supabase document to RxDB format if needed
            return doc;
          }
        },
        
        // Push changes to Supabase
        push: {
          async handler(changeRows: any[]) {
            console.log(`⬆️ Pushing ${changeRows.length} changes to ${tableName}`);
            
            try {
              const docsToUpsert = changeRows
                .filter(row => !row.assumedMasterState?._deleted)
                .map(row => row.newDocumentState);
              
              const docsToDelete = changeRows
                .filter(row => row.assumedMasterState?._deleted)
                .map(row => row.newDocumentState.id);
              
              const results = [];
              
              // Upsert documents
              if (docsToUpsert.length > 0) {
                const { error } = await supabase
                  .from(tableName)
                  .upsert(docsToUpsert);
                
                if (error) {
                  console.error(`Push upsert error for ${tableName}:`, error);
                  throw error;
                }
                
                results.push(...docsToUpsert);
              }
              
              // Delete documents
              if (docsToDelete.length > 0) {
                const { error } = await supabase
                  .from(tableName)
                  .delete()
                  .in('id', docsToDelete);
                
                if (error) {
                  console.error(`Push delete error for ${tableName}:`, error);
                  throw error;
                }
              }
              
              console.log(`✅ Pushed ${changeRows.length} changes to ${tableName}`);
              return changeRows;
            } catch (error) {
              console.error(`Failed to push ${tableName}:`, error);
              // Return empty array to retry later
              return [];
            }
          },
          batchSize: config.batchSize || 100,
          modifier: (doc: any) => {
            // Add updated_at timestamp
            return {
              ...doc,
              updated_at: new Date().toISOString()
            };
          }
        }
      });
      
      // Setup error handling
      replicationState.error$.subscribe((error: any) => {
        console.error(`Replication error for ${tableName}:`, error);
        this.handleReplicationError(tableName, error);
      });
      
      // Setup active state monitoring
      replicationState.active$.subscribe((active: boolean) => {
        console.log(`Replication ${tableName} active:`, active);
        this.updateCollectionStatus(tableName, { isActive: active });
      });
      
      return replicationState;
    } catch (error) {
      console.error(`Failed to create replication for ${tableName}:`, error);
      return null;
    }
  }
  
  /**
   * Setup realtime subscriptions
   */
  private async setupRealtimeSubscriptions(collections: string[]) {
    console.log('🔴 Setting up realtime subscriptions for:', collections);
    
    for (const collectionName of collections) {
      const channel = supabase
        .channel(`${collectionName}-changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: collectionName
          },
          (payload) => {
            console.log(`Realtime event for ${collectionName}:`, payload);
            // Trigger pull for this collection
            this.pullCollection(collectionName);
          }
        )
        .subscribe();
    }
  }
  
  /**
   * Start periodic sync
   */
  private startPeriodicSync(interval: number) {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }
    
    this.syncIntervalId = setInterval(() => {
      this.syncAll();
    }, interval);
    
    console.log(`⏰ Periodic sync started (every ${interval}ms)`);
  }
  
  /**
   * Sync all collections
   */
  async syncAll() {
    console.log('🔄 Syncing all collections...');
    
    for (const [name, replicationState] of this.replicationStates) {
      if (replicationState && !replicationState.isStopped) {
        await replicationState.reSync();
      }
    }
    
    this._status.value = {
      ...this._status.value,
      lastSync: new Date()
    };
  }
  
  /**
   * Pull changes for specific collection
   */
  async pullCollection(collectionName: string) {
    const replicationState = this.replicationStates.get(collectionName);
    if (replicationState && !replicationState.isStopped) {
      await replicationState.reSync();
      this.updateCollectionStatus(collectionName, { lastPull: new Date() });
    }
  }
  
  /**
   * Pause all sync operations
   */
  pauseAll() {
    console.log('⏸️ Pausing all sync operations');
    
    for (const [name, replicationState] of this.replicationStates) {
      if (replicationState) {
        replicationState.cancel();
      }
    }
    
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    
    this._status.value = {
      ...this._status.value,
      isPaused: true,
      isActive: false
    };
  }
  
  /**
   * Resume all sync operations
   */
  async resumeAll() {
    console.log('▶️ Resuming all sync operations');
    
    for (const [name, replicationState] of this.replicationStates) {
      if (replicationState && replicationState.isStopped) {
        await replicationState.start();
      }
    }
    
    this._status.value = {
      ...this._status.value,
      isPaused: false,
      isActive: true
    };
  }
  
  /**
   * Stop all sync operations and cleanup
   */
  async stopAll() {
    console.log('🛑 Stopping all sync operations');
    
    // Cancel all replications
    for (const [name, replicationState] of this.replicationStates) {
      if (replicationState) {
        await replicationState.cancel();
      }
    }
    
    // Clear interval
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    
    // Clear state
    this.replicationStates.clear();
    
    this._status.value = {
      isActive: false,
      isPaused: false,
      lastSync: null,
      pendingChanges: 0,
      errors: [],
      collections: new Map()
    };
  }
  
  /**
   * Handle replication error
   */
  private handleReplicationError(collectionName: string, error: Error) {
    const errors = [...this._status.value.errors, error];
    
    // Keep only last 10 errors
    if (errors.length > 10) {
      errors.shift();
    }
    
    this._status.value = {
      ...this._status.value,
      errors
    };
    
    this.updateCollectionStatus(collectionName, {
      errors: [error]
    });
  }
  
  /**
   * Update collection status
   */
  private updateCollectionStatus(
    collectionName: string,
    updates: Partial<CollectionSyncStatus>
  ) {
    const collections = new Map(this._status.value.collections);
    const current = collections.get(collectionName) || {
      name: collectionName,
      isActive: false,
      lastPull: null,
      lastPush: null,
      pendingDocs: 0,
      errors: []
    };
    
    collections.set(collectionName, {
      ...current,
      ...updates
    });
    
    this._status.value = {
      ...this._status.value,
      collections
    };
  }
  
  /**
   * Get sync status
   */
  getStatus(): SyncStatus {
    return this._status.value;
  }
  
  /**
   * Get collection sync status
   */
  getCollectionStatus(collectionName: string): CollectionSyncStatus | undefined {
    return this._status.value.collections.get(collectionName);
  }
}

// Create singleton instance
export const syncManager = new SyncManager();