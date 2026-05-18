import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const spaceStoreMock = vi.hoisted(() => ({
  applyFilters: vi.fn(),
  configReady: { value: true },
  getEntityStore: vi.fn(),
  getTotalCountSignalForSpace: vi.fn(),
  initialized: { value: true },
}));

vi.mock("@breedhub/rxdb-store", () => ({
  spaceStore: spaceStoreMock,
}));

import { useEntities } from "../useEntities";

type TestEntity = {
  id: string;
  name: string;
};

function createSignal<T>(value: T) {
  return {
    value,
    subscribe: vi.fn(() => vi.fn()),
  };
}

function createEntityStore() {
  return {
    entityList: createSignal<TestEntity[]>([]),
    totalFromServer: createSignal<number | null>(null),
  };
}

function createRecords(start: number, count: number): TestEntity[] {
  return Array.from({ length: count }, (_, index) => {
    const id = start + index;
    return {
      id: `pet-${id}`,
      name: `Pet ${id}`,
    };
  });
}

async function renderLoadedHook({
  initialRecords,
  initialTotal,
  loadMoreRecords,
  loadMoreTotal,
}: {
  initialRecords: TestEntity[];
  initialTotal: number;
  loadMoreRecords: TestEntity[];
  loadMoreTotal: number;
}) {
  spaceStoreMock.applyFilters
    .mockResolvedValueOnce({
      records: initialRecords,
      total: initialTotal,
      hasMore: true,
      nextCursor: "cursor-1",
    })
    .mockResolvedValueOnce({
      records: loadMoreRecords,
      total: loadMoreTotal,
      hasMore: false,
      nextCursor: null,
    });

  const params = {
    entityType: "pet",
    filters: { status: "active" },
    recordsCount: 8,
    spaceId: "pets",
    activeScope: "owned",
  };

  const hook = renderHook(() => useEntities(params));

  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  expect(hook.result.current.data).toEqual({
    entities: initialRecords,
    total: initialTotal,
  });

  return hook;
}

describe("useEntities loadMore total preservation", () => {
  beforeEach(() => {
    spaceStoreMock.applyFilters.mockReset();
    spaceStoreMock.getEntityStore.mockReset();
    spaceStoreMock.getTotalCountSignalForSpace.mockReset();
    spaceStoreMock.configReady.value = true;
    spaceStoreMock.initialized.value = true;
    spaceStoreMock.getEntityStore.mockResolvedValue(createEntityStore());
    spaceStoreMock.getTotalCountSignalForSpace.mockReturnValue(null);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the authoritative server total unchanged during pagination", async () => {
    const hook = await renderLoadedHook({
      initialRecords: createRecords(1, 8),
      initialTotal: 48,
      loadMoreRecords: createRecords(9, 8),
      loadMoreTotal: 48,
    });

    await act(async () => {
      await hook.result.current.loadMore();
    });

    expect(hook.result.current.data?.entities).toHaveLength(16);
    expect(hook.result.current.data?.total).toBe(48);
    expect(hook.result.current.data?.total).not.toBe(56);
  });

  it("trusts a higher server total returned by loadMore", async () => {
    const hook = await renderLoadedHook({
      initialRecords: createRecords(1, 8),
      initialTotal: 48,
      loadMoreRecords: createRecords(9, 8),
      loadMoreTotal: 100,
    });

    await act(async () => {
      await hook.result.current.loadMore();
    });

    expect(hook.result.current.data?.entities).toHaveLength(16);
    expect(hook.result.current.data?.total).toBe(100);
  });

  it("rejects a lower bogus server total returned by loadMore", async () => {
    const hook = await renderLoadedHook({
      initialRecords: createRecords(1, 8),
      initialTotal: 48,
      loadMoreRecords: createRecords(9, 8),
      loadMoreTotal: 5,
    });

    await act(async () => {
      await hook.result.current.loadMore();
    });

    expect(hook.result.current.data?.entities).toHaveLength(16);
    expect(hook.result.current.data?.total).toBe(48);
  });

  it("uses deduped newRecords length when validating the loadMore total", async () => {
    const initialRecords = createRecords(1, 46);
    const hook = await renderLoadedHook({
      initialRecords,
      initialTotal: 47,
      loadMoreRecords: [
        initialRecords[44],
        initialRecords[45],
        ...createRecords(47, 2),
      ],
      loadMoreTotal: 48,
    });

    await act(async () => {
      await hook.result.current.loadMore();
    });

    expect(hook.result.current.data?.entities).toHaveLength(48);
    expect(hook.result.current.data?.total).toBe(48);
  });
});
