import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  getRecordByIdMock: vi.fn(),
}));

vi.mock("@breedhub/rxdb-store", () => ({
  dictionaryStore: {
    getRecordById: mockState.getRecordByIdMock,
  },
}));

import { useDictionaryValue } from "@/hooks/useDictionaryValue";

describe("useDictionaryValue", () => {
  beforeEach(() => {
    mockState.getRecordByIdMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the default name field without requesting extra dictionary columns", async () => {
    mockState.getRecordByIdMock.mockResolvedValue({ id: "sex-1", name: "Male" });

    const { result } = renderHook(() => useDictionaryValue("sex", "sex-1"));

    await waitFor(() => {
      expect(result.current).toBe("Male");
    });

    expect(mockState.getRecordByIdMock).toHaveBeenCalledWith("sex", "sex-1");
  });

  it("requests only the needed additional dictionary field for non-name lookups", async () => {
    mockState.getRecordByIdMock.mockResolvedValue({
      id: "sex-1",
      name: "Male",
      code: "M",
    });

    const { result } = renderHook(() =>
      useDictionaryValue("sex", "sex-1", "code"),
    );

    await waitFor(() => {
      expect(result.current).toBe("M");
    });

    expect(mockState.getRecordByIdMock).toHaveBeenCalledWith("sex", "sex-1", {
      additionalFields: ["code"],
    });
  });
});
