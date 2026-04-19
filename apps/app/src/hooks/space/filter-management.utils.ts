import { getDatabase } from "@breedhub/rxdb-store";
import type { FilterFieldConfig } from "@/types/field-config";
import {
  getLabelForValue,
  getValueForLabel,
  normalizeForUrl,
} from "@/components/space/utils/filter-url-helpers";
import {
  FILTER_BUILD_RESERVED_QUERY_PARAMS,
  FILTER_RESERVED_QUERY_PARAMS,
  hasUnreservedSearchParams,
  readStorageValue,
  removeStorageValue,
  writeStorageValue,
} from "./space-query.utils";

export type FilterField = FilterFieldConfig;

export interface MainFilterField {
  id: string;
  slug?: string;
  [key: string]: any;
}

export interface ActiveFilter {
  id: string;
  label: string;
  isRequired: boolean;
  order: number;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toSentenceCase(text: string): string {
  const words = text.split(" ");
  if (words.length === 0) return text;

  const firstWord =
    words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
  const otherWords = words.slice(1).map((word) => word.toLowerCase());

  return [firstWord, ...otherWords].join(" ");
}

function findFilterField(
  filterFields: FilterField[],
  urlKey: string,
): FilterField | undefined {
  return (
    filterFields.find((field) => field.slug === urlKey) ||
    filterFields.find((field) => field.id === urlKey)
  );
}

async function getFilterLookupDatabase() {
  const rxdb = await getDatabase();

  let retries = 20;
  while (!rxdb.collections["dictionaries"] && retries > 0) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    retries--;
  }

  if (!rxdb.collections["dictionaries"]) {
    console.warn(
      "[filter-management] Dictionaries collection not ready after retries",
    );
  }

  return rxdb;
}

export function hasFilterSearchParams(searchParams: URLSearchParams): boolean {
  return hasUnreservedSearchParams(searchParams, FILTER_RESERVED_QUERY_PARAMS);
}

export async function buildFiltersFromSearchParams({
  filterFields,
  mainFilterField,
  mainFilterFields,
  searchParams,
  searchUrlSlug,
}: {
  filterFields: FilterField[];
  mainFilterField: MainFilterField | null;
  mainFilterFields: MainFilterField[];
  searchParams: URLSearchParams;
  searchUrlSlug: string | null;
}): Promise<Record<string, any> | undefined> {
  if (filterFields.length === 0 && !mainFilterField) {
    return undefined;
  }

  const filterObj: Record<string, any> = {};
  const rxdb = await getFilterLookupDatabase();
  const promises: Promise<void>[] = [];

  searchParams.forEach((urlValue, urlKey) => {
    if (FILTER_BUILD_RESERVED_QUERY_PARAMS.includes(urlKey) || !urlValue) {
      return;
    }

    promises.push(
      (async () => {
        const fieldConfig = findFilterField(filterFields, urlKey);

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

        if (!fieldConfig) {
          return;
        }

        const valueId = await getValueForLabel(fieldConfig, urlValue, rxdb as any);
        filterObj[fieldConfig.id] = valueId || urlValue;
      })(),
    );
  });

  await Promise.all(promises);

  return Object.keys(filterObj).length > 0 ? filterObj : undefined;
}

export async function buildSearchParamsWithResolvedFilters({
  filterFields,
  filterValues,
  searchParams,
}: {
  filterFields: FilterField[];
  filterValues: Record<string, any>;
  searchParams: URLSearchParams;
}): Promise<URLSearchParams> {
  const newParams = new URLSearchParams(searchParams);
  const rxdb = await getFilterLookupDatabase();

  for (const [fieldId, value] of Object.entries(filterValues)) {
    const fieldConfig = filterFields.find((field) => field.id === fieldId);

    if (value !== undefined && value !== null && value !== "") {
      const urlKey = fieldConfig?.slug || fieldId;
      const label = await getLabelForValue(fieldConfig, String(value), rxdb as any);
      newParams.set(urlKey, normalizeForUrl(label));
      continue;
    }

    if (fieldConfig?.slug) {
      newParams.delete(fieldConfig.slug);
    }
    newParams.delete(fieldId);
  }

  return newParams;
}

export function applyRawFilterValuesToSearchParams({
  filterFields,
  filterValues,
  searchParams,
}: {
  filterFields: FilterField[];
  filterValues: Record<string, any>;
  searchParams: URLSearchParams;
}): URLSearchParams {
  const newParams = new URLSearchParams(searchParams);

  for (const [fieldId, value] of Object.entries(filterValues)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    const fieldConfig = filterFields.find((field) => field.id === fieldId);
    const urlKey = fieldConfig?.slug || fieldId;
    newParams.set(urlKey, String(value));
  }

  return newParams;
}

export function persistFilterValues(
  filtersStorageKey: string,
  filterValues: Record<string, any>,
) {
  const filtersToStore: Record<string, string> = {};

  for (const [fieldId, value] of Object.entries(filterValues)) {
    if (value !== undefined && value !== null && value !== "") {
      filtersToStore[fieldId] = String(value);
    }
  }

  if (Object.keys(filtersToStore).length > 0) {
    writeStorageValue(filtersStorageKey, JSON.stringify(filtersToStore));
  } else {
    removeStorageValue(filtersStorageKey);
  }
}

export function removeFilterFromStorage({
  filterFields,
  filterId,
  filtersStorageKey,
}: {
  filterFields: FilterField[];
  filterId: string;
  filtersStorageKey: string;
}) {
  const savedFilters = readStorageValue(filtersStorageKey);
  if (!savedFilters) {
    return;
  }

  const parsedFilters = JSON.parse(savedFilters) as Record<string, string>;
  const fieldConfig = findFilterField(filterFields, filterId);
  const fieldId = fieldConfig?.id || filterId;

  delete parsedFilters[fieldId];

  if (Object.keys(parsedFilters).length > 0) {
    writeStorageValue(filtersStorageKey, JSON.stringify(parsedFilters));
  } else {
    removeStorageValue(filtersStorageKey);
  }
}

export async function buildActiveFilters({
  filterFields,
  searchParams,
  searchUrlSlug,
}: {
  filterFields: FilterField[];
  searchParams: URLSearchParams;
  searchUrlSlug: string | null;
}): Promise<ActiveFilter[]> {
  const result: ActiveFilter[] = [];
  const rxdb = await getFilterLookupDatabase();

  for (const [key, urlValue] of searchParams.entries()) {
    if (FILTER_BUILD_RESERVED_QUERY_PARAMS.includes(key) || !urlValue) {
      continue;
    }

    if (searchUrlSlug && key === searchUrlSlug) {
      continue;
    }

    const fieldConfig = findFilterField(filterFields, key);
    const displayName = fieldConfig ? toSentenceCase(fieldConfig.displayName) : key;

    let displayValue = urlValue;
    if (fieldConfig?.referencedTable) {
      if (UUID_PATTERN.test(urlValue)) {
        displayValue = await getLabelForValue(fieldConfig, urlValue, rxdb as any);
      } else {
        const valueId = await getValueForLabel(fieldConfig, urlValue, rxdb as any);
        if (valueId) {
          displayValue = await getLabelForValue(fieldConfig, valueId, rxdb as any);
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

  return result.sort((a, b) => a.order - b.order);
}

export async function buildCurrentFilterValues({
  filterFields,
  searchParams,
  searchUrlSlug,
}: {
  filterFields: FilterField[];
  searchParams: URLSearchParams;
  searchUrlSlug: string | null;
}): Promise<Record<string, any>> {
  if (filterFields.length === 0) {
    return {};
  }

  const values: Record<string, any> = {};
  const rxdb = await getFilterLookupDatabase();
  const promises: Promise<void>[] = [];

  searchParams.forEach((urlValue, urlKey) => {
    if (FILTER_BUILD_RESERVED_QUERY_PARAMS.includes(urlKey) || !urlValue) {
      return;
    }

    promises.push(
      (async () => {
        if (searchUrlSlug && urlKey === searchUrlSlug) {
          return;
        }

        const fieldConfig = findFilterField(filterFields, urlKey);
        if (!fieldConfig) {
          return;
        }

        const valueId = await getValueForLabel(fieldConfig, urlValue, rxdb as any);
        values[fieldConfig.id] = valueId || urlValue;
      })(),
    );
  });

  await Promise.all(promises);
  return values;
}
