import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type RouteRecord = {
  slug: string;
  entity: string;
  entity_id: string;
  entity_partition_id?: string;
  partition_field?: string;
  model: string;
  cachedAt: number;
};

function createSupabaseMock() {
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
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
      maybeSingle,
    },
  };
}

function createCollectionMock() {
  const upsert = vi.fn();
  const docsForFind: Array<{ remove: ReturnType<typeof vi.fn> }> = [];
  const exec = vi.fn(async () => docsForFind);
  const find = vi.fn(() => ({ exec }));

  return {
    collection: {
      upsert,
      find,
    },
    calls: {
      upsert,
      find,
      exec,
      docsForFind,
    },
  };
}

async function loadRouteStoreHarness(options?: {
  cachedDoc?: any;
  offline?: boolean;
  networkError?: boolean;
  supabaseResult?: { data: any; error: any };
  supabaseThrown?: Error;
  getDatabaseError?: Error;
  collectionError?: Error;
  cleanupInterval?: ReturnType<typeof setInterval>;
}) {
  vi.resetModules();

  const { collection, calls: collectionCalls } = createCollectionMock();
  const { supabase, calls: supabaseCalls } = createSupabaseMock();

  const getDatabase = vi.fn(async () => {
    if (options?.getDatabaseError) {
      throw options.getDatabaseError;
    }

    return { name: "db" };
  });

  const getOrCreateCollection = vi.fn(async () => {
    if (options?.collectionError) {
      throw options.collectionError;
    }

    return collection;
  });

  const findDocumentByPrimaryKey = vi.fn(async () => options?.cachedDoc ?? null);
  const cleanupExpiredDocuments = vi.fn(async () => {});
  const runInitialCleanup = vi.fn();
  const cleanupInterval =
    options?.cleanupInterval ?? (({ token: "interval" } as unknown) as ReturnType<typeof setInterval>);
  const schedulePeriodicCleanup = vi.fn(() => cleanupInterval);
  const isOffline = vi.fn(() => options?.offline ?? false);
  const isNetworkError = vi.fn((error: unknown) => {
    if (options?.networkError !== undefined) {
      return options.networkError;
    }

    return (error as Error)?.message === "network";
  });

  supabaseCalls.maybeSingle.mockImplementation(async () => {
    if (options?.supabaseThrown) {
      throw options.supabaseThrown;
    }

    return options?.supabaseResult ?? { data: null, error: null };
  });

  vi.doMock("../../helpers", () => ({
    DEFAULT_TTL: 14 * 24 * 60 * 60 * 1000,
    cleanupExpiredDocuments,
    getOrCreateCollection,
    schedulePeriodicCleanup,
    runInitialCleanup,
    isNetworkError,
    isOffline,
  }));

  vi.doMock("../../supabase/client", () => ({ supabase }));
  vi.doMock("../../services/database.service", () => ({ getDatabase }));
  vi.doMock("../../utils/rxdb-document.helpers", () => ({
    findDocumentByPrimaryKey,
  }));

  const module = await import("../route-store.signal-store");

  return {
    routeStore: module.routeStore,
    collectionCalls,
    supabaseCalls,
    getDatabase,
    getOrCreateCollection,
    findDocumentByPrimaryKey,
    cleanupExpiredDocuments,
    runInitialCleanup,
    schedulePeriodicCleanup,
    isOffline,
    isNetworkError,
    cleanupInterval,
  };
}

describe("route-store.signal-store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("initializes once, creates the routes collection, and wires cleanup hooks", async () => {
    const harness = await loadRouteStoreHarness();

    await harness.routeStore.initialize();
    await harness.routeStore.initialize();

    expect(harness.getDatabase).toHaveBeenCalledTimes(1);
    expect(harness.getOrCreateCollection).toHaveBeenCalledTimes(1);
    expect(harness.runInitialCleanup).toHaveBeenCalledWith(
      expect.any(Function),
      "[RouteStore]",
    );
    expect(harness.schedulePeriodicCleanup).toHaveBeenCalledWith(
      expect.any(Function),
      "[RouteStore]",
    );
    expect(harness.routeStore.initialized.value).toBe(true);
    expect(harness.routeStore.loading.value).toBe(false);
    expect(harness.routeStore.error.value).toBeNull();
  });

  it("surfaces initialization failures through error state and rethrows", async () => {
    const error = new Error("db unavailable");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const harness = await loadRouteStoreHarness({ getDatabaseError: error });

    await expect(harness.routeStore.initialize()).rejects.toThrow("db unavailable");

    expect(harness.routeStore.initialized.value).toBe(false);
    expect(harness.routeStore.loading.value).toBe(false);
    expect(harness.routeStore.error.value).toBe("db unavailable");
    expect(errorSpy).toHaveBeenCalledWith("[RouteStore] Initialization failed:", error);
  });

  it("resolves a fresh cached route without hitting Supabase", async () => {
    const harness = await loadRouteStoreHarness({
      cachedDoc: {
        slug: "affenpinscher",
        entity: "breed",
        entity_id: "breed-1",
        entity_partition_id: "partition-1",
        partition_field: "breed_id",
        model: "breed",
        cachedAt: Date.now(),
      },
    });

    await harness.routeStore.initialize();

    await expect(harness.routeStore.resolveRoute("affenpinscher")).resolves.toEqual({
      slug: "affenpinscher",
      entity: "breed",
      entity_id: "breed-1",
      entity_partition_id: "partition-1",
      partition_field: "breed_id",
      model: "breed",
    });

    expect(harness.findDocumentByPrimaryKey).toHaveBeenCalledWith(
      expect.any(Object),
      "affenpinscher",
    );
    expect(harness.supabaseCalls.from).not.toHaveBeenCalled();
  });

  it("warns on lazy init, drops a mismatched cached slug, and refetches from Supabase", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const remove = vi.fn(async () => {});
    const harness = await loadRouteStoreHarness({
      cachedDoc: {
        slug: "wrong-slug",
        entity: "breed",
        entity_id: "breed-1",
        model: "breed",
        cachedAt: Date.now(),
        remove,
      },
      supabaseResult: {
        data: {
          slug: "affenpinscher",
          entity: "breed",
          entity_id: "breed-2",
          entity_partition_id: null,
          partition_field: null,
          model: "breed",
        },
        error: null,
      },
    });

    await expect(harness.routeStore.resolveRoute("affenpinscher")).resolves.toEqual({
      slug: "affenpinscher",
      entity: "breed",
      entity_id: "breed-2",
      entity_partition_id: null,
      partition_field: null,
      model: "breed",
    });

    expect(warnSpy).toHaveBeenNthCalledWith(
      1,
      "[RouteStore] Not initialized, initializing now...",
    );
    expect(warnSpy).toHaveBeenNthCalledWith(
      2,
      "[RouteStore] Cache returned wrong slug!",
      { expected: "affenpinscher", got: "wrong-slug" },
    );
    expect(remove).toHaveBeenCalledTimes(1);
    expect(harness.collectionCalls.upsert).toHaveBeenCalledWith({
      slug: "affenpinscher",
      entity: "breed",
      entity_id: "breed-2",
      entity_partition_id: "",
      partition_field: "",
      model: "breed",
      cachedAt: Date.parse("2026-04-21T12:00:00.000Z"),
    });
  });

  it("expires stale cache entries, removes them, and caches the fresh remote route", async () => {
    const remove = vi.fn(async () => {});
    const staleCachedAt = Date.now() - 15 * 24 * 60 * 60 * 1000;
    const harness = await loadRouteStoreHarness({
      cachedDoc: {
        slug: "affenpinscher",
        entity: "breed",
        entity_id: "breed-1",
        model: "breed",
        cachedAt: staleCachedAt,
        remove,
      },
      supabaseResult: {
        data: {
          slug: "affenpinscher",
          entity: "breed",
          entity_id: "breed-2",
          entity_partition_id: "partition-1",
          partition_field: "breed_id",
          model: "breed",
        },
        error: null,
      },
    });

    await harness.routeStore.initialize();

    await expect(harness.routeStore.resolveRoute("affenpinscher")).resolves.toEqual({
      slug: "affenpinscher",
      entity: "breed",
      entity_id: "breed-2",
      entity_partition_id: "partition-1",
      partition_field: "breed_id",
      model: "breed",
    });

    expect(remove).toHaveBeenCalledTimes(1);
    expect(harness.collectionCalls.upsert).toHaveBeenCalledTimes(1);
  });

  it("returns null offline when there is no usable cached route", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const harness = await loadRouteStoreHarness({ offline: true });

    await harness.routeStore.initialize();

    await expect(harness.routeStore.resolveRoute("affenpinscher")).resolves.toBeNull();

    expect(logSpy).toHaveBeenCalledWith(
      "[RouteStore] Offline, cannot fetch from Supabase",
    );
    expect(harness.supabaseCalls.from).not.toHaveBeenCalled();
  });

  it("returns null when Supabase does not find a route or the routes table is missing", async () => {
    const notFoundHarness = await loadRouteStoreHarness({
      supabaseResult: { data: null, error: null },
    });

    await notFoundHarness.routeStore.initialize();
    await expect(
      notFoundHarness.routeStore.resolveRoute("unknown-slug"),
    ).resolves.toBeNull();

    const missingTableHarness = await loadRouteStoreHarness({
      supabaseResult: {
        data: null,
        error: { code: "42P01", message: "missing routes table" },
      },
    });

    await missingTableHarness.routeStore.initialize();
    await expect(
      missingTableHarness.routeStore.resolveRoute("unknown-slug"),
    ).resolves.toBeNull();
  });

  it("returns null on network errors but rethrows non-network Supabase failures", async () => {
    const networkHarness = await loadRouteStoreHarness({
      supabaseResult: {
        data: null,
        error: { message: "request failed" },
      },
      networkError: true,
    });

    await networkHarness.routeStore.initialize();
    await expect(
      networkHarness.routeStore.resolveRoute("affenpinscher"),
    ).resolves.toBeNull();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const nonNetworkError = { message: "permission denied", code: "42501" };
    const nonNetworkHarness = await loadRouteStoreHarness({
      supabaseResult: {
        data: null,
        error: nonNetworkError,
      },
      networkError: false,
    });

    await nonNetworkHarness.routeStore.initialize();
    await expect(
      nonNetworkHarness.routeStore.resolveRoute("affenpinscher"),
    ).rejects.toEqual(nonNetworkError);
    expect(errorSpy).toHaveBeenCalledWith(
      "[RouteStore] Supabase error:",
      nonNetworkError,
    );
  });

  it("saves routes with empty-string partition fallbacks and skips empty slugs", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const harness = await loadRouteStoreHarness();

    await harness.routeStore.saveRoute({
      slug: "affenpinscher",
      entity: "breed",
      entity_id: "breed-1",
      model: "breed",
    });

    expect(harness.collectionCalls.upsert).toHaveBeenCalledWith({
      slug: "affenpinscher",
      entity: "breed",
      entity_id: "breed-1",
      entity_partition_id: "",
      partition_field: "",
      model: "breed",
      cachedAt: Date.parse("2026-04-21T12:00:00.000Z"),
    });

    await harness.routeStore.saveRoute({
      slug: "",
      entity: "breed",
      entity_id: "breed-1",
      model: "breed",
    });

    expect(warnSpy).toHaveBeenCalledWith(
      "[RouteStore] Cannot save route - slug is empty",
    );
    expect(harness.collectionCalls.upsert).toHaveBeenCalledTimes(1);
  });

  it("invalidates a single cached route or all routes for an entity", async () => {
    const removeSingle = vi.fn(async () => {});
    const removeA = vi.fn(async () => {});
    const removeB = vi.fn(async () => {});
    const harness = await loadRouteStoreHarness({
      cachedDoc: { remove: removeSingle },
    });

    harness.collectionCalls.docsForFind.push(
      { remove: removeA as unknown as ReturnType<typeof vi.fn> },
      { remove: removeB as unknown as ReturnType<typeof vi.fn> },
    );

    await harness.routeStore.initialize();
    await harness.routeStore.invalidateRoute("affenpinscher");
    await harness.routeStore.invalidateEntityRoutes("breed", "breed-1");

    expect(removeSingle).toHaveBeenCalledTimes(1);
    expect(harness.collectionCalls.find).toHaveBeenCalledWith({
      selector: {
        entity: "breed",
        entity_id: "breed-1",
      },
    });
    expect(removeA).toHaveBeenCalledTimes(1);
    expect(removeB).toHaveBeenCalledTimes(1);
  });

  it("cleans up the scheduled interval and resets initialization state on destroy", async () => {
    const cleanupInterval = (({ token: "cleanup" } as unknown) as ReturnType<
      typeof setInterval
    >);
    const clearIntervalSpy = vi
      .spyOn(globalThis, "clearInterval")
      .mockImplementation(() => undefined);
    const harness = await loadRouteStoreHarness({ cleanupInterval });

    await harness.routeStore.initialize();
    harness.routeStore.destroy();

    expect(clearIntervalSpy).toHaveBeenCalledWith(cleanupInterval);
    expect(harness.routeStore.initialized.value).toBe(false);
  });
});
