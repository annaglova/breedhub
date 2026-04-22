import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchEntityBySlugFlow,
  wireReconnectRefresh,
} from "../space-store.helpers";

function createSyncQueueServiceMock() {
  const handlers: Array<() => void> = [];

  return {
    handlers,
    syncQueueService: {
      onReconnect: vi.fn((handler: () => void) => {
        handlers.push(handler);
      }),
    },
  };
}

function createSlugSupabaseMock(
  responses: Record<
    string,
    {
      data?: Record<string, unknown> | null;
      error?: unknown;
      thrown?: Error;
    }
  >,
) {
  const calls: Array<[string, string, ...unknown[]]> = [];

  return {
    calls,
    supabase: {
      from(table: string) {
        calls.push([table, "from"]);
        const response = responses[table] || {};

        const query = {
          eq(column: string, value: unknown) {
            calls.push([table, "eq", column, value]);
            return query;
          },
          or(condition: string) {
            calls.push([table, "or", condition]);
            return query;
          },
          async maybeSingle() {
            calls.push([table, "maybeSingle"]);

            if (response.thrown) {
              throw response.thrown;
            }

            return {
              data: response.data ?? null,
              error: response.error ?? null,
            };
          },
        };

        return {
          select(columns: string) {
            calls.push([table, "select", columns]);
            return query;
          },
        };
      },
    },
  };
}

describe("space-store.helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers exactly one reconnect handler", () => {
    const { syncQueueService, handlers } = createSyncQueueServiceMock();

    wireReconnectRefresh({
      syncQueueService,
      entityStores: new Map(),
      hasActiveData: () => false,
      refreshEntity: () => {},
    });

    expect(syncQueueService.onReconnect).toHaveBeenCalledTimes(1);
    expect(handlers).toHaveLength(1);
  });

  it("refreshes each active entity store in map iteration order on reconnect", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { syncQueueService, handlers } = createSyncQueueServiceMock();
    const refreshed: string[] = [];
    const entityStores = new Map([
      ["breed", { entityList: { value: [{ id: "b-1" }] } }],
      ["pet", { entityList: { value: [{ id: "p-1" }] } }],
    ]);

    wireReconnectRefresh({
      syncQueueService,
      entityStores,
      hasActiveData: (_entityType, store) => store.entityList.value.length > 0,
      refreshEntity: (entityType) => {
        refreshed.push(entityType);
      },
    });

    handlers[0]();

    expect(refreshed).toEqual(["breed", "pet"]);
    expect(logSpy).toHaveBeenNthCalledWith(
      1,
      "[SpaceStore] Reconnect refresh: breed",
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      "[SpaceStore] Reconnect refresh: pet",
    );
  });

  it("does not refresh stores when hasActiveData returns false", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { syncQueueService, handlers } = createSyncQueueServiceMock();
    const refreshEntity = vi.fn();

    wireReconnectRefresh({
      syncQueueService,
      entityStores: new Map([
        ["breed", { entityList: { value: [{ id: "b-1" }] } }],
        ["pet", { entityList: { value: [] } }],
      ]),
      hasActiveData: () => false,
      refreshEntity,
    });

    handlers[0]();

    expect(refreshEntity).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("does nothing when there are no entity stores", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const refreshEntity = vi.fn();
    const { syncQueueService, handlers } = createSyncQueueServiceMock();

    wireReconnectRefresh({
      syncQueueService,
      entityStores: new Map(),
      hasActiveData: () => true,
      refreshEntity,
    });

    handlers[0]();

    expect(refreshEntity).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("uses a custom log prefix when one is provided", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { syncQueueService, handlers } = createSyncQueueServiceMock();

    wireReconnectRefresh({
      syncQueueService,
      entityStores: new Map([
        ["pet", { entityList: { value: [{ id: "p-1" }] } }],
      ]),
      hasActiveData: () => true,
      refreshEntity: () => {},
      logPrefix: "[CustomStore]",
    });

    handlers[0]();

    expect(logSpy).toHaveBeenCalledWith(
      "[CustomStore] Reconnect refresh: pet",
    );
  });

  it("returns the cached slug hit without calling Supabase", async () => {
    const { supabase, calls } = createSlugSupabaseMock({});
    const loadCachedBySlug = vi.fn(async () => ({ id: "pet-1", slug: "alpha" }));
    const loadEntityById = vi.fn(async () => null);
    const cacheEntity = vi.fn(async () => {});

    await expect(
      fetchEntityBySlugFlow({
        supabase,
        entityType: "pet",
        slug: "alpha",
        loadCachedBySlug,
        loadEntityById,
        cacheEntity,
      }),
    ).resolves.toEqual({ id: "pet-1", slug: "alpha" });

    expect(loadCachedBySlug).toHaveBeenCalledWith("pet", "alpha");
    expect(loadEntityById).not.toHaveBeenCalled();
    expect(cacheEntity).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it("returns the routes-table entity and preserves null-to-undefined partition args", async () => {
    const { supabase, calls } = createSlugSupabaseMock({
      routes: {
        data: {
          entity_id: "pet-1",
          entity_partition_id: null,
          partition_field: null,
        },
      },
    });
    const loadEntityById = vi.fn(async () => ({ id: "pet-1", slug: "alpha" }));

    await expect(
      fetchEntityBySlugFlow({
        supabase,
        entityType: "pet",
        slug: "alpha",
        loadCachedBySlug: async () => null,
        loadEntityById,
        cacheEntity: async () => {},
      }),
    ).resolves.toEqual({ id: "pet-1", slug: "alpha" });

    expect(loadEntityById).toHaveBeenCalledWith(
      "pet",
      "pet-1",
      undefined,
      undefined,
    );
    expect(calls).toEqual([
      ["routes", "from"],
      ["routes", "select", "entity_id, entity_partition_id, partition_field"],
      ["routes", "eq", "slug", "alpha"],
      ["routes", "maybeSingle"],
    ]);
  });

  it("falls through to the slug query when a routes hit cannot load by id", async () => {
    const { supabase, calls } = createSlugSupabaseMock({
      routes: {
        data: {
          entity_id: "pet-1",
          entity_partition_id: "breed-1",
          partition_field: "breed_id",
        },
      },
      pet: {
        data: { id: "pet-1", slug: "alpha" },
      },
    });
    const loadEntityById = vi.fn(async () => null);
    const cacheEntity = vi.fn(async () => {});

    await expect(
      fetchEntityBySlugFlow({
        supabase,
        entityType: "pet",
        slug: "alpha",
        loadCachedBySlug: async () => null,
        loadEntityById,
        cacheEntity,
      }),
    ).resolves.toEqual({ id: "pet-1", slug: "alpha" });

    expect(loadEntityById).toHaveBeenCalledWith(
      "pet",
      "pet-1",
      "breed-1",
      "breed_id",
    );
    expect(cacheEntity).toHaveBeenCalledWith("pet", {
      id: "pet-1",
      slug: "alpha",
    });
    expect(calls).toEqual([
      ["routes", "from"],
      ["routes", "select", "entity_id, entity_partition_id, partition_field"],
      ["routes", "eq", "slug", "alpha"],
      ["routes", "maybeSingle"],
      ["pet", "from"],
      ["pet", "select", "*"],
      ["pet", "eq", "slug", "alpha"],
      ["pet", "or", "deleted.is.null,deleted.eq.false"],
      ["pet", "maybeSingle"],
    ]);
  });

  it("warns and falls through to the slug query when the routes lookup errors", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { supabase } = createSlugSupabaseMock({
      routes: {
        error: new Error("route lookup failed"),
      },
      pet: {
        data: { id: "pet-1", slug: "alpha" },
      },
    });
    const cacheEntity = vi.fn(async () => {});

    await expect(
      fetchEntityBySlugFlow({
        supabase,
        entityType: "pet",
        slug: "alpha",
        loadCachedBySlug: async () => null,
        loadEntityById: async () => null,
        cacheEntity,
      }),
    ).resolves.toEqual({ id: "pet-1", slug: "alpha" });

    expect(warnSpy).toHaveBeenCalledWith(
      "[SpaceStore] Route lookup failed, falling back to slug query:",
      expect.any(Error),
    );
    expect(cacheEntity).toHaveBeenCalledWith("pet", {
      id: "pet-1",
      slug: "alpha",
    });
  });

  it("falls through silently when the slug is absent from routes", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { supabase } = createSlugSupabaseMock({
      routes: {
        data: null,
      },
      pet: {
        data: { id: "pet-1", slug: "alpha" },
      },
    });

    await expect(
      fetchEntityBySlugFlow({
        supabase,
        entityType: "pet",
        slug: "alpha",
        loadCachedBySlug: async () => null,
        loadEntityById: async () => null,
        cacheEntity: async () => {},
      }),
    ).resolves.toEqual({ id: "pet-1", slug: "alpha" });

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("caches and returns the slug-direct fetch result", async () => {
    const { supabase } = createSlugSupabaseMock({
      routes: {
        data: null,
      },
      breed: {
        data: { id: "breed-1", slug: "akita" },
      },
    });
    const cacheEntity = vi.fn(async () => {});

    await expect(
      fetchEntityBySlugFlow({
        supabase,
        entityType: "breed",
        slug: "akita",
        loadCachedBySlug: async () => null,
        loadEntityById: async () => null,
        cacheEntity,
      }),
    ).resolves.toEqual({ id: "breed-1", slug: "akita" });

    expect(cacheEntity).toHaveBeenCalledWith("breed", {
      id: "breed-1",
      slug: "akita",
    });
  });

  it("returns null silently when the slug-direct query returns an error result", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { supabase } = createSlugSupabaseMock({
      routes: {
        data: null,
      },
      pet: {
        error: new Error("query error"),
      },
    });

    await expect(
      fetchEntityBySlugFlow({
        supabase,
        entityType: "pet",
        slug: "alpha",
        loadCachedBySlug: async () => null,
        loadEntityById: async () => null,
        cacheEntity: async () => {},
      }),
    ).resolves.toBeNull();

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("returns null silently when the slug-direct query returns no data", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { supabase } = createSlugSupabaseMock({
      routes: {
        data: null,
      },
      pet: {
        data: null,
      },
    });

    await expect(
      fetchEntityBySlugFlow({
        supabase,
        entityType: "pet",
        slug: "alpha",
        loadCachedBySlug: async () => null,
        loadEntityById: async () => null,
        cacheEntity: async () => {},
      }),
    ).resolves.toBeNull();

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("logs and returns null when the slug-direct step throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const thrown = new Error("supabase exploded");
    const { supabase } = createSlugSupabaseMock({
      routes: {
        data: null,
      },
      pet: {
        thrown,
      },
    });

    await expect(
      fetchEntityBySlugFlow({
        supabase,
        entityType: "pet",
        slug: "alpha",
        loadCachedBySlug: async () => null,
        loadEntityById: async () => null,
        cacheEntity: async () => {},
      }),
    ).resolves.toBeNull();

    expect(errorSpy).toHaveBeenCalledWith(
      "[SpaceStore] Error fetching by slug from Supabase:",
      thrown,
    );
  });

  it("returns null when all three slug resolution steps miss", async () => {
    const { supabase } = createSlugSupabaseMock({
      routes: {
        data: null,
      },
      pet: {
        data: null,
      },
    });
    const loadEntityById = vi.fn(async () => null);
    const cacheEntity = vi.fn(async () => {});

    await expect(
      fetchEntityBySlugFlow({
        supabase,
        entityType: "pet",
        slug: "missing",
        loadCachedBySlug: async () => null,
        loadEntityById,
        cacheEntity,
      }),
    ).resolves.toBeNull();

    expect(loadEntityById).not.toHaveBeenCalled();
    expect(cacheEntity).not.toHaveBeenCalled();
  });
});
