import { RequestStatus, StoreFeature, CollectionState } from '../types';
import { createStoreFeature } from '../core/create-store-feature';

/**
 * Feature for managing request status
 * Similar to NgRx withRequestStatus
 */
export function withRequestStatus(): StoreFeature<
  Pick<CollectionState<any>, 'requestStatus'>,
  {
    setLoading: () => void;
    setSuccess: () => void;
    setError: (error: Error) => void;
    resetStatus: () => void;
  }
> {
  return createStoreFeature({
    initialState: {
      requestStatus: {
        status: 'idle',
        error: null,
        timestamp: undefined,
      },
    },
    
    computed: {
      // Loading state
      isLoading: (state) => state.requestStatus.status === 'pending',
      
      // Success state
      isSuccess: (state) => state.requestStatus.status === 'fulfilled',
      
      // Error state
      isError: (state) => state.requestStatus.status === 'error',
      
      // Has been loaded at least once
      hasLoaded: (state) => 
        state.requestStatus.status === 'fulfilled' || 
        state.requestStatus.status === 'error',
      
      // Get error message
      errorMessage: (state) => state.requestStatus.error?.message || null,
      
      // Time since last request
      timeSinceLastRequest: (state) => {
        if (!state.requestStatus.timestamp) return null;
        return Date.now() - state.requestStatus.timestamp;
      },
    },
    
    methods: (state, set) => ({
      // Set loading state
      setLoading: () => {
        set((draft) => {
          draft.requestStatus = {
            status: 'pending',
            error: null,
            timestamp: Date.now(),
          };
          return draft;
        });
      },
      
      // Set success state
      setSuccess: () => {
        set((draft) => {
          draft.requestStatus = {
            status: 'fulfilled',
            error: null,
            timestamp: Date.now(),
          };
          return draft;
        });
      },
      
      // Set error state
      setError: (error: Error) => {
        set((draft) => {
          draft.requestStatus = {
            status: 'error',
            error,
            timestamp: Date.now(),
          };
          return draft;
        });
      },
      
      // Reset to idle
      resetStatus: () => {
        set((draft) => {
          draft.requestStatus = {
            status: 'idle',
            error: null,
            timestamp: undefined,
          };
          return draft;
        });
      },
    }),
  });
}

/**
 * Feature for tracking multiple request statuses
 */
export function withMultipleRequestStatus(): StoreFeature<
  { requestStatuses: Map<string, RequestStatus> },
  {
    setRequestLoading: (key: string) => void;
    setRequestSuccess: (key: string) => void;
    setRequestError: (key: string, error: Error) => void;
    resetRequestStatus: (key: string) => void;
    resetAllStatuses: () => void;
  }
> {
  return createStoreFeature({
    initialState: {
      requestStatuses: new Map<string, RequestStatus>(),
    },
    
    computed: {
      // Check if any request is loading
      isAnyLoading: (state) => 
        Array.from(state.requestStatuses.values()).some(
          status => status.status === 'pending'
        ),
      
      // Check if specific request is loading
      isRequestLoading: (state) => (key: string) => {
        const status = state.requestStatuses.get(key);
        return status?.status === 'pending' || false;
      },
      
      // Get all errors
      allErrors: (state) => 
        Array.from(state.requestStatuses.entries())
          .filter(([_, status]) => status.status === 'error')
          .map(([key, status]) => ({ key, error: status.error })),
    },
    
    methods: (state, set) => ({
      // Set specific request loading
      setRequestLoading: (key: string) => {
        set((draft) => {
          draft.requestStatuses.set(key, {
            status: 'pending',
            error: null,
            timestamp: Date.now(),
          });
          return draft;
        });
      },
      
      // Set specific request success
      setRequestSuccess: (key: string) => {
        set((draft) => {
          draft.requestStatuses.set(key, {
            status: 'fulfilled',
            error: null,
            timestamp: Date.now(),
          });
          return draft;
        });
      },
      
      // Set specific request error
      setRequestError: (key: string, error: Error) => {
        set((draft) => {
          draft.requestStatuses.set(key, {
            status: 'error',
            error,
            timestamp: Date.now(),
          });
          return draft;
        });
      },
      
      // Reset specific request
      resetRequestStatus: (key: string) => {
        set((draft) => {
          draft.requestStatuses.delete(key);
          return draft;
        });
      },
      
      // Reset all requests
      resetAllStatuses: () => {
        set((draft) => {
          draft.requestStatuses.clear();
          return draft;
        });
      },
    }),
  });
}

/**
 * Feature for automatic retry on error
 */
export function withRetry(maxRetries: number = 3, retryDelay: number = 1000): StoreFeature<
  { retryCount: number; retryTimeoutId?: NodeJS.Timeout },
  {
    retry: (action: () => Promise<void>) => void;
    cancelRetry: () => void;
  }
> {
  return createStoreFeature({
    initialState: {
      retryCount: 0,
      retryTimeoutId: undefined,
    },
    
    computed: {
      // Can retry
      canRetry: (state) => state.retryCount < maxRetries,
      
      // Retries left
      retriesLeft: (state) => maxRetries - state.retryCount,
    },
    
    methods: (state, set) => ({
      // Retry action
      retry: async (action: () => Promise<void>) => {
        set((draft) => {
          draft.retryCount++;
          return draft;
        });
        
        // Wait before retrying
        await new Promise(resolve => {
          const timeoutId = setTimeout(resolve, retryDelay * state.retryCount);
          set((draft) => {
            draft.retryTimeoutId = timeoutId;
            return draft;
          });
        });
        
        try {
          await action();
          // Reset retry count on success
          set((draft) => {
            draft.retryCount = 0;
            draft.retryTimeoutId = undefined;
            return draft;
          });
        } catch (error) {
          // Will be handled by caller
          throw error;
        }
      },
      
      // Cancel retry
      cancelRetry: () => {
        set((draft) => {
          if (draft.retryTimeoutId) {
            clearTimeout(draft.retryTimeoutId);
            draft.retryTimeoutId = undefined;
          }
          draft.retryCount = 0;
          return draft;
        });
      },
    }),
    
    hooks: {
      onDestroy: () => {
        // Clean up timeout on destroy
        const timeoutId = (state as any).retryTimeoutId;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      },
    },
  });
}

/**
 * Feature for optimistic updates
 */
export function withOptimisticUpdate<T>(): StoreFeature<
  { optimisticUpdates: Map<string, T>; rollbackData: Map<string, T> },
  {
    applyOptimistic: (id: string, update: T, original: T) => void;
    commitOptimistic: (id: string) => void;
    rollbackOptimistic: (id: string) => T | undefined;
    rollbackAll: () => void;
  }
> {
  return createStoreFeature({
    initialState: {
      optimisticUpdates: new Map<string, T>(),
      rollbackData: new Map<string, T>(),
    },
    
    computed: {
      // Has optimistic updates
      hasOptimisticUpdates: (state) => state.optimisticUpdates.size > 0,
      
      // Get optimistic update
      getOptimisticUpdate: (state) => (id: string) => 
        state.optimisticUpdates.get(id),
    },
    
    methods: (state, set) => ({
      // Apply optimistic update
      applyOptimistic: (id: string, update: T, original: T) => {
        set((draft) => {
          draft.optimisticUpdates.set(id, update);
          draft.rollbackData.set(id, original);
          return draft;
        });
      },
      
      // Commit optimistic update
      commitOptimistic: (id: string) => {
        set((draft) => {
          draft.optimisticUpdates.delete(id);
          draft.rollbackData.delete(id);
          return draft;
        });
      },
      
      // Rollback optimistic update
      rollbackOptimistic: (id: string) => {
        let rollbackValue: T | undefined;
        set((draft) => {
          rollbackValue = draft.rollbackData.get(id);
          draft.optimisticUpdates.delete(id);
          draft.rollbackData.delete(id);
          return draft;
        });
        return rollbackValue;
      },
      
      // Rollback all optimistic updates
      rollbackAll: () => {
        set((draft) => {
          draft.optimisticUpdates.clear();
          draft.rollbackData.clear();
          return draft;
        });
      },
    }),
  });
}