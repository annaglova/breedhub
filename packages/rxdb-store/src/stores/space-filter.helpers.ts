import { addFieldPrefix } from "../utils/field-normalization";
import * as F from "../utils/filter-builder";
import {
  analyzeCachedIdsByUpdatedAt,
  cacheAndMergeOrderedRecordsByIds,
  mapDocsToRecordMap,
  type BulkUpsertCollection,
} from "./space-id-cache.helpers";

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

export type HybridSearchPhase = "starts_with" | "contains";

export interface HybridSearchRecord {
  id: string;
  [key: string]: any;
}

export interface OfflineFilterFlowResult<TRecord = any> {
  records: TRecord[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
  offline: true;
}

export interface OfflineFilterQueryResult<TRecord = any> {
  records: TRecord[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface HydrateFilteredEntitiesCollection<
  TRecord,
  TCachedRecord = any,
> extends BulkUpsertCollection<TCachedRecord> {
  find(options: {
    selector: Record<string, any>;
  }): {
    exec(): Promise<Array<{ id: string; toJSON(): unknown }>>;
  };
}

export interface HydrateFilteredEntitiesOptions<
  TRecord extends { id: string; updated_at?: string },
  TCachedRecord = any,
> {
  ids: string[];
  idsData: Array<{ id: string; updated_at?: string }>;
  limit: number;
  nextCursor: string | null;
  collection: HydrateFilteredEntitiesCollection<TRecord, TCachedRecord>;
  fetchRecords: (ids: string[]) => Promise<TRecord[]>;
  mapRecordForCache?: (record: TRecord) => TCachedRecord;
  logLabels?: HydrateFilteredEntitiesLogLabels;
}

export interface HydrateFilteredEntitiesResult<TRecord = any> {
  records: TRecord[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface HydrateFilteredEntitiesLogLabels {
  cacheTitle?: string;
  recordNoun?: string;
  cachedFreshDescriptor?: string;
}

export interface ExecuteOfflineFilterFlowOptions<
  TSelector = any,
  TRecord = any,
> {
  entityType: string;
  filters: Record<string, any>;
  fieldConfigs: Record<string, any>;
  runLocalQuery: () => Promise<OfflineFilterQueryResult<TRecord>>;
  buildCountSelector: (
    filters: Record<string, any>,
    fieldConfigs: Record<string, any>,
    options: FilterApplicationOptions,
  ) => TSelector;
  countByCollection: (selector: TSelector) => Promise<number>;
  logPrefix?: string;
  catchLogPrefix?: string;
  countSelectorExtraOptions?: Partial<FilterApplicationOptions>;
}

export interface HybridBaseQuery<TQuery> {
  or(condition: string): TQuery;
}

export interface HybridBaseQuerySource<TQuery> {
  select(columns: string): TQuery;
}

export interface HybridBaseQueryClient<TQuery extends HybridBaseQuery<TQuery>> {
  from(sourceName: string): HybridBaseQuerySource<TQuery>;
}

export interface HybridSearchPhaseQuery<TQuery> {
  or(condition: string): TQuery;
  ilike(column: string, pattern: string): TQuery;
  not(column: string, operator: string, value: any): TQuery;
}

interface BuildHybridSearchPhaseQueryOptions extends FilterApplicationOptions {
  phase: HybridSearchPhase;
  fieldConfigs: Record<string, any>;
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

export function buildHybridBaseQuery<
  TQuery extends HybridBaseQuery<TQuery>,
>(
  client: HybridBaseQueryClient<TQuery>,
  sourceName: string,
  selectFields: string,
): TQuery {
  return client
    .from(sourceName)
    .select(selectFields)
    .or("deleted.is.null,deleted.eq.false");
}

export function buildHybridSearchPhaseQuery<
  TQuery extends HybridSearchPhaseQuery<TQuery>,
>(
  query: TQuery,
  plan: HybridSearchPlan,
  {
    phase,
    fieldConfigs,
    ...filterOptions
  }: BuildHybridSearchPhaseQueryOptions,
): TQuery {
  let nextQuery = query;
  const [primarySearchField] = plan.orSearchFields;

  if (plan.isOrSearch) {
    const searchPattern =
      phase === "starts_with"
        ? `${plan.searchValue}%`
        : `%${plan.searchValue}%`;

    const orCondition = plan.orSearchFields
      .map((field) => `${field}.ilike.${searchPattern}`)
      .join(",");

    nextQuery = nextQuery.or(orCondition);
  } else if (primarySearchField) {
    if (phase === "starts_with") {
      nextQuery = nextQuery.ilike(
        primarySearchField,
        `${plan.searchValue}%`,
      );
    } else {
      nextQuery = nextQuery
        .ilike(primarySearchField, `%${plan.searchValue}%`)
        .not(primarySearchField, "ilike", `${plan.searchValue}%`);
    }
  }

  return applyFiltersToSupabaseQuery(
    nextQuery,
    plan.otherFilters,
    fieldConfigs,
    filterOptions,
  );
}

export function mergeHybridPhaseResults<TRecord extends HybridSearchRecord>(
  startsWithResults: TRecord[],
  containsResults: TRecord[],
  limit: number,
): TRecord[] {
  if (startsWithResults.length >= limit || containsResults.length === 0) {
    return startsWithResults.slice(0, limit);
  }

  const startsWithIds = new Set(startsWithResults.map((record) => record.id));
  const uniqueContainsResults = containsResults.filter(
    (record) => !startsWithIds.has(record.id),
  );

  return [...startsWithResults, ...uniqueContainsResults].slice(0, limit);
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

export async function hydrateFilteredEntities<
  TRecord extends { id: string; updated_at?: string },
  TCachedRecord = any,
>(
  options: HydrateFilteredEntitiesOptions<TRecord, TCachedRecord>,
): Promise<HydrateFilteredEntitiesResult<TRecord>> {
  const cacheTitle = options.logLabels?.cacheTitle || "Cache";
  const recordNoun = options.logLabels?.recordNoun || "records";
  const cachedFreshDescriptor =
    options.logLabels?.cachedFreshDescriptor || "fresh records in RxDB";

  const cached = await options.collection.find({
    selector: { id: { $in: options.ids } },
  }).exec();

  const cachedMap = mapDocsToRecordMap<TRecord>(cached);
  const { missingIds, staleIds, toFetchIds } = analyzeCachedIdsByUpdatedAt(
    options.ids,
    cachedMap,
    options.idsData,
  );
  console.log(
    `[SpaceStore] 📦 ${cacheTitle}: ${cachedMap.size}/${options.ids.length} hit, ${missingIds.length} missing, ${staleIds.length} stale`,
  );

  let freshRecords: TRecord[] = [];
  if (toFetchIds.length > 0) {
    console.log(
      `[SpaceStore] 🌐 Phase 3: Fetching ${toFetchIds.length} ${recordNoun} (${missingIds.length} missing + ${staleIds.length} stale)...`,
    );

    freshRecords = await options.fetchRecords(toFetchIds);

    console.log(
      `[SpaceStore] ✅ Fetched ${freshRecords.length} fresh ${recordNoun}`,
    );
  }

  const hydrationResult = await cacheAndMergeOrderedRecordsByIds(
    options.ids,
    cachedMap,
    freshRecords,
    {
      collection: options.collection,
      mapFreshRecordForCache: options.mapRecordForCache,
    },
  );

  if (hydrationResult.cachedRecordsCount > 0) {
    console.log(
      `[SpaceStore] 💾 Cached ${hydrationResult.cachedRecordsCount} ${cachedFreshDescriptor}`,
    );
  }

  const hasMore = options.ids.length >= options.limit;
  console.log(
    `[SpaceStore] ✅ Returning ${hydrationResult.orderedRecords.length} ${recordNoun} (hasMore: ${hasMore})`,
  );

  return {
    records: hydrationResult.orderedRecords,
    total: hydrationResult.orderedRecords.length,
    hasMore,
    nextCursor: options.nextCursor,
  };
}

export async function executeOfflineFilterFlow<
  TSelector = any,
  TRecord = any,
>(
  options: ExecuteOfflineFilterFlowOptions<TSelector, TRecord>,
): Promise<OfflineFilterFlowResult<TRecord>> {
  const logPrefix = options.logPrefix || "Offline mode (preventive)";
  const catchLogPrefix = options.catchLogPrefix || "Offline mode failed:";

  try {
    const localQuery = await options.runLocalQuery();
    const localResults = localQuery.records;
    const countSelector = options.buildCountSelector(
      options.filters,
      options.fieldConfigs,
      {
        entityType: options.entityType,
        ...options.countSelectorExtraOptions,
      },
    );
    const totalCount = await options.countByCollection(countSelector);
    const hasMore = localQuery.hasMore;
    const nextCursor = localQuery.nextCursor;

    console.log(
      `[SpaceStore] 📴 ${logPrefix}: returning ${localResults.length}/${totalCount} records (hasMore: ${hasMore})`,
    );

    return {
      records: localResults,
      total: totalCount,
      hasMore,
      nextCursor,
      offline: true,
    };
  } catch (error) {
    console.error(`[SpaceStore] ${catchLogPrefix}`, error);
    return {
      records: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
      offline: true,
    };
  }
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
