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
import { getDatabase } from "@breedhub/rxdb-store";
import type { FilterFieldConfig } from "@/types/field-config";
import {
  getLabelForValue,
  getValueForLabel,
  normalizeForUrl,
} from "@/components/space/utils/filter-url-helpers";

type FilterField = FilterFieldConfig;

interface MainFilterField {
  id: string;
  slug?: string;
  [key: string]: any;
}

interface ActiveFilter {
  id: string;
  label: string;
  isRequired: boolean;
  order: number;
}

// Helper to convert "Pet Type" → "Pet type" (sentence case)
function toSentenceCase(text: string): string {
  const words = text.split(" ");
  if (words.length === 0) return text;
  const firstWord =
    words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
  const otherWords = words.slice(1).map((w) => w.toLowerCase());
  return [firstWord, ...otherWords].join(" ");
}

interface UseFilterManagementOptions {
  searchParams: URLSearchParams;
  setSearchParams: (params: URLSearchParams, options?: { replace?: boolean }) => void;
  filterFields: FilterField[];
  mainFilterField: MainFilterField | null;
  mainFilterFields: MainFilterField[];
  searchUrlSlug: string | null;
  entitySchemaName: string;
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
  entitySchemaName,
  filtersStorageKey,
  initialSelectedEntityId,
  createMode,
}: UseFilterManagementOptions) {
  // ============= Build filters from URL =============

  const [filters, setFilters] = useState<Record<string, any> | undefined>(
    undefined,
  );

  useEffect(() => {
    const buildFilters = async () => {
      if (filterFields.length === 0 && !mainFilterField) {
        setFilters(undefined);
        return;
      }

      const filterObj: Record<string, any> = {};
      const reservedParams = ["sort", "view", "sortBy", "sortDir", "sortParam", "entity"];

      try {
        const rxdb = await getDatabase();

        // Wait for dictionaries collection to be ready
        let retries = 20;
        while (!rxdb.collections["dictionaries"] && retries > 0) {
          console.log(
            "[useFilterManagement] Waiting for dictionaries collection...",
          );
          await new Promise((resolve) => setTimeout(resolve, 100));
          retries--;
        }

        if (!rxdb.collections["dictionaries"]) {
          console.warn(
            "[useFilterManagement] Dictionaries collection not ready after retries",
          );
        }

        // Process all URL params
        const promises: Promise<void>[] = [];
        searchParams.forEach((urlValue, urlKey) => {
          if (!reservedParams.includes(urlKey) && urlValue) {
            promises.push(
              (async () => {
                let fieldConfig = filterFields.find((f) => f.slug === urlKey);
                if (!fieldConfig) {
                  fieldConfig = filterFields.find((f) => f.id === urlKey);
                }

                // If not found in filterFields, check if it's the search URL slug
                if (!fieldConfig && searchUrlSlug && urlKey === searchUrlSlug) {
                  if (mainFilterFields.length > 1) {
                    for (const field of mainFilterFields) {
                      filterObj[field.id] = urlValue;
                    }
                  } else if (mainFilterField) {
                    filterObj[mainFilterField.id] = urlValue;
                  }
                  return;
                }

                if (fieldConfig) {
                  const valueId = await getValueForLabel(
                    fieldConfig,
                    urlValue,
                    rxdb as any,
                  );
                  filterObj[fieldConfig.id] = valueId || urlValue;
                }
              })(),
            );
          }
        });

        await Promise.all(promises);

        const finalFilters =
          Object.keys(filterObj).length > 0 ? filterObj : undefined;
        setFilters(finalFilters);
      } catch (error) {
        console.error("[useFilterManagement] Error building filters:", error);
        setFilters(undefined);
      }
    };

    buildFilters();
  }, [
    searchParams,
    filterFields,
    mainFilterField,
    mainFilterFields,
    searchUrlSlug,
    entitySchemaName,
  ]);

  // ============= Apply saved filters from localStorage =============

  const hasAppliedSavedFilters = useRef(false);
  useEffect(() => {
    if (hasAppliedSavedFilters.current || initialSelectedEntityId || createMode) return;
    if (filterFields.length === 0) return;

    const reservedParams = ["sort", "view", "sortBy", "sortDir", "sortParam"];

    let hasFilterParams = false;
    searchParams.forEach((_, key) => {
      if (!reservedParams.includes(key)) {
        hasFilterParams = true;
      }
    });

    if (hasFilterParams) {
      hasAppliedSavedFilters.current = true;
      return;
    }

    try {
      const savedFilters = localStorage.getItem(filtersStorageKey);
      if (savedFilters) {
        const parsedFilters = JSON.parse(savedFilters) as Record<string, string>;

        const applyFilters = async () => {
          const newParams = new URLSearchParams(searchParams);
          const rxdb = await getDatabase();

          for (const [fieldId, value] of Object.entries(parsedFilters)) {
            if (value) {
              const fieldConfig = filterFields.find((f) => f.id === fieldId);
              const urlKey = fieldConfig?.slug || fieldId;
              const label = await getLabelForValue(fieldConfig, value, rxdb as any);
              const normalizedLabel = normalizeForUrl(label);
              newParams.set(urlKey, normalizedLabel);
            }
          }

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
  ]);

  // ============= Handle filter apply =============

  const handleFiltersApply = useCallback(
    async (filterValues: Record<string, any>) => {
      const newParams = new URLSearchParams(searchParams);

      try {
        const rxdb = await getDatabase();

        for (const [fieldId, value] of Object.entries(filterValues)) {
          if (value !== undefined && value !== null && value !== "") {
            const fieldConfig = filterFields.find((f) => f.id === fieldId);
            const urlKey = fieldConfig?.slug || fieldId;
            const label = await getLabelForValue(fieldConfig, value, rxdb as any);
            const normalizedLabel = normalizeForUrl(label);
            newParams.set(urlKey, normalizedLabel);
          } else {
            const fieldConfig = filterFields.find((f) => f.id === fieldId);
            if (fieldConfig?.slug) {
              newParams.delete(fieldConfig.slug);
            }
            newParams.delete(fieldId);
          }
        }

        // Persist to localStorage
        try {
          const filtersToStore: Record<string, string> = {};
          for (const [fieldId, value] of Object.entries(filterValues)) {
            if (value !== undefined && value !== null && value !== "") {
              filtersToStore[fieldId] = String(value);
            }
          }
          if (Object.keys(filtersToStore).length > 0) {
            localStorage.setItem(filtersStorageKey, JSON.stringify(filtersToStore));
          } else {
            localStorage.removeItem(filtersStorageKey);
          }
        } catch {
          // localStorage not available
        }

        setSearchParams(newParams);
      } catch (error) {
        console.error("[handleFiltersApply] Error:", error);
        Object.entries(filterValues).forEach(([fieldId, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            const fieldConfig = filterFields.find((f) => f.id === fieldId);
            const urlKey = fieldConfig?.slug || fieldId;
            newParams.set(urlKey, String(value));
          }
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
        const savedFilters = localStorage.getItem(filtersStorageKey);
        if (savedFilters) {
          const parsedFilters = JSON.parse(savedFilters) as Record<string, string>;
          const fieldConfig = filterFields.find(
            (f) => f.slug === filter.id || f.id === filter.id,
          );
          const fieldId = fieldConfig?.id || filter.id;
          delete parsedFilters[fieldId];

          if (Object.keys(parsedFilters).length > 0) {
            localStorage.setItem(filtersStorageKey, JSON.stringify(parsedFilters));
          } else {
            localStorage.removeItem(filtersStorageKey);
          }
        }
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
      const result: ActiveFilter[] = [];
      const reservedParams = ["sort", "view", "sortBy", "sortDir", "sortParam", "entity"];

      const rxdb = await getDatabase();

      let retries = 20;
      while (!rxdb.collections["dictionaries"] && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        retries--;
      }

      for (const [key, urlValue] of searchParams.entries()) {
        if (!reservedParams.includes(key) && urlValue) {
          if (searchUrlSlug && key === searchUrlSlug) continue;

          let fieldConfig = filterFields.find((f) => f.slug === key);
          if (!fieldConfig) {
            fieldConfig = filterFields.find((f) => f.id === key);
          }

          const displayName = fieldConfig
            ? toSentenceCase(fieldConfig.displayName)
            : key;

          let displayValue = urlValue;
          if (fieldConfig?.referencedTable) {
            const isUUID =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                urlValue,
              );

            if (isUUID) {
              const label = await getLabelForValue(fieldConfig, urlValue, rxdb as any);
              displayValue = label;
            } else {
              const valueId = await getValueForLabel(fieldConfig, urlValue, rxdb as any);
              if (valueId) {
                const label = await getLabelForValue(fieldConfig, valueId, rxdb as any);
                displayValue = label;
              }
            }
          }

          result.push({
            id: key,
            label: `${displayName}: ${displayValue}`,
            isRequired: fieldConfig?.required ?? false,
            order: fieldConfig?.order ?? 999,
          });
        }
      }

      result.sort((a, b) => a.order - b.order);
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
      if (filterFields.length === 0) {
        setCurrentFilterValues({});
        return;
      }

      const values: Record<string, any> = {};
      const reservedParams = ["sort", "view", "sortBy", "sortDir", "sortParam", "entity"];

      try {
        const rxdb = await getDatabase();

        let retries = 20;
        while (!rxdb.collections["dictionaries"] && retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          retries--;
        }

        const promises: Promise<void>[] = [];
        searchParams.forEach((urlValue, urlKey) => {
          if (!reservedParams.includes(urlKey) && urlValue) {
            promises.push(
              (async () => {
                if (searchUrlSlug && urlKey === searchUrlSlug) return;

                let fieldConfig = filterFields.find((f) => f.slug === urlKey);
                if (!fieldConfig) {
                  fieldConfig = filterFields.find((f) => f.id === urlKey);
                }

                if (fieldConfig) {
                  const valueId = await getValueForLabel(fieldConfig, urlValue, rxdb as any);
                  values[fieldConfig.id] = valueId || urlValue;
                }
              })(),
            );
          }
        });

        await Promise.all(promises);
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
