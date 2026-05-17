export interface TotalCountCacheKeyOptions {
  defaultFilters?: Record<string, unknown>;
  totalFilterKey?: string | null;
  totalFilterValue?: unknown;
  /**
   * Active space id. Folds into the cache key so two spaces on the same
   * entitySchemaName (public /pets vs private /my/pets) keep separate
   * cached counts. Optional for legacy callers — when absent, key omits
   * the segment and the old shape is preserved.
   */
  spaceId?: string;
  /**
   * Active quick-filter scope (e.g. "owned"). Each chip on the same space
   * tracks its own count (Owned 12, Bred 36, All 47), so scope must be in
   * the key — otherwise switching chips overwrites the cached value.
   */
  activeScope?: string | null;
}

export interface CachedTotalCountState {
  status: "hit" | "refresh" | "missing" | "invalid";
  value?: number;
  ageMs?: number;
}

export interface TotalCountFilterableQuery<TQuery> {
  eq(column: string, value: unknown): TQuery;
}

export interface FetchOrCacheTotalCountOptions {
  entityType: string;
  filters: Record<string, unknown>;
  defaultFilters?: Record<string, unknown>;
  totalFilterKey?: string | null;
  /** Active space id — folds into cache key to keep spaces separate. */
  spaceId?: string;
  /** Active quick-filter scope — folds into cache key (Owned/Bred/All each cache separately). */
  activeScope?: string | null;
  ttlMs: number;
  /**
   * When false, treat the cached value as a stale-while-revalidate hint:
   * resolve the cache instantly AND fire a background fetch to verify.
   * Public spaces (default) skip the revalidation since their cached
   * vanity counts can age for the full TTL without harm.
   */
  isPublic?: boolean;
  readCache: (key: string) => string | null;
  writeCache: (key: string, value: string) => void;
  fetchFreshCount: (
    applyFilters: <TQuery extends TotalCountFilterableQuery<TQuery>>(
      query: TQuery,
    ) => TQuery,
  ) => PromiseLike<{ count: number | null; error: unknown }>;
  onCountResolved: (count: number, source: "cache" | "fresh") => void;
}

export function buildDefaultFiltersSuffix(
  defaultFilters: Record<string, unknown> = {},
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
    spaceId,
    activeScope,
  }: TotalCountCacheKeyOptions = {},
): string {
  const defaultFiltersSuffix = buildDefaultFiltersSuffix(defaultFilters);
  // Prefix kept blank-by-default so existing keys aren't disturbed for
  // unmigrated call sites. spaceId/activeScope only show up when callers
  // pass them — public /pets and private /my/pets each end up with their
  // own slot, and Owned/Bred/All chips each get their own count.
  const spacePrefix = spaceId ? `s_${spaceId}_` : "";
  const scopePrefix = activeScope ? `sc_${activeScope}_` : "";

  if (totalFilterKey && totalFilterValue) {
    return `totalCount_${spacePrefix}${scopePrefix}${entityType}_${totalFilterKey}_${totalFilterValue}${defaultFiltersSuffix}`;
  }

  return `totalCount_${spacePrefix}${scopePrefix}${entityType}${defaultFiltersSuffix}`;
}

export function getTotalCountFilterInfo(
  totalFilterKey?: string | null,
  totalFilterValue?: unknown,
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

    if (ageMs < ttlMs && typeof value === "number" && value >= 0) {
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
    spaceId: options.spaceId,
    activeScope: options.activeScope,
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
    if (options.isPublic !== false) {
      // Public space: stale cache is fine until TTL expires.
      return;
    }
    // Private space: stale-while-revalidate — fall through to background
    // fetch so a write from another client doesn't leave the count behind.
    console.log(`[SpaceStore] 🔄 Private space — revalidating in background${filterInfo}`);
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
