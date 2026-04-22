import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
  ensureChildCollectionMock: vi.fn(),
  childRefreshSignal: { value: null as { tableType: string; parentId: string } | null },
  lastSelectColumns: null as string | null,
  lastEqCalls: [] as Array<[string, any]>,
  queryResult: { data: [] as any[], error: null as any },
}));

vi.mock("../../supabase/client", () => {
  function createQueryBuilder() {
    const builder: any = {
      select(columns: string) {
        mockState.lastSelectColumns = columns;
        return builder;
      },
      eq(field: string, value: any) {
        mockState.lastEqCalls.push([field, value]);
        return builder;
      },
      then(onFulfilled: any, onRejected: any) {
        return Promise.resolve(mockState.queryResult).then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  return {
    supabase: {
      from: mockState.fromMock.mockImplementation(() => createQueryBuilder()),
      rpc: mockState.rpcMock,
    },
  };
});

vi.mock("../../stores/space-store.signal-store", () => ({
  spaceStore: {
    ensureChildCollection: mockState.ensureChildCollectionMock,
    childRefreshSignal: mockState.childRefreshSignal,
  },
}));

import { runPostSaveHooks } from "../entity-hooks";

describe("entity-hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.lastSelectColumns = null;
    mockState.lastEqCalls = [];
    mockState.queryResult = { data: [], error: null };
    mockState.childRefreshSignal.value = null;
    mockState.rpcMock.mockResolvedValue({ data: { skipped: true }, error: null });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refreshes contact_in_pet with an explicit select list and caches the projected child rows", async () => {
    const bulkUpsert = vi.fn(async () => {});
    mockState.ensureChildCollectionMock.mockResolvedValue({ bulkUpsert });
    mockState.queryResult = {
      data: [
        {
          id: "cip-1",
          pet_id: "pet-1",
          pet_breed_id: "breed-1",
          contact_id: "contact-1",
          contact_role_id: "role-1",
          is_primary: true,
          created_at: "2026-04-21T10:00:00.000Z",
          updated_at: "2026-04-21T11:00:00.000Z",
          created_by: "user-1",
          updated_by: "user-2",
        },
      ],
      error: null,
    };

    await runPostSaveHooks(
      "pet",
      "pet-1",
      { breeder_id: "contact-1", breed_id: "breed-1" },
      ["breeder_id"],
    );

    expect(mockState.fromMock).toHaveBeenCalledWith("contact_in_pet");
    expect(mockState.lastSelectColumns).toBe(
      "id, pet_id, pet_breed_id, contact_id, contact_role_id, is_primary, created_at, updated_at, created_by, updated_by",
    );
    expect(mockState.lastEqCalls).toEqual([
      ["pet_id", "pet-1"],
      ["pet_breed_id", "breed-1"],
      ["deleted", false],
    ]);
    expect(bulkUpsert).toHaveBeenCalledWith([
      {
        id: "cip-1",
        tableType: "contact_in_pet",
        parentId: "pet-1",
        updated_at: "2026-04-21T11:00:00.000Z",
        created_at: "2026-04-21T10:00:00.000Z",
        created_by: "user-1",
        updated_by: "user-2",
        additional: {
          contact_id: "contact-1",
          contact_role_id: "role-1",
          is_primary: true,
        },
        cachedAt: expect.any(Number),
        partitionId: "breed-1",
      },
    ]);
    expect(mockState.childRefreshSignal.value).toEqual({
      tableType: "contact_in_pet",
      parentId: "pet-1",
    });
  });

  it("skips the contact refresh query when breeder/owner fields did not change", async () => {
    await runPostSaveHooks(
      "pet",
      "pet-1",
      { breed_id: "breed-1", name: "Alpha" },
      ["name"],
    );

    expect(mockState.fromMock).not.toHaveBeenCalled();
    expect(mockState.ensureChildCollectionMock).not.toHaveBeenCalled();
  });
});
