import { supabase } from '../supabase/client';
import { SpaceStore } from '../stores/space-store.signal-store';
import { MAIN_TABLES } from '../supabase/main-tables-schema';

export interface LoaderOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
  filters?: Record<string, any>;
}

export interface SyncOptions {
  realtime?: boolean;
  batchSize?: number;
  onProgress?: (progress: { loaded: number; total: number; entity: string }) => void;
}

export class SupabaseLoaderService {
  private spaceStore: SpaceStore;
  private subscriptions: Map<string, any> = new Map();

  constructor(spaceStore: SpaceStore) {
    this.spaceStore = spaceStore;
  }

  /**
   * Load data from Supabase for a specific entity type
   */
  async loadEntity(
    entityType: string,
    options: LoaderOptions = {}
  ): Promise<{ data: any[]; error: any }> {
    try {
      console.log(`📥 Loading ${entityType} from Supabase...`);

      // Build query
      let query = supabase.from(entityType).select('*');

      // Apply filters
      if (options.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (value === null) {
            query = query.is(key, null);
          } else {
            query = query.eq(key, value);
          }
        }
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? true });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      // Execute query
      const { data, error } = await query;

      if (error) {
        console.error(`❌ Error loading ${entityType}:`, error);
        return { data: [], error };
      }

      console.log(`✅ Loaded ${data?.length || 0} ${entityType} records`);
      return { data: data || [], error: null };
    } catch (error) {
      console.error(`❌ Failed to load ${entityType}:`, error);
      return { data: [], error };
    }
  }

  /**
   * Load data and sync to SpaceStore
   */
  async loadAndSyncEntity(
    entityType: string,
    options: LoaderOptions = {},
    syncOptions: SyncOptions = {}
  ): Promise<boolean> {
    try {
      // Load data from Supabase
      const { data, error } = await this.loadEntity(entityType, options);

      if (error) {
        throw new Error(`Failed to load ${entityType}: ${error.message}`);
      }

      // Get or create entity store in SpaceStore
      const entityStore = await this.spaceStore.getEntityStore(entityType);

      // Clear existing data using setAll
      await entityStore.setAll([]);

      // Add data to RxDB in batches
      const batchSize = syncOptions.batchSize || 100;
      let loaded = 0;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        // Add batch to the store
        entityStore.addMany(batch);

        loaded += batch.length;

        // Report progress
        if (syncOptions.onProgress) {
          syncOptions.onProgress({
            loaded,
            total: data.length,
            entity: entityType
          });
        }
      }

      console.log(`✅ Synced ${data.length} ${entityType} records to SpaceStore`);

      // Setup realtime subscription if requested
      if (syncOptions.realtime) {
        this.setupRealtimeSync(entityType, options.filters);
      }

      return true;
    } catch (error) {
      console.error(`❌ Failed to sync ${entityType}:`, error);
      return false;
    }
  }

  /**
   * Load multiple entity types
   */
  async loadMultipleEntities(
    entityTypes: string[],
    options: LoaderOptions = {},
    syncOptions: SyncOptions = {}
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const entityType of entityTypes) {
      const success = await this.loadAndSyncEntity(entityType, options, syncOptions);
      results.set(entityType, success);
    }

    return results;
  }

  /**
   * Load all main tables
   */
  async loadAllMainTables(
    options: LoaderOptions = {},
    syncOptions: SyncOptions = {}
  ): Promise<Map<string, boolean>> {
    const mainTables = Object.keys(MAIN_TABLES);
    return this.loadMultipleEntities(mainTables, options, syncOptions);
  }

  /**
   * Setup realtime subscription for an entity
   */
  private setupRealtimeSync(entityType: string, filters?: Record<string, any>) {
    // Remove existing subscription
    if (this.subscriptions.has(entityType)) {
      this.subscriptions.get(entityType).unsubscribe();
      this.subscriptions.delete(entityType);
    }

    // Create new subscription
    let channel = supabase
      .channel(`${entityType}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: entityType,
          filter: this.buildRealtimeFilter(filters)
        },
        async (payload) => {
          await this.handleRealtimeChange(entityType, payload);
        }
      );

    // Subscribe
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`🔄 Realtime sync enabled for ${entityType}`);
      }
    });

    this.subscriptions.set(entityType, channel);
  }

  /**
   * Build filter string for realtime subscription
   */
  private buildRealtimeFilter(filters?: Record<string, any>): string | undefined {
    if (!filters || Object.keys(filters).length === 0) {
      return undefined;
    }

    // Build filter string (e.g., "breed_id=eq.123")
    const filterParts = [];
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined && !Array.isArray(value)) {
        filterParts.push(`${key}=eq.${value}`);
      }
    }

    return filterParts.length > 0 ? filterParts.join(',') : undefined;
  }

  /**
   * Handle realtime changes
   */
  private async handleRealtimeChange(entityType: string, payload: any) {
    try {
      const entityStore = await this.spaceStore.getEntityStore(entityType);
      const { eventType, new: newRecord, old: oldRecord } = payload;

      switch (eventType) {
        case 'INSERT':
          if (newRecord) {
            await entityStore.addEntity(newRecord);
            console.log(`➕ Added ${entityType} #${newRecord.id}`);
          }
          break;

        case 'UPDATE':
          if (newRecord) {
            await entityStore.updateEntity(newRecord.id, newRecord);
            console.log(`📝 Updated ${entityType} #${newRecord.id}`);
          }
          break;

        case 'DELETE':
          if (oldRecord) {
            await entityStore.deleteEntity(oldRecord.id);
            console.log(`🗑️ Deleted ${entityType} #${oldRecord.id}`);
          }
          break;
      }
    } catch (error) {
      console.error(`❌ Error handling realtime change for ${entityType}:`, error);
    }
  }

  /**
   * Stop all realtime subscriptions
   */
  async stopAllRealtimeSync() {
    for (const [entityType, channel] of this.subscriptions) {
      await channel.unsubscribe();
      console.log(`⏹️ Stopped realtime sync for ${entityType}`);
    }
    this.subscriptions.clear();
  }


  /**
   * Get count of records in Supabase
   */
  async getEntityCount(entityType: string, filters?: Record<string, any>): Promise<number> {
    try {
      let query = supabase.from(entityType).select('*', { count: 'exact', head: true });

      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (value === null) {
            query = query.is(key, null);
          } else {
            query = query.eq(key, value);
          }
        }
      }

      const { count, error } = await query;

      if (error) {
        console.error(`❌ Error getting count for ${entityType}:`, error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error(`❌ Failed to get count for ${entityType}:`, error);
      return 0;
    }
  }

  /**
   * Check which tables exist in Supabase
   */
  async checkAvailableTables(): Promise<string[]> {
    const availableTables: string[] = [];
    
    for (const tableName of Object.keys(MAIN_TABLES)) {
      const count = await this.getEntityCount(tableName);
      if (count >= 0) {
        availableTables.push(tableName);
        console.log(`✅ Table ${tableName} exists (${count} records)`);
      } else {
        console.log(`⚠️ Table ${tableName} not found or empty`);
      }
    }

    return availableTables;
  }
}