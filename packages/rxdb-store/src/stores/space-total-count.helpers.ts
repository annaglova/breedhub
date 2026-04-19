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
