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

function createCountQuery() {
  const query: any = {
    count: 12,
    error: null,
  };
  query.select = vi.fn(() => query);
  query.or = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  return query;
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
});
