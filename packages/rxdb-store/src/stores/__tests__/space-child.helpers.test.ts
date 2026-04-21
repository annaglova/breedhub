import { describe, expect, it, vi } from "vitest";
import {
  applyChildListQueryOptions,
  createEmptyChildPageResult,
  executeLocalChildQuery,
  filterLocalChildEntities,
  getChildCollectionName,
  getExistingChildCollection,
  getDefaultChildOrderBy,
  getChildMutationMetadata,
  hasStaleChildRecords,
  loadChildViewPage,
  mapAndCacheChildRows,
  mapChildRowsToCacheRecords,
  queueChildMutationRefresh,
  toChildPageResult,
} from "../space-child.helpers";

function createMockCollection(records: Record<string, any>[]) {
  return {
    find: (options?: { selector?: Record<string, any> }) => ({
      exec: async () =>
        records
          .filter((record) => {
            const selector = options?.selector || {};
            return Object.entries(selector).every(([field, value]) => {
              if (field.startsWith("additional.")) {
                return record.additional?.[field.replace("additional.", "")] === value;
              }
              return record[field] === value;
            });
          })
          .map((record) => ({
            toJSON: () => record,
          })),
    }),
  } as any;
}

describe("space-child.helpers", () => {
  it("builds the default child orderBy with id tie-breaker", () => {
    expect(getDefaultChildOrderBy()).toEqual({
      field: "id",
      direction: "asc",
      tieBreaker: {
        field: "id",
        direction: "asc",
      },
    });
  });

  it("builds the canonical child collection name from entity type", () => {
    expect(getChildCollectionName("pet")).toBe("pet_children");
  });

  it("prefers in-memory child collections over db collections", () => {
    const memoryCollection = { source: "memory" };
    const dbCollection = { source: "db" };

    expect(
      getExistingChildCollection("pet", {
        childCollections: new Map([["pet_children", memoryCollection]]),
        dbCollections: {
          pet_children: dbCollection,
        },
      }),
    ).toBe(memoryCollection);
  });

  it("falls back to db child collections when memory cache is empty", () => {
    const dbCollection = { source: "db" };

    expect(
      getExistingChildCollection("pet", {
        childCollections: new Map(),
        dbCollections: {
          pet_children: dbCollection,
        },
      }),
    ).toBe(dbCollection);
  });

  it("maps local child query results to paginated child page results", () => {
    expect(
      toChildPageResult({
        records: [{ id: "a" }, { id: "b" }],
        hasMore: true,
        nextCursor: "cursor-1",
      }),
    ).toEqual({
      records: [{ id: "a" }, { id: "b" }],
      total: 2,
      hasMore: true,
      nextCursor: "cursor-1",
    });
    expect(createEmptyChildPageResult()).toEqual({
      records: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
    });
  });

  it("detects stale child records using the oldest cached timestamp", () => {
    expect(
      hasStaleChildRecords(
        [
          { cachedAt: 1_000 },
          { cachedAt: 1_500 },
        ],
        400,
        1_500,
      ),
    ).toBe(true);

    expect(
      hasStaleChildRecords(
        [
          { cachedAt: 1_000 },
          { cachedAt: 1_500 },
        ],
        600,
        1_500,
      ),
    ).toBe(false);

    expect(hasStaleChildRecords([], 600, 1_500)).toBe(false);
  });

  it("applies child list query options in parent-partition-order sequence", () => {
    const calls: Array<[string, ...any[]]> = [];
    const query = {
      eq(column: string, value: any) {
        calls.push(["eq", column, value]);
        return this;
      },
      limit(value: number) {
        calls.push(["limit", value]);
        return this;
      },
      order(column: string, options: { ascending: boolean; nullsFirst: boolean }) {
        calls.push(["order", column, options]);
        return this;
      },
    };

    const result = applyChildListQueryOptions(query, {
      parentField: "breed_id",
      parentId: "breed-1",
      limit: 25,
      orderBy: "placement",
      orderDirection: "desc",
      partitionField: "pet_breed_id",
      partitionValue: "breed-2",
    });

    expect(result).toBe(query);
    expect(calls).toEqual([
      ["eq", "breed_id", "breed-1"],
      ["limit", 25],
      ["eq", "pet_breed_id", "breed-2"],
      ["order", "placement", { ascending: false, nullsFirst: false }],
    ]);
  });

  it("derives child mutation metadata from normalized table type and entity partition config", () => {
    const entitySchemas = new Map([
      [
        "pet",
        {
          partition: {
            keyField: "breed_id",
            childFilterField: "pet_breed_id",
          },
        },
      ],
    ]);

    expect(getChildMutationMetadata(entitySchemas, "pet", "title_in_pet_with_pet")).toEqual({
      normalizedType: "title_in_pet",
      partitionConfig: {
        keyField: "breed_id",
        childFilterField: "pet_breed_id",
      },
    });
  });

  it("flushes the queue before triggering child mutation refresh", async () => {
    let resolveProcess: (() => void) | undefined;
    const processNow = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveProcess = resolve;
        }),
    );
    const refresh = vi.fn();

    queueChildMutationRefresh(
      processNow,
      refresh,
      "pet",
      "title_in_pet",
      "pet-1",
    );

    expect(processNow).toHaveBeenCalledOnce();
    expect(refresh).not.toHaveBeenCalled();

    resolveProcess?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(refresh).toHaveBeenCalledWith("pet", "title_in_pet", "pet-1");
    expect(processNow.mock.invocationCallOrder[0]).toBeLessThan(
      refresh.mock.invocationCallOrder[0],
    );
  });

  it("maps child rows to cache records with service fields preserved", () => {
    const rows = [
      {
        id: "row-1",
        breed_id: "breed-1",
        pet_breed_id: "partition-1",
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
        created_by: "user-1",
        updated_by: "user-2",
        placement: 3,
        name: "Alpha",
      },
    ];

    const records = mapChildRowsToCacheRecords(rows, {
      tableType: "top_pet_in_breed_with_pet",
      parentId: "breed-1",
      parentField: "breed_id",
      partitionField: "pet_breed_id",
      partitionValue: "partition-1",
      cachedAt: 123,
    });

    expect(records).toEqual([
      {
        id: "row-1",
        tableType: "top_pet_in_breed",
        parentId: "breed-1",
        partitionId: "partition-1",
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
        created_by: "user-1",
        updated_by: "user-2",
        additional: {
          placement: 3,
          name: "Alpha",
        },
        cachedAt: 123,
      },
    ]);
  });

  it("maps and caches child rows when a collection is provided", async () => {
    const upserted: any[] = [];

    const result = await mapAndCacheChildRows(
      [
        {
          id: "row-1",
          breed_id: "breed-1",
          pet_breed_id: "partition-1",
          updated_at: "2024-01-02",
          placement: 3,
          name: "Alpha",
        },
      ],
      {
        tableType: "top_pet_in_breed_with_pet",
        parentId: "breed-1",
        parentField: "breed_id",
        partitionField: "pet_breed_id",
        partitionValue: "partition-1",
        cachedAt: 123,
        collection: {
          async bulkUpsert(records) {
            upserted.push(...records);
          },
        },
      },
    );

    expect(result.cachedRecordsCount).toBe(1);
    expect(result.transformedRecords).toEqual(upserted);
  });

  it("loads, caches, and paginates VIEW child records", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const upserted: any[] = [];

    try {
      const result = await loadChildViewPage({
        viewName: "top_pet_in_breed_with_pet",
        parentId: "breed-1",
        parentField: "breed_id",
        limit: 2,
        orderBy: {
          field: "id",
          direction: "asc",
          tieBreaker: {
            field: "id",
            direction: "asc",
          },
        },
        partitionConfig: {
          keyField: "breed_id",
          childFilterField: "pet_breed_id",
        },
        partitionValue: "breed-9",
        collection: {
          async bulkUpsert(records) {
            upserted.push(...records);
          },
        },
        fetchViewRecords: async () => ({
          data: [
            {
              id: "pet-1",
              breed_id: "breed-1",
              pet_breed_id: "breed-9",
              name: "Alpha",
            },
            {
              id: "pet-2",
              breed_id: "breed-1",
              pet_breed_id: "breed-9",
              name: "Beta",
            },
          ],
          error: null,
        }),
      });

      expect(result).toEqual({
        records: upserted,
        total: 2,
        hasMore: true,
        nextCursor: JSON.stringify({
          value: "pet-2",
          tieBreaker: "pet-2",
          tieBreakerField: "id",
        }),
      });
      expect(logSpy.mock.calls.map(([message]) => message)).toEqual([
        "[SpaceStore] 🌐 Phase 1: Fetching VIEW records...",
        "[SpaceStore] ✅ Fetched 2 VIEW records",
        "[SpaceStore] 💾 Phase 2: Caching in RxDB...",
        "[SpaceStore] 💾 Cached 2 records in RxDB",
        "[SpaceStore] ✅ loadChildViewDirect: 2 records (hasMore: true)",
      ]);
    } finally {
      logSpy.mockRestore();
    }
  });

  it("returns raw VIEW records when the child collection is unavailable", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const rawRecords = [
      { id: "pet-1", breed_id: "breed-1", name: "Alpha" },
      { id: "pet-2", breed_id: "breed-1", name: "Beta" },
    ];

    try {
      const result = await loadChildViewPage({
        viewName: "top_pet_in_breed_with_pet",
        parentId: "breed-1",
        parentField: "breed_id",
        limit: 2,
        orderBy: {
          field: "id",
          direction: "asc",
          tieBreaker: {
            field: "id",
            direction: "asc",
          },
        },
        fetchViewRecords: async () => ({
          data: rawRecords,
          error: null,
        }),
      });

      expect(result).toEqual({
        records: rawRecords,
        total: 2,
        hasMore: true,
        nextCursor: JSON.stringify({
          value: "pet-2",
          tieBreaker: "pet-2",
          tieBreakerField: "id",
        }),
      });
      expect(warnSpy).toHaveBeenCalledWith(
        "[SpaceStore] ⚠️ No collection, returning raw records",
      );
      expect(logSpy.mock.calls.map(([message]) => message)).toEqual([
        "[SpaceStore] 🌐 Phase 1: Fetching VIEW records...",
        "[SpaceStore] ✅ Fetched 2 VIEW records",
        "[SpaceStore] 💾 Phase 2: Caching in RxDB...",
      ]);
    } finally {
      logSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it("logs and rethrows VIEW fetch errors", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchError = new Error("view fetch failed");

    try {
      await expect(
        loadChildViewPage({
          viewName: "top_pet_in_breed_with_pet",
          parentId: "breed-1",
          parentField: "breed_id",
          limit: 2,
          orderBy: {
            field: "id",
            direction: "asc",
            tieBreaker: {
              field: "id",
              direction: "asc",
            },
          },
          fetchViewRecords: async () => ({
            data: null,
            error: fetchError,
          }),
        }),
      ).rejects.toBe(fetchError);

      expect(logSpy).toHaveBeenCalledWith(
        "[SpaceStore] 🌐 Phase 1: Fetching VIEW records...",
      );
      expect(errorSpy).toHaveBeenCalledWith(
        "[SpaceStore] loadChildViewDirect error:",
        fetchError,
      );
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it("returns hasMore false and null nextCursor for partial VIEW pages", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const upserted: any[] = [];

    try {
      const result = await loadChildViewPage({
        viewName: "top_pet_in_breed_with_pet",
        parentId: "breed-1",
        parentField: "breed_id",
        limit: 3,
        orderBy: {
          field: "id",
          direction: "asc",
          tieBreaker: {
            field: "id",
            direction: "asc",
          },
        },
        collection: {
          async bulkUpsert(records) {
            upserted.push(...records);
          },
        },
        fetchViewRecords: async () => ({
          data: [
            { id: "pet-1", breed_id: "breed-1", name: "Alpha" },
          ],
          error: null,
        }),
      });

      expect(result).toEqual({
        records: upserted,
        total: 1,
        hasMore: false,
        nextCursor: null,
      });
      expect(logSpy).toHaveBeenCalledWith(
        "[SpaceStore] ✅ loadChildViewDirect: 1 records (hasMore: false)",
      );
    } finally {
      logSpy.mockRestore();
    }
  });

  it("returns an empty VIEW page without caching logs when no rows are fetched", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const upserted: any[] = [];

    try {
      const result = await loadChildViewPage({
        viewName: "top_pet_in_breed_with_pet",
        parentId: "breed-1",
        parentField: "breed_id",
        limit: 2,
        orderBy: {
          field: "id",
          direction: "asc",
          tieBreaker: {
            field: "id",
            direction: "asc",
          },
        },
        collection: {
          async bulkUpsert(records) {
            upserted.push(...records);
          },
        },
        fetchViewRecords: async () => ({
          data: [],
          error: null,
        }),
      });

      expect(result).toEqual({
        records: [],
        total: 0,
        hasMore: false,
        nextCursor: null,
      });
      expect(upserted).toEqual([]);
      expect(warnSpy).not.toHaveBeenCalled();
      expect(logSpy.mock.calls.map(([message]) => message)).toEqual([
        "[SpaceStore] 🌐 Phase 1: Fetching VIEW records...",
        "[SpaceStore] ✅ Fetched 0 VIEW records",
        "[SpaceStore] 💾 Phase 2: Caching in RxDB...",
        "[SpaceStore] ✅ loadChildViewDirect: 0 records (hasMore: false)",
      ]);
    } finally {
      logSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it("filters local child entities through the collection wrapper", async () => {
    const result = await filterLocalChildEntities({
      collection: createMockCollection([
        {
          id: "row-1",
          parentId: "breed-1",
          tableType: "achievement_in_breed",
          additional: { name: "Alpha" },
        },
        {
          id: "row-2",
          parentId: "breed-1",
          tableType: "achievement_in_breed",
          additional: { name: "Beta" },
        },
      ]),
      parentId: "breed-1",
      tableType: "achievement_in_breed",
      filters: { name: "Alpha" },
      limit: 10,
      cursor: null,
      orderBy: {
        field: "id",
        direction: "asc",
        tieBreaker: {
          field: "id",
          direction: "asc",
        },
      },
    });

    expect(result.records.map((record) => record.id)).toEqual(["row-1"]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("returns an empty child result when the collection is missing", async () => {
    await expect(
      filterLocalChildEntities({
        parentId: "breed-1",
        tableType: "achievement_in_breed",
        filters: {},
        limit: 10,
        cursor: null,
        orderBy: {
          field: "id",
          direction: "asc",
          tieBreaker: {
            field: "id",
            direction: "asc",
          },
        },
      }),
    ).resolves.toEqual({
      records: [],
      hasMore: false,
      nextCursor: null,
    });
  });

  it("maps child rows without caching when no collection is provided", async () => {
    const result = await mapAndCacheChildRows(
      [
        {
          id: "row-1",
          breed_id: "breed-1",
          name: "Alpha",
        },
      ],
      {
        tableType: "achievement_in_breed",
        parentId: "breed-1",
        parentField: "breed_id",
        cachedAt: 123,
      },
    );

    expect(result).toEqual({
      transformedRecords: [
        {
          id: "row-1",
          tableType: "achievement_in_breed",
          parentId: "breed-1",
          additional: {
            name: "Alpha",
          },
          cachedAt: 123,
        },
      ],
      cachedRecordsCount: 0,
    });
  });

  it("applies child cursor using tie-breaker direction", async () => {
    const collection = createMockCollection([
      {
        id: "a",
        parentId: "breed-1",
        tableType: "top_pet_in_breed",
        additional: { placement: 10, rank: 9 },
      },
      {
        id: "b",
        parentId: "breed-1",
        tableType: "top_pet_in_breed",
        additional: { placement: 10, rank: 7 },
      },
      {
        id: "c",
        parentId: "breed-1",
        tableType: "top_pet_in_breed",
        additional: { placement: 10, rank: 5 },
      },
    ]);

    const result = await executeLocalChildQuery({
      collection,
      parentId: "breed-1",
      tableType: "top_pet_in_breed_with_pet",
      filters: {},
      limit: 2,
      cursor: JSON.stringify({
        value: 10,
        tieBreaker: 7,
        tieBreakerField: "rank",
      }),
      orderBy: {
        field: "placement",
        direction: "desc",
        tieBreaker: {
          field: "rank",
          direction: "desc",
        },
      },
    });

    expect(result.records.map((record) => record.id)).toEqual(["c"]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("sorts child records by JSONB parameter and builds nested cursor values", async () => {
    const collection = createMockCollection([
      {
        id: "a",
        parentId: "breed-1",
        tableType: "top_pet_in_breed",
        additional: { metrics: { score: 5 }, rank: 1 },
      },
      {
        id: "b",
        parentId: "breed-1",
        tableType: "top_pet_in_breed",
        additional: { metrics: { score: 12 }, rank: 3 },
      },
      {
        id: "c",
        parentId: "breed-1",
        tableType: "top_pet_in_breed",
        additional: { metrics: { score: 9 }, rank: 2 },
      },
    ]);

    const result = await executeLocalChildQuery({
      collection,
      parentId: "breed-1",
      tableType: "top_pet_in_breed_with_pet",
      filters: {},
      limit: 2,
      cursor: null,
      orderBy: {
        field: "metrics",
        parameter: "score",
        direction: "desc",
        tieBreaker: {
          field: "rank",
          direction: "desc",
        },
      },
    });

    expect(result.records.map((record) => record.id)).toEqual(["b", "c"]);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe(
      JSON.stringify({
        value: 9,
        tieBreaker: 2,
        tieBreakerField: "rank",
      }),
    );
  });

  it("applies JSONB parameter cursor after local child sort", async () => {
    const collection = createMockCollection([
      {
        id: "a",
        parentId: "breed-1",
        tableType: "top_pet_in_breed",
        additional: { metrics: { score: 5 }, rank: 1 },
      },
      {
        id: "b",
        parentId: "breed-1",
        tableType: "top_pet_in_breed",
        additional: { metrics: { score: 12 }, rank: 3 },
      },
      {
        id: "c",
        parentId: "breed-1",
        tableType: "top_pet_in_breed",
        additional: { metrics: { score: 9 }, rank: 2 },
      },
    ]);

    const result = await executeLocalChildQuery({
      collection,
      parentId: "breed-1",
      tableType: "top_pet_in_breed_with_pet",
      filters: {},
      limit: 2,
      cursor: JSON.stringify({
        value: 9,
        tieBreaker: 2,
        tieBreakerField: "rank",
      }),
      orderBy: {
        field: "metrics",
        parameter: "score",
        direction: "desc",
        tieBreaker: {
          field: "rank",
          direction: "desc",
        },
      },
    });

    expect(result.records.map((record) => record.id)).toEqual(["a"]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });
});
