/**
 * Filter Builder Utilities
 *
 * Pure functions for building filter expressions across RxDB, Supabase, and PostgREST.
 * Extracted from SpaceStore to enable reuse and testing.
 */

// ============= RxDB Filters =============

/**
 * Build RxDB condition object from operator + value
 */
export function buildRxDBCondition(operator: string, value: any): any {
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
  selector: any,
  fieldKey: string,
  operator: string,
  value: any,
  fieldConfig: any
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
export function applyRxDBFilter(query: any, fieldName: string, operator: string, value: any): any {
  switch (operator) {
    case 'ilike':
    case 'contains': {
      const escapedValue = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return query.where(fieldName).regex(escapedValue);
    }
    case 'eq':
      return query.where(fieldName).eq(value);
    case 'ne':
      return query.where(fieldName).ne(value);
    case 'gt':
      return query.where(fieldName).gt(value);
    case 'gte':
      return query.where(fieldName).gte(value);
    case 'lt':
      return query.where(fieldName).lt(value);
    case 'lte':
      return query.where(fieldName).lte(value);
    case 'in': {
      const arrayValue = Array.isArray(value) ? value : [value];
      return query.where(fieldName).in(arrayValue);
    }
    case 'between': {
      const [from, to] = String(value).split('_');
      if (from) query = query.where(fieldName).gte(from);
      if (to) query = query.where(fieldName).lte(to);
      return query;
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
export function applySupabaseFilter(query: any, fieldName: string, operator: string, value: any): any {
  switch (operator) {
    case 'ilike':
    case 'contains':
      return query.ilike(fieldName, `%${value}%`);
    case 'eq':
      return query.eq(fieldName, value);
    case 'ne':
      return query.neq(fieldName, value);
    case 'gt':
      return query.gt(fieldName, value);
    case 'gte':
      return query.gte(fieldName, value);
    case 'lt':
      return query.lt(fieldName, value);
    case 'lte':
      return query.lte(fieldName, value);
    case 'in': {
      const arrayValue = Array.isArray(value) ? value : [value];
      return query.in(fieldName, arrayValue);
    }
    case 'between': {
      const [from, to] = String(value).split('_');
      if (from) query = query.gte(fieldName, from);
      if (to) query = query.lte(fieldName, to);
      return query;
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
export function buildPostgrestFilterExpr(fieldName: string, operator: string, value: any): string {
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
export function applySupabaseFilterWithOrFields(
  query: any,
  fieldKey: string,
  operator: string,
  value: any,
  fieldConfig: any
): any {
  const orFields: string[] | undefined = fieldConfig?.orFields;

  if (orFields && orFields.length > 0) {
    const orCondition = orFields
      .map(field => buildPostgrestFilterExpr(field, operator, value))
      .join(',');
    return query.or(orCondition);
  }

  return applySupabaseFilter(query, fieldKey, operator, value);
}
