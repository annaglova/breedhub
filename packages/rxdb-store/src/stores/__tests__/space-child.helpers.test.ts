import { describe, expect, it } from "vitest";
import {
  applyChildListQueryOptions,
  createEmptyChildPageResult,
  executeLocalChildQuery,
  getDefaultChildOrderBy,
  hasStaleChildRecords,
  mapAndCacheChildRows,
  mapChildRowsToCacheRecords,
  toChildPageResult,
} from "../space-child.helpers";

function createMockCollection(records: Record<string, any>[]) {
  return {
    find: () => ({
      exec: async () =>
        records.map((record) => ({
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
