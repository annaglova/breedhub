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
        retryTime: 30 * 1000, // Increased to 30 seconds to reduce load
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
          const lastUpdatedAt = checkpointOrNull?.updatedAt || new Date(0).toISOString();

          try {
            const { data, error } = await serviceInstance.supabase
              .from('books')
              .select('*')
              .gt('updated_at', lastUpdatedAt)
              .order('updated_at', { ascending: true })
              .limit(limit);

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
    } catch (error) {
      console.error('[BooksReplication] Setup failed:', error);
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