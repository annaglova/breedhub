import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Глобальний стан додатку
 * Мігровано з Angular AppStore
 */
interface AppState {
  initialized: boolean;
  loading: boolean;
  error: string | null;
  theme: 'light' | 'dark';
  locale: string;
  sidebarOpen: boolean;
  notifications: Notification[];
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
}

const initialState: AppState = {
  initialized: false,
  loading: false,
  error: null,
  theme: 'light',
  locale: 'en',
  sidebarOpen: false,
  notifications: [],
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    // Initialization
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.initialized = action.payload;
    },

    // Loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Error handling
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },

    clearError: (state) => {
      state.error = null;
    },

    // Theme
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', action.payload);
      }
    },

    toggleTheme: (state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      state.theme = newTheme;
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', newTheme);
      }
    },

    // Locale
    setLocale: (state, action: PayloadAction<string>) => {
      state.locale = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('locale', action.payload);
      }
    },

    // Sidebar
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },

    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },

    // Notifications
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
      };
      state.notifications.push(notification);
      
      // Auto-remove notification after duration
      if (notification.duration) {
        setTimeout(() => {
          state.notifications = state.notifications.filter(n => n.id !== notification.id);
        }, notification.duration);
      }
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },

    clearNotifications: (state) => {
      state.notifications = [];
    },

    // Initialize app with saved settings
    initializeApp: (state) => {
      if (typeof window !== 'undefined') {
        // Load theme from localStorage
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (savedTheme) {
          state.theme = savedTheme;
        }

        // Load locale from localStorage
        const savedLocale = localStorage.getItem('locale');
        if (savedLocale) {
          state.locale = savedLocale;
        }
      }
      
      state.initialized = true;
    },
  },
});

export const {
  setInitialized,
  setLoading,
  setError,
  clearError,
  setTheme,
  toggleTheme,
  setLocale,
  setSidebarOpen,
  toggleSidebar,
  addNotification,
  removeNotification,
  clearNotifications,
  initializeApp,
} = appSlice.actions;

export default appSlice.reducer;