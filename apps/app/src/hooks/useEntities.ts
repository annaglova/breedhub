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
  }, [entityType]); // Removed from/rows - they're not used anymore

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