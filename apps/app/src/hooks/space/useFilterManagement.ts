/**
 * useFilterManagement - Manages space filters: building, persistence, apply/remove.
 *
 * - Builds filters from URL params (label→ID conversion via dictionaries)
 * - Loads saved filters from localStorage on initial mount
 * - Handles filter apply (ID→label for URL) and remove
 * - Builds activeFilters for chip display
 * - Builds currentFilterValues for FiltersDialog form initialization
 *
 * Extracted from SpaceComponent.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { FilterFieldConfig } from "@/types/field-config";
import {
  ActiveFilter,
  applyRawFilterValuesToSearchParams,
  buildActiveFilters,
  buildCurrentFilterValues,
  buildFiltersFromSearchParams,
  buildSearchParamsWithResolvedFilters,
  hasFilterSearchParams,
  persistFilterValues,
  type FilterField,
  type MainFilterField,
  removeFilterFromStorage,
} from "./filter-management.utils";
import { readStorageValue } from "./space-query.utils";

/**
 * Shallow equality check for filter maps.
 *
 * buildFiltersFromSearchParams returns a fresh object on every call; when
 * called inside a useEffect whose deps are unstable (e.g. URLSearchParams
 * recreated on every render), the new reference propagates through
 * useEntities → applyFilters → setData → re-render → infinite loop.
 *
 * Equality is shallow — filter maps only ever contain scalars (resolved ids
 * or raw URL values) or simple arrays of scalars.
 */
function areFiltersEqual(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    const av = a[key];
    const bv = b[key];
    if (av === bv) continue;
    if (Array.isArray(av) && Array.isArray(bv)) {
      if (av.length !== bv.length) return false;
      for (let i = 0; i < av.length; i++) {
        if (av[i] !== bv[i]) return false;
      }
      continue;
    }
    return false;
  }
  return true;
}

interface UseFilterManagementOptions {
  searchParams: URLSearchParams;
  setSearchParams: (params: URLSearchParams, options?: { replace?: boolean }) => void;
  filterFields: FilterField[];
  mainFilterField: MainFilterField | null;
  mainFilterFields: MainFilterField[];
  searchUrlSlug: string | null;
  filtersStorageKey: string;
  initialSelectedEntityId?: string;
  createMode?: boolean;
}

export function useFilterManagement({
  searchParams,
  setSearchParams,
  filterFields,
  mainFilterField,
  mainFilterFields,
  searchUrlSlug,
  filtersStorageKey,
  initialSelectedEntityId,
  createMode,
}: UseFilterManagementOptions) {
  // ============= Build filters from URL =============

  const [filters, setFilters] = useState<Record<string, any> | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;
    const buildFilters = async () => {
      try {
        const nextFilters = await buildFiltersFromSearchParams({
          filterFields,
          mainFilterField,
          mainFilterFields,
          searchParams,
          searchUrlSlug,
        });
        if (cancelled) return;
        // Dedup: skip setFilters if content is identical — setting a new object
        // reference with the same content cascades into useEntities useEffect →
        // applyFilters → setData → re-render → new dep refs → infinite loop.
        setFilters((prev) =>
          areFiltersEqual(prev, nextFilters) ? prev : nextFilters,
        );
      } catch (error) {
        if (cancelled) return;
        console.error("[useFilterManagement] Error building filters:", error);
        setFilters((prev) => (prev === undefined ? prev : undefined));
      }
    };

    buildFilters();
    return () => {
      cancelled = true;
    };
  }, [
    searchParams,
    filterFields,
    mainFilterField,
    mainFilterFields,
    searchUrlSlug,
  ]);

  // ============= Apply saved filters from localStorage =============

  const hasAppliedSavedFilters = useRef(false);
  useEffect(() => {
    if (hasAppliedSavedFilters.current || initialSelectedEntityId || createMode) return;
    if (filterFields.length === 0) return;

    if (hasFilterSearchParams(searchParams)) {
      hasAppliedSavedFilters.current = true;
      return;
    }

    try {
      const savedFilters = readStorageValue(filtersStorageKey);
      if (savedFilters) {
        const parsedFilters = JSON.parse(savedFilters) as Record<string, string>;

        const applyFilters = async () => {
          const newParams = await buildSearchParamsWithResolvedFilters({
            filterFields,
            filterValues: parsedFilters,
            searchParams,
          });
          setSearchParams(newParams, { replace: true });
        };

        applyFilters();
      }
    } catch (e) {
      console.warn("[useFilterManagement] Could not load saved filters:", e);
    }

    hasAppliedSavedFilters.current = true;
  }, [
    searchParams,
    setSearchParams,
    filterFields,
    filtersStorageKey,
    initialSelectedEntityId,
    createMode,
  ]);

  // ============= Handle filter apply =============

  const handleFiltersApply = useCallback(
    async (filterValues: Record<string, any>) => {
      try {
        const newParams = await buildSearchParamsWithResolvedFilters({
          filterFields,
          filterValues,
          searchParams,
        });

        persistFilterValues(filtersStorageKey, filterValues);
        setSearchParams(newParams);
      } catch (error) {
        console.error("[handleFiltersApply] Error:", error);
        const newParams = applyRawFilterValuesToSearchParams({
          filterFields,
          filterValues,
          searchParams,
        });
        setSearchParams(newParams);
      }
    },
    [searchParams, setSearchParams, filterFields, filtersStorageKey],
  );

  // ============= Handle filter remove =============

  const handleFilterRemove = useCallback(
    (filter: { id: string }) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete(filter.id);

      try {
        removeFilterFromStorage({
          filterFields,
          filterId: filter.id,
          filtersStorageKey,
        });
      } catch {
        // localStorage not available
      }

      setSearchParams(newParams);
    },
    [searchParams, setSearchParams, filtersStorageKey, filterFields],
  );

  // ============= Active filters for chip display =============

  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  useEffect(() => {
    const loadActiveFilters = async () => {
      const result = await buildActiveFilters({
        filterFields,
        searchParams,
        searchUrlSlug,
      });
      setActiveFilters(result);
    };

    if (filterFields.length > 0) {
      loadActiveFilters();
    } else {
      setActiveFilters([]);
    }
  }, [searchParams, filterFields, searchUrlSlug]);

  // ============= Current filter values for FiltersDialog =============

  const [currentFilterValues, setCurrentFilterValues] = useState<Record<string, any>>({});

  useEffect(() => {
    const buildFormValues = async () => {
      try {
        const values = await buildCurrentFilterValues({
          filterFields,
          searchParams,
          searchUrlSlug,
        });
        setCurrentFilterValues(values);
      } catch (error) {
        console.error("[currentFilterValues] Error:", error);
        setCurrentFilterValues({});
      }
    };

    buildFormValues();
  }, [searchParams, filterFields, searchUrlSlug]);

  return {
    filters,
    activeFilters,
    currentFilterValues,
    handleFiltersApply,
    handleFilterRemove,
  };
}
