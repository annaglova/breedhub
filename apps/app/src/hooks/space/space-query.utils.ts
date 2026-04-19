export const LEGACY_SORT_QUERY_PARAMS: readonly string[] = [
  "sortBy",
  "sortDir",
  "sortParam",
] as const;

export const SPACE_RESERVED_QUERY_PARAMS: readonly string[] = [
  "sort",
  "view",
  ...LEGACY_SORT_QUERY_PARAMS,
] as const;

// Used by hasFilterSearchParams heuristic (should localStorage filters be applied?).
// `entity` is intentionally NOT included here — URL `?entity=X` alone means "no filters",
// so saved filters from localStorage should still apply.
export const FILTER_RESERVED_QUERY_PARAMS: readonly string[] = [
  ...SPACE_RESERVED_QUERY_PARAMS,
] as const;

// Used by buildFiltersFromSearchParams — `entity` is a routing param, never a filter value.
export const FILTER_BUILD_RESERVED_QUERY_PARAMS: readonly string[] = [
  ...FILTER_RESERVED_QUERY_PARAMS,
  "entity",
] as const;

export const TOTAL_COUNT_RESERVED_QUERY_PARAMS: readonly string[] = [
  ...SPACE_RESERVED_QUERY_PARAMS,
  "type",
] as const;

export interface SpaceStorageKeys {
  viewStorageKey: string;
  sortStorageKey: string;
  filtersStorageKey: string;
}

export function getSpaceStorageKeys(entitySchemaName: string): SpaceStorageKeys {
  return {
    viewStorageKey: `breedhub:view:${entitySchemaName}`,
    sortStorageKey: `breedhub:sort:${entitySchemaName}`,
    filtersStorageKey: `breedhub:filters:${entitySchemaName}`,
  };
}

export function readStorageValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorageValue(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStorageValue(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function removeQueryParams(
  searchParams: URLSearchParams,
  keys: readonly string[],
): URLSearchParams | null {
  const nextParams = new URLSearchParams(searchParams);
  let changed = false;

  for (const key of keys) {
    if (nextParams.has(key)) {
      nextParams.delete(key);
      changed = true;
    }
  }

  return changed ? nextParams : null;
}

export function removeLegacySortQueryParams(
  searchParams: URLSearchParams,
): URLSearchParams | null {
  return removeQueryParams(searchParams, LEGACY_SORT_QUERY_PARAMS);
}

export function ensureSearchParam(
  searchParams: URLSearchParams,
  key: string,
  value?: string | null,
): URLSearchParams | null {
  if (!value || searchParams.get(key) === value) {
    return null;
  }

  const nextParams = new URLSearchParams(searchParams);
  nextParams.set(key, value);
  return nextParams;
}

export function hasUnreservedSearchParams(
  searchParams: URLSearchParams,
  reservedParams: readonly string[],
): boolean {
  const reserved = new Set(reservedParams);

  for (const key of searchParams.keys()) {
    if (!reserved.has(key)) {
      return true;
    }
  }

  return false;
}
