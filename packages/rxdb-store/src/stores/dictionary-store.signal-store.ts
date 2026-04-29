import { signal } from '@preact/signals-react';
import type { RxCollection } from 'rxdb';
import { DICTIONARY_RECORDS_STALE_MS } from '../cache/cache-policies';
import { getDatabase } from '../services/database.service';
import type { AppDatabase } from '../services/database.service';
import { dictionariesSchema, type DictionaryDocument } from '../collections/dictionaries.schema';
import { supabase } from '../supabase/client';
import { buildDictionaryDedupeKey } from './dictionary-store.helpers';

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
  private db: AppDatabase | null = null;
  private collection: DictionaryCollection | null = null;

  // Cleanup interval reference
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  // In-flight Promise cache for getDictionary. Concurrent callers asking for
  // the same `(table, args)` shape await the same promise instead of issuing
  // duplicate Phase 1 + Phase 3 Supabase round-trips. The cache entry is
  // dropped as soon as the promise settles — staleness is still governed by
  // the regular RxDB + 24h staleness layer.
  private inflightDictionary = new Map<
    string,
    Promise<{
      records: DictionaryDocument[];
      total: number;
      hasMore: boolean;
      nextCursor: string | null;
    }>
  >();

  /**
   * Cache hit/miss telemetry. Counters mirror the structure used by
   * spaceStore — `dedup` increments when a concurrent identical request
   * shared the in-flight promise (P3), `miss` when we ran the full Phase
   * 1+3 pipeline, `hit` when the eventual result was fully populated from
   * RxDB without Phase 3 fetch.
   */
  cacheStats = {
    getDictionary: {
      hit: 0,
      miss: 0,
      dedup: 0,
    },
  };

  resetCacheStats(): void {
    for (const k of Object.keys(this.cacheStats.getDictionary) as Array<
      keyof typeof this.cacheStats.getDictionary
    >) {
      this.cacheStats.getDictionary[k] = 0;
    }
  }

  private constructor() {}

  static getInstance(): DictionaryStore {
    if (!DictionaryStore.instance) {
      DictionaryStore.instance = new DictionaryStore();
    }
    return DictionaryStore.instance;
  }

  /** Wait for store initialization (polls every 100ms, max 10s) */
  private waitForInitialization(): Promise<void> {
    if (this.initialized.value) return Promise.resolve();
    return new Promise((resolve) => {
      const maxWait = 10_000;
      const interval = 100;
      let elapsed = 0;
      const check = setInterval(() => {
        elapsed += interval;
        if (this.initialized.value || elapsed >= maxWait) {
          clearInterval(check);
          resolve();
        }
      }, interval);
    });
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
      const db = await getDatabase();
      this.db = db;

      // Check if collection already exists, create if needed
      // Note: DictionaryStore needs migration strategies, so we can't use getOrCreateCollection helper
      if (!db.dictionaries) {
        await db.addCollections({
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

      this.collection = db.dictionaries as DictionaryCollection;
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
      filterByIds?: string[];
      junctionFilter?: {
        junctionTable: string;
        junctionFilterField: string;
        filterValue: string;
      };
      defaultFilters?: Record<string, any>;
    }
  ): Promise<Array<{ id: string; name: string; updated_at?: string }>> {
    const { search, limit, cursor, filterByIds, junctionFilter, defaultFilters } = options;

    // Determine select clause and filter strategy:
    // - junctionFilter: use PostgREST embedded !inner join (no URL length issues)
    // - filterByIds: use .in() (OK for small sets, URL too long for 100+ UUIDs)
    // Include updated_at for staleness check (server-based instead of timer-based)
    const selectClause = junctionFilter
      ? `${idField}, ${nameField}, updated_at, ${junctionFilter.junctionTable}!inner(${junctionFilter.junctionFilterField})`
      : `${idField}, ${nameField}, updated_at`;

    // Helper: apply junction, ID, or static filters to a query builder
    const applyFilter = (q: any) => {
      if (junctionFilter) {
        q = q.eq(`${junctionFilter.junctionTable}.${junctionFilter.junctionFilterField}`, junctionFilter.filterValue);
      }
      if (filterByIds && filterByIds.length > 0) {
        q = q.in(idField, filterByIds);
      }
      if (defaultFilters) {
        for (const [key, value] of Object.entries(defaultFilters)) {
          q = q.eq(key, value);
        }
      }
      return q;
    };

    // 🎯 HYBRID SEARCH: If search provided, fetch starts_with + contains separately
    if (search && !cursor) {
      // Phase 1: Starts with (high priority)
      let startsWithQuery = supabase
        .from(tableName)
        .select(selectClause)
        .ilike(nameField, `${search}%`);  // ✅ Starts with
      startsWithQuery = applyFilter(startsWithQuery);
      startsWithQuery = startsWithQuery
        .order(nameField, { ascending: true, nullsFirst: false })
        .order(idField, { ascending: true, nullsFirst: false })  // ✅ Tie-breaker for stable sort
        .limit(Math.ceil(limit * 0.7));  // 70% for starts_with

      const { data: startsWithData, error: startsWithError } = await startsWithQuery;

      if (startsWithError) {
        throw new Error(`Hybrid search (starts_with) failed: ${startsWithError.message}`);
      }

      const startsWithResults = (startsWithData || []).map((record: any) => ({
        id: String(record[idField]),
        name: String(record[nameField]),
        updated_at: record.updated_at as string | undefined,
      }));

      // Phase 2: Contains (lower priority) - only if we have room
      const remainingLimit = limit - startsWithResults.length;
      if (remainingLimit > 0) {
        let containsQuery = supabase
          .from(tableName)
          .select(selectClause)
          .ilike(nameField, `%${search}%`)  // ✅ Contains
          .not(nameField, 'ilike', `${search}%`);  // ❌ Exclude starts_with (already fetched)
        containsQuery = applyFilter(containsQuery);
        containsQuery = containsQuery
          .order(nameField, { ascending: true, nullsFirst: false })
          .order(idField, { ascending: true, nullsFirst: false })  // ✅ Tie-breaker for stable sort
          .limit(remainingLimit);

        const { data: containsData, error: containsError } = await containsQuery;

        if (!containsError) {
          const containsResults = (containsData || []).map((record: any) => ({
            id: String(record[idField]),
            name: String(record[nameField]),
            updated_at: record.updated_at as string | undefined,
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
      .select(selectClause);

    // Apply junction or ID filter
    query = applyFilter(query);

    // Apply search filter (contains) if provided with cursor
    if (search) {
      query = query.ilike(nameField, `%${search}%`);
    }

    // ✅ KEYSET PAGINATION: Use cursor (name > cursor) instead of offset
    if (cursor !== null) {
      query = query.gt(nameField, cursor);
    }

    // ✅ Always sort A-Z by name for dictionaries, with id tie-breaker (NULLS LAST)
    query = query
      .order(nameField, { ascending: true, nullsFirst: false })
      .order(idField, { ascending: true, nullsFirst: false })  // ✅ Tie-breaker for stable sort
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch IDs from ${tableName}: ${error.message}`);
    }

    // Normalize to { id, name, updated_at }
    return (data || []).map((record: any) => ({
      id: String(record[idField]),
      name: String(record[nameField]),
      updated_at: record.updated_at as string | undefined,
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
    return (data || []).map((row) => {
      const record = row as unknown as Record<string, unknown>;
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
  getDictionary(
    tableName: string,
    options: {
      idField?: string;    // From config.referencedFieldID (default: 'id')
      nameField?: string;  // From config.referencedFieldName (default: 'name')
      search?: string;     // Search query (case-insensitive)
      limit?: number;      // Records per page (default: 30)
      cursor?: string | null; // ✅ Cursor for keyset pagination (replaces offset)
      additionalFields?: string[]; // Extra fields to fetch and store in 'additional'
      filterByIds?: string[]; // Restrict results to these IDs (small sets only, uses .in() URL param)
      junctionFilter?: { // Server-side join filter via PostgREST embedded select (no URL length issues)
        junctionTable: string;
        junctionFilterField: string;
        filterValue: string;
      };
      defaultFilters?: Record<string, any>; // Static filter on referenced table (e.g. { for_pet: true })
    } = {}
  ): Promise<{ records: DictionaryDocument[]; total: number; hasMore: boolean; nextCursor: string | null }> {
    if (!this.collection) {
      return Promise.reject(new Error('[DictionaryStore] Not initialized'));
    }

    // In-flight dedupe: two callers asking for the exact same `(table, args)`
    // shape share the underlying network round-trip. Stable key requires a
    // deterministic order over option fields and a sorted ID list.
    const dedupeKey = buildDictionaryDedupeKey(tableName, options);
    const inflight = this.inflightDictionary.get(dedupeKey);
    if (inflight) {
      this.cacheStats.getDictionary.dedup += 1;
      return inflight;
    }
    const promise = this.runGetDictionary(tableName, options).finally(() => {
      // Drop the in-flight entry once the promise settles so the next call
      // re-runs through the regular RxDB + staleness pipeline.
      this.inflightDictionary.delete(dedupeKey);
    });
    this.inflightDictionary.set(dedupeKey, promise);
    return promise;
  }

  private async runGetDictionary(
    tableName: string,
    options: Parameters<DictionaryStore['getDictionary']>[1] = {},
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
      additionalFields,
      filterByIds,
      junctionFilter,
      defaultFilters
    } = options;

    // 📴 PREVENTIVE OFFLINE CHECK: Skip Supabase if browser is offline
    if (isOffline()) {
      return this.getDictionaryOffline(tableName, { search, limit, cursor, nameField, filterByIds });
    }

    try {
      // 🆔 PHASE 1: Fetch IDs + name field from Supabase (lightweight ~1KB for 30 records)
      const idsData = await this.fetchDictionaryIDsFromSupabase(
        tableName,
        idField,
        nameField,
        { search, limit, cursor, filterByIds, junctionFilter, defaultFilters }
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

      // 💾 PHASE 2: Check RxDB cache for these IDs + staleness check
      const cached = await this.collection.find({
        selector: {
          table_name: tableName,
          id: { $in: ids }
        }
      }).exec();

      const cachedMap = new Map(cached.map(doc => [doc.id, doc.toJSON()]));

      // Staleness check: compare server updated_at with cached updated_at
      // Fallback to 24h cachedAt-based TTL if updated_at not available
      const now = Date.now();
      const serverUpdatedAtMap = new Map(
        idsData.filter(r => r.updated_at).map(r => [r.id, r.updated_at!])
      );
      const missingIds: string[] = [];
      const staleIds: string[] = [];

      for (const id of ids) {
        const cachedDoc = cachedMap.get(id);
        if (!cachedDoc) {
          missingIds.push(id);
          continue;
        }

        // If the caller requested additional fields that the cached record
        // doesn't carry (e.g. a previous getDictionary/getRecordById call
        // stored only a narrow projection like { code }, and the current
        // call needs { pet_type_id }), treat the record as stale so we
        // re-fetch the full projection. Without this guard the dropdown
        // cascade filter for sex on pet_type_id silently dropped Dog
        // options because their cached `additional` only held `code`.
        if (additionalFields?.length) {
          const cachedAdditional = cachedDoc.additional ?? {};
          const missingField = additionalFields.some(
            (field) =>
              field !== idField &&
              field !== nameField &&
              cachedAdditional[field] === undefined,
          );
          if (missingField) {
            staleIds.push(id);
            continue;
          }
        }

        const serverUpdatedAt = serverUpdatedAtMap.get(id);
        if (serverUpdatedAt && cachedDoc.additional?.updated_at) {
          // Server-based staleness: compare updated_at timestamps
          if (serverUpdatedAt > cachedDoc.additional.updated_at) {
            staleIds.push(id);
          }
        } else if (cachedDoc.cachedAt && (now - cachedDoc.cachedAt) > DICTIONARY_RECORDS_STALE_MS) {
          // Fallback: cachedAt-based TTL for tables without updated_at
          staleIds.push(id);
        }
      }

      const toFetchIds = [...missingIds, ...staleIds];

      if (toFetchIds.length === 0) {
        // Full RxDB cache hit — no Phase 3 traffic.
        this.cacheStats.getDictionary.hit += 1;
      } else {
        this.cacheStats.getDictionary.miss += 1;
      }

      // 🌐 PHASE 3: Fetch missing + stale records from Supabase
      let freshRecords: DictionaryDocument[] = [];
      if (toFetchIds.length > 0) {
        freshRecords = await this.fetchDictionaryRecordsByIDs(
          tableName,
          idField,
          nameField,
          toFetchIds,
          additionalFields
        );

        // Cache fresh records in RxDB (upsert for stale, insert for missing).
        // Merge with existing `additional` so that a narrow projection (e.g.
        // current call fetched only { pet_type_id }) doesn't wipe fields a
        // previous call already cached (e.g. { code } from PetListCard). Without
        // this merge the cache oscillates between projections and cascading
        // callers keep re-fetching.
        if (freshRecords.length > 0) {
          const mergedRecords = freshRecords.map((record) => {
            const existing = cachedMap.get(record.id);
            if (!existing?.additional || !record.additional) {
              return record;
            }
            return {
              ...record,
              additional: { ...existing.additional, ...record.additional },
            };
          });
          await this.collection.bulkUpsert(mergedRecords);
          freshRecords = mergedRecords;
        }
      }

      // 🔀 PHASE 4: Merge cached + fresh, maintain order from IDs query
      const recordsMap = new Map<string, DictionaryDocument>([
        ...Array.from(cachedMap.entries()),
        ...freshRecords.map((record): [string, DictionaryDocument] => [record.id, record])
      ]);

      // CRITICAL: Maintain exact order from IDs query (sorted A-Z by name)!
      const orderedRecords = ids
        .map(id => recordsMap.get(id))
        .filter((record): record is DictionaryDocument => record !== undefined);

      // Get total count for hasMore
      let serverTotal = 0;
      try {
        // Use junction join for count when available (avoids URL length issues)
        const countSelect = junctionFilter
          ? `${idField}, ${junctionFilter.junctionTable}!inner(${junctionFilter.junctionFilterField})`
          : '*';
        let countQuery = supabase
          .from(tableName)
          .select(countSelect, { count: 'exact', head: true });

        if (junctionFilter) {
          countQuery = countQuery.eq(
            `${junctionFilter.junctionTable}.${junctionFilter.junctionFilterField}`,
            junctionFilter.filterValue
          );
        } else if (filterByIds && filterByIds.length > 0) {
          countQuery = countQuery.in(idField, filterByIds);
        }

        if (defaultFilters) {
          for (const [key, value] of Object.entries(defaultFilters)) {
            countQuery = countQuery.eq(key, value);
          }
        }

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
      return this.getDictionaryOffline(tableName, { search, limit, cursor, nameField, filterByIds });
    }
  }

  /**
   * Get dictionary in offline mode (RxDB only)
   */
  private async getDictionaryOffline(
    tableName: string,
    options: { search?: string; limit: number; cursor: string | null; nameField: string; filterByIds?: string[] }
  ): Promise<{ records: DictionaryDocument[]; total: number; hasMore: boolean; nextCursor: string | null }> {
    const { search, limit, cursor, nameField, filterByIds } = options;

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

      // Build base ID filter for offline filterByIds
      const idFilter = filterByIds && filterByIds.length > 0
        ? { id: { $in: filterByIds } }
        : {};

      // 🎯 HYBRID SEARCH: If search provided, fetch starts_with + contains separately
      if (search && !cursor) {
        // Escape regex special characters
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Phase 1: Starts with (high priority, 70% of limit)
        const startsWithLimit = Math.ceil(limit * 0.7);
        const startsWithSelector = {
          table_name: tableName,
          ...idFilter,
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
            ...idFilter,
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
        const selector: Record<string, any> = { table_name: tableName, ...idFilter };

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

      const nextCursor = records.length > 0 ? records[records.length - 1]?.name ?? null : null;
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
   * Get allowed IDs from a junction table (many-to-many relationship)
   *
   * Used for filtering dropdowns by junction tables like coat_type_in_breed.
   * Online: SELECT DISTINCT targetField FROM junctionTable WHERE filterField = filterValue
   * Offline: Query RxDB child collection cache
   *
   * @param junctionTable - Junction table name (e.g., 'coat_type_in_breed')
   * @param targetField - Field to extract IDs from (e.g., 'coat_type_id')
   * @param filterField - Field to filter by (e.g., 'breed_id')
   * @param filterValue - Value to match (e.g., breed UUID)
   * @returns Array of unique target IDs
   */
  async getJunctionIds(
    junctionTable: string,
    targetField: string,
    filterField: string,
    filterValue: string,
    additionalFilters?: Array<{ field: string; value: string }>
  ): Promise<string[]> {
    // Online: query Supabase directly
    if (!isOffline()) {
      try {
        let query = supabase
          .from(junctionTable)
          .select(targetField)
          .eq(filterField, filterValue);

        if (additionalFilters) {
          for (const f of additionalFilters) {
            query = query.eq(f.field, f.value);
          }
        }

        const { data, error } = await query;

        if (error) {
          throw new Error(`Junction query failed: ${error.message}`);
        }

        // Extract unique IDs
        const ids: string[] = (data || [])
          .map((row) => String((row as unknown as Record<string, unknown>)[targetField] ?? ''))
          .filter(id => id && id !== 'null' && id !== 'undefined');

        return Array.from(new Set<string>(ids));
      } catch (error) {
        if (!isNetworkError(error)) {
          console.error(`[DictionaryStore] getJunctionIds failed for ${junctionTable}:`, error);
        }
        // Fall through to offline fallback
      }
    }

    // Offline fallback: query RxDB child collection
    try {
      const db = await getDatabase();
      // Derive parent entity from junction table (e.g., 'coat_type_in_breed' → 'breed_children')
      const parentEntity = junctionTable.split('_in_').pop();
      const collectionName = `${parentEntity}_children`;
      const collections = db.collections as Record<string, any>;
      const collection = collections[collectionName];

      if (!collection) {
        return [];
      }

      const docs = await collection.find({
        selector: {
          parentId: filterValue,
          tableType: junctionTable
        }
      }).exec();

      const ids = docs
        .map((doc: any) => {
          const json = doc.toJSON();
          return String(json.additional?.[targetField] || '');
        })
        .filter((id: string) => id && id !== 'null' && id !== 'undefined');

      return Array.from(new Set<string>(ids));
    } catch {
      return [];
    }
  }

  /**
   * Get a single record by ID from dictionary table
   * Used for pre-loading selected values in LookupInput and dictionary lookups
   * Fetches ALL fields by default, or a narrow projection when additionalFields is provided
   */
  async getRecordById(
    tableName: string,
    id: string,
    options: {
      idField?: string;
      nameField?: string;
      additionalFields?: string[];
    } = {}
  ): Promise<Record<string, unknown> | null> {
    const {
      idField = 'id',
      nameField = 'name',
      additionalFields,
    } = options;

    // Wait for initialization if not ready yet (max 10s)
    if (!this.initialized.value) {
      await this.waitForInitialization();
    }

    try {
      // First check local RxDB cache
      if (this.collection) {
        const cached = await this.collection.findOne({
          selector: {
            table_name: tableName,
            id: id
          }
        }).exec();

        if (cached && cached.additional) {
          const hasRequestedAdditionalFields = !additionalFields?.length
            || additionalFields.every((field) =>
              field === idField
              || field === nameField
              || Object.prototype.hasOwnProperty.call(cached.additional || {}, field),
            );

          if (hasRequestedAdditionalFields) {
            // Return cached data with all fields (fully resolved record)
            const result: Record<string, unknown> = {
              [idField]: cached.id,
              [nameField]: cached.name
            };
            Object.assign(result, cached.additional);
            return result;
          }
        }
        // If cached without additional fields (e.g. from batch getDictionary),
        // or requested fields are missing, fall through to Supabase
      }

      const selectFields = additionalFields?.length
        ? Array.from(new Set([idField, nameField, ...additionalFields])).join(', ')
        : '*';

      // If not in cache, fetch from Supabase
      if (!isOffline()) {
        const { data, error } = await supabase
          .from(tableName)
          .select(selectFields)
          .eq(idField, id)
          .single();

        if (error) {
          console.error('[DictionaryStore] getRecordById error:', error);
          return null;
        }

        // Cache the record for future use
        if (data && this.collection) {
          try {
            const row = data as unknown as Record<string, unknown>;
            // Extract additional fields (everything except id, name)
            const {
              [idField]: fetchedId,
              [nameField]: fetchedName,
              ...fetchedAdditionalFields
            } = row;
            const hasAdditional = Object.keys(fetchedAdditionalFields).length > 0;

            await this.collection.upsert({
              composite_id: `${tableName}::${row[idField]}`,
              table_name: tableName,
              id: String(row[idField]),
              name: String(row[nameField]),
              additional: hasAdditional ? fetchedAdditionalFields : undefined,
              cachedAt: Date.now()
            });
          } catch (cacheError) {
            // Ignore cache errors, still return data
            console.warn('[DictionaryStore] Failed to cache record:', cacheError);
          }
        }

        return data as unknown as Record<string, unknown>;
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
