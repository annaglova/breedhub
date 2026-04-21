import { describe, expect, it, vi } from "vitest";
import {
  buildMappingCacheKey,
  fetchRecordsByMappingRows,
  getMappingSelectFields,
  groupMappingRowsByPartition,
  hasStaleMappedRecords,
  loadEntitiesViaMappingFlow,
  orderMappedRecordsByIds,
  refreshMappingCache,
  splitCachedAndMissingMappingRows,
} from "../space-mapping.helpers";

function createMappingCollection(initialRecords: Record<string, any>[]) {
  const recordsById = new Map(
    initialRecords.map((record) => [record.id, { ...record }]),
  );
  const upserted: Record<string, any>[] = [];
  const calls = {
    findByIds: [] as string[][],
    findAll: 0,
  };

  const collection = {
    findByIds(ids: string[]) {
      calls.findByIds.push(ids);
      return {
        exec: async () =>
          new Map(
            ids
              .filter((id) => recordsById.has(id))
              .map((id) => [
                id,
                {
                  toJSON: () => recordsById.get(id),
                },
              ]),
          ),
      };
    },
    find() {
      calls.findAll += 1;
      return {
        exec: async () =>
          Array.from(recordsById.values()).map((record) => ({
            toJSON: () => record,
          })),
      };
    },
    async bulkUpsert(records: Record<string, any>[]) {
      upserted.push(...records);
      for (const record of records) {
        recordsById.set(record.id, { ...record });
      }
    },
  };

  return { collection, calls, upserted, recordsById };
}

describe("space-mapping.helpers", () => {
  it("builds stable cache keys and select fields", () => {
    expect(buildMappingCacheKey("pet_child", "pet_id", "123")).toBe(
      "pet_child:pet_id:123",
    );
    expect(getMappingSelectFields()).toBe("id");
    expect(getMappingSelectFields("breed_id")).toBe("id, breed_id");
  });

  it("splits cached and missing mapping rows by staleness", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const cachedMap = new Map([
      ["a", { id: "a", cachedAt: 950 }],
      ["b", { id: "b", cachedAt: 200 }],
    ]);

    const result = splitCachedAndMissingMappingRows(rows, cachedMap, 100, 1000);

    expect(result.cached).toEqual([{ id: "a", cachedAt: 950 }]);
    expect(result.missing).toEqual([{ id: "b" }, { id: "c" }]);
  });

  it("groups rows by partition and preserves requested order on merge", () => {
    const groups = groupMappingRowsByPartition(
      [
        { id: "a", breed_id: "x" },
        { id: "b", breed_id: "x" },
        { id: "c", breed_id: "y" },
        { id: "d" },
      ],
      "breed_id",
    );

    expect(Array.from(groups.entries())).toEqual([
      ["x", ["a", "b"]],
      ["y", ["c"]],
    ]);

    const ordered = orderMappedRecordsByIds(
      ["b", "a", "c"],
      new Map([
        ["a", { id: "a", name: "A" }],
        ["b", { id: "b", name: "B" }],
        ["c", { id: "c", name: "C" }],
      ]),
    );

    expect(ordered.map((record) => record.id)).toEqual(["b", "a", "c"]);
  });

  it("detects stale mapped records from oldest cachedAt", () => {
    expect(hasStaleMappedRecords([], 100, 1000)).toBe(false);
    expect(
      hasStaleMappedRecords(
        [{ cachedAt: 980 }, { cachedAt: 970 }],
        50,
        1000,
      ),
    ).toBe(false);
    expect(
      hasStaleMappedRecords(
        [{ cachedAt: 980 }, { cachedAt: 800 }],
        150,
        1000,
      ),
    ).toBe(true);
  });

  it("fetches mapping records through unpartitioned and partitioned callbacks", async () => {
    const fetchAll = async (ids: string[]) => ids.map((id) => ({ id, source: "all" }));
    const fetchPartition = async (partitionValue: string, ids: string[]) =>
      ids.map((id) => ({ id, partitionValue }));

    await expect(
      fetchRecordsByMappingRows(
        [{ id: "a" }, { id: "b" }],
        {
          fetchAll,
          fetchPartition,
        },
      ),
    ).resolves.toEqual([
      { id: "a", source: "all" },
      { id: "b", source: "all" },
    ]);

    await expect(
      fetchRecordsByMappingRows(
        [
          { id: "a", breed_id: "x" },
          { id: "b", breed_id: "x" },
          { id: "c", breed_id: "y" },
          { id: "d" },
        ],
        {
          partitionField: "breed_id",
          fetchAll,
          fetchPartition,
        },
      ),
    ).resolves.toEqual([
      { id: "a", partitionValue: "x" },
      { id: "b", partitionValue: "x" },
      { id: "c", partitionValue: "y" },
    ]);
  });

  it("refreshes mapping cache and caches fetched records", async () => {
    const mappingCache = new Map();
    const upserted: Array<{ id: string; cached: true }> = [];

    await refreshMappingCache({
      loadMappingRows: async () => [{ id: "a" }, { id: "b" }],
      cacheKey: "map:parent:1",
      mappingCache,
      fetchRecords: async (rows) =>
        rows.map((row) => ({
          id: row.id,
          value: `fresh-${row.id}`,
        })),
      collection: {
        async bulkUpsert(records) {
          upserted.push(...records);
        },
      },
      mapRecordForCache: (record) => ({
        id: record.id,
        cached: true as const,
      }),
    });

    expect(mappingCache.get("map:parent:1")).toEqual([{ id: "a" }, { id: "b" }]);
    expect(upserted).toEqual([
      { id: "a", cached: true },
      { id: "b", cached: true },
    ]);
  });

  it("returns ordered cached mapped records without refreshing when they are still fresh", async () => {
    const now = Date.now();
    const mappingCache = new Map([
      ["map:parent:1", [{ id: "b" }, { id: "a" }]],
    ]);
    const { collection } = createMappingCollection([
      { id: "a", cachedAt: now, name: "A" },
      { id: "b", cachedAt: now, name: "B" },
    ]);
    const loadMappingRows = vi.fn(async () => [{ id: "a" }]);
    const fetchRecords = vi.fn(async () => [{ id: "a", cachedAt: now }]);

    const result = await loadEntitiesViaMappingFlow({
      entityTable: "pet",
      mappingTable: "pet_child",
      parentField: "pet_id",
      parentId: "parent-1",
      cacheKey: "map:parent:1",
      staleMs: 5 * 60 * 1000,
      mappingCache,
      collection,
      isOffline: false,
      loadMappingRows,
      fetchRecords,
      offlineScanPredicate: () => false,
    });

    expect(result.map((record) => record.id)).toEqual(["b", "a"]);
    expect(loadMappingRows).not.toHaveBeenCalled();
    expect(fetchRecords).not.toHaveBeenCalled();
  });

  it("returns cached mapped records and triggers a background refresh when they are stale online", async () => {
    const staleTimestamp = Date.now() - 10_000;
    const mappingCache = new Map([
      ["map:parent:1", [{ id: "a" }]],
    ]);
    const { collection, upserted } = createMappingCollection([
      { id: "a", cachedAt: staleTimestamp, name: "stale-a" },
    ]);
    const loadMappingRows = vi.fn(async () => [{ id: "a" }]);
    const fetchRecords = vi.fn(async (rows: Array<{ id: string }>) =>
      rows.map((row) => ({
        id: row.id,
        cachedAt: Date.now(),
        name: `fresh-${row.id}`,
      })),
    );

    const result = await loadEntitiesViaMappingFlow({
      entityTable: "pet",
      mappingTable: "pet_child",
      parentField: "pet_id",
      parentId: "parent-1",
      cacheKey: "map:parent:1",
      staleMs: 100,
      mappingCache,
      collection,
      isOffline: false,
      loadMappingRows,
      fetchRecords,
      offlineScanPredicate: () => false,
    });

    expect(result).toEqual([
      { id: "a", cachedAt: staleTimestamp, name: "stale-a" },
    ]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(loadMappingRows).toHaveBeenCalledOnce();
    expect(fetchRecords).toHaveBeenCalledWith([{ id: "a" }]);
    expect(upserted).toEqual([
      expect.objectContaining({ id: "a", name: "fresh-a" }),
    ]);
  });

  it("returns cached mapped records without refreshing when they are stale offline", async () => {
    const staleTimestamp = Date.now() - 10_000;
    const mappingCache = new Map([
      ["map:parent:1", [{ id: "a" }]],
    ]);
    const { collection } = createMappingCollection([
      { id: "a", cachedAt: staleTimestamp, name: "stale-a" },
    ]);
    const loadMappingRows = vi.fn(async () => [{ id: "a" }]);
    const fetchRecords = vi.fn(async () => [{ id: "a", cachedAt: Date.now() }]);

    const result = await loadEntitiesViaMappingFlow({
      entityTable: "pet",
      mappingTable: "pet_child",
      parentField: "pet_id",
      parentId: "parent-1",
      cacheKey: "map:parent:1",
      staleMs: 100,
      mappingCache,
      collection,
      isOffline: true,
      loadMappingRows,
      fetchRecords,
      offlineScanPredicate: () => false,
    });

    expect(result).toEqual([
      { id: "a", cachedAt: staleTimestamp, name: "stale-a" },
    ]);
    expect(loadMappingRows).not.toHaveBeenCalled();
    expect(fetchRecords).not.toHaveBeenCalled();
  });

  it("falls through to Step 2 when cached mapping exists but RxDB docs are missing", async () => {
    const mappingCache = new Map([
      ["map:parent:1", [{ id: "a" }]],
    ]);
    const { collection } = createMappingCollection([]);
    const loadMappingRows = vi.fn(async () => [{ id: "a" }]);
    const fetchRecords = vi.fn(async () => [
      { id: "a", cachedAt: Date.now(), name: "fresh-a" },
    ]);

    const result = await loadEntitiesViaMappingFlow({
      entityTable: "pet",
      mappingTable: "pet_child",
      parentField: "pet_id",
      parentId: "parent-1",
      cacheKey: "map:parent:1",
      staleMs: 5 * 60 * 1000,
      mappingCache,
      collection,
      isOffline: false,
      loadMappingRows,
      fetchRecords,
      offlineScanPredicate: () => false,
    });

    expect(loadMappingRows).toHaveBeenCalledOnce();
    expect(fetchRecords).toHaveBeenCalledWith([{ id: "a" }]);
    expect(result).toEqual([
      { id: "a", cachedAt: expect.any(Number), name: "fresh-a" },
    ]);
  });

  it("returns an empty array offline when no cached mapping or collection exists", async () => {
    const loadMappingRows = vi.fn(async () => [{ id: "a" }]);
    const fetchRecords = vi.fn(async () => [{ id: "a", cachedAt: Date.now() }]);

    const result = await loadEntitiesViaMappingFlow({
      entityTable: "pet",
      mappingTable: "pet_child",
      parentField: "pet_id",
      parentId: "parent-1",
      cacheKey: "map:parent:1",
      staleMs: 5 * 60 * 1000,
      mappingCache: new Map(),
      isOffline: true,
      loadMappingRows,
      fetchRecords,
      offlineScanPredicate: () => true,
    });

    expect(result).toEqual([]);
    expect(loadMappingRows).not.toHaveBeenCalled();
    expect(fetchRecords).not.toHaveBeenCalled();
  });

  it("scans RxDB and filters with the offline predicate when no cached mapping exists offline", async () => {
    const { collection, calls } = createMappingCollection([
      { id: "a", father_id: "parent-1" },
      { id: "b", mother_id: "parent-1" },
      { id: "c", father_id: "other" },
    ]);

    const result = await loadEntitiesViaMappingFlow({
      entityTable: "pet",
      mappingTable: "pet_child",
      parentField: "pet_id",
      parentId: "parent-1",
      cacheKey: "map:parent:1",
      staleMs: 5 * 60 * 1000,
      mappingCache: new Map(),
      collection,
      isOffline: true,
      loadMappingRows: async () => [{ id: "a" }],
      fetchRecords: async () => [{ id: "a", cachedAt: Date.now() }],
      offlineScanPredicate: (record) =>
        record.father_id === "parent-1" || record.mother_id === "parent-1",
    });

    expect(calls.findAll).toBe(1);
    expect(result.map((record) => record.id)).toEqual(["a", "b"]);
  });

  it("returns an empty array when the first mapping load returns no rows", async () => {
    const fetchRecords = vi.fn(async () => [{ id: "a", cachedAt: Date.now() }]);

    const result = await loadEntitiesViaMappingFlow({
      entityTable: "pet",
      mappingTable: "pet_child",
      parentField: "pet_id",
      parentId: "parent-1",
      cacheKey: "map:parent:1",
      staleMs: 5 * 60 * 1000,
      mappingCache: new Map(),
      isOffline: false,
      loadMappingRows: async () => [],
      fetchRecords,
      offlineScanPredicate: () => true,
    });

    expect(result).toEqual([]);
    expect(fetchRecords).not.toHaveBeenCalled();
  });

  it("delegates directly to fetchRecords when mapping rows exist but no collection is available", async () => {
    const fetchRecords = vi.fn(async (rows: Array<{ id: string }>) =>
      rows.map((row) => ({ id: row.id, cachedAt: Date.now(), source: "remote" })),
    );
    const mappingCache = new Map<string, Array<{ id: string }>>();

    const result = await loadEntitiesViaMappingFlow({
      entityTable: "pet",
      mappingTable: "pet_child",
      parentField: "pet_id",
      parentId: "parent-1",
      cacheKey: "map:parent:1",
      staleMs: 5 * 60 * 1000,
      mappingCache,
      isOffline: false,
      loadMappingRows: async () => [{ id: "a" }, { id: "b" }],
      fetchRecords,
      offlineScanPredicate: () => false,
    });

    expect(fetchRecords).toHaveBeenCalledWith([{ id: "a" }, { id: "b" }]);
    expect(mappingCache.get("map:parent:1")).toEqual([{ id: "a" }, { id: "b" }]);
    expect(result).toEqual([
      { id: "a", cachedAt: expect.any(Number), source: "remote" },
      { id: "b", cachedAt: expect.any(Number), source: "remote" },
    ]);
  });

  it("returns cached records when Step 4 finds nothing missing", async () => {
    const now = Date.now();
    const { collection } = createMappingCollection([
      { id: "a", cachedAt: now, name: "A" },
      { id: "b", cachedAt: now, name: "B" },
    ]);
    const fetchRecords = vi.fn(async () => []);

    const result = await loadEntitiesViaMappingFlow({
      entityTable: "pet",
      mappingTable: "pet_child",
      parentField: "pet_id",
      parentId: "parent-1",
      cacheKey: "map:parent:1",
      staleMs: 5 * 60 * 1000,
      mappingCache: new Map(),
      collection,
      isOffline: false,
      loadMappingRows: async () => [{ id: "b" }, { id: "a" }],
      fetchRecords,
      offlineScanPredicate: () => false,
    });

    expect(fetchRecords).not.toHaveBeenCalled();
    expect(result.map((record) => record.id)).toEqual(["b", "a"]);
  });

  it("fetches missing records, caches them, and then re-reads ordered results from RxDB", async () => {
    const now = Date.now();
    const { collection, upserted } = createMappingCollection([
      { id: "a", cachedAt: now, name: "A" },
    ]);
    const fetchRecords = vi.fn(async () => [
      { id: "b", cachedAt: now, name: "B" },
    ]);

    const result = await loadEntitiesViaMappingFlow({
      entityTable: "pet",
      mappingTable: "pet_child",
      parentField: "pet_id",
      parentId: "parent-1",
      cacheKey: "map:parent:1",
      staleMs: 5 * 60 * 1000,
      mappingCache: new Map(),
      collection,
      isOffline: false,
      loadMappingRows: async () => [{ id: "b" }, { id: "a" }],
      fetchRecords,
      offlineScanPredicate: () => false,
    });

    expect(fetchRecords).toHaveBeenCalledWith([{ id: "b" }]);
    expect(upserted).toEqual([
      { id: "b", cachedAt: now, name: "B" },
    ]);
    expect(result.map((record) => record.id)).toEqual(["b", "a"]);
  });

  it("falls back to cached records when Step 4 fetch throws", async () => {
    const now = Date.now();
    const { collection } = createMappingCollection([
      { id: "a", cachedAt: now, name: "A" },
    ]);
    const fetchRecords = vi.fn(async () => {
      throw new Error("fetch failed");
    });

    const result = await loadEntitiesViaMappingFlow({
      entityTable: "pet",
      mappingTable: "pet_child",
      parentField: "pet_id",
      parentId: "parent-1",
      cacheKey: "map:parent:1",
      staleMs: 5 * 60 * 1000,
      mappingCache: new Map(),
      collection,
      isOffline: false,
      loadMappingRows: async () => [{ id: "a" }, { id: "b" }],
      fetchRecords,
      offlineScanPredicate: () => false,
    });

    expect(result).toEqual([
      { id: "a", cachedAt: now, name: "A" },
    ]);
  });
});
