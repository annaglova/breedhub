import { useEffect, useState, useCallback, useRef } from 'react';
import { spaceStore } from '@breedhub/rxdb-store';
import { useSignals } from '@preact/signals-react/runtime';

interface UseEntitiesParams {
  entityType: string;
  recordsCount?: number;
  from?: number;
  filters?: Record<string, any>;
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
    parameter?: string; // For JSONB fields (e.g., measurements->achievement_progress)
    tieBreaker?: {
      field: string;
      direction: 'asc' | 'desc';
    };
  };
  /** If false, data fetching is disabled */
  enabled?: boolean;
}

/**
 * Universal hook for fetching entities from RxDB through SpaceStore
 *
 * Two modes:
 * 1. With filters/orderBy → Uses ID-First pagination via applyFilters()
 * 2. Without filters → Uses manual replication via entityStore.entityList
 *
 * Works with any entity type dynamically
 */
export function useEntities({
  entityType,
  recordsCount = 50,
  from = 0,
  filters,
  orderBy,
  enabled = true
}: UseEntitiesParams) {
  useSignals();

  const [data, setData] = useState<{ entities: any[]; total: number }>({
    entities: [],
    total: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // ID-First pagination state
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingRef = useRef(false);

  // Determine mode based on filters/orderBy
  const useIDFirst = filters || orderBy;

  // ID-First mode: loadMore with cursor pagination
  const loadMore = useCallback(async () => {
    if (!useIDFirst || isLoadingRef.current || !hasMore || !enabled) {
      console.log('[useEntities] loadMore blocked:', { useIDFirst, isLoading: isLoadingRef.current, hasMore, enabled });
      return;
    }

    isLoadingRef.current = true;
    setIsLoadingMore(true);

    try {
      console.log('[useEntities] loadMore with cursor:', cursor);

      const result = await spaceStore.applyFilters(
        entityType,
        filters || {},
        {
          limit: recordsCount,
          cursor,
          orderBy: orderBy || { field: 'name', direction: 'asc' }
        }
      );

      console.log('[useEntities] loadMore result:', {
        recordsCount: result.records.length,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor
      });

      // Append new records to existing (with deduplication)
      setData(prev => {
        const existingIds = new Set(prev.entities.map(e => e.id));
        const newRecords = result.records.filter(r => !existingIds.has(r.id));

        console.log('[useEntities] Dedupe:', {
          existing: prev.entities.length,
          fetched: result.records.length,
          unique: newRecords.length,
          duplicates: result.records.length - newRecords.length
        });

        return {
          entities: [...prev.entities, ...newRecords],
          total: prev.total + newRecords.length
        };
      });

      setCursor(result.nextCursor);
      setHasMore(result.hasMore);

    } catch (err) {
      console.error('[useEntities] loadMore error:', err);
      setError(err as Error);
    } finally {
      isLoadingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [entityType, filters, orderBy, recordsCount, cursor, hasMore, useIDFirst, enabled]);

  // ID-First mode: Initial load effect + subscribe to totalFromServer
  useEffect(() => {
    if (!useIDFirst) return;

    // Skip loading if disabled
    if (!enabled) {
      setIsLoading(prev => prev ? false : prev);
      setData(prev => prev.entities.length === 0 && prev.total === 0 ? prev : { entities: [], total: 0 });
      return;
    }

    // ⚠️ Don't start loading until SpaceStore config is ready (to avoid multiple loads with changing params)
    if (!spaceStore.configReady.value) {
      return;
    }

    let isMounted = true;
    let unsubscribeTotal: (() => void) | null = null;

    const loadInitial = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setCursor(null);
        setHasMore(true);

        // Wait for SpaceStore to be fully initialized
        let retries = 20;
        while (!spaceStore.initialized.value && retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries--;
        }

        if (!spaceStore.initialized.value) {
          console.error('[useEntities] SpaceStore not initialized after retries');
          throw new Error('SpaceStore not initialized');
        }

        // Get entityStore to subscribe to totalFromServer (with retries)
        let entityStore = null;
        retries = 20;
        while (!entityStore && retries > 0) {
          entityStore = await spaceStore.getEntityStore(entityType);
          if (!entityStore) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries--;
          }
        }

        if (!entityStore) {
          console.warn(`[useEntities] EntityStore for ${entityType} not available after retries`);
        }

        const result = await spaceStore.applyFilters(
          entityType,
          filters || {},
          {
            limit: recordsCount,
            cursor: null,
            orderBy: orderBy || { field: 'name', direction: 'asc' }
          }
        );

        if (!isMounted) return;

        // Use result.total from applyFilters (filter-aware count)
        // Don't use entityStore.totalFromServer - it's global and doesn't respect filters
        setData({
          entities: result.records,
          total: result.total  // Filter-aware total from applyFilters
        });

        setCursor(result.nextCursor);
        setHasMore(result.hasMore);
        setIsLoading(false);

        console.log('[useEntities] Initial load complete:', {
          recordsCount: result.records.length,
          hasMore: result.hasMore,
          nextCursor: result.nextCursor
        });

      } catch (err) {
        console.error(`[useEntities] Error loading ${entityType}:`, err);
        if (isMounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    };

    loadInitial();

    return () => {
      isMounted = false;
      if (unsubscribeTotal) {
        unsubscribeTotal();
      }
    };
  }, [entityType, filters, orderBy, recordsCount, useIDFirst, enabled]);

  // Manual replication mode: Subscribe to entityList (backward compatibility)
  useEffect(() => {
    if (useIDFirst) return; // Skip if using ID-First

    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    const loadEntities = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Wait for SpaceStore to be initialized with retries (faster polling)
        let retries = 20;
        while (!spaceStore.initialized.value && retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries--;
        }

        // Get the entity store for the specified type with retries (faster polling)
        let entityStore = null;
        retries = 20;
        while (!entityStore && retries > 0) {
          entityStore = await spaceStore.getEntityStore(entityType);
          if (!entityStore) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries--;
          }
        }

        if (!entityStore) {
          console.error(`[useEntities] Entity store for ${entityType} not available after retries`);
          throw new Error(`Entity store for ${entityType} not available`);
        }

        // Subscribe to changes in the entity store using signal subscriptions
        // Preact signals automatically trigger React re-renders when .value changes
        const updateData = () => {
          if (!isMounted) return;

          // Read signal values - this creates a subscription in React
          const allEntities = entityStore.entityList.value;
          const totalFromServer = entityStore.totalFromServer.value;

          // Don't show local count as total - it's misleading
          // If totalFromServer is null, we're still loading the real count
          const total = totalFromServer !== null ? totalFromServer : 0;

          setData({
            entities: [...allEntities], // Create new array to trigger React update
            total
          });
          setIsLoading(false);
        };

        // Manual subscriptions to force React state updates
        const unsubscribeList = entityStore.entityList.subscribe((newList) => {
          if (!isMounted) return;

          const totalFromServer = entityStore.totalFromServer.value;
          const total = totalFromServer !== null ? totalFromServer : 0;

          setData({
            entities: [...newList], // Create new array reference
            total
          });
        });

        const unsubscribeTotal = entityStore.totalFromServer.subscribe((total) => {
          if (!isMounted) return;

          const allEntities = entityStore.entityList.value;
          const finalTotal = total !== null ? total : 0;

          setData({
            entities: [...allEntities],
            total: finalTotal
          });
        });

        // Initial load
        updateData();

        unsubscribe = () => {
          unsubscribeList();
          unsubscribeTotal();
        };

      } catch (err) {
        console.error(`[useEntities] Error loading ${entityType}:`, err);
        if (isMounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    };

    loadEntities();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [entityType, useIDFirst]);

  return {
    data,
    isLoading,
    isLoadingMore, // NEW: для індикатора scroll loading
    isFetching: isLoading, // For compatibility with existing code
    error,
    hasMore, // NEW: чи є ще дані для loadMore
    loadMore, // NEW: функція для scroll pagination
    refetch: () => {
      // For compatibility with existing code
      setIsLoading(true);
      setError(null);
      setCursor(null);
      setHasMore(true);
    }
  };
}