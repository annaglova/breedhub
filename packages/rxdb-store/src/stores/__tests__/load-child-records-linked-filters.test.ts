import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHILD_RECORDS_STALE_MS } from "../../cache/cache-policies";
import type { ChildCacheRecord, ChildSelector } from "../space-child.helpers";

interface SupabaseQueryCall {
  table: string;
  selectFields?: string;
  eqCalls: Array<[string, unknown]>;
  orderCalls: Array<[string, unknown]>;
  limitValue?: number;
  orCalls: string[];
}

function matchesSelector(
  record: ChildCacheRecord,
  selector: ChildSelector | undefined,
): boolean {
  if (!selector) return true;
  return Object.entries(selector).every(
    ([field, value]) => record[field] === value,
  );
}

function createChildCollection(initialRecords: ChildCacheRecord[]) {
  let records = [...initialRecords];
  return {
    bulkUpserts: [] as ChildCacheRecord[][],
    collection: {
      find(options: { selector?: ChildSelector; limit?: number } = {}) {
        return {
          exec: async () =>
            records
              .filter((r) => matchesSelector(r, options.selector))
              .map((r) => ({ toJSON: () => r })),
          sort() {
            return this;
          },
        };
      },
      bulkUpsert: vi.fn(async (next: ChildCacheRecord[]) => {
        records.push(...next);
      }),
    },
  };
}

function createSupabaseMock(rows: Array<Record<string, unknown>>) {
  const calls: SupabaseQueryCall[] = [];
  const from = vi.fn((table: string) => {
    const call: SupabaseQueryCall = {
      table,
      eqCalls: [],
      orderCalls: [],
      orCalls: [],
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
      or(expr: string) {
        call.orCalls.push(expr);
        return query;
      },
      limit(value: number) {
        call.limitValue = value;
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
        return Promise.resolve({ data: rows, error: null }).then(
          onFulfilled,
          onRejected,
        );
      },
    };
    return query;
  });

  return { supabase: { from }, calls };
}

async function makeHarness(options: {
  cachedRecords: ChildCacheRecord[];
  supabaseRows?: Array<Record<string, unknown>>;
}) {
  vi.resetModules();
  const collection = createChildCollection(options.cachedRecords);
  const supabaseMock = createSupabaseMock(options.supabaseRows ?? []);

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
  store.entitySchemas = new Map();
  store.childRefreshSignal = { value: null };

  return { store, collection, supabase: supabaseMock };
}

describe("spaceStore.loadChildRecords stale-revalidate carries linkedFilters", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("forwards linkedFilters into background refresh when cache is stale (regression: bg refresh used to ignore them, leaking non-public types)", async () => {
    const harness = await makeHarness({
      cachedRecords: [
        {
          id: "ident-1",
          parentId: "pet-1",
          tableType: "pet_identifier",
          cachedAt: Date.now() - CHILD_RECORDS_STALE_MS - 1,
        },
      ],
      supabaseRows: [],
    });

    await harness.store.loadChildRecords("pet-1", "pet_identifier", {
      linkedFilters: [
        {
          fk: "pet_identifier_type_id",
          table: "pet_identifier_type",
          filter: { is_public: true },
        },
      ],
    });

    // Wait for fire-and-forget background refresh to land.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.supabase.calls).toHaveLength(1);
    const call = harness.supabase.calls[0];
    expect(call.selectFields).toContain("pet_identifier_type!inner(id)");
    expect(call.eqCalls).toContainEqual([
      "pet_identifier_type.is_public",
      true,
    ]);
  });
});
