import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createSupabaseMock() {
  const single = vi.fn();
  const eq = vi.fn(() => ({ single }));
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
});
