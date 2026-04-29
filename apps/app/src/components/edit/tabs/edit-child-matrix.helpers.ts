/**
 * Pure helpers for EditChildMatrixTab — extracted so they can be unit-tested
 * without rendering the React component.
 *
 * The matrix groups child records (e.g. pet_measurement rows) into rows keyed
 * by the rowHeader value (e.g. `date`). Sort the records BEFORE grouping —
 * `Map` preserves insertion order, so a sorted input array produces rows in
 * sort order without an extra step.
 */

import { sortRecords } from "@breedhub/rxdb-store";
import type { OrderConfig } from "@breedhub/rxdb-store";

export interface MatrixRow {
  key: string;
  header: unknown;
  isDraft: boolean;
  /** columnId -> cell record (RxDB child doc with .additional). Map dedupes
   *  by column, so use `allRecords` for any cascade that must hit every
   *  record regardless of column collision. */
  cellRecords: Record<string, Record<string, any>>;
  /** Every record that grouped into this row (no column dedupe). */
  allRecords: Record<string, any>[];
}

interface GroupCellRecordsIntoRowsOptions {
  headerCol: string;
  colCol: string;
  /** Optional ordering applied before grouping. */
  orderBy?: OrderConfig[];
}

export type AddPosition = "top" | "bottom";

/** Combine persisted rows with client-only draft rows, honouring the
 *  configured insert position. Default `"bottom"` keeps drafts at the end of
 *  the table; `"top"` is used together with `orderBy: desc` so a freshly added
 *  row appears next to other recent entries. */
export function mergeRowsWithDrafts(
  persisted: MatrixRow[],
  drafts: MatrixRow[],
  addPosition: AddPosition = "bottom",
): MatrixRow[] {
  return addPosition === "top"
    ? [...drafts, ...persisted]
    : [...persisted, ...drafts];
}

export function groupCellRecordsIntoRows(
  cellRecords: Array<Record<string, any>>,
  { headerCol, colCol, orderBy }: GroupCellRecordsIntoRowsOptions,
): MatrixRow[] {
  const sorted = sortRecords(cellRecords, orderBy);
  const byKey = new Map<string, MatrixRow>();

  for (const record of sorted) {
    const data = (record.additional as Record<string, any>) || {};
    const headerValue = data[headerCol];
    // Universal child cache strips parentField (pet_id) from `additional`
    // and stores it at `record.parentId`. Fall back to that for the column ID.
    const columnId = data[colCol] ?? record.parentId;
    if (headerValue == null || !columnId) continue;

    const key = String(headerValue);
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        header: headerValue,
        isDraft: false,
        cellRecords: {},
        allRecords: [],
      });
    }
    const bucket = byKey.get(key)!;
    bucket.cellRecords[columnId] = record;
    bucket.allRecords.push(record);
  }
  return Array.from(byKey.values());
}
