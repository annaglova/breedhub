/**
 * Unit tests for EditChildMatrixTab grouping helper.
 *
 * Run: pnpm test:app
 */

import { describe, it, expect } from "vitest";
import { groupCellRecordsIntoRows } from "@/components/edit/tabs/edit-child-matrix.helpers";

function record(parentId: string, date: string, weight: number, id?: string) {
  return {
    id: id ?? `${parentId}-${date}`,
    parentId,
    additional: {
      date,
      pet_id: parentId,
      weight,
    },
  };
}

describe("groupCellRecordsIntoRows", () => {
  it("groups records by headerCol value", () => {
    const records = [
      record("pet-A", "2026-03-01T10:00:00", 5),
      record("pet-B", "2026-03-01T10:00:00", 6),
      record("pet-A", "2026-03-02T10:00:00", 7),
    ];

    const rows = groupCellRecordsIntoRows(records, {
      headerCol: "date",
      colCol: "pet_id",
    });

    expect(rows).toHaveLength(2);
    const r1 = rows.find((r) => r.key === "2026-03-01T10:00:00")!;
    expect(Object.keys(r1.cellRecords).sort()).toEqual(["pet-A", "pet-B"]);
    expect(r1.allRecords).toHaveLength(2);
  });

  it("sorts rows desc by orderBy field BEFORE grouping (newest first)", () => {
    const records = [
      record("pet-A", "2026-01-01T10:00:00", 1),
      record("pet-A", "2026-03-01T10:00:00", 3),
      record("pet-A", "2026-02-01T10:00:00", 2),
    ];

    const rows = groupCellRecordsIntoRows(records, {
      headerCol: "date",
      colCol: "pet_id",
      orderBy: [{ field: "date", direction: "desc" }],
    });

    expect(rows.map((r) => r.key)).toEqual([
      "2026-03-01T10:00:00",
      "2026-02-01T10:00:00",
      "2026-01-01T10:00:00",
    ]);
  });

  it("sorts rows asc by orderBy field BEFORE grouping (oldest first)", () => {
    const records = [
      record("pet-A", "2026-03-01T10:00:00", 3),
      record("pet-A", "2026-01-01T10:00:00", 1),
      record("pet-A", "2026-02-01T10:00:00", 2),
    ];

    const rows = groupCellRecordsIntoRows(records, {
      headerCol: "date",
      colCol: "pet_id",
      orderBy: [{ field: "date", direction: "asc" }],
    });

    expect(rows.map((r) => r.key)).toEqual([
      "2026-01-01T10:00:00",
      "2026-02-01T10:00:00",
      "2026-03-01T10:00:00",
    ]);
  });

  it("falls back to insertion order when orderBy is undefined", () => {
    const records = [
      record("pet-A", "2026-03-01T10:00:00", 3),
      record("pet-A", "2026-01-01T10:00:00", 1),
      record("pet-A", "2026-02-01T10:00:00", 2),
    ];

    const rows = groupCellRecordsIntoRows(records, {
      headerCol: "date",
      colCol: "pet_id",
    });

    expect(rows.map((r) => r.key)).toEqual([
      "2026-03-01T10:00:00",
      "2026-01-01T10:00:00",
      "2026-02-01T10:00:00",
    ]);
  });

  it("skips records with null headerValue", () => {
    const records = [
      record("pet-A", "2026-03-01T10:00:00", 3),
      { id: "bad", parentId: "pet-A", additional: { date: null, pet_id: "pet-A", weight: 9 } },
      record("pet-A", "2026-02-01T10:00:00", 2),
    ];

    const rows = groupCellRecordsIntoRows(records, {
      headerCol: "date",
      colCol: "pet_id",
      orderBy: [{ field: "date", direction: "desc" }],
    });

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.key)).toEqual([
      "2026-03-01T10:00:00",
      "2026-02-01T10:00:00",
    ]);
  });

  it("falls back to record.parentId when colCol is missing in additional", () => {
    const records = [
      {
        id: "rec-1",
        parentId: "pet-A",
        additional: { date: "2026-03-01T10:00:00", weight: 5 },
      },
    ];

    const rows = groupCellRecordsIntoRows(records, {
      headerCol: "date",
      colCol: "pet_id",
      orderBy: [{ field: "date", direction: "desc" }],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].cellRecords).toHaveProperty("pet-A");
  });

  it("dedupes by column in cellRecords map but keeps both in allRecords", () => {
    const records = [
      record("pet-A", "2026-03-01T10:00:00", 5, "first"),
      record("pet-A", "2026-03-01T10:00:00", 6, "duplicate"),
    ];

    const rows = groupCellRecordsIntoRows(records, {
      headerCol: "date",
      colCol: "pet_id",
    });

    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0].cellRecords)).toEqual(["pet-A"]);
    expect(rows[0].allRecords).toHaveLength(2);
  });

  it("returns empty array for empty input", () => {
    const rows = groupCellRecordsIntoRows([], {
      headerCol: "date",
      colCol: "pet_id",
      orderBy: [{ field: "date", direction: "desc" }],
    });
    expect(rows).toEqual([]);
  });
});
