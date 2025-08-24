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

  // Diagnostic method to check empty breeds
  public async diagnoseEmptyBreeds(): Promise<void> {
    console.log('[SupabaseReplication] Diagnosing empty breeds...');
    
    try {
      // 1. Count empty breeds
      const { count: emptyCount, error: countError } = await this.supabase
        .from('breed')
        .select('*', { count: 'exact', head: true })
        .or('name.is.null,name.eq.');
      
      if (countError) {
        console.error('[SupabaseReplication] Count error:', countError);
        return;
      }
      
      console.log('[SupabaseReplication] Found', emptyCount, 'empty breeds');
      
      // 2. Get sample of empty breeds
      const { data: emptyBreeds, error: selectError } = await this.supabase
        .from('breed')
        .select('id, name, created_on, modified_on')
        .or('name.is.null,name.eq.')
        .limit(5);
      
      if (selectError) {
        console.error('[SupabaseReplication] Select error:', selectError);
        return;
      }
      
      console.log('[SupabaseReplication] Sample empty breeds:', emptyBreeds);
      
      // 3. Try to delete just ONE empty breed to test
      if (emptyBreeds && emptyBreeds.length > 0) {
        console.log('[SupabaseReplication] Trying to delete single breed:', emptyBreeds[0].id);
        
        const { error: deleteError, count } = await this.supabase
          .from('breed')
          .delete({ count: 'exact' })
          .eq('id', emptyBreeds[0].id);
        
        if (deleteError) {
          console.error('[SupabaseReplication] Single delete error:', deleteError);
          console.error('[SupabaseReplication] This might indicate table locks or constraints');
        } else {
          console.log('[SupabaseReplication] Successfully deleted 1 breed, count:', count);
        }
      }
      
    } catch (err) {
      console.error('[SupabaseReplication] Diagnose error:', err);
    }
  }

  // Manual fetch from Supabase (one-time load)
  // Delete empty breeds from Supabase in batches
  public async deleteEmptyBreeds(): Promise<number> {
    console.log('[SupabaseReplication] Deleting empty breeds from Supabase in batches...');
    
    let totalDeleted = 0;
    const batchSize = 100; // Delete 100 at a time
    
    try {
      // First, get count of empty breeds
      const { count: emptyCount } = await this.supabase
        .from('breed')
        .select('*', { count: 'exact', head: true })
        .or('name.is.null,name.eq.');
      
      console.log('[SupabaseReplication] Found', emptyCount, 'empty breeds to delete');
      
      if (!emptyCount || emptyCount === 0) {
        console.log('[SupabaseReplication] No empty breeds found');
        return 0;
      }
      
      // Delete in batches
      while (totalDeleted < emptyCount) {
        console.log(`[SupabaseReplication] Deleting batch... (${totalDeleted}/${emptyCount})`);
        
        // Get IDs of next batch of empty breeds
        const { data: emptyBreeds, error: selectError } = await this.supabase
          .from('breed')
          .select('id')
          .or('name.is.null,name.eq.')
          .limit(batchSize);
        
        if (selectError) {
          console.error('[SupabaseReplication] Select error:', selectError);
          break;
        }
        
        if (!emptyBreeds || emptyBreeds.length === 0) {
          console.log('[SupabaseReplication] No more empty breeds found');
          break;
        }
        
        // Delete this batch by IDs
        const idsToDelete = emptyBreeds.map(b => b.id);
        console.log(`[SupabaseReplication] Deleting ${idsToDelete.length} breeds...`);
        
        const { error: deleteError, count } = await this.supabase
          .from('breed')
          .delete({ count: 'exact' })
          .in('id', idsToDelete);
        
        if (deleteError) {
          console.error('[SupabaseReplication] Batch delete error:', deleteError);
          // Try to continue with next batch
          break;
        }
        
        const deletedCount = count || 0;
        totalDeleted += deletedCount;
        console.log(`[SupabaseReplication] Deleted ${deletedCount} breeds in this batch, total: ${totalDeleted}`);
        
        // Small delay between batches to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log('[SupabaseReplication] Total deleted:', totalDeleted);
      return totalDeleted;
      
    } catch (err) {
      console.error('[SupabaseReplication] Delete empty breeds error:', err);
      console.log('[SupabaseReplication] Managed to delete', totalDeleted, 'breeds before error');
      throw err;
    }
  }


  public async fetchBreedsFromSupabase(limit: number = 100): Promise<BreedDocType[]> {
    console.log('[SupabaseReplication] Fetching breeds from Supabase...');
    
    try {
      const { data, error } = await this.supabase
        .from('breed')
        .select('*')
        .not('name', 'is', null)  // Only breeds with names
        .neq('name', '')  // Not empty names
        .order('modified_on', { ascending: false }) // Newest modified first
        .limit(limit);

      if (error) {
        console.error('[SupabaseReplication] Fetch error:', error);
        throw error;
      }

      console.log('[SupabaseReplication] Fetched', data?.length || 0, 'breeds');
      if (data && data.length > 0) {
        console.log('[SupabaseReplication] Sample breed from fetch:', data[0]);
      }

      return (data || []).map(row => ({
        id: row.id,
        name: row.name || '',
        description: row.description || null,
        workspaceId: row.account_id || null,
        createdAt: row.created_on 
          ? new Date(row.created_on).toISOString() 
          : new Date().toISOString(),
        updatedAt: row.modified_on 
          ? new Date(row.modified_on).toISOString() 
          : new Date().toISOString(),
        _deleted: row.deleted || false
      }));
    } catch (err) {
      console.error('[SupabaseReplication] Fetch error:', err);
      throw err;
    }
  }

  public async setupBreedsReplication(
    collection: RxCollection<BreedDocType>
  ): Promise<RxReplicationState<BreedDocType, any>> {
    console.log('[SupabaseReplication] Setting up breeds replication...');

    const replicationState = await replicateRxCollection({
      collection,
      replicationIdentifier: 'breeds-supabase-replication',
      deletedField: '_deleted',
      live: false, // Disable live sync to prevent continuous updates
      retryTime: 30 * 1000, // 30 seconds
      waitForLeadership: true,
      autoStart: true, // Enable auto-start for automatic sync

      push: {
        batchSize: this.config.batchSize || 5,
        handler: async (docs) => {
          console.log('[SupabaseReplication] Pushing', docs.length, 'breeds to Supabase');
          
          const conflicts: any[] = [];
          
          for (const doc of docs) {
            try {
              const { data, error } = await this.supabase
                .from('breed')  // Changed from 'breeds' to 'breed'
                .upsert({
                  // Direct mapping back to Supabase
                  id: doc.id,
                  name: doc.name || '',
                  description: doc.description || '',
                  account_id: doc.workspaceId,
                  created_on: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
                  modified_on: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
                  deleted: doc._deleted || false  // Maps from '_deleted' to 'deleted'
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
        batchSize: this.config.batchSize || 50,
        handler: async (checkpoint, batchSize) => {
          console.log('[SupabaseReplication] Pull handler called with checkpoint:', JSON.stringify(checkpoint));
          
          // Stop after first pull to prevent infinite loop
          if (checkpoint?.pulled === true) {
            console.log('[SupabaseReplication] Already pulled data, stopping to prevent infinite loop');
            return {
              documents: [],
              checkpoint: checkpoint
            };
          }
          
          try {
            // Pull only once - get breeds with names
            const { data, error } = await this.supabase
              .from('breed')
              .select('*')
              .not('name', 'is', null)  // Only breeds with names
              .neq('name', '')  // Not empty names
              .order('modified_on', { ascending: false }) // Newest modified first
              .limit(20); // Limit to 20 for testing

            if (error) {
              console.error('[SupabaseReplication] Pull error:', error);
              throw error;
            }

            console.log('[SupabaseReplication] Pulled', data?.length || 0, 'breeds from Supabase (limit 20)');
            console.log('[SupabaseReplication] First breed data:', JSON.stringify(data?.[0], null, 2));

            const documents: BreedDocType[] = (data || []).map((row, index) => {
              const doc = {
                // Simple direct mapping
                id: row.id,
                name: row.name || '',
                description: row.description || null,
                workspaceId: row.account_id || null,
                // Ensure proper ISO date format with Z suffix
                createdAt: row.created_on 
                  ? new Date(row.created_on).toISOString() 
                  : new Date().toISOString(),
                updatedAt: row.modified_on 
                  ? new Date(row.modified_on).toISOString() 
                  : new Date().toISOString(),
                _deleted: row.deleted || false  // Maps from 'deleted' to '_deleted'
              };
              
              // Log first mapped document
              if (index === 0) {
                console.log('[SupabaseReplication] First mapped document:', JSON.stringify(doc, null, 2));
              }
              
              return doc;
            });

            // Simple checkpoint to prevent infinite loop
            const newCheckpoint = {
              pulled: true,
              lastPullTime: new Date().toISOString(),
              count: documents.length
            };

            console.log('[SupabaseReplication] Returning', documents.length, 'documents to RxDB');
            console.log('[SupabaseReplication] New checkpoint:', newCheckpoint);

            return {
              documents,
              checkpoint: newCheckpoint
            };
          } catch (err) {
            console.error('[SupabaseReplication] Pull handler error:', err);
            // Return empty with checkpoint to stop pulling on error
            return {
              documents: [],
              checkpoint: { pulled: true, updatedAt: new Date().toISOString() }
            };
          }
        }
      }
    });

    // Setup real-time subscription - disabled for now to prevent conflicts
    // this.setupRealtimeSubscription(collection);

    // Store replication state
    this.replications.set('breeds', replicationState);

    // Monitor replication
    if (replicationState.error$) {
      replicationState.error$.subscribe(error => {
        console.error('[SupabaseReplication] Replication error:', error);
      });
    }

    if (replicationState.active$) {
      replicationState.active$.subscribe(active => {
        console.log('[SupabaseReplication] Replication active:', active);
      });
    }
    
    // Manually trigger initial pull
    console.log('[SupabaseReplication] Manually triggering initial pull...');
    await replicationState.reSync();
    
    // Don't wait - let it sync in background
    console.log('[SupabaseReplication] Initial sync triggered, continuing...');

    // Log successful syncs - these observables might not exist
    if ((replicationState as any).send$) {
      (replicationState as any).send$.subscribe((docs: any) => {
        console.log('[SupabaseReplication] Sent docs:', docs);
      });
    }

    if ((replicationState as any).received$) {
      (replicationState as any).received$.subscribe((docs: any) => {
        console.log('[SupabaseReplication] Received docs:', docs);
      });
    }

    return replicationState;
  }

  private setupRealtimeSubscription(collection: RxCollection<BreedDocType>): void {
    const channel = this.supabase
      .channel('breed-changes')  // Changed channel name
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'breed'  // Changed from 'breeds' to 'breed'
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