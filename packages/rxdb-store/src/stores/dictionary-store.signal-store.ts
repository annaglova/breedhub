import { signal } from '@preact/signals-react';
import type { RxCollection } from 'rxdb';
import { getDatabase } from '../services/database.service';
import { dictionariesSchema, type DictionaryDocument } from '../collections/dictionaries.schema';
import { supabase } from '../supabase/client';

// Helpers
import {
  DEFAULT_TTL,
  cleanupExpiredDocuments,
  schedulePeriodicCleanup,
  runInitialCleanup,
  isNetworkError,
  isOffline
} from '../helpers';

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
  private db: any = null;  // RxDatabase type is too strict
  private collection: DictionaryCollection | null = null;

  // Cleanup interval reference
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {}

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
      return;
    }

    this.loading.value = true;
    this.error.value = null;

    try {
      // Get database
      this.db = await getDatabase();

      // Check if collection already exists, create if needed
      // Note: DictionaryStore needs migration strategies, so we can't use getOrCreateCollection helper
      if (!this.db.dictionaries) {
        await this.db.addCollections({
          dictionaries: {
            schema: dictionariesSchema,
            migrationStrategies: {
              // Version 1: Added composite index [table_name, name, id] for stable sorting
              1: (oldDoc: any) => oldDoc,
              // Version 2: Added 'additional' field for extra dictionary data
              2: (oldDoc: any) => oldDoc
            }
          }
        });
      }

      this.collection = this.db.dictionaries as DictionaryCollection;
      this.initialized.value = true;

      // Run initial cleanup using helper
      runInitialCleanup(
        () => this.runCleanup(),
        '[DictionaryStore]'
      );

      // Schedule periodic cleanup using helper
      this.cleanupInterval = schedulePeriodicCleanup(
        () => this.runCleanup(),
        '[DictionaryStore]'
      );

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

        if (!containsError) {
          const containsResults = (containsData || []).map(record => ({
            id: String(record[idField]),
            name: String(record[nameField])
          }));

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
    ids: string[],
    additionalFields?: string[]
  ): Promise<DictionaryDocument[]> {
    if (ids.length === 0) return [];

    // Build select string with additional fields
    const selectFields = [idField, nameField];
    if (additionalFields?.length) {
      selectFields.push(...additionalFields);
    }

    const { data, error } = await supabase
      .from(tableName)
      .select(selectFields.join(', '))
      .in(idField, ids);

    if (error) {
      throw new Error(`Failed to fetch records from ${tableName}: ${error.message}`);
    }

    // Transform to DictionaryDocument
    return (data || []).map(record => {
      // Extract additional fields into object
      const additional: Record<string, any> = {};
      if (additionalFields?.length) {
        for (const field of additionalFields) {
          if (record[field] !== undefined) {
            additional[field] = record[field];
          }
        }
      }

      return {
        composite_id: `${tableName}::${record[idField]}`,
        table_name: tableName,
        id: String(record[idField]),
        name: String(record[nameField]),
        additional: Object.keys(additional).length > 0 ? additional : undefined,
        cachedAt: Date.now()
      };
    });
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
      additionalFields?: string[]; // Extra fields to fetch and store in 'additional'
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
      cursor = null,
      additionalFields
    } = options;

    // 📴 PREVENTIVE OFFLINE CHECK: Skip Supabase if browser is offline
    if (isOffline()) {
      return this.getDictionaryOffline(tableName, { search, limit, cursor, nameField });
    }

    try {
      // 🆔 PHASE 1: Fetch IDs + name field from Supabase (lightweight ~1KB for 30 records)
      const idsData = await this.fetchDictionaryIDsFromSupabase(
        tableName,
        idField,
        nameField,
        { search, limit, cursor }
      );

      if (!idsData || idsData.length === 0) {
        return {
          records: [],
          total: 0,
          hasMore: false,
          nextCursor: null
        };
      }

      // Extract IDs and calculate nextCursor
      const ids = idsData.map(d => d.id);
      const nextCursor = idsData[idsData.length - 1]?.name ?? null;

      // 💾 PHASE 2: Check RxDB cache for these IDs
      const cached = await this.collection.find({
        selector: {
          table_name: tableName,
          id: { $in: ids }
        }
      }).exec();

      const cachedMap = new Map(cached.map(doc => [doc.id, doc.toJSON()]));

      // 🌐 PHASE 3: Fetch missing full records from Supabase
      const missingIds = ids.filter(id => !cachedMap.has(id));

      let freshRecords: DictionaryDocument[] = [];
      if (missingIds.length > 0) {
        freshRecords = await this.fetchDictionaryRecordsByIDs(
          tableName,
          idField,
          nameField,
          missingIds,
          additionalFields
        );

        // Cache fresh records in RxDB
        if (freshRecords.length > 0) {
          await this.collection.bulkInsert(freshRecords);
        }
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
      } catch {
        // Ignore count errors
      }

      const hasMore = idsData.length >= limit;

      return {
        records: orderedRecords,
        total: serverTotal,
        hasMore,
        nextCursor
      };

    } catch (error) {
      // Check if this is a network error using helper
      if (!isNetworkError(error)) {
        console.error(`[DictionaryStore] Failed to get dictionary ${tableName}:`, error);
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

      return {
        records,
        total: records.length, // Can't get accurate total in offline mode
        hasMore,
        nextCursor
      };
    } catch {
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
   * Cleanup expired dictionary records using helper
   */
  private async runCleanup(): Promise<void> {
    if (!this.collection) return;

    await cleanupExpiredDocuments(
      this.collection,
      DEFAULT_TTL,
      '[DictionaryStore]'
    );
  }

  /**
   * Clear all cached dictionary data
   * Useful for testing or manual cache reset
   */
  async clearAll(): Promise<void> {
    if (!this.collection) return;

    try {
      await this.collection.find().remove();
    } catch (error) {
      console.error('[DictionaryStore] Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Get a single record by ID from dictionary table
   * Used for pre-loading selected values in LookupInput and dictionary lookups
   * Fetches ALL fields (id, name, code, etc.) for flexibility
   */
  async getRecordById(
    tableName: string,
    id: string,
    options: { idField?: string; nameField?: string } = {}
  ): Promise<Record<string, unknown> | null> {
    const { idField = 'id', nameField = 'name' } = options;

    try {
      // First check local RxDB cache
      if (this.collection) {
        const cached = await this.collection.findOne({
          selector: {
            table_name: tableName,
            id: id
          }
        }).exec();

        if (cached) {
          // Return cached data with additional fields if available
          const result: Record<string, unknown> = {
            [idField]: cached.id,
            [nameField]: cached.name
          };
          // Merge additional fields if present
          if (cached.additional) {
            Object.assign(result, cached.additional);
          }
          return result;
        }
      }

      // If not in cache, fetch from Supabase (fetch ALL fields for flexibility)
      if (!isOffline()) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq(idField, id)
          .single();

        if (error) {
          console.error('[DictionaryStore] getRecordById error:', error);
          return null;
        }

        // Cache the record for future use
        if (data && this.collection) {
          try {
            // Extract additional fields (everything except id, name)
            const { [idField]: fetchedId, [nameField]: fetchedName, ...additionalFields } = data;
            const hasAdditional = Object.keys(additionalFields).length > 0;

            await this.collection.upsert({
              composite_id: `${tableName}::${data[idField]}`,
              table_name: tableName,
              id: String(data[idField]),
              name: String(data[nameField]),
              additional: hasAdditional ? additionalFields : undefined,
              cachedAt: Date.now()
            });
          } catch (cacheError) {
            // Ignore cache errors, still return data
            console.warn('[DictionaryStore] Failed to cache record:', cacheError);
          }
        }

        return data;
      }

      return null;
    } catch (error) {
      console.error('[DictionaryStore] getRecordById failed:', error);
      return null;
    }
  }
}

// Export singleton instance
export const dictionaryStore = DictionaryStore.getInstance();
