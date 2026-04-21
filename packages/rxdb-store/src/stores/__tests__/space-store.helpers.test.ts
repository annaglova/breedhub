import { afterEach, describe, expect, it, vi } from "vitest";
import { wireReconnectRefresh } from "../space-store.helpers";

function createSyncQueueServiceMock() {
  const handlers: Array<() => void> = [];

  return {
    handlers,
    syncQueueService: {
      onReconnect: vi.fn((handler: () => void) => {
        handlers.push(handler);
      }),
    },
  };
}

describe("space-store.helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers exactly one reconnect handler", () => {
    const { syncQueueService, handlers } = createSyncQueueServiceMock();

    wireReconnectRefresh({
      syncQueueService,
      entityStores: new Map(),
      hasActiveData: () => false,
      refreshEntity: () => {},
    });

    expect(syncQueueService.onReconnect).toHaveBeenCalledTimes(1);
    expect(handlers).toHaveLength(1);
  });

  it("refreshes each active entity store in map iteration order on reconnect", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { syncQueueService, handlers } = createSyncQueueServiceMock();
    const refreshed: string[] = [];
    const entityStores = new Map([
      ["breed", { entityList: { value: [{ id: "b-1" }] } }],
      ["pet", { entityList: { value: [{ id: "p-1" }] } }],
    ]);

    wireReconnectRefresh({
      syncQueueService,
      entityStores,
      hasActiveData: (_entityType, store) => store.entityList.value.length > 0,
      refreshEntity: (entityType) => {
        refreshed.push(entityType);
      },
    });

    handlers[0]();

    expect(refreshed).toEqual(["breed", "pet"]);
    expect(logSpy).toHaveBeenNthCalledWith(
      1,
      "[SpaceStore] Reconnect refresh: breed",
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      "[SpaceStore] Reconnect refresh: pet",
    );
  });

  it("does not refresh stores when hasActiveData returns false", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { syncQueueService, handlers } = createSyncQueueServiceMock();
    const refreshEntity = vi.fn();

    wireReconnectRefresh({
      syncQueueService,
      entityStores: new Map([
        ["breed", { entityList: { value: [{ id: "b-1" }] } }],
        ["pet", { entityList: { value: [] } }],
      ]),
      hasActiveData: () => false,
      refreshEntity,
    });

    handlers[0]();

    expect(refreshEntity).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("does nothing when there are no entity stores", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const refreshEntity = vi.fn();
    const { syncQueueService, handlers } = createSyncQueueServiceMock();

    wireReconnectRefresh({
      syncQueueService,
      entityStores: new Map(),
      hasActiveData: () => true,
      refreshEntity,
    });

    handlers[0]();

    expect(refreshEntity).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("uses a custom log prefix when one is provided", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { syncQueueService, handlers } = createSyncQueueServiceMock();

    wireReconnectRefresh({
      syncQueueService,
      entityStores: new Map([
        ["pet", { entityList: { value: [{ id: "p-1" }] } }],
      ]),
      hasActiveData: () => true,
      refreshEntity: () => {},
      logPrefix: "[CustomStore]",
    });

    handlers[0]();

    expect(logSpy).toHaveBeenCalledWith(
      "[CustomStore] Reconnect refresh: pet",
    );
  });
});
