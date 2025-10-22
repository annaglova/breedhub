import { replicateRxCollection, RxReplicationState } from 'rxdb/plugins/replication';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RxCollection, RxDatabase } from 'rxdb';
import { BusinessEntity } from '../types/business-entity.types';

export interface ReplicationOptions {
  batchSize?: number;
  pullInterval?: number;
  enableRealtime?: boolean;
  conflictHandler?: 'last-write-wins' | 'custom';
  customConflictHandler?: (conflict: any) => Promise<any>;
}

export interface EntityMapping {
  rxdbToSupabase?: (doc: any) => any;
  supabaseToRxdb?: (doc: any) => any;
}

/**
 * Universal Entity Replication Service
 * Handles bi-directional sync between RxDB and Supabase for any entity type
 */
export class EntityReplicationService {
  private replicationStates: Map<string, RxReplicationState<any, any>> = new Map();
  private realtimeChannels: Map<string, any> = new Map();
  private supabase: SupabaseClient;
  private activeRequests: Map<string, number> = new Map();
  private maxConcurrentRequests = 3;
  private entityMetadata: Map<string, { total: number; lastSync: string; lastCheckpoint?: any }> = new Map();
  private totalCountCallbacks: Map<string, Array<(total: number) => void>> = new Map();

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      realtime: {
        params: {
          eventsPerSecond: 2 // Limit realtime events
        }
      }
    });
  }

  /**
   * Generic field mapping for any entity
   * Maps between RxDB format (_deleted) and Supabase format (deleted)
   */
  private mapSupabaseToRxDB(entityType: string, supabaseDoc: any, schema?: any): any {
    const mapped: any = {};

    // If we have schema, use it to map fields
    if (schema?.properties) {
      for (const fieldName in schema.properties) {
        if (fieldName === '_deleted') {
          // Special handling for deleted field
          mapped._deleted = Boolean(supabaseDoc.deleted);
        } else if (supabaseDoc.hasOwnProperty(fieldName)) {
          mapped[fieldName] = supabaseDoc[fieldName];
        }
      }
    } else {
      // Fallback: copy all fields, handling special cases
      // ⚠️ CRITICAL: Exclude RxDB service fields (_meta, _attachments, _rev)
      const serviceFields = ['_meta', '_attachments', '_rev'];

      for (const key in supabaseDoc) {
        // Skip RxDB service fields
        if (serviceFields.includes(key)) {
          continue;
        }

        if (key === 'deleted') {
          mapped._deleted = Boolean(supabaseDoc.deleted);
        } else {
          mapped[key] = supabaseDoc[key];
        }
      }
    }

    // Ensure required fields
    mapped.id = mapped.id || supabaseDoc.id;
    mapped.created_at = mapped.created_at || supabaseDoc.created_at;
    mapped.updated_at = mapped.updated_at || supabaseDoc.updated_at;

    // ✅ IMPORTANT: Remove service fields that might have been copied
    delete mapped._meta;
    delete mapped._attachments;
    delete mapped._rev;

    // Commented out for less noise - uncomment for debugging
    // console.log(`[EntityReplication-${entityType}] Mapped from Supabase:`, {
    //   id: mapped.id,
    //   deleted_supabase: supabaseDoc.deleted,
    //   deleted_rxdb: mapped._deleted
    // });

    return mapped;
  }

  /**
   * Map RxDB document to Supabase format
   */
  private mapRxDBToSupabase(entityType: string, rxdbDoc: any): any {
    const mapped: any = {};

    for (const key in rxdbDoc) {
      if (key === '_deleted') {
        mapped.deleted = rxdbDoc._deleted || false;
      } else if (!key.startsWith('_')) { // Skip RxDB internal fields
        mapped[key] = rxdbDoc[key];
      }
    }

    // Ensure timestamps
    mapped.updated_at = new Date().toISOString();
    if (!mapped.created_at) {
      mapped.created_at = mapped.updated_at;
    }

    return mapped;
  }

  /**
   * Setup replication for a specific entity type
   */
  async setupReplication(
    db: RxDatabase,
    entityType: string,
    options: ReplicationOptions = {}
  ): Promise<boolean> {
    console.log(`[EntityReplication] Setting up replication for ${entityType}...`);

    // Check if collection exists
    const collection = db[entityType] as RxCollection<any>;
    if (!collection) {
      console.error(`[EntityReplication] Collection ${entityType} not found in database`);
      return false;
    }

    // Check if replication already exists
    if (this.replicationStates.has(entityType)) {
      console.log(`[EntityReplication] Replication already active for ${entityType}`);
      return true;
    }

    // Get schema for field mapping
    const schema = collection.schema.jsonSchema;

    // Initialize request counter
    this.activeRequests.set(entityType, 0);

    try {
      const replicationState = await replicateRxCollection({
        collection,
        replicationIdentifier: `${entityType}-supabase-replication`,
        deletedField: '_deleted',
        live: true,  // Потрібно для throttling логіки
        retryTime: options.pullInterval || 5 * 1000, // 5 секунд між спробами
        waitForLeadership: false,
        autoStart: true,

        pull: {
          handler: async (checkpointOrNull, batchSize) => {
            // Skip if we recently pulled and got no data (ВАЖЛИВА ЛОГІКА!)
            // BUT: завжди дозволяємо перший pull для завантаження totalCount
            const hasMetadata = this.entityMetadata.has(entityType);

            if (checkpointOrNull?.lastPullAt && checkpointOrNull?.pulled) {
              const lastPull = new Date(checkpointOrNull.lastPullAt).getTime();
              const now = new Date().getTime();
              const timeSinceLastPull = now - lastPull;

              // If less than 5 seconds since last pull and we already pulled data, skip
              if (timeSinceLastPull < 5000) {
                return {
                  documents: [],
                  checkpoint: checkpointOrNull
                };
              }
            }

            // Rate limiting
            const activeReqs = this.activeRequests.get(entityType) || 0;
            if (activeReqs >= this.maxConcurrentRequests) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }

            this.activeRequests.set(entityType, activeReqs + 1);

            // Batch size logic:
            // Always use rows from config (no multiplication)
            const effectiveBatchSize = options.batchSize || 50; // from view config rows

            // Check if this is truly initial load (no metadata = first time loading)
            const isInitialLoad = !hasMetadata;

            const limit = effectiveBatchSize;  // Always use config value as-is

            // Subtract 5sec to catch late updates
            const checkpointDate = checkpointOrNull?.updated_at
              ? new Date(new Date(checkpointOrNull.updated_at).getTime() - 5000).toISOString()
              : new Date(0).toISOString();

            try {
              // Fetch data
              const { data, error } = await this.supabase
                .from(entityType)
                .select('*')
                .gt('updated_at', checkpointDate)
                .order('updated_at', { ascending: true })
                .limit(limit);

              if (error) {
                console.error(`[EntityReplication-${entityType}] Pull error:`, error);
                return {
                  documents: [],
                  checkpoint: checkpointOrNull
                };
              }

              // Get total count (завжди при першому pull або якщо немає в metadata)
              let totalCount: number | undefined;
              const hasMetadata = this.entityMetadata.has(entityType);

              if (!hasMetadata) {
                const { count, error: countError } = await this.supabase
                  .from(entityType)
                  .select('*', { count: 'exact', head: true });

                if (!countError && count !== null) {
                  totalCount = count;

                  // Save metadata in memory (preserve existing lastCheckpoint if any)
                  const existingMetadata = this.entityMetadata.get(entityType);

                  // Try to load checkpoint from localStorage if not in memory
                  let checkpointToPreserve = existingMetadata?.lastCheckpoint;
                  if (!checkpointToPreserve) {
                    try {
                      const cached = localStorage.getItem(`checkpoint_${entityType}`);
                      if (cached) {
                        checkpointToPreserve = JSON.parse(cached);
                      }
                    } catch (e) {
                      console.warn(`[EntityReplication-${entityType}] Failed to restore checkpoint:`, e);
                    }
                  }

                  this.entityMetadata.set(entityType, {
                    total: count,
                    lastSync: new Date().toISOString(),
                    ...(checkpointToPreserve ? { lastCheckpoint: checkpointToPreserve } : {})
                  });

                  // Cache in localStorage for instant access on next load
                  try {
                    localStorage.setItem(`totalCount_${entityType}`, count.toString());
                  } catch (e) {
                    console.warn(`[EntityReplication-${entityType}] Failed to cache totalCount in localStorage:`, e);
                  }

                  // Notify subscribers
                  const callbacks = this.totalCountCallbacks.get(entityType);
                  if (callbacks) {
                    callbacks.forEach(cb => cb(count));
                  }
                } else {
                  console.error(`[EntityReplication-${entityType}] ❌ Failed to fetch total count:`, countError);
                }
              } else {
                // Use cached total
                totalCount = this.entityMetadata.get(entityType)?.total;
              }

              const documents = (data || []).map(doc =>
                this.mapSupabaseToRxDB(entityType, doc, schema)
              );

              // Check if we got full batch (meaning there might be more)
              const hasMore = documents.length === limit;

              const newCheckpoint = documents.length > 0
                ? {
                    updated_at: documents[documents.length - 1].updated_at,
                    pulled: true,
                    lastPullAt: new Date().toISOString(),
                    totalCount  // Include total count in checkpoint
                  }
                : checkpointOrNull
                  ? { ...checkpointOrNull, pulled: true, lastPullAt: new Date().toISOString() }
                  : { pulled: true, lastPullAt: new Date().toISOString() };

              return {
                documents,
                checkpoint: newCheckpoint
              };
            } catch (error) {
              console.error(`[EntityReplication-${entityType}] Pull failed:`, error);
              return {
                documents: [],
                checkpoint: checkpointOrNull
              };
            } finally {
              const currentReqs = this.activeRequests.get(entityType) || 0;
              this.activeRequests.set(entityType, Math.max(0, currentReqs - 1));
            }
          },
          batchSize: options.batchSize || 20,
          modifier: (doc: any) => doc
        },

        push: {
          handler: async (rows) => {
            const conflicts: any[] = [];

            for (const row of rows) {
              try {
                const supabaseData = this.mapRxDBToSupabase(
                  entityType,
                  row.newDocumentState
                );

                const isDeleted = row.newDocumentState._deleted === true;
                const wasDeleted = row.assumedMasterState?._deleted === true;

                if (wasDeleted || isDeleted) {
                  console.log(`[EntityReplication-${entityType}] Pushing delete for:`, supabaseData.id);

                  const { error } = await this.supabase
                    .from(entityType)
                    .upsert({
                      ...supabaseData,
                      deleted: true,
                      updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });

                  if (error) {
                    console.error(`[EntityReplication-${entityType}] Delete error:`, error);
                    conflicts.push(row.newDocumentState);
                  }
                } else {
                  const { error } = await this.supabase
                    .from(entityType)
                    .upsert(supabaseData, { onConflict: 'id' });

                  if (error) {
                    console.error(`[EntityReplication-${entityType}] Upsert error:`, error);
                    conflicts.push(row.newDocumentState);
                  }
                }
              } catch (error) {
                console.error(`[EntityReplication-${entityType}] Push error for row:`, error);
                conflicts.push(row.newDocumentState);
              }
            }

            console.log(`[EntityReplication-${entityType}] Push completed`, {
              success: rows.length - conflicts.length,
              failed: conflicts.length
            });

            return conflicts;
          },
          batchSize: options.batchSize || 10,
          modifier: (doc: any) => doc
        }
      });

      // Store replication state
      this.replicationStates.set(entityType, replicationState);

      // Setup error handling
      replicationState.error$.subscribe((error: any) => {
        console.error(`[EntityReplication-${entityType}] Replication error:`, error);
      });

      console.log(`[EntityReplication-${entityType}] Replication setup complete`);

      // Setup realtime if enabled
      if (options.enableRealtime !== false) {
        await this.setupRealtimeSubscription(db, entityType, schema);
      }

      return true;
    } catch (error) {
      console.error(`[EntityReplication-${entityType}] Setup failed:`, error);
      return false;
    }
  }

  /**
   * Setup realtime subscription for an entity
   */
  private async setupRealtimeSubscription(
    db: RxDatabase,
    entityType: string,
    schema?: any
  ): Promise<void> {
    console.log(`[EntityReplication-${entityType}] Setting up realtime subscription...`);

    // Clean up existing channel if any
    const existingChannel = this.realtimeChannels.get(entityType);
    if (existingChannel) {
      await this.supabase.removeChannel(existingChannel);
    }

    try {
      const channel = this.supabase
        .channel(`${entityType}-changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: entityType
          },
          async (payload) => {
            console.log(`[EntityReplication-${entityType}] 🔴 REALTIME EVENT:`, {
              eventType: payload.eventType,
              id: (payload.new as any)?.id || (payload.old as any)?.id
            });

            const collection = db[entityType];
            if (!collection) return;

            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const supabaseDoc = payload.new;
              const rxdbDoc = this.mapSupabaseToRxDB(entityType, supabaseDoc, schema);

              try {
                const existing = await collection.findOne(rxdbDoc.id).exec();

                if (existing) {
                  // Only update if Supabase version is newer
                  if (new Date(rxdbDoc.updated_at) > new Date(existing.updated_at)) {
                    await existing.patch(rxdbDoc);
                    console.log(`[EntityReplication-${entityType}] Realtime: Updated`, rxdbDoc.id);
                  }
                } else {
                  await collection.insert(rxdbDoc);
                  console.log(`[EntityReplication-${entityType}] Realtime: Inserted`, rxdbDoc.id);
                }
              } catch (err) {
                console.error(`[EntityReplication-${entityType}] Realtime sync error:`, err);
              }
            } else if (payload.eventType === 'DELETE') {
              const docId = (payload.old as any).id;

              try {
                const existing = await collection.findOne(docId).exec();
                if (existing) {
                  await existing.patch({
                    _deleted: true,
                    updated_at: new Date().toISOString()
                  });
                  console.log(`[EntityReplication-${entityType}] Realtime: Marked as deleted`, docId);
                }
              } catch (err) {
                console.error(`[EntityReplication-${entityType}] Realtime delete error:`, err);
              }
            }
          }
        )
        .subscribe((status) => {
          console.log(`[EntityReplication-${entityType}] 🟢 Realtime status:`, status);
          if (status === 'SUBSCRIBED') {
            console.log(`[EntityReplication-${entityType}] ✅ REALTIME CONNECTED!`);
          }
        });

      this.realtimeChannels.set(entityType, channel);
    } catch (error) {
      console.error(`[EntityReplication-${entityType}] Realtime setup failed:`, error);
    }
  }

  /**
   * Stop replication for a specific entity type
   */
  async stopReplication(entityType: string): Promise<void> {
    console.log(`[EntityReplication] Stopping replication for ${entityType}...`);

    // Stop replication state
    const replicationState = this.replicationStates.get(entityType);
    if (replicationState) {
      await replicationState.cancel();
      this.replicationStates.delete(entityType);
    }

    // Remove realtime channel
    const channel = this.realtimeChannels.get(entityType);
    if (channel) {
      await this.supabase.removeChannel(channel);
      this.realtimeChannels.delete(entityType);
    }

    // Reset counters
    this.activeRequests.delete(entityType);

    console.log(`[EntityReplication] Replication stopped for ${entityType}`);
  }

  /**
   * Stop all replications
   */
  async stopAll(): Promise<void> {
    console.log('[EntityReplication] Stopping all replications...');

    for (const entityType of this.replicationStates.keys()) {
      await this.stopReplication(entityType);
    }

    console.log('[EntityReplication] All replications stopped');
  }

  /**
   * Force full sync for an entity type
   */
  async forceFullSync(db: RxDatabase, entityType: string): Promise<boolean> {
    console.log(`[EntityReplication] Force syncing ${entityType}...`);

    const collection = db[entityType];
    if (!collection) {
      console.error(`[EntityReplication] Collection ${entityType} not found`);
      return false;
    }

    const schema = collection.schema.jsonSchema;

    try {
      const { data, error } = await this.supabase
        .from(entityType)
        .select('*')
        .eq('deleted', false)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error(`[EntityReplication] Force sync error:`, error);
        return false;
      }

      console.log(`[EntityReplication] Force sync got ${data?.length || 0} ${entityType} records`);

      for (const supabaseDoc of (data || [])) {
        const rxdbDoc = this.mapSupabaseToRxDB(entityType, supabaseDoc, schema);

        try {
          const existing = await collection.findOne(rxdbDoc.id).exec();

          if (existing) {
            if (new Date(rxdbDoc.updated_at) > new Date(existing.updated_at)) {
              await existing.patch(rxdbDoc);
              console.log(`[EntityReplication] Updated ${entityType}:`, rxdbDoc.id);
            }
          } else {
            await collection.insert(rxdbDoc);
            console.log(`[EntityReplication] Inserted ${entityType}:`, rxdbDoc.id);
          }
        } catch (err) {
          console.error(`[EntityReplication] Error syncing ${entityType}:`, rxdbDoc.id, err);
        }
      }

      console.log(`[EntityReplication] Force sync completed for ${entityType}`);
      return true;
    } catch (error) {
      console.error(`[EntityReplication] Force sync failed for ${entityType}:`, error);
      return false;
    }
  }

  /**
   * Check if replication is active for entity type
   */
  isReplicationActive(entityType: string): boolean {
    return this.replicationStates.has(entityType);
  }

  /**
   * Get replication state for monitoring
   */
  getReplicationState(entityType: string): RxReplicationState<any, any> | undefined {
    return this.replicationStates.get(entityType);
  }

  /**
   * Subscribe to totalCount updates
   * @param entityType - тип сутності
   * @param callback - функція яка викликається при оновленні
   * @returns unsubscribe функція
   */
  onTotalCountUpdate(entityType: string, callback: (total: number) => void): () => void {
    if (!this.totalCountCallbacks.has(entityType)) {
      this.totalCountCallbacks.set(entityType, []);
    }
    this.totalCountCallbacks.get(entityType)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.totalCountCallbacks.get(entityType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Get total count from server metadata
   * Reads from memory first, then localStorage cache, then returns 0
   * @param entityType - тип сутності
   * @returns total count або 0 якщо немає
   */
  getTotalCount(entityType: string): number {
    // Try memory first
    const memoryTotal = this.entityMetadata.get(entityType)?.total;
    if (memoryTotal) {
      return memoryTotal;
    }

    // Try localStorage cache
    try {
      const cached = localStorage.getItem(`totalCount_${entityType}`);
      if (cached) {
        const count = parseInt(cached, 10);
        console.log(`[EntityReplication-${entityType}] 📦 Using cached totalCount from localStorage: ${count}`);
        return count;
      }
    } catch (e) {
      console.warn(`[EntityReplication-${entityType}] Failed to read totalCount from localStorage:`, e);
    }

    return 0;
  }

  /**
   * Manual pull - завантажує наступний batch даних
   * @param entityType - тип сутності
   * @param limit - скільки записів завантажити (з view config rows)
   * @returns кількість завантажених записів
   */
  async manualPull(entityType: string, limit?: number): Promise<number> {
    const replicationState = this.replicationStates.get(entityType);

    if (!replicationState) {
      console.error(`[EntityReplication] No replication for ${entityType}`);
      return 0;
    }

    try {
      // Get collection and checkpoint
      const collection = replicationState.collection;
      const schema = collection.schema.jsonSchema;

      // Get current checkpoint by finding the latest document in RxDB
      // This ensures we always continue from where RxDB actually is
      const latestDoc = await collection.findOne({
        sort: [{ updated_at: 'desc' }]
      }).exec();

      let checkpoint = null;
      if (latestDoc) {
        checkpoint = {
          updated_at: latestDoc.updated_at,
          pulled: true,
          lastPullAt: new Date().toISOString()
        };
      }

      // Calculate checkpoint date (exact, no -5sec for manual)
      const checkpointDate = checkpoint?.updated_at
        ? checkpoint.updated_at
        : new Date(0).toISOString();

      // Direct fetch from Supabase
      const { data, error } = await this.supabase
        .from(entityType)
        .select('*')
        .gt('updated_at', checkpointDate)
        .order('updated_at', { ascending: true })
        .limit(limit || 30);

      if (error) {
        console.error(`[EntityReplication-${entityType}] Manual pull error:`, error);
        return 0;
      }

      if (!data || data.length === 0) {
        return 0;
      }

      // Map Supabase documents to RxDB format
      const documents = data.map(doc => this.mapSupabaseToRxDB(entityType, doc, schema));

      // Use bulkUpsert for batch insert to avoid multiple UI updates
      try {
        await collection.bulkUpsert(documents);
      } catch (e) {
        console.error(`[EntityReplication-${entityType}] Bulk upsert failed:`, e);
        return 0;
      }

      const inserted = documents.length;

      // Update checkpoint in metadata
      const newCheckpoint = {
        updated_at: documents[documents.length - 1].updated_at,
        pulled: true,
        lastPullAt: new Date().toISOString()
      };

      const currentMetadata = this.entityMetadata.get(entityType) || {
        total: 0,
        lastSync: new Date().toISOString()
      };
      const updatedMetadata = {
        ...currentMetadata,
        lastCheckpoint: newCheckpoint
      };
      this.entityMetadata.set(entityType, updatedMetadata);

      // Also save to localStorage for persistence
      try {
        localStorage.setItem(`checkpoint_${entityType}`, JSON.stringify(newCheckpoint));
      } catch (e) {
        console.warn(`[EntityReplication-${entityType}] Failed to save checkpoint to localStorage:`, e);
      }

      return inserted;
    } catch (error) {
      console.error(`[EntityReplication-${entityType}] Manual pull error:`, error);
      return 0;
    }
  }
}

// Singleton instance
export const entityReplicationService = new EntityReplicationService();