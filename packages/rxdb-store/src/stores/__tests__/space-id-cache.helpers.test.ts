import { describe, expect, it } from "vitest";
import {
  analyzeCachedIdsByUpdatedAt,
  buildRecordMapById,
  cacheRecords,
  cacheAndMergeOrderedRecordsByIds,
  getMissingIds,
  getStaleIdsByUpdatedAt,
  mapDocsToRecordMap,
  mergeOrderedRecordsByIds,
} from "../space-id-cache.helpers";

describe("space-id-cache.helpers", () => {
  it("maps docs to records and detects missing ids", () => {
    const docs = [
      { id: "a", toJSON: () => ({ id: "a", value: 1 }) },
      { id: "b", toJSON: () => ({ id: "b", value: 2 }) },
    ];

    const recordMap = mapDocsToRecordMap(docs);

    expect(recordMap.get("a")).toEqual({ id: "a", value: 1 });
    expect(getMissingIds(["a", "c"], recordMap)).toEqual(["c"]);
  });

  it("detects stale ids from server updated_at map", () => {
    const cachedMap = buildRecordMapById([
      { id: "a", updated_at: "2024-01-01" },
      { id: "b", updated_at: "2024-01-05" },
    ]);

    const staleIds = getStaleIdsByUpdatedAt(
      ["a", "b", "c"],
      cachedMap,
      new Map([
        ["a", "2024-01-02"],
        ["b", "2024-01-05"],
        ["c", "2024-01-10"],
      ]),
    );

    expect(staleIds).toEqual(["a"]);
  });

  it("analyzes missing and stale ids from ordered server records", () => {
    const cachedMap = buildRecordMapById([
      { id: "a", updated_at: "2024-01-01" },
      { id: "b", updated_at: "2024-01-05" },
      { id: "c", updated_at: "2024-01-03" },
    ]);

    expect(
      analyzeCachedIdsByUpdatedAt(
        ["a", "b", "c", "d"],
        cachedMap,
        [
          { id: "a", updated_at: "2024-01-02" },
          { id: "b", updated_at: "2024-01-05" },
          { id: "c", updated_at: undefined },
          { id: "d", updated_at: "2024-01-10" },
        ],
      ),
    ).toEqual({
      missingIds: ["d"],
      staleIds: ["a"],
      toFetchIds: ["d", "a"],
    });
  });

  it("treats server records without updated_at as missing-only analysis", () => {
    const cachedMap = buildRecordMapById([
      { id: "a", updated_at: "2024-01-01" },
      { id: "b", updated_at: "2024-01-05" },
    ]);

    expect(
      analyzeCachedIdsByUpdatedAt(
        ["a", "b", "c"],
        cachedMap,
        [{ id: "a" }, { id: "b" }, { id: "c" }],
      ),
    ).toEqual({
      missingIds: ["c"],
      staleIds: [],
      toFetchIds: ["c"],
    });
  });

  it("merges fresh records over cached records and preserves requested order", () => {
    const cachedMap = buildRecordMapById([
      { id: "a", value: "cached-a" },
      { id: "b", value: "cached-b" },
    ]);

    const merged = mergeOrderedRecordsByIds(
      ["b", "c", "a"],
      cachedMap,
      [
        { id: "c", value: "fresh-c" },
        { id: "b", value: "fresh-b" },
      ],
    );

    expect(merged).toEqual([
      { id: "b", value: "fresh-b" },
      { id: "c", value: "fresh-c" },
      { id: "a", value: "cached-a" },
    ]);
  });

  it("caches mapped fresh records before merging ordered results", async () => {
    const upserted: Array<{ id: string; cached: boolean }> = [];
    const cachedMap = buildRecordMapById([
      { id: "a", value: "cached-a" },
      { id: "b", value: "cached-b" },
    ]);

    const result = await cacheAndMergeOrderedRecordsByIds<
      { id: string; value: string },
      { id: string; cached: boolean }
    >(
      ["b", "c", "a"],
      cachedMap,
      [
        { id: "c", value: "fresh-c" },
        { id: "b", value: "fresh-b" },
      ],
      {
        collection: {
          async bulkUpsert(records) {
            upserted.push(...records);
          },
        },
        mapFreshRecordForCache: (record) => ({
          id: record.id,
          cached: true,
        }),
      },
    );

    expect(upserted).toEqual([
      { id: "c", cached: true },
      { id: "b", cached: true },
    ]);
    expect(result).toEqual({
      orderedRecords: [
        { id: "b", value: "fresh-b" },
        { id: "c", value: "fresh-c" },
        { id: "a", value: "cached-a" },
      ],
      cachedRecordsCount: 2,
    });
  });

  it("reuses fresh records directly for cache when no mapper is provided", async () => {
    const upserted: Array<{ id: string; value: string }> = [];

    const result = await cacheAndMergeOrderedRecordsByIds(
      ["a", "b"],
      buildRecordMapById([{ id: "a", value: "cached-a" }]),
      [{ id: "b", value: "fresh-b" }],
      {
        collection: {
          async bulkUpsert(records) {
            upserted.push(...records);
          },
        },
      },
    );

    expect(upserted).toEqual([{ id: "b", value: "fresh-b" }]);
    expect(result).toEqual({
      orderedRecords: [
        { id: "a", value: "cached-a" },
        { id: "b", value: "fresh-b" },
      ],
      cachedRecordsCount: 1,
    });
  });

  it("caches mapped records through the shared cacheRecords primitive", async () => {
    const upserted: Array<{ id: string; cached: true }> = [];

    const result = await cacheRecords<
      { id: string; value: string },
      { id: string; cached: true }
    >(
      [
        { id: "a", value: "fresh-a" },
        { id: "b", value: "fresh-b" },
      ],
      {
        collection: {
          async bulkUpsert(records) {
            upserted.push(...records);
          },
        },
        mapRecordForCache: (record) => ({
          id: record.id,
          cached: true as const,
        }),
      },
    );

    expect(upserted).toEqual([
      { id: "a", cached: true },
      { id: "b", cached: true },
    ]);
    expect(result).toEqual({
      cachedRecords: [
        { id: "a", cached: true },
        { id: "b", cached: true },
      ],
      cachedRecordsCount: 2,
    });
  });

  it("skips caching when no collection is provided", async () => {
    await expect(
      cacheRecords(
        [{ id: "a", value: "fresh-a" }],
        {},
      ),
    ).resolves.toEqual({
      cachedRecords: [],
      cachedRecordsCount: 0,
    });
  });
});
