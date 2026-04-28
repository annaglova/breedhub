import {
  cacheRecords,
  type BulkUpsertCollection,
} from "./space-id-cache.helpers";
import {
  buildNextKeysetCursor,
  buildNextKeysetCursorFromAdditional,
  parseKeysetCursor,
  type KeysetOrderBy,
} from "./space-keyset.helpers";
import type { PartitionConfig } from "./space-config.helpers";
import type { PartitionRecord } from "./space-partition.helpers";
import {
  compareValues,
  getTieBreaker,
  type ComparableValue,
} from "./space-sort.helpers";
import type { ChildTabDataRecord } from "../types/tab-data.types";

export interface ChildCacheRecord extends ChildTabDataRecord {
  id: string;
  tableType?: string;
  parentId?: string;
  cachedAt?: number;
  partitionId?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  additional?: Record<string, unknown>;
}

export type ChildSourceRow = PartitionRecord;
export type ChildSelector = Record<string, unknown>;
export type ChildFilters = Record<string, unknown>;

/**
 * Universal child cache splits row data: top-level for system fields
 * (`id`, `parentId`, `tableType`, `cachedAt`, `partitionId`, …) and
 * `additional` for everything else. Locally-inserted records keep the
 * parent-field at top level too (because `mapChildRowsToCacheRecords`
 * runs only on Supabase fetches), so consumers must check both places
 * or risk silently dropping records.
 *
 * Use this helper instead of inlining the `record[name] ?? record.additional?.[name]`
 * pattern — single point to evolve if the storage shape ever changes.
 *
 * Returns `undefined` when the field is absent in both locations. Use
 * `getChildField(rec, 'id') ?? rec.id` style if you want a top-level
 * fallback to a guaranteed schema field (e.g. `id`, `parentId`).
 */
export function getChildField<T = unknown>(
  record: Record<string, unknown> | null | undefined,
  name: string,
): T | undefined {
  if (!record) return undefined;
  const top = record[name];
  if (top !== undefined && top !== null) return top as T;
  const additional = record.additional;
  if (additional && typeof additional === "object") {
    const value = (additional as Record<string, unknown>)[name];
    if (value !== undefined && value !== null) return value as T;
  }
  return undefined;
}

export interface ChildDocumentLike<TRecord extends Record<string, unknown>> {
  toJSON(): TRecord;
}

export interface LocalChildCollectionLike<
  TRecord extends ChildCacheRecord = ChildCacheRecord,
> {
  find(options: { selector: ChildSelector; limit?: number }): {
    sort(sort: Record<string, "asc" | "desc">): {
      exec(): Promise<Array<ChildDocumentLike<TRecord>>>;
    };
    exec(): Promise<Array<ChildDocumentLike<TRecord>>>;
  };
}

export interface ChildCacheTransformOptions {
  tableType: string;
  parentId: string;
  parentField: string;
  partitionField?: string;
  partitionValue?: string;
  cachedAt?: number;
}

export interface ChildMutationEntitySchema {
  partition?: PartitionConfig;
}

export interface ChildListQueryLike<TQuery> {
  eq(column: string, value: unknown): TQuery;
  limit(limit: number): TQuery;
  order(
    column: string,
    options: {
      ascending: boolean;
      nullsFirst: boolean;
    },
  ): TQuery;
}

export interface BuildChildSelectClauseOptions {
  select?: string[];
  parentField: string;
  partitionField?: string;
  orderingFields?: string[];
}

export interface LocalChildQueryResult<
  TRecord extends ChildCacheRecord = ChildCacheRecord,
> {
  records: TRecord[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface FilterLocalChildEntitiesOptions<
  TRecord extends ChildCacheRecord = ChildCacheRecord,
> {
  collection?: LocalChildCollectionLike<TRecord>;
  parentId: string;
  tableType: string;
  filters: ChildFilters;
  limit: number;
  cursor: string | null;
  orderBy: KeysetOrderBy;
}

export interface ChildPageResult<
  TRecord extends Record<string, unknown> = ChildCacheRecord,
> {
  records: TRecord[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ChildCollectionLookupOptions<TCollection> {
  childCollections: ReadonlyMap<string, TCollection>;
  dbCollections?: Record<string, TCollection>;
}

export type QueryLocalChildRecordsCollection<
  TRecord extends ChildCacheRecord = ChildCacheRecord,
> = LocalChildCollectionLike<TRecord>;

export interface QueryLocalChildRecordsOptions<
  TCollection,
> {
  collection: TCollection;
  parentId: string;
  tableType: string;
  limit?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  partitionId?: string;
}

export interface FetchAndCacheChildRecordsOptions<TCollection> {
  tableType: string;
  parentId: string;
  parentIdField: string;
  partitionField?: string;
  partitionValue?: string;
  collection: TCollection;
  fetchChildRecords: () => Promise<{
    data: ChildSourceRow[] | null;
    error: unknown;
  }>;
}

export interface LoadChildViewPageOptions<TRawRecord extends ChildSourceRow> {
  viewName: string;
  parentId: string;
  parentField: string;
  limit: number;
  orderBy: KeysetOrderBy;
  partitionConfig?: PartitionConfig;
  partitionValue?: string;
  collection?: BulkUpsertCollection<ChildCacheRecord>;
  fetchViewRecords: () => Promise<{ data: TRawRecord[] | null; error: unknown }>;
}

export interface LoadChildViewPageResult<
  TRecord extends Record<string, unknown> = ChildCacheRecord,
> {
  records: TRecord[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export function getDefaultChildOrderBy(): KeysetOrderBy {
  return {
    field: "id",
    direction: "asc",
    tieBreaker: { field: "id", direction: "asc" },
  };
}

export function getChildCollectionName(entityType: string): string {
  return `${entityType}_children`;
}

export function getExistingChildCollection<TCollection>(
  entityType: string,
  options: ChildCollectionLookupOptions<TCollection>,
): TCollection | undefined {
  const collectionName = getChildCollectionName(entityType);
  return options.childCollections.get(collectionName) || options.dbCollections?.[collectionName];
}

export function toChildPageResult<TRecord extends Record<string, unknown>>(
  queryResult: {
    records: TRecord[];
    hasMore: boolean;
    nextCursor: string | null;
  },
): ChildPageResult<TRecord> {
  return {
    records: queryResult.records,
    total: queryResult.records.length,
    hasMore: queryResult.hasMore,
    nextCursor: queryResult.nextCursor,
  };
}

export function createEmptyChildPageResult<
  TRecord extends Record<string, unknown> = ChildCacheRecord,
>(): ChildPageResult<TRecord> {
  return {
    records: [],
    total: 0,
    hasMore: false,
    nextCursor: null,
  };
}

export function hasStaleChildRecords(
  records: Array<{ cachedAt?: number }>,
  staleMs: number,
  now = Date.now(),
): boolean {
  if (records.length === 0) {
    return false;
  }

  const oldestCachedAt = Math.min(...records.map((record) => record.cachedAt || 0));
  return (now - oldestCachedAt) > staleMs;
}

export function applyChildListQueryOptions<TQuery extends ChildListQueryLike<TQuery>>(
  query: TQuery,
  options: {
    parentField: string;
    parentId: string;
    limit: number;
    orderBy?: string;
    orderDirection?: "asc" | "desc";
    partitionField?: string;
    partitionValue?: string;
  },
): TQuery {
  let nextQuery = query
    .eq(options.parentField, options.parentId)
    .limit(options.limit);

  if (options.partitionField && options.partitionValue) {
    nextQuery = nextQuery.eq(options.partitionField, options.partitionValue);
  }

  if (options.orderBy) {
    nextQuery = nextQuery.order(options.orderBy, {
      ascending: options.orderDirection === "asc",
      nullsFirst: false,
    });
  }

  return nextQuery;
}

export function buildChildSelectClause(
  options: BuildChildSelectClauseOptions,
): string {
  if (!options.select || options.select.length === 0) {
    return "*";
  }

  const fields = new Set<string>([
    "id",
    options.parentField,
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
  ]);

  if (options.partitionField) {
    fields.add(options.partitionField);
  }

  for (const field of options.orderingFields || []) {
    if (field) {
      fields.add(field);
    }
  }

  for (const field of options.select) {
    if (field) {
      fields.add(field);
    }
  }

  return Array.from(fields).join(", ");
}

export function normalizeChildTableType(tableType: string): string {
  return tableType.replace(/_with_\w+$/, "");
}

export async function queryLocalChildRecords<
  TRecord extends ChildCacheRecord = ChildCacheRecord,
>(
  options: QueryLocalChildRecordsOptions<QueryLocalChildRecordsCollection<TRecord>>,
): Promise<TRecord[]> {
  const normalizedTableType = normalizeChildTableType(options.tableType);

  try {
    const {
      limit = 50,
      orderBy,
      orderDirection = "asc",
      partitionId,
    } = options;

    const schemaFields = new Set([
      "id",
      "parentId",
      "tableType",
      "cachedAt",
      "additional",
      "partitionId",
    ]);
    const isSchemaField = orderBy ? schemaFields.has(orderBy) : false;

    const selector: ChildSelector = {
      parentId: options.parentId,
      tableType: normalizedTableType,
    };
    if (partitionId) {
      selector.partitionId = partitionId;
    }

    const queryOptions: { selector: ChildSelector; limit?: number } = {
      selector,
    };
    if (limit > 0 && (!orderBy || isSchemaField)) {
      queryOptions.limit = limit;
    }

    const query = options.collection.find(queryOptions);
    const results = orderBy && isSchemaField
      ? await query.sort({ [orderBy]: orderDirection }).exec()
      : await query.exec();
    let records = results.map((doc) => doc.toJSON());

    if (orderBy && !isSchemaField) {
      records = sortLocalChildRecords(records, {
        field: orderBy,
        direction: orderDirection,
        tieBreaker: {
          field: "id",
          direction: "asc",
        },
      });

      if (limit > 0) {
        records = records.slice(0, limit);
      }
    }

    return records;
  } catch (error) {
    console.error("[SpaceStore] Error querying child records:", error);
    return [];
  }
}

export function getChildMutationMetadata(
  entitySchemas: ReadonlyMap<string, ChildMutationEntitySchema>,
  entityType: string,
  tableType: string,
): {
  normalizedType: string;
  partitionConfig?: PartitionConfig;
} {
  return {
    normalizedType: normalizeChildTableType(tableType),
    partitionConfig: entitySchemas.get(entityType)?.partition,
  };
}

export function queueChildMutationRefresh(
  processNow: () => Promise<unknown>,
  refresh: (
    entityType: string,
    normalizedType: string,
    parentId: string,
  ) => unknown,
  entityType: string,
  normalizedType: string,
  parentId: string,
): void {
  void processNow().then(() => {
    void refresh(entityType, normalizedType, parentId);
  });
}

export function mapChildRowsToCacheRecords(
  rows: ChildSourceRow[],
  options: ChildCacheTransformOptions,
): ChildCacheRecord[] {
  const normalizedTableType = normalizeChildTableType(options.tableType);
  const cachedAt = options.cachedAt ?? Date.now();

  return rows.map((row) => {
    const { id, created_at, updated_at, created_by, updated_by, ...rest } = row;
    const additional: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(rest)) {
      if (key === options.parentField) continue;
      if (options.partitionField && key === options.partitionField) continue;
      if (value !== undefined && value !== null) {
        additional[key] = value;
      }
    }

    const record: ChildCacheRecord = {
      id,
      tableType: normalizedTableType,
      parentId: options.parentId,
      cachedAt,
    };

    if (typeof updated_at === "string") record.updated_at = updated_at;
    if (typeof created_at === "string") record.created_at = created_at;
    if (typeof created_by === "string") record.created_by = created_by;
    if (typeof updated_by === "string") record.updated_by = updated_by;
    if (Object.keys(additional).length > 0) record.additional = additional;
    if (options.partitionValue) record.partitionId = options.partitionValue;

    return record;
  });
}

export async function mapAndCacheChildRows(
  rows: ChildSourceRow[],
  options: ChildCacheTransformOptions & {
    collection?: BulkUpsertCollection<ChildCacheRecord>;
  },
): Promise<{
  transformedRecords: ChildCacheRecord[];
  cachedRecordsCount: number;
}> {
  const transformedRecords = mapChildRowsToCacheRecords(rows, options);
  const { cachedRecordsCount } = await cacheRecords(transformedRecords, {
    collection: options.collection,
  });

  return {
    transformedRecords,
    cachedRecordsCount,
  };
}

export async function fetchAndCacheChildRecords<
  TRecord extends ChildCacheRecord = ChildCacheRecord,
>(
  options: FetchAndCacheChildRecordsOptions<BulkUpsertCollection<ChildCacheRecord>>,
): Promise<TRecord[]> {
  try {
    const { data, error } = await options.fetchChildRecords();

    if (error) {
      console.error(
        `[SpaceStore] Failed to load child records from ${options.tableType}:`,
        error,
      );
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const hydrationResult = await mapAndCacheChildRows(data, {
      tableType: options.tableType,
      parentId: options.parentId,
      parentField: options.parentIdField,
      partitionField: options.partitionField,
      partitionValue: options.partitionValue,
      collection: options.collection,
    });

    return hydrationResult.transformedRecords as TRecord[];
  } catch (error) {
    console.error("[SpaceStore] Error loading child records:", error);
    return [];
  }
}

export async function loadChildViewPage<TRawRecord extends ChildSourceRow>(
  options: LoadChildViewPageOptions<TRawRecord>,
): Promise<LoadChildViewPageResult<TRawRecord | ChildCacheRecord>> {
  console.log("[SpaceStore] 🌐 Phase 1: Fetching VIEW records...");

  const { data, error } = await options.fetchViewRecords();

  if (error) {
    console.error("[SpaceStore] loadChildViewDirect error:", error);
    throw error;
  }

  const rawRecords = data || [];
  console.log(`[SpaceStore] ✅ Fetched ${rawRecords.length} VIEW records`);

  // Some JOINed VIEWs (e.g. pet_sibling_with_sale, pet_child_with_sale) expose
  // only natural composite keys (pet_id + sibling_pet_id) and no standalone
  // `id` column, so they cannot be upserted into the child-cache collection
  // whose primary key is `id`. Detect and fall through to the raw-records
  // path below so the tab still renders.
  const firstRow = rawRecords[0] as { id?: unknown } | undefined;
  const hasStableId =
    firstRow === undefined ||
    (firstRow.id !== undefined && firstRow.id !== null);

  console.log("[SpaceStore] 💾 Phase 2: Caching in RxDB...");

  if (!options.collection || !hasStableId) {
    if (options.collection && !hasStableId) {
      console.warn(
        "[SpaceStore] ⚠️ VIEW rows have no id, skipping RxDB cache and returning raw records",
      );
    } else {
      console.warn("[SpaceStore] ⚠️ No collection, returning raw records");
    }
    const hasMore = rawRecords.length >= options.limit;
    const lastRecord = rawRecords[rawRecords.length - 1];
    const nextCursor = hasMore
      ? buildNextKeysetCursor(lastRecord, options.orderBy)
      : null;

    return {
      records: rawRecords,
      total: rawRecords.length,
      hasMore,
      nextCursor,
    };
  }

  const hydrationResult = await mapAndCacheChildRows(rawRecords, {
    tableType: options.viewName,
    parentId: options.parentId,
    parentField: options.parentField,
    partitionField: options.partitionConfig?.childFilterField,
    partitionValue: options.partitionValue,
    collection: options.collection,
  });
  const transformedRecords = hydrationResult.transformedRecords;

  if (hydrationResult.cachedRecordsCount > 0) {
    console.log(
      `[SpaceStore] 💾 Cached ${hydrationResult.cachedRecordsCount} records in RxDB`,
    );
  }

  const hasMore = rawRecords.length >= options.limit;
  const lastRecord = rawRecords[rawRecords.length - 1];
  const nextCursor = hasMore
    ? buildNextKeysetCursor(lastRecord, options.orderBy)
    : null;

  console.log(
    `[SpaceStore] ✅ loadChildViewDirect: ${transformedRecords.length} records (hasMore: ${hasMore})`,
  );

  return {
    records: transformedRecords,
    total: transformedRecords.length,
    hasMore,
    nextCursor,
  };
}

function getChildFieldValue(
  record: ChildCacheRecord | null | undefined,
  field: string,
  parameter?: string,
): ComparableValue | null {
  if (!record) {
    return null;
  }

  const additionalValue = record.additional?.[field];
  const topLevelValue = record[field];

  if (!parameter) {
    return toComparableValue(additionalValue ?? topLevelValue);
  }

  return (
    getNestedComparableValue(additionalValue, parameter) ??
    getNestedComparableValue(topLevelValue, parameter)
  );
}

function getChildOrderValue(
  record: ChildCacheRecord | null | undefined,
  orderBy: KeysetOrderBy,
): ComparableValue | null {
  return getChildFieldValue(record, orderBy.field, orderBy.parameter);
}

function getChildTieBreakerValue(
  record: ChildCacheRecord | null | undefined,
  orderBy: KeysetOrderBy,
): ComparableValue | null {
  if (!record) {
    return null;
  }

  const tieBreaker = getTieBreaker(orderBy);
  return (
    getChildFieldValue(record, tieBreaker.field, tieBreaker.parameter) ??
    record.id ??
    null
  );
}

export function sortLocalChildRecords<TRecord extends ChildCacheRecord>(
  records: TRecord[],
  orderBy: KeysetOrderBy,
): TRecord[] {
  const tieBreaker = getTieBreaker(orderBy);

  return [...records].sort((leftRecord, rightRecord) => {
    const primaryCompare = compareValues(
      getChildOrderValue(leftRecord, orderBy),
      getChildOrderValue(rightRecord, orderBy),
      orderBy.direction,
    );

    if (primaryCompare !== 0) {
      return primaryCompare;
    }

    return compareValues(
      getChildTieBreakerValue(leftRecord, orderBy),
      getChildTieBreakerValue(rightRecord, orderBy),
      tieBreaker.direction,
    );
  });
}

function isRecordBag(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toComparableValue(value: unknown): ComparableValue | null {
  return (value ?? null) as ComparableValue | null;
}

function getNestedComparableValue(
  value: unknown,
  parameter: string,
): ComparableValue | null {
  if (!isRecordBag(value)) {
    return null;
  }

  return toComparableValue(value[parameter]);
}

function isAfterCursor(
  record: ChildCacheRecord,
  cursorData: { value: unknown; tieBreaker: unknown },
  orderBy: KeysetOrderBy,
): boolean {
  const value = getChildOrderValue(record, orderBy);
  const cursorValue = cursorData.value as string | number;
  if (orderBy.direction === "asc") {
    if ((value as string | number) > cursorValue) return true;
    if ((value as string | number) < cursorValue) return false;
  } else {
    if ((value as string | number) < cursorValue) return true;
    if ((value as string | number) > cursorValue) return false;
  }

  const tieBreakerValue = getChildTieBreakerValue(record, orderBy);
  const cursorTieBreaker = cursorData.tieBreaker as string | number;
  const tieBreakerDirection = getTieBreaker(orderBy).direction;
  return tieBreakerDirection === "asc"
    ? (tieBreakerValue as string | number) > cursorTieBreaker
    : (tieBreakerValue as string | number) < cursorTieBreaker;
}

export async function executeLocalChildQuery(options: {
  collection: LocalChildCollectionLike;
  parentId: string;
  tableType: string;
  filters: ChildFilters;
  limit: number;
  cursor: string | null;
  orderBy: KeysetOrderBy;
}): Promise<LocalChildQueryResult> {
  const selector: ChildSelector = {
    parentId: options.parentId,
    tableType: normalizeChildTableType(options.tableType),
  };

  for (const [key, value] of Object.entries(options.filters)) {
    if (value !== undefined && value !== null && value !== "") {
      selector[`additional.${key}`] = value;
    }
  }

  const results = await options.collection.find({ selector }).exec();
  let records = results.map((doc) => doc.toJSON());
  records = sortLocalChildRecords(records, options.orderBy);

  if (options.cursor) {
    const cursorData = parseKeysetCursor(options.cursor, options.orderBy);
    if (cursorData) {
      records = records.filter((record) =>
        isAfterCursor(record, cursorData, options.orderBy),
      );
    }
  }

  const hasMore = options.limit > 0 ? records.length >= options.limit : false;
  if (options.limit > 0) {
    records = records.slice(0, options.limit);
  }

  const nextCursor =
    hasMore && records.length > 0
      ? buildNextKeysetCursorFromAdditional(records[records.length - 1], options.orderBy)
      : null;

  return { records, hasMore, nextCursor };
}

export async function filterLocalChildEntities(
  options: FilterLocalChildEntitiesOptions,
): Promise<LocalChildQueryResult> {
  if (!options.collection) {
    return { records: [], hasMore: false, nextCursor: null };
  }

  return executeLocalChildQuery({
    collection: options.collection,
    parentId: options.parentId,
    tableType: options.tableType,
    filters: options.filters,
    limit: options.limit,
    cursor: options.cursor,
    orderBy: options.orderBy,
  });
}
