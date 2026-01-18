import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { SpacePage } from '@/pages/SpacePage';
import { SlugResolver } from '@/pages/SlugResolver';
import { TabPageResolver } from '@/pages/TabPageResolver';
import { SupabaseLoader } from '@/components/test/SupabaseLoader';
import { TestDictionaryPage } from '@/pages/TestDictionaryPage';
import { TestPage } from '@/pages/TestPage';
import { getPage, PageNotFound } from '@/pages/pageRegistry';
import { appStore } from '@breedhub/rxdb-store';
import { useSignals } from '@preact/signals-react/runtime';

interface SpaceRoute {
  id: string;
  path: string; // Full path including workspace prefix
  slug: string;
  entitySchemaName: string;
  workspaceId: string;
  workspacePath: string;
}

interface PageRoute {
  id: string;
  path: string;
  component: string;
  workspaceId: string;
  pageConfig: any;
  workspaceConfig: any;
}

/**
 * Hook to get all dynamic routes from workspace configs
 * Handles both space workspaces (with entities) and page workspaces (with tool pages)
 */
function useWorkspaceRoutes() {
  useSignals();

  return useMemo(() => {
    if (!appStore.isDataLoaded.value) {
      return { spaceRoutes: [], pageRoutes: [], defaultPath: '/breeds' };
    }

    const workspaces = appStore.workspaces.value;
    const spaceRoutes: SpaceRoute[] = [];
    const pageRoutes: PageRoute[] = [];
    let defaultPath = '/breeds';

    workspaces.forEach((workspace: any) => {
      const workspacePath = workspace.path || '/';
      const workspaceId = workspace.id || workspace.configKey;
      const isRootWorkspace = workspacePath === '/';

      // Process spaces in workspace (entity collections)
      if (workspace.spaces) {
        const spaces = Array.isArray(workspace.spaces)
          ? workspace.spaces
          : Object.values(workspace.spaces);

        spaces.forEach((space: any) => {
          if (space.slug && space.entitySchemaName) {
            // For root workspace, path is just /slug
            // For other workspaces, path is /workspacePath/slug
            const fullPath = isRootWorkspace
              ? space.slug
              : `${workspacePath.replace(/^\//, '')}/${space.slug}`;

            spaceRoutes.push({
              id: space.id || space.slug,
              path: fullPath,
              slug: space.slug,
              entitySchemaName: space.entitySchemaName,
              workspaceId,
              workspacePath,
            });

            // First space of root workspace becomes default
            if (isRootWorkspace && spaceRoutes.length === 1) {
              defaultPath = `/${space.slug}`;
            }
          }
        });
      }

      // Process pages in workspace (tool pages like mating, billing, etc.)
      if (workspace.pages) {
        const pages = Array.isArray(workspace.pages)
          ? workspace.pages
          : Object.values(workspace.pages);

        // Find default page or first page
        const defaultPage = pages.find((p: any) => p.isDefault) || pages[0];

        if (defaultPage?.component && workspacePath !== '/') {
          pageRoutes.push({
            id: workspaceId,
            path: workspacePath.replace(/^\//, ''), // Remove leading slash for Route path
            component: defaultPage.component,
            workspaceId,
            pageConfig: defaultPage,
            workspaceConfig: workspace,
          });
        }
      }
    });

    // Sort space routes by workspace path length (root first) then by order
    spaceRoutes.sort((a, b) => {
      if (a.workspacePath.length !== b.workspacePath.length) {
        return a.workspacePath.length - b.workspacePath.length;
      }
      return 0;
    });

    return { spaceRoutes, pageRoutes, defaultPath };
  }, [appStore.isDataLoaded.value, appStore.workspaces.value]);
}

export function AppRouter() {
  const { spaceRoutes, pageRoutes, defaultPath } = useWorkspaceRoutes();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          {/* Default redirect to first space */}
          <Route index element={<Navigate to={defaultPath} replace />} />

          {/* Dynamic space routes from workspace configs */}
          {spaceRoutes.map((space) => (
            <Route
              key={`${space.workspaceId}-${space.id}`}
              path={`${space.path}/*`}
              element={<SpacePage entityType={space.entitySchemaName} />}
            />
          ))}

          {/* Dynamic page routes from workspace configs (tool pages) */}
          {pageRoutes.map((page) => {
            const PageComponent = getPage(page.component);
            if (!PageComponent) {
              return (
                <Route
                  key={page.id}
                  path={page.path}
                  element={<PageNotFound componentName={page.component} />}
                />
              );
            }

            return (
              <Route
                key={page.id}
                path={page.path}
                element={<PageComponent pageConfig={page.pageConfig} workspaceConfig={page.workspaceConfig} />}
              />
            );
          })}

          {/* Test routes - development only */}
          <Route path="test">
            <Route path="supabase" element={<SupabaseLoader />} />
            <Route path="dictionary" element={<TestDictionaryPage />} />
            <Route path="page" element={<TestPage />} />
          </Route>

          {/* Slug resolver - catch-all for pretty URLs */}
          {/* Resolves /affenpinscher → /breeds/:id with fullscreen state */}
          <Route path=":slug" element={<SlugResolver />} />

          {/* Tab page resolver - for tab fullscreen mode */}
          {/* Resolves /affenpinscher/achievements → single tab view */}
          <Route path=":slug/:tabSlug" element={<TabPageResolver />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
