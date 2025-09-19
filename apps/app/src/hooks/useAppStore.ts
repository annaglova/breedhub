import { useEffect, useState } from 'react';
import { appStore } from '@breedhub/rxdb-store';

/**
 * React hook to use app store workspaces
 */
export function useAppWorkspaces() {
  const [workspaces, setWorkspaces] = useState(appStore.workspaces.value);
  const [loading, setLoading] = useState(appStore.loading.value);
  const [error, setError] = useState(appStore.error.value);

  useEffect(() => {
    // Subscribe to changes
    const unsubscribeWorkspaces = appStore.workspaces.subscribe(value => {
      setWorkspaces(value);
    });

    const unsubscribeLoading = appStore.loading.subscribe(value => {
      setLoading(value);
    });

    const unsubscribeError = appStore.error.subscribe(value => {
      setError(value);
    });

    // Initialize if not already initialized
    if (!appStore.appConfig.value && !loading) {
      appStore.initialize();
    }

    // Cleanup
    return () => {
      unsubscribeWorkspaces();
      unsubscribeLoading();
      unsubscribeError();
    };
  }, []);

  return {
    workspaces,
    loading,
    error,
    reload: appStore.reloadConfig
  };
}

/**
 * Get workspace by current path
 */
export function useCurrentWorkspace(pathname: string) {
  const { workspaces } = useAppWorkspaces();
  
  // Find workspace that matches the current path
  const currentWorkspace = workspaces.find(w => {
    if (w.path === pathname) return true;
    // Handle nested paths (e.g., /breeds/xxx matches home workspace)
    if (w.path === '/' && pathname.startsWith('/breeds')) return true;
    return false;
  });

  return currentWorkspace;
}