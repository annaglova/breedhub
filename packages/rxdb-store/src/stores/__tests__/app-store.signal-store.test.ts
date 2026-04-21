import { afterEach, describe, expect, it, vi } from "vitest";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

async function loadAppStoreHarness(options?: {
  cachedConfig?: Record<string, any> | null;
  version?: number;
  latestConfig?: Record<string, any> | null;
  fetchLatestResult?: boolean;
  fetchLatestError?: Error;
  deferredFetchLatest?: boolean;
  dictionaryError?: Error;
  routeError?: Error;
}) {
  vi.resetModules();

  let currentConfig = options?.cachedConfig ?? null;
  const deferredFetchLatest = options?.deferredFetchLatest
    ? createDeferred<boolean>()
    : null;

  const loadFromCache = vi.fn(() => options?.cachedConfig ?? null);
  const getVersion = vi.fn(() => options?.version ?? 0);
  const getConfig = vi.fn(() => currentConfig);
  const fetchLatest = vi.fn(() => {
    if (deferredFetchLatest) {
      return deferredFetchLatest.promise.then((result) => {
        if (result && options?.latestConfig !== undefined) {
          currentConfig = options.latestConfig;
        }
        return result;
      });
    }

    if (options?.fetchLatestError) {
      return Promise.reject(options.fetchLatestError);
    }

    const result = options?.fetchLatestResult ?? false;
    if (result && options?.latestConfig !== undefined) {
      currentConfig = options.latestConfig;
    }
    return Promise.resolve(result);
  });

  const dictionaryInitialize = vi.fn(async () => {
    if (options?.dictionaryError) {
      throw options.dictionaryError;
    }
  });

  const routeInitialize = vi.fn(async () => {
    if (options?.routeError) {
      throw options.routeError;
    }
  });

  vi.doMock("../app-config-reader", () => ({
    appConfigReader: {
      loadFromCache,
      getVersion,
      getConfig,
      fetchLatest,
    },
  }));

  vi.doMock("../dictionary-store.signal-store", () => ({
    dictionaryStore: {
      initialize: dictionaryInitialize,
    },
  }));

  vi.doMock("../route-store.signal-store", () => ({
    routeStore: {
      initialize: routeInitialize,
    },
  }));

  const module = await import("../app-store.signal-store");

  return {
    appStore: module.appStore,
    loadFromCache,
    getVersion,
    getConfig,
    fetchLatest,
    dictionaryInitialize,
    routeInitialize,
    resolveFetchLatest(result: boolean) {
      if (!deferredFetchLatest) {
        throw new Error("No deferred fetchLatest configured");
      }

      if (result && options?.latestConfig !== undefined) {
        currentConfig = options.latestConfig;
      }
      deferredFetchLatest.resolve(result);
    },
    rejectFetchLatest(error: Error) {
      if (!deferredFetchLatest) {
        throw new Error("No deferred fetchLatest configured");
      }

      deferredFetchLatest.reject(error);
    },
  };
}

describe("app-store.signal-store", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("boots from cache immediately, exposes derived workspaces, and applies a later background refresh", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const cachedConfig = {
      workspaces: {
        breeding: {
          id: "workspace-1",
          icon: "dog",
          path: "/breeds",
          label: "Breeding",
        },
      },
    };
    const latestConfig = {
      workspaces: {
        pets: {
          id: "workspace-2",
          icon: "paw",
          path: "/pets",
          label: "Pets",
          order: 2,
        },
      },
    };
    const harness = await loadAppStoreHarness({
      cachedConfig,
      latestConfig,
      version: 7,
      deferredFetchLatest: true,
    });

    expect(harness.appStore.appConfig.value).toEqual({
      id: "cached",
      data: cachedConfig,
    });
    expect(harness.appStore.initialized.value).toBe(true);
    expect(harness.appStore.loading.value).toBe(false);
    expect(harness.appStore.error.value).toBeNull();
    expect(harness.appStore.isDataLoaded.value).toBe(true);
    expect(harness.appStore.workspaces.value).toEqual([
      {
        id: "workspace-1",
        icon: "dog",
        path: "/breeds",
        label: "Breeding",
        configKey: "breeding",
      },
    ]);
    expect(logSpy).toHaveBeenCalledWith(
      "[AppStore] Loaded config from cache (v7)",
    );
    expect(harness.dictionaryInitialize).toHaveBeenCalledTimes(1);
    expect(harness.routeInitialize).toHaveBeenCalledTimes(1);

    harness.resolveFetchLatest(true);
    await vi.waitFor(() => {
      expect(harness.appStore.appConfig.value).toEqual({
        id: "latest",
        data: latestConfig,
      });
    });
    expect(logSpy).toHaveBeenCalledWith("[AppStore] Config updated in background");
  });

  it("swallows background refresh failures and keeps the cached config active", async () => {
    const cachedConfig = {
      workspaces: {
        breeding: {
          id: "workspace-1",
          icon: "dog",
          path: "/breeds",
          label: "Breeding",
        },
      },
    };
    const harness = await loadAppStoreHarness({
      cachedConfig,
      deferredFetchLatest: true,
    });

    expect(harness.appStore.appConfig.value).toEqual({
      id: "cached",
      data: cachedConfig,
    });

    harness.rejectFetchLatest(new Error("offline"));
    await flushMicrotasks();

    expect(harness.appStore.appConfig.value).toEqual({
      id: "cached",
      data: cachedConfig,
    });
    expect(harness.appStore.error.value).toBeNull();
  });

  it("loads from the server on first run when no cache exists", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const latestConfig = {
      workspaces: {
        pets: {
          id: "workspace-2",
          icon: "paw",
          path: "/pets",
          label: "Pets",
        },
      },
    };
    const harness = await loadAppStoreHarness({
      cachedConfig: null,
      latestConfig,
      fetchLatestResult: true,
    });

    await flushMicrotasks();

    expect(harness.fetchLatest).toHaveBeenCalledTimes(1);
    expect(harness.appStore.appConfig.value).toEqual({
      id: "latest",
      data: latestConfig,
    });
    expect(harness.appStore.initialized.value).toBe(true);
    expect(harness.appStore.loading.value).toBe(false);
    expect(harness.appStore.error.value).toBeNull();
    expect(logSpy).toHaveBeenCalledWith(
      "[AppStore] Config loaded from server (first load)",
    );
    expect(harness.dictionaryInitialize).toHaveBeenCalledTimes(1);
    expect(harness.routeInitialize).toHaveBeenCalledTimes(1);
  });

  it("records an explicit error when app config is unavailable after first-load fetch", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const harness = await loadAppStoreHarness({
      cachedConfig: null,
      fetchLatestResult: false,
    });

    await flushMicrotasks();

    expect(harness.appStore.appConfig.value).toBeNull();
    expect(harness.appStore.initialized.value).toBe(false);
    expect(harness.appStore.loading.value).toBe(false);
    expect(harness.appStore.error.value).toEqual(
      new Error("App config not available"),
    );
    expect(errorSpy).toHaveBeenCalledWith("[AppStore] App config not available");
    expect(harness.dictionaryInitialize).not.toHaveBeenCalled();
    expect(harness.routeInitialize).not.toHaveBeenCalled();
  });

  it("logs unexpected initialization failures and leaves the store uninitialized", async () => {
    const initError = new Error("config fetch exploded");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const harness = await loadAppStoreHarness({
      cachedConfig: null,
      fetchLatestError: initError,
    });

    await flushMicrotasks();

    expect(harness.appStore.initialized.value).toBe(false);
    expect(harness.appStore.loading.value).toBe(false);
    expect(harness.appStore.error.value).toBe(initError);
    expect(errorSpy).toHaveBeenCalledWith(
      "[AppStore] Failed to initialize:",
      initError,
    );
  });

  it("does not re-run initialize once the store is ready, but reloadConfig forces another pass", async () => {
    const firstConfig = {
      workspaces: {
        breeding: {
          id: "workspace-1",
          icon: "dog",
          path: "/breeds",
          label: "Breeding",
        },
      },
    };
    const secondConfig = {
      workspaces: {
        pets: {
          id: "workspace-2",
          icon: "paw",
          path: "/pets",
          label: "Pets",
        },
      },
    };
    const harness = await loadAppStoreHarness({
      cachedConfig: firstConfig,
      fetchLatestResult: false,
    });

    expect(harness.loadFromCache).toHaveBeenCalledTimes(1);
    await harness.appStore.initialize();
    expect(harness.loadFromCache).toHaveBeenCalledTimes(1);

    harness.loadFromCache.mockReturnValueOnce(secondConfig);

    await harness.appStore.reloadConfig();

    expect(harness.loadFromCache).toHaveBeenCalledTimes(2);
    expect(harness.appStore.appConfig.value).toEqual({
      id: "cached",
      data: secondConfig,
    });
    expect(harness.appStore.initialized.value).toBe(true);
  });

  it("logs child store init failures without failing the app bootstrap", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const harness = await loadAppStoreHarness({
      cachedConfig: {
        workspaces: {
          breeding: {
            id: "workspace-1",
            icon: "dog",
            path: "/breeds",
            label: "Breeding",
          },
        },
      },
      dictionaryError: new Error("dictionary down"),
      routeError: new Error("route down"),
    });

    await flushMicrotasks();

    expect(harness.appStore.initialized.value).toBe(true);
    expect(harness.appStore.error.value).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      "[AppStore] DictionaryStore initialization failed:",
      expect.any(Error),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "[AppStore] RouteStore initialization failed:",
      expect.any(Error),
    );
  });
});
