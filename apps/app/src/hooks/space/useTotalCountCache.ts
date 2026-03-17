/**
 * useTotalCountCache - Caches totalCount to localStorage with TTL.
 *
 * - Sets isInitialLoad=false after first data load
 * - Updates totalCount from data.total
 * - Caches to localStorage with 14-day TTL
 * - Supports totalFilterKey for filter-specific caching (e.g., pet_type_id for pets)
 *
 * Extracted from SpaceComponent.
 */
import { useEffect, useState } from "react";

interface UseTotalCountCacheOptions {
  data: { entities?: any[]; total?: number } | null | undefined;
  isLoading: boolean;
  searchParams: URLSearchParams;
  entitySchemaName: string;
  totalFilterKey?: string;
  filters?: Record<string, any>;
}

const TOTAL_COUNT_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

const RESERVED_PARAMS = [
  "sort",
  "view",
  "sortBy",
  "sortDir",
  "sortParam",
  "type",
];

export function useTotalCountCache({
  data,
  isLoading,
  searchParams,
  entitySchemaName,
  totalFilterKey,
  filters,
}: UseTotalCountCacheOptions) {
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (data?.entities && !isLoading) {
      setIsInitialLoad(false);

      if (data.total) {
        setTotalCount(data.total);

        // Save totalCount to localStorage ONLY on first load (not during pagination)
        // For spaces with totalFilterKey, save with filter-specific key
        const totalFilterValue =
          totalFilterKey && filters ? filters[totalFilterKey] : null;

        // Exclude totalFilterKey from "hasFilters" check
        const filterParams = totalFilterKey
          ? [...RESERVED_PARAMS, totalFilterKey]
          : RESERVED_PARAMS;
        const hasOtherFilters = Array.from(searchParams.keys()).some(
          (key) => !filterParams.includes(key),
        );

        // For spaces with totalFilterKey: allow caching when only that filter is applied
        // For spaces without: only cache when no filters
        const canCache = totalFilterKey
          ? totalFilterValue && !hasOtherFilters
          : !hasOtherFilters;

        if (canCache) {
          try {
            const cacheKey =
              totalFilterKey && totalFilterValue
                ? `totalCount_${entitySchemaName}_${totalFilterKey}_${totalFilterValue}`
                : `totalCount_${entitySchemaName}`;
            const cached = localStorage.getItem(cacheKey);

            let cachedTotal = 0;
            let cacheExpired = false;

            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                if (
                  typeof parsed === "object" &&
                  parsed.value &&
                  parsed.timestamp
                ) {
                  const age = Date.now() - parsed.timestamp;
                  if (age < TOTAL_COUNT_TTL_MS && parsed.value > 0) {
                    cachedTotal = parsed.value;
                  } else {
                    cacheExpired = true;
                  }
                }
              } catch {
                cacheExpired = true;
              }
            }

            const isRealTotal = data.total > data.entities.length;
            const shouldSave =
              (cachedTotal === 0 || cacheExpired) && isRealTotal;

            if (shouldSave) {
              const cacheData = { value: data.total, timestamp: Date.now() };
              localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            }
          } catch (e) {
            console.warn("Failed to cache totalCount:", e);
          }
        }
      }
    }
  }, [
    data,
    isLoading,
    searchParams,
    entitySchemaName,
    totalFilterKey,
    filters,
  ]);

  return { totalCount, isInitialLoad };
}
