import { signal } from '@preact/signals-react';
import type { RxCollection, RxDatabase } from 'rxdb';
import { getDatabase } from '../services/database.service';
import { dictionariesSchema, type DictionaryDocument } from '../collections/dictionaries.schema';
import { supabase } from '../supabase/client';

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

  // Cache metadata
  private readonly TTL = 14 * 24 * 60 * 60 * 1000; // 14 days

  private constructor() {
    // Using centralized Supabase client from supabase/client.ts
    console.log('[DictionaryStore] Using centralized Supabase client');
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
            schema: dictionariesSchema,
            migrationStrategies: {
              // Version 1: Added composite index [table_name, name, id] for stable sorting
              // No data migration needed - only index change
              1: (oldDoc: any) => oldDoc
            }
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
   * 🆔 ID-FIRST: Fetch IDs + name field from Supabase (lightweight query)
   * Phase 1 of ID-First pagination
   *
   * 🔍 HYBRID SEARCH: For search queries, returns results in priority order:
   * 1. Starts with search term (e.g., "Black", "Black and Tan")
   * 2. Contains search term (e.g., "Sable and Black")
   * Both sorted A-Z within their groups
   */
  private async fetchDictionaryIDsFromSupabase(
    tableName: string,
    idField: string,
    nameField: string,
    options: {
      search?: string;
      limit: number;
      cursor: string | null;
    }
  ): Promise<Array<{ id: string; name: string }>> {
    const { search, limit, cursor } = options;

    // 🎯 HYBRID SEARCH: If search provided, fetch starts_with + contains separately
    if (search && !cursor) {
      console.log('[DictionaryStore] 🔍 Hybrid search mode:', search);

      // Phase 1: Starts with (high priority)
      const startsWithQuery = supabase
        .from(tableName)
        .select(`${idField}, ${nameField}`)
        .ilike(nameField, `${search}%`)  // ✅ Starts with
        .order(nameField, { ascending: true })
        .order(idField, { ascending: true })  // ✅ Tie-breaker for stable sort
        .limit(Math.ceil(limit * 0.7));  // 70% for starts_with

      const { data: startsWithData, error: startsWithError } = await startsWithQuery;

      if (startsWithError) {
        throw new Error(`Hybrid search (starts_with) failed: ${startsWithError.message}`);
      }

      const startsWithResults = (startsWithData || []).map(record => ({
        id: String(record[idField]),
        name: String(record[nameField])
      }));

      console.log(`[DictionaryStore] ✅ Starts with: ${startsWithResults.length} results`);

      // Phase 2: Contains (lower priority) - only if we have room
      const remainingLimit = limit - startsWithResults.length;
      if (remainingLimit > 0) {
        const containsQuery = supabase
          .from(tableName)
          .select(`${idField}, ${nameField}`)
          .ilike(nameField, `%${search}%`)  // ✅ Contains
          .not(nameField, 'ilike', `${search}%`)  // ❌ Exclude starts_with (already fetched)
          .order(nameField, { ascending: true })
          .order(idField, { ascending: true })  // ✅ Tie-breaker for stable sort
          .limit(remainingLimit);

        const { data: containsData, error: containsError } = await containsQuery;

        if (containsError) {
          console.warn('[DictionaryStore] Contains search failed:', containsError);
        } else {
          const containsResults = (containsData || []).map(record => ({
            id: String(record[idField]),
            name: String(record[nameField])
          }));

          console.log(`[DictionaryStore] ✅ Contains: ${containsResults.length} results`);

          // Merge: starts_with first, then contains
          return [...startsWithResults, ...containsResults];
        }
      }

      return startsWithResults;
    }

    // 📄 REGULAR QUERY: No search or cursor pagination
    let query = supabase
      .from(tableName)
      .select(`${idField}, ${nameField}`);

    // Apply search filter (contains) if provided with cursor
    if (search) {
      query = query.ilike(nameField, `%${search}%`);
    }

    // ✅ KEYSET PAGINATION: Use cursor (name > cursor) instead of offset
    if (cursor !== null) {
      query = query.gt(nameField, cursor);
    }

    // ✅ Always sort A-Z by name for dictionaries, with id tie-breaker
    query = query
      .order(nameField, { ascending: true })
      .order(idField, { ascending: true })  // ✅ Tie-breaker for stable sort
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch IDs from ${tableName}: ${error.message}`);
    }

    // Normalize to { id, name }
    return (data || []).map(record => ({
      id: String(record[idField]),
      name: String(record[nameField])
    }));
  }

  /**
   * 🌐 ID-FIRST: Fetch full records by IDs
   * Phase 3 of ID-First pagination
   */
  private async fetchDictionaryRecordsByIDs(
    tableName: string,
    idField: string,
    nameField: string,
    ids: string[]
  ): Promise<DictionaryDocument[]> {
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from(tableName)
      .select(`${idField}, ${nameField}`)
      .in(idField, ids);

    if (error) {
      throw new Error(`Failed to fetch records from ${tableName}: ${error.message}`);
    }

    // Transform to DictionaryDocument
    return (data || []).map(record => ({
      composite_id: `${tableName}::${record[idField]}`,
      table_name: tableName,
      id: String(record[idField]),
      name: String(record[nameField]),
      cachedAt: Date.now()
    }));
  }

  /**
   * 🆔 ID-FIRST: Get dictionary records for dropdown/lookup
   *
   * Uses ID-First pagination for 70% traffic reduction with cache reuse.
   *
   * @param tableName - Dictionary table name
   * @param options - Query options
   */
  async getDictionary(
    tableName: string,
    options: {
      idField?: string;    // From config.referencedFieldID (default: 'id')
      nameField?: string;  // From config.referencedFieldName (default: 'name')
      search?: string;     // Search query (case-insensitive)
      limit?: number;      // Records per page (default: 30)
      cursor?: string | null; // ✅ Cursor for keyset pagination (replaces offset)
    } = {}
  ): Promise<{ records: DictionaryDocument[]; total: number; hasMore: boolean; nextCursor: string | null }> {
    if (!this.collection) {
      throw new Error('[DictionaryStore] Not initialized');
    }

    const {
      idField = 'id',
      nameField = 'name',
      search,
      limit = 30,
      cursor = null
    } = options;

    console.log(`[DictionaryStore] 🆔 ID-First getDictionary ${tableName}:`, {
      search: search || 'none',
      limit,
      cursor,
      idField,
      nameField
    });

    // 📴 PREVENTIVE OFFLINE CHECK: Skip Supabase if browser is offline
    if (!navigator.onLine) {
      console.warn(`[DictionaryStore] 📴 Browser is offline, using RxDB directly for ${tableName}`);
      return this.getDictionaryOffline(tableName, { search, limit, cursor, nameField });
    }

    try {
      // 🆔 PHASE 1: Fetch IDs + name field from Supabase (lightweight ~1KB for 30 records)
      console.log('[DictionaryStore] 🆔 Phase 1: Fetching IDs from Supabase...');

      const idsData = await this.fetchDictionaryIDsFromSupabase(
        tableName,
        idField,
        nameField,
        { search, limit, cursor }
      );

      if (!idsData || idsData.length === 0) {
        console.log('[DictionaryStore] ⚠️ No IDs returned from Supabase');
        return {
          records: [],
          total: 0,
          hasMore: false,
          nextCursor: null
        };
      }

      console.log(`[DictionaryStore] ✅ Got ${idsData.length} IDs from Supabase`);

      // Extract IDs and calculate nextCursor
      const ids = idsData.map(d => d.id);
      const nextCursor = idsData[idsData.length - 1]?.name ?? null;

      // 💾 PHASE 2: Check RxDB cache for these IDs
      console.log('[DictionaryStore] 💾 Phase 2: Checking RxDB cache...');

      const cached = await this.collection.find({
        selector: {
          table_name: tableName,
          id: { $in: ids }
        }
      }).exec();

      const cachedMap = new Map(cached.map(doc => [doc.id, doc.toJSON()]));
      console.log(`[DictionaryStore] 📦 Found ${cachedMap.size}/${ids.length} in cache (${Math.round(cachedMap.size / ids.length * 100)}% hit rate)`);

      // 🌐 PHASE 3: Fetch missing full records from Supabase
      const missingIds = ids.filter(id => !cachedMap.has(id));

      let freshRecords: DictionaryDocument[] = [];
      if (missingIds.length > 0) {
        console.log(`[DictionaryStore] 🌐 Phase 3: Fetching ${missingIds.length} missing full records...`);

        freshRecords = await this.fetchDictionaryRecordsByIDs(
          tableName,
          idField,
          nameField,
          missingIds
        );

        console.log(`[DictionaryStore] ✅ Fetched ${freshRecords.length} fresh records`);

        // Cache fresh records in RxDB
        if (freshRecords.length > 0) {
          const result = await this.collection.bulkInsert(freshRecords);
          console.log(`[DictionaryStore] 💾 Cached ${result.success.length} fresh records (errors: ${result.error.length})`);
        }
      } else {
        console.log('[DictionaryStore] ✨ All records in cache! (100% hit rate)');
      }

      // 🔀 PHASE 4: Merge cached + fresh, maintain order from IDs query
      const recordsMap = new Map([
        ...cachedMap,
        ...freshRecords.map(r => [r.id, r])
      ]);

      // CRITICAL: Maintain exact order from IDs query (sorted A-Z by name)!
      const orderedRecords = ids
        .map(id => recordsMap.get(id))
        .filter((record): record is DictionaryDocument => record !== undefined);

      // Get total count for hasMore
      let serverTotal = 0;
      try {
        let countQuery = supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (search) {
          countQuery = countQuery.ilike(nameField, `%${search}%`);
        }

        const { count, error } = await countQuery;
        if (!error && count !== null) {
          serverTotal = count;
        }
      } catch (error) {
        console.warn(`[DictionaryStore] Failed to get server count:`, error);
      }

      const hasMore = idsData.length >= limit;

      console.log(`[DictionaryStore] ✅ Returning ${orderedRecords.length} records (hasMore: ${hasMore}, total: ${serverTotal})`);

      return {
        records: orderedRecords,
        total: serverTotal,
        hasMore,
        nextCursor
      };

    } catch (error) {
      // Check if this is a network error (offline mode)
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
      const errorName = (error as any)?.name?.toLowerCase() || '';
      const errorCode = (error as any)?.code?.toLowerCase() || '';
      const errorString = String(error).toLowerCase();

      const isNetworkError = errorMessage.includes('fetch') ||
                            errorMessage.includes('network') ||
                            errorMessage.includes('disconnected') ||
                            errorMessage.includes('failed to fetch') ||
                            errorName.includes('network') ||
                            errorName.includes('fetch') ||
                            errorName.includes('disconnected') ||
                            errorCode.includes('network') ||
                            errorCode.includes('disconnected') ||
                            errorCode.includes('err_internet_disconnected') ||
                            errorString.includes('err_internet_disconnected') ||
                            (error instanceof TypeError && errorMessage.includes('fetch')) ||
                            !navigator.onLine;

      if (isNetworkError) {
        console.warn(`[DictionaryStore] ⚠️ Network unavailable for ${tableName}, using offline mode`);
      } else {
        console.error(`[DictionaryStore] ❌ Failed to get dictionary ${tableName}:`, error);
      }

      // 🔌 OFFLINE FALLBACK: Work with RxDB cache only
      return this.getDictionaryOffline(tableName, { search, limit, cursor, nameField });
    }
  }

  /**
   * Get dictionary in offline mode (RxDB only)
   */
  private async getDictionaryOffline(
    tableName: string,
    options: { search?: string; limit: number; cursor: string | null; nameField: string }
  ): Promise<{ records: DictionaryDocument[]; total: number; hasMore: boolean; nextCursor: string | null }> {
    const { search, limit, cursor, nameField } = options;

    console.log('[DictionaryStore] 🔌 OFFLINE MODE: Falling back to RxDB cache...');

    if (!this.collection) {
      return {
        records: [],
        total: 0,
        hasMore: false,
        nextCursor: null
      };
    }

    try {
      let records: DictionaryDocument[] = [];

      // 🎯 HYBRID SEARCH: If search provided, fetch starts_with + contains separately
      if (search && !cursor) {
        console.log('[DictionaryStore] 🔍 OFFLINE: Hybrid search mode:', search);

        // Escape regex special characters
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Phase 1: Starts with (high priority, 70% of limit)
        const startsWithLimit = Math.ceil(limit * 0.7);
        const startsWithSelector = {
          table_name: tableName,
          [nameField]: { $regex: `^${escapedSearch}`, $options: 'i' }
        };

        const startsWithDocs = await this.collection.find({
          selector: startsWithSelector,
          sort: [{ [nameField]: 'asc' }, { id: 'asc' }],  // ✅ Tie-breaker for stable sort
          limit: startsWithLimit
        }).exec();

        const startsWithResults = startsWithDocs.map(doc => doc.toJSON());
        console.log(`[DictionaryStore] ✅ OFFLINE: Got ${startsWithResults.length} starts_with results`);

        // Phase 2: Contains (lower priority, 30% of limit)
        const remainingLimit = limit - startsWithResults.length;
        if (remainingLimit > 0) {
          const containsSelector = {
            table_name: tableName,
            [nameField]: { $regex: escapedSearch, $options: 'i' }
          };

          const containsDocs = await this.collection.find({
            selector: containsSelector,
            sort: [{ [nameField]: 'asc' }, { id: 'asc' }],  // ✅ Tie-breaker for stable sort
            limit
          }).exec();

          // Filter out records that start with search (already in startsWithResults)
          const startsWithIds = new Set(startsWithResults.map(r => r.id));
          const containsResults = containsDocs
            .map(doc => doc.toJSON())
            .filter(record => !startsWithIds.has(record.id))
            .slice(0, remainingLimit);

          console.log(`[DictionaryStore] ✅ OFFLINE: Got ${containsResults.length} contains results (after filtering)`);

          records = [...startsWithResults, ...containsResults];
        } else {
          records = startsWithResults;
        }
      } else {
        // Regular query (no search or with cursor)
        const selector: any = { table_name: tableName };

        if (cursor) {
          selector[nameField] = { $gt: cursor };
        }

        const cached = await this.collection.find({
          selector,
          sort: [{ [nameField]: 'asc' }, { id: 'asc' }],  // ✅ Tie-breaker for stable sort
          limit
        }).exec();

        records = cached.map(doc => doc.toJSON());
      }

      const nextCursor = records.length > 0 ? records[records.length - 1][nameField] : null;
      const hasMore = records.length >= limit;

      console.log(`[DictionaryStore] 📦 OFFLINE: Returned ${records.length} records from cache (hasMore: ${hasMore})`);

      return {
        records,
        total: records.length, // Can't get accurate total in offline mode
        hasMore,
        nextCursor
      };
    } catch (cacheError) {
      console.error('[DictionaryStore] ❌ OFFLINE: Cache query failed:', cacheError);

      // Final fallback: empty result
      return {
        records: [],
        total: 0,
        hasMore: false,
        nextCursor: null
      };
    }
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
