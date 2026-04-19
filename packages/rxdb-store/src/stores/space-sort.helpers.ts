import type { KeysetOrderBy } from "./space-keyset.helpers";

export type SortDirection = "asc" | "desc";

export function getTieBreaker(
  orderBy: KeysetOrderBy,
): { field: string; direction: SortDirection; parameter?: string } {
  return orderBy.tieBreaker || { field: "id", direction: "asc" };
}

export function compareValues(
  left: any,
  right: any,
  direction: SortDirection,
): number {
  if (left === null || left === undefined) return 1;
  if (right === null || right === undefined) return -1;

  if (direction === "asc") {
    return left < right ? -1 : left > right ? 1 : 0;
  }

  return left > right ? -1 : left < right ? 1 : 0;
}
