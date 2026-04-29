import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  upsertQueues: new Map<string, any[]>(),
  updateQueues: new Map<string, any[]>(),
  deleteQueues: new Map<string, any[]>(),
  opLog: [] as Array<Record<string, any>>,
  runPostSaveHooksMock: vi.fn(),
  runChildPostPushHooksMock: vi.fn(),
}));

vi.mock("../../supabase/client", () => {
  function nextQueuedResult(
    queueMap: Map<string, any[]>,
    key: string,
    fallback: any,
  ) {
    const queue = queueMap.get(key);
    if (!queue || queue.length === 0) {
      return fallback;
    }

    return queue.shift();
  }

  const supabase = {
    from(table: string) {
      return {
        upsert: vi.fn(async (payload: any, options?: Record<string, any>) => {
          mockState.opLog.push({ op: "upsert", table, payload, options });
          return nextQueuedResult(mockState.upsertQueues, table, { error: null });
        }),
        update: vi.fn((payload: any) => ({
          eq: vi.fn(async (field: string, value: any) => {
            mockState.opLog.push({
              op: "update",
              table,
              payload,
              field,
              value,
            });
            return nextQueuedResult(
              mockState.updateQueues,
              table,
              { error: null },
            );
          }),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(async (field: string, value: any) => {
            mockState.opLog.push({
              op: "delete",
              table,
              field,
              value,
            });
            return nextQueuedResult(
              mockState.deleteQueues,
              table,
              { error: null },
            );
          }),
        })),
      };
    },
  };

  return { supabase };
});

vi.mock("../../utils/entity-hooks", () => ({
  runPostSaveHooks: mockState.runPostSaveHooksMock,
  runChildPostPushHooks: mockState.runChildPostPushHooksMock,
}));

function flushMicrotasks() {
  return Promise.resolve().then(() => Promise.resolve());
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function queueOperationResult(
  queueMap: Map<string, any[]>,
  table: string,
  result: Record<string, any>,
) {
  const queue = queueMap.get(table) ?? [];
  queue.push(result);
  queueMap.set(table, queue);
}

function matchesSelector(
  doc: Record<string, any>,
  selector: Record<string, any> | undefined,
) {
  if (!selector) {
    return true;
  }

  return Object.entries(selector).every(([key, value]) => {
    if (value && typeof value === "object" && "$ne" in value) {
      return doc[key] !== value.$ne;
    }

    return doc[key] === value;
  });
}

function createQueueCollection(initialDocs: Array<Record<string, any>> = []) {
  const docs: any[] = [];

  function createDoc(data: Record<string, any>) {
    const doc: any = {
      ...data,
      remove: vi.fn(async () => {
        const index = docs.indexOf(doc);
        if (index >= 0) {
          docs.splice(index, 1);
        }
      }),
      patch: vi.fn(async (patch: Record<string, any>) => {
        Object.assign(doc, patch);
      }),
    };

    return doc;
  }

  initialDocs.forEach((doc) => docs.push(createDoc(doc)));

  return {
    docs,
    findOne: vi.fn((options: { selector: Record<string, any> }) => ({
      exec: vi.fn(async () =>
        docs.find((doc) => matchesSelector(doc, options.selector)) ?? null,
      ),
    })),
    insert: vi.fn(async (data: Record<string, any>) => {
      const doc = createDoc(data);
      docs.push(doc);
      return doc;
    }),
    find: vi.fn((options: {
      selector?: Record<string, any>;
      sort?: Array<Record<string, "asc" | "desc">>;
      limit?: number;
    }) => ({
      exec: vi.fn(async () => {
        let result = docs.filter((doc) => matchesSelector(doc, options.selector));

        if (options.sort?.length) {
          const [sortEntry] = options.sort;
          const [field, direction] = Object.entries(sortEntry)[0];
          result = [...result].sort((a, b) => {
            if (a[field] === b[field]) return 0;
            const modifier = direction === "asc" ? 1 : -1;
            return a[field] > b[field] ? modifier : -modifier;
          });
        }

        if (typeof options.limit === "number") {
          result = result.slice(0, options.limit);
        }

        return result;
      }),
    })),
    bulkRemove: vi.fn(async (ids: string[]) => {
      for (const id of ids) {
        const index = docs.findIndex((doc) => doc.id === id);
        if (index >= 0) {
          docs.splice(index, 1);
        }
      }
    }),
    count: vi.fn((options: { selector?: Record<string, any> }) => ({
      exec: vi.fn(async () =>
        docs.filter((doc) => matchesSelector(doc, options.selector)).length,
      ),
    })),
  };
}

async function loadSyncQueueHarness(options?: {
  entityDocs?: Array<Record<string, any>>;
  childDocs?: Array<Record<string, any>>;
  missingEntityQueue?: boolean;
  missingChildQueue?: boolean;
  online?: boolean;
}) {
  vi.resetModules();

  const entityQueue = options?.missingEntityQueue
    ? null
    : createQueueCollection(options?.entityDocs);
  const childQueue = options?.missingChildQueue
    ? null
    : createQueueCollection(options?.childDocs);

  const eventHandlers = new Map<string, () => void>();
  const addEventListener = vi.fn((event: string, handler: () => void) => {
    eventHandlers.set(event, handler);
  });

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener,
    },
  });

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      onLine: options?.online ?? true,
    },
  });

  const module = await import("../sync-queue.service");

  return {
    syncQueueService: module.syncQueueService,
    db: {
      collections: {
        ...(entityQueue ? { entity_sync_queue: entityQueue } : {}),
        ...(childQueue ? { child_sync_queue: childQueue } : {}),
      },
    } as any,
    entityQueue,
    childQueue,
    eventHandlers,
    addEventListener,
  };
}

describe("sync-queue.service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));
    vi.clearAllMocks();
    mockState.upsertQueues.clear();
    mockState.updateQueues.clear();
    mockState.deleteQueues.clear();
    mockState.opLog.length = 0;
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "navigator");
    vi.restoreAllMocks();
  });

  it("initializes queue collections, computes pending and failed counts, and wires the online listener", async () => {
    const harness = await loadSyncQueueHarness({
      entityDocs: [
        {
          id: "entity-pending",
          entityType: "pet",
          entityId: "pet-1",
          operation: "upsert",
          payload: { id: "pet-1" },
          onConflict: "id",
          retries: 0,
          createdAt: 1,
        },
        {
          id: "entity-failed",
          entityType: "pet",
          entityId: "pet-2",
          operation: "upsert",
          payload: { id: "pet-2" },
          onConflict: "id",
          retries: 11,
          createdAt: 2,
          status: "failed",
        },
      ],
      childDocs: [
        {
          id: "child-pending",
          entityType: "pet",
          tableType: "title_in_pet",
          recordId: "child-1",
          operation: "upsert",
          payload: { id: "child-1" },
          onConflict: "id",
          retries: 0,
          createdAt: 3,
        },
      ],
    });

    await harness.syncQueueService.initialize(harness.db);
    await vi.waitFor(() => {
      expect(harness.syncQueueService.pendingCount.value).toBe(2);
      expect(harness.syncQueueService.failedCount.value).toBe(1);
    });
    expect(harness.addEventListener).toHaveBeenCalledWith(
      "online",
      expect.any(Function),
    );
    expect((harness.syncQueueService as any).initialized).toBe(true);
    expect((harness.syncQueueService as any).processingInterval).toBeTruthy();

    harness.syncQueueService.destroy();
  });

  it("logs and bails when the queue collections are missing from the database", async () => {
    const harness = await loadSyncQueueHarness({
      missingChildQueue: true,
    });

    await harness.syncQueueService.initialize(harness.db);

    expect(console.error).toHaveBeenCalledWith(
      "[SyncQueue] Queue collections not found in database",
    );
    expect((harness.syncQueueService as any).initialized).toBe(false);
    expect(harness.addEventListener).not.toHaveBeenCalled();
  });

  it("deduplicates entity queue items by entityId before inserting a fresh payload", async () => {
    const harness = await loadSyncQueueHarness({
      entityDocs: [
        {
          id: "old-item",
          entityType: "pet",
          entityId: "pet-1",
          operation: "upsert",
          payload: { id: "pet-1", name: "Old" },
          onConflict: "id",
          retries: 0,
          createdAt: 1,
        },
      ],
      childDocs: [],
    });

    await harness.syncQueueService.initialize(harness.db);
    const existing = harness.entityQueue!.docs[0];

    await harness.syncQueueService.enqueueEntity(
      "pet",
      "pet-1",
      "upsert",
      { id: "pet-1", name: "New" },
      "id",
    );
    await vi.waitFor(() => {
      expect(harness.syncQueueService.pendingCount.value).toBe(1);
    });

    expect(existing.remove).toHaveBeenCalledTimes(1);
    expect(harness.entityQueue!.docs).toHaveLength(1);
    expect(harness.entityQueue!.docs[0]).toEqual(
      expect.objectContaining({
        entityType: "pet",
        entityId: "pet-1",
        operation: "upsert",
        payload: { id: "pet-1", name: "New" },
        onConflict: "id",
      }),
    );
    harness.syncQueueService.destroy();
  });

  it("deduplicates child queue items by recordId before inserting a fresh payload", async () => {
    const harness = await loadSyncQueueHarness({
      entityDocs: [],
      childDocs: [
        {
          id: "old-child",
          entityType: "pet",
          tableType: "title_in_pet",
          recordId: "child-1",
          operation: "upsert",
          payload: { id: "child-1", title_id: "title-1" },
          onConflict: "id",
          retries: 0,
          createdAt: 1,
        },
      ],
    });

    await harness.syncQueueService.initialize(harness.db);
    const existing = harness.childQueue!.docs[0];

    await harness.syncQueueService.enqueueChild(
      "pet",
      "title_in_pet",
      "child-1",
      "upsert",
      { id: "child-1", title_id: "title-2" },
      "id",
    );
    await vi.waitFor(() => {
      expect(harness.syncQueueService.pendingCount.value).toBe(1);
    });

    expect(existing.remove).toHaveBeenCalledTimes(1);
    expect(harness.childQueue!.docs).toHaveLength(1);
    expect(harness.childQueue!.docs[0]).toEqual(
      expect.objectContaining({
        entityType: "pet",
        tableType: "title_in_pet",
        recordId: "child-1",
        payload: { id: "child-1", title_id: "title-2" },
      }),
    );
    harness.syncQueueService.destroy();
  });

  it("processes entity upserts and soft deletes in batches, removes synced items, and fires post-save hooks", async () => {
    const harness = await loadSyncQueueHarness({
      entityDocs: [
        {
          id: "upsert-1",
          entityType: "pet",
          entityId: "pet-1",
          operation: "upsert",
          payload: { id: "pet-1", name: "Alpha" },
          onConflict: "id",
          retries: 0,
          createdAt: 1,
        },
        {
          id: "upsert-2",
          entityType: "pet",
          entityId: "pet-2",
          operation: "upsert",
          payload: { id: "pet-2", name: "Beta" },
          onConflict: "id",
          retries: 0,
          createdAt: 2,
        },
        {
          id: "delete-1",
          entityType: "pet",
          entityId: "pet-3",
          operation: "delete",
          payload: { id: "pet-3", name: "Gamma" },
          onConflict: "id",
          retries: 0,
          createdAt: 3,
        },
      ],
      childDocs: [],
    });

    queueOperationResult(mockState.upsertQueues, "pet", { error: null });
    queueOperationResult(mockState.upsertQueues, "pet", { error: null });

    await harness.syncQueueService.initialize(harness.db);
    await harness.syncQueueService.processNow();
    await vi.waitFor(() => {
      expect(harness.syncQueueService.pendingCount.value).toBe(0);
    });

    expect(mockState.opLog).toEqual([
      {
        op: "upsert",
        table: "pet",
        payload: [
          { id: "pet-1", name: "Alpha" },
          { id: "pet-2", name: "Beta" },
        ],
        options: { onConflict: "id" },
      },
      {
        op: "upsert",
        table: "pet",
        payload: [{ id: "pet-3", name: "Gamma", deleted: true }],
        options: { onConflict: "id" },
      },
    ]);
    expect(harness.entityQueue!.bulkRemove).toHaveBeenNthCalledWith(1, [
      "upsert-1",
      "upsert-2",
    ]);
    expect(harness.entityQueue!.bulkRemove).toHaveBeenNthCalledWith(2, [
      "delete-1",
    ]);
    expect(mockState.runPostSaveHooksMock).toHaveBeenCalledTimes(2);
    expect(mockState.runPostSaveHooksMock).toHaveBeenCalledWith(
      "pet",
      "pet-1",
      { id: "pet-1", name: "Alpha" },
    );
    expect(mockState.runPostSaveHooksMock).toHaveBeenCalledWith(
      "pet",
      "pet-2",
      { id: "pet-2", name: "Beta" },
    );
    harness.syncQueueService.destroy();
  });

  it("increments entity retries and marks the item as failed once max retries are exceeded", async () => {
    const harness = await loadSyncQueueHarness({
      entityDocs: [
        {
          id: "failing-entity",
          entityType: "pet",
          entityId: "pet-1",
          operation: "upsert",
          payload: { id: "pet-1" },
          onConflict: "id",
          retries: 10,
          createdAt: 1,
        },
      ],
      childDocs: [],
    });

    queueOperationResult(mockState.upsertQueues, "pet", {
      error: { message: "supabase boom" },
    });

    await harness.syncQueueService.initialize(harness.db);
    const item = harness.entityQueue!.docs[0];
    await harness.syncQueueService.processNow();
    await vi.waitFor(() => {
      expect(harness.syncQueueService.pendingCount.value).toBe(0);
      expect(harness.syncQueueService.failedCount.value).toBe(1);
    });

    expect(item.patch).toHaveBeenCalledWith({
      retries: 11,
      status: "failed",
      error: "supabase boom",
    });
    expect(console.warn).toHaveBeenCalledWith(
      "[SyncQueue] Max retries exceeded, marking as failed: failing-entity",
    );

    harness.syncQueueService.destroy();
  });

  it("processes child upserts, removes synced rows, and fires child post-push hooks", async () => {
    const harness = await loadSyncQueueHarness({
      entityDocs: [],
      childDocs: [
        {
          id: "child-upsert-1",
          entityType: "pet",
          tableType: "title_in_pet",
          recordId: "child-1",
          operation: "upsert",
          payload: { id: "child-1", title_id: "title-1" },
          onConflict: "id",
          retries: 0,
          createdAt: 1,
        },
        {
          id: "child-upsert-2",
          entityType: "pet",
          tableType: "title_in_pet",
          recordId: "child-2",
          operation: "upsert",
          payload: { id: "child-2", title_id: "title-2" },
          onConflict: "id",
          retries: 0,
          createdAt: 2,
        },
      ],
    });

    queueOperationResult(mockState.upsertQueues, "title_in_pet", { error: null });

    await harness.syncQueueService.initialize(harness.db);
    await harness.syncQueueService.processNow();
    await vi.waitFor(() => {
      expect(harness.syncQueueService.pendingCount.value).toBe(0);
    });

    expect(mockState.opLog).toEqual([
      {
        op: "upsert",
        table: "title_in_pet",
        payload: [
          { id: "child-1", title_id: "title-1" },
          { id: "child-2", title_id: "title-2" },
        ],
        options: { onConflict: "id" },
      },
    ]);
    expect(harness.childQueue!.bulkRemove).toHaveBeenCalledWith([
      "child-upsert-1",
      "child-upsert-2",
    ]);
    expect(mockState.runChildPostPushHooksMock).toHaveBeenCalledTimes(2);
    expect(mockState.runChildPostPushHooksMock).toHaveBeenCalledWith(
      "title_in_pet",
      { id: "child-1", title_id: "title-1" },
    );
    expect(mockState.runChildPostPushHooksMock).toHaveBeenCalledWith(
      "title_in_pet",
      { id: "child-2", title_id: "title-2" },
    );

    harness.syncQueueService.destroy();
  });

  it("waitForCommit resolves only after the child queue item is acknowledged by Supabase", async () => {
    const harness = await loadSyncQueueHarness({
      entityDocs: [],
      childDocs: [
        {
          id: "child-upsert-1",
          entityType: "pet",
          tableType: "title_in_pet",
          recordId: "child-1",
          operation: "upsert",
          payload: { id: "child-1", title_id: "title-1" },
          onConflict: "id",
          retries: 0,
          createdAt: 1,
        },
      ],
    });
    const supabaseAck = createDeferred<{ error: null }>();
    queueOperationResult(mockState.upsertQueues, "title_in_pet", supabaseAck.promise);

    await harness.syncQueueService.initialize(harness.db);
    const wait = harness.syncQueueService.waitForCommit("child-1");
    let settled = false;
    wait.then(() => {
      settled = true;
    });

    const processing = harness.syncQueueService.processNow();
    await flushMicrotasks();

    expect(settled).toBe(false);
    expect(harness.childQueue!.docs).toHaveLength(1);

    supabaseAck.resolve({ error: null });
    await processing;
    await expect(wait).resolves.toBe(true);
    expect(harness.childQueue!.docs).toHaveLength(0);

    harness.syncQueueService.destroy();
  });

  it("waitForCommit returns false on timeout and cleans up the waiter", async () => {
    const harness = await loadSyncQueueHarness({
      entityDocs: [],
      childDocs: [
        {
          id: "child-upsert-1",
          entityType: "pet",
          tableType: "title_in_pet",
          recordId: "child-1",
          operation: "upsert",
          payload: { id: "child-1" },
          onConflict: "id",
          retries: 0,
          createdAt: 1,
        },
      ],
    });

    await harness.syncQueueService.initialize(harness.db);
    const wait = harness.syncQueueService.waitForCommit("child-1", 50);
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(50);

    await expect(wait).resolves.toBe(false);
    expect((harness.syncQueueService as any).commitWaiters.has("child-1")).toBe(false);

    harness.syncQueueService.destroy();
  });

  it("waitForCommit resolves immediately when the record has no pending queue item", async () => {
    const harness = await loadSyncQueueHarness({
      entityDocs: [],
      childDocs: [],
    });

    await harness.syncQueueService.initialize(harness.db);

    await expect(harness.syncQueueService.waitForCommit("child-1")).resolves.toBe(true);

    harness.syncQueueService.destroy();
  });

  it("silently drops child upserts with schema cache or not found errors", async () => {
    const harness = await loadSyncQueueHarness({
      entityDocs: [],
      childDocs: [
        {
          id: "child-upsert-1",
          entityType: "pet",
          tableType: "old_view",
          recordId: "child-1",
          operation: "upsert",
          payload: { id: "child-1" },
          onConflict: "id",
          retries: 0,
          createdAt: 1,
        },
      ],
    });

    queueOperationResult(mockState.upsertQueues, "old_view", {
      error: { message: "schema cache mismatch" },
    });

    await harness.syncQueueService.initialize(harness.db);
    await harness.syncQueueService.processNow();
    await vi.waitFor(() => {
      expect(harness.syncQueueService.pendingCount.value).toBe(0);
      expect(harness.syncQueueService.failedCount.value).toBe(0);
    });

    expect(harness.childQueue!.bulkRemove).toHaveBeenCalledWith([
      "child-upsert-1",
    ]);
    expect(mockState.runChildPostPushHooksMock).not.toHaveBeenCalled();
    harness.syncQueueService.destroy();
  });

  it("falls back to hard delete for child rows when the table has no deleted column", async () => {
    const harness = await loadSyncQueueHarness({
      entityDocs: [],
      childDocs: [
        {
          id: "child-delete-1",
          entityType: "pet",
          tableType: "legacy_child",
          recordId: "child-1",
          operation: "delete",
          payload: { id: "child-1" },
          onConflict: "id",
          retries: 0,
          createdAt: 1,
        },
      ],
    });

    queueOperationResult(mockState.updateQueues, "legacy_child", {
      error: { message: "column deleted does not exist" },
    });
    queueOperationResult(mockState.deleteQueues, "legacy_child", { error: null });

    await harness.syncQueueService.initialize(harness.db);
    const item = harness.childQueue!.docs[0];
    await harness.syncQueueService.processNow();
    await flushMicrotasks();

    expect(mockState.opLog).toEqual([
      {
        op: "update",
        table: "legacy_child",
        payload: {
          deleted: true,
          updated_at: "2026-04-21T12:00:00.000Z",
        },
        field: "id",
        value: "child-1",
      },
      {
        op: "delete",
        table: "legacy_child",
        field: "id",
        value: "child-1",
      },
    ]);
    expect(item.remove).toHaveBeenCalledTimes(1);
    expect(mockState.runChildPostPushHooksMock).toHaveBeenCalledWith(
      "legacy_child",
      { id: "child-1" },
    );

    harness.syncQueueService.destroy();
  });

  it("processes the queues and fires the reconnect callback when the browser comes back online", async () => {
    const harness = await loadSyncQueueHarness({
      entityDocs: [
        {
          id: "entity-upsert",
          entityType: "pet",
          entityId: "pet-1",
          operation: "upsert",
          payload: { id: "pet-1", name: "Alpha" },
          onConflict: "id",
          retries: 0,
          createdAt: 1,
        },
      ],
      childDocs: [],
    });
    const reconnectCallback = vi.fn();

    queueOperationResult(mockState.upsertQueues, "pet", { error: null });

    await harness.syncQueueService.initialize(harness.db);
    harness.syncQueueService.onReconnect(reconnectCallback);

    const onlineHandler = harness.eventHandlers.get("online");
    expect(onlineHandler).toBeTruthy();

    onlineHandler?.();
    await flushMicrotasks();

    expect(mockState.opLog).toEqual([
      {
        op: "upsert",
        table: "pet",
        payload: [{ id: "pet-1", name: "Alpha" }],
        options: { onConflict: "id" },
      },
    ]);
    expect(reconnectCallback).toHaveBeenCalledTimes(1);

    harness.syncQueueService.destroy();
  });

  it("opens the circuit breaker after five consecutive failures, pauses processing, then resets after the cooldown", async () => {
    const harness = await loadSyncQueueHarness({
      entityDocs: [
        {
          id: "entity-upsert",
          entityType: "pet",
          entityId: "pet-1",
          operation: "upsert",
          payload: { id: "pet-1", name: "Alpha" },
          onConflict: "id",
          retries: 0,
          createdAt: 1,
        },
      ],
      childDocs: [],
    });

    for (let i = 0; i < 6; i += 1) {
      queueOperationResult(mockState.upsertQueues, "pet", {
        error: { message: `boom-${i}` },
      });
    }

    await harness.syncQueueService.initialize(harness.db);

    await harness.syncQueueService.processNow();
    await harness.syncQueueService.processNow();
    await harness.syncQueueService.processNow();
    await harness.syncQueueService.processNow();
    await harness.syncQueueService.processNow();

    expect((harness.syncQueueService as any).circuitBreakerOpen).toBe(true);
    expect(mockState.opLog).toHaveLength(5);

    await harness.syncQueueService.processNow();
    expect(mockState.opLog).toHaveLength(5);

    await vi.advanceTimersByTimeAsync(60_000);
    expect((harness.syncQueueService as any).circuitBreakerOpen).toBe(false);

    await harness.syncQueueService.processNow();
    expect(mockState.opLog).toHaveLength(6);

    harness.syncQueueService.destroy();
  });

  it("destroy stops background processing so the interval no longer drains the queue", async () => {
    const harness = await loadSyncQueueHarness({
      entityDocs: [
        {
          id: "entity-upsert",
          entityType: "pet",
          entityId: "pet-1",
          operation: "upsert",
          payload: { id: "pet-1", name: "Alpha" },
          onConflict: "id",
          retries: 0,
          createdAt: 1,
        },
      ],
      childDocs: [],
    });

    queueOperationResult(mockState.upsertQueues, "pet", { error: null });

    await harness.syncQueueService.initialize(harness.db);
    harness.syncQueueService.destroy();

    await vi.advanceTimersByTimeAsync(5_000);
    await flushMicrotasks();

    expect(mockState.opLog).toHaveLength(0);
    expect((harness.syncQueueService as any).processingInterval).toBeNull();
    expect((harness.syncQueueService as any).initialized).toBe(false);
  });
});
