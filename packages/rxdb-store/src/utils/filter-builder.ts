/**
 * Filter Builder Utilities
 *
 * Pure functions for building filter expressions across RxDB, Supabase, and PostgREST.
 * Extracted from SpaceStore to enable reuse and testing.
 */

export type FilterOperator =
  | "ilike"
  | "contains"
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "between"
  | (string & {});

export interface FilterBuilderFieldConfig {
  orFields?: string[];
}

export interface RxDBSelectorLike extends Record<string, unknown> {
  $and?: Array<{ $or: Array<Record<string, unknown>> }>;
}

export interface RxDBWhereQuery<TQuery> {
  regex(pattern: string): TQuery;
  eq(value: unknown): TQuery;
  ne(value: unknown): TQuery;
  gt(value: unknown): TQuery;
  gte(value: unknown): TQuery;
  lt(value: unknown): TQuery;
  lte(value: unknown): TQuery;
  in(values: unknown[]): TQuery;
}

export interface RxDBFilterQuery<TQuery> {
  where(fieldName: string): RxDBWhereQuery<TQuery>;
}

export interface SupabaseFilterQuery<TQuery> {
  ilike(fieldName: string, value: string): TQuery;
  eq(fieldName: string, value: unknown): TQuery;
  neq(fieldName: string, value: unknown): TQuery;
  gt(fieldName: string, value: unknown): TQuery;
  gte(fieldName: string, value: unknown): TQuery;
  lt(fieldName: string, value: unknown): TQuery;
  lte(fieldName: string, value: unknown): TQuery;
  in(fieldName: string, values: unknown[]): TQuery;
  or(condition: string): TQuery;
}

// ============= Operator Detection =============

/**
 * Detect filter operator from field type and optional config override.
 */
export function detectOperator(
  fieldType: string,
  configOperator?: string,
): FilterOperator {
  if (configOperator) return configOperator;

  switch (fieldType) {
    case 'string':
    case 'text':
      return 'ilike';
    case 'uuid':
    case 'number':
    case 'integer':
    case 'boolean':
      return 'eq';
    case 'date':
    case 'timestamp':
      return 'gte';
    default:
      return 'eq';
  }
}

// ============= RxDB Filters =============

/**
 * Build RxDB condition object from operator + value
 */
export function buildRxDBCondition(
  operator: FilterOperator,
  value: unknown,
): unknown {
  switch (operator) {
    case 'ilike':
    case 'contains': {
      const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return { $regex: escaped, $options: 'i' };
    }
    case 'eq': return value;
    case 'ne': return { $ne: value };
    case 'gt': return { $gt: value };
    case 'gte': return { $gte: value };
    case 'lt': return { $lt: value };
    case 'lte': return { $lte: value };
    case 'in': return { $in: Array.isArray(value) ? value : [value] };
    default: return value;
  }
}

/**
 * Apply filter to RxDB selector with orFields support.
 * Mutates the selector object in place.
 */
export function applyFilterToRxDBSelector(
  selector: RxDBSelectorLike,
  fieldKey: string,
  operator: FilterOperator,
  value: unknown,
  fieldConfig?: FilterBuilderFieldConfig,
): void {
  const orFields: string[] | undefined = fieldConfig?.orFields;
  const condition = buildRxDBCondition(operator, value);

  if (orFields && orFields.length > 0) {
    const orConditions = orFields.map(field => ({ [field]: condition }));
    if (!selector.$and) selector.$and = [];
    selector.$and.push({ $or: orConditions });
  } else {
    selector[fieldKey] = condition;
  }
}

/**
 * Apply filter to RxDB query chain (fluent API)
 */
export function applyRxDBFilter<TQuery>(
  query: TQuery,
  fieldName: string,
  operator: FilterOperator,
  value: unknown,
): TQuery {
  const rxdbQuery = query as RxDBFilterQuery<TQuery>;

  switch (operator) {
    case 'ilike':
    case 'contains': {
      const escapedValue = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return rxdbQuery.where(fieldName).regex(escapedValue);
    }
    case 'eq':
      return rxdbQuery.where(fieldName).eq(value);
    case 'ne':
      return rxdbQuery.where(fieldName).ne(value);
    case 'gt':
      return rxdbQuery.where(fieldName).gt(value);
    case 'gte':
      return rxdbQuery.where(fieldName).gte(value);
    case 'lt':
      return rxdbQuery.where(fieldName).lt(value);
    case 'lte':
      return rxdbQuery.where(fieldName).lte(value);
    case 'in': {
      const arrayValue = Array.isArray(value) ? value : [value];
      return rxdbQuery.where(fieldName).in(arrayValue);
    }
    case 'between': {
      const [from, to] = String(value).split('_');
      let nextQuery = query;
      if (from) nextQuery = (nextQuery as RxDBFilterQuery<TQuery>).where(fieldName).gte(from);
      if (to) nextQuery = (nextQuery as RxDBFilterQuery<TQuery>).where(fieldName).lte(to);
      return nextQuery;
    }
    default:
      console.warn(`[FilterBuilder] Unknown RxDB operator: ${operator}`);
      return query;
  }
}

// ============= Supabase Filters =============

/**
 * Apply filter to Supabase query chain
 */
export function applySupabaseFilter<TQuery>(
  query: TQuery,
  fieldName: string,
  operator: FilterOperator,
  value: unknown,
): TQuery {
  const supabaseQuery = query as SupabaseFilterQuery<TQuery>;

  switch (operator) {
    case 'ilike':
    case 'contains':
      return supabaseQuery.ilike(fieldName, `%${value}%`);
    case 'eq':
      return supabaseQuery.eq(fieldName, value);
    case 'ne':
      return supabaseQuery.neq(fieldName, value);
    case 'gt':
      return supabaseQuery.gt(fieldName, value);
    case 'gte':
      return supabaseQuery.gte(fieldName, value);
    case 'lt':
      return supabaseQuery.lt(fieldName, value);
    case 'lte':
      return supabaseQuery.lte(fieldName, value);
    case 'in': {
      const arrayValue = Array.isArray(value) ? value : [value];
      return supabaseQuery.in(fieldName, arrayValue);
    }
    case 'between': {
      const [from, to] = String(value).split('_');
      let nextQuery = query;
      if (from) nextQuery = (nextQuery as SupabaseFilterQuery<TQuery>).gte(fieldName, from);
      if (to) nextQuery = (nextQuery as SupabaseFilterQuery<TQuery>).lte(fieldName, to);
      return nextQuery;
    }
    default:
      console.warn(`[FilterBuilder] Unknown Supabase operator: ${operator}`);
      return query;
  }
}

// ============= PostgREST Filters =============

/**
 * Build PostgREST filter expression string (e.g., "breed_id.eq.123")
 */
export function buildPostgrestFilterExpr(
  fieldName: string,
  operator: FilterOperator,
  value: unknown,
): string {
  switch (operator) {
    case 'ilike':
    case 'contains':
      return `${fieldName}.ilike.%${value}%`;
    case 'eq':
      return `${fieldName}.eq.${value}`;
    case 'ne':
      return `${fieldName}.neq.${value}`;
    case 'gt':
      return `${fieldName}.gt.${value}`;
    case 'gte':
      return `${fieldName}.gte.${value}`;
    case 'lt':
      return `${fieldName}.lt.${value}`;
    case 'lte':
      return `${fieldName}.lte.${value}`;
    case 'in': {
      const arr = Array.isArray(value) ? value : [value];
      return `${fieldName}.in.(${arr.join(',')})`;
    }
    default:
      return `${fieldName}.eq.${value}`;
  }
}

/**
 * Apply filter with orFields support.
 * If fieldConfig has orFields, builds OR condition across all fields.
 * Otherwise delegates to applySupabaseFilter.
 */
export function applySupabaseFilterWithOrFields<TQuery>(
  query: TQuery,
  fieldKey: string,
  operator: FilterOperator,
  value: unknown,
  fieldConfig?: FilterBuilderFieldConfig,
): TQuery {
  const supabaseQuery = query as SupabaseFilterQuery<TQuery>;
  const orFields: string[] | undefined = fieldConfig?.orFields;

  if (orFields && orFields.length > 0) {
    const orCondition = orFields
      .map(field => buildPostgrestFilterExpr(field, operator, value))
      .join(',');
    return supabaseQuery.or(orCondition);
  }

  return applySupabaseFilter(query, fieldKey, operator, value);
}
