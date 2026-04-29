import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChildCacheRecord } from "../space-child.helpers";

interface SupabaseFullRecordCall {
  table: string;
  selectFields?: string;
  eqCalls: Array<[string, unknown]>;
}

function createSupabaseMock(
  response: { data: Record<string, unknown> | null; error: unknown },
) {
  const calls: SupabaseFullRecordCall[] = [];
  const from = vi.fn((table: string) => {
    const call: SupabaseFullRecordCall = {
      table,
      eqCalls: [],
    };
    calls.push(call);
    const query = {
      select(fields: string) {
        call.selectFields = fields;
        return query;
      },
      eq(field: string, value: unknown) {
        call.eqCalls.push([field, value]);
        return query;
      },
      maybeSingle: vi.fn(async () => response),
    };
    return query;
  });

  return {
    supabase: { from },
    calls,
  };
}

async function loadHarness(response: {
  data: Record<string, unknown> | null;
  error: unknown;
}) {
  vi.resetModules();
  const supabaseMock = createSupabaseMock(response);
  const collection = {
    bulkUpsert: vi.fn(async (_records: ChildCacheRecord[]) => {}),
  };

  vi.doMock("../app-store.signal-store", () => ({
    appStore: {
      initialized: { value: true },
      appConfig: { value: { data: {} } },
    },
  }));
  vi.doMock("../../supabase/client", () => ({
    supabase: supabaseMock.supabase,
  }));

  const { spaceStore } = await import("../space-store.signal-store");
  const store = spaceStore as any;
  store.ensureChildCollection = vi.fn(async () => collection);
  store.entitySchemas = new Map([
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

  return {
    store,
    collection,
    supabase: supabaseMock,
  };
}

describe("spaceStore.loadFullChildRecord", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("loads a full Supabase row and upserts the full cache shape by default", async () => {
    const row = {
      id: "measurement-1",
      pet_id: "pet-1",
      pet_breed_id: "breed-1",
      score: 93,
      notes: "full row field",
      updated_at: "2026-04-28T10:00:00.000Z",
    };
    const harness = await loadHarness({ data: row, error: null });

    const result = await harness.store.loadFullChildRecord(
      "pet",
      "pet_measurement",
      "measurement-1",
    );

    expect(result).toBe(row);
    expect(harness.supabase.calls).toEqual([
      {
        table: "pet_measurement",
        selectFields: "*",
        eqCalls: [["id", "measurement-1"]],
      },
    ]);
    expect(harness.collection.bulkUpsert).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "measurement-1",
        parentId: "pet-1",
        tableType: "pet_measurement",
        partitionId: "breed-1",
        updated_at: "2026-04-28T10:00:00.000Z",
        additional: {
          score: 93,
          notes: "full row field",
        },
      }),
    ]);
  });

  it("can return the full row without writing it back to the compact cache", async () => {
    const row = {
      id: "measurement-2",
      pet_id: "pet-2",
      score: 81,
    };
    const harness = await loadHarness({ data: row, error: null });

    const result = await harness.store.loadFullChildRecord(
      "pet",
      "pet_measurement",
      "measurement-2",
      { upsertCache: false },
    );

    expect(result).toBe(row);
    expect(harness.store.ensureChildCollection).not.toHaveBeenCalled();
    expect(harness.collection.bulkUpsert).not.toHaveBeenCalled();
  });

  it("returns null on a miss or Supabase error without writing the cache", async () => {
    const missHarness = await loadHarness({ data: null, error: null });

    await expect(
      missHarness.store.loadFullChildRecord(
        "pet",
        "pet_measurement",
        "missing-id",
      ),
    ).resolves.toBeNull();
    expect(missHarness.collection.bulkUpsert).not.toHaveBeenCalled();

    const errorHarness = await loadHarness({
      data: {
        id: "measurement-3",
        pet_id: "pet-3",
      },
      error: new Error("network down"),
    });

    await expect(
      errorHarness.store.loadFullChildRecord(
        "pet",
        "pet_measurement",
        "measurement-3",
      ),
    ).resolves.toBeNull();
    expect(errorHarness.collection.bulkUpsert).not.toHaveBeenCalled();
  });
});
