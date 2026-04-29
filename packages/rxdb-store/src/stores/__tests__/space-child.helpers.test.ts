import { describe, expect, it, vi } from "vitest";
import {
  applyChildListQueryOptions,
  buildChildSelectClause,
  buildBatchedSelector,
  createEmptyChildPageResult,
  executeLocalChildQuery,
  fetchAndCacheChildRecords,
  filterLocalChildEntities,
  getChildCollectionName,
  getChildField,
  getExistingChildCollection,
  getDefaultChildOrderBy,
  getChildMutationMetadata,
  groupParentsByPartition,
  hasStaleChildRecords,
  loadChildViewPage,
  mapAndCacheChildRows,
  mapChildRowsToCacheRecords,
  queryLocalChildRecords,
  queueChildMutationRefresh,
  toChildPageResult,
  type ChildCacheRecord,
  type ChildSelector,
  type LocalChildCollectionLike,
} from "../space-child.helpers";

function createMockCollection<TRecord extends ChildCacheRecord>(
  records: TRecord[],
): LocalChildCollectionLike<TRecord> {
  return {
    find: (options: { selector: ChildSelector; limit?: number }) => ({
      sort: () => ({
        exec: async () => [],
      }),
      exec: async () =>
        records
          .filter((record) => {
            const selector = options.selector;
            return Object.entries(selector).every(([field, value]) => {
              if (field.startsWith("additional.")) {
                return record.additional?.[field.replace("additional.", "")] === value;
              }
              if (value && typeof value === "object" && "$in" in value) {
                return (value.$in as unknown[]).includes(record[field]);
              }
              return record[field] === value;
            });
          })
          .map((record) => ({
            toJSON: () => record,
          })),
    }),
  };
}

function createQueryableChildCollection<TRecord extends ChildCacheRecord>(
  records: TRecord[],
) {
  const calls = {
    find: [] as Array<{ selector: ChildSelector; limit?: number }>,
    sort: [] as Array<Record<string, "asc" | "desc">>,
  };

  const collection: LocalChildCollectionLike<TRecord> = {
    find(options: { selector: ChildSelector; limit?: number }) {
      calls.find.push(options);
      let sortArg: Record<string, "asc" | "desc"> | undefined;

      const runExec = async () =>
        records
          .filter((record) =>
            Object.entries(options.selector).every(([field, value]) => {
              if (value && typeof value === "object" && "$in" in value) {
                return (value.$in as unknown[]).includes(record[field]);
              }
              return record[field] === value;
            }),
          )
          .sort((left, right) => {
            if (!sortArg) {
              return 0;
            }

            const [[field, direction]] = Object.entries(sortArg);
            const leftValue = left[field] as string | number;
            const rightValue = right[field] as string | number;

            if (leftValue === rightValue) {
              return 0;
            }

            if (direction === "asc") {
              return leftValue < rightValue ? -1 : 1;
            }

            return leftValue > rightValue ? -1 : 1;
          })
          .slice(0, options.limit ?? records.length)
          .map((record) => ({
            toJSON: () => record,
          }));

      return {
        sort(sort: Record<string, "asc" | "desc">) {
          calls.sort.push(sort);
          sortArg = sort;
          return {
            exec: runExec,
          };
        },
        exec: runExec,
      };
    },
  };

  return { collection, calls };
}

describe("space-child.helpers", () => {
  it("returns * when no explicit child select fields are provided", () => {
    expect(
      buildChildSelectClause({
        parentField: "pet_id",
      }),
    ).toBe("*");
  });

  it("builds a safe child select clause with required cache and partition fields", () => {
    expect(
      buildChildSelectClause({
        select: ["contact_id", "is_primary"],
        parentField: "pet_id",
        partitionField: "pet_breed_id",
      }),
    ).toBe(
      "id, pet_id, created_at, updated_at, created_by, updated_by, pet_breed_id, contact_id, is_primary",
    );
  });

  it("deduplicates explicit child select fields and includes ordering fields for cache reuse", () => {
    expect(
      buildChildSelectClause({
        select: ["contact_id", "contact_id", "id"],
        parentField: "pet_id",
        orderingFields: ["position", "id"],
      }),
    ).toBe(
      "id, pet_id, created_at, updated_at, created_by, updated_by, position, contact_id",
    );
  });

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

  it("gets child fields from top-level values before additional values", () => {
    expect(
      getChildField<boolean>(
        {
          is_primary: false,
          additional: {
            is_primary: true,
          },
        },
        "is_primary",
      ),
    ).toBe(false);
  });

  it("falls back to additional fields when the top-level child field is absent", () => {
    expect(
      getChildField<string>(
        {
          additional: {
            contact_id: "contact-1",
          },
        },
        "contact_id",
      ),
    ).toBe("contact-1");
  });

  it("returns undefined when a child field is absent or nullish in both places", () => {
    expect(
      getChildField(
        {
          contact_id: null,
          additional: {
            contact_id: null,
          },
        },
        "contact_id",
      ),
    ).toBeUndefined();
    expect(getChildField(undefined, "contact_id")).toBeUndefined();
  });

  it("groups parents by partition value, preserving insertion order", () => {
    expect(
      groupParentsByPartition(
        ["a", "b", "c", "d"],
        new Map<string, string | undefined>([
          ["a", "p1"],
          ["b", "p2"],
          ["c", "p1"],
          ["d", undefined],
        ]),
      ),
    ).toEqual(
      new Map<string | undefined, string[]>([
        ["p1", ["a", "c"]],
        ["p2", ["b"]],
        [undefined, ["d"]],
      ]),
    );
  });

  it("collapses parents into one partition bucket when all share a partition", () => {
    expect(
      groupParentsByPartition(
        ["a", "b", "c", "d", "e"],
        new Map([
          ["a", "p1"],
          ["b", "p1"],
          ["c", "p1"],
          ["d", "p1"],
          ["e", "p1"],
        ]),
      ),
    ).toEqual(new Map([["p1", ["a", "b", "c", "d", "e"]]]));
  });

  it("buildBatchedSelector emits a parentId $in selector", () => {
    const parentIds = ["pet-1", "pet-2", "pet-3"];

    expect(buildBatchedSelector("pet_measurement", parentIds)).toEqual({
      parentId: { $in: parentIds },
      tableType: "pet_measurement",
    });
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
    const calls: Array<[string, ...unknown[]]> = [];
    const query = {
      eq(column: string, value: unknown) {
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
    const upserted: ChildCacheRecord[] = [];

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

  it("fetches and caches child records from Supabase rows", async () => {
    const upserted: ChildCacheRecord[] = [];

    const result = await fetchAndCacheChildRecords({
      tableType: "top_pet_in_breed_with_pet",
      parentId: "breed-1",
      parentIdField: "breed_id",
      partitionField: "pet_breed_id",
      partitionValue: "breed-9",
      collection: {
        async bulkUpsert(records) {
          upserted.push(...records);
        },
      },
      fetchChildRecords: async () => ({
        data: [
          {
            id: "pet-1",
            breed_id: "breed-1",
            pet_breed_id: "breed-9",
            name: "Alpha",
          },
        ],
        error: null,
      }),
    });

    expect(result).toEqual(upserted);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "pet-1",
      tableType: "top_pet_in_breed",
      parentId: "breed-1",
      partitionId: "breed-9",
      additional: {
        name: "Alpha",
      },
    });
    expect(typeof result[0]?.cachedAt).toBe("number");
  });

  it("logs Supabase child-record errors and returns an empty array", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const supabaseError = new Error("supabase failed");

    try {
      const result = await fetchAndCacheChildRecords({
        tableType: "title_in_pet",
        parentId: "pet-1",
        parentIdField: "pet_id",
        collection: {
          async bulkUpsert() {
            return;
          },
        },
        fetchChildRecords: async () => ({
          data: null,
          error: supabaseError,
        }),
      });

      expect(result).toEqual([]);
      expect(errorSpy).toHaveBeenCalledWith(
        "[SpaceStore] Failed to load child records from title_in_pet:",
        supabaseError,
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("returns an empty array without logging when child fetch returns an empty array", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const result = await fetchAndCacheChildRecords({
        tableType: "title_in_pet",
        parentId: "pet-1",
        parentIdField: "pet_id",
        collection: {
          async bulkUpsert() {
            return;
          },
        },
        fetchChildRecords: async () => ({
          data: [],
          error: null,
        }),
      });

      expect(result).toEqual([]);
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("logs outer child-record loading errors and returns an empty array when fetch throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const thrownError = new Error("network exploded");

    try {
      const result = await fetchAndCacheChildRecords({
        tableType: "title_in_pet",
        parentId: "pet-1",
        parentIdField: "pet_id",
        collection: {
          async bulkUpsert() {
            return;
          },
        },
        fetchChildRecords: async () => {
          throw thrownError;
        },
      });

      expect(result).toEqual([]);
      expect(errorSpy).toHaveBeenCalledWith(
        "[SpaceStore] Error loading child records:",
        thrownError,
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("returns an empty array without logging when child fetch returns null data", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const result = await fetchAndCacheChildRecords({
        tableType: "title_in_pet",
        parentId: "pet-1",
        parentIdField: "pet_id",
        collection: {
          async bulkUpsert() {
            return;
          },
        },
        fetchChildRecords: async () => ({
          data: null,
          error: null,
        }),
      });

      expect(result).toEqual([]);
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("loads, caches, and paginates VIEW child records", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const upserted: ChildCacheRecord[] = [];

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
    const upserted: ChildCacheRecord[] = [];

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
    const upserted: ChildCacheRecord[] = [];

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

  it("queries local child records with RxDB sort and limit for schema fields", async () => {
    const { collection, calls } = createQueryableChildCollection([
      { id: "b", parentId: "breed-1", tableType: "title_in_pet", cachedAt: 2 },
      { id: "a", parentId: "breed-1", tableType: "title_in_pet", cachedAt: 1 },
      { id: "c", parentId: "breed-2", tableType: "title_in_pet", cachedAt: 0 },
    ]);

    const result = await queryLocalChildRecords({
      collection,
      parentId: "breed-1",
      tableType: "title_in_pet_with_pet",
      limit: 1,
      orderBy: "cachedAt",
      orderDirection: "asc",
    });

    expect(calls.find).toEqual([
      {
        selector: {
          parentId: "breed-1",
          tableType: "title_in_pet",
        },
        limit: 1,
      },
    ]);
    expect(calls.sort).toEqual([{ cachedAt: "asc" }]);
    expect(result).toEqual([
      { id: "a", parentId: "breed-1", tableType: "title_in_pet", cachedAt: 1 },
    ]);
  });

  it("queries local child records with JS sort and post-sort slice for non-schema fields", async () => {
    const { collection, calls } = createQueryableChildCollection([
      {
        id: "a",
        parentId: "breed-1",
        tableType: "top_pet_in_breed",
        additional: { placement: 5 },
      },
      {
        id: "c",
        parentId: "breed-1",
        tableType: "top_pet_in_breed",
        additional: { placement: 1 },
      },
      {
        id: "b",
        parentId: "breed-1",
        tableType: "top_pet_in_breed",
        additional: { placement: 1 },
      },
    ]);

    const result = await queryLocalChildRecords({
      collection,
      parentId: "breed-1",
      tableType: "top_pet_in_breed_with_pet",
      limit: 2,
      orderBy: "placement",
      orderDirection: "asc",
    });

    expect(calls.find).toEqual([
      {
        selector: {
          parentId: "breed-1",
          tableType: "top_pet_in_breed",
        },
      },
    ]);
    expect(calls.sort).toEqual([]);
    expect(result.map((record) => record.id)).toEqual(["b", "c"]);
  });

  it("queries local child records without sorting when orderBy is omitted", async () => {
    const { collection, calls } = createQueryableChildCollection([
      { id: "a", parentId: "breed-1", tableType: "achievement_in_breed" },
      { id: "b", parentId: "breed-1", tableType: "achievement_in_breed" },
    ]);

    const result = await queryLocalChildRecords({
      collection,
      parentId: "breed-1",
      tableType: "achievement_in_breed",
      limit: 1,
    });

    expect(calls.find).toEqual([
      {
        selector: {
          parentId: "breed-1",
          tableType: "achievement_in_breed",
        },
        limit: 1,
      },
    ]);
    expect(calls.sort).toEqual([]);
    expect(result).toEqual([
      { id: "a", parentId: "breed-1", tableType: "achievement_in_breed" },
    ]);
  });

  it("includes partitionId in the selector when provided", async () => {
    const { collection, calls } = createQueryableChildCollection([
      {
        id: "a",
        parentId: "breed-1",
        tableType: "title_in_pet",
        partitionId: "breed-9",
      },
    ]);

    await queryLocalChildRecords({
      collection,
      parentId: "breed-1",
      tableType: "title_in_pet",
      partitionId: "breed-9",
    });

    expect(calls.find[0]?.selector).toEqual({
      parentId: "breed-1",
      tableType: "title_in_pet",
      partitionId: "breed-9",
    });
  });

  it("omits partitionId from the selector when not provided", async () => {
    const { collection, calls } = createQueryableChildCollection([
      {
        id: "a",
        parentId: "breed-1",
        tableType: "title_in_pet",
      },
    ]);

    await queryLocalChildRecords({
      collection,
      parentId: "breed-1",
      tableType: "title_in_pet",
    });

    expect(calls.find[0]?.selector).toEqual({
      parentId: "breed-1",
      tableType: "title_in_pet",
    });
    expect("partitionId" in calls.find[0]!.selector).toBe(false);
  });

  it("skips query limit and post-slice when limit is zero", async () => {
    const { collection, calls } = createQueryableChildCollection([
      {
        id: "a",
        parentId: "breed-1",
        tableType: "top_pet_in_breed",
        additional: { placement: 3 },
      },
      {
        id: "b",
        parentId: "breed-1",
        tableType: "top_pet_in_breed",
        additional: { placement: 1 },
      },
    ]);

    const result = await queryLocalChildRecords({
      collection,
      parentId: "breed-1",
      tableType: "top_pet_in_breed",
      limit: 0,
      orderBy: "placement",
      orderDirection: "asc",
    });

    expect(calls.find).toEqual([
      {
        selector: {
          parentId: "breed-1",
          tableType: "top_pet_in_breed",
        },
      },
    ]);
    expect(result.map((record) => record.id)).toEqual(["b", "a"]);
  });

  it("logs and returns an empty array when local child querying fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("query failed");
    const collection: LocalChildCollectionLike = {
      find() {
        throw error;
      },
    };

    try {
      const result = await queryLocalChildRecords({
        collection,
        parentId: "breed-1",
        tableType: "title_in_pet",
      });

      expect(result).toEqual([]);
      expect(errorSpy).toHaveBeenCalledWith(
        "[SpaceStore] Error querying child records:",
        error,
      );
    } finally {
      errorSpy.mockRestore();
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
