import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store';
import { useCallback } from 'react';
import { appActions } from './slices/appSlice';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Custom hooks for specific slices
export const useApp = () => {
  const dispatch = useAppDispatch();
  const appState = useAppSelector((state) => state.app);
  
  const toggleSidebar = useCallback(() => {
    dispatch(appActions.toggleSidebar());
  }, [dispatch]);
  
  const setSidebarOpen = useCallback((open: boolean) => {
    dispatch(appActions.setSidebarOpen(open));
  }, [dispatch]);
  
  const setLoading = useCallback((loading: boolean) => {
    dispatch(appActions.setLoading(loading));
  }, [dispatch]);
  
  return {
    ...appState,
    toggleSidebar,
    setSidebarOpen,
    setLoading,
  };
};