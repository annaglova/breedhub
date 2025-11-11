import React, { useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { SpaceComponent } from '@/components/space/SpaceComponent';
import { PublicPageTemplate } from '@/components/template/PublicPageTemplate';
import { getEntityHook } from '@/hooks/hookRegistry';
import { appStore, spaceStore } from '@breedhub/rxdb-store';
import { useSignals } from '@preact/signals-react/runtime';
import { getComponent } from '@/components/space/componentRegistry';

interface SpacePageProps {
  entityType: string; // 'breed', 'pet', 'kennel', etc.
}

/**
 * SpacePage - Universal page for any entity type
 *
 * Responsibilities:
 * - Route management (list + drawer/detail)
 * - Hook selection from hookRegistry
 * - Template selection from app_config
 * - Space config from spaceStore (from app_config in DB)
 *
 * Usage in AppRouter:
 * <Route path="breeds/*" element={<SpacePage entityType="breed" />} />
 */
export function SpacePage({ entityType }: SpacePageProps) {
  useSignals();

  // Get hook from registry
  const useEntitiesHook = getEntityHook(entityType);

  if (!useEntitiesHook) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">
          Hook not found for entity type: {entityType}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Add hook to hookRegistry.ts
        </p>
      </div>
    );
  }

  // Get page config from app_config (SpaceStore reads this dynamically)
  // We just need the component name for drawer
  const pageComponent = useMemo(() => {
    if (!appStore.initialized.value) {
      return 'PublicPageTemplate'; // Default while loading
    }

    // TODO: Read from app_config when structure is ready
    // For now, hardcode to PublicPageTemplate
    // const pageConfig = appStore.getPageConfig(entityType);
    // return pageConfig?.component || 'PublicPageTemplate';

    return 'PublicPageTemplate';
  }, [entityType, appStore.initialized.value]);

  // Get component from registry
  const DetailComponent = getComponent(pageComponent) || PublicPageTemplate;

  // Get spaceConfig signal from spaceStore (from app_config in DB)
  // Pass signal itself, not .value - let components subscribe to changes
  const spaceConfigSignal = useMemo(
    () => spaceStore.getSpaceConfigSignal(entityType),
    [entityType]
  );

  // Show loading state if config not ready
  if (!spaceConfigSignal.value) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Loading space configuration...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* List view with drawer outlet */}
      <Route
        path="/"
        element={
          <SpaceComponent
            configSignal={spaceConfigSignal}
            useEntitiesHook={useEntitiesHook}
          />
        }
      >
        {/* Drawer route */}
        <Route
          path=":id"
          element={<DetailComponent isDrawerMode={true} spaceConfigSignal={spaceConfigSignal} entityType={entityType} />}
        />

        {/* New entity form */}
        <Route path="new" element={<div>New {entityType} Form</div>} />
      </Route>

      {/* Full page route (optional) */}
      {/* <Route path=":id/full" element={<DetailComponent isDrawerMode={false} />} /> */}
    </Routes>
  );
}
