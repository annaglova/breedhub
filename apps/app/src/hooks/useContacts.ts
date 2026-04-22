import {
  useEntities,
  type EntityListHookParams,
  type EntityListHookResult,
} from './useEntities';

/**
 * Hook for fetching contacts from RxDB
 * Uses the universal useEntities hook with ID-First support
 */
export function useContacts(
  params: EntityListHookParams = {},
): EntityListHookResult {
  return useEntities({
    entityType: 'contact',
    recordsCount: params.recordsCount || 50,
    from: params.from || 0,
    filters: params.filters,
    orderBy: params.orderBy
  });
}
