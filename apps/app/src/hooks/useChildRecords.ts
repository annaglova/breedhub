import { useEffect, useState, useCallback, useRef } from 'react';
import { spaceStore } from '@breedhub/rxdb-store';

interface UseChildRecordsParams {
  parentId: string | null | undefined;
  tableType: string;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  enabled?: boolean;
}

interface UseChildRecordsResult<T = any> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching child records from SpaceStore
 *
 * Supports lazy loading from Supabase with RxDB caching.
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, error } = useChildRecords({
 *   parentId: breed.id,
 *   tableType: 'achievement_in_breed',
 *   orderBy: 'created_at',
 *   orderDirection: 'desc'
 * });
 * ```
 */
export function useChildRecords<T = any>({
  parentId,
  tableType,
  limit = 50,
  orderBy,
  orderDirection = 'asc',
  enabled = true
}: UseChildRecordsParams): UseChildRecordsResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  const loadData = useCallback(async () => {
    // Skip if no parentId or disabled
    if (!parentId || !enabled) {
      setData([]);
      setIsLoading(false);
      return;
    }

    // Prevent duplicate loads
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Wait for SpaceStore to be initialized
      let retries = 20;
      while (!spaceStore.initialized.value && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries--;
      }

      if (!spaceStore.initialized.value) {
        throw new Error('SpaceStore not initialized');
      }

      // Load child records (will check cache first, then Supabase)
      const records = await spaceStore.loadChildRecords(
        parentId,
        tableType,
        { limit, orderBy, orderDirection }
      );

      if (mountedRef.current) {
        setData(records as T[]);
        setIsLoading(false);
      }

    } catch (err) {
      if (mountedRef.current) {
        setError(err as Error);
        setIsLoading(false);
      }
    } finally {
      loadingRef.current = false;
    }
  }, [parentId, tableType, limit, orderBy, orderDirection, enabled]);

  // Load on mount and when params change
  useEffect(() => {
    mountedRef.current = true;
    loadData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadData]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    loadingRef.current = false;
    await loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refetch
  };
}
