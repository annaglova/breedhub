import { describe, expect, it, vi } from "vitest";
import {
  buildEntityCollectionConfig,
  getCollectionReuseStatus,
  isCollectionSchemaMismatchError,
  recoverCollectionSchemaMismatch,
} from "../space-collection.helpers";

describe("space-collection.helpers", () => {
  it("builds collection config with cachedAt migration and pass-through version bump", () => {
    const config = buildEntityCollectionConfig({ version: 2, title: "pet" });
    const migrated = config.migrationStrategies[1]({ id: "pet-1", name: "Alpha" });
    const passthrough = config.migrationStrategies[2]({ id: "pet-2" });

    expect(config.schema).toEqual({ version: 2, title: "pet" });
    expect(migrated.id).toBe("pet-1");
    expect(migrated.name).toBe("Alpha");
    expect(typeof migrated.cachedAt).toBe("number");
    expect(passthrough).toEqual({ id: "pet-2" });
  });

  it("reuses a healthy collection when count check succeeds", async () => {
    await expect(
      getCollectionReuseStatus("pet", {
        name: "pet",
        count: () => ({
          exec: async () => 1,
        }),
      }),
    ).resolves.toBe("ready");
  });

  it("recreates a collection when it is missing, mismatched, or broken", async () => {
    await expect(getCollectionReuseStatus("pet")).resolves.toBe("recreate");
    await expect(
      getCollectionReuseStatus("pet", {
        name: "breed",
        count: () => ({
          exec: async () => 1,
        }),
      }),
    ).resolves.toBe("recreate");
    await expect(
      getCollectionReuseStatus("pet", {
        name: "pet",
        count: () => ({
          exec: async () => {
            throw new Error("broken");
          },
        }),
      }),
    ).resolves.toBe("recreate");
  });

  it("detects DB6 schema mismatch errors", () => {
    expect(isCollectionSchemaMismatchError({ code: "DB6" })).toBe(true);
    expect(isCollectionSchemaMismatchError({ code: "DXE1" })).toBe(false);
    expect(isCollectionSchemaMismatchError(null)).toBe(false);
  });

  it("recovers schema mismatch by clearing storage and reloading once", async () => {
    const removedKeys: string[] = [];
    const deletedDatabases: string[] = [];
    const reload = vi.fn();
    const remove = vi.fn(async () => undefined);

    const recovered = await recoverCollectionSchemaMismatch({
      db: { remove },
      indexedDb: {
        deleteDatabase(name: string) {
          deletedDatabases.push(name);
          const request = {
            onsuccess: null,
            onerror: null,
            onblocked: null,
          };
          queueMicrotask(() => {
            request.onsuccess?.();
          });
          return request;
        },
      },
      localStorage: {
        removeItem(key: string) {
          removedKeys.push(key);
        },
      },
      window: {
        location: { reload },
      },
    });

    expect(recovered).toBe(true);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(removedKeys).toEqual(["breedhub_schema_hash"]);
    expect(deletedDatabases).toEqual(["rxdb-dexie-breedhub", "breedhub"]);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("skips duplicate recovery when a clear is already in progress", async () => {
    const reload = vi.fn();

    const recovered = await recoverCollectionSchemaMismatch({
      indexedDb: {
        deleteDatabase() {
          return {
            onsuccess: null,
            onerror: null,
            onblocked: null,
          };
        },
      },
      localStorage: {
        removeItem() {
          throw new Error("should not be called");
        },
      },
      window: {
        __rxdbClearing: true,
        location: { reload },
      },
    });

    expect(recovered).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
