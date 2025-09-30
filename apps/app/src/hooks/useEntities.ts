import { useEffect, useState } from 'react';
import { spaceStore } from '@breedhub/rxdb-store';
import { useSignals } from '@preact/signals-react/runtime';

interface UseEntitiesParams {
  entityType: string;
  rows?: number;
  from?: number;
  filters?: any;
}

/**
 * Universal hook for fetching entities from RxDB through SpaceStore
 * Works with any entity type dynamically
 */
export function useEntities({
  entityType,
  rows = 50,
  from = 0,
  filters
}: UseEntitiesParams) {
  useSignals();

  const [data, setData] = useState<{ entities: any[]; total: number }>({
    entities: [],
    total: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    const loadEntities = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Wait for SpaceStore to be initialized with retries (faster polling)
        let retries = 20;
        while (!spaceStore.initialized.value && retries > 0) {
          console.log(`[useEntities] Waiting for SpaceStore initialization... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms instead of 500ms
          retries--;
        }

        // Get the entity store for the specified type with retries (faster polling)
        let entityStore = null;
        retries = 20;
        while (!entityStore && retries > 0) {
          entityStore = await spaceStore.getEntityStore(entityType);
          if (!entityStore) {
            console.log(`[useEntities] Waiting for ${entityType} store... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms instead of 500ms
            retries--;
          }
        }

        if (!entityStore) {
          console.error(`[useEntities] Entity store for ${entityType} not available after retries`);
          throw new Error(`Entity store for ${entityType} not available`);
        }

        console.log(`[useEntities] Got entity store for ${entityType}, items:`, entityStore.total.value);

        // Subscribe to changes in the entity store
        const updateData = () => {
          if (!isMounted) return;

          const allEntities = entityStore.entityList.value;
          const to = from + rows;
          const paginatedEntities = allEntities.slice(from, to);

          // Use totalFromServer if available, otherwise null (wait for server)
          const totalFromServer = entityStore.totalFromServer.value;

          // Don't show local count as total - it's misleading
          // If totalFromServer is null, we're still loading the real count
          const total = totalFromServer !== null ? totalFromServer : 0;

          console.log(`[useEntities] updateData:`, {
            totalFromServer,
            localCount: allEntities.length,
            finalTotal: total
          });

          setData({
            entities: paginatedEntities,
            total
          });
          setIsLoading(false);
        };

        // Initial load
        updateData();

        // Subscribe to future changes
        const unsubscribeList = entityStore.entityList.subscribe(() => {
          // Commented out for less noise
          // console.log(`[useEntities] Entity list updated for ${entityType}`);
          updateData();
        });

        // Subscribe to totalFromServer changes
        const unsubscribeTotal = entityStore.totalFromServer.subscribe((total) => {
          console.log(`[useEntities] totalFromServer changed to:`, total);
          updateData();
        });

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
  }, [entityType, from, rows]);

  return {
    data,
    isLoading,
    isFetching: isLoading, // For compatibility with existing code
    error,
    refetch: () => {
      // For compatibility with existing code
      setIsLoading(true);
      setError(null);
    }
  };
}