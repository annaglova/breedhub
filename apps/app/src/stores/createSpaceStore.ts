import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { SpaceConfig } from '@/core/space/types';

export interface SpaceStoreState<T> {
  // Configuration
  config: SpaceConfig<T>;
  
  // Entities
  entities: T[];
  selectedId: string | null;
  total: number;
  
  // Loading states
  isLoading: boolean;
  isFetchingMore: boolean;
  
  // View and filters
  viewMode: string;
  filters: Record<string, any>;
  searchQuery: string;
  sortBy: string | null;
  sortOrder: 'asc' | 'desc';
  
  // Actions
  setEntities: (entities: T[]) => void;
  addEntities: (entities: T[]) => void;
  setSelectedId: (id: string | null) => void;
  setTotal: (total: number) => void;
  setLoading: (loading: boolean) => void;
  setFetchingMore: (fetching: boolean) => void;
  setViewMode: (mode: string) => void;
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;
  setSort: (field: string, order: 'asc' | 'desc') => void;
  reset: () => void;
}

export function createSpaceStore<T extends { Id: string }>(
  config: SpaceConfig<T>,
  name: string
) {
  const initialState = {
    config,
    entities: [],
    selectedId: null,
    total: 0,
    isLoading: false,
    isFetchingMore: false,
    viewMode: config.viewConfig[0]?.id || 'list',
    filters: {},
    searchQuery: '',
    sortBy: config.defaultSort?.field || null,
    sortOrder: config.defaultSort?.order || 'asc' as const,
  };

  return create<SpaceStoreState<T>>()(
    subscribeWithSelector(
      devtools(
        (set) => ({
          ...initialState,
          
          setEntities: (entities) => set({ entities }),
          
          addEntities: (newEntities) => 
            set((state) => ({ 
              entities: [...state.entities, ...newEntities] 
            })),
          
          setSelectedId: (id) => set({ selectedId: id }),
          
          setTotal: (total) => set({ total }),
          
          setLoading: (loading) => set({ isLoading: loading }),
          
          setFetchingMore: (fetching) => set({ isFetchingMore: fetching }),
          
          setViewMode: (mode) => set({ viewMode: mode }),
          
          setFilter: (key, value) => 
            set((state) => ({
              filters: { ...state.filters, [key]: value }
            })),
          
          clearFilters: () => set({ filters: {} }),
          
          setSearchQuery: (query) => set({ searchQuery: query }),
          
          setSort: (field, order) => 
            set({ sortBy: field, sortOrder: order }),
          
          reset: () => set(initialState),
        }),
        {
          name: `${name}-store`,
        }
      )
    )
  );
}