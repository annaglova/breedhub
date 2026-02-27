import { useCallback, useEffect, useRef, useState } from 'react';
import { dictionaryStore } from '../stores/dictionary-store.signal-store';

interface UseJunctionFilterIdsOptions {
  junctionTable: string;
  junctionField: string;
  junctionFilterField: string;
  filterValue?: string; // undefined = parent not selected yet
}

interface UseJunctionFilterIdsResult {
  filterByIds: string[] | null;
  isLoading: boolean;
}

/**
 * Hook to fetch allowed IDs from a junction table for filtering dropdowns.
 *
 * When filterValue is empty/undefined, returns null (no filtering).
 * When filterValue is set, queries the junction table and returns allowed IDs.
 * Results are cached per junctionTable::filterValue key.
 */
export function useJunctionFilterIds(
  options: UseJunctionFilterIdsOptions
): UseJunctionFilterIdsResult {
  const { junctionTable, junctionField, junctionFilterField, filterValue } = options;
  const [filterByIds, setFilterByIds] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, string[]>>(new Map());

  const fetchIds = useCallback(async () => {
    if (!filterValue) {
      setFilterByIds(null);
      setIsLoading(false);
      return;
    }

    const cacheKey = `${junctionTable}::${filterValue}`;
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
        filterValue
      );
      cacheRef.current.set(cacheKey, ids);
      setFilterByIds(ids);
    } catch (error) {
      console.error('[useJunctionFilterIds] Failed to fetch junction IDs:', error);
      setFilterByIds([]);
    } finally {
      setIsLoading(false);
    }
  }, [junctionTable, junctionField, junctionFilterField, filterValue]);

  useEffect(() => {
    fetchIds();
  }, [fetchIds]);

  return { filterByIds, isLoading };
}
