import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChildLruPolicy } from "../child-lru-policy";
import type { ChildCacheRecord } from "../space-child.helpers";

function childRecord(id: string, parentId: string): ChildCacheRecord {
  return {
    id,
    parentId,
    tableType: "pet_measurement",
    cachedAt: Date.now(),
  };
}

function createCollection(initialRecords: ChildCacheRecord[]) {
  let records = [...initialRecords];
  const bulkRemove = vi.fn(async (ids: string[]) => {
    const remove = new Set(ids);
    records = records.filter((record) => !remove.has(record.id));
  });

  return {
    get records() {
      return records;
    },
    bulkRemove,
    collection: {
      find: vi.fn(() => ({
        exec: async () =>
          records.map((record) => ({
            toJSON: () => record,
          })),
      })),
      bulkRemove,
    },
  };
}

describe("ChildLruPolicy", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("evicts the least-recently-touched parent group first", async () => {
    const policy = new ChildLruPolicy();
    const collection = createCollection([
      childRecord("old-1", "pet-old"),
      childRecord("old-2", "pet-old"),
      childRecord("new-1", "pet-new"),
      childRecord("new-2", "pet-new"),
    ]);

    vi.setSystemTime(1_000);
    policy.touch("pet", "pet-old", "pet_measurement");
    vi.setSystemTime(2_000);
    policy.touch("pet", "pet-new", "pet_measurement");
    vi.setSystemTime(10_000);

    const stats = await policy.maybeEvict({
      entityType: "pet",
      collection: collection.collection,
      pendingQueue: {
        getPendingChildRecordIds: async () => new Set(),
      },
      recordLimit: 3,
      evictTargetRatio: 0.67,
      protectMs: 0,
    });

    expect(collection.bulkRemove).toHaveBeenCalledWith(["old-1", "old-2"]);
    expect(collection.records.map((record) => record.id)).toEqual([
      "new-1",
      "new-2",
    ]);
    expect(stats).toMatchObject({
      evictedRecords: 2,
      evictedGroups: 1,
      beforeSize: 4,
      afterSize: 2,
    });
  });

  it("does not evict an active read even when it is the coldest group", async () => {
    const policy = new ChildLruPolicy();
    const collection = createCollection([
      childRecord("active-1", "pet-active"),
      childRecord("active-2", "pet-active"),
      childRecord("other-1", "pet-other"),
      childRecord("other-2", "pet-other"),
    ]);

    vi.setSystemTime(1_000);
    const release = policy.beginRead("pet", "pet-active", "pet_measurement");
    vi.setSystemTime(2_000);
    policy.touch("pet", "pet-other", "pet_measurement");
    vi.setSystemTime(10_000);

    const stats = await policy.maybeEvict({
      entityType: "pet",
      collection: collection.collection,
      pendingQueue: {
        getPendingChildRecordIds: async () => new Set(),
      },
      recordLimit: 3,
      evictTargetRatio: 0.67,
      protectMs: 0,
    });

    expect(collection.bulkRemove).toHaveBeenCalledWith(["other-1", "other-2"]);
    expect(collection.records.map((record) => record.id)).toEqual([
      "active-1",
      "active-2",
    ]);
    expect(stats.evictedRecords).toBe(2);

    release();
  });
});
