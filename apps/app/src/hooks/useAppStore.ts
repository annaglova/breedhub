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

  // Helper to get space slugs from workspace config
  const getSpaceSlugs = (spaces: any): string[] => {
    if (!spaces) return [];
    const spacesArray = Array.isArray(spaces) ? spaces : Object.values(spaces);
    return spacesArray
      .map((space: any) => space?.slug)
      .filter((slug): slug is string => typeof slug === 'string');
  };

  // Find workspace that matches the current path
  const currentWorkspace = workspaces.find(w => {
    if (w.path === pathname) return true;
    // Check if pathname matches any of workspace's space slugs
    const spaceSlugs = getSpaceSlugs(w.spaces);
    return spaceSlugs.some(slug => pathname.startsWith(`/${slug}`));
  });

  return currentWorkspace;
}

/**
 * Get spaces for the current workspace
 *
 * Resolution order:
 *   1. Explicit `workspacePath` arg (legacy).
 *   2. `?from=<workspaceId>` URL token — set by link emitters when the user
 *      jumps to a slug-only detail page (e.g. /test-pet?from=my) so the
 *      sidebar keeps showing the originating workspace's menu instead of
 *      defaulting to home.
 *   3. Pathname prefix match (`/my/...` → my, etc.).
 */
export function useWorkspaceSpaces(workspacePath?: string) {
  const { workspaces } = useAppWorkspaces();
  const location = useLocation();

  // Honor the ?from= origin token before pathname matching — without this
  // /test-pet?from=my would still resolve to the home workspace because the
  // URL pathname doesn't start with /my.
  const fromWorkspaceId = workspacePath
    ? null
    : new URLSearchParams(location.search).get('from');
  const workspaceFromToken = fromWorkspaceId
    ? workspaces.find((w) => w.id === fromWorkspaceId)
    : null;

  // Determine which workspace we're in
  const path = workspacePath || location.pathname;
  const workspaceFromPath = workspaceFromToken
    ? null
    : workspaces.find((w) => {
        if (path === w.path) return true;
        if (path.startsWith(w.path) && w.path !== '/') return true;
        if (
          w.path === '/' &&
          !workspaces.some((ws) => ws.path !== '/' && path.startsWith(ws.path))
        )
          return true;
        return false;
      });

  const workspace = workspaceFromToken ?? workspaceFromPath;

  // Get spaces from workspace config
  const spaces = workspace?.spaces || [];

  // Get pages from workspace config (for tool workspaces)
  const pages = workspace?.pages || [];

  return {
    workspace,
    spaces: Array.isArray(spaces) ? spaces : Object.values(spaces),
    pages: Array.isArray(pages) ? pages : Object.values(pages)
  };
}
