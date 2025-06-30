import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Навігаційний стан
 * Мігровано з Angular BPNavStore
 */
interface NavigationHistoryEntry {
  id: number;
  url: string;
  name: string;
  timestamp: number;
}

interface NavigationState {
  currentUrl: string;
  history: NavigationHistoryEntry[];
  queryParams: Record<string, any>;
  fragment: string | null;
  loading: boolean;
}

const initialState: NavigationState = {
  currentUrl: '',
  history: [],
  queryParams: {},
  fragment: null,
  loading: false,
};

export const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    // URL management
    setCurrentUrl: (state, action: PayloadAction<string>) => {
      const url = action.payload;
      state.currentUrl = url;
      
      // Parse URL to extract query params and fragment
      try {
        const urlObj = new URL(url, window.location.origin);
        const queryParams: Record<string, any> = {};
        urlObj.searchParams.forEach((value, key) => {
          queryParams[key] = value;
        });
        state.queryParams = queryParams;
        state.fragment = urlObj.hash ? urlObj.hash.substring(1) : null;
      } catch {
        // Fallback for relative URLs
        state.queryParams = {};
        state.fragment = null;
      }
    },

    // Query parameters
    setQueryParams: (state, action: PayloadAction<Record<string, any>>) => {
      state.queryParams = action.payload;
    },

    updateQueryParam: (state, action: PayloadAction<{ key: string; value: any }>) => {
      state.queryParams[action.payload.key] = action.payload.value;
    },

    removeQueryParam: (state, action: PayloadAction<string>) => {
      delete state.queryParams[action.payload];
    },

    clearQueryParams: (state) => {
      state.queryParams = {};
    },

    // Fragment
    setFragment: (state, action: PayloadAction<string | null>) => {
      state.fragment = action.payload;
    },

    // History management
    addToHistory: (state, action: PayloadAction<{ url: string; name?: string }>) => {
      const { url, name = '' } = action.payload;
      
      // Don't add duplicate URLs
      const lastEntry = state.history[state.history.length - 1];
      if (lastEntry && lastEntry.url === url) {
        return;
      }

      const entry: NavigationHistoryEntry = {
        id: state.history.length,
        url,
        name,
        timestamp: Date.now(),
      };

      state.history.push(entry);
    },

    removeFromHistory: (state, action: PayloadAction<number>) => {
      state.history = state.history.filter(entry => entry.id !== action.payload);
    },

    clearHistory: (state) => {
      state.history = [];
    },

    trimHistoryToEntry: (state, action: PayloadAction<number>) => {
      const entryId = action.payload;
      const index = state.history.findIndex(entry => entry.id === entryId);
      if (index !== -1) {
        state.history = state.history.slice(0, index + 1);
      }
    },

    updateHistoryEntryName: (state, action: PayloadAction<{ url: string; name: string }>) => {
      const { url, name } = action.payload;
      const entry = state.history.find(e => e.url.includes(url));
      if (entry) {
        entry.name = entry.name ? entry.name + name : name;
      }
    },

    // Loading state
    setNavigationLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Navigation actions
    navigateBack: (state) => {
      if (state.history.length >= 2) {
        const previousEntry = state.history[state.history.length - 2];
        state.currentUrl = previousEntry.url;
        state.history = state.history.slice(0, -1);
      }
    },

    navigateToHistoryEntry: (state, action: PayloadAction<number>) => {
      const entryId = action.payload;
      const entry = state.history.find(e => e.id === entryId);
      if (entry) {
        state.currentUrl = entry.url;
        // Trim history to this entry
        const index = state.history.findIndex(e => e.id === entryId);
        state.history = state.history.slice(0, index + 1);
      }
    },

    // View and filter management (for public store views)
    changeView: (state, action: PayloadAction<string>) => {
      state.queryParams['view'] = action.payload;
    },

    changeSort: (state, action: PayloadAction<string>) => {
      state.queryParams['sort'] = action.payload;
    },

    changeFilters: (state, action: PayloadAction<Record<string, any>>) => {
      state.queryParams = { ...action.payload };
    },

    // Utility actions
    getSpaceName: (state, action: PayloadAction<string>) => {
      const url = action.payload;
      const spaceNames = [
        { urlPattern: '/pets', name: '[Pets]' },
        { urlPattern: '/breeds', name: '[Breeds]' },
        { urlPattern: '/litters', name: '[Litters]' },
        { urlPattern: '/kennels', name: '[Kennels]' },
      ];

      let spaceName = '';
      spaceNames.forEach(({ urlPattern, name }) => {
        if (url.includes(urlPattern)) {
          spaceName = name;
        }
      });

      // Update current history entry with space name
      const currentEntry = state.history[state.history.length - 1];
      if (currentEntry && !currentEntry.name) {
        currentEntry.name = spaceName;
      }
    },
  },
});

export const {
  setCurrentUrl,
  setQueryParams,
  updateQueryParam,
  removeQueryParam,
  clearQueryParams,
  setFragment,
  addToHistory,
  removeFromHistory,
  clearHistory,
  trimHistoryToEntry,
  updateHistoryEntryName,
  setNavigationLoading,
  navigateBack,
  navigateToHistoryEntry,
  changeView,
  changeSort,
  changeFilters,
  getSpaceName,
} = navigationSlice.actions;

export default navigationSlice.reducer;