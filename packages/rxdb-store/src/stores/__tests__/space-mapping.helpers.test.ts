import { describe, expect, it } from "vitest";
import {
  buildMappingCacheKey,
  getMappingSelectFields,
  groupMappingRowsByPartition,
  hasStaleMappedRecords,
  orderMappedRecordsByIds,
  splitCachedAndMissingMappingRows,
} from "../space-mapping.helpers";

describe("space-mapping.helpers", () => {
  it("builds stable cache keys and select fields", () => {
    expect(buildMappingCacheKey("pet_child", "pet_id", "123")).toBe(
      "pet_child:pet_id:123",
    );
    expect(getMappingSelectFields()).toBe("id");
    expect(getMappingSelectFields("breed_id")).toBe("id, breed_id");
  });

  it("splits cached and missing mapping rows by staleness", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const docs = new Map([
      ["a", { toJSON: () => ({ id: "a", cachedAt: 950 }) }],
      ["b", { toJSON: () => ({ id: "b", cachedAt: 200 }) }],
    ]);

    const result = splitCachedAndMissingMappingRows(rows, docs, 100, 1000);

    expect(result.cached).toEqual([{ id: "a", cachedAt: 950 }]);
    expect(result.missing).toEqual([{ id: "b" }, { id: "c" }]);
  });

  it("groups rows by partition and preserves requested order on merge", () => {
    const groups = groupMappingRowsByPartition(
      [
        { id: "a", breed_id: "x" },
        { id: "b", breed_id: "x" },
        { id: "c", breed_id: "y" },
        { id: "d" },
      ],
      "breed_id",
    );

    expect(Array.from(groups.entries())).toEqual([
      ["x", ["a", "b"]],
      ["y", ["c"]],
    ]);

    const ordered = orderMappedRecordsByIds(
      ["b", "a", "c"],
      new Map([
        ["a", { toJSON: () => ({ id: "a", name: "A" }) }],
        ["b", { toJSON: () => ({ id: "b", name: "B" }) }],
        ["c", { toJSON: () => ({ id: "c", name: "C" }) }],
      ]),
    );

    expect(ordered.map((record) => record.id)).toEqual(["b", "a", "c"]);
  });

  it("detects stale mapped records from oldest cachedAt", () => {
    expect(hasStaleMappedRecords([], 100, 1000)).toBe(false);
    expect(
      hasStaleMappedRecords(
        [{ cachedAt: 980 }, { cachedAt: 970 }],
        50,
        1000,
      ),
    ).toBe(false);
    expect(
      hasStaleMappedRecords(
        [{ cachedAt: 980 }, { cachedAt: 800 }],
        150,
        1000,
      ),
    ).toBe(true);
  });
});
