import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createReadFrom() {
  return {
    table: "contact_pet",
    parentField: "contact_id",
    parentId: "contact-1",
    entityIdField: "pet_id",
  };
}

async function loadHarness() {
  vi.resetModules();
  const applyFiltersViaReadFrom = vi.fn(async () => ({
    records: [],
    total: 0,
    hasMore: false,
    nextCursor: null,
  }));

  vi.doMock("../app-store.signal-store", () => ({
    appStore: {
      initialized: { value: true },
      appConfig: { value: { data: {} } },
    },
  }));
  vi.doMock("../../supabase/client", () => ({
    supabase: { from: vi.fn(), rpc: vi.fn() },
    checkSupabaseConnection: vi.fn(),
  }));
  vi.doMock("../space-readfrom.helpers", () => ({
    applyFiltersViaReadFrom,
  }));

  const { spaceStore } = await import("../space-store.signal-store");
  const store = spaceStore as any;
  store.spaceConfigs.clear();
  store.entityStores.clear();
  store.lastAppliedFilters.clear();

  return { store, applyFiltersViaReadFrom };
}

function seedPetSpaces(store: any) {
  store.spaceConfigs.set("config_space_111", {
    id: "config_space_111",
    entitySchemaName: "pet",
    label: "Public Pets",
    defaultFilters: { visibility: "public" },
    filter_fields: {
      public_only: {
        fieldType: "boolean",
        operator: "eq",
      },
    },
  });
  store.spaceConfigs.set("space_222", {
    id: "space_222",
    entitySchemaName: "pet",
    label: "My Pets",
    defaultFilters: { owner_scope: "owned" },
    filter_fields: {
      owner_id: {
        fieldType: "uuid",
        operator: "eq",
      },
    },
  });
}

describe("spaceStore.applyFilters spaceId config resolution", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("uses the config resolved by options.spaceId when spaces share an entity type", async () => {
    const { store, applyFiltersViaReadFrom } = await loadHarness();
    seedPetSpaces(store);

    await store.applyFilters(
      "pet",
      { name: "Rex" },
      {
        spaceId: "space_222",
        readFrom: createReadFrom(),
      },
    );

    expect(applyFiltersViaReadFrom).toHaveBeenCalledTimes(1);
    expect(applyFiltersViaReadFrom).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "pet",
        filters: {
          owner_scope: "owned",
          name: "Rex",
        },
        fieldConfigs: expect.objectContaining({
          owner_id: {
            fieldType: "uuid",
            operator: "eq",
          },
          owner_scope: {
            fieldType: "uuid",
            operator: "eq",
          },
        }),
      }),
    );
    expect(applyFiltersViaReadFrom.mock.calls[0][0].fieldConfigs).not.toHaveProperty(
      "public_only",
    );
    expect(console.warn).not.toHaveBeenCalledWith(
      expect.stringContaining("applyFilters called without spaceId"),
    );
  });

  it("falls back to the first matching entity space and warns when spaceId is omitted", async () => {
    const { store, applyFiltersViaReadFrom } = await loadHarness();
    seedPetSpaces(store);

    await store.applyFilters(
      "pet",
      { name: "Rex" },
      {
        readFrom: createReadFrom(),
      },
    );

    expect(applyFiltersViaReadFrom).toHaveBeenCalledTimes(1);
    expect(applyFiltersViaReadFrom).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "pet",
        filters: {
          visibility: "public",
          name: "Rex",
        },
        fieldConfigs: expect.objectContaining({
          public_only: {
            fieldType: "boolean",
            operator: "eq",
          },
          visibility: {
            fieldType: "uuid",
            operator: "eq",
          },
        }),
      }),
    );
    expect(applyFiltersViaReadFrom.mock.calls[0][0].fieldConfigs).not.toHaveProperty(
      "owner_id",
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'applyFilters called without spaceId for "pet"',
      ),
    );
  });
});
