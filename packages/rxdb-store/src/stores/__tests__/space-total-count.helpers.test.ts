import { describe, expect, it } from "vitest";
import {
  applyTotalCountFiltersToQuery,
  buildDefaultFiltersSuffix,
  buildTotalCountCacheKey,
  getTotalCountFilterInfo,
  inspectCachedTotalCount,
} from "../space-total-count.helpers";

describe("space-total-count.helpers", () => {
  it("builds a total count cache key with grouped filter and default filters", () => {
    expect(
      buildTotalCountCacheKey("account", {
        defaultFilters: { type_id: "kennel", status: "active" },
        totalFilterKey: "breed_id",
        totalFilterValue: "breed-1",
      }),
    ).toBe(
      "totalCount_account_breed_id_breed-1_df_type_id=kennel_status=active",
    );
  });

  it("builds filter info only when grouped filter context exists", () => {
    expect(getTotalCountFilterInfo("breed_id", "breed-1")).toBe(
      " (breed_id=breed-1)",
    );
    expect(getTotalCountFilterInfo("breed_id", "")).toBe("");
    expect(getTotalCountFilterInfo(undefined, "breed-1")).toBe("");
  });

  it("returns cached total count hit with age when cache is fresh and positive", () => {
    expect(
      inspectCachedTotalCount(
        JSON.stringify({ value: 42, timestamp: 1_000 }),
        5_000,
        2_000,
      ),
    ).toEqual({
      status: "hit",
      value: 42,
      ageMs: 1_000,
    });
  });

  it("marks stale or non-positive cache values for refresh", () => {
    expect(
      inspectCachedTotalCount(
        JSON.stringify({ value: 0, timestamp: 1_000 }),
        5_000,
        2_000,
      ),
    ).toEqual({
      status: "refresh",
      ageMs: 1_000,
    });

    expect(
      inspectCachedTotalCount(
        JSON.stringify({ value: 42, timestamp: 1_000 }),
        500,
        2_000,
      ),
    ).toEqual({
      status: "refresh",
      ageMs: 1_000,
    });
  });

  it("handles missing and invalid cached values", () => {
    expect(inspectCachedTotalCount(null, 5_000)).toEqual({
      status: "missing",
    });
    expect(inspectCachedTotalCount("{not-json", 5_000)).toEqual({
      status: "invalid",
    });
  });

  it("builds empty default filter suffix when no defaults are provided", () => {
    expect(buildDefaultFiltersSuffix()).toBe("");
    expect(buildDefaultFiltersSuffix({})).toBe("");
  });

  it("applies default filters and grouped filter to total count query", () => {
    const calls: Array<[string, any]> = [];
    const query = {
      eq(column: string, value: any) {
        calls.push([column, value]);
        return this;
      },
    };

    const result = applyTotalCountFiltersToQuery(query, {
      defaultFilters: {
        type_id: "kennel",
        status: "active",
      },
      totalFilterKey: "breed_id",
      totalFilterValue: "breed-1",
    });

    expect(result).toBe(query);
    expect(calls).toEqual([
      ["type_id", "kennel"],
      ["status", "active"],
      ["breed_id", "breed-1"],
    ]);
  });

  it("skips empty default filters and missing grouped filter values", () => {
    const calls: Array<[string, any]> = [];
    const query = {
      eq(column: string, value: any) {
        calls.push([column, value]);
        return this;
      },
    };

    applyTotalCountFiltersToQuery(query, {
      defaultFilters: {
        type_id: "kennel",
        status: "",
        archived: null,
        owner_id: undefined,
      },
      totalFilterKey: "breed_id",
      totalFilterValue: "",
    });

    expect(calls).toEqual([["type_id", "kennel"]]);
  });
});
