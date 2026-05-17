import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageErrorBoundary } from '@/components/error-boundary/ErrorBoundary';
// Core pages — eager, used on 90%+ of routes
import { SpacePage } from '@/pages/SpacePage';
import { SlugResolver } from '@/pages/SlugResolver';
import { EditPageResolver } from '@/pages/EditPageResolver';
import { CreatePageResolver } from '@/pages/CreatePageResolver';
import { TabPageResolver } from '@/pages/TabPageResolver';
import { SignInSkeleton, SignUpSkeleton, ForgotPasswordSkeleton, ResetPasswordSkeleton } from '@shared/components/auth/AuthFormSkeleton';
import { lazy } from 'react';
import { getPage, PageNotFound } from '@/pages/pageRegistry';
import { appStore } from '@breedhub/rxdb-store';
import { useSignals } from '@preact/signals-react/runtime';
import { getDefaultWorkspaceItem, getWorkspaceItems, resolveItemPath } from '@/utils/workspace-items';

function lazyRoute(
  loader: () => Promise<{ default: React.ComponentType<any> }>
): React.ComponentType<any> {
  const LazyComponent = lazy(loader);

  return function LazyRouteComponent(props: any) {
    return (
      <React.Suspense fallback={null}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  };
}

function withPageErrorBoundary(
  element: React.ReactNode,
  contextLabel: string,
) {
  return (
    <PageErrorBoundary contextLabel={contextLabel}>
      {element}
    </PageErrorBoundary>
  );
}

// Auth pages (lazy — only needed on auth routes)
const SignIn = lazy(() => import('@shared/pages/auth/SignIn'));
const SignUp = lazy(() => import('@shared/pages/auth/SignUp'));
const ForgotPassword = lazy(() => import('@shared/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@shared/pages/auth/ResetPassword'));

// Tool pages (lazy — rarely visited)
const BillingPage = lazyRoute(() =>
  import('@/pages/BillingPage').then((module) => ({ default: module.BillingPage }))
);
const ReferralPage = lazyRoute(() =>
  import('@/pages/ReferralPage').then((module) => ({ default: module.ReferralPage }))
);
const GiftPage = lazyRoute(() =>
  import('@/pages/GiftPage').then((module) => ({ default: module.GiftPage }))
);
const WelcomePage = lazyRoute(() =>
  import('@/pages/WelcomePage').then((module) => ({ default: module.WelcomePage }))
);
const AuthCallbackPage = lazyRoute(() =>
  import('@/pages/AuthCallbackPage').then((module) => ({ default: module.AuthCallbackPage }))
);
const TestDictionaryPage = lazyRoute(() =>
  import('@/pages/TestDictionaryPage').then((module) => ({ default: module.TestDictionaryPage }))
);
const TestPage = lazyRoute(() =>
  import('@/pages/TestPage').then((module) => ({ default: module.TestPage }))
);

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
  isPublic: boolean;
}

/**
 * Hook to get dynamic space routes from config.
 * Includes workspace path for proper routing (e.g., /my/notes instead of /notes).
 */
function useSpaceRoutes() {
  useSignals();

  return useMemo(() => {
    if (!appStore.isDataLoaded.value) {
      return { routes: [] as SpaceRoute[], defaultSlug: 'breeds' };
    }

    const workspaces = appStore.workspaces.value;
    const spaceRoutes: SpaceRoute[] = [];

    workspaces.forEach((workspace: any) => {
      const workspacePath = workspace.path || '/';
      const workspaceId = workspace.id || workspace.configKey;
      const isRootWorkspace = workspacePath === '/';
      const workspaceIsPublic = workspace.isPublic ?? true;

      if (workspace.spaces) {
        // Keep the object key — it's the only stable unique id of a space.
        // `space.id` and `space.slug` are semantic ("pets") and repeat
        // across workspaces (public /pets and private /my/pets both have
        // id="pets"), so they can't be used as space identifiers.
        const spaceEntries: Array<[string, any]> = Array.isArray(workspace.spaces)
          ? workspace.spaces.map((space: any, i: number) => [space.id || String(i), space])
          : Object.entries(workspace.spaces);

        spaceEntries.forEach(([spaceKey, space]) => {
          if (space.slug && space.entitySchemaName) {
            const fullPath = isRootWorkspace
              ? space.slug
              : `${workspacePath.replace(/^\//, '')}/${space.slug}`;

            spaceRoutes.push({
              id: spaceKey,
              path: fullPath,
              slug: space.slug,
              entitySchemaName: space.entitySchemaName,
              workspaceId,
              workspacePath,
              isPublic: space.isPublic ?? workspaceIsPublic,
            });
          }
        });
      }
    });

    spaceRoutes.sort((a, b) => a.workspacePath.length - b.workspacePath.length);

    const defaultSlug = spaceRoutes[0]?.slug || 'breeds';
    return { routes: spaceRoutes, defaultSlug };
  }, [appStore.isDataLoaded.value, appStore.workspaces.value]);
}

/**
 * Hook to get dynamic page routes from workspace config.
 * Each page maps to one route:
 *   - page.slug present → `${workspacePath}/${slug}`  (e.g. /my/board)
 *   - page.slug absent  → `workspacePath`             (e.g. /mating — legacy)
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
      isPublic: boolean;
    }> = [];

    workspaces.forEach((workspace: any) => {
      if (!workspace.pages || !workspace.path) return;

      const workspacePath = workspace.path;
      const workspaceId = workspace.id || workspace.configKey;
      const workspaceIsPublic = workspace.isPublic ?? true;

      const pages = Array.isArray(workspace.pages)
        ? workspace.pages
        : Object.values(workspace.pages);

      pages.forEach((page: any) => {
        if (!page?.component) return;
        const resolved = page.slug
          ? `${workspacePath.replace(/^\//, '')}/${page.slug}`
          : workspacePath.replace(/^\//, '');

        pageRoutes.push({
          path: resolved,
          component: page.component,
          workspaceId,
          pageConfig: page,
          workspaceConfig: workspace,
          isPublic: page.isPublic ?? workspaceIsPublic,
        });
      });
    });

    return pageRoutes;
  }, [appStore.isDataLoaded.value, appStore.workspaces.value]);
}

/**
 * Workspace-root redirects: `/my` → default child of the workspace.
 *
 * Skips workspaces whose default child has no slug — those pages live AT
 * the workspace path (legacy tool layout: /mating, /billing, …), so no
 * redirect is needed.
 */
function useWorkspaceRedirects() {
  useSignals();

  return useMemo(() => {
    if (!appStore.isDataLoaded.value) {
      return [] as Array<{ from: string; to: string }>;
    }

    const workspaces = appStore.workspaces.value;
    const redirects: Array<{ from: string; to: string }> = [];

    workspaces.forEach((workspace: any) => {
      const workspacePath = workspace.path || '/';
      if (workspacePath === '/') return; // root has its own index redirect

      const items = getWorkspaceItems(workspace);
      const target = getDefaultWorkspaceItem(items);
      if (!target || !target.slug) return; // slug-less page lives at workspace.path

      redirects.push({
        from: workspacePath.replace(/^\//, ''),
        to: resolveItemPath(workspacePath, target),
      });
    });

    return redirects;
  }, [appStore.isDataLoaded.value, appStore.workspaces.value]);
}

export function AppRouter() {
  const { routes: spaceConfigs, defaultSlug } = useSpaceRoutes();
  const pageRoutes = usePageRoutes();
  const workspaceRedirects = useWorkspaceRedirects();

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes (outside AppLayout) */}
        <Route
          path="/sign-in"
          element={withPageErrorBoundary(
            <React.Suspense fallback={<SignInSkeleton />}><SignIn /></React.Suspense>,
            '/sign-in',
          )}
        />
        <Route
          path="/sign-up"
          element={withPageErrorBoundary(
            <React.Suspense fallback={<SignUpSkeleton />}><SignUp /></React.Suspense>,
            '/sign-up',
          )}
        />
        <Route
          path="/forgot-password"
          element={withPageErrorBoundary(
            <React.Suspense fallback={<ForgotPasswordSkeleton />}><ForgotPassword /></React.Suspense>,
            '/forgot-password',
          )}
        />
        <Route
          path="/reset-password"
          element={withPageErrorBoundary(
            <React.Suspense fallback={<ResetPasswordSkeleton />}><ResetPassword /></React.Suspense>,
            '/reset-password',
          )}
        />
        <Route
          path="/auth/callback"
          element={withPageErrorBoundary(<AuthCallbackPage />, '/auth/callback')}
        />

        {/* App routes (inside AppLayout) */}
        <Route path="/" element={<AppLayout />}>
          {/* ─── PUBLIC routes ─────────────────────────────────────────── */}

          {/* Default redirect to first (public) space */}
          <Route index element={<Navigate to={`/${defaultSlug}`} replace />} />

          {/* Public space routes (isPublic !== false) — e.g. /pets, /breeds, /kennels.
              Private workspace spaces (e.g. /my/notes) are mounted below AuthGuard. */}
          {spaceConfigs
            .filter((space) => space.isPublic !== false)
            .map((space) => (
              <Route
                key={`${space.workspaceId}-${space.id}`}
                path={`${space.path}/*`}
                element={<SpacePage spaceId={space.id} entityType={space.entitySchemaName} />}
              />
            ))}

          {/* Public pretty URLs — /affenpinscher → single entity view */}
          <Route path=":slug" element={<SlugResolver />} />
          <Route path=":slug/:tabSlug" element={<TabPageResolver />} />

          {/* ─── AUTH-GUARDED routes ───────────────────────────────────── */}
          <Route element={<AuthGuard><Outlet /></AuthGuard>}>
            {/* Workspace redirects - redirect /my to /my/notes etc.
                All redirects are for non-root workspaces (see useSpaceRoutes). */}
            {workspaceRedirects.map((redirect) => (
              <Route
                key={`redirect-${redirect.from}`}
                path={redirect.from}
                element={<Navigate to={redirect.to} replace />}
              />
            ))}

            {/* User-scoped space routes (isPublic === false, e.g. /my/notes) */}
            {spaceConfigs
              .filter((space) => space.isPublic === false)
              .map((space) => (
                <Route
                  key={`${space.workspaceId}-${space.id}`}
                  path={`${space.path}/*`}
                  element={<SpacePage spaceId={space.id} entityType={space.entitySchemaName} />}
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

            {/* Create page - fullscreen create form */}
            {/* Resolves /new?entity=pet → fullscreen create form */}
            <Route path="new" element={<CreatePageResolver />} />

            {/* Edit page resolver - for edit mode via pretty URL */}
            {/* Resolves /my-pet-name/edit → edit page fullscreen */}
            <Route path=":slug/edit" element={<EditPageResolver />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
