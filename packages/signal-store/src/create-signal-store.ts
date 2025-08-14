import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Entity, StoreFeature, EntityId } from './types';
import { composeFeatures } from './core/create-store-feature';

/**
 * Creates a React SignalStore with fractal composition
 * Main factory function that combines features into a working store
 */
export function createSignalStore<T extends Entity, TCustomState = {}>(
  name: string,
  features: StoreFeature[],
  customState?: TCustomState
) {
  // Compose all features
  const composedFeature = composeFeatures(...features);
  
  // Create Zustand store with immer for immutability
  const useStore = create<any>()(
    devtools(
      immer((set, get) => {
        // Combine initial states
        const initialState = {
          ...composedFeature.initialState,
          ...customState,
        };

        // Create methods with bound set function
        const methods = composedFeature.methods 
          ? composedFeature.methods(
              initialState,
              (updater) => set(updater)
            )
          : {};

        // Create computed properties as getters
        const computed = {};
        if (composedFeature.computed) {
          Object.entries(composedFeature.computed).forEach(([key, computeFn]) => {
            Object.defineProperty(computed, key, {
              get: () => computeFn(get()),
              enumerable: true,
            });
          });
        }

        // Initialize hooks
        if (composedFeature.hooks?.onInit) {
          composedFeature.hooks.onInit();
        }

        // Return store configuration
        return {
          ...initialState,
          ...methods,
          computed,
          
          // Helper method to get all state
          getState: () => get(),
          
          // Helper method to reset store
          reset: () => set(() => ({
            ...composedFeature.initialState,
            ...customState,
          })),
        };
      }),
      {
        name: `${name}-store`,
      }
    )
  );

  // Add cleanup on unmount
  if (composedFeature.hooks?.onDestroy) {
    // Store cleanup function to be called manually
    (useStore as any).destroy = composedFeature.hooks.onDestroy;
  }

  return useStore;
}

/**
 * Create a simple entity store with common features
 */
export function createEntityStore<T extends Entity>(
  name: string,
  features: StoreFeature[] = []
) {
  return createSignalStore<T>(name, features);
}

/**
 * Selectors helper for entity stores
 */
export function createSelectors<T extends Entity>(
  useStore: any
) {
  return {
    // Entity selectors
    useAllEntities: () => useStore(state => state.computed?.allEntities || []),
    useEntity: (id: EntityId) => useStore(state => 
      state.entities?.get(id)
    ),
    useSelectedEntity: () => useStore(state => 
      state.computed?.selectedEntity
    ),
    useSelectedEntities: () => useStore(state => 
      state.computed?.selectedEntities || []
    ),
    
    // Filter selectors
    useFilteredEntities: () => useStore(state => 
      state.computed?.filteredEntities || []
    ),
    useActiveFilters: () => useStore(state => 
      state.computed?.activeFilters || []
    ),
    useSearchQuery: () => useStore(state => state.searchQuery || ''),
    
    // Status selectors
    useIsLoading: () => useStore(state => 
      state.computed?.isLoading || false
    ),
    useError: () => useStore(state => 
      state.requestStatus?.error
    ),
    useHasLoaded: () => useStore(state => 
      state.computed?.hasLoaded || false
    ),
    
    // Count selectors
    useTotalCount: () => useStore(state => 
      state.computed?.totalCount || 0
    ),
    useFilteredCount: () => useStore(state => 
      state.computed?.filteredCount || 0
    ),
    
    // Methods selectors
    useActions: () => {
      const store = useStore();
      return {
        // Entity actions
        addEntity: store.addEntity,
        addEntities: store.addEntities,
        updateEntity: store.updateEntity,
        removeEntity: store.removeEntity,
        setAllEntities: store.setAllEntities,
        clearEntities: store.clearEntities,
        
        // Selection actions
        selectEntity: store.selectEntity,
        selectEntities: store.selectEntities,
        toggleEntitySelection: store.toggleEntitySelection,
        clearSelection: store.clearSelection,
        
        // Filter actions
        setFilter: store.setFilter,
        removeFilter: store.removeFilter,
        clearFilters: store.clearFilters,
        setSearchQuery: store.setSearchQuery,
        setSortBy: store.setSortBy,
        
        // Status actions
        setLoading: store.setLoading,
        setSuccess: store.setSuccess,
        setError: store.setError,
        resetStatus: store.resetStatus,
        
        // Store actions
        reset: store.reset,
      };
    },
  };
}