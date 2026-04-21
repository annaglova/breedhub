import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildHybridBaseQuery,
  buildHybridSearchPhaseQuery,
  buildHybridSearchPlan,
  buildRxdbCountSelector,
  executeOfflineFilterFlow,
  hydrateFilteredEntities,
  mergeHybridPhaseResults,
  prepareFiltersWithDefaults,
} from "../space-filter.helpers";

describe("space-filter.helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createSupabaseQueryMock() {
    const calls: Array<[string, ...any[]]> = [];
    const query = {
      or(condition: string) {
        calls.push(["or", condition]);
        return query;
      },
      ilike(column: string, pattern: string) {
        calls.push(["ilike", column, pattern]);
        return query;
      },
      not(column: string, operator: string, value: any) {
        calls.push(["not", column, operator, value]);
        return query;
      },
      eq(column: string, value: any) {
        calls.push(["eq", column, value]);
        return query;
      },
    };

    return { calls, query };
  }

  function createSupabaseClientMock() {
    const { calls, query } = createSupabaseQueryMock();

    return {
      calls,
      query,
      client: {
        from(sourceName: string) {
          calls.push(["from", sourceName]);
          return {
            select(columns: string) {
              calls.push(["select", columns]);
              return query;
            },
          };
        },
      },
    };
  }

  it("merges default filters and injects eq field configs for missing default keys", () => {
    expect(
      prepareFiltersWithDefaults(
        { country_id: "ua" },
        { type_id: "kennel" },
        { country_id: { fieldType: "uuid", operator: "eq" } },
      ),
    ).toEqual({
      filters: {
        type_id: "kennel",
        country_id: "ua",
      },
      fieldConfigs: {
        country_id: { fieldType: "uuid", operator: "eq" },
        type_id: { fieldType: "uuid", operator: "eq" },
      },
    });
  });

  it("preserves explicit filter overrides and existing field configs", () => {
    expect(
      prepareFiltersWithDefaults(
        { type_id: "federation" },
        { type_id: "kennel" },
        { type_id: { fieldType: "string", operator: "contains" } },
      ),
    ).toEqual({
      filters: { type_id: "federation" },
      fieldConfigs: {
        type_id: { fieldType: "string", operator: "contains" },
      },
    });
  });

  it("does not mutate input objects", () => {
    const filters = { country_id: "ua" };
    const defaultFilters = { type_id: "kennel" };
    const baseFieldConfigs = {
      country_id: { fieldType: "uuid", operator: "eq" },
    };

    const result = prepareFiltersWithDefaults(
      filters,
      defaultFilters,
      baseFieldConfigs,
    );

    expect(result.filters).not.toBe(filters);
    expect(result.fieldConfigs).not.toBe(baseFieldConfigs);
    expect(filters).toEqual({ country_id: "ua" });
    expect(defaultFilters).toEqual({ type_id: "kennel" });
    expect(baseFieldConfigs).toEqual({
      country_id: { fieldType: "uuid", operator: "eq" },
    });
  });

  it("builds count selector with exact-match string filters by default", () => {
    expect(
      buildRxdbCountSelector(
        { name: "Alpha" },
        { name: { fieldType: "string", operator: "eq" } },
      ),
    ).toEqual({
      _deleted: false,
      name: "Alpha",
    });
  });

  it("builds count selector with search-style string filters when preferred", () => {
    expect(
      buildRxdbCountSelector(
        { name: "Alpha" },
        { name: { fieldType: "string", operator: "eq" } },
        { preferStringSearchOperator: true },
      ),
    ).toEqual({
      _deleted: false,
      name: { $regex: "Alpha", $options: "i" },
    });
  });

  it("executes preventive offline flow with local records and collection-backed count", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      executeOfflineFilterFlow({
        entityType: "pet",
        filters: { status: "active" },
        fieldConfigs: {
          status: { fieldType: "string", operator: "eq" },
        },
        runLocalQuery: async () => ({
          records: [{ id: "1" }, { id: "2" }],
          hasMore: true,
          nextCursor: "cursor-1",
        }),
        buildCountSelector: buildRxdbCountSelector,
        countByCollection: async (selector) => {
          expect(selector).toEqual({
            _deleted: false,
            status: "active",
          });
          return 5;
        },
      }),
    ).resolves.toEqual({
      records: [{ id: "1" }, { id: "2" }],
      total: 5,
      hasMore: true,
      nextCursor: "cursor-1",
      offline: true,
    });

    expect(logSpy).toHaveBeenCalledWith(
      "[SpaceStore] 📴 Offline mode (preventive): returning 2/5 records (hasMore: true)",
    );
  });

  it("returns empty offline shape and logs when collection count lookup fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Collection pet not found");

    await expect(
      executeOfflineFilterFlow({
        entityType: "pet",
        filters: {},
        fieldConfigs: {},
        runLocalQuery: async () => ({
          records: [{ id: "1" }],
          hasMore: false,
          nextCursor: null,
        }),
        buildCountSelector: buildRxdbCountSelector,
        countByCollection: async () => {
          throw error;
        },
      }),
    ).resolves.toEqual({
      records: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
      offline: true,
    });

    expect(errorSpy).toHaveBeenCalledWith(
      "[SpaceStore] Offline mode failed:",
      error,
    );
  });

  it("returns empty offline shape and logs when db is not initialized", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Database not initialized");

    await expect(
      executeOfflineFilterFlow({
        entityType: "pet",
        filters: {},
        fieldConfigs: {},
        runLocalQuery: async () => ({
          records: [{ id: "1" }],
          hasMore: false,
          nextCursor: null,
        }),
        buildCountSelector: buildRxdbCountSelector,
        countByCollection: async () => {
          throw error;
        },
      }),
    ).resolves.toEqual({
      records: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
      offline: true,
    });

    expect(errorSpy).toHaveBeenCalledWith(
      "[SpaceStore] Offline mode failed:",
      error,
    );
  });

  it("returns empty offline shape and logs when local query throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Local query failed");

    await expect(
      executeOfflineFilterFlow({
        entityType: "pet",
        filters: {},
        fieldConfigs: {},
        runLocalQuery: async () => {
          throw error;
        },
        buildCountSelector: buildRxdbCountSelector,
        countByCollection: async () => 0,
      }),
    ).resolves.toEqual({
      records: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
      offline: true,
    });

    expect(errorSpy).toHaveBeenCalledWith(
      "[SpaceStore] Offline mode failed:",
      error,
    );
  });

  it("hydrates filtered entities with mixed cached, missing, and stale records", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const upserted: any[] = [];
    let lastSelector: Record<string, any> | undefined;
    const cachedRecords = [
      { id: "a", updated_at: "2024-01-01", label: "cached-a" },
      { id: "b", updated_at: "2024-01-01", label: "cached-b-old" },
    ];
    const collection = {
      find(options: { selector: Record<string, any> }) {
        lastSelector = options.selector;
        return {
          exec: async () =>
            cachedRecords.map((record) => ({
              id: record.id,
              toJSON: () => record,
            })),
        };
      },
      async bulkUpsert(records: any[]) {
        upserted.push(...records);
      },
    };
    const fetchRecords = vi.fn(async (ids: string[]) => {
      expect(ids).toEqual(["c", "b"]);
      return [
        { id: "c", updated_at: "2024-03-01", label: "fresh-c" },
        { id: "b", updated_at: "2024-02-01", label: "fresh-b" },
      ];
    });

    await expect(
      hydrateFilteredEntities({
        ids: ["a", "b", "c"],
        idsData: [
          { id: "a", updated_at: "2024-01-01" },
          { id: "b", updated_at: "2024-02-01" },
          { id: "c", updated_at: "2024-03-01" },
        ],
        limit: 3,
        nextCursor: "cursor-1",
        collection,
        fetchRecords,
        mapRecordForCache: (record) => ({
          id: record.id,
          cached: true,
        }),
      }),
    ).resolves.toEqual({
      records: [
        { id: "a", updated_at: "2024-01-01", label: "cached-a" },
        { id: "b", updated_at: "2024-02-01", label: "fresh-b" },
        { id: "c", updated_at: "2024-03-01", label: "fresh-c" },
      ],
      total: 3,
      hasMore: true,
      nextCursor: "cursor-1",
    });

    expect(lastSelector).toEqual({ id: { $in: ["a", "b", "c"] } });
    expect(upserted).toEqual([
      { id: "c", cached: true },
      { id: "b", cached: true },
    ]);
    expect(logSpy).toHaveBeenCalledWith(
      "[SpaceStore] 📦 Cache: 2/3 hit, 1 missing, 1 stale",
    );
    expect(logSpy).toHaveBeenCalledWith(
      "[SpaceStore] 🌐 Phase 3: Fetching 2 records (1 missing + 1 stale)...",
    );
    expect(logSpy).toHaveBeenCalledWith(
      "[SpaceStore] ✅ Fetched 2 fresh records",
    );
    expect(logSpy).toHaveBeenCalledWith(
      "[SpaceStore] 💾 Cached 2 fresh records in RxDB",
    );
    expect(logSpy).toHaveBeenCalledWith(
      "[SpaceStore] ✅ Returning 3 records (hasMore: true)",
    );
  });

  it("hydrates filtered entities without Phase 3 fetch when cache is fully fresh", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchRecords = vi.fn();
    const collection = {
      find() {
        return {
          exec: async () => [
            {
              id: "a",
              toJSON: () => ({ id: "a", updated_at: "2024-01-01" }),
            },
            {
              id: "b",
              toJSON: () => ({ id: "b", updated_at: "2024-01-02" }),
            },
          ],
        };
      },
      async bulkUpsert() {},
    };

    await expect(
      hydrateFilteredEntities({
        ids: ["a", "b"],
        idsData: [
          { id: "a", updated_at: "2024-01-01" },
          { id: "b", updated_at: "2024-01-02" },
        ],
        limit: 3,
        nextCursor: null,
        collection,
        fetchRecords,
        mapRecordForCache: (record) => record,
      }),
    ).resolves.toEqual({
      records: [
        { id: "a", updated_at: "2024-01-01" },
        { id: "b", updated_at: "2024-01-02" },
      ],
      total: 2,
      hasMore: false,
      nextCursor: null,
    });

    expect(fetchRecords).not.toHaveBeenCalled();
    expect(
      logSpy.mock.calls.some(([message]) =>
        String(message).includes("🌐 Phase 3: Fetching"),
      ),
    ).toBe(false);
  });

  it("skips RxDB cache log when no fresh records were cached", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const collection = {
      find() {
        return {
          exec: async () => [
            {
              id: "a",
              toJSON: () => ({ id: "a", updated_at: "2024-01-01" }),
            },
          ],
        };
      },
      async bulkUpsert() {},
    };

    await expect(
      hydrateFilteredEntities({
        ids: ["a", "b"],
        idsData: [
          { id: "a", updated_at: "2024-01-01" },
          { id: "b", updated_at: "2024-02-01" },
        ],
        limit: 2,
        nextCursor: "cursor-2",
        collection,
        fetchRecords: async () => [],
        mapRecordForCache: (record) => record,
      }),
    ).resolves.toEqual({
      records: [{ id: "a", updated_at: "2024-01-01" }],
      total: 1,
      hasMore: true,
      nextCursor: "cursor-2",
    });

    expect(
      logSpy.mock.calls.some(([message]) =>
        String(message).includes("💾 Cached"),
      ),
    ).toBe(false);
  });

  it("hydrates filtered entities with custom log labels for child-flow strings", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const collection = {
      find() {
        return {
          exec: async () => [
            {
              id: "a",
              toJSON: () => ({ id: "a", updated_at: "2024-01-01" }),
            },
          ],
        };
      },
      async bulkUpsert(records: any[]) {
        return records;
      },
    };

    await expect(
      hydrateFilteredEntities({
        ids: ["a", "b"],
        idsData: [
          { id: "a", updated_at: "2024-01-01" },
          { id: "b", updated_at: "2024-02-01" },
        ],
        limit: 2,
        nextCursor: "cursor-2",
        collection,
        fetchRecords: async () => [{ id: "b", updated_at: "2024-02-01" }],
        logLabels: {
          cacheTitle: "Child cache",
          recordNoun: "child records",
          cachedFreshDescriptor: "records",
        },
      }),
    ).resolves.toEqual({
      records: [
        { id: "a", updated_at: "2024-01-01" },
        { id: "b", updated_at: "2024-02-01" },
      ],
      total: 2,
      hasMore: true,
      nextCursor: "cursor-2",
    });

    expect(logSpy).toHaveBeenCalledWith(
      "[SpaceStore] 📦 Child cache: 1/2 hit, 1 missing, 0 stale",
    );
    expect(logSpy).toHaveBeenCalledWith(
      "[SpaceStore] 🌐 Phase 3: Fetching 1 child records (1 missing + 0 stale)...",
    );
    expect(logSpy).toHaveBeenCalledWith(
      "[SpaceStore] ✅ Fetched 1 fresh child records",
    );
    expect(logSpy).toHaveBeenCalledWith(
      "[SpaceStore] 💾 Cached 1 records",
    );
    expect(logSpy).toHaveBeenCalledWith(
      "[SpaceStore] ✅ Returning 2 child records (hasMore: true)",
    );
  });

  it("omits record cache mapper when hydrateFilteredEntities is called without one", async () => {
    const upserted: any[] = [];
    const collection = {
      find() {
        return {
          exec: async () => [],
        };
      },
      async bulkUpsert(records: any[]) {
        upserted.push(...records);
      },
    };

    await expect(
      hydrateFilteredEntities({
        ids: ["b"],
        idsData: [{ id: "b", updated_at: "2024-02-01" }],
        limit: 1,
        nextCursor: null,
        collection,
        fetchRecords: async () => [{ id: "b", updated_at: "2024-02-01", label: "fresh-b" }],
      }),
    ).resolves.toEqual({
      records: [{ id: "b", updated_at: "2024-02-01", label: "fresh-b" }],
      total: 1,
      hasMore: true,
      nextCursor: null,
    });

    expect(upserted).toEqual([
      { id: "b", updated_at: "2024-02-01", label: "fresh-b" },
    ]);
  });

  it("supports custom offline success and error log prefixes", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const offlineError = new Error("offline failed");

    await executeOfflineFilterFlow({
      entityType: "pet",
      filters: {},
      fieldConfigs: {},
      runLocalQuery: async () => ({
        records: [{ id: "1" }],
        hasMore: false,
        nextCursor: null,
      }),
      buildCountSelector: buildRxdbCountSelector,
      countByCollection: async () => 1,
      logPrefix: "Offline mode",
    });

    await executeOfflineFilterFlow({
      entityType: "pet",
      filters: {},
      fieldConfigs: {},
      runLocalQuery: async () => {
        throw offlineError;
      },
      buildCountSelector: buildRxdbCountSelector,
      countByCollection: async () => 0,
      catchLogPrefix: "Offline fallback also failed:",
    });

    expect(logSpy).toHaveBeenCalledWith(
      "[SpaceStore] 📴 Offline mode: returning 1/1 records (hasMore: false)",
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "[SpaceStore] Offline fallback also failed:",
      offlineError,
    );
  });

  it("passes count selector extra options through the offline flow", async () => {
    const buildCountSelector = vi.fn(() => ({ _deleted: false }));

    await executeOfflineFilterFlow({
      entityType: "pet",
      filters: { name: "Alpha" },
      fieldConfigs: { name: { fieldType: "string", operator: "eq" } },
      runLocalQuery: async () => ({
        records: [],
        hasMore: false,
        nextCursor: null,
      }),
      buildCountSelector,
      countByCollection: async () => 0,
      countSelectorExtraOptions: { preferStringSearchOperator: true },
    });

    expect(buildCountSelector).toHaveBeenCalledWith(
      { name: "Alpha" },
      { name: { fieldType: "string", operator: "eq" } },
      {
        entityType: "pet",
        preferStringSearchOperator: true,
      },
    );
  });

  it("builds hybrid search plan for OR search fields sharing the same value", () => {
    expect(
      buildHybridSearchPlan(
        {
          father_name: "John",
          mother_name: "John",
          status: "active",
        },
        {
          father_name: { fieldType: "string", operator: "contains" },
          mother_name: { fieldType: "string", operator: "contains" },
          status: { fieldType: "string", operator: "eq" },
        },
        10,
      ),
    ).toEqual({
      searchValue: "John",
      orSearchFields: ["father_name", "mother_name"],
      isOrSearch: true,
      otherFilters: {
        status: "active",
      },
      startsWithLimit: 7,
    });
  });

  it("keeps non-grouped search filters in hybrid plan otherFilters", () => {
    expect(
      buildHybridSearchPlan(
        {
          title: "Alpha",
          subtitle: "Beta",
          country_id: "ua",
        },
        {
          title: { fieldType: "string", operator: "contains" },
          subtitle: { fieldType: "string", operator: "contains" },
          country_id: { fieldType: "uuid", operator: "eq" },
        },
        9,
      ),
    ).toEqual({
      searchValue: "Alpha",
      orSearchFields: ["title"],
      isOrSearch: false,
      otherFilters: {
        subtitle: "Beta",
        country_id: "ua",
      },
      startsWithLimit: 7,
    });
  });

  it("returns null when there are no search-operator string filters", () => {
    expect(
      buildHybridSearchPlan(
        { status: "active", country_id: "ua" },
        {
          status: { fieldType: "string", operator: "eq" },
          country_id: { fieldType: "uuid", operator: "eq" },
        },
        10,
      ),
    ).toBeNull();
  });

  it("builds hybrid base query from source, select fields, and deleted filter", () => {
    const { calls, client, query } = createSupabaseClientMock();

    const result = buildHybridBaseQuery(
      client,
      "litter_with_parents",
      "id,name,updated_at",
    );

    expect(result).toBe(query);
    expect(calls).toEqual([
      ["from", "litter_with_parents"],
      ["select", "id,name,updated_at"],
      ["or", "deleted.is.null,deleted.eq.false"],
    ]);
  });

  it("builds starts_with hybrid query for OR search fields and applies other filters", () => {
    const { calls, query } = createSupabaseQueryMock();

    const result = buildHybridSearchPhaseQuery(
      query,
      {
        searchValue: "John",
        orSearchFields: ["father_name", "mother_name"],
        isOrSearch: true,
        otherFilters: { status: "active" },
        startsWithLimit: 7,
      },
      {
        phase: "starts_with",
        fieldConfigs: {
          status: { fieldType: "string", operator: "eq" },
        },
      },
    );

    expect(result).toBe(query);
    expect(calls).toEqual([
      ["or", "father_name.ilike.John%,mother_name.ilike.John%"],
      ["eq", "status", "active"],
    ]);
  });

  it("builds contains hybrid query for OR search fields without starts_with exclusion", () => {
    const { calls, query } = createSupabaseQueryMock();

    buildHybridSearchPhaseQuery(
      query,
      {
        searchValue: "John",
        orSearchFields: ["father_name", "mother_name"],
        isOrSearch: true,
        otherFilters: { status: "active" },
        startsWithLimit: 7,
      },
      {
        phase: "contains",
        fieldConfigs: {
          status: { fieldType: "string", operator: "eq" },
        },
      },
    );

    expect(calls).toEqual([
      ["or", "father_name.ilike.%John%,mother_name.ilike.%John%"],
      ["eq", "status", "active"],
    ]);
  });

  it("builds starts_with hybrid query for a single search field", () => {
    const { calls, query } = createSupabaseQueryMock();

    buildHybridSearchPhaseQuery(
      query,
      {
        searchValue: "Alpha",
        orSearchFields: ["title"],
        isOrSearch: false,
        otherFilters: { country_id: "ua" },
        startsWithLimit: 7,
      },
      {
        phase: "starts_with",
        fieldConfigs: {
          country_id: { fieldType: "uuid", operator: "eq" },
        },
      },
    );

    expect(calls).toEqual([
      ["ilike", "title", "Alpha%"],
      ["eq", "country_id", "ua"],
    ]);
  });

  it("builds contains hybrid query for a single search field with starts_with exclusion", () => {
    const { calls, query } = createSupabaseQueryMock();

    buildHybridSearchPhaseQuery(
      query,
      {
        searchValue: "Alpha",
        orSearchFields: ["title"],
        isOrSearch: false,
        otherFilters: { country_id: "ua" },
        startsWithLimit: 7,
      },
      {
        phase: "contains",
        fieldConfigs: {
          country_id: { fieldType: "uuid", operator: "eq" },
        },
      },
    );

    expect(calls).toEqual([
      ["ilike", "title", "%Alpha%"],
      ["not", "title", "ilike", "Alpha%"],
      ["eq", "country_id", "ua"],
    ]);
  });

  it("merges hybrid phase results preserving starts_with order and removing duplicates", () => {
    expect(
      mergeHybridPhaseResults(
        [
          { id: "1", label: "starts-1" },
          { id: "2", label: "starts-2" },
        ],
        [
          { id: "2", label: "contains-2" },
          { id: "3", label: "contains-3" },
        ],
        4,
      ),
    ).toEqual([
      { id: "1", label: "starts-1" },
      { id: "2", label: "starts-2" },
      { id: "3", label: "contains-3" },
    ]);
  });

  it("returns starts_with results unchanged when contains results are empty", () => {
    expect(
      mergeHybridPhaseResults(
        [
          { id: "1", label: "starts-1" },
          { id: "2", label: "starts-2" },
        ],
        [],
        4,
      ),
    ).toEqual([
      { id: "1", label: "starts-1" },
      { id: "2", label: "starts-2" },
    ]);
  });

  it("caps merged hybrid results to the requested limit", () => {
    expect(
      mergeHybridPhaseResults(
        [
          { id: "1", label: "starts-1" },
          { id: "2", label: "starts-2" },
        ],
        [
          { id: "3", label: "contains-3" },
          { id: "4", label: "contains-4" },
        ],
        3,
      ),
    ).toEqual([
      { id: "1", label: "starts-1" },
      { id: "2", label: "starts-2" },
      { id: "3", label: "contains-3" },
    ]);
  });
});
