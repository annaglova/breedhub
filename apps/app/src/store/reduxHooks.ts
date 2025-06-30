import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './hooks';
import {
  // App actions
  setLoading,
  setError,
  clearError,
  setTheme,
  toggleTheme,
  setSidebarOpen,
  toggleSidebar,
  addNotification,
  removeNotification,
  initializeApp,
  
  // Navigation actions
  setCurrentUrl,
  setQueryParams,
  updateQueryParam,
  setFragment,
  addToHistory,
  navigateBack,
  changeView,
  changeSort,
  changeFilters,
  
  // Page content actions
  setScrollTop,
  setNameSize,
  setViewport,
  updateDimensions,
  initializeViewport,
  
  // Selectors
  selectViewportTopHeight,
  selectNameOnTop,
  selectIsMobile,
  selectIsTablet,
  selectIsDesktop,
} from './slices';

/**
 * Custom hooks for convenient access to Redux state and actions
 */

// App hooks
export const useApp = () => {
  const dispatch = useAppDispatch();
  const app = useAppSelector(state => state.app);

  return {
    ...app,
    setLoading: useCallback((loading: boolean) => dispatch(setLoading(loading)), [dispatch]),
    setError: useCallback((error: string | null) => dispatch(setError(error)), [dispatch]),
    clearError: useCallback(() => dispatch(clearError()), [dispatch]),
    setTheme: useCallback((theme: 'light' | 'dark') => dispatch(setTheme(theme)), [dispatch]),
    toggleTheme: useCallback(() => dispatch(toggleTheme()), [dispatch]),
    setSidebarOpen: useCallback((open: boolean) => dispatch(setSidebarOpen(open)), [dispatch]),
    toggleSidebar: useCallback(() => dispatch(toggleSidebar()), [dispatch]),
    addNotification: useCallback((notification: any) => dispatch(addNotification(notification)), [dispatch]),
    removeNotification: useCallback((id: string) => dispatch(removeNotification(id)), [dispatch]),
    initializeApp: useCallback(() => dispatch(initializeApp()), [dispatch]),
  };
};

// Navigation hooks
export const useNavigation = () => {
  const dispatch = useAppDispatch();
  const navigation = useAppSelector(state => state.navigation);

  return {
    ...navigation,
    setCurrentUrl: useCallback((url: string) => dispatch(setCurrentUrl(url)), [dispatch]),
    setQueryParams: useCallback((params: Record<string, any>) => dispatch(setQueryParams(params)), [dispatch]),
    updateQueryParam: useCallback((key: string, value: any) => dispatch(updateQueryParam({ key, value })), [dispatch]),
    setFragment: useCallback((fragment: string | null) => dispatch(setFragment(fragment)), [dispatch]),
    addToHistory: useCallback((entry: { url: string; name?: string }) => dispatch(addToHistory(entry)), [dispatch]),
    navigateBack: useCallback(() => dispatch(navigateBack()), [dispatch]),
    changeView: useCallback((view: string) => dispatch(changeView(view)), [dispatch]),
    changeSort: useCallback((sort: string) => dispatch(changeSort(sort)), [dispatch]),
    changeFilters: useCallback((filters: Record<string, any>) => dispatch(changeFilters(filters)), [dispatch]),
  };
};

// Page content hooks
export const usePageContent = () => {
  const dispatch = useAppDispatch();
  const pageContent = useAppSelector(state => state.pageContent);
  
  // Computed values using selectors
  const viewportTopHeight = useAppSelector(selectViewportTopHeight);
  const nameOnTop = useAppSelector(selectNameOnTop);
  const isMobile = useAppSelector(selectIsMobile);
  const isTablet = useAppSelector(selectIsTablet);
  const isDesktop = useAppSelector(selectIsDesktop);

  return {
    ...pageContent,
    // Computed values
    viewportTopHeight,
    nameOnTop,
    isMobile,
    isTablet,
    isDesktop,
    // Actions
    setScrollTop: useCallback((scrollTop: number) => dispatch(setScrollTop(scrollTop)), [dispatch]),
    setNameSize: useCallback((size: { top: number; height?: number }) => dispatch(setNameSize(size)), [dispatch]),
    setViewport: useCallback((viewport: { width: number; height: number; top?: number }) => dispatch(setViewport(viewport)), [dispatch]),
    updateDimensions: useCallback((dimensions: any) => dispatch(updateDimensions(dimensions)), [dispatch]),
    initializeViewport: useCallback(() => dispatch(initializeViewport()), [dispatch]),
  };
};

// Combined hooks for common use cases
export const useAppInitialization = () => {
  const { initialized, initializeApp } = useApp();
  const { initializeViewport } = usePageContent();
  
  const initialize = useCallback(() => {
    initializeApp();
    initializeViewport();
  }, [initializeApp, initializeViewport]);

  return {
    initialized,
    initialize,
  };
};

export const useResponsive = () => {
  const { isMobile, isTablet, isDesktop, responsiveBreakpoint, viewport } = usePageContent();
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    breakpoint: responsiveBreakpoint,
    width: viewport.width,
    height: viewport.height,
  };
};

export const useNotifications = () => {
  const { notifications, addNotification, removeNotification } = useApp();
  
  const showSuccess = useCallback((title: string, message: string, duration = 5000) => {
    addNotification({ type: 'success', title, message, duration });
  }, [addNotification]);

  const showError = useCallback((title: string, message: string, duration = 7000) => {
    addNotification({ type: 'error', title, message, duration });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message: string, duration = 5000) => {
    addNotification({ type: 'info', title, message, duration });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message: string, duration = 6000) => {
    addNotification({ type: 'warning', title, message, duration });
  }, [addNotification]);

  return {
    notifications,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    removeNotification,
  };
};