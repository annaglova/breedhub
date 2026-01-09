import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { SpacePage } from '@/pages/SpacePage';
import { SlugResolver } from '@/pages/SlugResolver';
import { TabPageResolver } from '@/pages/TabPageResolver';
import { SupabaseLoader } from '@/components/test/SupabaseLoader';
import { TestDictionaryPage } from '@/pages/TestDictionaryPage';
import { TestPage } from '@/pages/TestPage';
import { MatingPage } from '@/pages/MatingPage';
import { spaceStore } from '@breedhub/rxdb-store';
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

export function AppRouter() {
  const { routes: spaceConfigs, defaultSlug } = useSpaceRoutes();

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

          {/* Marketplace routes - TODO: make dynamic from workspaces */}
          <Route path="marketplace">
            <Route index element={<Navigate to="/marketplace/pets" replace />} />
            <Route path="pets" element={<PlaceholderPage title="Marketplace - Pets" />} />
          </Route>

          {/* Test mating page */}
          <Route path="mating" element={<MatingPage />} />

          {/* Test routes */}
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
