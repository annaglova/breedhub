import { useEntities } from './useEntities';

/**
 * Hook for fetching projects from RxDB
 * Uses the universal useEntities hook with ID-First support
 */
export function useProjects(params: {
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
    entityType: 'project',
    recordsCount: params.recordsCount || 50,
    from: params.from || 0,
    filters: params.filters,
    orderBy: params.orderBy
  });
}
