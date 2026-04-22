import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  replicateRxCollectionMock: vi.fn(),
  findDocumentByPrimaryKeyMock: vi.fn(),
  selectQueues: new Map<string, any[]>(),
  upsertQueues: new Map<string, any[]>(),
  queryLog: [] as any[],
  upsertLog: [] as any[],
  channelHandlers: new Map<string, (payload: any) => Promise<void> | void>(),
  channelObjects: new Map<string, any>(),
  removeChannelMock: vi.fn(async () => {}),
}));

vi.mock("rxdb/plugins/replication", () => ({
  replicateRxCollection: mockState.replicateRxCollectionMock,
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

  function createQueryBuilder(table: string) {
    const queryState: Record<string, any> = {
      table,
      selectArgs: null,
      gtCalls: [],
      orderCalls: [],
      limitValue: null,
      orCalls: [],
    };

    const resolve = async () => {
      mockState.queryLog.push({
        table: queryState.table,
        selectArgs: queryState.selectArgs,
        gtCalls: [...queryState.gtCalls],
        orderCalls: [...queryState.orderCalls],
        limitValue: queryState.limitValue,
        orCalls: [...queryState.orCalls],
      });

      const resultType = queryState.selectArgs?.options?.head ? "count" : "data";
      return nextQueuedResult(
        mockState.selectQueues,
        `${table}:${resultType}`,
        resultType === "count"
          ? { count: null, error: null }
          : { data: [], error: null },
      );
    };

    const builder: any = {
      select(columns: string, options?: Record<string, any>) {
        queryState.selectArgs = { columns, options };

        if (options?.head) {
          return resolve();
        }

        return builder;
      },
      gt(field: string, value: any) {
        queryState.gtCalls.push({ field, value });
        return builder;
      },
      order(field: string, options?: Record<string, any>) {
        queryState.orderCalls.push({ field, options });
        return builder;
      },
      limit(value: number) {
        queryState.limitValue = value;
        return builder;
      },
      or(value: string) {
        queryState.orCalls.push(value);
        return builder;
      },
      then(onFulfilled: any, onRejected: any) {
        return resolve().then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  const supabase = {
    from(table: string) {
      const builder = createQueryBuilder(table);
      return {
        ...builder,
        upsert: vi.fn(async (payload: any, options?: Record<string, any>) => {
          mockState.upsertLog.push({ table, payload, options });
          return nextQueuedResult(
            mockState.upsertQueues,
            table,
            { error: null },
          );
        }),
      };
    },
    channel(name: string) {
      const channel = {
        name,
        on: vi.fn(
          (
            _event: string,
            _filter: Record<string, any>,
            callback: (payload: any) => Promise<void> | void,
          ) => {
            mockState.channelHandlers.set(name, callback);
            return channel;
          },
        ),
        subscribe: vi.fn(() => {
          mockState.channelObjects.set(name, channel);
          return channel;
        }),
      };

      return channel;
    },
    removeChannel: mockState.removeChannelMock,
  };

  return { supabase };
});

vi.mock("../../utils/rxdb-document.helpers", async () => {
  const actual =
    await vi.importActual<typeof import("../../utils/rxdb-document.helpers")>(
      "../../utils/rxdb-document.helpers",
    );

  return {
    ...actual,
    findDocumentByPrimaryKey: mockState.findDocumentByPrimaryKeyMock,
  };
});

import { EntityReplicationService } from "../entity-replication.service";

interface LocalStorageMock {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
}

function createLocalStorageMock(initialValues: Record<string, string> = {}) {
  const storage = new Map(Object.entries(initialValues));

  const localStorageMock: LocalStorageMock = {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
  };

  return { localStorageMock, storage };
}

function queueSelectResult(
  table: string,
  result: Record<string, any>,
  type: "data" | "count" = "data",
) {
  const key = `${table}:${type}`;
  const queue = mockState.selectQueues.get(key) ?? [];
  queue.push(result);
  mockState.selectQueues.set(key, queue);
}

function createCollection(options?: {
  schema?: Record<string, any>;
  latestDoc?: Record<string, any> | null;
  bulkUpsertImpl?: (docs: any[]) => Promise<void>;
}) {
  const schema = options?.schema ?? {
    properties: {
      id: { type: "string" },
      name: { type: ["string", "null"] },
      updated_at: { type: "string" },
      created_at: { type: "string" },
      _deleted: { type: "boolean" },
    },
  };

  return {
    schema: { jsonSchema: schema },
    bulkUpsert: vi.fn(async (docs: any[]) => {
      if (options?.bulkUpsertImpl) {
        await options.bulkUpsertImpl(docs);
      }
    }),
    insert: vi.fn(async (doc: any) => doc),
    findOne: vi.fn((_query: any) => ({
      exec: vi.fn(async () => options?.latestDoc ?? null),
    })),
  };
}

function createDb(entityType: string, collection: any) {
  return {
    [entityType]: collection,
  } as any;
}

describe("entity-replication.service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));
    vi.clearAllMocks();
    mockState.selectQueues.clear();
    mockState.upsertQueues.clear();
    mockState.queryLog.length = 0;
    mockState.upsertLog.length = 0;
    mockState.channelHandlers.clear();
    mockState.channelObjects.clear();

    mockState.replicateRxCollectionMock.mockImplementation(async (config: any) => {
      const state = {
        collection: config.collection,
        cancel: vi.fn(async () => {}),
        error$: {
          subscribe: vi.fn(() => ({
            unsubscribe: vi.fn(),
          })),
        },
      };
      return state;
    });

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: createLocalStorageMock().localStorageMock,
    });

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, "localStorage");
    vi.restoreAllMocks();
  });

  it("returns false when setupReplication is asked to wire a missing collection", async () => {
    const service = new EntityReplicationService();

    const result = await service.setupReplication({} as any, "pet");

    expect(result).toBe(false);
    expect(mockState.replicateRxCollectionMock).not.toHaveBeenCalled();
  });

  it("sets up replication once, exposes the stored state, and skips duplicate setup calls", async () => {
    const service = new EntityReplicationService();
    const collection = createCollection();
    const db = createDb("pet", collection);

    const firstResult = await service.setupReplication(db, "pet");
    const secondResult = await service.setupReplication(db, "pet");

    expect(firstResult).toBe(true);
    expect(secondResult).toBe(true);
    expect(mockState.replicateRxCollectionMock).toHaveBeenCalledTimes(1);
    expect(service.isReplicationActive("pet")).toBe(true);
    expect(service.getReplicationState("pet")).toBeTruthy();
    expect(mockState.channelObjects.get("pet-changes")).toBeTruthy();
  });

  it("pulls fresh documents on first sync, fetches totalCount, caches it, and notifies subscribers", async () => {
    const service = new EntityReplicationService();
    const collection = createCollection();
    const db = createDb("pet", collection);
    const callback = vi.fn();
    const { localStorageMock, storage } = createLocalStorageMock();

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: localStorageMock,
    });

    service.onTotalCountUpdate("pet", callback);
    queueSelectResult("pet", {
      data: [
        {
          id: "pet-1",
          name: "Alpha",
          created_at: "2026-04-20T10:00:00.000Z",
          updated_at: "2026-04-21T10:00:00.000Z",
          deleted: false,
        },
      ],
      error: null,
    });
    queueSelectResult("pet", { count: 42, error: null }, "count");

    await service.setupReplication(db, "pet", {
      batchSize: 10,
      enableRealtime: false,
    });

    const config = mockState.replicateRxCollectionMock.mock.calls[0][0];
    const result = await config.pull.handler(null, 10);

    expect(result.documents).toEqual([
      expect.objectContaining({
        id: "pet-1",
        name: "Alpha",
        _deleted: false,
        cachedAt: Date.now(),
      }),
    ]);
    expect(result.checkpoint).toEqual(
      expect.objectContaining({
        updated_at: "2026-04-21T10:00:00.000Z",
        pulled: true,
        totalCount: 42,
      }),
    );
    expect(callback).toHaveBeenCalledWith(42);
    expect(service.getTotalCount("pet")).toBe(42);
    expect(mockState.queryLog[0].selectArgs?.columns).toBe(
      "id, name, updated_at, created_at, deleted",
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "totalCount_pet",
      JSON.stringify({
        value: 42,
        timestamp: Date.now(),
      }),
    );
    expect(storage.get("totalCount_pet")).toBe(
      JSON.stringify({
        value: 42,
        timestamp: Date.now(),
      }),
    );
  });

  it("skips a throttled pull when the last successful pull was under five seconds ago", async () => {
    const service = new EntityReplicationService();
    const collection = createCollection();

    await service.setupReplication(createDb("pet", collection), "pet", {
      enableRealtime: false,
    });

    const config = mockState.replicateRxCollectionMock.mock.calls[0][0];
    const checkpoint = {
      updated_at: "2026-04-21T10:00:00.000Z",
      pulled: true,
      lastPullAt: "2026-04-21T11:59:58.000Z",
    };

    const result = await config.pull.handler(checkpoint, 20);

    expect(result).toEqual({
      documents: [],
      checkpoint,
    });
    expect(mockState.queryLog).toHaveLength(0);
  });

  it("syncs realtime UPDATE, INSERT, and DELETE events into the local RxDB collection", async () => {
    const service = new EntityReplicationService();
    const collection = createCollection();
    const existingDoc = {
      updated_at: "2026-04-21T09:00:00.000Z",
      patch: vi.fn(async () => {}),
    };
    const deletedDoc = {
      patch: vi.fn(async () => {}),
    };

    mockState.findDocumentByPrimaryKeyMock
      .mockResolvedValueOnce(existingDoc)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(deletedDoc);

    await service.setupReplication(createDb("pet", collection), "pet");

    const handler = mockState.channelHandlers.get("pet-changes");
    expect(handler).toBeTruthy();

    await handler?.({
      eventType: "UPDATE",
      new: {
        id: "pet-1",
        name: "Updated",
        created_at: "2026-04-20T10:00:00.000Z",
        updated_at: "2026-04-21T10:00:00.000Z",
        deleted: false,
      },
    });
    await handler?.({
      eventType: "INSERT",
      new: {
        id: "pet-2",
        name: "Inserted",
        created_at: "2026-04-20T11:00:00.000Z",
        updated_at: "2026-04-21T11:00:00.000Z",
        deleted: false,
      },
    });
    await handler?.({
      eventType: "DELETE",
      old: { id: "pet-3" },
    });

    expect(existingDoc.patch).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "pet-1",
        name: "Updated",
        _deleted: false,
      }),
    );
    expect(collection.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "pet-2",
        name: "Inserted",
        _deleted: false,
      }),
    );
    expect(deletedDoc.patch).toHaveBeenCalledWith({
      _deleted: true,
      updated_at: "2026-04-21T12:00:00.000Z",
    });
  });

  it("cancels replication and removes the realtime channel when stopReplication is called", async () => {
    const service = new EntityReplicationService();
    const collection = createCollection();

    await service.setupReplication(createDb("pet", collection), "pet");

    const replicationState = service.getReplicationState("pet") as any;
    const channel = mockState.channelObjects.get("pet-changes");

    await service.stopReplication("pet");

    expect(replicationState.cancel).toHaveBeenCalledTimes(1);
    expect(mockState.removeChannelMock).toHaveBeenCalledWith(channel);
    expect(service.isReplicationActive("pet")).toBe(false);
    expect(service.getReplicationState("pet")).toBeUndefined();
  });

  it("stops all active replications", async () => {
    const service = new EntityReplicationService();

    await service.setupReplication(
      createDb("pet", createCollection()),
      "pet",
      { enableRealtime: false },
    );
    await service.setupReplication(
      createDb("breed", createCollection()),
      "breed",
      { enableRealtime: false },
    );

    const petState = service.getReplicationState("pet") as any;
    const breedState = service.getReplicationState("breed") as any;

    await service.stopAll();

    expect(petState.cancel).toHaveBeenCalledTimes(1);
    expect(breedState.cancel).toHaveBeenCalledTimes(1);
    expect(service.isReplicationActive("pet")).toBe(false);
    expect(service.isReplicationActive("breed")).toBe(false);
  });

  it("forceFullSync bulk-upserts every fetched batch until Supabase is exhausted", async () => {
    const service = new EntityReplicationService();
    const collection = createCollection();
    const db = createDb("pet", collection);
    const firstBatch = Array.from({ length: 1000 }, (_, index) => ({
      id: `pet-${index}`,
      name: `Pet ${index}`,
      created_at: "2026-04-20T10:00:00.000Z",
      updated_at: `2026-04-21T10:${String(index % 60).padStart(2, "0")}:00.000Z`,
      deleted: false,
    }));
    const secondBatch = [
      {
        id: "pet-1000",
        name: "Pet 1000",
        created_at: "2026-04-20T10:00:00.000Z",
        updated_at: "2026-04-21T11:40:00.000Z",
        deleted: false,
      },
      {
        id: "pet-1001",
        name: "Pet 1001",
        created_at: "2026-04-20T10:00:00.000Z",
        updated_at: "2026-04-21T11:41:00.000Z",
        deleted: false,
      },
    ];

    queueSelectResult("pet", { data: firstBatch, error: null });
    queueSelectResult("pet", { data: secondBatch, error: null });

    const result = await service.forceFullSync(db, "pet");

    expect(result).toBe(true);
    expect(collection.bulkUpsert).toHaveBeenCalledTimes(2);
    expect(collection.bulkUpsert).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        expect.objectContaining({ id: "pet-0", _deleted: false }),
      ]),
    );
    expect(mockState.queryLog[0].selectArgs?.columns).toBe(
      "id, name, updated_at, created_at, deleted",
    );
    expect(mockState.queryLog[1].gtCalls).toEqual([
      { field: "updated_at", value: firstBatch[firstBatch.length - 1].updated_at },
    ]);
  });

  it("prefers in-memory totalCount, reads fresh JSON cache, and ignores expired TTL entries", () => {
    const service = new EntityReplicationService();
    const now = Date.now();
    const { localStorageMock, storage } = createLocalStorageMock({
      totalCount_pet: JSON.stringify({
        value: 13,
        timestamp: now,
      }),
      totalCount_breed: JSON.stringify({
        value: 99,
        timestamp: now - 15 * 24 * 60 * 60 * 1000,
      }),
    });

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: localStorageMock,
    });

    (service as any).entityMetadata.set("kennel", {
      total: 7,
      lastSync: "2026-04-21T12:00:00.000Z",
    });

    expect(service.getTotalCount("kennel")).toBe(7);
    expect(service.getTotalCount("pet")).toBe(13);
    expect(service.getTotalCount("breed")).toBe(0);
    expect(storage.get("totalCount_pet")).toBe(
      JSON.stringify({
        value: 13,
        timestamp: now,
      }),
    );
  });

  it("migrates a legacy plain-number-string cache into the new TTL JSON format", () => {
    const service = new EntityReplicationService();
    const { localStorageMock, storage } = createLocalStorageMock({
      totalCount_pet: "42",
      totalCount_breed: "not-a-number",
    });

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: localStorageMock,
    });

    expect(service.getTotalCount("pet")).toBe(42);

    const migrated = storage.get("totalCount_pet");
    expect(migrated).toBeDefined();
    const parsed = JSON.parse(migrated!);
    expect(parsed.value).toBe(42);
    expect(typeof parsed.timestamp).toBe("number");

    expect(service.getTotalCount("breed")).toBe(0);
    expect(storage.get("totalCount_breed")).toBe("not-a-number");
  });

  it("removes a totalCount subscriber when the unsubscribe function is called", async () => {
    const service = new EntityReplicationService();
    const callback = vi.fn();
    const unsubscribe = service.onTotalCountUpdate("pet", callback);

    unsubscribe();

    queueSelectResult("pet", {
      data: [
        {
          id: "pet-1",
          name: "Alpha",
          created_at: "2026-04-20T10:00:00.000Z",
          updated_at: "2026-04-21T10:00:00.000Z",
          deleted: false,
        },
      ],
      error: null,
    });
    queueSelectResult("pet", { count: 12, error: null }, "count");

    await service.setupReplication(createDb("pet", createCollection()), "pet", {
      enableRealtime: false,
    });

    const config = mockState.replicateRxCollectionMock.mock.calls[0][0];
    await config.pull.handler(null, 20);

    expect(callback).not.toHaveBeenCalled();
  });

  it("manualPull fetches the next batch after the latest local document and persists the checkpoint", async () => {
    const service = new EntityReplicationService();
    const { localStorageMock, storage } = createLocalStorageMock();
    const collection = createCollection({
      latestDoc: {
        id: "pet-0",
        updated_at: "2026-04-21T09:00:00.000Z",
      },
    });

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: localStorageMock,
    });

    (service as any).replicationStates.set("pet", { collection });
    queueSelectResult("pet", {
      data: [
        {
          id: "pet-1",
          name: "Alpha",
          created_at: "2026-04-20T10:00:00.000Z",
          updated_at: "2026-04-21T10:00:00.000Z",
          deleted: false,
        },
        {
          id: "pet-2",
          name: "Beta",
          created_at: "2026-04-20T10:00:00.000Z",
          updated_at: "2026-04-21T11:00:00.000Z",
          deleted: false,
        },
      ],
      error: null,
    });

    const inserted = await service.manualPull("pet", 5);

    expect(inserted).toBe(2);
    expect(mockState.queryLog[0].selectArgs?.columns).toBe(
      "id, name, updated_at, created_at, deleted",
    );
    expect(mockState.queryLog[0].gtCalls).toEqual([
      { field: "updated_at", value: "2026-04-21T09:00:00.000Z" },
    ]);
    expect(mockState.queryLog[0].limitValue).toBe(5);
    expect(collection.bulkUpsert).toHaveBeenCalledWith([
      expect.objectContaining({ id: "pet-1", _deleted: false }),
      expect.objectContaining({ id: "pet-2", _deleted: false }),
    ]);
    expect(storage.get("checkpoint_pet")).toBe(
      JSON.stringify({
        updated_at: "2026-04-21T11:00:00.000Z",
        pulled: true,
        lastPullAt: "2026-04-21T12:00:00.000Z",
      }),
    );
  });

  it("manualPull returns 0 when no replication exists or when bulkUpsert fails", async () => {
    const service = new EntityReplicationService();
    const missingResult = await service.manualPull("pet", 5);

    const failingCollection = createCollection({
      latestDoc: null,
      bulkUpsertImpl: async () => {
        throw new Error("rxdb write failed");
      },
    });

    (service as any).replicationStates.set("breed", { collection: failingCollection });
    queueSelectResult("breed", {
      data: [
        {
          id: "breed-1",
          name: "Breed 1",
          created_at: "2026-04-20T10:00:00.000Z",
          updated_at: "2026-04-21T10:00:00.000Z",
          deleted: false,
        },
      ],
      error: null,
    });

    const failingResult = await service.manualPull("breed", 3);

    expect(missingResult).toBe(0);
    expect(failingResult).toBe(0);
  });
});
