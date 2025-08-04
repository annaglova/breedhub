import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store';
import { useCallback } from 'react';
import { toggleSidebar, setSidebarOpen, setLoading } from './slices/appSlice';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Custom hooks for specific slices
export const useApp = () => {
  const dispatch = useAppDispatch();
  const appState = useAppSelector((state) => state.app);
  
  const toggleSidebarAction = useCallback(() => {
    dispatch(toggleSidebar());
  }, [dispatch]);
  
  const setSidebarOpenAction = useCallback((open: boolean) => {
    dispatch(setSidebarOpen(open));
  }, [dispatch]);
  
  const setLoadingAction = useCallback((loading: boolean) => {
    dispatch(setLoading(loading));
  }, [dispatch]);
  
  return {
    ...appState,
    toggleSidebar: toggleSidebarAction,
    setSidebarOpen: setSidebarOpenAction,
    setLoading: setLoadingAction,
  };
};