import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  getRecordByIdMock: vi.fn(),
  getDictionaryMock: vi.fn(),
}));

vi.mock("@breedhub/rxdb-store", () => ({
  dictionaryStore: {
    getRecordById: mockState.getRecordByIdMock,
    getDictionary: mockState.getDictionaryMock,
  },
}));

import {
  getLabelForValue,
  getValueForLabel,
} from "@/components/space/utils/filter-field-lookup";

function emptyRxdbMock() {
  // Minimal RxDB stub: no dedicated collection, no `dictionaries` collection,
  // so getCollectionInfo() returns null and the helpers go straight to the
  // dictionaryStore fallback path we're testing.
  return { collections: {} } as any;
}

const dictFieldConfig = {
  referencedTable: "sex",
  referencedFieldID: "id",
  referencedFieldName: "name",
} as any;

describe("filter-field-lookup goes through dictionaryStore (regression for direct supabase.from)", () => {
  beforeEach(() => {
    mockState.getRecordByIdMock.mockReset();
    mockState.getDictionaryMock.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getLabelForValue resolves via dictionaryStore.getRecordById and never reaches supabase directly", async () => {
    mockState.getRecordByIdMock.mockResolvedValue({ id: "sex-1", name: "Male" });

    const label = await getLabelForValue(
      dictFieldConfig,
      "sex-1",
      emptyRxdbMock(),
    );

    expect(label).toBe("Male");
    expect(mockState.getRecordByIdMock).toHaveBeenCalledWith("sex", "sex-1", {
      idField: "id",
      nameField: "name",
    });
  });

  it("getLabelForValue returns the raw value when dictionaryStore returns null", async () => {
    mockState.getRecordByIdMock.mockResolvedValue(null);

    const label = await getLabelForValue(
      dictFieldConfig,
      "missing-id",
      emptyRxdbMock(),
    );

    expect(label).toBe("missing-id");
  });

  it("getValueForLabel searches via dictionaryStore.getDictionary and matches normalized name", async () => {
    mockState.getDictionaryMock.mockResolvedValue({
      records: [
        { id: "sex-1", name: "Male" },
        { id: "sex-2", name: "Female" },
      ],
      total: 2,
      hasMore: false,
      nextCursor: null,
    });

    const id = await getValueForLabel(dictFieldConfig, "Male", emptyRxdbMock());

    expect(id).toBe("sex-1");
    expect(mockState.getDictionaryMock).toHaveBeenCalledWith("sex", {
      search: "Male",
      nameField: "name",
      idField: "id",
      limit: 30,
    });
  });

  it("getValueForLabel returns null when dictionaryStore returns no records", async () => {
    mockState.getDictionaryMock.mockResolvedValue({
      records: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
    });

    const id = await getValueForLabel(
      dictFieldConfig,
      "Nonexistent",
      emptyRxdbMock(),
    );

    expect(id).toBeNull();
  });
});
