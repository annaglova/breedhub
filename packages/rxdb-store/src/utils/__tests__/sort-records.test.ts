/**
 * sortRecords unit tests
 *
 * Run: pnpm --filter @breedhub/rxdb-store test
 */

import { describe, it, expect } from "vitest";
import { sortRecords } from "../sort-records";
import type { OrderConfig } from "../../types/tab-data.types";

describe("sortRecords", () => {
  it("returns input unchanged when orderBy is undefined", () => {
    const records = [{ id: "a" }, { id: "b" }];
    const result = sortRecords(records, undefined);
    expect(result).toBe(records);
  });

  it("returns input unchanged when orderBy is empty array", () => {
    const records = [{ id: "a" }, { id: "b" }];
    const result = sortRecords(records, []);
    expect(result).toBe(records);
  });

  it("does not mutate the input array", () => {
    const records = [
      { id: "1", position: 3 },
      { id: "2", position: 1 },
      { id: "3", position: 2 },
    ];
    const snapshot = [...records];
    sortRecords(records, [{ field: "position", direction: "asc" }]);
    expect(records).toEqual(snapshot);
  });

  it("sorts by single field ascending", () => {
    const records = [
      { id: "1", position: 3 },
      { id: "2", position: 1 },
      { id: "3", position: 2 },
    ];
    const result = sortRecords(records, [
      { field: "position", direction: "asc" },
    ]);
    expect(result.map((r) => r.id)).toEqual(["2", "3", "1"]);
  });

  it("sorts by single field descending", () => {
    const records = [
      { id: "1", date: "2026-01-01" },
      { id: "2", date: "2026-03-01" },
      { id: "3", date: "2026-02-01" },
    ];
    const result = sortRecords(records, [
      { field: "date", direction: "desc" },
    ]);
    expect(result.map((r) => r.id)).toEqual(["2", "3", "1"]);
  });

  it("reads from `additional` field first (RxDB child-cache shape)", () => {
    const records = [
      { id: "1", additional: { date: "2026-01-01" } },
      { id: "2", additional: { date: "2026-03-01" } },
      { id: "3", additional: { date: "2026-02-01" } },
    ];
    const result = sortRecords(records, [
      { field: "date", direction: "desc" },
    ]);
    expect(result.map((r) => r.id)).toEqual(["2", "3", "1"]);
  });

  it("falls back to flat field when `additional` is absent", () => {
    const records = [
      { id: "1", date: "2026-01-01" },
      { id: "2", additional: { date: "2026-03-01" } },
      { id: "3", date: "2026-02-01" },
    ];
    const result = sortRecords(records, [
      { field: "date", direction: "asc" },
    ]);
    expect(result.map((r) => r.id)).toEqual(["1", "3", "2"]);
  });

  it("pushes nulls to the end when direction is asc (NULLS LAST)", () => {
    const records = [
      { id: "1", position: 2 },
      { id: "2", position: null },
      { id: "3", position: 1 },
    ];
    const result = sortRecords(records, [
      { field: "position", direction: "asc" },
    ]);
    expect(result.map((r) => r.id)).toEqual(["3", "1", "2"]);
  });

  it("pushes nulls to the end when direction is desc (NULLS LAST)", () => {
    const records = [
      { id: "1", position: 2 },
      { id: "2", position: null },
      { id: "3", position: 1 },
    ];
    const result = sortRecords(records, [
      { field: "position", direction: "desc" },
    ]);
    expect(result.map((r) => r.id)).toEqual(["1", "3", "2"]);
  });

  it("treats undefined the same as null (NULLS LAST)", () => {
    const records = [
      { id: "1", position: 2 },
      { id: "2" },
      { id: "3", position: 1 },
    ];
    const result = sortRecords(records, [
      { field: "position", direction: "asc" },
    ]);
    expect(result.map((r) => r.id)).toEqual(["3", "1", "2"]);
  });

  it("breaks ties using the next orderBy entry", () => {
    const records = [
      { id: "1", position: 1, name: "Charlie" },
      { id: "2", position: 1, name: "Alice" },
      { id: "3", position: 2, name: "Bob" },
      { id: "4", position: 1, name: "Bob" },
    ];
    const result = sortRecords(records, [
      { field: "position", direction: "asc" },
      { field: "name", direction: "asc" },
    ]);
    expect(result.map((r) => r.id)).toEqual(["2", "4", "1", "3"]);
  });

  it("returns 0 (stable) when all orderBy fields are equal", () => {
    const records = [
      { id: "1", position: 1 },
      { id: "2", position: 1 },
      { id: "3", position: 1 },
    ];
    const result = sortRecords(records, [
      { field: "position", direction: "asc" },
    ]);
    expect(result.map((r) => r.id)).toEqual(["1", "2", "3"]);
  });

  it("handles mixed null + value in tie-break (skips nulls in primary, falls to secondary)", () => {
    const orderBy: OrderConfig[] = [
      { field: "position", direction: "asc" },
      { field: "name", direction: "asc" },
    ];
    const records = [
      { id: "1", position: null, name: "B" },
      { id: "2", position: null, name: "A" },
      { id: "3", position: 1, name: "C" },
    ];
    const result = sortRecords(records, orderBy);
    // Both nulls go to end; among themselves sorted by name asc.
    expect(result.map((r) => r.id)).toEqual(["3", "2", "1"]);
  });
});
