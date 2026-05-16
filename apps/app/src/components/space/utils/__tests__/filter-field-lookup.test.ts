import { beforeEach, describe, expect, it, vi } from "vitest";

const getDatabaseMock = vi.hoisted(() => vi.fn());
const getDictionaryMock = vi.hoisted(() => vi.fn());
const getRecordByIdMock = vi.hoisted(() => vi.fn());

vi.mock("@breedhub/rxdb-store", () => ({
  getDatabase: getDatabaseMock,
  dictionaryStore: {
    getDictionary: getDictionaryMock,
    getRecordById: getRecordByIdMock,
  },
}));

import { getValueForLabel } from "../filter-field-lookup";

// Cast as `any` — FilterFieldConfig from @/types/field-config has many more
// required fields; the function under test only reads these few, so a
// minimal fixture keeps the test focused. The lookup helper is fully
// covered through this slim shape.
const breedFieldConfig = {
  id: "breed_id",
  displayName: "Breed",
  fieldType: "select",
  dataSource: "collection",
  referencedTable: "breed",
  referencedFieldID: "id",
  referencedFieldName: "name",
} as any;

function createCollection(docs: Array<Record<string, unknown>>) {
  return {
    find: vi.fn(() => ({
      exec: vi.fn(async () => docs),
    })),
  };
}

function createRxdb(collections: Record<string, unknown>) {
  return { collections } as any;
}

describe("getValueForLabel", () => {
  beforeEach(() => {
    getDatabaseMock.mockReset();
    getDictionaryMock.mockReset();
    getRecordByIdMock.mockReset();
  });

  it("falls back to dictionaryStore when local collection is partial and misses the label", async () => {
    const uuid = "11111111-1111-4111-8111-111111111111";
    const partialDocs = Array.from({ length: 30 }, (_, index) => ({
      id: `breed-${index}`,
      name: `Breed ${index}`,
    }));
    const collection = createCollection(partialDocs);
    const rxdb = createRxdb({ breed: collection });
    getDictionaryMock.mockResolvedValue({
      records: [{ id: uuid, name: "Affenpinscher" }],
    });

    await expect(
      getValueForLabel(breedFieldConfig, "affenpinscher", rxdb),
    ).resolves.toBe(uuid);

    expect(getDictionaryMock).toHaveBeenCalledTimes(1);
    expect(getDictionaryMock).toHaveBeenCalledWith("breed", {
      search: "affenpinscher",
      nameField: "name",
      idField: "id",
      limit: 30,
    });
  });

  it("returns a local normalized match without calling dictionaryStore", async () => {
    const uuid = "22222222-2222-4222-8222-222222222222";
    const collection = createCollection([
      { id: uuid, name: "Affen Pinscher" },
      { id: "other-breed", name: "Basenji" },
    ]);
    const rxdb = createRxdb({ breed: collection });

    await expect(
      getValueForLabel(breedFieldConfig, "affen-pinscher", rxdb),
    ).resolves.toBe(uuid);

    expect(getDictionaryMock).not.toHaveBeenCalled();
  });

  it("returns null when both local lookup and dictionaryStore miss", async () => {
    const collection = createCollection([]);
    const rxdb = createRxdb({ breed: collection });
    getDictionaryMock.mockResolvedValue({ records: [] });

    await expect(
      getValueForLabel(breedFieldConfig, "affenpinscher", rxdb),
    ).resolves.toBeNull();

    expect(getDictionaryMock).toHaveBeenCalledTimes(1);
  });

  it("returns null immediately for incomplete foreign-key config", async () => {
    const collection = createCollection([{ id: "breed-1", name: "Affenpinscher" }]);
    const rxdb = createRxdb({ breed: collection });

    await expect(
      getValueForLabel(
        { ...breedFieldConfig, referencedTable: undefined },
        "affenpinscher",
        rxdb,
      ),
    ).resolves.toBeNull();
    await expect(
      getValueForLabel(
        { ...breedFieldConfig, referencedFieldID: undefined },
        "affenpinscher",
        rxdb,
      ),
    ).resolves.toBeNull();
    await expect(
      getValueForLabel(
        { ...breedFieldConfig, referencedFieldName: undefined },
        "affenpinscher",
        rxdb,
      ),
    ).resolves.toBeNull();

    expect(collection.find).not.toHaveBeenCalled();
    expect(getDatabaseMock).not.toHaveBeenCalled();
    expect(getDictionaryMock).not.toHaveBeenCalled();
  });
});
