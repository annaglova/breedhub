import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { SpacePage } from '@/pages/SpacePage';
import { SlugResolver } from '@/pages/SlugResolver';
import { TabPageResolver } from '@/pages/TabPageResolver';
import { BillingPage } from '@/pages/BillingPage';
import { WelcomePage } from '@/pages/WelcomePage';
import { SupabaseLoader } from '@/components/test/SupabaseLoader';
import { TestDictionaryPage } from '@/pages/TestDictionaryPage';
import { TestPage } from '@/pages/TestPage';
import { getPage, PageNotFound } from '@/pages/pageRegistry';
import { appStore, spaceStore } from '@breedhub/rxdb-store';
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

/**
 * Hook to get dynamic space routes from config
 */
function useSpaceRoutes() {
  useSignals();

  return useMemo(() => {
    if (!spaceStore.configReady.value) return { routes: [], defaultSlug: 'breeds' };

    const spaceConfigs = spaceStore.getAllSpaceConfigs();
    const defaultSlug = spaceConfigs[0]?.slug || 'breeds';

    return { routes: spaceConfigs, defaultSlug };
  }, [spaceStore.configReady.value]);
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
  const { routes: spaceConfigs, defaultSlug } = useSpaceRoutes();
  const pageRoutes = usePageRoutes();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          {/* Default redirect to first space */}
          <Route index element={<Navigate to={`/${defaultSlug}`} replace />} />

          {/* Dynamic space routes from app_config */}
          {spaceConfigs.map((space) => {
            if (!space.slug || !space.entitySchemaName) return null;
            return (
              <Route
                key={space.id}
                path={`${space.slug}/*`}
                element={<SpacePage entityType={space.entitySchemaName} />}
              />
            );
          })}

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
