export interface TotalCountCacheKeyOptions {
  defaultFilters?: Record<string, any>;
  totalFilterKey?: string | null;
  totalFilterValue?: any;
}

export interface CachedTotalCountState {
  status: "hit" | "refresh" | "missing" | "invalid";
  value?: number;
  ageMs?: number;
}

export interface TotalCountFilterableQuery<TQuery> {
  eq(column: string, value: any): TQuery;
}

export interface FetchOrCacheTotalCountOptions {
  entityType: string;
  filters: Record<string, any>;
  defaultFilters?: Record<string, any>;
  totalFilterKey?: string | null;
  ttlMs: number;
  readCache: (key: string) => string | null;
  writeCache: (key: string, value: string) => void;
  fetchFreshCount: (
    applyFilters: <TQuery extends TotalCountFilterableQuery<TQuery>>(
      query: TQuery,
    ) => TQuery,
  ) => PromiseLike<{ count: number | null; error: any }>;
  onCountResolved: (count: number, source: "cache" | "fresh") => void;
}

export function buildDefaultFiltersSuffix(
  defaultFilters: Record<string, any> = {},
): string {
  if (Object.keys(defaultFilters).length === 0) {
    return "";
  }

  return (
    "_df_" +
    Object.entries(defaultFilters)
      .map(([key, value]) => `${key}=${value}`)
      .join("_")
  );
}

export function buildTotalCountCacheKey(
  entityType: string,
  {
    defaultFilters = {},
    totalFilterKey,
    totalFilterValue,
  }: TotalCountCacheKeyOptions = {},
): string {
  const defaultFiltersSuffix = buildDefaultFiltersSuffix(defaultFilters);

  if (totalFilterKey && totalFilterValue) {
    return `totalCount_${entityType}_${totalFilterKey}_${totalFilterValue}${defaultFiltersSuffix}`;
  }

  return `totalCount_${entityType}${defaultFiltersSuffix}`;
}

export function getTotalCountFilterInfo(
  totalFilterKey?: string | null,
  totalFilterValue?: any,
): string {
  if (!totalFilterKey || !totalFilterValue) {
    return "";
  }

  return ` (${totalFilterKey}=${totalFilterValue})`;
}

export function inspectCachedTotalCount(
  cachedValue: string | null,
  ttlMs: number,
  now = Date.now(),
): CachedTotalCountState {
  if (!cachedValue) {
    return { status: "missing" };
  }

  try {
    const { value, timestamp } = JSON.parse(cachedValue);
    const ageMs = now - timestamp;

    if (ageMs < ttlMs && value > 0) {
      return {
        status: "hit",
        value,
        ageMs,
      };
    }

    return {
      status: "refresh",
      ageMs,
    };
  } catch {
    return { status: "invalid" };
  }
}

export function applyTotalCountFiltersToQuery<
  TQuery extends TotalCountFilterableQuery<TQuery>,
>(
  query: TQuery,
  {
    defaultFilters = {},
    totalFilterKey,
    totalFilterValue,
  }: TotalCountCacheKeyOptions = {},
): TQuery {
  let nextQuery = query;

  for (const [key, value] of Object.entries(defaultFilters)) {
    if (value !== undefined && value !== null && value !== "") {
      nextQuery = nextQuery.eq(key, value);
    }
  }

  if (totalFilterKey && totalFilterValue) {
    nextQuery = nextQuery.eq(totalFilterKey, totalFilterValue);
  }

  return nextQuery;
}

export async function fetchOrCacheTotalCount(
  options: FetchOrCacheTotalCountOptions,
): Promise<void> {
  const totalFilterValue = options.totalFilterKey
    ? options.filters[options.totalFilterKey]
    : null;

  if (options.totalFilterKey && !totalFilterValue) {
    console.log(
      `[SpaceStore] 📊 Waiting for ${options.totalFilterKey} filter to be selected`,
    );
    return;
  }

  const filterInfo = getTotalCountFilterInfo(
    options.totalFilterKey,
    totalFilterValue,
  );
  const cacheKey = buildTotalCountCacheKey(options.entityType, {
    defaultFilters: options.defaultFilters,
    totalFilterKey: options.totalFilterKey,
    totalFilterValue,
  });

  let cachedRaw: string | null = null;
  try {
    cachedRaw = options.readCache(cacheKey);
  } catch {
    // localStorage may throw in private mode / when disabled
  }

  const cachedState = inspectCachedTotalCount(cachedRaw, options.ttlMs);

  if (cachedState.status === "hit" && cachedState.value !== undefined) {
    options.onCountResolved(cachedState.value, "cache");
    console.log(
      `[SpaceStore] 📊 Using cached total: ${cachedState.value}${filterInfo} (age: ${Math.round((cachedState.ageMs || 0) / 1000 / 60 / 60)}h)`,
    );
    return;
  }

  if (cachedState.status === "refresh") {
    console.log(`[SpaceStore] 📊 Cache expired, will refresh total count`);
  }

  try {
    const { count: totalCount, error: countError } =
      await options.fetchFreshCount((query) =>
        applyTotalCountFiltersToQuery(query, {
          defaultFilters: options.defaultFilters,
          totalFilterKey: options.totalFilterKey,
          totalFilterValue,
        }),
      );

    if (countError) {
      console.warn(`[SpaceStore] Failed to fetch total count:`, countError);
      return;
    }

    if (totalCount !== null) {
      console.log(`[SpaceStore] 📊 Fresh total count: ${totalCount}${filterInfo}`);
      options.onCountResolved(totalCount, "fresh");

      try {
        options.writeCache(
          cacheKey,
          JSON.stringify({ value: totalCount, timestamp: Date.now() }),
        );
      } catch (e) {
        console.warn(`[SpaceStore] Failed to cache totalCount:`, e);
      }
    }
  } catch (e) {
    console.warn(`[SpaceStore] Failed to fetch total count:`, e);
  }
}
