import { createStoreFeature } from '../core/create-store-feature';
import type { StoreFeature } from '../types';

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  pageSizeOptions: number[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Feature for pagination
 */
export function withPagination(
  defaultPageSize: number = 20,
  pageSizeOptions: number[] = [10, 20, 50, 100]
): StoreFeature<PaginationState, {
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalItems: (total: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  goToPage: (page: number) => void;
}> {
  return createStoreFeature({
    initialState: {
      currentPage: 1,
      pageSize: defaultPageSize,
      totalItems: 0,
      totalPages: 0,
      pageSizeOptions,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    
    computed: {
      startIndex: (state) => (state.currentPage - 1) * state.pageSize,
      endIndex: (state) => Math.min(state.currentPage * state.pageSize, state.totalItems),
      isFirstPage: (state) => state.currentPage === 1,
      isLastPage: (state) => state.currentPage === state.totalPages,
      pageInfo: (state) => ({
        from: state.startIndex + 1,
        to: state.endIndex,
        total: state.totalItems,
      }),
    },
    
    methods: (state, set) => ({
      setPage: (page: number) => {
        set((draft) => {
          draft.currentPage = Math.max(1, Math.min(page, draft.totalPages));
          draft.hasNextPage = draft.currentPage < draft.totalPages;
          draft.hasPreviousPage = draft.currentPage > 1;
          return draft;
        });
      },
      
      setPageSize: (size: number) => {
        set((draft) => {
          draft.pageSize = size;
          draft.totalPages = Math.ceil(draft.totalItems / size);
          // Reset to first page when page size changes
          draft.currentPage = 1;
          draft.hasNextPage = draft.totalPages > 1;
          draft.hasPreviousPage = false;
          return draft;
        });
      },
      
      setTotalItems: (total: number) => {
        set((draft) => {
          draft.totalItems = total;
          draft.totalPages = Math.ceil(total / draft.pageSize);
          draft.hasNextPage = draft.currentPage < draft.totalPages;
          draft.hasPreviousPage = draft.currentPage > 1;
          // Adjust current page if it exceeds total pages
          if (draft.currentPage > draft.totalPages && draft.totalPages > 0) {
            draft.currentPage = draft.totalPages;
          }
          return draft;
        });
      },
      
      nextPage: () => {
        set((draft) => {
          if (draft.currentPage < draft.totalPages) {
            draft.currentPage++;
            draft.hasNextPage = draft.currentPage < draft.totalPages;
            draft.hasPreviousPage = true;
          }
          return draft;
        });
      },
      
      previousPage: () => {
        set((draft) => {
          if (draft.currentPage > 1) {
            draft.currentPage--;
            draft.hasPreviousPage = draft.currentPage > 1;
            draft.hasNextPage = true;
          }
          return draft;
        });
      },
      
      firstPage: () => {
        set((draft) => {
          draft.currentPage = 1;
          draft.hasPreviousPage = false;
          draft.hasNextPage = draft.totalPages > 1;
          return draft;
        });
      },
      
      lastPage: () => {
        set((draft) => {
          draft.currentPage = draft.totalPages;
          draft.hasNextPage = false;
          draft.hasPreviousPage = draft.totalPages > 1;
          return draft;
        });
      },
      
      goToPage: (page: number) => {
        set((draft) => {
          draft.currentPage = Math.max(1, Math.min(page, draft.totalPages));
          draft.hasNextPage = draft.currentPage < draft.totalPages;
          draft.hasPreviousPage = draft.currentPage > 1;
          return draft;
        });
      },
    }),
  });
}