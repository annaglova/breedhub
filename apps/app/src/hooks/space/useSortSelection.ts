/**
 * useSortSelection - Manages sort option from URL/localStorage/default.
 *
 * Priority: URL param → localStorage → default from config.
 * Also handles legacy param cleanup and sort change persistence.
 *
 * Extracted from SpaceComponent.
 */
import { useCallback, useMemo } from "react";

interface SortOption {
  id: string;
  name: string;
  field?: string;
  direction?: string;
  parameter?: string;
  icon?: string;
  isDefault?: boolean;
  tieBreaker?: {
    field: string;
    direction: string;
    parameter?: string;
  };
  [key: string]: any;
}

export function useSortSelection(
  searchParams: URLSearchParams,
  setSearchParams: (params: URLSearchParams, options?: { replace?: boolean }) => void,
  sortOptions: SortOption[],
  sortStorageKey: string
) {
  const defaultSortOption = useMemo(() => {
    return sortOptions.find((option) => option.isDefault) || sortOptions[0];
  }, [sortOptions]);

  const sortId = searchParams.get("sort");

  const selectedSortOption = useMemo(() => {
    // 1. URL param (highest priority — for sharing links)
    if (sortId) {
      const found = sortOptions.find((option) => option.id === sortId);
      if (found) return found;
    }

    // 2. localStorage (persisted preference)
    try {
      const savedSortId = localStorage.getItem(sortStorageKey);
      if (savedSortId) {
        const found = sortOptions.find((option) => option.id === savedSortId);
        if (found) return found;
      }
    } catch {
      // localStorage not available
    }

    // 3. Default
    return defaultSortOption;
  }, [sortId, sortOptions, defaultSortOption, sortStorageKey]);

  const handleSortChange = useCallback(
    (option: SortOption) => {
      const newParams = new URLSearchParams(searchParams);

      // Remove legacy sort params
      newParams.delete("sortBy");
      newParams.delete("sortDir");
      newParams.delete("sortParam");

      newParams.set("sort", option.id);

      try {
        localStorage.setItem(sortStorageKey, option.id);
      } catch {
        // localStorage not available
      }

      setSearchParams(newParams);
    },
    [searchParams, setSearchParams, sortStorageKey],
  );

  return { selectedSortOption, defaultSortOption, handleSortChange };
}
