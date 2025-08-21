import { RxDatabase, RxCollection, RxDocument } from 'rxdb';
import { supabase } from './client';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Two-way synchronization between RxDB and Supabase
 * Handles real-time updates, conflict resolution, and optimistic updates
 */
export class TwoWaySync {
  private db: RxDatabase;
  private channels: Map<string, RealtimeChannel> = new Map();
  private syncStatus: Map<string, 'syncing' | 'synced' | 'error'> = new Map();
  
  constructor(database: RxDatabase) {
    this.db = database;
  }

  /**
   * Start two-way sync for a collection
   */
  async startSync(collectionName: string, tableName: string) {
    console.log(`🔄 Starting two-way sync for ${collectionName} <-> ${tableName}`);
    
    const collection = this.db.collections[collectionName];
    if (!collection) {
      throw new Error(`Collection ${collectionName} not found`);
    }

    // 1. Initial pull from Supabase
    await this.pullFromSupabase(collection, tableName);
    
    // 2. Setup push on local changes
    this.setupLocalChangeListener(collection, tableName);
    
    // 3. Setup real-time subscription
    await this.setupRealtimeSync(collection, tableName);
    
    this.syncStatus.set(collectionName, 'synced');
    console.log(`✅ Two-way sync started for ${collectionName}`);
  }

  /**
   * Pull all data from Supabase
   */
  private async pullFromSupabase(collection: RxCollection, tableName: string) {
    try {
      console.log(`⬇️ Pulling data from ${tableName}...`);
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('modified_on', { ascending: false });
      
      if (error) {
        console.error('Pull error:', error);
        return;
      }

      if (data && data.length > 0) {
        // Bulk upsert with conflict resolution
        const documents = data.map(doc => this.prepareDocument(doc));
        await collection.bulkUpsert(documents);
        console.log(`✅ Pulled ${data.length} documents from ${tableName}`);
      }
    } catch (error) {
      console.error('Pull failed:', error);
    }
  }

  /**
   * Setup listener for local RxDB changes
   */
  private setupLocalChangeListener(collection: RxCollection, tableName: string) {
    // Watch for all changes using the $ observable
    collection.$.subscribe(async (changeEvent) => {
      if (!changeEvent || changeEvent.isLocal === false) return;
      
      console.log(`📝 Local change detected:`, changeEvent.operation);
      
      // Get all current documents
      const docs = await collection.find().exec();
      const localIds = new Set(docs.map(d => d.id));
      
      // Check what changed by comparing with Supabase
      for (const doc of docs) {
        const docData = doc.toJSON();
        // Skip if this came from Supabase
        if (docData._sync_source === 'supabase') continue;
        
        // Push to Supabase
        await this.pushToSupabase(tableName, docData, 'UPDATE');
      }
    });
    
    console.log(`👂 Listening for changes on ${collection.name}`);
  }

  /**
   * Push changes to Supabase
   */
  private async pushToSupabase(
    tableName: string, 
    document: any, 
    operation: 'INSERT' | 'UPDATE' | 'DELETE'
  ) {
    try {
      // Add sync metadata
      const docWithMeta = {
        ...document,
        _sync_source: 'rxdb',
        _sync_timestamp: new Date().toISOString()
      };

      if (operation === 'DELETE') {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', document.id);
        
        if (error) throw error;
        console.log(`✅ Pushed delete to ${tableName}`);
      } else {
        const { error } = await supabase
          .from(tableName)
          .upsert(docWithMeta);
        
        if (error) throw error;
        console.log(`✅ Pushed ${operation.toLowerCase()} to ${tableName}`);
      }
    } catch (error) {
      console.error(`Push to ${tableName} failed:`, error);
      // Queue for retry
      await this.queueForRetry(tableName, document, operation);
    }
  }

  /**
   * Setup real-time subscription
   */
  private async setupRealtimeSync(collection: RxCollection, tableName: string) {
    console.log(`📡 Setting up realtime for ${tableName}...`);
    
    const channel = supabase
      .channel(`${tableName}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName
        },
        async (payload) => {
          console.log(`📨 Realtime event from ${tableName}:`, payload.eventType);
          
          // Skip if change came from RxDB (avoid loop)
          if (payload.new?._sync_source === 'rxdb') {
            console.log('Skipping own change');
            return;
          }

          await this.handleRealtimeChange(collection, payload);
        }
      )
      .subscribe();

    this.channels.set(tableName, channel);
  }

  /**
   * Handle real-time change from Supabase
   */
  private async handleRealtimeChange(collection: RxCollection, payload: any) {
    try {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const document = this.prepareDocument(payload.new);
        
        // Check for conflicts
        const existing = await collection.findOne(document.id).exec();
        if (existing) {
          const resolved = await this.resolveConflict(existing.toJSON(), document);
          await collection.upsert(resolved);
        } else {
          await collection.upsert(document);
        }
      } else if (payload.eventType === 'DELETE') {
        const doc = await collection.findOne(payload.old.id).exec();
        if (doc) {
          await doc.remove();
        }
      }
    } catch (error) {
      console.error('Failed to handle realtime change:', error);
    }
  }

  /**
   * Conflict resolution strategy
   */
  private async resolveConflict(local: any, remote: any): Promise<any> {
    console.log('⚠️ Conflict detected, resolving...');
    
    // Strategy 1: Last Write Wins (LWW)
    const localTime = new Date(local.modified_on || local.updated_at || 0).getTime();
    const remoteTime = new Date(remote.modified_on || remote.updated_at || 0).getTime();
    
    if (localTime > remoteTime) {
      console.log('✅ Keeping local version (newer)');
      return local;
    } else if (remoteTime > localTime) {
      console.log('✅ Taking remote version (newer)');
      return remote;
    } else {
      // Strategy 2: Merge fields
      console.log('✅ Merging changes');
      return this.mergeDocuments(local, remote);
    }
  }

  /**
   * Merge two documents
   */
  private mergeDocuments(local: any, remote: any): any {
    const merged = { ...local };
    
    // Merge arrays (union)
    for (const key in remote) {
      if (Array.isArray(remote[key]) && Array.isArray(local[key])) {
        merged[key] = [...new Set([...local[key], ...remote[key]])];
      } else if (typeof remote[key] === 'object' && typeof local[key] === 'object') {
        // Deep merge objects
        merged[key] = { ...local[key], ...remote[key] };
      } else if (remote[key] !== local[key]) {
        // Take remote for simple values
        merged[key] = remote[key];
      }
    }
    
    // Update timestamp
    merged.modified_on = new Date().toISOString();
    merged._merged = true;
    
    return merged;
  }

  /**
   * Prepare document for RxDB
   */
  private prepareDocument(doc: any): any {
    // Ensure all required fields
    return {
      ...doc,
      id: doc.id || this.generateId(),
      name: doc.name || '',
      admin_name: doc.admin_name || '',
      url: doc.url || '',
      created_on: doc.created_on || new Date().toISOString(),
      modified_on: doc.modified_on || new Date().toISOString()
    };
  }

  /**
   * Queue failed operations for retry
   */
  private async queueForRetry(tableName: string, document: any, operation: string) {
    const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    queue.push({
      tableName,
      document,
      operation,
      timestamp: new Date().toISOString(),
      retries: 0
    });
    localStorage.setItem('sync_queue', JSON.stringify(queue));
    console.log('📋 Queued for retry');
  }

  /**
   * Process retry queue
   */
  async processRetryQueue() {
    const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    const remaining = [];
    
    for (const item of queue) {
      if (item.retries < 3) {
        try {
          await this.pushToSupabase(item.tableName, item.document, item.operation);
        } catch (error) {
          item.retries++;
          remaining.push(item);
        }
      }
    }
    
    localStorage.setItem('sync_queue', JSON.stringify(remaining));
  }

  /**
   * Generate unique ID (UUID v4 format)
   */
  private generateId(): string {
    // Generate UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Get sync status
   */
  getSyncStatus(collectionName: string): 'syncing' | 'synced' | 'error' | 'not-synced' {
    return this.syncStatus.get(collectionName) || 'not-synced';
  }

  /**
   * Stop sync for a collection
   */
  async stopSync(tableName: string) {
    const channel = this.channels.get(tableName);
    if (channel) {
      await channel.unsubscribe();
      this.channels.delete(tableName);
      console.log(`🛑 Stopped sync for ${tableName}`);
    }
  }

  /**
   * Stop all syncs
   */
  async stopAll() {
    for (const [tableName, channel] of this.channels) {
      await channel.unsubscribe();
    }
    this.channels.clear();
    this.syncStatus.clear();
    console.log('🛑 All syncs stopped');
  }
}