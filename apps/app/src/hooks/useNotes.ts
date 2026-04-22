import {
  useEntities,
  type EntityListHookParams,
  type EntityListHookResult,
} from './useEntities';

/**
 * Hook for fetching notes from RxDB
 * Uses the universal useEntities hook with ID-First support
 */
export function useNotes(
  params: EntityListHookParams = {},
): EntityListHookResult {
  return useEntities({
    entityType: 'note',
    recordsCount: params.recordsCount || 50,
    from: params.from || 0,
    filters: params.filters,
    orderBy: params.orderBy
  });
}
