import React, { useMemo } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { SpaceComponent } from '@/components/space/SpaceComponent';
import { PublicPageTemplate } from '@/components/template/PublicPageTemplate';
import { TabPageTemplate } from '@/components/template/TabPageTemplate';
import { getEntityHook } from '@/hooks/hookRegistry';
import { appStore, spaceStore } from '@breedhub/rxdb-store';
import { useSignals } from '@preact/signals-react/runtime';
import { getComponent } from '@/components/space/componentRegistry';

/**
 * Wrapper component that reads location.state.fullscreen
 * and passes appropriate isDrawerMode prop
 */
function DetailWrapper({
  DetailComponent,
  spaceConfigSignal,
  entityType
}: {
  DetailComponent: React.ComponentType<any>;
  spaceConfigSignal: any;
  entityType: string;
}) {
  const location = useLocation();
  const state = location.state as { fullscreen?: boolean; fromSlug?: string } | null;
  const isFullscreen = state?.fullscreen === true;

  return (
    <DetailComponent
      isDrawerMode={!isFullscreen}
      isFullscreenMode={isFullscreen}
      spaceConfigSignal={spaceConfigSignal}
      entityType={entityType}
    />
  );
}

/**
 * Wrapper for TabPageTemplate in drawer fullscreen mode
 */
function TabDetailWrapper({
  entityType,
  entityId,
  entitySlug,
  tabSlug,
  spaceConfigSignal
}: {
  entityType: string;
  entityId: string;
  entitySlug: string;
  tabSlug: string;
  spaceConfigSignal: any;
}) {
  return (
    <TabPageTemplate
      entityType={entityType}
      entityId={entityId}
      entitySlug={entitySlug}
      tabSlug={tabSlug}
      isDrawerMode={false}
      isFullscreenMode={true}
    />
  );
}

interface SpacePageProps {
  entityType: string; // 'breed', 'pet', 'kennel', etc.
  selectedEntityId?: string; // Pre-selected entity ID (from SlugResolver)
  selectedSlug?: string; // Pretty URL slug (from SlugResolver) - for URL display
  tabSlug?: string; // Tab slug for tab fullscreen mode (from TabPageResolver)
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
export function SpacePage({ entityType, selectedEntityId, selectedSlug, tabSlug }: SpacePageProps) {
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

  // Config should be pre-generated and always available
  if (!spaceConfigSignal.value) {
    return null;
  }

  // When selectedEntityId is provided (from SlugResolver/TabPageResolver), render with pre-selected entity
  // This is used for pretty URLs like /affenpinscher or /affenpinscher/patrons
  if (selectedEntityId) {
    // Tab fullscreen mode: render TabPageTemplate in drawer fullscreen
    if (tabSlug && selectedSlug) {
      return (
        <SpaceComponent
          configSignal={spaceConfigSignal}
          useEntitiesHook={useEntitiesHook}
          initialSelectedEntityId={selectedEntityId}
          initialSelectedSlug={selectedSlug}
        >
          <TabDetailWrapper
            entityType={entityType}
            entityId={selectedEntityId}
            entitySlug={selectedSlug}
            tabSlug={tabSlug}
            spaceConfigSignal={spaceConfigSignal}
          />
        </SpaceComponent>
      );
    }

    // Normal fullscreen mode: render PublicPageTemplate
    // Pretty URL always means fullscreen mode (no drawer)
    return (
      <SpaceComponent
        configSignal={spaceConfigSignal}
        useEntitiesHook={useEntitiesHook}
        initialSelectedEntityId={selectedEntityId}
        initialSelectedSlug={selectedSlug}
      >
        <DetailComponent
          isDrawerMode={false}
          isFullscreenMode={true}
          spaceConfigSignal={spaceConfigSignal}
          entityType={entityType}
        />
      </SpaceComponent>
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
        {/* Drawer route - DetailWrapper checks for fullscreen state */}
        <Route
          path=":id"
          element={
            <DetailWrapper
              DetailComponent={DetailComponent}
              spaceConfigSignal={spaceConfigSignal}
              entityType={entityType}
            />
          }
        />

        {/* New entity form */}
        <Route path="new" element={<div>New {entityType} Form</div>} />
      </Route>

      {/* Full page route (optional) */}
      {/* <Route path=":id/full" element={<DetailComponent isDrawerMode={false} />} /> */}
    </Routes>
  );
}
