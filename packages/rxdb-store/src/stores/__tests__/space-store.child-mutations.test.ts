import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const syncQueueMock = vi.hoisted(() => ({
  processNow: vi.fn(),
  waitForCommit: vi.fn(),
}));

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

async function loadHarness() {
  vi.resetModules();
  vi.doMock("../app-store.signal-store", () => ({
    appStore: {
      initialized: { value: true },
      appConfig: { value: { data: {} } },
    },
  }));
  vi.doMock("../../services/sync-queue.service", () => ({
    syncQueueService: syncQueueMock,
  }));
  vi.doMock("../../supabase/client", () => ({
    supabase: {},
    checkSupabaseConnection: vi.fn(),
  }));

  const { spaceStore } = await import("../space-store.signal-store");
  const store = spaceStore as any;
  store.forceRefreshChildRecords = vi.fn(async () => {});
  return { store };
}

describe("spaceStore child mutation commit fence", () => {
  beforeEach(() => {
    syncQueueMock.processNow.mockReset();
    syncQueueMock.processNow.mockResolvedValue(undefined);
    syncQueueMock.waitForCommit.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("runs forceRefresh only after the specific child record commit is acknowledged", async () => {
    const commit = createDeferred<boolean>();
    syncQueueMock.waitForCommit.mockReturnValue(commit.promise);
    const { store } = await loadHarness();

    store.scheduleChildMutationRefreshFenced(
      "record-1",
      "pet",
      "pet_measurement",
      "pet-1",
    );
    await flushMicrotasks();

    expect(syncQueueMock.processNow).toHaveBeenCalledTimes(1);
    expect(syncQueueMock.waitForCommit).toHaveBeenCalledWith("record-1");
    expect(store.forceRefreshChildRecords).not.toHaveBeenCalled();

    commit.resolve(true);
    await flushMicrotasks();

    expect(store.forceRefreshChildRecords).toHaveBeenCalledWith(
      "pet",
      "pet_measurement",
      "pet-1",
    );
  });

  it("skips forceRefresh when the commit fence times out", async () => {
    syncQueueMock.waitForCommit.mockResolvedValue(false);
    const { store } = await loadHarness();

    store.scheduleChildMutationRefreshFenced(
      "record-1",
      "pet",
      "pet_measurement",
      "pet-1",
    );
    await flushMicrotasks();

    expect(store.forceRefreshChildRecords).not.toHaveBeenCalled();
  });

  it("lets parallel child updates on different parents both refresh after their own commit", async () => {
    const commits = new Map([
      ["record-1", createDeferred<boolean>()],
      ["record-2", createDeferred<boolean>()],
    ]);
    syncQueueMock.waitForCommit.mockImplementation((recordId: string) =>
      commits.get(recordId)!.promise,
    );
    const { store } = await loadHarness();

    store.scheduleChildMutationRefreshFenced(
      "record-1",
      "pet",
      "pet_measurement",
      "pet-1",
    );
    store.scheduleChildMutationRefreshFenced(
      "record-2",
      "pet",
      "pet_measurement",
      "pet-2",
    );
    await flushMicrotasks();

    expect(store.forceRefreshChildRecords).not.toHaveBeenCalled();

    commits.get("record-2")!.resolve(true);
    await flushMicrotasks();

    expect(store.forceRefreshChildRecords).toHaveBeenCalledTimes(1);
    expect(store.forceRefreshChildRecords).toHaveBeenCalledWith(
      "pet",
      "pet_measurement",
      "pet-2",
    );

    commits.get("record-1")!.resolve(true);
    await flushMicrotasks();

    expect(store.forceRefreshChildRecords).toHaveBeenCalledTimes(2);
    expect(store.forceRefreshChildRecords).toHaveBeenCalledWith(
      "pet",
      "pet_measurement",
      "pet-1",
    );
  });
});
