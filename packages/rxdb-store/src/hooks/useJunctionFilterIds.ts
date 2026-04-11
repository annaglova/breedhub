import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dictionaryStore } from '../stores/dictionary-store.signal-store';

interface UseJunctionFilterIdsOptions {
  junctionTable: string;
  junctionField: string;
  junctionFilterField: string;
  filterValue?: string; // undefined = parent not selected yet
  additionalFilters?: Array<{ field: string; value: string | undefined }>;
}

export interface JunctionFilterConfig {
  junctionTable: string;
  junctionFilterField: string;
  filterValue: string;
}

interface UseJunctionFilterIdsResult {
  filterByIds: string[] | null;
  /** Junction config for server-side join (use with LookupInput/getDictionary) */
  junctionFilter: JunctionFilterConfig | null;
  isLoading: boolean;
}

/**
 * Hook to fetch allowed IDs from a junction table for filtering dropdowns.
 *
 * Returns both:
 * - filterByIds: resolved IDs for client-side filtering (DropdownInput)
 * - junctionFilter: config for server-side PostgREST join (LookupInput dictionary mode)
 *
 * When filterValue is empty/undefined, returns null for both.
 * Results are cached per junctionTable::filterValue key.
 */
export function useJunctionFilterIds(
  options: UseJunctionFilterIdsOptions
): UseJunctionFilterIdsResult {
  const { junctionTable, junctionField, junctionFilterField, filterValue, additionalFilters } = options;
  const [filterByIds, setFilterByIds] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, string[]>>(new Map());

  // Resolve additional filters (skip undefined values)
  const resolvedAdditional = useMemo(() => {
    if (!additionalFilters) return undefined;
    const valid = additionalFilters.filter((f): f is { field: string; value: string } => !!f.value);
    return valid.length > 0 ? valid : undefined;
  }, [additionalFilters]);

  // Build junctionFilter config for server-side join (stable reference)
  const junctionFilter = useMemo<JunctionFilterConfig | null>(() => {
    if (!filterValue) return null;
    return { junctionTable, junctionFilterField, filterValue };
  }, [junctionTable, junctionFilterField, filterValue]);

  const fetchIds = useCallback(async () => {
    if (!filterValue) {
      setFilterByIds(null);
      setIsLoading(false);
      return;
    }

    const additionalKey = resolvedAdditional?.map(f => `${f.field}=${f.value}`).join('&') || '';
    const cacheKey = `${junctionTable}::${filterValue}${additionalKey ? `::${additionalKey}` : ''}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setFilterByIds(cached);
      return;
    }

    setIsLoading(true);
    try {
      const ids = await dictionaryStore.getJunctionIds(
        junctionTable,
        junctionField,
        junctionFilterField,
        filterValue,
        resolvedAdditional
      );
      cacheRef.current.set(cacheKey, ids);
      setFilterByIds(ids);
    } catch (error) {
      console.error('[useJunctionFilterIds] Failed to fetch junction IDs:', error);
      setFilterByIds([]);
    } finally {
      setIsLoading(false);
    }
  }, [junctionTable, junctionField, junctionFilterField, filterValue, resolvedAdditional]);

  useEffect(() => {
    fetchIds();
  }, [fetchIds]);

  return { filterByIds, junctionFilter, isLoading };
}
