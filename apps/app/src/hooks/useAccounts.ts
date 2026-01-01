import { useEntities } from './useEntities';

/**
 * Hook for fetching accounts from RxDB
 * Uses the universal useEntities hook with ID-First support
 */
export function useAccounts(params: {
  recordsCount?: number;
  from?: number;
  filters?: any;
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
    parameter?: string; // For JSONB fields
  };
} = {}) {
  return useEntities({
    entityType: 'account',
    recordsCount: params.recordsCount || 50,
    from: params.from || 0,
    filters: params.filters,
    orderBy: params.orderBy
  });
}
