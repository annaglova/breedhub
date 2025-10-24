import { useEffect, useState, useCallback, useRef } from 'react';
import { spaceStore } from '@breedhub/rxdb-store';
import { useSignals } from '@preact/signals-react/runtime';

interface UseEntitiesParams {
  entityType: string;
  rows?: number;
  from?: number;
  filters?: Record<string, any>;
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
    parameter?: string; // For JSONB fields (e.g., measurements->achievement_progress)
  };
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
  rows = 50,
  from = 0,
  filters,
  orderBy
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
    if (!useIDFirst || isLoadingRef.current || !hasMore) {
      console.log('[useEntities] loadMore blocked:', { useIDFirst, isLoading: isLoadingRef.current, hasMore });
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
          limit: rows,
          cursor,
          orderBy: orderBy || { field: 'name', direction: 'asc' }
        }
      );

      console.log('[useEntities] loadMore result:', {
        recordsCount: result.records.length,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor
      });

      // Append new records to existing
      setData(prev => ({
        entities: [...prev.entities, ...result.records],
        total: prev.total + result.records.length
      }));

      setCursor(result.nextCursor);
      setHasMore(result.hasMore);

    } catch (err) {
      console.error('[useEntities] loadMore error:', err);
      setError(err as Error);
    } finally {
      isLoadingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [entityType, filters, orderBy, rows, cursor, hasMore, useIDFirst]);

  // ID-First mode: Initial load effect + subscribe to totalFromServer
  useEffect(() => {
    if (!useIDFirst) return;

    let isMounted = true;
    let unsubscribeTotal: (() => void) | null = null;

    const loadInitial = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setCursor(null);
        setHasMore(true);

        console.log('[useEntities] Initial ID-First load:', {
          entityType,
          filters,
          orderBy,
          rows
        });

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
            limit: rows,
            cursor: null,
            orderBy: orderBy || { field: 'name', direction: 'asc' }
          }
        );

        if (!isMounted) return;

        console.log('[useEntities] Initial load result:', {
          recordsCount: result.records.length,
          hasMore: result.hasMore,
          nextCursor: result.nextCursor
        });

        // Subscribe to totalFromServer to get real count from manual replication
        if (entityStore) {
          const totalFromServer = entityStore.totalFromServer.value;
          const realTotal = totalFromServer !== null ? totalFromServer : result.records.length;

          console.log('[useEntities] Setting initial data:', {
            recordsCount: result.records.length,
            totalFromServer,
            realTotal
          });

          setData({
            entities: result.records,
            total: realTotal  // Use real count from server, not just loaded records
          });

          // Subscribe to future updates
          unsubscribeTotal = entityStore.totalFromServer.subscribe((total) => {
            if (!isMounted) return;
            const finalTotal = total !== null ? total : result.records.length;
            console.log('[useEntities] totalFromServer updated:', { total, finalTotal });
            setData(prev => ({
              ...prev,
              total: finalTotal
            }));
          });
        } else {
          // Fallback if entityStore not available
          console.log('[useEntities] No entityStore, using fallback');
          setData({
            entities: result.records,
            total: result.records.length
          });
        }

        setCursor(result.nextCursor);
        setHasMore(result.hasMore);
        setIsLoading(false);

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
  }, [entityType, filters, orderBy, rows, useIDFirst]);

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