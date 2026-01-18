import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { SpacePage } from '@/pages/SpacePage';
import { SlugResolver } from '@/pages/SlugResolver';
import { TabPageResolver } from '@/pages/TabPageResolver';
import { BillingPage } from '@/pages/BillingPage';
import { ReferralPage } from '@/pages/ReferralPage';
import { GiftPage } from '@/pages/GiftPage';
import { WelcomePage } from '@/pages/WelcomePage';
import { SupabaseLoader } from '@/components/test/SupabaseLoader';
import { TestDictionaryPage } from '@/pages/TestDictionaryPage';
import { TestPage } from '@/pages/TestPage';
import { getPage, PageNotFound } from '@/pages/pageRegistry';
import { appStore } from '@breedhub/rxdb-store';
import { useSignals } from '@preact/signals-react/runtime';

// Temporary placeholder component
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-4">{title}</h1>
      <p className="text-slate-600">This section is under construction.</p>
    </div>
  );
}

interface SpaceRoute {
  id: string;
  path: string; // Full path including workspace prefix (e.g., "my/notes")
  slug: string;
  entitySchemaName: string;
  workspaceId: string;
  workspacePath: string;
}

/**
 * Hook to get dynamic space routes from config
 * Now includes workspace path for proper routing (e.g., /my/notes instead of /notes)
 */
function useSpaceRoutes() {
  useSignals();

  return useMemo(() => {
    if (!appStore.isDataLoaded.value) {
      return { routes: [] as SpaceRoute[], defaultSlug: 'breeds', workspaceRedirects: [] as Array<{ from: string; to: string }> };
    }

    const workspaces = appStore.workspaces.value;
    const spaceRoutes: SpaceRoute[] = [];

    workspaces.forEach((workspace: any) => {
      const workspacePath = workspace.path || '/';
      const workspaceId = workspace.id || workspace.configKey;
      const isRootWorkspace = workspacePath === '/';

      if (workspace.spaces) {
        const spaces = Array.isArray(workspace.spaces)
          ? workspace.spaces
          : Object.values(workspace.spaces);

        spaces.forEach((space: any) => {
          if (space.slug && space.entitySchemaName) {
            // For root workspace, path is just slug (e.g., "breeds")
            // For other workspaces, path is workspacePath/slug (e.g., "my/notes")
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
          }
        });
      }
    });

    // Sort by workspace path length (root first) then by order
    spaceRoutes.sort((a, b) => a.workspacePath.length - b.workspacePath.length);

    // Build workspace redirects (for workspaces with spaces but no pages)
    // e.g., /my → /my/notes
    const workspaceRedirects: Array<{ from: string; to: string }> = [];
    workspaces.forEach((workspace: any) => {
      const workspacePath = workspace.path || '/';
      if (workspacePath === '/') return; // Skip root workspace

      // If workspace has spaces but no pages, redirect to first space
      if (workspace.spaces && !workspace.pages) {
        const spaces = Array.isArray(workspace.spaces)
          ? workspace.spaces
          : Object.values(workspace.spaces);
        const sortedSpaces = spaces.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
        const firstSpace = sortedSpaces[0];
        if (firstSpace?.slug) {
          workspaceRedirects.push({
            from: workspacePath.replace(/^\//, ''), // e.g., "my"
            to: `${workspacePath}/${firstSpace.slug}` // e.g., "/my/notes"
          });
        }
      }
    });

    const defaultSlug = spaceRoutes[0]?.slug || 'breeds';
    return { routes: spaceRoutes, defaultSlug, workspaceRedirects };
  }, [appStore.isDataLoaded.value, appStore.workspaces.value]);
}

/**
 * Hook to get dynamic page routes from workspace config
 * Returns pages from workspaces that have pages (tool workspaces)
 */
function usePageRoutes() {
  useSignals();

  return useMemo(() => {
    if (!appStore.isDataLoaded.value) return [];

    const workspaces = appStore.workspaces.value;
    const pageRoutes: Array<{
      path: string;
      component: string;
      workspaceId: string;
      pageConfig: any;
      workspaceConfig: any;
    }> = [];

    // Find workspaces with pages (tool workspaces)
    workspaces.forEach((workspace: any) => {
      if (workspace.pages && workspace.path) {
        // Get pages from workspace
        const pages = Array.isArray(workspace.pages)
          ? workspace.pages
          : Object.values(workspace.pages);

        // Find default page or first page
        const defaultPage = pages.find((p: any) => p.isDefault) || pages[0];

        if (defaultPage?.component) {
          pageRoutes.push({
            path: workspace.path.replace(/^\//, ''), // Remove leading slash
            component: defaultPage.component,
            workspaceId: workspace.id || workspace.configKey,
            pageConfig: defaultPage,
            workspaceConfig: workspace,
          });
        }
      }
    });

    return pageRoutes;
  }, [appStore.isDataLoaded.value, appStore.workspaces.value]);
}

export function AppRouter() {
  const { routes: spaceConfigs, defaultSlug, workspaceRedirects } = useSpaceRoutes();
  const pageRoutes = usePageRoutes();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          {/* Default redirect to first space */}
          <Route index element={<Navigate to={`/${defaultSlug}`} replace />} />

          {/* Workspace redirects - redirect /my to /my/notes etc. */}
          {workspaceRedirects.map((redirect) => (
            <Route
              key={`redirect-${redirect.from}`}
              path={redirect.from}
              element={<Navigate to={redirect.to} replace />}
            />
          ))}

          {/* Dynamic space routes from app_config */}
          {spaceConfigs.map((space) => (
            <Route
              key={`${space.workspaceId}-${space.id}`}
              path={`${space.path}/*`}
              element={<SpacePage entityType={space.entitySchemaName} />}
            />
          ))}

          {/* Dynamic page routes from workspace config (tool pages) */}
          {pageRoutes.map((page) => {
            const PageComponent = getPage(page.component);
            if (!PageComponent) {
              return (
                <Route
                  key={page.workspaceId}
                  path={page.path}
                  element={<PageNotFound componentName={page.component} />}
                />
              );
            }

            // All tool pages use query params for data (e.g., /mating?father=slug&mother=slug)
            return (
              <Route
                key={page.workspaceId}
                path={page.path}
                element={<PageComponent pageConfig={page.pageConfig} workspaceConfig={page.workspaceConfig} />}
              />
            );
          })}

          {/* Marketplace routes - TODO: make dynamic from workspaces */}
          <Route path="marketplace">
            <Route index element={<Navigate to="/marketplace/pets" replace />} />
            <Route path="pets" element={<PlaceholderPage title="Marketplace - Pets" />} />
          </Route>

          {/* Test routes */}
          <Route path="test">
            <Route path="supabase" element={<SupabaseLoader />} />
            <Route path="dictionary" element={<TestDictionaryPage />} />
            <Route path="page" element={<TestPage />} />
          </Route>

          {/* Welcome/onboarding page */}
          <Route path="welcome" element={<WelcomePage />} />

          {/* Billing page */}
          <Route path="billing" element={<BillingPage />} />

          {/* Referral page */}
          <Route path="referral" element={<ReferralPage />} />

          {/* Gift page */}
          <Route path="gift" element={<GiftPage />} />

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
