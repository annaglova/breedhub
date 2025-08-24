import { signal, computed, batch, effect } from '@preact/signals-react';
import { Subscription } from 'rxjs';
import { MangoQuery } from 'rxdb';
import { databaseService } from '../services/database.service';
import { BreedDocument, BreedDocType, BreedCollection } from '../types/breed.types';
import { SupabaseReplicationService } from '../services/supabase-replication.service';

// Signals for breeds state
const breedsSignal = signal<Map<string, BreedDocument>>(new Map());
const loadingSignal = signal<boolean>(true);
const errorSignal = signal<Error | null>(null);
const collectionSignal = signal<BreedCollection | null>(null);
const replicationStateSignal = signal<any>(null);
const filterSignal = signal<MangoQuery<BreedDocType>>({});

// Computed signals
export const breeds = computed(() => {
  const allBreeds = Array.from(breedsSignal.value.values());
  
  // Sort by updatedAt descending (most recent first)
  allBreeds.sort((a, b) => {
    const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return dateB - dateA; // Descending order (newest first)
  });
  
  const filter = filterSignal.value;
  
  // Apply filter if exists
  if (filter.selector) {
    return allBreeds.filter(breed => {
      // Simple filtering logic (can be expanded)
      if (filter.selector?.size && breed.size !== filter.selector.size) {
        return false;
      }
      if (filter.selector?.workspaceId && breed.workspaceId !== filter.selector.workspaceId) {
        return false;
      }
      if (filter.selector?.spaceId && breed.spaceId !== filter.selector.spaceId) {
        return false;
      }
      return true;
    });
  }
  
  return allBreeds;
});

export const breedsBySize = computed(() => {
  const sizeMap = new Map<string, BreedDocument[]>();
  
  breeds.value.forEach(breed => {
    const size = breed.size || 'unknown';
    if (!sizeMap.has(size)) {
      sizeMap.set(size, []);
    }
    sizeMap.get(size)!.push(breed);
  });
  
  return sizeMap;
});

export const breedsCount = computed(() => breeds.value.length);

export const loading = computed(() => loadingSignal.value);
export const error = computed(() => errorSignal.value);
export const collection = computed(() => collectionSignal.value);
export const replicationState = computed(() => replicationStateSignal.value);

// Store class
class BreedsSignalStore {
  private subscription: Subscription | null = null;
  private replicationService: SupabaseReplicationService | null = null;
  
  // Initialize the store
  async initialize() {
    try {
      loadingSignal.value = true;
      errorSignal.value = null;
      
      const db = await databaseService.getDatabase();
      const breedsCollection = db.breeds;
      collectionSignal.value = breedsCollection;
      
      // Subscribe to collection changes - sort by recently updated first
      // Top 20 breeds
      this.subscription = breedsCollection.find({
        selector: {},
        sort: [{ updatedAt: 'desc' }],
        limit: 20
      }).$.subscribe({
        next: (documents) => {
          console.log('[BreedsStore] Received', documents.length, 'documents from RxDB');
          batch(() => {
            const newMap = new Map<string, BreedDocument>();
            documents.forEach(doc => {
              if (!doc._deleted) {
                newMap.set(doc.id, doc);
              }
            });
            breedsSignal.value = newMap;
            loadingSignal.value = false;
          });
        },
        error: (err) => {
          batch(() => {
            errorSignal.value = err;
            loadingSignal.value = false;
          });
        }
      });
      
    } catch (err) {
      batch(() => {
        errorSignal.value = err as Error;
        loadingSignal.value = false;
      });
    }
  }
  
  // Enable Supabase sync
  async enableSync(supabaseUrl: string, supabaseKey: string) {
    console.log('[BreedsStore] Enabling sync...');
    if (!collectionSignal.value) {
      throw new Error('Collection not initialized');
    }
    
    this.replicationService = new SupabaseReplicationService({
      supabaseUrl,
      supabaseKey,
      batchSize: 5,
      pullInterval: 10000
    });
    
    // First, manually fetch and insert data
    console.log('[BreedsStore] Manually fetching breeds from Supabase...');
    const breeds = await this.replicationService.fetchBreedsFromSupabase(20);
    console.log('[BreedsStore] Fetched', breeds.length, 'breeds manually');
    
    if (breeds.length > 0) {
      console.log('[BreedsStore] First fetched breed:', JSON.stringify(breeds[0], null, 2));
      console.log('[BreedsStore] Breed names:', breeds.map(b => b.name || 'NO_NAME'));
      
      // Insert into RxDB
      for (const breed of breeds) {
        try {
          await collectionSignal.value.upsert(breed);
          console.log('[BreedsStore] Inserted breed:', breed.name || `NO_NAME (${breed.id})`);
        } catch (err) {
          console.error('[BreedsStore] Failed to insert breed:', err);
        }
      }
    }
    
    // Now setup replication for future syncs
    console.log('[BreedsStore] Setting up replication...');
    const state = await this.replicationService.setupBreedsReplication(
      collectionSignal.value
    );
    
    replicationStateSignal.value = state;
    console.log('[BreedsStore] Sync enabled, replication state:', state);
    
    // Wait a bit for sync to actually happen
    console.log('[BreedsStore] Waiting 2 seconds for sync to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Force re-query after sync setup
    const docs = await collectionSignal.value.find({
      selector: {},
      sort: [{ updatedAt: 'desc' }]
      // NO LIMIT
    }).exec();
    console.log('[BreedsStore] After sync, found', docs.length, 'documents in RxDB');
    
    // Log first few documents to see what we have
    if (docs.length > 0) {
      console.log('[BreedsStore] First document:', docs[0].toJSON());
      console.log('[BreedsStore] Document IDs:', docs.slice(0, 5).map(d => d.id));
    }
    
    // Force re-subscription to pick up synced data
    if (this.subscription) {
      console.log('[BreedsStore] Re-subscribing to collection after sync...');
      this.subscription.unsubscribe();
      
      // Re-create subscription
      this.subscription = collectionSignal.value.find({
        selector: {},
        sort: [{ updatedAt: 'desc' }]
        // NO LIMIT
      }).$.subscribe({
        next: (documents) => {
          console.log('[BreedsStore] Re-subscription received', documents.length, 'documents');
          batch(() => {
            const newMap = new Map<string, BreedDocument>();
            documents.forEach(doc => {
              if (!doc._deleted) {
                newMap.set(doc.id, doc);
              }
            });
            breedsSignal.value = newMap;
            loadingSignal.value = false;
          });
        },
        error: (err) => {
          batch(() => {
            errorSignal.value = err;
            loadingSignal.value = false;
          });
        }
      });
    }
    
    return state;
  }
  
  // Disable sync
  async disableSync() {
    if (this.replicationService) {
      await this.replicationService.stopAllReplications();
      replicationStateSignal.value = null;
    }
  }
  
  // CRUD operations
  async addBreed(breedData: Partial<BreedDocType>): Promise<BreedDocument> {
    const collection = collectionSignal.value;
    if (!collection) throw new Error('Collection not initialized');
    
    const breed: BreedDocType = {
      id: breedData.id || `breed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: breedData.name || '',
      description: breedData.description || null,
      workspaceId: breedData.workspaceId || null,
      spaceId: breedData.spaceId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _deleted: false
    };
    
    return await collection.insert(breed);
  }
  
  async updateBreed(id: string, updates: Partial<BreedDocType>): Promise<void> {
    const collection = collectionSignal.value;
    if (!collection) throw new Error('Collection not initialized');
    
    const doc = await collection.findOne(id).exec();
    if (!doc) throw new Error(`Breed with id ${id} not found`);
    
    await doc.update({
      $set: {
        ...updates,
        updatedAt: new Date().toISOString()
      }
    });
  }
  
  async deleteBreed(id: string): Promise<void> {
    const collection = collectionSignal.value;
    if (!collection) throw new Error('Collection not initialized');
    
    const doc = await collection.findOne(id).exec();
    if (!doc) throw new Error(`Breed with id ${id} not found`);
    
    // Soft delete
    await doc.update({
      $set: {
        _deleted: true,
        updatedAt: new Date().toISOString()
      }
    });
  }
  
  // Search operations
  async searchBreeds(query: string): Promise<BreedDocument[]> {
    const collection = collectionSignal.value;
    if (!collection) return [];
    
    return await collection.find({
      selector: {
        $or: [
          { name: { $regex: new RegExp(query, 'i') } },
          { description: { $regex: new RegExp(query, 'i') } },
          { origin: { $regex: new RegExp(query, 'i') } }
        ]
      }
    }).exec();
  }
  
  // Filter operations
  setFilter(filter: MangoQuery<BreedDocType>) {
    filterSignal.value = filter;
  }
  
  clearFilter() {
    filterSignal.value = {};
  }
  
  // Get breed by ID
  getBreedById(id: string): BreedDocument | undefined {
    return breedsSignal.value.get(id);
  }
  
  // Cleanup
  async destroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.replicationService) {
      await this.replicationService.stopAllReplications();
    }
    
    batch(() => {
      breedsSignal.value = new Map();
      collectionSignal.value = null;
      replicationStateSignal.value = null;
      loadingSignal.value = false;
      errorSignal.value = null;
    });
  }
}

// Export singleton instance
export const breedsStore = new BreedsSignalStore();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  breedsStore.initialize().catch(console.error);
}

// Export individual operations for convenience
export const {
  addBreed,
  updateBreed,
  deleteBreed,
  searchBreeds,
  setFilter,
  clearFilter,
  getBreedById,
  enableSync,
  disableSync,
  destroy
} = breedsStore;