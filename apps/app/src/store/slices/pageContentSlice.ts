import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Стан контенту сторінки
 * Мігровано з Angular PageContentStore
 */
interface PageContentState {
  scrollTop: number;
  nameSize: {
    top: number;
    height?: number;
  };
  viewport: {
    width: number;
    height: number;
    top: number;
  };
  layout: {
    sidebarWidth: number;
    headerHeight: number;
    footerHeight: number;
    tabMenuHeight: number;
    nameBlockHeight: number;
    marginBetweenTabs: number;
  };
  responsiveBreakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const initialState: PageContentState = {
  scrollTop: 0,
  nameSize: { top: 0 },
  viewport: {
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    top: 0,
  },
  layout: {
    sidebarWidth: 256,
    headerHeight: 64,
    footerHeight: 48,
    tabMenuHeight: 48,
    nameBlockHeight: 60,
    marginBetweenTabs: 16,
  },
  responsiveBreakpoint: 'lg',
};

// Helper function to determine responsive breakpoint
const getResponsiveBreakpoint = (width: number): PageContentState['responsiveBreakpoint'] => {
  if (width < 640) return 'xs';
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1280) return 'lg';
  if (width < 1536) return 'xl';
  return '2xl';
};

export const pageContentSlice = createSlice({
  name: 'pageContent',
  initialState,
  reducers: {
    // Scroll management
    setScrollTop: (state, action: PayloadAction<number>) => {
      state.scrollTop = action.payload;
    },

    // Name size tracking
    setNameSize: (state, action: PayloadAction<{ top: number; height?: number }>) => {
      state.nameSize = action.payload;
    },

    // Viewport management
    setViewport: (state, action: PayloadAction<{ width: number; height: number; top?: number }>) => {
      state.viewport = {
        ...state.viewport,
        ...action.payload,
      };
      state.responsiveBreakpoint = getResponsiveBreakpoint(action.payload.width);
    },

    setViewportTop: (state, action: PayloadAction<number>) => {
      state.viewport.top = action.payload;
    },

    // Layout configuration
    updateLayout: (state, action: PayloadAction<Partial<PageContentState['layout']>>) => {
      state.layout = {
        ...state.layout,
        ...action.payload,
      };
    },

    setSidebarWidth: (state, action: PayloadAction<number>) => {
      state.layout.sidebarWidth = action.payload;
    },

    setHeaderHeight: (state, action: PayloadAction<number>) => {
      state.layout.headerHeight = action.payload;
    },

    // Responsive breakpoint (can be set manually if needed)
    setResponsiveBreakpoint: (state, action: PayloadAction<PageContentState['responsiveBreakpoint']>) => {
      state.responsiveBreakpoint = action.payload;
    },

    // Initialize viewport from window
    initializeViewport: (state) => {
      if (typeof window !== 'undefined') {
        state.viewport.width = window.innerWidth;
        state.viewport.height = window.innerHeight;
        state.responsiveBreakpoint = getResponsiveBreakpoint(window.innerWidth);
      }
    },

    // Reset scroll position
    resetScroll: (state) => {
      state.scrollTop = 0;
    },

    // Update all dimensions at once (useful for resize events)
    updateDimensions: (state, action: PayloadAction<{
      viewport?: Partial<PageContentState['viewport']>;
      layout?: Partial<PageContentState['layout']>;
      scroll?: number;
    }>) => {
      const { viewport, layout, scroll } = action.payload;
      
      if (viewport) {
        state.viewport = { ...state.viewport, ...viewport };
        if (viewport.width) {
          state.responsiveBreakpoint = getResponsiveBreakpoint(viewport.width);
        }
      }
      
      if (layout) {
        state.layout = { ...state.layout, ...layout };
      }
      
      if (scroll !== undefined) {
        state.scrollTop = scroll;
      }
    },
  },
});

// Selectors (these would be used with useSelector)
export const selectScrollDelta = (state: { pageContent: PageContentState }) => {
  const { layout, viewport } = state.pageContent;
  return layout.nameBlockHeight + layout.tabMenuHeight + layout.marginBetweenTabs + viewport.top;
};

export const selectNewTop = (state: { pageContent: PageContentState }) => {
  const { scrollTop, layout } = state.pageContent;
  return scrollTop + layout.tabMenuHeight + layout.marginBetweenTabs;
};

export const selectViewportTopHeight = (state: { pageContent: PageContentState }) => {
  const { viewport, layout } = state.pageContent;
  const newTop = selectNewTop(state);
  const height = viewport.height - newTop + layout.tabMenuHeight + layout.marginBetweenTabs;
  return { top: newTop, height };
};

export const selectNameOnTop = (state: { pageContent: PageContentState }) => {
  const { viewport, nameSize } = state.pageContent;
  return Math.abs(viewport.top - nameSize.top) === 0;
};

export const selectIsMobile = (state: { pageContent: PageContentState }) => {
  return ['xs', 'sm'].includes(state.pageContent.responsiveBreakpoint);
};

export const selectIsTablet = (state: { pageContent: PageContentState }) => {
  return state.pageContent.responsiveBreakpoint === 'md';
};

export const selectIsDesktop = (state: { pageContent: PageContentState }) => {
  return ['lg', 'xl', '2xl'].includes(state.pageContent.responsiveBreakpoint);
};

export const {
  setScrollTop,
  setNameSize,
  setViewport,
  setViewportTop,
  updateLayout,
  setSidebarWidth,
  setHeaderHeight,
  setResponsiveBreakpoint,
  initializeViewport,
  resetScroll,
  updateDimensions,
} = pageContentSlice.actions;

export default pageContentSlice.reducer;