/**
 * Unit tests for apps/app/src/utils/lookup.ts.
 *
 * Run: pnpm test:app
 */

import { afterEach, describe, expect, it, vi } from "vitest";

async function loadHarness() {
  vi.resetModules();
  const getRecordById = vi.fn(async () => ({ id: "x", name: "Rex" }));
  const getPartitionFieldForEntity = vi.fn(() => "breed_id");
  vi.doMock("@breedhub/rxdb-store", () => ({
    dictionaryStore: { getRecordById },
    getPartitionFieldForEntity,
  }));
  const module = await import("@/utils/lookup");
  return { ...module, getRecordById, getPartitionFieldForEntity };
}

describe("loadLookupById", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns null when id is missing without calling the store", async () => {
    const h = await loadHarness();
    expect(await h.loadLookupById("pet", null)).toBeNull();
    expect(await h.loadLookupById("pet", undefined)).toBeNull();
    expect(h.getRecordById).not.toHaveBeenCalled();
  });

  it("calls dictionaryStore without options when no partitionFilter", async () => {
    const h = await loadHarness();
    await h.loadLookupById("sex", "sex-1");
    expect(h.getRecordById).toHaveBeenCalledWith("sex", "sex-1", undefined);
  });

  it("forwards partitionFilter when provided", async () => {
    const h = await loadHarness();
    await h.loadLookupById("pet", "pet-1", { field: "breed_id", value: "breed-A" });
    expect(h.getRecordById).toHaveBeenCalledWith("pet", "pet-1", {
      partitionFilter: { field: "breed_id", value: "breed-A" },
    });
  });
});

describe("loadPetByBreed", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns null when petId is missing", async () => {
    const h = await loadHarness();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await h.loadPetByBreed(null, "breed-A", "Caller")).toBeNull();
    expect(await h.loadPetByBreed(undefined, "breed-A", "Caller")).toBeNull();
    expect(h.getRecordById).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns and returns null when petId is set but breedId is not a string", async () => {
    const h = await loadHarness();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await h.loadPetByBreed("pet-1", undefined, "Caller")).toBeNull();
    expect(await h.loadPetByBreed("pet-1", null, "Caller")).toBeNull();
    expect(await h.loadPetByBreed("pet-1", 123, "Caller")).toBeNull();
    expect(h.getRecordById).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(3);
    expect(warn.mock.calls[0][0]).toMatch(/\[Caller\] pet pet-1 is missing breed_id/);
  });

  it("warns and returns null when breedId is an empty string", async () => {
    const h = await loadHarness();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await h.loadPetByBreed("pet-1", "", "Caller")).toBeNull();
    expect(h.getRecordById).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();
  });

  it("calls dictionaryStore with breed_id partitionFilter on the happy path", async () => {
    const h = await loadHarness();
    await h.loadPetByBreed("pet-1", "breed-A", "Caller");
    expect(h.getRecordById).toHaveBeenCalledWith("pet", "pet-1", {
      partitionFilter: { field: "breed_id", value: "breed-A" },
    });
  });
});
