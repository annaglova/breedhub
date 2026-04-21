import type { RxCollection, RxDocument } from "rxdb";
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
import { compareValues, getTieBreaker } from "./space-sort.helpers";

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
  eq(column: string, value: any): TQuery;
  limit(limit: number): TQuery;
  order(
    column: string,
    options: {
      ascending: boolean;
      nullsFirst: boolean;
    },
  ): TQuery;
}

export interface LocalChildQueryResult {
  records: any[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface FilterLocalChildEntitiesOptions {
  collection?: RxCollection<any>;
  parentId: string;
  tableType: string;
  filters: Record<string, any>;
  limit: number;
  cursor: string | null;
  orderBy: KeysetOrderBy;
}

export interface ChildPageResult<TRecord = any> {
  records: TRecord[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ChildCollectionLookupOptions<TCollection> {
  childCollections: ReadonlyMap<string, TCollection>;
  dbCollections?: Record<string, TCollection>;
}

export interface QueryLocalChildRecordsCollection {
  find(options: { selector: Record<string, any>; limit?: number }): {
    sort(sort: Record<string, "asc" | "desc">): {
      exec(): Promise<Array<{ toJSON(): unknown }>>;
    };
    exec(): Promise<Array<{ toJSON(): unknown }>>;
  };
}

export interface QueryLocalChildRecordsOptions<TCollection> {
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
  fetchChildRecords: () => Promise<{ data: any[] | null; error: any }>;
}

export interface LoadChildViewPageOptions<TRawRecord extends Record<string, any>> {
  viewName: string;
  parentId: string;
  parentField: string;
  limit: number;
  orderBy: KeysetOrderBy;
  partitionConfig?: PartitionConfig;
  partitionValue?: string;
  collection?: BulkUpsertCollection<any>;
  fetchViewRecords: () => Promise<{ data: TRawRecord[] | null; error: any }>;
}

export interface LoadChildViewPageResult<TRecord = any> {
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

export function toChildPageResult<TRecord>(
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

export function createEmptyChildPageResult<TRecord = any>(): ChildPageResult<TRecord> {
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

export function normalizeChildTableType(tableType: string): string {
  return tableType.replace(/_with_\w+$/, "");
}

export async function queryLocalChildRecords<TRecord = any>(
  options: QueryLocalChildRecordsOptions<QueryLocalChildRecordsCollection>,
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

    const selector: Record<string, any> = {
      parentId: options.parentId,
      tableType: normalizedTableType,
    };
    if (partitionId) {
      selector.partitionId = partitionId;
    }

    const queryOptions: { selector: Record<string, any>; limit?: number } = {
      selector,
    };
    if (limit > 0 && (!orderBy || isSchemaField)) {
      queryOptions.limit = limit;
    }

    const query = options.collection.find(queryOptions);
    const results = orderBy && isSchemaField
      ? await query.sort({ [orderBy]: orderDirection }).exec()
      : await query.exec();
    let records = results.map((doc) => doc.toJSON() as TRecord);

    if (orderBy && !isSchemaField) {
      records = sortLocalChildRecords(records as Record<string, any>[], {
        field: orderBy,
        direction: orderDirection,
        tieBreaker: {
          field: "id",
          direction: "asc",
        },
      }) as TRecord[];

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
  rows: Record<string, any>[],
  options: ChildCacheTransformOptions,
): any[] {
  const normalizedTableType = normalizeChildTableType(options.tableType);
  const cachedAt = options.cachedAt ?? Date.now();

  return rows.map((row) => {
    const { id, created_at, updated_at, created_by, updated_by, ...rest } = row;
    const additional: Record<string, any> = {};

    for (const [key, value] of Object.entries(rest)) {
      if (key === options.parentField) continue;
      if (options.partitionField && key === options.partitionField) continue;
      if (value !== undefined && value !== null) {
        additional[key] = value;
      }
    }

    const record: Record<string, any> = {
      id,
      tableType: normalizedTableType,
      parentId: options.parentId,
      cachedAt,
    };

    if (updated_at) record.updated_at = updated_at;
    if (created_at) record.created_at = created_at;
    if (created_by) record.created_by = created_by;
    if (updated_by) record.updated_by = updated_by;
    if (Object.keys(additional).length > 0) record.additional = additional;
    if (options.partitionValue) record.partitionId = options.partitionValue;

    return record;
  });
}

export async function mapAndCacheChildRows(
  rows: Record<string, any>[],
  options: ChildCacheTransformOptions & {
    collection?: BulkUpsertCollection<any>;
  },
): Promise<{
  transformedRecords: any[];
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

export async function fetchAndCacheChildRecords<TRecord = any>(
  options: FetchAndCacheChildRecordsOptions<BulkUpsertCollection<any>>,
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

export async function loadChildViewPage<
  TRawRecord extends Record<string, any>,
>(
  options: LoadChildViewPageOptions<TRawRecord>,
): Promise<LoadChildViewPageResult> {
  console.log("[SpaceStore] 🌐 Phase 1: Fetching VIEW records...");

  const { data, error } = await options.fetchViewRecords();

  if (error) {
    console.error("[SpaceStore] loadChildViewDirect error:", error);
    throw error;
  }

  const rawRecords = data || [];
  console.log(`[SpaceStore] ✅ Fetched ${rawRecords.length} VIEW records`);

  console.log("[SpaceStore] 💾 Phase 2: Caching in RxDB...");

  if (!options.collection) {
    console.warn("[SpaceStore] ⚠️ No collection, returning raw records");
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
  record: Record<string, any> | null | undefined,
  field: string,
  parameter?: string,
): any {
  if (!record) {
    return null;
  }

  const additionalValue = record.additional?.[field];
  const topLevelValue = record[field];

  if (!parameter) {
    return additionalValue ?? topLevelValue ?? null;
  }

  return additionalValue?.[parameter] ?? topLevelValue?.[parameter] ?? null;
}

function getChildOrderValue(
  record: Record<string, any> | null | undefined,
  orderBy: KeysetOrderBy,
): any {
  return getChildFieldValue(record, orderBy.field, orderBy.parameter);
}

function getChildTieBreakerValue(
  record: Record<string, any> | null | undefined,
  orderBy: KeysetOrderBy,
): any {
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

export function sortLocalChildRecords(
  records: Record<string, any>[],
  orderBy: KeysetOrderBy,
): Record<string, any>[] {
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

function isAfterCursor(
  record: Record<string, any>,
  cursorData: { value: any; tieBreaker: any },
  orderBy: KeysetOrderBy,
): boolean {
  const value = getChildOrderValue(record, orderBy);
  if (orderBy.direction === "asc") {
    if (value > cursorData.value) return true;
    if (value < cursorData.value) return false;
  } else {
    if (value < cursorData.value) return true;
    if (value > cursorData.value) return false;
  }

  const tieBreakerValue = getChildTieBreakerValue(record, orderBy);
  const tieBreakerDirection = getTieBreaker(orderBy).direction;
  return tieBreakerDirection === "asc"
    ? tieBreakerValue > cursorData.tieBreaker
    : tieBreakerValue < cursorData.tieBreaker;
}

export async function executeLocalChildQuery(options: {
  collection: RxCollection<any>;
  parentId: string;
  tableType: string;
  filters: Record<string, any>;
  limit: number;
  cursor: string | null;
  orderBy: KeysetOrderBy;
}): Promise<LocalChildQueryResult> {
  const selector: Record<string, any> = {
    parentId: options.parentId,
    tableType: normalizeChildTableType(options.tableType),
  };

  for (const [key, value] of Object.entries(options.filters)) {
    if (value !== undefined && value !== null && value !== "") {
      selector[`additional.${key}`] = value;
    }
  }

  const results = await options.collection.find({ selector }).exec();
  let records = results.map((doc: RxDocument<any>) => doc.toJSON());
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
