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
      
      // Subscribe to collection changes
      this.subscription = breedsCollection.find().$.subscribe({
        next: (documents) => {
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
    if (!collectionSignal.value) {
      throw new Error('Collection not initialized');
    }
    
    this.replicationService = new SupabaseReplicationService({
      supabaseUrl,
      supabaseKey,
      batchSize: 5,
      pullInterval: 10000
    });
    
    const state = await this.replicationService.setupBreedsReplication(
      collectionSignal.value
    );
    
    replicationStateSignal.value = state;
    
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
      description: breedData.description,
      origin: breedData.origin,
      size: breedData.size || 'medium',
      lifespan: breedData.lifespan,
      traits: breedData.traits || [],
      colors: breedData.colors || [],
      image: breedData.image,
      workspaceId: breedData.workspaceId,
      spaceId: breedData.spaceId,
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