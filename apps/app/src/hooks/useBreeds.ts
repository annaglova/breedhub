import { useEntities } from './useEntities';

/**
 * Hook for fetching breeds from RxDB
 * Now uses the universal useEntities hook
 */
export function useBreeds(params: {
  rows?: number;
  from?: number;
  filters?: any;
} = {}) {
  return useEntities({
    entityType: 'breed',
    rows: params.rows || 50,
    from: params.from || 0,
    filters: params.filters
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