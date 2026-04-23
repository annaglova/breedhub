import { addFieldPrefix } from "../utils/field-normalization";
import * as F from "../utils/filter-builder";
import type {
  FilterBuilderFieldConfig,
  FilterOperator,
  RxDBSelectorLike,
} from "../utils/filter-builder";
import { isNetworkError } from "../helpers";
import {
  analyzeCachedIdsByUpdatedAt,
  cacheAndMergeOrderedRecordsByIds,
  mapDocsToRecordMap,
  type BulkUpsertCollection,
} from "./space-id-cache.helpers";
import {
  applySupabaseKeysetCursor,
  applySupabaseOrderBy,
  getSelectFieldsForOrderBy,
  parseKeysetCursor,
  type KeysetOrderBy,
} from "./space-keyset.helpers";
import type {
  FieldConfig,
  SpaceFilterField,
  SpaceFilterFieldConfig,
} from "./space-config.helpers";

export type FilterScalar = string | number | boolean | null;
export type FilterValue =
  | FilterScalar
  | FilterScalar[]
  | Record<string, unknown>
  | unknown[]
  | undefined;
export type FilterMap = Record<string, unknown>;

export interface FilterFieldConfigBag extends FilterBuilderFieldConfig {
  fieldType?: string;
  operator?: string;
  [key: string]: unknown;
}

export type ReusedFilterFieldConfig =
  | FieldConfig
  | SpaceFilterField
  | SpaceFilterFieldConfig
  | FilterFieldConfigBag;

export type FilterFieldConfigMap = Record<string, unknown>;

export interface SupabaseQueryResult<TRecord> {
  data?: TRecord[] | null;
  error?: unknown;
}

export interface SupabaseExecutableQuery<TRecord extends Record<string, unknown>>
  extends SupabaseQueryResult<TRecord> {
  or(condition: string): SupabaseExecutableQuery<TRecord>;
  ilike(column: string, pattern: string): SupabaseExecutableQuery<TRecord>;
  not(
    column: string,
    operator: string,
    value: unknown,
  ): SupabaseExecutableQuery<TRecord>;
  eq(column: string, value: unknown): SupabaseExecutableQuery<TRecord>;
  order(
    column: string,
    options: { ascending: boolean; nullsFirst: boolean },
  ): SupabaseExecutableQuery<TRecord>;
  limit(limit: number): SupabaseExecutableQuery<TRecord>;
}

interface SupabaseSelectSource<TQuery> {
  select(columns: string): TQuery;
}

interface SupabaseClientForQuery<TQuery> {
  from(sourceName: string): SupabaseSelectSource<TQuery>;
}

export interface HydratableEntityRecord extends Record<string, unknown> {
  id: string;
  updated_at?: string;
}

export interface ResolvedFieldFilter {
  fieldConfig: FilterFieldConfigBag;
  fieldType: string;
  operator: FilterOperator;
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
  filters: FilterMap;
  fieldConfigs: FilterFieldConfigMap;
}

export interface HybridSearchPlan {
  searchValue: unknown;
  orSearchFields: string[];
  isOrSearch: boolean;
  otherFilters: FilterMap;
  startsWithLimit: number;
}

export type HybridSearchPhase = "starts_with" | "contains";

export interface HybridSearchRecord extends Record<string, unknown> {
  id: string;
}

export interface OfflineFilterFlowResult<
  TRecord extends Record<string, unknown> = Record<string, unknown>,
> {
  records: TRecord[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
  offline: true;
}

export interface OfflineFilterQueryResult<
  TRecord extends Record<string, unknown> = Record<string, unknown>,
> {
  records: TRecord[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface HydrateFilteredEntitiesCollection<
  TRecord extends HydratableEntityRecord,
  TCachedRecord = TRecord,
> extends BulkUpsertCollection<TCachedRecord> {
  find(options: {
    selector: RxDBSelectorLike;
  }): {
    exec(): Promise<Array<{ id: string; toJSON(): unknown }>>;
  };
}

export interface HydrateFilteredEntitiesOptions<
  TRecord extends HydratableEntityRecord,
  TCachedRecord = TRecord,
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

export interface HydrateFilteredEntitiesResult<
  TRecord extends Record<string, unknown> = Record<string, unknown>,
> {
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
  TSelector extends Record<string, unknown> = RxDBSelectorLike,
  TRecord extends Record<string, unknown> = Record<string, unknown>,
> {
  entityType: string;
  filters: FilterMap;
  fieldConfigs: FilterFieldConfigMap;
  runLocalQuery: () => Promise<OfflineFilterQueryResult<TRecord>>;
  buildCountSelector: (
    filters: FilterMap,
    fieldConfigs: FilterFieldConfigMap,
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
  not(column: string, operator: string, value: unknown): TQuery;
}

export interface ExecuteHybridSearchOptions {
  supabase: unknown;
  sourceName: string;
  hybridSearchPlan: HybridSearchPlan;
  fieldConfigs: FilterFieldConfigMap;
  limit: number;
  orderBy: KeysetOrderBy;
}

export interface ExecuteRegularIdFetchOptions {
  supabase: unknown;
  sourceName: string;
  filters: FilterMap;
  fieldConfigs: FilterFieldConfigMap;
  limit: number;
  cursor: string | null;
  orderBy: KeysetOrderBy;
}

interface BuildHybridSearchPhaseQueryOptions extends FilterApplicationOptions {
  phase: HybridSearchPhase;
  fieldConfigs: FilterFieldConfigMap;
}

function asFilterFieldConfigBag(
  fieldConfig: unknown,
): FilterFieldConfigBag | undefined {
  return fieldConfig as FilterFieldConfigBag | undefined;
}

export function hasFilterValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

export function prepareFiltersWithDefaults(
  filters: FilterMap,
  defaultFilters: FilterMap = {},
  baseFieldConfigs: FilterFieldConfigMap = {},
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
  filters: FilterMap,
): Array<[string, unknown]> {
  return Object.entries(filters).filter(([, value]) => hasFilterValue(value));
}

export function resolveFieldConfig(
  fieldConfigs: FilterFieldConfigMap,
  fieldKey: string,
  entityType?: string,
): FilterFieldConfigBag | undefined {
  const directConfig = asFilterFieldConfigBag(fieldConfigs[fieldKey]);
  if (directConfig) {
    return directConfig;
  }

  if (!entityType) {
    return undefined;
  }

  const prefixedKey = addFieldPrefix(fieldKey, entityType);
  return asFilterFieldConfigBag(fieldConfigs[prefixedKey]);
}

export function resolveFieldFilter(
  fieldConfigs: FilterFieldConfigMap,
  fieldKey: string,
  options: FilterResolutionOptions = {},
): ResolvedFieldFilter {
  const fieldConfig =
    resolveFieldConfig(fieldConfigs, fieldKey, options.entityType) || {};
  const fieldType =
    typeof fieldConfig.fieldType === "string" ? fieldConfig.fieldType : "string";

  let configOperator =
    typeof fieldConfig.operator === "string" ? fieldConfig.operator : undefined;
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
  filters: FilterMap,
  fieldConfigs: FilterFieldConfigMap,
  options: StringFilterOptions = {},
): Array<[string, unknown]> {
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
  filters: FilterMap,
  fieldConfigs: FilterFieldConfigMap,
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

export async function executeHybridSearch(
  options: ExecuteHybridSearchOptions,
): Promise<HybridSearchRecord[]> {
  console.log("[SpaceStore] 🔍 HYBRID SEARCH mode (starts_with 70% + contains 30%)");
  const hybridSelectFields = getSelectFieldsForOrderBy(options.orderBy, {
    includeUpdatedAt: true,
  });
  const {
    isOrSearch,
    orSearchFields,
    searchValue,
    startsWithLimit,
  } = options.hybridSearchPlan;

  if (isOrSearch) {
    console.log(
      `[SpaceStore] 🔀 OR SEARCH: Searching "${searchValue}" in fields:`,
      orSearchFields,
    );
  }

  const supabaseClient =
    options.supabase as SupabaseClientForQuery<
      SupabaseExecutableQuery<HybridSearchRecord>
    >;

  let startsWithQuery = buildHybridSearchPhaseQuery(
    buildHybridBaseQuery(
      supabaseClient,
      options.sourceName,
      hybridSelectFields,
    ),
    options.hybridSearchPlan,
    {
      phase: "starts_with",
      fieldConfigs: options.fieldConfigs,
    },
  );

  startsWithQuery = applySupabaseOrderBy(
    startsWithQuery,
    options.orderBy,
  ).limit(startsWithLimit);

  const { data: startsWithData, error: startsWithError } = await startsWithQuery;

  if (startsWithError) {
    console.error(
      "[SpaceStore] ❌ Hybrid search (starts_with) failed:",
      startsWithError,
    );
    throw startsWithError;
  }

  const startsWithResults = (startsWithData || []) as HybridSearchRecord[];
  console.log(`[SpaceStore] ✅ Starts with: ${startsWithResults.length} results`);

  const remainingLimit = options.limit - startsWithResults.length;
  if (remainingLimit > 0) {
    let containsQuery = buildHybridSearchPhaseQuery(
      buildHybridBaseQuery(
        supabaseClient,
        options.sourceName,
        hybridSelectFields,
      ),
      options.hybridSearchPlan,
      {
        phase: "contains",
        fieldConfigs: options.fieldConfigs,
      },
    );

    containsQuery = applySupabaseOrderBy(
      containsQuery,
      options.orderBy,
    ).limit(remainingLimit);

    const { data: containsData, error: containsError } = await containsQuery;

    if (containsError) {
      console.warn("[SpaceStore] Contains search failed:", containsError);
    } else {
      const containsResults = (containsData || []) as HybridSearchRecord[];
      console.log(`[SpaceStore] ✅ Contains: ${containsResults.length} results`);

      const mergedResults = mergeHybridPhaseResults(
        startsWithResults,
        containsResults,
        options.limit,
      );

      console.log(
        `[SpaceStore] ✅ Fetched ${mergedResults.length} IDs (~${Math.round(mergedResults.length * 0.1)}KB) via HYBRID SEARCH`,
      );
      return mergedResults;
    }
  }

  console.log(
    `[SpaceStore] ✅ Fetched ${startsWithResults.length} IDs (~${Math.round(startsWithResults.length * 0.1)}KB) via HYBRID SEARCH`,
  );
  return startsWithResults;
}

export async function executeRegularIdFetch(
  options: ExecuteRegularIdFetchOptions,
): Promise<HybridSearchRecord[]> {
  const selectFields = getSelectFieldsForOrderBy(options.orderBy, {
    includeUpdatedAt: true,
  });
  const supabaseClient =
    options.supabase as SupabaseClientForQuery<
      SupabaseExecutableQuery<HybridSearchRecord>
    >;

  let query = supabaseClient
    .from(options.sourceName)
    .select(selectFields);

  query = query.or("deleted.is.null,deleted.eq.false");
  query = applyFiltersToSupabaseQuery(
    query,
    options.filters,
    options.fieldConfigs,
  );

  if (options.cursor !== null) {
    const cursorData = parseKeysetCursor(options.cursor, options.orderBy);

    console.log("[SpaceStore] 🔑 Cursor parsed:", cursorData);
    if (cursorData) {
      query = applySupabaseKeysetCursor(query, options.orderBy, cursorData);
    }
  }

  query = applySupabaseOrderBy(query, options.orderBy).limit(options.limit);

  const { data, error } = await query;

  if (error) {
    if (!isNetworkError(error)) {
      console.error("[SpaceStore] IDs query error:", error);
    }
    throw error;
  }

  return (data || []) as HybridSearchRecord[];
}

export function applyFiltersToRxdbSelector(
  selector: RxDBSelectorLike,
  filters: FilterMap,
  fieldConfigs: FilterFieldConfigMap,
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
  filters: FilterMap,
  fieldConfigs: FilterFieldConfigMap,
  options: FilterApplicationOptions = {},
): RxDBSelectorLike {
  const selector: RxDBSelectorLike = { _deleted: false };

  applyFiltersToRxdbSelector(selector, filters, fieldConfigs, options);

  return selector;
}

export async function hydrateFilteredEntities<
  TRecord extends HydratableEntityRecord,
  TCachedRecord = TRecord,
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
  TSelector extends Record<string, unknown> = RxDBSelectorLike,
  TRecord extends Record<string, unknown> = Record<string, unknown>,
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
  filters: FilterMap,
  fieldConfigs: FilterFieldConfigMap,
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
