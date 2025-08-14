import { createStoreFeature } from '../core/create-store-feature';
import type { StoreFeature } from '../types';

/**
 * View types for displaying data
 */
export type ViewType = 'list' | 'grid' | 'table' | 'map';
export type ViewMode = 'fullscreen' | 'drawer' | 'modal';

export interface ViewConfig {
  type: ViewType;
  mode: ViewMode;
  columns?: string[]; // For table view
  gridCols?: number;  // For grid view
  itemHeight?: number; // For virtualization
  showFilters: boolean;
  showSearch: boolean;
  showSort: boolean;
  showPagination: boolean;
}

export interface ViewState {
  currentViewType: ViewType;
  currentViewMode: ViewMode;
  viewConfigs: Map<ViewType, Partial<ViewConfig>>;
  isFullscreen: boolean;
  drawerOpen: boolean;
  modalOpen: boolean;
  viewHistory: ViewType[];
}

/**
 * Feature for view management
 * Controls how data is displayed (list, grid, table, map)
 * and where it's displayed (fullscreen, drawer, modal)
 */
export function withView(
  defaultView: ViewType = 'list',
  defaultMode: ViewMode = 'fullscreen'
): StoreFeature<ViewState, {
  setViewType: (type: ViewType) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleDrawer: (open?: boolean) => void;
  toggleModal: (open?: boolean) => void;
  toggleFullscreen: () => void;
  updateViewConfig: (type: ViewType, config: Partial<ViewConfig>) => void;
  switchView: (type: ViewType, mode: ViewMode) => void;
}> {
  return createStoreFeature({
    initialState: {
      currentViewType: defaultView,
      currentViewMode: defaultMode,
      viewConfigs: new Map([
        ['list', { 
          showFilters: true, 
          showSearch: true, 
          showSort: true,
          showPagination: true,
          itemHeight: 68,
        }],
        ['grid', { 
          showFilters: true, 
          showSearch: true, 
          showSort: true,
          showPagination: true,
          gridCols: 3,
          itemHeight: 280,
        }],
        ['table', { 
          showFilters: true, 
          showSearch: true, 
          showSort: true,
          showPagination: true,
          columns: [],
        }],
        ['map', { 
          showFilters: true, 
          showSearch: true, 
          showSort: false,
          showPagination: false,
        }],
      ]),
      isFullscreen: defaultMode === 'fullscreen',
      drawerOpen: defaultMode === 'drawer',
      modalOpen: defaultMode === 'modal',
      viewHistory: [defaultView],
    },
    
    computed: {
      currentViewConfig: (state) => {
        const baseConfig: ViewConfig = {
          type: state.currentViewType,
          mode: state.currentViewMode,
          showFilters: true,
          showSearch: true,
          showSort: true,
          showPagination: true,
        };
        const customConfig = state.viewConfigs.get(state.currentViewType) || {};
        return { ...baseConfig, ...customConfig };
      },
      
      isListView: (state) => state.currentViewType === 'list',
      isGridView: (state) => state.currentViewType === 'grid',
      isTableView: (state) => state.currentViewType === 'table',
      isMapView: (state) => state.currentViewType === 'map',
      
      isDrawerMode: (state) => state.currentViewMode === 'drawer',
      isModalMode: (state) => state.currentViewMode === 'modal',
      isFullscreenMode: (state) => state.currentViewMode === 'fullscreen',
      
      availableViews: (state) => Array.from(state.viewConfigs.keys()),
    },
    
    methods: (state, set) => ({
      setViewType: (type: ViewType) => {
        set((draft) => {
          if (draft.currentViewType !== type) {
            draft.viewHistory.push(type);
            draft.currentViewType = type;
          }
          return draft;
        });
      },
      
      setViewMode: (mode: ViewMode) => {
        set((draft) => {
          draft.currentViewMode = mode;
          draft.isFullscreen = mode === 'fullscreen';
          draft.drawerOpen = mode === 'drawer';
          draft.modalOpen = mode === 'modal';
          return draft;
        });
      },
      
      toggleDrawer: (open?: boolean) => {
        set((draft) => {
          draft.drawerOpen = open !== undefined ? open : !draft.drawerOpen;
          if (draft.drawerOpen) {
            draft.currentViewMode = 'drawer';
            draft.isFullscreen = false;
            draft.modalOpen = false;
          }
          return draft;
        });
      },
      
      toggleModal: (open?: boolean) => {
        set((draft) => {
          draft.modalOpen = open !== undefined ? open : !draft.modalOpen;
          if (draft.modalOpen) {
            draft.currentViewMode = 'modal';
            draft.isFullscreen = false;
            draft.drawerOpen = false;
          }
          return draft;
        });
      },
      
      toggleFullscreen: () => {
        set((draft) => {
          draft.isFullscreen = !draft.isFullscreen;
          if (draft.isFullscreen) {
            draft.currentViewMode = 'fullscreen';
            draft.drawerOpen = false;
            draft.modalOpen = false;
          }
          return draft;
        });
      },
      
      updateViewConfig: (type: ViewType, config: Partial<ViewConfig>) => {
        set((draft) => {
          const existing = draft.viewConfigs.get(type) || {};
          draft.viewConfigs.set(type, { ...existing, ...config });
          return draft;
        });
      },
      
      switchView: (type: ViewType, mode: ViewMode) => {
        set((draft) => {
          draft.currentViewType = type;
          draft.currentViewMode = mode;
          draft.viewHistory.push(type);
          draft.isFullscreen = mode === 'fullscreen';
          draft.drawerOpen = mode === 'drawer';
          draft.modalOpen = mode === 'modal';
          return draft;
        });
      },
    }),
  });
}