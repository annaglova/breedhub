import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { appStore } from '@breedhub/rxdb-store';

/**
 * React hook to use app store workspaces
 */
export function useAppWorkspaces() {
  const [workspaces, setWorkspaces] = useState(appStore.workspaces.value);
  const [loading, setLoading] = useState(appStore.loading.value);
  const [error, setError] = useState(appStore.error.value);
  const [isDataLoaded, setIsDataLoaded] = useState(appStore.isDataLoaded.value);

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

    const unsubscribeDataLoaded = appStore.isDataLoaded.subscribe(value => {
      setIsDataLoaded(value);
    });

    // Cleanup
    return () => {
      unsubscribeWorkspaces();
      unsubscribeLoading();
      unsubscribeError();
      unsubscribeDataLoaded();
    };
  }, []);

  return {
    workspaces,
    loading,
    error,
    isDataLoaded,
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

/**
 * Get spaces for the current workspace
 */
export function useWorkspaceSpaces(workspacePath?: string) {
  const { workspaces } = useAppWorkspaces();
  const location = useLocation();
  
  // Determine which workspace we're in
  const path = workspacePath || location.pathname;
  const workspace = workspaces.find(w => {
    if (path === w.path) return true;
    if (path.startsWith(w.path) && w.path !== '/') return true;
    if (w.path === '/' && !workspaces.some(ws => ws.path !== '/' && path.startsWith(ws.path))) return true;
    return false;
  });

  // Get spaces from workspace config
  const spaces = workspace?.spaces || [];
  
  return {
    workspace,
    spaces: Array.isArray(spaces) ? spaces : Object.values(spaces)
  };
}

/**
 * React hook to use a dynamic entity store
 */
export function useEntityStore<T extends { id: string }>(entityName: string) {
  const [store, setStore] = useState<{
    items: T[];
    loading: boolean;
    error: string | null;
  }>({ items: [], loading: true, error: null });

  useEffect(() => {
    // Initialize the entity store
    appStore.initializeEntityStore<T>(entityName).then(entityStoreSignal => {
      if (entityStoreSignal) {
        // Subscribe to store changes
        const unsubscribe = entityStoreSignal.subscribe(value => {
          setStore({
            items: Array.from(value.items.values()).filter((item: any) => !item._deleted),
            loading: value.loading,
            error: value.error
          });
        });

        return () => unsubscribe();
      }
    });
  }, [entityName]);

  const create = async (data: Partial<T>) => {
    return appStore.createEntity<T>(entityName, data);
  };

  const update = async (id: string, updates: Partial<T>) => {
    return appStore.updateEntity<T>(entityName, id, updates);
  };

  const remove = async (id: string) => {
    return appStore.deleteEntity(entityName, id);
  };

  return {
    ...store,
    create,
    update,
    remove
  };
}