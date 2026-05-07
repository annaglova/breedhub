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
  const { EntityStore } = await import("../base/entity-store");
  return { store: spaceStore as any, fromMock, EntityStore };
}

describe("spaceStore.applyFilters required-filter gate", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    // applyFilters early-returns into offlineFlow when navigator.onLine is false;
    // force online so the gate path and the fetcher path are reached as expected.
    vi.stubGlobal("navigator", { onLine: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("skips Supabase + sets requiredFiltersMissing when a required filter is empty", async () => {
    const { store, fromMock, EntityStore } = await loadHarness();
    const entityStore = new EntityStore<{ id: string }>();
    entityStore.loading.value = true;
    store.entityStores.set("pet", entityStore);
    store.spaceConfigs.set("pet", {
      id: "pet",
      filter_fields: {
        breed_id: { required: true, fieldType: "uuid", operator: "eq" },
      },
    });

    const result = await store.applyFilters("pet", {});

    expect(result).toEqual({
      records: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
    });
    expect(entityStore.requiredFiltersMissing.value).toEqual(["breed_id"]);
    expect(entityStore.loading.value).toBe(false);
    expect(entityStore.totalFromServer.value).toBe(0);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("clears stale requiredFiltersMissing when filters become valid", async () => {
    const { store, fromMock, EntityStore } = await loadHarness();
    const entityStore = new EntityStore<{ id: string }>();
    entityStore.requiredFiltersMissing.value = ["breed_id"];
    store.entityStores.set("pet", entityStore);
    store.spaceConfigs.set("pet", {
      id: "pet",
      filter_fields: {
        breed_id: { required: true, fieldType: "uuid", operator: "eq" },
      },
    });

    // Spy on the private fetcher so we don't need to mock the full Supabase chain.
    const fetchSpy = vi
      .spyOn(store, "fetchIDsFromSupabase")
      .mockResolvedValue([]);

    await store.applyFilters("pet", { breed_id: "abc-123" });

    expect(entityStore.requiredFiltersMissing.value).toEqual([]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("does not gate when no required filters are declared in the space config", async () => {
    const { store, EntityStore } = await loadHarness();
    const entityStore = new EntityStore<{ id: string }>();
    store.entityStores.set("breed", entityStore);
    store.spaceConfigs.set("breed", {
      id: "breed",
      filter_fields: {
        pet_type_id: { fieldType: "uuid", operator: "eq" },
      },
    });

    const fetchSpy = vi
      .spyOn(store, "fetchIDsFromSupabase")
      .mockResolvedValue([]);

    await store.applyFilters("breed", {});

    expect(entityStore.requiredFiltersMissing.value).toEqual([]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
