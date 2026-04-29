import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function loadHarness() {
  vi.resetModules();
  const rpc = vi.fn();
  vi.doMock("../app-store.signal-store", () => ({
    appStore: {
      initialized: { value: true },
      appConfig: { value: { data: {} } },
    },
  }));
  vi.doMock("../../supabase/client", () => ({
    supabase: { rpc },
    checkSupabaseConnection: vi.fn(),
  }));

  const { spaceStore } = await import("../space-store.signal-store");
  const store = spaceStore as any;
  store.rpcCache = new Map();
  store.rpcInflight = new Map();
  store.resetCacheStats();
  return { store, rpc };
}

describe("spaceStore.callRpc cache", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("serves the second identical cached RPC call without invoking Supabase again", async () => {
    const { store, rpc } = await loadHarness();
    const rows = [{ id: "node-1", name: "BIS" }];
    rpc.mockResolvedValue({ data: rows, error: null });

    const first = await store.callRpc(
      "get_contact_judge_tree_level",
      { p_contact_id: "contact-1", p_parent_id: null },
      { cacheTtlMs: 120_000 },
    );
    const second = await store.callRpc(
      "get_contact_judge_tree_level",
      { p_contact_id: "contact-1", p_parent_id: null },
      { cacheTtlMs: 120_000 },
    );

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(first.data).toBe(rows);
    expect(second.data).toBe(rows);
    expect(store.cacheStats.rpc).toEqual({
      hit: 1,
      miss: 1,
      dedup: 0,
    });
  });

  it("deduplicates identical concurrent RPC calls", async () => {
    const { store, rpc } = await loadHarness();
    const deferred = createDeferred<{ data: Array<{ id: string }>; error: null }>();
    rpc.mockReturnValue(deferred.promise);

    const first = store.callRpc(
      "get_contact_judge_tree_level",
      { p_contact_id: "contact-1", p_parent_id: "node-1" },
      { cacheTtlMs: 120_000 },
    );
    const second = store.callRpc(
      "get_contact_judge_tree_level",
      { p_contact_id: "contact-1", p_parent_id: "node-1" },
      { cacheTtlMs: 120_000 },
    );

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(store.cacheStats.rpc.dedup).toBe(1);

    deferred.resolve({ data: [{ id: "child-1" }], error: null });
    await expect(first).resolves.toEqual({
      data: [{ id: "child-1" }],
      error: null,
    });
    await expect(second).resolves.toEqual({
      data: [{ id: "child-1" }],
      error: null,
    });
  });
});
