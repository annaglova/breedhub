import { RxDatabase, RxCollection } from 'rxdb';
import { supabase } from './client';
import { MAIN_TABLES, PARTITION_SYNC_CONFIG } from './main-tables-schema';

/**
 * Partition Sync Manager
 * Handles syncing data from PostgreSQL partitioned tables to RxDB collections
 * 
 * Architecture:
 * - PostgreSQL: 800+ tables (main + partitions)
 * - RxDB: ~20 collections (main tables only)
 * - Filtering: by breed_id at query time
 */
export class PartitionSyncManager {
  private db: RxDatabase;
  private activeBreeds: Set<string> = new Set();
  private syncHandlers: Map<string, any> = new Map();

  constructor(database: RxDatabase) {
    this.db = database;
  }

  /**
   * Set breeds to sync
   * Only data for these breeds will be synced from Supabase
   */
  setActiveBreeds(breedIds: string[]) {
    this.activeBreeds = new Set(breedIds);
    console.log(`🎯 Active breeds for sync: ${breedIds.join(', ')}`);
  }

  /**
   * Add a breed to active sync
   */
  addBreed(breedId: string) {
    this.activeBreeds.add(breedId);
    this.syncBreedData(breedId);
  }

  /**
   * Remove a breed from active sync
   */
  removeBreed(breedId: string) {
    this.activeBreeds.delete(breedId);
    // Optionally clean up local data for this breed
  }

  /**
   * Sync data for a specific breed
   */
  async syncBreedData(breedId: string) {
    console.log(`🔄 Syncing data for breed: ${breedId}`);

    // Sync pets for this breed
    await this.syncPartitionedTable('pets', breedId);
    
    // Sync pet photos for this breed
    await this.syncPartitionedTable('pet_photos', breedId);
    
    // Sync pet documents for this breed
    await this.syncPartitionedTable('pet_documents', breedId);
  }

  /**
   * Sync a partitioned table for a specific breed
   */
  private async syncPartitionedTable(tableName: string, breedId: string) {
    const collection = this.db.collections[tableName];
    if (!collection) {
      console.warn(`Collection ${tableName} not found`);
      return;
    }

    try {
      // Try to query from main table with breed filter
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('breed_id', breedId);

      if (error) {
        // Try partition table directly
        const partitionTable = this.getPartitionTableName(tableName, breedId);
        const { data: partitionData, error: partitionError } = await supabase
          .from(partitionTable)
          .select('*');

        if (partitionError) {
          console.error(`Failed to sync ${tableName} for breed ${breedId}:`, partitionError);
          return;
        }

        await this.bulkUpsert(collection, partitionData || []);
      } else {
        await this.bulkUpsert(collection, data || []);
      }

      console.log(`✅ Synced ${data?.length || 0} records from ${tableName} for breed ${breedId}`);
    } catch (error) {
      console.error(`Error syncing ${tableName} for breed ${breedId}:`, error);
    }
  }

  /**
   * Get partition table name based on naming convention
   */
  private getPartitionTableName(baseTable: string, breedId: string): string {
    // Convert breed_id to partition suffix
    // This should match your PostgreSQL partition naming
    const breedSuffix = breedId.toLowerCase().replace(/-/g, '_');
    return `${baseTable}_p_${breedSuffix}`;
  }

  /**
   * Bulk upsert documents to RxDB collection
   */
  private async bulkUpsert(collection: RxCollection, documents: any[]) {
    if (documents.length === 0) return;

    try {
      await collection.bulkUpsert(documents);
    } catch (error) {
      console.error('Bulk upsert failed:', error);
      // Fallback to individual upserts
      for (const doc of documents) {
        try {
          await collection.upsert(doc);
        } catch (err) {
          console.error('Individual upsert failed:', err);
        }
      }
    }
  }

  /**
   * Setup real-time replication for active breeds
   */
  async setupRealtimeSync() {
    // Setup realtime subscription for main tables
    for (const tableName of Object.keys(MAIN_TABLES)) {
      const config = MAIN_TABLES[tableName as keyof typeof MAIN_TABLES];
      
      if (config.hasPartitions) {
        // For partitioned tables, subscribe with breed filter
        this.setupPartitionedRealtimeSync(tableName);
      } else {
        // For non-partitioned tables, regular sync
        this.setupRegularRealtimeSync(tableName);
      }
    }
  }

  /**
   * Setup realtime sync for partitioned table
   */
  private setupPartitionedRealtimeSync(tableName: string) {
    const collection = this.db.collections[tableName];
    if (!collection) return;

    // Subscribe to changes for active breeds only
    const channel = supabase
      .channel(`${tableName}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `breed_id=in.(${Array.from(this.activeBreeds).join(',')})`
        },
        async (payload) => {
          console.log(`Realtime update for ${tableName}:`, payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            await collection.upsert(payload.new);
          } else if (payload.eventType === 'DELETE') {
            const doc = await collection.findOne(payload.old.id).exec();
            if (doc) await doc.remove();
          }
        }
      )
      .subscribe();

    this.syncHandlers.set(tableName, channel);
  }

  /**
   * Setup realtime sync for regular table
   */
  private setupRegularRealtimeSync(tableName: string) {
    const collection = this.db.collections[tableName];
    if (!collection) return;

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
          console.log(`Realtime update for ${tableName}:`, payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            await collection.upsert(payload.new);
          } else if (payload.eventType === 'DELETE') {
            const doc = await collection.findOne(payload.old.id).exec();
            if (doc) await doc.remove();
          }
        }
      )
      .subscribe();

    this.syncHandlers.set(tableName, channel);
  }

  /**
   * Query pets for a specific breed
   */
  async queryPetsByBreed(breedId: string) {
    const petsCollection = this.db.collections.pets;
    if (!petsCollection) return [];

    const results = await petsCollection
      .find({
        selector: {
          breed_id: breedId
        }
      })
      .exec();

    return results;
  }

  /**
   * Get sync statistics
   */
  async getSyncStats() {
    const stats: any = {
      activeBreeds: Array.from(this.activeBreeds),
      collections: {}
    };

    for (const [tableName, config] of Object.entries(MAIN_TABLES)) {
      const collection = this.db.collections[tableName];
      if (!collection) continue;

      const count = await collection.count().exec();
      
      if (config.hasPartitions) {
        // Count by breed
        const breedCounts: any = {};
        for (const breedId of this.activeBreeds) {
          const breedCount = await collection
            .count({
              selector: {
                breed_id: breedId
              }
            })
            .exec();
          breedCounts[breedId] = breedCount;
        }
        
        stats.collections[tableName] = {
          total: count,
          byBreed: breedCounts
        };
      } else {
        stats.collections[tableName] = {
          total: count
        };
      }
    }

    return stats;
  }

  /**
   * Cleanup and unsubscribe
   */
  async cleanup() {
    for (const [tableName, channel] of this.syncHandlers) {
      await channel.unsubscribe();
      console.log(`Unsubscribed from ${tableName} changes`);
    }
    this.syncHandlers.clear();
  }
}

/**
 * Helper to estimate sync data volume
 */
export function estimateSyncVolume(breedCount: number) {
  const estimates = {
    petsPerBreed: 1000,
    photosPerPet: 5,
    documentsPerPet: 2
  };

  const totalPets = breedCount * estimates.petsPerBreed;
  const totalPhotos = totalPets * estimates.photosPerPet;
  const totalDocuments = totalPets * estimates.documentsPerPet;

  const estimatedSizeMB = {
    pets: totalPets * 0.001, // ~1KB per pet record
    photos: totalPhotos * 0.002, // ~2KB per photo metadata
    documents: totalDocuments * 0.001, // ~1KB per document metadata
    total: 0
  };

  estimatedSizeMB.total = 
    estimatedSizeMB.pets + 
    estimatedSizeMB.photos + 
    estimatedSizeMB.documents;

  return {
    documentCounts: {
      pets: totalPets,
      photos: totalPhotos,
      documents: totalDocuments,
      total: totalPets + totalPhotos + totalDocuments
    },
    estimatedSizeMB,
    recommendation: estimatedSizeMB.total < 100 
      ? 'Safe to sync all breeds'
      : `Consider limiting to ${Math.floor(100 / (estimatedSizeMB.total / breedCount))} breeds`
  };
}

/**
 * Breed selection strategy
 */
export class BreedSelector {
  private maxBreeds: number;
  private priorityBreeds: Set<string>;

  constructor(maxBreeds: number = 10) {
    this.maxBreeds = maxBreeds;
    this.priorityBreeds = new Set();
  }

  /**
   * Set priority breeds that should always be synced
   */
  setPriorityBreeds(breedIds: string[]) {
    this.priorityBreeds = new Set(breedIds);
  }

  /**
   * Get breeds to sync based on usage patterns
   */
  async getOptimalBreedSelection(
    recentlyUsed: string[],
    popularBreeds: string[],
    userFavorites: string[]
  ): Promise<string[]> {
    const selected = new Set<string>();

    // Add priority breeds first
    for (const breed of this.priorityBreeds) {
      selected.add(breed);
    }

    // Add recently used
    for (const breed of recentlyUsed) {
      if (selected.size >= this.maxBreeds) break;
      selected.add(breed);
    }

    // Add user favorites
    for (const breed of userFavorites) {
      if (selected.size >= this.maxBreeds) break;
      selected.add(breed);
    }

    // Fill with popular breeds
    for (const breed of popularBreeds) {
      if (selected.size >= this.maxBreeds) break;
      selected.add(breed);
    }

    return Array.from(selected);
  }
}