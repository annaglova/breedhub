export function mergeDefaultViewParam(
  currentSearch: string,
  viewMode: string | null | undefined,
): URLSearchParams | null {
  if (!viewMode) return null;

  const params = new URLSearchParams(currentSearch);
  if (params.has("view")) return null;

  params.set("view", viewMode);
  return params;
}

export function mergeDefaultSortParam(
  currentSearch: string,
  sortId: string | null | undefined,
): URLSearchParams | null {
  if (!sortId) return null;

  const params = new URLSearchParams(currentSearch);
  if (params.has("sort")) return null;

  params.set("sort", sortId);
  return params;
}

export function mergeFilterParamsIntoLiveSearch(
  currentSearch: string,
  filterOnly: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(currentSearch);
  for (const [key, value] of filterOnly.entries()) {
    params.set(key, value);
  }
  return params;
}
