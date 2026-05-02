import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression: parallel `spaceStore.initialize()` callers must share a single
 * in-flight Promise. Symptom that motivated the guard: React StrictMode
 * double-mount in App.tsx fired `initSpaceStore()` twice in the same tick;
 * both reached `if (this.initialized.value) return` before either set it →
 * full pipeline (parseSpaceConfigurations → ensureCollection × 7 → IDB writes)
 * ran twice and competed for the IndexedDB write lock.
 */

describe("spaceStore.initialize concurrent dedup", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    // keep console.error visible to surface any silent init failures
    // vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("two parallel initialize() calls run the body once and resolve from one promise", async () => {
    let parseConfigCalls = 0;
    let resolveParse: () => void = () => {};
    const parseGate = new Promise<void>((resolve) => {
      resolveParse = resolve;
    });

    vi.doMock("../../supabase/client", () => ({
      supabase: { from: vi.fn() },
    }));

    vi.doMock("../space-config.helpers", () => ({
      parseSpaceConfigurations: () => {
        parseConfigCalls += 1;
        return {
          entitySchemas: new Map(),
          spaceConfigs: new Map(),
          entityTypes: [],
        };
      },
      getSupabaseSource: (entityType: string) => entityType,
      resolveSpaceConfig: () => undefined,
      buildEntityCollectionConfig: () => null,
    }));

    vi.doMock("../app-store.signal-store", () => ({
      appStore: {
        initialized: { value: true },
        appConfig: { value: { data: {} } },
        initialize: vi.fn(async () => {}),
      },
    }));

    vi.doMock("../user-store.signal-store", () => ({
      userStore: {
        initialized: { value: true },
        initialize: vi.fn(async () => {}),
      },
    }));

    vi.doMock("../../services/database.service", () => ({
      getDatabase: vi.fn(async () => {
        // Block both initialize() calls past parseSpaceConfigurations until
        // we let them through; this guarantees they overlap in time.
        await parseGate;
        return { collections: {} };
      }),
    }));

    vi.doMock("../../services/sync-queue.service", () => ({
      syncQueueService: {
        initialize: vi.fn(async () => {}),
        onReconnect: vi.fn(() => () => {}),
      },
    }));

    vi.doMock("../../utils/schema-version-check", () => ({
      checkSchemaVersion: vi.fn(async () => false),
    }));

    const { spaceStore } = await import("../space-store.signal-store");
    const store = spaceStore as unknown as {
      initialize: () => Promise<void>;
      initialized: { value: boolean };
      ensureCollection: (entityType: string) => Promise<void>;
    };

    store.ensureCollection = vi.fn(async () => {});

    // Fire two concurrent initialize() calls. Both must land before the
    // first one finishes parsing config; that's the race that used to leak
    // a duplicate run.
    const p1 = store.initialize();
    const p2 = store.initialize();

    // Let the gate open so both pending awaits in initialize() resume.
    resolveParse();

    await Promise.all([p1, p2]);

    expect(parseConfigCalls).toBe(1);
    expect(store.initialized.value).toBe(true);
  });

  it("calling initialize() again after success returns immediately without re-running", async () => {
    let parseConfigCalls = 0;

    vi.doMock("../../supabase/client", () => ({
      supabase: { from: vi.fn() },
    }));

    vi.doMock("../space-config.helpers", () => ({
      parseSpaceConfigurations: () => {
        parseConfigCalls += 1;
        return {
          entitySchemas: new Map(),
          spaceConfigs: new Map(),
          entityTypes: [],
        };
      },
      getSupabaseSource: (entityType: string) => entityType,
      resolveSpaceConfig: () => undefined,
      buildEntityCollectionConfig: () => null,
    }));

    vi.doMock("../app-store.signal-store", () => ({
      appStore: {
        initialized: { value: true },
        appConfig: { value: { data: {} } },
        initialize: vi.fn(async () => {}),
      },
    }));

    vi.doMock("../user-store.signal-store", () => ({
      userStore: {
        initialized: { value: true },
        initialize: vi.fn(async () => {}),
      },
    }));

    vi.doMock("../../config/database", () => ({
      getDatabase: vi.fn(async () => ({ collections: {} })),
    }));

    vi.doMock("../../services/sync-queue.service", () => ({
      syncQueueService: {
        initialize: vi.fn(async () => {}),
        onReconnect: vi.fn(() => () => {}),
      },
    }));

    vi.doMock("../../utils/schema-version-check", () => ({
      checkSchemaVersion: vi.fn(async () => false),
    }));

    const { spaceStore } = await import("../space-store.signal-store");
    const store = spaceStore as unknown as {
      initialize: () => Promise<void>;
      initialized: { value: boolean };
      ensureCollection: (entityType: string) => Promise<void>;
    };

    store.ensureCollection = vi.fn(async () => {});

    await store.initialize();
    await store.initialize();
    await store.initialize();

    expect(parseConfigCalls).toBe(1);
    expect(store.initialized.value).toBe(true);
  });
});
