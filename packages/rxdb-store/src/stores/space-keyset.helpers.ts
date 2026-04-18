export interface KeysetOrderBy {
  field: string;
  direction: "asc" | "desc";
  parameter?: string;
  tieBreaker?: {
    field: string;
    direction: "asc" | "desc";
    parameter?: string;
  };
}

export interface KeysetCursorData {
  value: any;
  tieBreaker: any;
  tieBreakerField: string;
}

function escapePostgrestValue(value: any): string {
  if (value === null || value === undefined) {
    return "null";
  }

  const str = String(value);
  if (/[,()"]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function getTieBreakerField(orderBy: KeysetOrderBy): string {
  return orderBy.tieBreaker?.field || "id";
}

export function getSelectFieldsForOrderBy(
  orderBy: KeysetOrderBy,
  options: { includeUpdatedAt?: boolean } = {},
): string {
  const tieBreakerField = getTieBreakerField(orderBy);
  const fields = ["id", orderBy.field];

  if (tieBreakerField !== orderBy.field && tieBreakerField !== "id") {
    fields.push(tieBreakerField);
  }

  if (options.includeUpdatedAt) {
    fields.push("updated_at");
  }

  return fields.join(", ");
}

export function parseKeysetCursor(
  cursor: string | null | undefined,
  orderBy: KeysetOrderBy,
): KeysetCursorData | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(cursor) as Partial<KeysetCursorData>;
    return {
      value: parsed.value ?? null,
      tieBreaker: parsed.tieBreaker ?? "",
      tieBreakerField: parsed.tieBreakerField || getTieBreakerField(orderBy),
    };
  } catch {
    return {
      value: cursor,
      tieBreaker: "",
      tieBreakerField: getTieBreakerField(orderBy),
    };
  }
}

export function buildKeysetCursorCondition(
  orderBy: KeysetOrderBy,
  cursorData: KeysetCursorData,
): string {
  const mainOp = orderBy.direction === "asc" ? "gt" : "lt";
  const tbDirection = orderBy.tieBreaker?.direction || "asc";
  const tbOp = tbDirection === "asc" ? "gt" : "lt";
  const escapedValue = escapePostgrestValue(cursorData.value);
  const escapedTieBreaker = escapePostgrestValue(cursorData.tieBreaker);

  return `${orderBy.field}.${mainOp}.${escapedValue},and(${orderBy.field}.eq.${escapedValue},${cursorData.tieBreakerField}.${tbOp}.${escapedTieBreaker})`;
}

export function applySupabaseKeysetCursor<TQuery extends { or: (value: string) => TQuery }>(
  query: TQuery,
  orderBy: KeysetOrderBy,
  cursorData: KeysetCursorData | null,
): TQuery {
  if (!cursorData) {
    return query;
  }

  return query.or(buildKeysetCursorCondition(orderBy, cursorData));
}

export function applySupabaseOrderBy<TQuery extends { order: (field: string, options: { ascending: boolean; nullsFirst: boolean }) => TQuery }>(
  query: TQuery,
  orderBy: KeysetOrderBy,
): TQuery {
  let orderedQuery = query.order(orderBy.field, {
    ascending: orderBy.direction === "asc",
    nullsFirst: false,
  });

  if (orderBy.tieBreaker) {
    orderedQuery = orderedQuery.order(orderBy.tieBreaker.field, {
      ascending: orderBy.tieBreaker.direction === "asc",
      nullsFirst: false,
    });
  }

  return orderedQuery;
}

export function buildNextKeysetCursor(
  record: Record<string, any> | null | undefined,
  orderBy: KeysetOrderBy,
): string | null {
  if (!record) {
    return null;
  }

  const tieBreakerField = getTieBreakerField(orderBy);
  return JSON.stringify({
    value: record[orderBy.field] ?? null,
    tieBreaker: record[tieBreakerField] ?? record.id ?? null,
    tieBreakerField,
  });
}

export function buildNextKeysetCursorFromAdditional(
  record: Record<string, any> | null | undefined,
  orderBy: KeysetOrderBy,
): string | null {
  if (!record) {
    return null;
  }

  const tieBreakerField = getTieBreakerField(orderBy);
  return JSON.stringify({
    value: record.additional?.[orderBy.field] ?? record[orderBy.field] ?? null,
    tieBreaker:
      record.additional?.[tieBreakerField] ??
      record[tieBreakerField] ??
      record.id ??
      null,
    tieBreakerField,
  });
}
