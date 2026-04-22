import {
  useEntities,
  type EntityListHookParams,
  type EntityListHookResult,
} from './useEntities';

/**
 * Hook for fetching accounts from RxDB
 * Uses the universal useEntities hook with ID-First support
 */
export function useAccounts(
  params: EntityListHookParams = {},
): EntityListHookResult {
  return useEntities({
    entityType: 'account',
    recordsCount: params.recordsCount || 50,
    from: params.from || 0,
    filters: params.filters,
    orderBy: params.orderBy
  });
}
