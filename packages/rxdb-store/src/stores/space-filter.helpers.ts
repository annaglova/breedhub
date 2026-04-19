import { addFieldPrefix } from "../utils/field-normalization";
import * as F from "../utils/filter-builder";

export interface ResolvedFieldFilter {
  fieldConfig: any;
  fieldType: string;
  operator: string;
}

interface FilterResolutionOptions {
  entityType?: string;
  preferStringSearchOperator?: boolean;
}

interface StringFilterOptions extends FilterResolutionOptions {
  requireSearchOperator?: boolean;
}

interface FilterApplicationOptions extends FilterResolutionOptions {
  skipKeys?: string[];
}

export interface PreparedFiltersWithDefaults {
  filters: Record<string, any>;
  fieldConfigs: Record<string, any>;
}

export interface HybridSearchPlan {
  searchValue: any;
  orSearchFields: string[];
  isOrSearch: boolean;
  otherFilters: Record<string, any>;
  startsWithLimit: number;
}

export function hasFilterValue(value: any): boolean {
  return value !== undefined && value !== null && value !== "";
}

export function prepareFiltersWithDefaults(
  filters: Record<string, any>,
  defaultFilters: Record<string, any> = {},
  baseFieldConfigs: Record<string, any> = {},
): PreparedFiltersWithDefaults {
  const preparedFilters = { ...defaultFilters, ...filters };
  const preparedFieldConfigs = { ...baseFieldConfigs };

  for (const key of Object.keys(defaultFilters)) {
    if (!preparedFieldConfigs[key]) {
      preparedFieldConfigs[key] = { fieldType: "uuid", operator: "eq" };
    }
  }

  return {
    filters: preparedFilters,
    fieldConfigs: preparedFieldConfigs,
  };
}

export function getActiveFilterEntries(
  filters: Record<string, any>,
): Array<[string, any]> {
  return Object.entries(filters).filter(([, value]) => hasFilterValue(value));
}

export function resolveFieldConfig(
  fieldConfigs: Record<string, any>,
  fieldKey: string,
  entityType?: string,
): any {
  const directConfig = fieldConfigs[fieldKey];
  if (directConfig) {
    return directConfig;
  }

  if (!entityType) {
    return undefined;
  }

  const prefixedKey = addFieldPrefix(fieldKey, entityType);
  return fieldConfigs[prefixedKey];
}

export function resolveFieldFilter(
  fieldConfigs: Record<string, any>,
  fieldKey: string,
  options: FilterResolutionOptions = {},
): ResolvedFieldFilter {
  const fieldConfig =
    resolveFieldConfig(fieldConfigs, fieldKey, options.entityType) || {};
  const fieldType = fieldConfig.fieldType || "string";

  let configOperator = fieldConfig.operator;
  if (
    options.preferStringSearchOperator &&
    (fieldType === "string" || fieldType === "text") &&
    configOperator === "eq"
  ) {
    configOperator = undefined;
  }

  return {
    fieldConfig,
    fieldType,
    operator: F.detectOperator(fieldType, configOperator),
  };
}

export function getStringSearchFilters(
  filters: Record<string, any>,
  fieldConfigs: Record<string, any>,
  options: StringFilterOptions = {},
): Array<[string, any]> {
  return getActiveFilterEntries(filters).filter(([fieldKey]) => {
    const { fieldType, operator } = resolveFieldFilter(
      fieldConfigs,
      fieldKey,
      options,
    );

    if (fieldType !== "string" && fieldType !== "text") {
      return false;
    }

    if (options.requireSearchOperator) {
      return operator === "contains" || operator === "ilike";
    }

    return true;
  });
}

export function buildHybridSearchPlan(
  filters: Record<string, any>,
  fieldConfigs: Record<string, any>,
  limit: number,
): HybridSearchPlan | null {
  const searchFilters = getStringSearchFilters(filters, fieldConfigs, {
    requireSearchOperator: true,
  });

  if (searchFilters.length === 0) {
    return null;
  }

  const firstSearchValue = searchFilters[0][1];
  const orSearchFields = searchFilters
    .filter(([, value]) => value === firstSearchValue)
    .map(([fieldKey]) => fieldKey);

  return {
    searchValue: firstSearchValue,
    orSearchFields,
    isOrSearch: orSearchFields.length > 1,
    otherFilters: Object.fromEntries(
      getActiveFilterEntries(filters).filter(
        ([key]) => !orSearchFields.includes(key),
      ),
    ),
    startsWithLimit: Math.ceil(limit * 0.7),
  };
}

export function applyFiltersToRxdbSelector(
  selector: any,
  filters: Record<string, any>,
  fieldConfigs: Record<string, any>,
  options: FilterApplicationOptions = {},
): void {
  const skipped = new Set(options.skipKeys || []);

  for (const [fieldKey, value] of getActiveFilterEntries(filters)) {
    if (skipped.has(fieldKey)) {
      continue;
    }

    const { fieldConfig, operator } = resolveFieldFilter(
      fieldConfigs,
      fieldKey,
      options,
    );

    F.applyFilterToRxDBSelector(selector, fieldKey, operator, value, fieldConfig);
  }
}

export function buildRxdbCountSelector(
  filters: Record<string, any>,
  fieldConfigs: Record<string, any>,
  options: FilterApplicationOptions = {},
): Record<string, any> {
  const selector: Record<string, any> = { _deleted: false };

  applyFiltersToRxdbSelector(selector, filters, fieldConfigs, options);

  return selector;
}

export function applyFiltersToSupabaseQuery<TQuery>(
  query: TQuery,
  filters: Record<string, any>,
  fieldConfigs: Record<string, any>,
  options: FilterApplicationOptions = {},
): TQuery {
  const skipped = new Set(options.skipKeys || []);
  let nextQuery = query;

  for (const [fieldKey, value] of getActiveFilterEntries(filters)) {
    if (skipped.has(fieldKey)) {
      continue;
    }

    const { fieldConfig, operator } = resolveFieldFilter(
      fieldConfigs,
      fieldKey,
      options,
    );

    nextQuery = F.applySupabaseFilterWithOrFields(
      nextQuery,
      fieldKey,
      operator,
      value,
      fieldConfig,
    );
  }

  return nextQuery;
}
