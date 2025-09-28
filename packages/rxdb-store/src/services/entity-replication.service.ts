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

  constructor() {
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and key must be provided in environment variables');
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
      for (const key in supabaseDoc) {
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

    console.log(`[EntityReplication-${entityType}] Mapped from Supabase:`, {
      id: mapped.id,
      deleted_supabase: supabaseDoc.deleted,
      deleted_rxdb: mapped._deleted
    });

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
        live: true,
        retryTime: options.pullInterval || 60 * 1000, // Default 60 seconds
        waitForLeadership: false,
        autoStart: true,

        pull: {
          handler: async (checkpointOrNull, batchSize) => {
            console.log(`[EntityReplication-${entityType}] Pull handler called`, {
              checkpoint: checkpointOrNull,
              batchSize
            });

            // Rate limiting
            const activeReqs = this.activeRequests.get(entityType) || 0;
            if (activeReqs >= this.maxConcurrentRequests) {
              console.log(`[EntityReplication-${entityType}] Too many active requests, waiting...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }

            this.activeRequests.set(entityType, activeReqs + 1);

            // Use larger limit for initial load (when no checkpoint)
            const isInitialLoad = !checkpointOrNull?.updated_at;
            const limit = isInitialLoad
              ? 500  // Large batch for initial load
              : (batchSize || options.batchSize || 50);  // Normal batch for incremental updates

            const checkpointDate = checkpointOrNull?.updated_at
              ? new Date(new Date(checkpointOrNull.updated_at).getTime() - 5000).toISOString()
              : new Date(0).toISOString();

            if (isInitialLoad) {
              console.log(`[EntityReplication-${entityType}] Initial load - fetching up to ${limit} records`);
            }

            try {
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

              const documents = (data || []).map(doc =>
                this.mapSupabaseToRxDB(entityType, doc, schema)
              );

              const newCheckpoint = documents.length > 0
                ? {
                    updated_at: documents[documents.length - 1].updated_at,
                    pulled: true
                  }
                : { ...checkpointOrNull, pulled: true };

              console.log(`[EntityReplication-${entityType}] Pull completed`, {
                documentsCount: documents.length,
                newCheckpoint
              });

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
            console.log(`[EntityReplication-${entityType}] Push handler called`, {
              rowsCount: rows.length
            });

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
}

// Singleton instance
export const entityReplicationService = new EntityReplicationService();