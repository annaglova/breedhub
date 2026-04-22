import { useQuery } from '@tanstack/react-query';
import {
  useEntities,
  type EntityListHookParams,
  type EntityListHookResult,
} from './useEntities';
import { api } from '@/services/api';

/**
 * Hook for fetching breeds from RxDB
 * Now uses the universal useEntities hook with ID-First support
 */
export function useBreeds(
  params: EntityListHookParams = {},
): EntityListHookResult {
  return useEntities({
    entityType: 'breed',
    recordsCount: params.recordsCount || 50,
    from: params.from || 0,
    filters: params.filters,
    orderBy: params.orderBy
  });
}

export function useBreedById(id: string | undefined) {
  return useQuery({
    queryKey: ['breed', id],
    queryFn: () => id ? api.getBreedById(id) : null,
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
