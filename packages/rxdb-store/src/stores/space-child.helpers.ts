import type { RxCollection, RxDocument } from "rxdb";
import {
  buildNextKeysetCursorFromAdditional,
  parseKeysetCursor,
  type KeysetOrderBy,
} from "./space-keyset.helpers";

export interface ChildCacheTransformOptions {
  tableType: string;
  parentId: string;
  parentField: string;
  partitionField?: string;
  partitionValue?: string;
  cachedAt?: number;
}

export interface LocalChildQueryResult {
  records: any[];
  hasMore: boolean;
  nextCursor: string | null;
}

export function normalizeChildTableType(tableType: string): string {
  return tableType.replace(/_with_\w+$/, "");
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

function getTieBreaker(orderBy: KeysetOrderBy) {
  return orderBy.tieBreaker || { field: "id", direction: "asc" as const };
}

function getChildOrderValue(
  record: Record<string, any> | null | undefined,
  orderBy: KeysetOrderBy,
): any {
  if (!record) {
    return null;
  }

  return record.additional?.[orderBy.field] ?? record[orderBy.field] ?? null;
}

function getChildTieBreakerValue(
  record: Record<string, any> | null | undefined,
  orderBy: KeysetOrderBy,
): any {
  if (!record) {
    return null;
  }

  const tieBreakerField = getTieBreaker(orderBy).field;
  return (
    record.additional?.[tieBreakerField] ??
    record[tieBreakerField] ??
    record.id ??
    null
  );
}

function compareValues(
  left: any,
  right: any,
  direction: "asc" | "desc",
): number {
  if (left === null || left === undefined) return 1;
  if (right === null || right === undefined) return -1;

  if (direction === "asc") {
    return left < right ? -1 : left > right ? 1 : 0;
  }

  return left > right ? -1 : left < right ? 1 : 0;
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
