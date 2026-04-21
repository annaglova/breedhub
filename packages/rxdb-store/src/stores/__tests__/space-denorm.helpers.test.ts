import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyPartitionGuardedPatch,
  rebuildPetTitlesDisplayFlow,
} from "../space-denorm.helpers";

function createPatchableCollection(record?: Record<string, any> | null) {
  const patch = vi.fn(async (_patch: Record<string, any>) => {});
  const findOne = vi.fn((_id: string) => ({
    exec: async () =>
      record
        ? {
            toJSON: () => record,
            patch,
          }
        : null,
  }));

  return {
    collection: {
      findOne,
    },
    patch,
    findOne,
  };
}

function createEntityStore(records: Record<string, Record<string, any>>) {
  const updateOne = vi.fn();

  return {
    entityStore: {
      entityMap: {
        value: new Map(Object.entries(records)),
      },
      updateOne,
    },
    updateOne,
  };
}

function createBasePatchOptions(
  overrides: Partial<Parameters<typeof applyPartitionGuardedPatch<Record<string, any>>>[0]> = {},
) {
  return {
    id: "pet-1",
    patch: { titles_display: [{ id: "title-1" }] },
    fieldName: "titles_display",
    partitionField: "breed_id",
    expectedPartitionId: "breed-1",
    recordIdField: "petId",
    expectedPartitionField: "expectedBreedId",
    cachedPartitionField: "cachedBreedId",
    partitionEntityLabel: "pet",
    ...overrides,
  };
}

describe("space-denorm.helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("patches the RxDB document when the partition matches", async () => {
    const { collection, patch } = createPatchableCollection({
      id: "pet-1",
      breed_id: "breed-1",
    });

    await applyPartitionGuardedPatch(
      createBasePatchOptions({
        collection,
      }),
    );

    expect(patch).toHaveBeenCalledWith({
      titles_display: [{ id: "title-1" }],
    });
  });

  it("warns and skips the RxDB patch when the partition mismatches", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { collection, patch } = createPatchableCollection({
      id: "pet-1",
      breed_id: "breed-2",
    });

    await applyPartitionGuardedPatch(
      createBasePatchOptions({
        collection,
      }),
    );

    expect(patch).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "[SpaceStore] Skipping titles_display patch for mismatched pet partition",
      {
        petId: "pet-1",
        expectedBreedId: "breed-1",
        cachedBreedId: "breed-2",
      },
    );
  });

  it("silently skips the RxDB path when the document is missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { collection, patch } = createPatchableCollection(null);

    await applyPartitionGuardedPatch(
      createBasePatchOptions({
        collection,
      }),
    );

    expect(patch).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("skips the collection path entirely when no collection is provided", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      applyPartitionGuardedPatch(
        createBasePatchOptions({
          collection: undefined,
          entityStore: undefined,
        }),
      ),
    ).resolves.toBeUndefined();

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("updates the entity store when the partition matches", async () => {
    const { entityStore, updateOne } = createEntityStore({
      "pet-1": { id: "pet-1", breed_id: "breed-1" },
    });

    await applyPartitionGuardedPatch(
      createBasePatchOptions({
        entityStore,
      }),
    );

    expect(updateOne).toHaveBeenCalledWith("pet-1", {
      titles_display: [{ id: "title-1" }],
    });
  });

  it("warns and skips the entity store update when the partition mismatches", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { entityStore, updateOne } = createEntityStore({
      "pet-1": { id: "pet-1", breed_id: "breed-2" },
    });

    await applyPartitionGuardedPatch(
      createBasePatchOptions({
        entityStore,
      }),
    );

    expect(updateOne).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "[SpaceStore] Skipping titles_display store update for mismatched pet partition",
      {
        petId: "pet-1",
        expectedBreedId: "breed-1",
        cachedBreedId: "breed-2",
      },
    );
  });

  it("silently skips the entity store path when the cached pet is missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { entityStore, updateOne } = createEntityStore({});

    await applyPartitionGuardedPatch(
      createBasePatchOptions({
        entityStore,
      }),
    );

    expect(updateOne).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("skips the store path entirely when no entity store is provided", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      applyPartitionGuardedPatch(
        createBasePatchOptions({
          collection: undefined,
          entityStore: undefined,
        }),
      ),
    ).resolves.toBeUndefined();

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("handles the collection and store paths independently", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { collection, patch } = createPatchableCollection({
      id: "pet-1",
      breed_id: "breed-1",
    });
    const { entityStore, updateOne } = createEntityStore({
      "pet-1": { id: "pet-1", breed_id: "breed-2" },
    });

    await applyPartitionGuardedPatch(
      createBasePatchOptions({
        collection,
        entityStore,
      }),
    );

    expect(patch).toHaveBeenCalledOnce();
    expect(updateOne).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "[SpaceStore] Skipping titles_display store update for mismatched pet partition",
      {
        petId: "pet-1",
        expectedBreedId: "breed-1",
        cachedBreedId: "breed-2",
      },
    );
  });

  it("rebuilds titles_display from child rows, dictionary lookups, and applies the guarded patch", async () => {
    const loadTitleInPetRecords = vi.fn(async () => [
      {
        additional: {
          title_id: "title-1",
          country_id: "ua",
          amount: 2,
          date: "2024-01-01",
          is_confirmed: true,
        },
      },
      {
        additional: {
          title_id: "title-2",
        },
      },
    ]);
    const lookupTitleDictionary = vi.fn(async (titleId: string) => {
      if (titleId === "title-1") {
        return { name: "Champion", rating: "5" };
      }

      return { name: "Winner", rating: 7 };
    });
    const { collection, patch } = createPatchableCollection({
      id: "pet-1",
      breed_id: "breed-1",
    });
    const { entityStore, updateOne } = createEntityStore({
      "pet-1": { id: "pet-1", breed_id: "breed-1" },
    });

    await rebuildPetTitlesDisplayFlow({
      petId: "pet-1",
      petBreedId: "breed-1",
      loadTitleInPetRecords,
      lookupTitleDictionary,
      collection,
      entityStore,
    });

    const expectedTitlesDisplay = [
      {
        id: "title-2",
        name: "Winner",
        rating: 7,
        country_id: null,
        amount: 1,
        date: null,
        confirmed: false,
      },
      {
        id: "title-1",
        name: "Champion",
        rating: 5,
        country_id: "ua",
        amount: 2,
        date: "2024-01-01",
        confirmed: true,
      },
    ];

    expect(loadTitleInPetRecords).toHaveBeenCalledWith("pet-1", "breed-1");
    expect(lookupTitleDictionary).toHaveBeenCalledTimes(2);
    expect(lookupTitleDictionary).toHaveBeenNthCalledWith(1, "title-1");
    expect(lookupTitleDictionary).toHaveBeenNthCalledWith(2, "title-2");
    expect(patch).toHaveBeenCalledWith({
      titles_display: expectedTitlesDisplay,
    });
    expect(updateOne).toHaveBeenCalledWith("pet-1", {
      titles_display: expectedTitlesDisplay,
    });
  });

  it("patches an empty titles_display array when there are no child rows", async () => {
    const loadTitleInPetRecords = vi.fn(async () => []);
    const lookupTitleDictionary = vi.fn(async () => null);
    const { collection, patch } = createPatchableCollection({
      id: "pet-1",
      breed_id: "breed-1",
    });

    await rebuildPetTitlesDisplayFlow({
      petId: "pet-1",
      petBreedId: "breed-1",
      loadTitleInPetRecords,
      lookupTitleDictionary,
      collection,
    });

    expect(lookupTitleDictionary).not.toHaveBeenCalled();
    expect(patch).toHaveBeenCalledWith({
      titles_display: [],
    });
  });

  it("skips dictionary lookups when no child rows survive the title_id filter", async () => {
    const loadTitleInPetRecords = vi.fn(async () => [
      { additional: {} },
      { additional: { title_id: null } },
    ]);
    const lookupTitleDictionary = vi.fn(async () => null);
    const { entityStore, updateOne } = createEntityStore({
      "pet-1": { id: "pet-1", breed_id: "breed-1" },
    });

    await rebuildPetTitlesDisplayFlow({
      petId: "pet-1",
      petBreedId: "breed-1",
      loadTitleInPetRecords,
      lookupTitleDictionary,
      entityStore,
    });

    expect(lookupTitleDictionary).not.toHaveBeenCalled();
    expect(updateOne).toHaveBeenCalledWith("pet-1", {
      titles_display: [],
    });
  });

  it("excludes null dictionary results from the lookup map while still rebuilding", async () => {
    const loadTitleInPetRecords = vi.fn(async () => [
      {
        additional: {
          title_id: "title-1",
          amount: 3,
        },
      },
      {
        additional: {
          title_id: "title-2",
        },
      },
    ]);
    const lookupTitleDictionary = vi.fn(async (titleId: string) => {
      if (titleId === "title-1") {
        return { name: "Champion", rating: 4 };
      }

      return null;
    });
    const { collection, patch } = createPatchableCollection({
      id: "pet-1",
      breed_id: "breed-1",
    });

    await rebuildPetTitlesDisplayFlow({
      petId: "pet-1",
      petBreedId: "breed-1",
      loadTitleInPetRecords,
      lookupTitleDictionary,
      collection,
    });

    expect(lookupTitleDictionary).toHaveBeenCalledTimes(2);
    expect(patch).toHaveBeenCalledWith({
      titles_display: [
        {
          id: "title-1",
          name: "Champion",
          rating: 4,
          country_id: null,
          amount: 3,
          date: null,
          confirmed: false,
        },
        {
          id: "title-2",
          name: "",
          rating: 0,
          country_id: null,
          amount: 1,
          date: null,
          confirmed: false,
        },
      ],
    });
  });
});
