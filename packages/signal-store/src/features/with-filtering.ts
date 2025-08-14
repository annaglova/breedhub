import { Entity, FilterState, FilterConfig, StoreFeature, CollectionMethods, CollectionState } from '../types';
import { createStoreFeature } from '../core/create-store-feature';

/**
 * Creates initial filter state
 */
export function createInitialFilterState<T>(): FilterState<T> {
  return {
    filters: [],
    searchQuery: '',
    sortBy: undefined,
    sortOrder: 'asc',
  };
}

/**
 * Feature for filtering and sorting
 * Similar to NgRx collection-filtration
 */
export function withFiltering<T extends Entity>(): StoreFeature<
  FilterState<T>,
  Pick<CollectionMethods<T>, 'setFilter' | 'removeFilter' | 'clearFilters' | 'setSearchQuery' | 'setSortBy'>
> {
  return createStoreFeature<
    FilterState<T>,
    Pick<CollectionMethods<T>, 'setFilter' | 'removeFilter' | 'clearFilters' | 'setSearchQuery' | 'setSortBy'>
  >({
    initialState: createInitialFilterState<T>(),
    
    computed: {
      // Active filters only
      activeFilters: (state) => state.filters.filter(f => f.active !== false),
      
      // Has active filters
      hasActiveFilters: (state) => 
        state.filters.some(f => f.active !== false) || state.searchQuery.length > 0,
    },
    
    methods: (state, set) => ({
      // Set or update filter
      setFilter: (filter: FilterConfig<T>) => {
        set((draft) => {
          const existingIndex = draft.filters.findIndex(f => f.field === filter.field);
          if (existingIndex >= 0) {
            draft.filters[existingIndex] = filter;
          } else {
            draft.filters.push(filter);
          }
          return draft;
        });
      },
      
      // Remove filter by field
      removeFilter: (field: keyof T) => {
        set((draft) => {
          draft.filters = draft.filters.filter(f => f.field !== field);
          return draft;
        });
      },
      
      // Clear all filters
      clearFilters: () => {
        set((draft) => {
          draft.filters = [];
          draft.searchQuery = '';
          return draft;
        });
      },
      
      // Set search query
      setSearchQuery: (query: string) => {
        set((draft) => {
          draft.searchQuery = query;
          return draft;
        });
      },
      
      // Set sort configuration
      setSortBy: (field: keyof T, order: 'asc' | 'desc' = 'asc') => {
        set((draft) => {
          draft.sortBy = field;
          draft.sortOrder = order;
          return draft;
        });
      },
    }),
  });
}

/**
 * Apply filters to entities
 */
export function applyFilter<T>(
  entity: T,
  filter: FilterConfig<T>
): boolean {
  const value = entity[filter.field];
  const filterValue = filter.value;

  switch (filter.operator) {
    case 'equals':
      return value === filterValue;
    
    case 'contains':
      return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
    
    case 'gt':
      return value > filterValue;
    
    case 'lt':
      return value < filterValue;
    
    case 'gte':
      return value >= filterValue;
    
    case 'lte':
      return value <= filterValue;
    
    case 'in':
      return Array.isArray(filterValue) && filterValue.includes(value);
    
    case 'between':
      return Array.isArray(filterValue) && 
        filterValue.length === 2 && 
        value >= filterValue[0] && 
        value <= filterValue[1];
    
    default:
      return true;
  }
}

/**
 * Feature for computed filtered entities
 */
export function withFilteredEntities<T extends Entity>(): StoreFeature<
  CollectionState<T> & FilterState<T>,
  {}
> {
  return createStoreFeature({
    computed: {
      // Filtered entities
      filteredEntities: (state) => {
        let entities = Array.from(state.entities.values());
        
        // Apply filters
        const activeFilters = state.filters.filter(f => f.active !== false);
        if (activeFilters.length > 0) {
          entities = entities.filter(entity => 
            activeFilters.every(filter => applyFilter(entity, filter))
          );
        }
        
        // Apply search
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase();
          entities = entities.filter(entity => {
            // Search in all string fields
            return Object.values(entity as any).some(value => 
              typeof value === 'string' && 
              value.toLowerCase().includes(query)
            );
          });
        }
        
        // Apply sorting
        if (state.sortBy) {
          entities.sort((a, b) => {
            const aVal = a[state.sortBy as keyof T];
            const bVal = b[state.sortBy as keyof T];
            
            if (aVal === bVal) return 0;
            
            const comparison = aVal < bVal ? -1 : 1;
            return state.sortOrder === 'asc' ? comparison : -comparison;
          });
        }
        
        return entities;
      },
      
      // Filtered count
      filteredCount: (state) => {
        // Reuse the filtered entities computation
        const filtered = (state as any).filteredEntities;
        return filtered ? filtered.length : 0;
      },
    },
  });
}

/**
 * Feature for URL synchronization of filters
 */
export function withFilterUrlSync<T extends Entity>(): StoreFeature<FilterState<T>, {}> {
  return createStoreFeature({
    hooks: {
      onInit: () => {
        // Parse URL params and set filters
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          
          // Parse filters from URL
          const filtersParam = params.get('filters');
          if (filtersParam) {
            try {
              const filters = JSON.parse(filtersParam);
              // Apply filters from URL
              // This would need access to the store methods
            } catch (e) {
              console.error('Failed to parse filters from URL', e);
            }
          }
        }
      },
    },
  });
}

/**
 * Debounced search feature
 */
export function withDebouncedSearch<T extends Entity>(delay: number = 300): StoreFeature<
  FilterState<T> & { debouncedSearchQuery: string },
  { setDebouncedSearch: (query: string) => void }
> {
  let timeoutId: NodeJS.Timeout;
  
  return createStoreFeature({
    initialState: {
      debouncedSearchQuery: '',
    },
    
    methods: (state, set) => ({
      setDebouncedSearch: (query: string) => {
        // Set immediate search query
        set((draft) => {
          draft.searchQuery = query;
          return draft;
        });
        
        // Debounce the actual search
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          set((draft) => {
            draft.debouncedSearchQuery = query;
            return draft;
          });
        }, delay);
      },
    }),
    
    hooks: {
      onDestroy: () => {
        clearTimeout(timeoutId);
      },
    },
  });
}