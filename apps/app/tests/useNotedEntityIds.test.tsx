import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const { mockUseAuth, mockUseNotes } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseNotes: vi.fn(),
}));

vi.mock("@shared/core/auth", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("../src/hooks/useNotes", () => ({
  useNotes: mockUseNotes,
}));

import { useNotedEntityIds } from "../src/hooks/useNotedEntityIds";
import { noteIndicatorStore } from "../src/stores/note-indicator.store";

describe("useNotedEntityIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    noteIndicatorStore.state.value = {};
    mockUseNotes.mockReturnValue({
      data: { entities: [], total: 0 },
      isLoading: false,
      isLoadingMore: false,
      isFetching: false,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });
  });

  it("passes filters scoped to entity type and current user", () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      user: { id: "user-1" },
    });

    renderHook(() => useNotedEntityIds("breed"));

    const params = mockUseNotes.mock.calls[0][0];
    expect(params.filters).toEqual({ entity: "breed", created_by: "user-1" });
    expect(params.fieldConfigs.created_by).toMatchObject({ operator: "eq" });
    expect(params.enabled).toBe(true);
  });

  it("disables loading when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      authenticated: false,
      user: { id: "" },
    });

    renderHook(() => useNotedEntityIds("breed"));

    const params = mockUseNotes.mock.calls[0][0];
    expect(params.enabled).toBe(false);
  });

  it("fills indicator store with entity_ids from returned notes", () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      user: { id: "user-1" },
    });
    mockUseNotes.mockReturnValue({
      data: {
        entities: [
          { id: "n-1", entity_id: "b-1" },
          { id: "n-2", entity_id: "b-2" },
          { id: "n-3", entity_id: "b-1" }, // duplicate id -> single set entry
        ],
        total: 3,
      },
      isLoading: false,
    });

    renderHook(() => useNotedEntityIds("breed"));

    expect(noteIndicatorStore.has("breed", "b-1")).toBe(true);
    expect(noteIndicatorStore.has("breed", "b-2")).toBe(true);
    expect(noteIndicatorStore.has("breed", "b-3")).toBe(false);
  });

  it("ignores notes missing entity_id", () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      user: { id: "user-1" },
    });
    mockUseNotes.mockReturnValue({
      data: {
        entities: [{ id: "n-1" }, { id: "n-2", entity_id: "p-1" }],
        total: 2,
      },
      isLoading: false,
    });

    renderHook(() => useNotedEntityIds("pet"));

    expect(noteIndicatorStore.has("pet", "p-1")).toBe(true);
  });
});
