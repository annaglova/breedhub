import { describe, expect, it } from "vitest";
import {
  buildMappingCacheKey,
  fetchRecordsByMappingRows,
  getMappingSelectFields,
  groupMappingRowsByPartition,
  hasStaleMappedRecords,
  orderMappedRecordsByIds,
  refreshMappingCache,
  splitCachedAndMissingMappingRows,
} from "../space-mapping.helpers";

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
});
