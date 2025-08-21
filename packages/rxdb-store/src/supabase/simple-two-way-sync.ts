import { RxDatabase, RxCollection } from 'rxdb';
import { supabase } from './client';

/**
 * Simplified two-way sync with manual push/pull
 */
export class SimpleTwoWaySync {
  private db: RxDatabase;
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSync: Date = new Date();
  
  constructor(database: RxDatabase) {
    this.db = database;
  }

  /**
   * Manual push - send all local changes to Supabase
   */
  async pushToSupabase(collectionName: string, tableName: string) {
    const collection = this.db.collections[collectionName];
    if (!collection) {
      console.error(`Collection ${collectionName} not found`);
      return { success: false, error: 'Collection not found' };
    }

    try {
      console.log(`⬆️ Pushing ${collectionName} to Supabase...`);
      
      // Get all local documents
      const localDocs = await collection.find().exec();
      const documents = localDocs.map(doc => {
        const data = doc.toJSON();
        // Remove RxDB metadata
        delete data._attachments;
        delete data._deleted;
        delete data._meta;
        delete data._rev;
        return data;
      });

      if (documents.length === 0) {
        console.log('No documents to push');
        return { success: true, pushed: 0 };
      }

      // Upsert all documents to Supabase
      const { data, error } = await supabase
        .from(tableName)
        .upsert(documents, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Push error:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Pushed ${documents.length} documents to Supabase`);
      return { success: true, pushed: documents.length };
    } catch (error: any) {
      console.error('Push failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Manual pull - get all remote changes from Supabase
   */
  async pullFromSupabase(collectionName: string, tableName: string) {
    const collection = this.db.collections[collectionName];
    if (!collection) {
      console.error(`Collection ${collectionName} not found`);
      return { success: false, error: 'Collection not found' };
    }

    try {
      console.log(`⬇️ Pulling ${tableName} from Supabase...`);
      
      // Get all documents from Supabase
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('modified_on', { ascending: false });

      if (error) {
        console.error('Pull error:', error);
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        console.log('No documents to pull');
        return { success: true, pulled: 0 };
      }

      // Prepare documents for RxDB
      const documents = data.map(doc => ({
        ...doc,
        id: doc.id || this.generateId(),
        name: doc.name || '',
        admin_name: doc.admin_name || '',
        url: doc.url || '',
        created_on: doc.created_on || new Date().toISOString(),
        modified_on: doc.modified_on || new Date().toISOString()
      }));

      // Bulk upsert to RxDB
      await collection.bulkUpsert(documents);

      console.log(`✅ Pulled ${documents.length} documents from Supabase`);
      return { success: true, pulled: documents.length };
    } catch (error: any) {
      console.error('Pull failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Full sync - smart merge of local and remote changes
   */
  async fullSync(collectionName: string, tableName: string) {
    console.log(`🔄 Starting full sync for ${collectionName}...`);
    
    const collection = this.db.collections[collectionName];
    if (!collection) {
      return { success: false, error: 'Collection not found' };
    }
    
    try {
      // Step 1: Get local documents before pull
      const localDocsBeforePull = await collection.find().exec();
      const localMap = new Map();
      localDocsBeforePull.forEach(doc => {
        const data = doc.toJSON();
        localMap.set(data.id, {
          ...data,
          modified_on: data.modified_on || new Date().toISOString()
        });
      });
      
      // Step 2: Get remote documents
      const { data: remoteData, error } = await supabase
        .from(tableName)
        .select('*')
        .order('modified_on', { ascending: false });
      
      if (error) throw error;
      
      const remoteMap = new Map();
      (remoteData || []).forEach(doc => {
        remoteMap.set(doc.id, doc);
      });
      
      // Step 3: Merge with conflict resolution
      const toUpsertLocal: any[] = [];
      const toUpsertRemote: any[] = [];
      
      console.log(`📊 Local docs: ${localMap.size}, Remote docs: ${remoteMap.size}`);
      
      // Check remote docs - pull newer ones
      remoteMap.forEach((remoteDoc, id) => {
        const localDoc = localMap.get(id);
        if (!localDoc) {
          // New remote doc - add to local
          toUpsertLocal.push(remoteDoc);
        } else {
          // Compare timestamps for conflict resolution
          const localTime = new Date(localDoc.modified_on || 0).getTime();
          const remoteTime = new Date(remoteDoc.modified_on || 0).getTime();
          
          if (remoteTime > localTime) {
            // Remote is newer - update local
            toUpsertLocal.push(remoteDoc);
          } else if (localTime > remoteTime) {
            // Local is newer - push to remote
            toUpsertRemote.push(localDoc);
            console.log(`📤 Local newer than remote: ${localDoc.name}`);
          }
          // If equal, no action needed
        }
      });
      
      // Check local docs not in remote - push them
      localMap.forEach((localDoc, id) => {
        if (!remoteMap.has(id)) {
          // Local doc not in remote - push it
          console.log(`🆕 New local doc to push: ${id} - ${localDoc.name}`);
          const cleanDoc = { ...localDoc };
          delete cleanDoc._attachments;
          delete cleanDoc._deleted;
          delete cleanDoc._meta;
          delete cleanDoc._rev;
          toUpsertRemote.push(cleanDoc);
        }
      });
      
      console.log(`📋 To push: ${toUpsertRemote.length}, To pull: ${toUpsertLocal.length}`);
      
      // Step 4: Apply changes
      let pulled = 0;
      let pushed = 0;
      
      // Update local with remote changes
      if (toUpsertLocal.length > 0) {
        await collection.bulkUpsert(toUpsertLocal);
        pulled = toUpsertLocal.length;
        console.log(`✅ Pulled ${pulled} documents from Supabase`);
      }
      
      // Push local changes to remote
      if (toUpsertRemote.length > 0) {
        const { error: pushError } = await supabase
          .from(tableName)
          .upsert(toUpsertRemote, {
            onConflict: 'id',
            ignoreDuplicates: false
          });
        
        if (pushError) throw pushError;
        pushed = toUpsertRemote.length;
        console.log(`✅ Pushed ${pushed} documents to Supabase`);
      }
      
      this.lastSync = new Date();
      
      return {
        success: true,
        pulled,
        pushed,
        lastSync: this.lastSync
      };
      
    } catch (error: any) {
      console.error('Full sync failed:', error);
      return { 
        success: false, 
        error: error.message,
        pulled: 0,
        pushed: 0
      };
    }
  }

  /**
   * Start automatic sync with interval and change detection
   */
  async startAutoSync(collectionName: string, tableName: string, intervalMs: number = 5000) {
    console.log(`🔄 Starting auto-sync every ${intervalMs}ms`);
    
    const collection = this.db.collections[collectionName];
    if (!collection) {
      console.error(`Collection ${collectionName} not found`);
      return false;
    }
    
    // Initial sync - wait for it to complete
    console.log('🚀 Running initial sync...');
    await this.fullSync(collectionName, tableName);
    
    // Track last sync to avoid duplicate syncs
    let syncInProgress = false;
    let lastSyncTime = Date.now();
    
    const triggerSync = async (operation: string) => {
      const now = Date.now();
      // Debounce syncs within 1 second
      if (syncInProgress || (now - lastSyncTime) < 1000) {
        console.log('⏸️ Skipping sync - too soon or already in progress');
        return;
      }
      
      console.log(`🔄 Syncing after ${operation}...`);
      syncInProgress = true;
      lastSyncTime = now;
      
      try {
        const result = await this.fullSync(collectionName, tableName);
        console.log('📊 Sync result:', result);
      } finally {
        syncInProgress = false;
      }
    };
    
    // Watch for INSERT events
    const insertSub = collection.insert$.subscribe(async (changeEvent) => {
      console.log('➕ Insert detected:', changeEvent);
      await triggerSync('INSERT');
    });
    
    // Watch for UPDATE events  
    const updateSub = collection.update$.subscribe(async (changeEvent) => {
      console.log('✏️ Update detected:', changeEvent);
      await triggerSync('UPDATE');
    });
    
    // Watch for REMOVE events
    const removeSub = collection.remove$.subscribe(async (changeEvent) => {
      console.log('❌ Remove detected:', changeEvent);
      await triggerSync('DELETE');
    });
    
    // Also setup regular interval sync for pulling remote changes
    this.syncInterval = setInterval(async () => {
      console.log('⏰ Periodic sync...');
      await this.fullSync(collectionName, tableName);
    }, intervalMs);
    
    // Store subscriptions for cleanup
    (this as any).subscriptions = [insertSub, updateSub, removeSub];
    
    return true;
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    // Cleanup subscriptions
    if ((this as any).subscriptions) {
      (this as any).subscriptions.forEach((sub: any) => {
        if (sub && sub.unsubscribe) {
          sub.unsubscribe();
        }
      });
      (this as any).subscriptions = null;
    }
    
    console.log('🛑 Auto-sync stopped');
  }

  /**
   * Handle conflict with Last-Write-Wins
   */
  async resolveConflict(local: any, remote: any): Promise<any> {
    const localTime = new Date(local.modified_on || 0).getTime();
    const remoteTime = new Date(remote.modified_on || 0).getTime();
    
    if (localTime > remoteTime) {
      console.log('Keeping local version (newer)');
      return local;
    } else {
      console.log('Taking remote version (newer)');
      return remote;
    }
  }

  /**
   * Delete document from both sources
   */
  async deleteEverywhere(collectionName: string, tableName: string, id: string) {
    try {
      // Delete from RxDB
      const collection = this.db.collections[collectionName];
      if (collection) {
        const doc = await collection.findOne(id).exec();
        if (doc) {
          await doc.remove();
          console.log(`Deleted ${id} from RxDB`);
        }
      }
      
      // Delete from Supabase
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      
      if (!error) {
        console.log(`Deleted ${id} from Supabase`);
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Delete failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(collectionName: string, tableName: string) {
    try {
      // Get local count
      const collection = this.db.collections[collectionName];
      const localCount = collection ? await collection.count().exec() : 0;
      
      // Get remote count
      const { count: remoteCount } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      return {
        localCount,
        remoteCount: remoteCount || 0,
        lastSync: this.lastSync,
        isAutoSyncing: this.syncInterval !== null
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return {
        localCount: 0,
        remoteCount: 0,
        lastSync: null,
        isAutoSyncing: false
      };
    }
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
}