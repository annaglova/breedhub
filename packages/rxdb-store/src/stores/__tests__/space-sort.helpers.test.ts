import { describe, expect, it } from "vitest";
import { compareValues, getTieBreaker } from "../space-sort.helpers";

describe("space-sort.helpers", () => {
  it("returns the configured tie-breaker when present", () => {
    expect(
      getTieBreaker({
        field: "name",
        direction: "asc",
        tieBreaker: { field: "rank", direction: "desc" },
      }),
    ).toEqual({ field: "rank", direction: "desc" });
  });

  it("falls back to id ascending when tie-breaker is omitted", () => {
    expect(
      getTieBreaker({
        field: "name",
        direction: "asc",
      }),
    ).toEqual({ field: "id", direction: "asc" });
  });

  it("sorts ascending values with nulls last", () => {
    expect(compareValues("Alpha", "Beta", "asc")).toBeLessThan(0);
    expect(compareValues(null, "Beta", "asc")).toBeGreaterThan(0);
    expect(compareValues("Alpha", undefined, "asc")).toBeLessThan(0);
  });

  it("sorts descending values with nulls last", () => {
    expect(compareValues(10, 5, "desc")).toBeLessThan(0);
    expect(compareValues(null, 5, "desc")).toBeGreaterThan(0);
    expect(compareValues(10, undefined, "desc")).toBeLessThan(0);
  });
});
