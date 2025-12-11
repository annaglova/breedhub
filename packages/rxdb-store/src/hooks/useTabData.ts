/**
 * useTabData - Universal hook for loading tab data from config
 *
 * Uses TabDataService to route to appropriate loading strategy
 * while maintaining Local-First architecture (all data through RxDB).
 *
 * @see docs/TAB_DATA_SERVICE_ARCHITECTURE.md
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useTabData({
 *   parentId: breedId,
 *   dataSource: tabConfig.dataSource,
 *   enabled: !!breedId
 * });
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { tabDataService } from '../services/tab-data.service';
import { spaceStore } from '../stores/space-store.signal-store';
import type {
  DataSourceConfig,
  TabDataResult,
  UseTabDataOptions,
} from '../types/tab-data.types';

export function useTabData<T = any>({
  parentId,
  dataSource,
  enabled = true,
}: UseTabDataOptions): TabDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  const loadData = useCallback(async () => {
    // Skip if disabled or missing required params
    if (!enabled || !parentId || !dataSource) {
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
      // Wait for SpaceStore initialization
      let retries = 20;
      while (!spaceStore.initialized.value && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        retries--;
      }

      if (!spaceStore.initialized.value) {
        throw new Error('SpaceStore not initialized');
      }

      // Load data via TabDataService
      const records = await tabDataService.loadTabData(parentId, dataSource);

      if (mountedRef.current) {
        setData(records as T[]);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('[useTabData] Error:', err);
      if (mountedRef.current) {
        setError(err as Error);
        setIsLoading(false);
      }
    } finally {
      loadingRef.current = false;
    }
  }, [parentId, dataSource, enabled]);

  // Load on mount and when params change
  useEffect(() => {
    mountedRef.current = true;
    loadData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadData]);

  // Manual refetch
  const refetch = useCallback(async () => {
    loadingRef.current = false;
    await loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
