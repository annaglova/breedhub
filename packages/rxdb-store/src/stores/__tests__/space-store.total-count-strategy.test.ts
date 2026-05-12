import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadHarness() {
  vi.resetModules();
  const fromMock = vi.fn();
  vi.doMock("../app-store.signal-store", () => ({
    appStore: {
      initialized: { value: true },
      appConfig: { value: { data: {} } },
    },
  }));
  vi.doMock("../../supabase/client", () => ({
    supabase: { from: fromMock },
    checkSupabaseConnection: vi.fn(),
  }));

  const { spaceStore } = await import("../space-store.signal-store");
  return { store: spaceStore as any, fromMock };
}

function createCountQuery(count = 12) {
  const query: any = {
    count,
    error: null,
  };
  query.select = vi.fn(() => query);
  query.or = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  return query;
}

function createEntityStore() {
  const entityStore: any = {
    totalFromServer: { value: null as number | null },
    requiredFiltersMissing: { value: [] as string[] },
    setTotalFromServer: vi.fn(),
  };
  entityStore.setTotalFromServer.mockImplementation((total: number) => {
    entityStore.totalFromServer.value = total;
  });
  return entityStore;
}

describe("spaceStore.applyFilters total-count strategy", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("uses planned total counts for public spaces by default", async () => {
    const { store, fromMock } = await loadHarness();
    const countQuery = createCountQuery();
    fromMock.mockReturnValue(countQuery);
    vi.spyOn(store, "fetchIDsFromSupabase").mockResolvedValue([]);
    store.spaceConfigs.set("breed", { id: "breed" });

    await store.applyFilters("breed", {});

    expect(fromMock).toHaveBeenCalledWith("breed");
    expect(countQuery.select).toHaveBeenCalledWith("*", {
      count: "planned",
      head: true,
    });
  });

  it("uses exact total counts for private spaces", async () => {
    const { store, fromMock } = await loadHarness();
    const countQuery = createCountQuery();
    fromMock.mockReturnValue(countQuery);
    vi.spyOn(store, "fetchIDsFromSupabase").mockResolvedValue([]);
    store.spaceConfigs.set("note", { id: "note", isPublic: false });

    await store.applyFilters("note", {});

    expect(fromMock).toHaveBeenCalledWith("note");
    expect(countQuery.select).toHaveBeenCalledWith("*", {
      count: "exact",
      head: true,
    });
  });

  it("uses planned total counts when isPublic is explicitly true", async () => {
    const { store, fromMock } = await loadHarness();
    const countQuery = createCountQuery();
    fromMock.mockReturnValue(countQuery);
    vi.spyOn(store, "fetchIDsFromSupabase").mockResolvedValue([]);
    store.spaceConfigs.set("breed", { id: "breed", isPublic: true });

    await store.applyFilters("breed", {});

    expect(fromMock).toHaveBeenCalledWith("breed");
    expect(countQuery.select).toHaveBeenCalledWith("*", {
      count: "planned",
      head: true,
    });
  });

  describe("refreshTotalFromServer", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("debounces refreshes for 200ms", async () => {
      const { store, fromMock } = await loadHarness();
      const entityStore = createEntityStore();
      fromMock.mockReturnValue(createCountQuery(12));
      store.entityStores.set("breed", entityStore);
      store.spaceConfigs.set("breed", { id: "breed" });

      store.refreshTotalFromServer("breed");
      store.refreshTotalFromServer("breed");

      await vi.advanceTimersByTimeAsync(199);
      expect(fromMock).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);

      expect(fromMock).toHaveBeenCalledTimes(1);
      expect(entityStore.totalFromServer.value).toBe(12);
    });

    it("reuses last-applied filters", async () => {
      const { store, fromMock } = await loadHarness();
      const entityStore = createEntityStore();
      const initialCountQuery = createCountQuery(21);
      const refreshCountQuery = createCountQuery(33);
      fromMock
        .mockReturnValueOnce(initialCountQuery)
        .mockReturnValueOnce(refreshCountQuery);
      vi.spyOn(store, "fetchIDsFromSupabase").mockResolvedValue([]);
      store.entityStores.set("pet", entityStore);
      store.spaceConfigs.set("pet", {
        id: "pet",
        defaultFilters: { status: "active" },
        totalFilterKey: "breed_id",
      });

      await store.applyFilters("pet", { breed_id: "breed-1" });
      store.refreshTotalFromServer("pet");
      await vi.advanceTimersByTimeAsync(200);

      expect(refreshCountQuery.eq).toHaveBeenCalledWith("status", "active");
      expect(refreshCountQuery.eq).toHaveBeenCalledWith(
        "breed_id",
        "breed-1",
      );
      expect(entityStore.totalFromServer.value).toBe(33);
    });

    it("uses exact counts for private spaces and planned counts for public spaces", async () => {
      const { store, fromMock } = await loadHarness();
      const publicCountQuery = createCountQuery(100);
      const privateCountQuery = createCountQuery(5);
      fromMock
        .mockReturnValueOnce(publicCountQuery)
        .mockReturnValueOnce(privateCountQuery);
      store.entityStores.set("breed", createEntityStore());
      store.entityStores.set("note", createEntityStore());
      store.spaceConfigs.set("breed", { id: "breed", isPublic: true });
      store.spaceConfigs.set("note", { id: "note", isPublic: false });

      store.refreshTotalFromServer("breed");
      store.refreshTotalFromServer("note");
      await vi.advanceTimersByTimeAsync(200);

      expect(publicCountQuery.select).toHaveBeenCalledWith("*", {
        count: "planned",
        head: true,
      });
      expect(privateCountQuery.select).toHaveBeenCalledWith("*", {
        count: "exact",
        head: true,
      });
    });

    it("writes entityStore.totalFromServer and localStorage from the fresh count", async () => {
      const { store, fromMock } = await loadHarness();
      const entityStore = createEntityStore();
      fromMock.mockReturnValue(createCountQuery(44));
      store.entityStores.set("breed", entityStore);
      store.spaceConfigs.set("breed", { id: "breed" });

      store.refreshTotalFromServer("breed");
      await vi.advanceTimersByTimeAsync(200);

      expect(entityStore.setTotalFromServer).toHaveBeenCalledWith(44);
      expect(entityStore.totalFromServer.value).toBe(44);
      expect(localStorage.getItem).not.toHaveBeenCalled();
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "totalCount_breed",
        JSON.stringify({
          value: 44,
          timestamp: new Date("2026-04-21T12:00:00.200Z").getTime(),
        }),
      );
    });

    it("is a no-op if no spaceConfig or entityStore exists", async () => {
      const { store, fromMock } = await loadHarness();
      store.entityStores.set("missing-config", createEntityStore());
      store.spaceConfigs.set("missing-store", { id: "missing-store" });

      store.refreshTotalFromServer("missing-config");
      store.refreshTotalFromServer("missing-store");
      await vi.advanceTimersByTimeAsync(200);

      expect(fromMock).not.toHaveBeenCalled();
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });
});
