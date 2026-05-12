import {
  detectOperator,
  matchRecordValue,
  type OrderBy,
} from '@breedhub/rxdb-store';

export type EntityListFilters = Record<string, unknown>;

export interface EntityFieldConfig {
  fieldType?: string;
  operator?: string;
}

function resolveOrderValue(
  record: any,
  field: string,
  parameter?: string,
): unknown {
  const fieldValue = record?.[field];
  if (!parameter) {
    return fieldValue;
  }

  if (typeof fieldValue !== 'object' || fieldValue === null) {
    return undefined;
  }

  return (fieldValue as Record<string, unknown>)[parameter];
}

function compareOrderValues(
  left: unknown,
  right: unknown,
  direction: 'asc' | 'desc',
): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;

  const dir = direction === 'desc' ? -1 : 1;
  if ((left as any) < (right as any)) return -1 * dir;
  if ((left as any) > (right as any)) return 1 * dir;
  return 0;
}

export function buildLiveMatcher(
  filters: EntityListFilters | undefined,
  fieldConfigs?: Record<string, EntityFieldConfig>,
): (record: any) => boolean {
  if (!filters) return () => true;
  const entries = Object.entries(filters);
  return (record) => {
    for (const [key, value] of entries) {
      if (value === undefined || value === null || value === '') continue;
      const cfg = fieldConfigs?.[key];
      const operator = detectOperator(cfg?.fieldType ?? '', cfg?.operator);
      if (!matchRecordValue(record?.[key], operator, value)) return false;
    }
    return true;
  };
}

export function buildLiveSorter(
  orderBy?: OrderBy,
): (a: any, b: any) => number {
  if (!orderBy) return () => 0;
  const tie = orderBy.tieBreaker;

  return (a, b) => {
    const primary = compareOrderValues(
      resolveOrderValue(a, orderBy.field, orderBy.parameter),
      resolveOrderValue(b, orderBy.field, orderBy.parameter),
      orderBy.direction,
    );

    if (primary !== 0) return primary;

    if (tie) {
      return compareOrderValues(
        resolveOrderValue(a, tie.field, tie.parameter),
        resolveOrderValue(b, tie.field, tie.parameter),
        tie.direction,
      );
    }

    return 0;
  };
}
