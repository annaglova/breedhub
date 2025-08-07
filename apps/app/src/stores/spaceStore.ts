import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface SpaceState {
  // Selected entity
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  
  // View mode
  viewMode: string;
  setViewMode: (mode: string) => void;
  
  // Filters
  filters: Record<string, any>;
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Sort
  sortBy: string | null;
  sortOrder: 'asc' | 'desc';
  setSort: (field: string, order: 'asc' | 'desc') => void;
  
  // Reset all
  reset: () => void;
}

const initialState = {
  selectedId: null,
  viewMode: 'list',
  filters: {},
  searchQuery: '',
  sortBy: null,
  sortOrder: 'asc' as const,
};

export const useSpaceStore = create<SpaceState>()(
  devtools(
    (set) => ({
      ...initialState,
      
      setSelectedId: (id) => set({ selectedId: id }),
      
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
      name: 'space-store',
    }
  )
);