import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface LocalStorageMock {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
}

function createLocalStorageMock(initialValues: Record<string, string> = {}) {
  const storage = new Map(Object.entries(initialValues));

  const localStorageMock: LocalStorageMock = {
    getItem: vi.fn((key: string) => storage.get(key) ?? null) as unknown as ReturnType<typeof vi.fn>,
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
    }) as unknown as ReturnType<typeof vi.fn>,
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }) as unknown as ReturnType<typeof vi.fn>,
  };

  return { localStorageMock, storage };
}

async function loadNavigationHistoryStore(
  initialValues: Record<string, string> = {},
) {
  vi.resetModules();

  const { localStorageMock, storage } = createLocalStorageMock(initialValues);

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: localStorageMock,
  });

  const module = await import("../navigation-history.store");

  return {
    navigationHistoryStore: module.navigationHistoryStore,
    localStorageMock,
    storage,
  };
}

describe("navigation-history.store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, "localStorage");
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("loads persisted per-type history, reformats titles, and rewrites the normalized payload", async () => {
    const persisted = JSON.stringify({
      breed: [
        {
          path: "/affenpinscher",
          title: "affenpinscher-show",
          entityType: "breed",
          timestamp: 1,
        },
      ],
    });

    const { navigationHistoryStore, localStorageMock, storage } =
      await loadNavigationHistoryStore({
        navigation_history: persisted,
      });

    expect(navigationHistoryStore.getHistoryForType("breed")).toEqual([
      {
        path: "/affenpinscher",
        title: "AFFENPINSCHER SHOW",
        entityType: "breed",
        timestamp: 1,
      },
    ]);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "navigation_history",
      JSON.stringify({
        breed: [
          {
            path: "/affenpinscher",
            title: "AFFENPINSCHER SHOW",
            entityType: "breed",
            timestamp: 1,
          },
        ],
      }),
    );
    expect(storage.get("navigation_history")).toBe(
      JSON.stringify({
        breed: [
          {
            path: "/affenpinscher",
            title: "AFFENPINSCHER SHOW",
            entityType: "breed",
            timestamp: 1,
          },
        ],
      }),
    );
  });

  it("clears the legacy array storage format on load", async () => {
    const { navigationHistoryStore, localStorageMock, storage } =
      await loadNavigationHistoryStore({
        navigation_history: JSON.stringify([
          {
            path: "/legacy",
            title: "Legacy",
            entityType: "breed",
            timestamp: 1,
          },
        ]),
      });

    expect(navigationHistoryStore.getHistoryForType("breed")).toEqual([]);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "navigation_history",
      JSON.stringify({}),
    );
    expect(storage.get("navigation_history")).toBe(JSON.stringify({}));
  });

  it("fails open when stored JSON is invalid", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { navigationHistoryStore } = await loadNavigationHistoryStore({
      navigation_history: "{bad json",
    });

    expect(navigationHistoryStore.getHistoryForType("breed")).toEqual([]);
    expect(navigationHistoryStore.hasHistoryForType("breed")).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      "[NavigationHistoryStore] Failed to load from storage:",
      expect.any(Error),
    );
  });

  it("adds per-type entries with uppercase formatting and saves them", async () => {
    const { navigationHistoryStore, localStorageMock } =
      await loadNavigationHistoryStore();

    navigationHistoryStore.addEntry("/affenpinscher", "affenpinscher-show", "breed");
    navigationHistoryStore.addEntry("/alpha-pet", "alpha-pet", "pet");

    expect(navigationHistoryStore.getHistoryForType("breed")).toEqual([
      {
        path: "/affenpinscher",
        title: "AFFENPINSCHER SHOW",
        entityType: "breed",
        timestamp: Date.parse("2026-04-21T12:00:00.000Z"),
      },
    ]);
    expect(navigationHistoryStore.getHistoryForType("pet")).toEqual([
      {
        path: "/alpha-pet",
        title: "ALPHA PET",
        entityType: "pet",
        timestamp: Date.parse("2026-04-21T12:00:00.000Z"),
      },
    ]);
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);
    expect(navigationHistoryStore.hasHistoryForType("breed")).toBe(true);
    expect(navigationHistoryStore.hasHistoryForType("pet")).toBe(true);
  });

  it("deduplicates the most recent path and does not save again for consecutive visits", async () => {
    const { navigationHistoryStore, localStorageMock } =
      await loadNavigationHistoryStore();

    navigationHistoryStore.addEntry("/affenpinscher", "Affenpinscher", "breed");
    navigationHistoryStore.addEntry("/affenpinscher", "Affenpinscher", "breed");

    expect(navigationHistoryStore.getHistoryForType("breed")).toHaveLength(1);
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
  });

  it("moves an older duplicate path to the front and keeps at most five entries", async () => {
    const { navigationHistoryStore } = await loadNavigationHistoryStore();

    navigationHistoryStore.addEntry("/one", "one", "breed");
    vi.advanceTimersByTime(1);
    navigationHistoryStore.addEntry("/two", "two", "breed");
    vi.advanceTimersByTime(1);
    navigationHistoryStore.addEntry("/three", "three", "breed");
    vi.advanceTimersByTime(1);
    navigationHistoryStore.addEntry("/four", "four", "breed");
    vi.advanceTimersByTime(1);
    navigationHistoryStore.addEntry("/five", "five", "breed");
    vi.advanceTimersByTime(1);
    navigationHistoryStore.addEntry("/three", "three", "breed");
    vi.advanceTimersByTime(1);
    navigationHistoryStore.addEntry("/six", "six", "breed");

    expect(
      navigationHistoryStore.getHistoryForType("breed").map((entry) => entry.path),
    ).toEqual(["/six", "/three", "/five", "/four", "/two"]);
  });

  it("filters the current path from getHistoryForType without mutating stored history", async () => {
    const { navigationHistoryStore } = await loadNavigationHistoryStore();

    navigationHistoryStore.addEntry("/affenpinscher", "Affenpinscher", "breed");
    vi.advanceTimersByTime(1);
    navigationHistoryStore.addEntry("/beagle", "Beagle", "breed");

    expect(
      navigationHistoryStore.getHistoryForType("breed", "/beagle").map((entry) => entry.path),
    ).toEqual(["/affenpinscher"]);
    expect(
      navigationHistoryStore.getHistoryForType("breed").map((entry) => entry.path),
    ).toEqual(["/beagle", "/affenpinscher"]);
  });

  it("clears only one entity type when clearHistoryForType is called", async () => {
    const { navigationHistoryStore, localStorageMock } =
      await loadNavigationHistoryStore();

    navigationHistoryStore.addEntry("/affenpinscher", "Affenpinscher", "breed");
    navigationHistoryStore.addEntry("/alpha-pet", "Alpha Pet", "pet");

    navigationHistoryStore.clearHistoryForType("breed");

    expect(navigationHistoryStore.getHistoryForType("breed")).toEqual([]);
    expect(navigationHistoryStore.getHistoryForType("pet")).toHaveLength(1);
    expect(localStorageMock.setItem).toHaveBeenLastCalledWith(
      "navigation_history",
      JSON.stringify({
        pet: [
          {
            path: "/alpha-pet",
            title: "ALPHA PET",
            entityType: "pet",
            timestamp: Date.parse("2026-04-21T12:00:00.000Z"),
          },
        ],
      }),
    );
  });

  it("clears all history across types", async () => {
    const { navigationHistoryStore, localStorageMock } =
      await loadNavigationHistoryStore();

    navigationHistoryStore.addEntry("/affenpinscher", "Affenpinscher", "breed");
    navigationHistoryStore.addEntry("/alpha-pet", "Alpha Pet", "pet");

    navigationHistoryStore.clearAllHistory();

    expect(navigationHistoryStore.getHistoryForType("breed")).toEqual([]);
    expect(navigationHistoryStore.getHistoryForType("pet")).toEqual([]);
    expect(localStorageMock.setItem).toHaveBeenLastCalledWith(
      "navigation_history",
      JSON.stringify({}),
    );
  });

  it("warns but keeps in-memory state when saving to storage fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { navigationHistoryStore, localStorageMock } =
      await loadNavigationHistoryStore();

    localStorageMock.setItem.mockImplementation(() => {
      throw new Error("disk full");
    });

    navigationHistoryStore.addEntry("/affenpinscher", "Affenpinscher", "breed");

    expect(navigationHistoryStore.getHistoryForType("breed")).toEqual([
      {
        path: "/affenpinscher",
        title: "AFFENPINSCHER",
        entityType: "breed",
        timestamp: Date.parse("2026-04-21T12:00:00.000Z"),
      },
    ]);
    expect(warnSpy).toHaveBeenCalledWith(
      "[NavigationHistoryStore] Failed to save to storage:",
      expect.any(Error),
    );
  });
});
