/**
 * Filter Builder Unit Tests
 *
 * Tests pure filter functions for RxDB, Supabase, and PostgREST.
 *
 * Run: pnpm --filter @breedhub/rxdb-store test
 */

import { describe, it, expect } from 'vitest';
import {
  buildRxDBCondition,
  applyFilterToRxDBSelector,
  applySupabaseFilter,
  buildPostgrestFilterExpr,
  applySupabaseFilterWithOrFields,
  type RxDBSelectorLike,
  type SupabaseFilterQuery,
} from '../filter-builder';

// ============= buildRxDBCondition =============

describe('buildRxDBCondition', () => {
  it('builds regex for ilike/contains', () => {
    const result = buildRxDBCondition('ilike', 'test');
    expect(result).toEqual({ $regex: 'test', $options: 'i' });
  });

  it('escapes regex special characters', () => {
    const result = buildRxDBCondition('contains', 'test.value') as { $regex: string };
    expect(result.$regex).toBe('test\\.value');
  });

  it('returns value directly for eq', () => {
    expect(buildRxDBCondition('eq', 'abc')).toBe('abc');
    expect(buildRxDBCondition('eq', 123)).toBe(123);
  });

  it('wraps in operator object for comparisons', () => {
    expect(buildRxDBCondition('ne', 5)).toEqual({ $ne: 5 });
    expect(buildRxDBCondition('gt', 10)).toEqual({ $gt: 10 });
    expect(buildRxDBCondition('gte', 10)).toEqual({ $gte: 10 });
    expect(buildRxDBCondition('lt', 10)).toEqual({ $lt: 10 });
    expect(buildRxDBCondition('lte', 10)).toEqual({ $lte: 10 });
  });

  it('wraps in $in for in operator', () => {
    expect(buildRxDBCondition('in', [1, 2, 3])).toEqual({ $in: [1, 2, 3] });
    expect(buildRxDBCondition('in', 'single')).toEqual({ $in: ['single'] });
  });

  it('returns value for unknown operator', () => {
    expect(buildRxDBCondition('unknown', 'val')).toBe('val');
  });
});

// ============= applyFilterToRxDBSelector =============

describe('applyFilterToRxDBSelector', () => {
  it('sets simple field condition', () => {
    const selector: RxDBSelectorLike = {};
    applyFilterToRxDBSelector(selector, 'name', 'eq', 'Rex', {});
    expect(selector.name).toBe('Rex');
  });

  it('builds $or condition with orFields', () => {
    const selector: RxDBSelectorLike = {};
    applyFilterToRxDBSelector(selector, 'breed_id', 'eq', '123', {
      orFields: ['father_breed_id', 'mother_breed_id'],
    });
    const and = selector.$and as Array<{ $or: Array<Record<string, unknown>> }>;
    expect(and).toHaveLength(1);
    expect(and[0].$or).toHaveLength(2);
    expect(and[0].$or[0]).toEqual({ father_breed_id: '123' });
    expect(and[0].$or[1]).toEqual({ mother_breed_id: '123' });
  });

  it('accumulates $and conditions', () => {
    const selector: RxDBSelectorLike = {};
    applyFilterToRxDBSelector(selector, 'f1', 'eq', 'a', { orFields: ['x', 'y'] });
    applyFilterToRxDBSelector(selector, 'f2', 'eq', 'b', { orFields: ['z'] });
    expect(selector.$and).toHaveLength(2);
  });
});

// ============= buildPostgrestFilterExpr =============

describe('buildPostgrestFilterExpr', () => {
  it('builds eq expression', () => {
    expect(buildPostgrestFilterExpr('breed_id', 'eq', '123')).toBe('breed_id.eq.123');
  });

  it('builds ilike expression', () => {
    expect(buildPostgrestFilterExpr('name', 'ilike', 'rex')).toBe('name.ilike.%rex%');
  });

  it('builds in expression with array', () => {
    expect(buildPostgrestFilterExpr('status', 'in', ['active', 'pending']))
      .toBe('status.in.(active,pending)');
  });

  it('builds comparison expressions', () => {
    expect(buildPostgrestFilterExpr('age', 'gt', 5)).toBe('age.gt.5');
    expect(buildPostgrestFilterExpr('age', 'lte', 10)).toBe('age.lte.10');
  });

  it('defaults to eq for unknown operator', () => {
    expect(buildPostgrestFilterExpr('field', 'unknown', 'val')).toBe('field.eq.val');
  });
});

// ============= applySupabaseFilterWithOrFields =============

describe('applySupabaseFilterWithOrFields', () => {
  it('delegates to applySupabaseFilter without orFields', () => {
    const query: SupabaseFilterQuery<{ type: string; field: string; value: unknown }> = {
      ilike: () => ({ type: 'ilike', field: '', value: '' }),
      eq: (field: string, value: unknown) => ({ type: 'eq', field, value }),
      neq: () => ({ type: 'neq', field: '', value: '' }),
      gt: () => ({ type: 'gt', field: '', value: '' }),
      gte: () => ({ type: 'gte', field: '', value: '' }),
      lt: () => ({ type: 'lt', field: '', value: '' }),
      lte: () => ({ type: 'lte', field: '', value: '' }),
      in: () => ({ type: 'in', field: '', value: '' }),
      or: () => ({ type: 'or', field: '', value: '' }),
    };
    const result = applySupabaseFilterWithOrFields(query, 'breed_id', 'eq', '123', {});
    expect(result).toEqual({ type: 'eq', field: 'breed_id', value: '123' });
  });

  it('builds OR condition with orFields', () => {
    let orArg = '';
    type OrQuery = SupabaseFilterQuery<OrQuery>;
    const query: OrQuery = {
      ilike: () => query,
      eq: () => query,
      neq: () => query,
      gt: () => query,
      gte: () => query,
      lt: () => query,
      lte: () => query,
      in: () => query,
      or: (condition: string) => { orArg = condition; return query; },
    };
    applySupabaseFilterWithOrFields(query, 'breed_id', 'eq', '123', {
      orFields: ['father_breed_id', 'mother_breed_id'],
    });
    expect(orArg).toBe('father_breed_id.eq.123,mother_breed_id.eq.123');
  });
});

// ============= applySupabaseFilter =============

describe('applySupabaseFilter', () => {
  function mockQuery() {
    type CallRecord = { method: string; args: unknown[] };
    type ProxyQuery = SupabaseFilterQuery<ProxyQuery>;
    const calls: CallRecord[] = [];
    const proxy: ProxyQuery = {
      ilike: (fieldName: string, value: string) => {
        calls.push({ method: 'ilike', args: [fieldName, value] });
        return proxy;
      },
      eq: (fieldName: string, value: unknown) => {
        calls.push({ method: 'eq', args: [fieldName, value] });
        return proxy;
      },
      neq: (fieldName: string, value: unknown) => {
        calls.push({ method: 'neq', args: [fieldName, value] });
        return proxy;
      },
      gt: (fieldName: string, value: unknown) => {
        calls.push({ method: 'gt', args: [fieldName, value] });
        return proxy;
      },
      gte: (fieldName: string, value: unknown) => {
        calls.push({ method: 'gte', args: [fieldName, value] });
        return proxy;
      },
      lt: (fieldName: string, value: unknown) => {
        calls.push({ method: 'lt', args: [fieldName, value] });
        return proxy;
      },
      lte: (fieldName: string, value: unknown) => {
        calls.push({ method: 'lte', args: [fieldName, value] });
        return proxy;
      },
      in: (fieldName: string, values: unknown[]) => {
        calls.push({ method: 'in', args: [fieldName, values] });
        return proxy;
      },
      or: (condition: string) => {
        calls.push({ method: 'or', args: [condition] });
        return proxy;
      },
    };
    return { proxy, calls };
  }

  it('calls ilike for contains operator', () => {
    const { proxy, calls } = mockQuery();
    applySupabaseFilter(proxy, 'name', 'contains', 'rex');
    expect(calls[0].method).toBe('ilike');
    expect(calls[0].args).toEqual(['name', '%rex%']);
  });

  it('calls eq for eq operator', () => {
    const { proxy, calls } = mockQuery();
    applySupabaseFilter(proxy, 'id', 'eq', '123');
    expect(calls[0].method).toBe('eq');
    expect(calls[0].args).toEqual(['id', '123']);
  });

  it('calls in for in operator with array', () => {
    const { proxy, calls } = mockQuery();
    applySupabaseFilter(proxy, 'status', 'in', ['a', 'b']);
    expect(calls[0].method).toBe('in');
    expect(calls[0].args).toEqual(['status', ['a', 'b']]);
  });

  it('wraps single value in array for in operator', () => {
    const { proxy, calls } = mockQuery();
    applySupabaseFilter(proxy, 'status', 'in', 'single');
    expect(calls[0].args[1]).toEqual(['single']);
  });
});
