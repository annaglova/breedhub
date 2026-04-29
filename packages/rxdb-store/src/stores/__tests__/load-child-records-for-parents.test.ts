import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHILD_RECORDS_STALE_MS } from "../../cache/cache-policies";
import type { ChildCacheRecord, ChildSelector } from "../space-child.helpers";

interface SupabaseQueryCall {
  table: string;
  selectFields?: string;
  inField?: string;
  inIds?: string[];
  limitValue?: number;
  eqCalls: Array<[string, unknown]>;
  orderCalls: Array<[string, unknown]>;
}

function matchesSelector(
  record: ChildCacheRecord,
  selector: ChildSelector | undefined,
): boolean {
  if (!selector) return true;
  return Object.entries(selector).every(([field, value]) => {
    if (value && typeof value === "object" && "$in" in value) {
      return (value.$in as unknown[]).includes(record[field]);
    }
    return record[field] === value;
  });
}

function createChildCollection(initialRecords: ChildCacheRecord[]) {
  let records = [...initialRecords];
  const calls = {
    find: [] as Array<{ selector?: ChildSelector; limit?: number }>,
    bulkUpsert: [] as ChildCacheRecord[][],
  };

  return {
    calls,
    removeByIds(ids: string[]) {
      const remove = new Set(ids);
      records = records.filter((record) => !remove.has(record.id));
    },
    collection: {
      find(options: { selector?: ChildSelector; limit?: number } = {}) {
        calls.find.push(options);
        return {
          exec: async () =>
            records
              .filter((record) => matchesSelector(record, options.selector))
              .map((record) => ({
                toJSON: () => record,
              })),
        };
      },
      bulkUpsert: vi.fn(async (nextRecords: ChildCacheRecord[]) => {
        calls.bulkUpsert.push(nextRecords);
        records.push(...nextRecords);
      }),
    },
  };
}

function createSupabaseMock(
  resolveRows: (call: SupabaseQueryCall) => Array<Record<string, unknown>> = () => [],
) {
  const calls: SupabaseQueryCall[] = [];
  const from = vi.fn((table: string) => {
    const call: SupabaseQueryCall = {
      table,
      eqCalls: [],
      orderCalls: [],
    };
    calls.push(call);
    const query = {
      select(fields: string) {
        call.selectFields = fields;
        return query;
      },
      in(field: string, ids: string[]) {
        call.inField = field;
        call.inIds = ids;
        return query;
      },
      limit(value: number) {
        call.limitValue = value;
        return query;
      },
      eq(field: string, value: unknown) {
        call.eqCalls.push([field, value]);
        return query;
      },
      order(field: string, options: unknown) {
        call.orderCalls.push([field, options]);
        return query;
      },
      then(
        onFulfilled: (value: { data: Array<Record<string, unknown>>; error: null }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve({
          data: resolveRows(call),
          error: null,
        }).then(onFulfilled, onRejected);
      },
    };
    return query;
  });

  return {
    supabase: { from },
    calls,
  };
}

async function loadHarness(options: {
  cachedRecords?: ChildCacheRecord[];
  parentPartitions?: Record<string, string | undefined>;
  resolveRows?: (call: SupabaseQueryCall) => Array<Record<string, unknown>>;
} = {}) {
  vi.resetModules();
  const collection = createChildCollection(options.cachedRecords ?? []);
  const supabaseMock = createSupabaseMock(options.resolveRows);

  vi.doMock("../app-store.signal-store", () => ({
    appStore: {
      initialized: { value: true },
      appConfig: { value: { data: {} } },
    },
  }));
  vi.doMock("../../supabase/client", () => ({
    supabase: supabaseMock.supabase,
  }));

  const [{ spaceStore }, { dictionaryStore }] = await Promise.all([
    import("../space-store.signal-store"),
    import("../dictionary-store.signal-store"),
  ]);
  const store = spaceStore as any;
  store.ensureChildCollection = vi.fn(async () => collection.collection);
  store.scheduleChildLruEviction = vi.fn();
  store.childLru = {
    beginRead: vi.fn(() => vi.fn()),
    touch: vi.fn(),
  };
  store.cacheStats = {
    childRecords: { hit: 0, miss: 0, staleRevalidate: 0 },
    childRecordsBatch: { hit: 0, miss: 0, staleRevalidate: 0 },
    rpc: { hit: 0, miss: 0, dedup: 0 },
    mapping: { hit: 0, miss: 0, staleRevalidate: 0 },
  };

  const parentPartitions = options.parentPartitions ?? {};
  store.entitySchemas = new Map();
  if (Object.keys(parentPartitions).length > 0) {
    store.entitySchemas.set("pet", {
      partition: {
        keyField: "breed_id",
        childFilterField: "pet_breed_id",
      },
    });
    store.getById = vi.fn(async (_entityType: string, parentId: string) => ({
      id: parentId,
      breed_id: parentPartitions[parentId],
    }));
    store.findCachedEntityById = vi.fn(async () => null);
  }

  return {
    store,
    dictionaryStore,
    collection,
    supabase: supabaseMock,
  };
}

describe("spaceStore.loadChildRecordsForParents", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("uses a single RxDB find with a parentId $in selector for N parents", async () => {
    const harness = await loadHarness();

    await harness.store.loadChildRecordsForParents("pet", "pet_measurement", [
      "pet-1",
      "pet-2",
      "pet-3",
    ]);

    expect(harness.collection.calls.find).toHaveLength(1);
    expect(harness.collection.calls.find[0]).toEqual({
      selector: {
        parentId: { $in: ["pet-1", "pet-2", "pet-3"] },
        tableType: "pet_measurement",
      },
    });
  });

  it("fetches Supabase misses once per partition group", async () => {
    const harness = await loadHarness({
      cachedRecords: [
        {
          id: "cached-a",
          parentId: "pet-a",
          tableType: "pet_measurement",
          partitionId: "breed-1",
          cachedAt: Date.now(),
        },
      ],
      parentPartitions: {
        "pet-a": "breed-1",
        "pet-b": "breed-1",
        "pet-c": "breed-2",
      },
      resolveRows: (call) =>
        (call.inIds ?? []).map((parentId) => ({
          id: `fresh-${parentId}`,
          pet_id: parentId,
          pet_breed_id: call.eqCalls[0]?.[1],
          value: 42,
        })),
    });

    await harness.store.loadChildRecordsForParents("pet", "pet_measurement", [
      "pet-a",
      "pet-b",
      "pet-c",
    ]);

    expect(harness.supabase.calls).toHaveLength(2);
    expect(harness.supabase.calls.map((call) => call.inIds)).toEqual([
      ["pet-b"],
      ["pet-c"],
    ]);
    expect(harness.supabase.calls.map((call) => call.eqCalls)).toEqual([
      [["pet_breed_id", "breed-1"]],
      [["pet_breed_id", "breed-2"]],
    ]);
  });

  it("refreshes stale cached rows once per partition group", async () => {
    const now = Date.now();
    const harness = await loadHarness({
      cachedRecords: [
        {
          id: "cached-a",
          parentId: "pet-a",
          tableType: "pet_measurement",
          partitionId: "breed-1",
          cachedAt: now - CHILD_RECORDS_STALE_MS - 1,
        },
        {
          id: "cached-b",
          parentId: "pet-b",
          tableType: "pet_measurement",
          partitionId: "breed-2",
          cachedAt: now - CHILD_RECORDS_STALE_MS - 1,
        },
      ],
      parentPartitions: {
        "pet-a": "breed-1",
        "pet-b": "breed-2",
      },
    });
    const refreshSpy = vi
      .spyOn(harness.store as any, "refreshChildRecordsBatchInBackground")
      .mockResolvedValue(undefined);

    await harness.store.loadChildRecordsForParents("pet", "pet_measurement", [
      "pet-a",
      "pet-b",
    ]);

    expect(refreshSpy).toHaveBeenCalledTimes(2);
    expect(refreshSpy.mock.calls.map((call) => call[2])).toEqual([
      ["pet-a"],
      ["pet-b"],
    ]);
  });

  it("does not send cached parents to the Supabase fallback", async () => {
    const harness = await loadHarness({
      cachedRecords: [
        {
          id: "cached-a",
          parentId: "pet-a",
          tableType: "pet_measurement",
          cachedAt: Date.now(),
        },
      ],
    });

    await harness.store.loadChildRecordsForParents("pet", "pet_measurement", [
      "pet-a",
      "pet-b",
      "pet-c",
    ]);

    expect(harness.supabase.calls).toHaveLength(1);
    expect(harness.supabase.calls[0].inIds).toEqual(["pet-b", "pet-c"]);
  });

  it("handles an empty parent list without touching RxDB or Supabase", async () => {
    const harness = await loadHarness();

    const result = await harness.store.loadChildRecordsForParents(
      "pet",
      "pet_measurement",
      [],
    );

    expect(result).toEqual([]);
    expect(harness.store.ensureChildCollection).not.toHaveBeenCalled();
    expect(harness.supabase.calls).toHaveLength(0);
  });

  it("increments batch hit/miss/stale telemetry without touching dictionary counters", async () => {
    const now = Date.now();
    const harness = await loadHarness({
      cachedRecords: [
        {
          id: "cached-a",
          parentId: "pet-a",
          tableType: "pet_measurement",
          cachedAt: now - CHILD_RECORDS_STALE_MS - 1,
        },
      ],
      resolveRows: (call) =>
        (call.inIds ?? []).map((parentId) => ({
          id: `fresh-${parentId}`,
          pet_id: parentId,
          value: 42,
        })),
    });
    vi.spyOn(harness.store as any, "refreshChildRecordsBatchInBackground")
      .mockResolvedValue(undefined);
    harness.dictionaryStore.resetCacheStats();

    await harness.store.loadChildRecordsForParents("pet", "pet_measurement", [
      "pet-a",
      "pet-b",
    ]);

    expect(harness.store.cacheStats.childRecordsBatch).toEqual({
      hit: 1,
      miss: 1,
      staleRevalidate: 1,
    });
    expect(harness.dictionaryStore.cacheStats.getDictionary).toEqual({
      hit: 0,
      miss: 0,
      dedup: 0,
    });
  });

  it("treats an evicted parent as a normal Supabase miss on the next batch load", async () => {
    const harness = await loadHarness({
      cachedRecords: [
        {
          id: "cached-a",
          parentId: "pet-a",
          tableType: "pet_measurement",
          cachedAt: Date.now(),
        },
      ],
      resolveRows: (call) =>
        (call.inIds ?? []).map((parentId) => ({
          id: `fresh-${parentId}`,
          pet_id: parentId,
          value: 42,
        })),
    });
    harness.collection.removeByIds(["cached-a"]);

    const result = await harness.store.loadChildRecordsForParents(
      "pet",
      "pet_measurement",
      ["pet-a"],
    );

    expect(harness.supabase.calls).toHaveLength(1);
    expect(harness.supabase.calls[0].inIds).toEqual(["pet-a"]);
    expect(harness.collection.calls.bulkUpsert[0]).toEqual([
      expect.objectContaining({
        id: "fresh-pet-a",
        parentId: "pet-a",
        tableType: "pet_measurement",
      }),
    ]);
    expect(result).toEqual([
      expect.objectContaining({
        id: "fresh-pet-a",
        parentId: "pet-a",
      }),
    ]);
  });
});
