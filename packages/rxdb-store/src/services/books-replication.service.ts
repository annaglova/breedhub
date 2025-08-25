import { replicateRxCollection, RxReplicationState } from 'rxdb/plugins/replication';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getDatabase } from './database.service';
import { Book, BookSupabase } from '../types/book.types';

export class BooksReplicationService {
  private static instance: BooksReplicationService;
  private replicationState: RxReplicationState<Book, any> | null = null;
  private isRealTimeEnabled = false;
  private realtimeChannel: any = null;
  private supabase: SupabaseClient;
  private pullInterval: any = null;
  private activeRequests = 0;
  private maxConcurrentRequests = 3;

  private constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and key must be provided in environment variables');
    }
    
    // Create client with connection pooling settings
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

  static getInstance(): BooksReplicationService {
    if (!BooksReplicationService.instance) {
      BooksReplicationService.instance = new BooksReplicationService();
    }
    return BooksReplicationService.instance;
  }

  private mapSupabaseToRxDB(supabaseBook: BookSupabase): Book {
    const mapped = {
      id: supabaseBook.id,
      title: supabaseBook.title,
      author: supabaseBook.author,
      isbn: supabaseBook.isbn,
      genre: supabaseBook.genre,
      year: supabaseBook.year,
      pages: supabaseBook.pages,
      rating: supabaseBook.rating,
      available: supabaseBook.available,
      description: supabaseBook.description,
      tags: supabaseBook.tags || [],
      metadata: supabaseBook.metadata || {},
      accountId: supabaseBook.account_id,
      spaceId: supabaseBook.space_id,
      createdAt: supabaseBook.created_at,
      updatedAt: supabaseBook.updated_at,
      _deleted: Boolean(supabaseBook.deleted)  // Ensure it's a boolean
    };
    
    console.log('[BooksReplication] Mapping from Supabase:', {
      id: supabaseBook.id,
      deleted_supabase: supabaseBook.deleted,
      deleted_rxdb: mapped._deleted,
      type: typeof supabaseBook.deleted
    });
    
    return mapped;
  }

  private mapRxDBToSupabase(rxdbBook: Book): Partial<BookSupabase> {
    return {
      id: rxdbBook.id,
      title: rxdbBook.title,
      author: rxdbBook.author,
      isbn: rxdbBook.isbn,
      genre: rxdbBook.genre,
      year: rxdbBook.year,
      pages: rxdbBook.pages,
      rating: rxdbBook.rating,
      available: rxdbBook.available,
      description: rxdbBook.description,
      tags: rxdbBook.tags,
      metadata: rxdbBook.metadata,
      account_id: rxdbBook.accountId,
      space_id: rxdbBook.spaceId,
      created_at: rxdbBook.createdAt,
      updated_at: rxdbBook.updatedAt,
      deleted: rxdbBook._deleted || false
    };
  }

  async setupBooksReplication() {
    console.log('[BooksReplication] Setting up replication...');
    
    const db = await getDatabase();
    console.log('[BooksReplication] Got database instance');
    console.log('[BooksReplication] Database type:', typeof db);
    console.log('[BooksReplication] Database keys:', Object.keys(db));
    console.log('[BooksReplication] Database collections (non-private):', Object.keys(db).filter(key => !key.startsWith('_')));
    
    // Check if books exists
    console.log('[BooksReplication] Checking for books collection...');
    console.log('[BooksReplication] db.books exists?', !!db.books);
    console.log('[BooksReplication] db.books type:', typeof db.books);
    
    if (!db.books) {
      console.error('[BooksReplication] Books collection not found in database');
      console.error('[BooksReplication] Available collections:', Object.keys(db).filter(key => !key.startsWith('_')));
      
      // Try to see if we have breeds collection
      console.log('[BooksReplication] db.breeds exists?', !!db.breeds);
      
      return;
    }

    if (this.replicationState) {
      console.log('[BooksReplication] Replication already active');
      return;
    }

    // Store reference to this for use in handlers
    const serviceInstance = this;

    try {
      this.replicationState = await replicateRxCollection<Book, any>({
        collection: db.books,
        replicationIdentifier: 'books-supabase-replication',
        deletedField: '_deleted',
        live: true,
        retryTime: 60 * 1000, // 60 seconds - rely on Realtime instead
        waitForLeadership: false,
        autoStart: true,

        pull: {
          async handler(checkpointOrNull, batchSize) {
          console.log('[BooksReplication] Pull handler called', { 
            checkpoint: checkpointOrNull, 
            batchSize 
          });

          // Rate limiting
          if (serviceInstance.activeRequests >= serviceInstance.maxConcurrentRequests) {
            console.log('[BooksReplication] Too many active requests, waiting...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          serviceInstance.activeRequests++;
          
          const limit = batchSize || 50; // Reduced limit to avoid overload
          // Use server time minus 5 seconds to avoid missing updates due to time differences
          const checkpointDate = checkpointOrNull?.updatedAt 
            ? new Date(new Date(checkpointOrNull.updatedAt).getTime() - 5000).toISOString() // Subtract 5 seconds for overlap
            : new Date(0).toISOString();
          
          console.log('[BooksReplication] Pull params:', {
            checkpointDate,
            originalCheckpoint: checkpointOrNull?.updatedAt,
            limit,
            checkpointOrNull
          });

          try {
            const { data, error } = await serviceInstance.supabase
              .from('books')
              .select('*')
              .gt('updated_at', checkpointDate) // Use > to avoid duplicates, with 5 second overlap
              .order('updated_at', { ascending: true })
              .limit(limit);
              
            console.log('[BooksReplication] Supabase response:', {
              dataCount: data?.length || 0,
              error,
              data: data?.slice(0, 2) // Show first 2 for debugging
            });

            if (error) {
              console.error('[BooksReplication] Pull error:', error);
              return {
                documents: [],
                checkpoint: checkpointOrNull
              };
            }

            const documents = (data || []).map(book => 
              serviceInstance.mapSupabaseToRxDB(book)
            );

            const newCheckpoint = documents.length > 0
              ? { 
                  updatedAt: documents[documents.length - 1].updatedAt,
                  pulled: true
                }
              : { ...checkpointOrNull, pulled: true };

            console.log('[BooksReplication] Pull completed', {
              documentsCount: documents.length,
              newCheckpoint
            });

            serviceInstance.activeRequests--;
            
            return {
              documents,
              checkpoint: newCheckpoint
            };
          } catch (error) {
            console.error('[BooksReplication] Pull failed:', error);
            serviceInstance.activeRequests--;
            
            return {
              documents: [],
              checkpoint: checkpointOrNull
            };
          } finally {
            // Ensure counter is decremented
            if (serviceInstance.activeRequests > 0) {
              serviceInstance.activeRequests--;
            }
          }
        },
        batchSize: 20, // Reduced batch size to avoid overload
        modifier: (doc: any) => doc
      },

      push: {
        async handler(rows) {
          console.log('[BooksReplication] Push handler called', {
            rowsCount: rows.length
          });

          const conflicts: any[] = [];

          for (const row of rows) {
            try {
              const bookData = serviceInstance.mapRxDBToSupabase(
                row.newDocumentState as Book
              );
              
              console.log('[BooksReplication] Push row:', {
                id: row.newDocumentState.id,
                _deleted: row.newDocumentState._deleted,
                _deleted_type: typeof row.newDocumentState._deleted,
                assumedDeleted: row.assumedMasterState?._deleted
              });

              // Check for deletion - handle both boolean and string values
              const isDeleted = row.newDocumentState._deleted === true || 
                               row.newDocumentState._deleted === 1 || 
                               row.newDocumentState._deleted === "1" || 
                               row.newDocumentState._deleted === "true";
              
              const wasDeleted = row.assumedMasterState?._deleted === true || 
                                row.assumedMasterState?._deleted === 1 || 
                                row.assumedMasterState?._deleted === "1" || 
                                row.assumedMasterState?._deleted === "true";

              if (wasDeleted || isDeleted) {
                console.log('[BooksReplication] Pushing delete for:', bookData.id);
                
                // Use upsert to ensure the record exists and is marked as deleted
                const { error } = await serviceInstance.supabase
                  .from('books')
                  .upsert({
                    ...bookData,
                    deleted: true,
                    updated_at: new Date().toISOString()
                  }, { onConflict: 'id' });

                if (error) {
                  console.error('[BooksReplication] Delete error:', error);
                  // Add to conflicts instead of throwing
                  conflicts.push(row.newDocumentState);
                } else {
                  console.log('[BooksReplication] Successfully marked as deleted in Supabase:', bookData.id);
                }
              } else {
                const { error } = await serviceInstance.supabase
                  .from('books')
                  .upsert(bookData, { onConflict: 'id' });

                if (error) {
                  console.error('[BooksReplication] Upsert error:', error);
                  // Add to conflicts instead of throwing
                  conflicts.push(row.newDocumentState);
                }
              }
            } catch (error) {
              console.error('[BooksReplication] Push error for row:', error);
              conflicts.push(row.newDocumentState);
            }
          }

          if (conflicts.length > 0) {
            console.error('[BooksReplication] Push had conflicts:', conflicts.length);
          }

          console.log('[BooksReplication] Push completed', {
            success: rows.length - conflicts.length,
            failed: conflicts.length
          });

          // Must return an array of conflicts
          return conflicts;
        },
        batchSize: 10,
        modifier: (doc: any) => doc
      }
    });
      
      this.replicationState.error$.subscribe((error: any) => {
        console.error('[BooksReplication] Replication error:', error);
      });

      console.log('[BooksReplication] Replication setup complete');
      
      // Setup real-time subscription for immediate updates
      await this.setupRealtimeSubscription();
      
      // DISABLED for testing pure Realtime
      // Setup manual pull interval as backup (every 10 seconds)
      // if (this.pullInterval) {
      //   clearInterval(this.pullInterval);
      // }
      // this.pullInterval = setInterval(async () => {
      //   if (this.replicationState && this.replicationState.isStopped() === false) {
      //     console.log('[BooksReplication] Manual pull trigger...');
      //     try {
      //       await this.replicationState.reSync();
      //     } catch (err) {
      //       console.log('[BooksReplication] Manual pull error:', err);
      //     }
      //   }
      // }, 10000); // Every 10 seconds
      
      console.log('[BooksReplication] ⚡ REALTIME MODE ONLY - No polling backup!');
    } catch (error) {
      console.error('[BooksReplication] Setup failed:', error);
    }
  }

  private async setupRealtimeSubscription() {
    console.log('[BooksReplication] Setting up realtime subscription...');
    
    // Check if we already have a channel
    if (this.realtimeChannel) {
      console.log('[BooksReplication] Realtime channel already exists, cleaning up...');
      await this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    
    try {
      // Subscribe to all changes on the books table
      this.realtimeChannel = this.supabase
        .channel('books-changes')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'books' 
          },
          async (payload) => {
            console.log('[BooksReplication] 🔴 REALTIME EVENT RECEIVED:', {
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
              timestamp: new Date().toISOString()
            });
            
            const db = await getDatabase();
            if (!db.books) return;
            
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const supabaseBook = payload.new as BookSupabase;
              const rxdbBook = this.mapSupabaseToRxDB(supabaseBook);
              
              try {
                // Check if document exists
                const existing = await db.books.findOne(rxdbBook.id).exec();
                
                if (existing) {
                  // Only update if Supabase version is newer
                  if (new Date(rxdbBook.updatedAt) > new Date(existing.updatedAt)) {
                    await existing.patch(rxdbBook);
                    console.log('[BooksReplication] Realtime: Updated book', rxdbBook.id);
                  }
                } else {
                  // Insert new document
                  await db.books.insert(rxdbBook);
                  console.log('[BooksReplication] Realtime: Inserted book', rxdbBook.id);
                }
              } catch (err) {
                console.error('[BooksReplication] Realtime sync error:', err);
              }
            } else if (payload.eventType === 'DELETE') {
              const bookId = (payload.old as any).id;
              
              try {
                const existing = await db.books.findOne(bookId).exec();
                if (existing) {
                  await existing.patch({ 
                    _deleted: true,
                    updatedAt: new Date().toISOString()
                  });
                  console.log('[BooksReplication] Realtime: Marked as deleted', bookId);
                }
              } catch (err) {
                console.error('[BooksReplication] Realtime delete error:', err);
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('[BooksReplication] 🟢 Realtime subscription status:', status);
          if (status === 'SUBSCRIBED') {
            this.isRealTimeEnabled = true;
            console.log('[BooksReplication] ✅ REALTIME WEBSOCKET CONNECTED! Listening for changes...');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[BooksReplication] ❌ Realtime connection error!');
          } else if (status === 'TIMED_OUT') {
            console.error('[BooksReplication] ⏱️ Realtime connection timeout!');
          }
        });
    } catch (error) {
      console.error('[BooksReplication] Realtime setup failed:', error);
    }
  }

  async stopReplication() {
    console.log('[BooksReplication] Stopping replication...');
    
    if (this.replicationState) {
      await this.replicationState.cancel();
      this.replicationState = null;
    }

    if (this.realtimeChannel) {
      await this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
      this.isRealTimeEnabled = false;
    }

    // Reset counters
    this.activeRequests = 0;
    
    // Clear any pending intervals
    if (this.pullInterval) {
      clearInterval(this.pullInterval);
      this.pullInterval = null;
    }

    console.log('[BooksReplication] Replication stopped and cleaned up');
  }

  async fetchBooksFromSupabase(limit = 1000) {
    console.log('[BooksReplication] Fetching books from Supabase...');
    
    try {
      const { data, error } = await this.supabase
        .from('books')
        .select('*')
        .eq('deleted', false)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[BooksReplication] Fetch error:', error);
        return [];
      }

      console.log('[BooksReplication] Fetched books:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('[BooksReplication] Fetch failed:', error);
      return [];
    }
  }

  isReplicationActive(): boolean {
    return this.replicationState !== null;
  }

  async forceFullSync() {
    console.log('[BooksReplication] Forcing full sync from Supabase...');
    
    try {
      // Get all non-deleted books from Supabase
      const { data, error } = await this.supabase
        .from('books')
        .select('*')
        .eq('deleted', false)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[BooksReplication] Force sync error:', error);
        return false;
      }

      console.log('[BooksReplication] Force sync got', data?.length || 0, 'books');
      
      // Get database
      const db = await getDatabase();
      if (!db.books) {
        console.error('[BooksReplication] Books collection not found');
        return false;
      }

      // Update or insert each book
      for (const supabaseBook of (data || [])) {
        const rxdbBook = this.mapSupabaseToRxDB(supabaseBook);
        
        try {
          // Try to find existing
          const existing = await db.books.findOne(rxdbBook.id).exec();
          
          if (existing) {
            // Update if Supabase version is newer
            if (new Date(rxdbBook.updatedAt) > new Date(existing.updatedAt)) {
              await existing.patch(rxdbBook);
              console.log('[BooksReplication] Updated book:', rxdbBook.id);
            }
          } else {
            // Insert new
            await db.books.insert(rxdbBook);
            console.log('[BooksReplication] Inserted book:', rxdbBook.id);
          }
        } catch (err) {
          console.error('[BooksReplication] Error syncing book:', rxdbBook.id, err);
        }
      }

      console.log('[BooksReplication] Force sync completed');
      return true;
    } catch (error) {
      console.error('[BooksReplication] Force sync failed:', error);
      return false;
    }
  }

  async deleteTestBooks() {
    console.log('[BooksReplication] Deleting test books...');
    
    try {
      const { data, error } = await this.supabase
        .from('books')
        .delete()
        .like('title', 'Test Book%')
        .select();

      if (error) {
        console.error('[BooksReplication] Delete test books error:', error);
        return { deleted: 0, error };
      }

      console.log('[BooksReplication] Deleted test books:', data?.length || 0);
      return { deleted: data?.length || 0, error: null };
    } catch (error) {
      console.error('[BooksReplication] Delete test books failed:', error);
      return { deleted: 0, error };
    }
  }
}

export const booksReplicationService = BooksReplicationService.getInstance();