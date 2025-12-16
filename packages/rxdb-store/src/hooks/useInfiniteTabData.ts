/**
 * useInfiniteTabData - Hook for infinite scroll tab data loading
 *
 * Uses ID-First architecture with composite cursor pagination.
 * Accumulates data from multiple pages and provides loadMore functionality.
 *
 * @see docs/INFINITE_SCROLL_TODO.md
 * @see docs/TAB_DATA_SERVICE_ARCHITECTURE.md
 *
 * @example
 * ```tsx
 * const {
 *   data,
 *   isLoading,
 *   isLoadingMore,
 *   hasMore,
 *   loadMore,
 *   refetch
 * } = useInfiniteTabData({
 *   parentId: breedId,
 *   dataSource: tabConfig.dataSource,
 *   pageSize: 30,
 *   enabled: !!breedId
 * });
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { tabDataService } from '../services/tab-data.service';
import { spaceStore } from '../stores/space-store.signal-store';
import type {
  InfiniteTabDataResult,
  UseInfiniteTabDataOptions,
} from '../types/tab-data.types';

const DEFAULT_PAGE_SIZE = 30;

export function useInfiniteTabData<T = any>({
  parentId,
  dataSource,
  enabled = true,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseInfiniteTabDataOptions): InfiniteTabDataResult<T> {
  // Accumulated data from all loaded pages
  const [data, setData] = useState<T[]>([]);
  // Initial loading state (first page)
  const [isLoading, setIsLoading] = useState(false);
  // Loading more state (subsequent pages)
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Whether more records are available
  const [hasMore, setHasMore] = useState(true);
  // Total records loaded
  const [total, setTotal] = useState(0);
  // Error state
  const [error, setError] = useState<Error | null>(null);

  // Store cursor as JSON string (composite cursor)
  const cursorRef = useRef<string | null>(null);
  // Prevent concurrent loads
  const loadingRef = useRef(false);
  // Track mounted state
  const mountedRef = useRef(true);

  /**
   * Load initial page of data
   */
  const loadInitialData = useCallback(async () => {
    // Skip if disabled or missing required params
    if (!enabled || !parentId || !dataSource) {
      setData([]);
      setIsLoading(false);
      setHasMore(false);
      setTotal(0);
      return;
    }

    // Prevent duplicate loads
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    cursorRef.current = null;

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

      // Load first page via TabDataService (no cursor = first page)
      console.log('[useInfiniteTabData] Loading initial data, pageSize:', pageSize);
      const result = await tabDataService.loadTabDataPaginated(
        parentId,
        dataSource,
        { cursor: null, limit: pageSize }
      );

      console.log('[useInfiniteTabData] Initial load result:', {
        recordsCount: result.records.length,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor ? '(set)' : null,
        total: result.total,
      });

      if (mountedRef.current) {
        setData(result.records as T[]);
        setHasMore(result.hasMore);
        setTotal(result.total);
        // Store cursor for next page (composite JSON)
        cursorRef.current = result.nextCursor;
        setIsLoading(false);
      }
    } catch (err) {
      console.error('[useInfiniteTabData] Error loading initial data:', err);
      if (mountedRef.current) {
        setError(err as Error);
        setIsLoading(false);
        setHasMore(false);
      }
    } finally {
      loadingRef.current = false;
    }
  }, [parentId, dataSource, enabled, pageSize]);

  /**
   * Load next page of data using composite cursor
   */
  const loadMore = useCallback(async () => {
    console.log('[useInfiniteTabData] loadMore called', {
      enabled,
      parentId,
      hasDataSource: !!dataSource,
      hasMore,
      isLoading: loadingRef.current,
      hasCursor: !!cursorRef.current,
      cursor: cursorRef.current,
    });

    // Skip if disabled, no more data, or already loading
    if (!enabled || !parentId || !dataSource || !hasMore || loadingRef.current) {
      console.log('[useInfiniteTabData] loadMore skipped - conditions not met');
      return;
    }

    // Skip if no cursor (means we're still on first page or at end)
    if (!cursorRef.current) {
      console.log('[useInfiniteTabData] loadMore skipped - no cursor');
      return;
    }

    loadingRef.current = true;
    setIsLoadingMore(true);

    try {
      console.log('[useInfiniteTabData] Fetching next page with cursor');
      // Use cursor for ID-First pagination
      const result = await tabDataService.loadTabDataPaginated(
        parentId,
        dataSource,
        { cursor: cursorRef.current, limit: pageSize }
      );

      console.log('[useInfiniteTabData] Got result:', {
        recordsCount: result.records.length,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      });

      if (mountedRef.current) {
        // Append new records to existing data
        setData(prev => [...prev, ...(result.records as T[])]);
        setHasMore(result.hasMore);
        setTotal(prev => prev + result.records.length);
        // Update cursor for next page
        cursorRef.current = result.nextCursor;
        setIsLoadingMore(false);
      }
    } catch (err) {
      console.error('[useInfiniteTabData] Error loading more:', err);
      if (mountedRef.current) {
        setError(err as Error);
        setIsLoadingMore(false);
      }
    } finally {
      loadingRef.current = false;
    }
  }, [parentId, dataSource, enabled, hasMore, pageSize]);

  /**
   * Reset and reload from beginning
   */
  const refetch = useCallback(async () => {
    loadingRef.current = false;
    setData([]);
    setHasMore(true);
    setTotal(0);
    cursorRef.current = null;
    await loadInitialData();
  }, [loadInitialData]);

  // Track parentId to detect changes and reset state
  const prevParentIdRef = useRef<string | null | undefined>(null);

  // Load initial data on mount and when params change
  useEffect(() => {
    mountedRef.current = true;

    // If parentId changed, reset everything and reload
    if (prevParentIdRef.current !== parentId) {
      console.log('[useInfiniteTabData] parentId changed:', {
        from: prevParentIdRef.current,
        to: parentId
      });
      prevParentIdRef.current = parentId;
      // Reset state for new parent
      loadingRef.current = false;
      cursorRef.current = null;
      setData([]);
      setHasMore(true);
      setTotal(0);
      setError(null);
    }

    loadInitialData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadInitialData, parentId]);

  return {
    data,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    total,
    loadMore,
    refetch,
  };
}
