import { RxCollection, RxReplicationState } from 'rxdb';
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BreedDocType } from '../types/breed.types';

export interface ReplicationConfig {
  supabaseUrl: string;
  supabaseKey: string;
  batchSize?: number;
  pullInterval?: number;
}

export class SupabaseReplicationService {
  private supabase: SupabaseClient;
  private replications: Map<string, RxReplicationState<any, any>> = new Map();

  constructor(private config: ReplicationConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
  }

  public async setupBreedsReplication(
    collection: RxCollection<BreedDocType>
  ): Promise<RxReplicationState<BreedDocType, any>> {
    console.log('[SupabaseReplication] Setting up breeds replication...');

    const replicationState = await replicateRxCollection({
      collection,
      replicationIdentifier: 'breeds-supabase-replication',
      deletedField: '_deleted',
      live: true,
      retryTime: 5 * 1000, // 5 seconds
      waitForLeadership: true,
      autoStart: true,

      push: {
        batchSize: this.config.batchSize || 5,
        handler: async (docs) => {
          console.log('[SupabaseReplication] Pushing', docs.length, 'breeds to Supabase');
          
          const conflicts: any[] = [];
          
          for (const doc of docs) {
            try {
              const { data, error } = await this.supabase
                .from('breeds')
                .upsert({
                  id: doc.id,
                  name: doc.name,
                  description: doc.description,
                  origin: doc.origin,
                  size: doc.size,
                  lifespan: doc.lifespan,
                  traits: doc.traits,
                  colors: doc.colors,
                  image: doc.image,
                  workspace_id: doc.workspaceId,
                  space_id: doc.spaceId,
                  created_at: doc.createdAt,
                  updated_at: doc.updatedAt || new Date().toISOString(),
                  deleted: doc._deleted || false
                })
                .select()
                .single();

              if (error) {
                console.error('[SupabaseReplication] Push error:', error);
                conflicts.push(doc);
              }
            } catch (error) {
              console.error('[SupabaseReplication] Push exception:', error);
              conflicts.push(doc);
            }
          }

          return conflicts;
        }
      },

      pull: {
        batchSize: this.config.batchSize || 10,
        handler: async (checkpoint, batchSize) => {
          console.log('[SupabaseReplication] Pulling breeds from Supabase...');
          
          const lastUpdatedAt = checkpoint?.updatedAt || '1970-01-01T00:00:00.000Z';
          
          const { data, error } = await this.supabase
            .from('breeds')
            .select('*')
            .gt('updated_at', lastUpdatedAt)
            .order('updated_at', { ascending: true })
            .limit(batchSize);

          if (error) {
            console.error('[SupabaseReplication] Pull error:', error);
            throw error;
          }

          const documents: BreedDocType[] = (data || []).map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            origin: row.origin,
            size: row.size,
            lifespan: row.lifespan,
            traits: row.traits,
            colors: row.colors,
            image: row.image,
            workspaceId: row.workspace_id,
            spaceId: row.space_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            _deleted: row.deleted || false
          }));

          const newCheckpoint = documents.length > 0
            ? { updatedAt: documents[documents.length - 1].updatedAt }
            : checkpoint;

          return {
            documents,
            checkpoint: newCheckpoint
          };
        }
      }
    });

    // Setup real-time subscription
    this.setupRealtimeSubscription(collection);

    // Store replication state
    this.replications.set('breeds', replicationState);

    // Monitor replication
    replicationState.error$.subscribe(error => {
      console.error('[SupabaseReplication] Replication error:', error);
    });

    replicationState.active$.subscribe(active => {
      console.log('[SupabaseReplication] Replication active:', active);
    });

    return replicationState;
  }

  private setupRealtimeSubscription(collection: RxCollection<BreedDocType>): void {
    const channel = this.supabase
      .channel('breeds-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'breeds' 
        },
        async (payload) => {
          console.log('[SupabaseReplication] Real-time change:', payload.eventType);
          
          if (payload.eventType === 'DELETE') {
            // Handle deletion
            const doc = await collection.findOne(payload.old.id).exec();
            if (doc) {
              await doc.update({ $set: { _deleted: true } });
            }
          } else {
            // Trigger pull for INSERT and UPDATE
            const replicationState = this.replications.get('breeds');
            if (replicationState) {
              await replicationState.reSync();
            }
          }
        }
      )
      .subscribe();

    console.log('[SupabaseReplication] Real-time subscription setup complete');
  }

  public getReplicationState(collection: string): RxReplicationState<any, any> | undefined {
    return this.replications.get(collection);
  }

  public async stopReplication(collection: string): Promise<void> {
    const replicationState = this.replications.get(collection);
    if (replicationState) {
      await replicationState.cancel();
      this.replications.delete(collection);
    }
  }

  public async stopAllReplications(): Promise<void> {
    for (const [key, replicationState] of this.replications) {
      await replicationState.cancel();
    }
    this.replications.clear();
  }
}