import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createSupabaseMock() {
  const single = vi.fn();
  // Allow .eq() chains (id + optional partition) before .single()
  const eq: any = vi.fn(() => chain);
  const chain = { eq, single };
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return {
    supabase: {
      from,
    },
    calls: {
      from,
      select,
      eq,
      single,
    },
  };
}

function createCollectionMock(cachedDoc: any = null) {
  const exec = vi.fn(async () => cachedDoc);
  const findOne = vi.fn(() => ({ exec }));
  const upsert = vi.fn(async () => {});

  return {
    collection: {
      findOne,
      upsert,
    },
    calls: {
      exec,
      findOne,
      upsert,
    },
  };
}

async function loadDictionaryStoreHarness(options?: {
  cachedDoc?: any;
  supabaseResult?: { data: any; error: any };
  offline?: boolean;
}) {
  vi.resetModules();

  const { supabase, calls: supabaseCalls } = createSupabaseMock();
  const { collection, calls: collectionCalls } = createCollectionMock(options?.cachedDoc);
  const isOffline = vi.fn(() => options?.offline ?? false);

  supabaseCalls.single.mockImplementation(async () => (
    options?.supabaseResult ?? { data: null, error: null }
  ));

  vi.doMock("../../supabase/client", () => ({ supabase }));
  vi.doMock("../../helpers", () => ({
    DEFAULT_TTL: 14 * 24 * 60 * 60 * 1000,
    cleanupExpiredDocuments: vi.fn(),
    schedulePeriodicCleanup: vi.fn(),
    runInitialCleanup: vi.fn(),
    isNetworkError: vi.fn(() => false),
    isOffline,
  }));

  const module = await import("../dictionary-store.signal-store");
  const store = module.dictionaryStore as any;

  store.initialized.value = true;
  store.collection = collection;

  return {
    store,
    supabaseCalls,
    collectionCalls,
    isOffline,
  };
}

async function loadDictionaryDedupeHarness() {
  vi.resetModules();
  vi.doMock("../../helpers", () => ({
    DEFAULT_TTL: 14 * 24 * 60 * 60 * 1000,
    cleanupExpiredDocuments: vi.fn(),
    schedulePeriodicCleanup: vi.fn(),
    runInitialCleanup: vi.fn(),
    isNetworkError: vi.fn(() => false),
    isOffline: vi.fn(() => false),
  }));
  vi.doMock("../../supabase/client", () => ({
    supabase: { from: vi.fn() },
  }));

  const module = await import("../dictionary-store.signal-store");
  const store = module.dictionaryStore as any;
  store.collection = {};
  store.inflightDictionary = new Map();
  store.inflightRecord = new Map();
  store.inflightJunction = new Map();
  store.resetCacheStats();
  store.runGetDictionary = vi.fn();
  store.runGetRecordById = vi.fn();
  store.runGetJunctionIds = vi.fn();
  store.initialized.value = true;

  return { store };
}

describe("dictionary-store.signal-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("fetches a narrow projection when additionalFields are requested", async () => {
    const harness = await loadDictionaryStoreHarness({
      supabaseResult: {
        data: { id: "sex-1", name: "Male", code: "M" },
        error: null,
      },
    });

    const result = await harness.store.getRecordById("sex", "sex-1", {
      additionalFields: ["code"],
    });

    expect(result).toEqual({ id: "sex-1", name: "Male", code: "M" });
    expect(harness.supabaseCalls.select).toHaveBeenCalledWith("id, name, code");
    expect(harness.collectionCalls.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        table_name: "sex",
        id: "sex-1",
        name: "Male",
        additional: { code: "M" },
      }),
    );
  });

  it("falls back to a full-row fetch when no additionalFields are provided", async () => {
    const harness = await loadDictionaryStoreHarness({
      supabaseResult: {
        data: { id: "country-1", name: "Ukraine", code: "UA", slug: "ukraine" },
        error: null,
      },
    });

    await harness.store.getRecordById("country", "country-1");

    expect(harness.supabaseCalls.select).toHaveBeenCalledWith("*");
  });

  it("threads partitionFilter into the Supabase .eq chain for partitioned tables", async () => {
    const harness = await loadDictionaryStoreHarness({
      supabaseResult: {
        data: { id: "pet-1", name: "Rex" },
        error: null,
      },
    });

    await harness.store.getRecordById("pet", "pet-1", {
      partitionFilter: { field: "breed_id", value: "breed-A" },
    });

    // Two .eq() calls: id first, then partition column.
    expect(harness.supabaseCalls.eq).toHaveBeenCalledWith("id", "pet-1");
    expect(harness.supabaseCalls.eq).toHaveBeenCalledWith("breed_id", "breed-A");
  });

  it("does not call .eq() with a partition column when partitionFilter is omitted", async () => {
    const harness = await loadDictionaryStoreHarness({
      supabaseResult: { data: { id: "sex-1", name: "Male" }, error: null },
    });

    await harness.store.getRecordById("sex", "sex-1");

    expect(harness.supabaseCalls.eq).toHaveBeenCalledWith("id", "sex-1");
    expect(harness.supabaseCalls.eq).toHaveBeenCalledTimes(1);
  });

  it("reuses cached records when the requested additional field is already present", async () => {
    const harness = await loadDictionaryStoreHarness({
      cachedDoc: {
        id: "sex-1",
        name: "Male",
        additional: { code: "M" },
      },
    });

    const result = await harness.store.getRecordById("sex", "sex-1", {
      additionalFields: ["code"],
    });

    expect(result).toEqual({ id: "sex-1", name: "Male", code: "M" });
    expect(harness.supabaseCalls.from).not.toHaveBeenCalled();
  });

  it("refetches when a cached partial record is missing the requested additional field", async () => {
    const harness = await loadDictionaryStoreHarness({
      cachedDoc: {
        id: "sex-1",
        name: "Male",
        additional: { slug: "male" },
      },
      supabaseResult: {
        data: { id: "sex-1", name: "Male", code: "M" },
        error: null,
      },
    });

    const result = await harness.store.getRecordById("sex", "sex-1", {
      additionalFields: ["code"],
    });

    expect(result).toEqual({ id: "sex-1", name: "Male", code: "M" });
    expect(harness.supabaseCalls.select).toHaveBeenCalledWith("id, name, code");
  });

  it("shares one in-flight getDictionary promise for identical concurrent calls", async () => {
    const { store } = await loadDictionaryDedupeHarness();
    const result = {
      records: [{ id: "a", name: "Alpha" }],
      total: 1,
      hasMore: false,
      nextCursor: null,
    };
    let resolveShared!: (value: typeof result) => void;
    const sharedPromise = new Promise<typeof result>((resolve) => {
      resolveShared = resolve;
    });
    store.runGetDictionary.mockReturnValue(sharedPromise);

    const first = store.getDictionary("breed", {
      filterByIds: ["a", "b"],
      nameField: "name",
    });
    const second = store.getDictionary("breed", {
      filterByIds: ["b", "a"],
      nameField: "name",
    });

    expect(second).toBe(first);
    expect(store.runGetDictionary).toHaveBeenCalledTimes(1);
    expect(store.cacheStats.getDictionary.dedup).toBe(1);

    resolveShared(result);
    await expect(first).resolves.toBe(result);
    await expect(second).resolves.toBe(result);
  });

  it("does not share in-flight getDictionary calls for distinct id sets", async () => {
    const { store } = await loadDictionaryDedupeHarness();
    store.runGetDictionary.mockResolvedValue({
      records: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
    });

    await Promise.all([
      store.getDictionary("breed", { filterByIds: ["a", "b"] }),
      store.getDictionary("breed", { filterByIds: ["b", "c"] }),
    ]);

    expect(store.runGetDictionary).toHaveBeenCalledTimes(2);
  });

  it("does not share in-flight getDictionary calls for distinct additional field sets", async () => {
    const { store } = await loadDictionaryDedupeHarness();
    store.runGetDictionary.mockResolvedValue({
      records: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
    });

    await Promise.all([
      store.getDictionary("pet", {
        filterByIds: ["pet-1"],
        additionalFields: ["sex_id"],
      }),
      store.getDictionary("pet", {
        filterByIds: ["pet-1"],
        additionalFields: ["breed_id"],
      }),
    ]);

    expect(store.runGetDictionary).toHaveBeenCalledTimes(2);
  });

  it("drops the in-flight getDictionary promise after resolution", async () => {
    const { store } = await loadDictionaryDedupeHarness();
    store.runGetDictionary.mockResolvedValue({
      records: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
    });

    await store.getDictionary("breed", { filterByIds: ["a"] });
    await store.getDictionary("breed", { filterByIds: ["a"] });

    expect(store.runGetDictionary).toHaveBeenCalledTimes(2);
  });

  it("reports a shared getDictionary error to all concurrent awaiters and clears in-flight state", async () => {
    const { store } = await loadDictionaryDedupeHarness();
    const error = new Error("supabase boom");
    store.runGetDictionary.mockRejectedValueOnce(error);

    const first = store.getDictionary("breed", { filterByIds: ["a"] });
    const second = store.getDictionary("breed", { filterByIds: ["a"] });

    expect(second).toBe(first);
    await expect(first).rejects.toThrow("supabase boom");
    await expect(second).rejects.toThrow("supabase boom");

    store.runGetDictionary.mockResolvedValueOnce({
      records: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
    });
    await store.getDictionary("breed", { filterByIds: ["a"] });

    expect(store.runGetDictionary).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight getRecordById promise for identical concurrent calls", async () => {
    const { store } = await loadDictionaryDedupeHarness();
    let resolveShared!: (value: Record<string, unknown>) => void;
    const sharedPromise = new Promise<Record<string, unknown>>((resolve) => {
      resolveShared = resolve;
    });
    store.runGetRecordById.mockReturnValue(sharedPromise);

    const id = "71513fb2-19bb-4812-86d4-2e6986297e4b";
    const first = store.getRecordById("sex", id);
    const second = store.getRecordById("sex", id);
    const third = store.getRecordById("sex", id);

    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(store.runGetRecordById).toHaveBeenCalledTimes(1);

    const result = { id, name: "Male" };
    resolveShared(result);
    await expect(first).resolves.toBe(result);
    await expect(second).resolves.toBe(result);
    await expect(third).resolves.toBe(result);
  });

  it("does not share in-flight getRecordById calls for different ids", async () => {
    const { store } = await loadDictionaryDedupeHarness();
    store.runGetRecordById.mockResolvedValue(null);

    await Promise.all([
      store.getRecordById("sex", "id-1"),
      store.getRecordById("sex", "id-2"),
    ]);

    expect(store.runGetRecordById).toHaveBeenCalledTimes(2);
  });

  it("does not share in-flight getRecordById calls for different additionalFields projections", async () => {
    const { store } = await loadDictionaryDedupeHarness();
    store.runGetRecordById.mockResolvedValue(null);

    await Promise.all([
      store.getRecordById("pet", "pet-1", { additionalFields: ["sex_id"] }),
      store.getRecordById("pet", "pet-1", { additionalFields: ["breed_id"] }),
      store.getRecordById("pet", "pet-1"),
    ]);

    expect(store.runGetRecordById).toHaveBeenCalledTimes(3);
  });

  it("drops the in-flight getRecordById promise after resolution so future calls re-run", async () => {
    const { store } = await loadDictionaryDedupeHarness();
    store.runGetRecordById.mockResolvedValue(null);

    await store.getRecordById("sex", "id-1");
    await store.getRecordById("sex", "id-1");

    expect(store.runGetRecordById).toHaveBeenCalledTimes(2);
  });

  it("does not share in-flight getRecordById calls for different partitionFilter values on the same id", async () => {
    const { store } = await loadDictionaryDedupeHarness();
    store.runGetRecordById.mockResolvedValue(null);

    await Promise.all([
      store.getRecordById("pet", "pet-1", { partitionFilter: { field: "breed_id", value: "breed-A" } }),
      store.getRecordById("pet", "pet-1", { partitionFilter: { field: "breed_id", value: "breed-B" } }),
    ]);

    expect(store.runGetRecordById).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight getRecordById promise when partitionFilter is identical", async () => {
    const { store } = await loadDictionaryDedupeHarness();
    let resolveShared!: (value: Record<string, unknown>) => void;
    const sharedPromise = new Promise<Record<string, unknown>>((resolve) => {
      resolveShared = resolve;
    });
    store.runGetRecordById.mockReturnValue(sharedPromise);

    const filter = { field: "breed_id", value: "breed-A" };
    const first = store.getRecordById("pet", "pet-1", { partitionFilter: filter });
    const second = store.getRecordById("pet", "pet-1", { partitionFilter: filter });

    expect(second).toBe(first);
    expect(store.runGetRecordById).toHaveBeenCalledTimes(1);
    resolveShared({ id: "pet-1", name: "Pet" });
    await first;
  });

  it("treats absent vs present partitionFilter as different in-flight calls", async () => {
    const { store } = await loadDictionaryDedupeHarness();
    store.runGetRecordById.mockResolvedValue(null);

    await Promise.all([
      store.getRecordById("pet", "pet-1"),
      store.getRecordById("pet", "pet-1", { partitionFilter: { field: "breed_id", value: "breed-A" } }),
    ]);

    expect(store.runGetRecordById).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight getJunctionIds promise for identical concurrent calls", async () => {
    const { store } = await loadDictionaryDedupeHarness();
    let resolveShared!: (value: string[]) => void;
    const sharedPromise = new Promise<string[]>((resolve) => {
      resolveShared = resolve;
    });
    store.runGetJunctionIds.mockReturnValue(sharedPromise);

    const breedId = "breed-mama";
    const first = store.getJunctionIds(
      "related_breed",
      "connected_breed_id",
      "breed_id",
      breedId,
    );
    const second = store.getJunctionIds(
      "related_breed",
      "connected_breed_id",
      "breed_id",
      breedId,
    );

    expect(second).toBe(first);
    expect(store.runGetJunctionIds).toHaveBeenCalledTimes(1);

    const result = ["breed-mama", "breed-papa"];
    resolveShared(result);
    await expect(first).resolves.toBe(result);
    await expect(second).resolves.toBe(result);
  });

  it("does not share in-flight getJunctionIds calls for different filterValues", async () => {
    const { store } = await loadDictionaryDedupeHarness();
    store.runGetJunctionIds.mockResolvedValue([]);

    await Promise.all([
      store.getJunctionIds(
        "related_breed",
        "connected_breed_id",
        "breed_id",
        "breed-1",
      ),
      store.getJunctionIds(
        "related_breed",
        "connected_breed_id",
        "breed_id",
        "breed-2",
      ),
    ]);

    expect(store.runGetJunctionIds).toHaveBeenCalledTimes(2);
  });
});
