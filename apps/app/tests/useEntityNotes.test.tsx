import { describe, expect, it, vi, beforeEach } from "vitest";
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

import { useEntityNotes } from "../src/hooks/useEntityNotes";

describe("useEntityNotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("passes entity + entity_id + created_by filters to useNotes", () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      user: { id: "user-1" },
    });

    renderHook(() => useEntityNotes("breed", "breed-1"));

    expect(mockUseNotes).toHaveBeenCalledTimes(1);
    const params = mockUseNotes.mock.calls[0][0];
    expect(params.filters).toEqual({
      entity: "breed",
      entity_id: "breed-1",
      created_by: "user-1",
    });
  });

  it("orders by created_at desc", () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      user: { id: "user-1" },
    });

    renderHook(() => useEntityNotes("pet", "pet-1"));

    const params = mockUseNotes.mock.calls[0][0];
    expect(params.orderBy).toEqual({ field: "created_at", direction: "desc" });
  });

  it("pins eq operator on uuid fields to avoid ILIKE", () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      user: { id: "user-1" },
    });

    renderHook(() => useEntityNotes("contact", "contact-1"));

    const params = mockUseNotes.mock.calls[0][0];
    expect(params.fieldConfigs).toMatchObject({
      entity_id: { operator: "eq" },
      created_by: { operator: "eq" },
    });
  });

  it("disables loading when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      authenticated: false,
      user: { id: "" },
    });

    renderHook(() => useEntityNotes("breed", "breed-1"));

    const params = mockUseNotes.mock.calls[0][0];
    expect(params.enabled).toBe(false);
  });

  it("disables loading when entityId is empty", () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      user: { id: "user-1" },
    });

    renderHook(() => useEntityNotes("breed", ""));

    const params = mockUseNotes.mock.calls[0][0];
    expect(params.enabled).toBe(false);
  });

  it("enables loading when authenticated and entityId set", () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      user: { id: "user-1" },
    });

    renderHook(() => useEntityNotes("breed", "breed-1"));

    const params = mockUseNotes.mock.calls[0][0];
    expect(params.enabled).toBe(true);
  });
});
