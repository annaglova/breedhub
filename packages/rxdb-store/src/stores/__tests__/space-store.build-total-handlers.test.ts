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
  vi.doMock("../user-store.signal-store", () => ({
    userStore: {
      currentContactId: { value: "contact-1" },
    },
  }));
  vi.doMock("../../supabase/client", () => ({
    supabase: { from: fromMock, rpc: vi.fn() },
    checkSupabaseConnection: vi.fn(),
  }));

  const { spaceStore } = await import("../space-store.signal-store");
  const store = spaceStore as any;
  store.spaceConfigs.clear();
  store.entityStores.clear();
  store.lastAppliedFilters.clear();
  store.spaceTotalCounts.clear();

  return { store, fromMock };
}

function createCountQuery(count: number) {
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

describe("spaceStore buildTotalCountHandlers behavior", () => {
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

  it("writes totalSource counts to the per-space signal after applyFilters", async () => {
    const { store, fromMock } = await loadHarness();
    const entityStore = createEntityStore();
    fromMock.mockReturnValue(createCountQuery(48));
    vi.spyOn(store, "fetchIDsFromSupabase").mockResolvedValue([]);
    store.entityStores.set("pet", entityStore);
    store.spaceConfigs.set("my-pets", {
      id: "my-pets",
      entitySchemaName: "pet",
      totalSource: {
        table: "pet_in_contact_or_offspring",
        parentField: "contact_id",
      },
    });

    await store.applyFilters("pet", {}, {
      spaceId: "my-pets",
      activeScope: "owned",
    });

    expect(fromMock).toHaveBeenCalledWith("pet_in_contact_or_offspring");
    expect(
      store.getTotalCountSignalForSpace("my-pets", "owned")?.value,
    ).toBe(48);
    expect(entityStore.setTotalFromServer).not.toHaveBeenCalled();
    expect(entityStore.totalFromServer.value).toBeNull();
  });

  it("uses entityStore.totalFromServer when a space has no totalSource", async () => {
    const { store, fromMock } = await loadHarness();
    const entityStore = createEntityStore();
    fromMock.mockReturnValue(createCountQuery(123));
    vi.spyOn(store, "fetchIDsFromSupabase").mockResolvedValue([]);
    store.entityStores.set("pet", entityStore);
    store.spaceConfigs.set("public-pets", {
      id: "public-pets",
      entitySchemaName: "pet",
    });

    await store.applyFilters("pet", {}, { spaceId: "public-pets" });

    expect(store.getTotalCountSignalForSpace("public-pets")).toBeNull();
    expect(entityStore.setTotalFromServer).toHaveBeenCalledWith(123);
    expect(entityStore.totalFromServer.value).toBe(123);
  });

  it("keeps quick-filter scope totals isolated per signal", async () => {
    const { store, fromMock } = await loadHarness();
    const entityStore = createEntityStore();
    fromMock
      .mockReturnValueOnce(createCountQuery(12))
      .mockReturnValueOnce(createCountQuery(36));
    vi.spyOn(store, "fetchIDsFromSupabase").mockResolvedValue([]);
    store.entityStores.set("pet", entityStore);
    store.spaceConfigs.set("my-pets", {
      id: "my-pets",
      entitySchemaName: "pet",
      quickFilters: {
        component: "PetOwnerBreederFilter",
        parentIdSource: "currentContactId",
        modes: {
          owned: {
            slug: "owned",
            table: "pet_in_contact",
            parentField: "contact_id",
            entityIdField: "pet_id",
          },
          bred: {
            slug: "bred",
            table: "pet_offspring_breeder",
            parentField: "contact_id",
            entityIdField: "pet_id",
          },
        },
      },
    });

    await store.applyFilters("pet", {}, {
      spaceId: "my-pets",
      activeScope: "owned",
    });
    await store.applyFilters("pet", {}, {
      spaceId: "my-pets",
      activeScope: "bred",
    });

    expect(store.getTotalCountSignalForSpace("my-pets", "owned")?.value).toBe(
      12,
    );
    expect(store.getTotalCountSignalForSpace("my-pets", "bred")?.value).toBe(
      36,
    );
    expect(entityStore.setTotalFromServer).not.toHaveBeenCalled();
  });
});
