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
} from '../filter-builder';

// ============= buildRxDBCondition =============

describe('buildRxDBCondition', () => {
  it('builds regex for ilike/contains', () => {
    const result = buildRxDBCondition('ilike', 'test');
    expect(result).toEqual({ $regex: 'test', $options: 'i' });
  });

  it('escapes regex special characters', () => {
    const result = buildRxDBCondition('contains', 'test.value');
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
    const selector: any = {};
    applyFilterToRxDBSelector(selector, 'name', 'eq', 'Rex', {});
    expect(selector.name).toBe('Rex');
  });

  it('builds $or condition with orFields', () => {
    const selector: any = {};
    applyFilterToRxDBSelector(selector, 'breed_id', 'eq', '123', {
      orFields: ['father_breed_id', 'mother_breed_id'],
    });
    expect(selector.$and).toHaveLength(1);
    expect(selector.$and[0].$or).toHaveLength(2);
    expect(selector.$and[0].$or[0]).toEqual({ father_breed_id: '123' });
    expect(selector.$and[0].$or[1]).toEqual({ mother_breed_id: '123' });
  });

  it('accumulates $and conditions', () => {
    const selector: any = {};
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
    const query = {
      eq: (field: string, value: any) => ({ type: 'eq', field, value }),
    };
    const result = applySupabaseFilterWithOrFields(query, 'breed_id', 'eq', '123', {});
    expect(result).toEqual({ type: 'eq', field: 'breed_id', value: '123' });
  });

  it('builds OR condition with orFields', () => {
    let orArg = '';
    const query = {
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
    const calls: any[] = [];
    const proxy: any = new Proxy({}, {
      get: (_, method: string) => (...args: any[]) => {
        calls.push({ method, args });
        return proxy;
      },
    });
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
