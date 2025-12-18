import { useEntities } from './useEntities';

/**
 * Hook for fetching pets from RxDB
 * Uses the universal useEntities hook with ID-First support
 */
export function usePets(params: {
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
    entityType: 'pet',
    recordsCount: params.recordsCount || 50,
    from: params.from || 0,
    filters: params.filters,
    orderBy: params.orderBy
  });
}
