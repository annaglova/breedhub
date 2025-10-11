import { signal } from '@preact/signals-react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { RxCollection, RxDatabase } from 'rxdb';
import { getDatabase } from '../services/database.service';
import { dictionariesSchema, type DictionaryDocument } from '../collections/dictionaries.schema';

// Collection type
export type DictionaryCollection = RxCollection<DictionaryDocument>;

/**
 * DictionaryStore
 *
 * Manages universal dictionary cache for 120+ dictionary tables.
 *
 * Features:
 * - ONE RxDB collection for ALL dictionaries (composite key: table_name::id)
 * - On-demand loading (load only when dropdown opens)
 * - TTL cleanup (14 days)
 * - Config-driven field mapping (idField, nameField from config)
 *
 * Usage:
 * ```typescript
 * await dictionaryStore.initialize();
 * const { records } = await dictionaryStore.getDictionary('pet_type', {
 *   idField: 'id',    // from config.referencedFieldID
 *   nameField: 'name', // from config.referencedFieldName
 *   limit: 30
 * });
 * ```
 */
class DictionaryStore {
  private static instance: DictionaryStore;

  // State
  initialized = signal<boolean>(false);
  loading = signal<boolean>(false);
  loadingTables = signal<Set<string>>(new Set());
  error = signal<string | null>(null);

  // Database
  private db: RxDatabase | null = null;
  private collection: DictionaryCollection | null = null;

  // Supabase client
  private supabase: SupabaseClient;

  // Cache metadata
  private readonly TTL = 14 * 24 * 60 * 60 * 1000; // 14 days

  private constructor() {
    // Initialize Supabase client
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    console.log('[DictionaryStore] Supabase URL:', supabaseUrl ? 'Found' : 'Missing');
    console.log('[DictionaryStore] Supabase Key:', supabaseKey ? 'Found' : 'Missing');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not found in environment');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  static getInstance(): DictionaryStore {
    if (!DictionaryStore.instance) {
      DictionaryStore.instance = new DictionaryStore();
    }
    return DictionaryStore.instance;
  }

  /**
   * Initialize dictionary store and create universal collection
   * Called by AppStore during app initialization
   *
   * NO PRELOADING - collection is created empty
   */
  async initialize(): Promise<void> {
    if (this.initialized.value) {
      console.log('[DictionaryStore] Already initialized');
      return;
    }

    console.log('[DictionaryStore] Initializing...');
    this.loading.value = true;
    this.error.value = null;

    try {
      // Get database
      this.db = await getDatabase();

      // Check if collection already exists
      if (!this.db.dictionaries) {
        console.log('[DictionaryStore] Creating dictionaries collection...');

        // Create universal dictionaries collection
        await this.db.addCollections({
          dictionaries: {
            schema: dictionariesSchema
          }
        });

        console.log('[DictionaryStore] Dictionaries collection created');
      } else {
        console.log('[DictionaryStore] Dictionaries collection already exists');
      }

      this.collection = this.db.dictionaries as DictionaryCollection;
      this.initialized.value = true;

      console.log('[DictionaryStore] Initialized (no preloading)');

      // Run initial cleanup (async, don't wait)
      this.cleanupExpired().catch(error => {
        console.error('[DictionaryStore] Initial cleanup failed:', error);
      });

      // Schedule periodic cleanup (every 24 hours)
      setInterval(() => {
        this.cleanupExpired().catch(error => {
          console.error('[DictionaryStore] Periodic cleanup failed:', error);
        });
      }, 24 * 60 * 60 * 1000);

    } catch (error) {
      console.error('[DictionaryStore] Initialization failed:', error);
      this.error.value = error instanceof Error ? error.message : 'Initialization failed';
      throw error;
    } finally {
      this.loading.value = false;
    }
  }

  /**
   * Load dictionary data from Supabase and cache in RxDB
   *
   * @param tableName - Dictionary table name (e.g., 'pet_type')
   * @param idField - ID field name from config (default: 'id')
   * @param nameField - Display field name from config (default: 'name')
   * @param limit - Number of records to load (default: 100)
   * @param offset - Offset for pagination (default: 0)
   */
  async loadDictionary(
    tableName: string,
    idField: string = 'id',
    nameField: string = 'name',
    limit: number = 100,
    offset: number = 0
  ): Promise<DictionaryDocument[]> {
    if (!this.collection) {
      throw new Error('[DictionaryStore] Not initialized');
    }

    // Add to loading set
    const currentLoading = this.loadingTables.value;
    currentLoading.add(tableName);
    this.loadingTables.value = new Set(currentLoading);

    try {
      console.log(`[DictionaryStore] Loading ${tableName} (${idField}, ${nameField})...`);

      // Fetch from Supabase using dynamic field names
      const { data, error } = await this.supabase
        .from(tableName)
        .select(`${idField}, ${nameField}`)
        .order(nameField, { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to load ${tableName}: ${error.message}`);
      }

      // Transform and normalize to universal schema
      const documents: DictionaryDocument[] = (data || []).map(record => ({
        composite_id: `${tableName}::${record[idField]}`,
        table_name: tableName,
        id: String(record[idField]),        // Normalize to string
        name: String(record[nameField]),    // Normalize to string
        cachedAt: Date.now()
      }));

      // Bulk insert (RxDB handles conflicts automatically)
      if (documents.length > 0) {
        await this.collection.bulkInsert(documents);
      }

      console.log(`[DictionaryStore] Loaded ${documents.length} records for ${tableName}`);

      return documents;

    } catch (error) {
      console.error(`[DictionaryStore] Failed to load ${tableName}:`, error);
      throw error;
    } finally {
      // Remove from loading set
      const updatedLoading = this.loadingTables.value;
      updatedLoading.delete(tableName);
      this.loadingTables.value = new Set(updatedLoading);
    }
  }

  /**
   * Get dictionary records for dropdown/lookup
   *
   * @param tableName - Dictionary table name
   * @param options - Query options
   */
  async getDictionary(
    tableName: string,
    options: {
      idField?: string;    // From config.referencedFieldID (default: 'id')
      nameField?: string;  // From config.referencedFieldName (default: 'name')
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ records: DictionaryDocument[]; total: number; hasMore: boolean }> {
    if (!this.collection) {
      throw new Error('[DictionaryStore] Not initialized');
    }

    const {
      idField = 'id',      // Default to 'id' (99% cases)
      nameField = 'name',  // Default to 'name' (99% cases)
      search,
      limit = 30,
      offset = 0
    } = options;

    // Check if we have any cached records for this table
    // Use simple count with single field to match index
    const cachedCount = await this.collection
      .count({
        selector: {
          table_name: tableName
        }
      })
      .exec();

    // If no cache, load from server
    // TTL cleanup is handled separately in cleanupExpired()
    if (cachedCount === 0) {
      await this.loadDictionary(tableName, idField, nameField, limit, offset);
    }

    // Build query
    let query = this.collection.find({
      selector: {
        table_name: tableName
      }
    });

    // Add search filter
    if (search) {
      query = query.where('name').regex(new RegExp(search, 'i'));
    }

    // Get total count
    const totalDocs = await query.exec();
    const total = totalDocs.length;

    // Apply pagination
    const records = await query
      .skip(offset)
      .limit(limit)
      .exec();

    const hasMore = offset + limit < total;

    return {
      records: records.map(doc => doc.toJSON()),
      total,
      hasMore
    };
  }

  /**
   * Cleanup expired dictionary records (older than TTL)
   * Called on initialize and every 24 hours
   */
  async cleanupExpired(): Promise<void> {
    if (!this.collection) return;

    const expiryTime = Date.now() - this.TTL;

    try {
      const expiredDocs = await this.collection
        .find({
          selector: {
            cachedAt: {
              $lt: expiryTime
            }
          }
        })
        .exec();

      if (expiredDocs.length > 0) {
        console.log(`[DictionaryStore] Cleaning up ${expiredDocs.length} expired records`);

        for (const doc of expiredDocs) {
          await doc.remove(); // Soft delete → RxDB cleanup will handle
        }

        console.log(`[DictionaryStore] Cleanup complete`);
      }
    } catch (error) {
      console.error('[DictionaryStore] Cleanup failed:', error);
    }
  }

  /**
   * Clear all cached dictionary data
   * Useful for testing or manual cache reset
   */
  async clearAll(): Promise<void> {
    if (!this.collection) return;

    try {
      await this.collection.find().remove();
      console.log('[DictionaryStore] All dictionary cache cleared');
    } catch (error) {
      console.error('[DictionaryStore] Failed to clear cache:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dictionaryStore = DictionaryStore.getInstance();
