import { describe, expect, it } from "vitest";
import {
  groupPartitionedEntityRefs,
  normalizePartitionedEntityRefs,
  orderRecordsByPartitionRefs,
  recordMatchesPartition,
  splitCachedAndMissingPartitionRefs,
} from "../space-partition.helpers";

describe("space-partition.helpers", () => {
  it("normalizes partition refs by dropping empty ids and duplicate composite refs", () => {
    expect(
      normalizePartitionedEntityRefs([
        { id: "pet-1", partitionId: "breed-1" },
        { id: "pet-1", partitionId: "breed-1" },
        { id: "pet-1", partitionId: "breed-2" },
        { id: "", partitionId: "breed-3" },
        { id: "pet-2" },
        { id: "pet-2", partitionId: null },
      ]),
    ).toEqual([
      { id: "pet-1", partitionId: "breed-1" },
      { id: "pet-1", partitionId: "breed-2" },
      { id: "pet-2", partitionId: null },
    ]);
  });

  it("splits cached and missing refs using partition-aware matching", () => {
    const cachedMap = new Map([
      ["pet-1", { id: "pet-1", breed_id: "breed-1", name: "Alpha" }],
      ["pet-2", { id: "pet-2", breed_id: "breed-2", name: "Beta" }],
    ]);

    const result = splitCachedAndMissingPartitionRefs(
      [
        { id: "pet-1", partitionId: "breed-1" },
        { id: "pet-2", partitionId: "breed-3" },
        { id: "pet-3", partitionId: "breed-3" },
      ],
      cachedMap,
      "breed_id",
    );

    expect(result.cached).toEqual([
      { id: "pet-1", breed_id: "breed-1", name: "Alpha" },
    ]);
    expect(result.missing).toEqual([
      { id: "pet-2", partitionId: "breed-3" },
      { id: "pet-3", partitionId: "breed-3" },
    ]);
  });

  it("groups refs by partition and preserves requested order when rebuilding results", () => {
    const refs = [
      { id: "pet-2", partitionId: "breed-2" },
      { id: "pet-1", partitionId: "breed-1" },
      { id: "pet-4" },
    ];

    expect(groupPartitionedEntityRefs(refs)).toEqual({
      partitionedIds: new Map([
        ["breed-2", ["pet-2"]],
        ["breed-1", ["pet-1"]],
      ]),
      unpartitionedIds: ["pet-4"],
    });

    const ordered = orderRecordsByPartitionRefs(
      refs,
      [
        { id: "pet-1", breed_id: "breed-1", name: "Alpha" },
        { id: "pet-2", breed_id: "breed-2", name: "Beta" },
        { id: "pet-4", name: "No Partition" },
      ],
      "breed_id",
    );

    expect(ordered.map((record) => record.id)).toEqual([
      "pet-2",
      "pet-1",
      "pet-4",
    ]);
    expect(
      recordMatchesPartition(
        { id: "pet-2", breed_id: "breed-2" },
        "breed_id",
        "breed-2",
      ),
    ).toBe(true);
    expect(
      recordMatchesPartition(
        { id: "pet-2", breed_id: "breed-2" },
        "breed_id",
        "breed-3",
      ),
    ).toBe(false);
  });
});
