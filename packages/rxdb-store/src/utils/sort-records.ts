/**
 * Pure record-sorting utility shared by TabDataService and edit tabs.
 *
 * Mirrors PostgreSQL's `ORDER BY ... NULLS LAST` semantics so that client-side
 * fallback ordering stays consistent with what Supabase returns when the same
 * orderBy is honoured server-side.
 *
 * Reads the field from `record.additional[field]` first (RxDB child-cache /
 * DictionaryStore shape) and falls back to the flat field — same record can
 * be sorted regardless of which loading path produced it.
 */

import type { OrderConfig } from "../types/tab-data.types";

type SortableRecord = Record<string, unknown> & {
  additional?: Record<string, unknown>;
};

export function sortRecords<TRecord extends SortableRecord>(
  records: TRecord[],
  orderBy: OrderConfig[] | undefined,
): TRecord[] {
  if (!orderBy || orderBy.length === 0) return records;

  return [...records].sort((a, b) => {
    for (const order of orderBy) {
      const aVal = a.additional?.[order.field] ?? a[order.field];
      const bVal = b.additional?.[order.field] ?? b[order.field];

      const aIsNull = aVal === null || aVal === undefined;
      const bIsNull = bVal === null || bVal === undefined;

      if (aIsNull && bIsNull) continue;
      if (aIsNull) return 1;
      if (bIsNull) return -1;

      if (aVal !== bVal) {
        const comparison =
          (aVal as string | number | boolean | Date) <
          (bVal as string | number | boolean | Date)
            ? -1
            : 1;
        return order.direction === "asc" ? comparison : -comparison;
      }
    }
    return 0;
  });
}
