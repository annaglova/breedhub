/**
 * useTabData - Universal hook for loading tab data from config
 *
 * Uses TabDataService to route to appropriate loading strategy
 * while maintaining Local-First architecture (all data through RxDB).
 *
 * Auto-refetches when background child refresh completes (via childRefreshSignal).
 *
 * @see docs/TAB_DATA_SERVICE_ARCHITECTURE.md
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { tabDataService } from '../services/tab-data.service';
import { spaceStore } from '../stores/space-store.signal-store';
import type {
  TabDataResult,
  UseTabDataOptions,
} from '../types/tab-data.types';
import { waitForSpaceStoreReady } from './space-store-ready.helpers';

export function useTabData<T = any>({
  parentId,
  dataSource,
  enabled = true,
  enrich,
}: UseTabDataOptions & { enrich?: (records: any[]) => Promise<any[]> }): TabDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loadPhase, setLoadPhase] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  // Derived: isLoading = true until load completes (no gap on first render)
  const isLoading = enabled && loadPhase !== 'done';

  const loadData = useCallback(async (silent = false) => {
    // Skip if disabled or missing required params
    if (!enabled || !parentId || !dataSource) {
      setData([]);
      setLoadPhase('done');
      return;
    }

    // Prevent duplicate loads
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    if (!silent) setLoadPhase('loading');
    setError(null);

    try {
      await waitForSpaceStoreReady();

      // Load data via TabDataService
      let records = await tabDataService.loadTabData(parentId, dataSource);

      // Enrich inline (FK resolution) — atomic: one setData with final enriched result
      if (enrich && records.length > 0) {
        records = await enrich(records);
      }

      if (mountedRef.current) {
        setData(records as T[]);
        setLoadPhase('done');
      }
    } catch (err) {
      console.error('[useTabData] Error:', err);
      if (mountedRef.current) {
        setError(err as Error);
        setLoadPhase('done');
      }
    } finally {
      loadingRef.current = false;
    }
  }, [parentId, dataSource, enabled, enrich]);

  // Reset phase when params change (new entity, different tab)
  useEffect(() => {
    setLoadPhase('idle');
  }, [parentId, dataSource]);

  // Load on mount and when params change
  useEffect(() => {
    mountedRef.current = true;
    loadData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadData]);

  // Auto-refetch when background child refresh completes for this table+parent
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const signalValue = enabled ? spaceStore.childRefreshSignal.value : null;
  useEffect(() => {
    if (!enabled || !signalValue || !parentId || !dataSource?.childTable) return;

    const tableType = dataSource.childTable.table?.replace(/_with_\w+$/, '');
    if (signalValue.parentId === parentId && signalValue.tableType === tableType) {
      loadingRef.current = false;
      loadData(true); // silent — no skeleton
    }
  }, [signalValue, parentId, dataSource, loadData, enabled]);

  // Manual refetch (silent — data updates without skeleton)
  const refetch = useCallback(async () => {
    loadingRef.current = false;
    await loadData(true);
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
