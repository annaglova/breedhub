import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyTotalCountFiltersToQuery,
  buildDefaultFiltersSuffix,
  buildTotalCountCacheKey,
  fetchOrCacheTotalCount,
  getTotalCountFilterInfo,
  inspectCachedTotalCount,
} from "../space-total-count.helpers";

describe("space-total-count.helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("uses cached total count hit without fetching fresh data", async () => {
    vi.spyOn(Date, "now").mockReturnValue(3 * 60 * 60 * 1000);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const readCache = vi.fn(() =>
      JSON.stringify({
        value: 42,
        timestamp: 1 * 60 * 60 * 1000,
      }),
    );
    const fetchFreshCount = vi.fn();
    const onCountResolved = vi.fn();

    await fetchOrCacheTotalCount({
      entityType: "pet",
      filters: { breed_id: "breed-1" },
      totalFilterKey: "breed_id",
      ttlMs: 14 * 24 * 60 * 60 * 1000,
      readCache,
      writeCache: vi.fn(),
      fetchFreshCount,
      onCountResolved,
    });

    expect(fetchFreshCount).not.toHaveBeenCalled();
    expect(onCountResolved).toHaveBeenCalledWith(42, "cache");
    expect(logSpy).toHaveBeenCalledWith(
      "[SpaceStore] 📊 Using cached total: 42 (breed_id=breed-1) (age: 2h)",
    );
  });

  it("refreshes expired cached total count and writes back fresh value", async () => {
    vi.spyOn(Date, "now").mockReturnValue(10_000);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const writeCache = vi.fn();
    const onCountResolved = vi.fn();
    const fetchFreshCount = vi.fn(async (applyFilters) => {
      const query = {
        calls: [] as Array<[string, any]>,
        eq(column: string, value: any) {
          this.calls.push([column, value]);
          return this;
        },
      };

      applyFilters(query);
      expect(query.calls).toEqual([
        ["type_id", "kennel"],
        ["breed_id", "breed-1"],
      ]);

      return { count: 17, error: null };
    });

    await fetchOrCacheTotalCount({
      entityType: "pet",
      filters: { breed_id: "breed-1" },
      defaultFilters: { type_id: "kennel" },
      totalFilterKey: "breed_id",
      ttlMs: 5_000,
      readCache: () => JSON.stringify({ value: 42, timestamp: 1_000 }),
      writeCache,
      fetchFreshCount,
      onCountResolved,
    });

    expect(fetchFreshCount).toHaveBeenCalledOnce();
    expect(onCountResolved).toHaveBeenCalledWith(17, "fresh");
    expect(writeCache).toHaveBeenCalledWith(
      "totalCount_pet_breed_id_breed-1_df_type_id=kennel",
      JSON.stringify({ value: 17, timestamp: 10_000 }),
    );
    expect(logSpy).toHaveBeenCalledWith(
      "[SpaceStore] 📊 Cache expired, will refresh total count",
    );
    expect(logSpy).toHaveBeenCalledWith(
      "[SpaceStore] 📊 Fresh total count: 17 (breed_id=breed-1)",
    );
  });

  it("fetches fresh count when cached total count is missing", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchFreshCount = vi.fn(async () => ({ count: 9, error: null }));
    const onCountResolved = vi.fn();
    const writeCache = vi.fn();

    await fetchOrCacheTotalCount({
      entityType: "pet",
      filters: { breed_id: "breed-1" },
      totalFilterKey: "breed_id",
      ttlMs: 5_000,
      readCache: () => null,
      writeCache,
      fetchFreshCount,
      onCountResolved,
    });

    expect(fetchFreshCount).toHaveBeenCalledOnce();
    expect(onCountResolved).toHaveBeenCalledWith(9, "fresh");
    expect(writeCache).toHaveBeenCalledOnce();
    expect(logSpy).toHaveBeenCalledWith(
      "[SpaceStore] 📊 Fresh total count: 9 (breed_id=breed-1)",
    );
  });

  it("treats cache read errors as a missing cache entry", async () => {
    const fetchFreshCount = vi.fn(async () => ({ count: 5, error: null }));
    const onCountResolved = vi.fn();

    await fetchOrCacheTotalCount({
      entityType: "pet",
      filters: {},
      ttlMs: 5_000,
      readCache: () => {
        throw new Error("private mode");
      },
      writeCache: vi.fn(),
      fetchFreshCount,
      onCountResolved,
    });

    expect(fetchFreshCount).toHaveBeenCalledOnce();
    expect(onCountResolved).toHaveBeenCalledWith(5, "fresh");
  });

  it("warns when cache write fails but still resolves fresh count", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const onCountResolved = vi.fn();

    await fetchOrCacheTotalCount({
      entityType: "pet",
      filters: {},
      ttlMs: 5_000,
      readCache: () => null,
      writeCache: () => {
        throw new Error("quota exceeded");
      },
      fetchFreshCount: async () => ({ count: 11, error: null }),
      onCountResolved,
    });

    expect(onCountResolved).toHaveBeenCalledWith(11, "fresh");
    expect(warnSpy).toHaveBeenCalledWith(
      "[SpaceStore] Failed to cache totalCount:",
      expect.any(Error),
    );
  });

  it("skips cache and fetch when mandatory total filter is not selected", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const readCache = vi.fn();
    const fetchFreshCount = vi.fn();
    const onCountResolved = vi.fn();

    await fetchOrCacheTotalCount({
      entityType: "pet",
      filters: {},
      totalFilterKey: "breed_id",
      ttlMs: 5_000,
      readCache,
      writeCache: vi.fn(),
      fetchFreshCount,
      onCountResolved,
    });

    expect(readCache).not.toHaveBeenCalled();
    expect(fetchFreshCount).not.toHaveBeenCalled();
    expect(onCountResolved).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      "[SpaceStore] 📊 Waiting for breed_id filter to be selected",
    );
  });

  it("warns when fetching fresh total count returns an error", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const writeCache = vi.fn();
    const onCountResolved = vi.fn();
    const error = new Error("network");

    await fetchOrCacheTotalCount({
      entityType: "pet",
      filters: {},
      ttlMs: 5_000,
      readCache: () => null,
      writeCache,
      fetchFreshCount: async () => ({ count: null, error }),
      onCountResolved,
    });

    expect(onCountResolved).not.toHaveBeenCalled();
    expect(writeCache).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "[SpaceStore] Failed to fetch total count:",
      error,
    );
  });
});
