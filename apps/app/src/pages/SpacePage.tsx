import React, { useMemo } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { SpaceComponent } from '@/components/space/SpaceComponent';
import { PublicPageTemplate } from '@/components/template/PublicPageTemplate';
import { EditPageTemplate } from '@/components/template/EditPageTemplate';
import { TabPageTemplate } from '@/components/template/TabPageTemplate';
import { registerAllComponents } from '@/components/registerComponents';
import { getEntityHook } from '@/hooks/hookRegistry';
import { appStore, spaceStore } from '@breedhub/rxdb-store';
import { useSignals } from '@preact/signals-react/runtime';
import { getComponent } from '@/components/space/componentRegistry';

registerAllComponents();

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
  entityPartitionId,
  entitySlug,
  tabSlug,
}: {
  entityType: string;
  entityId: string;
  entityPartitionId?: string;
  entitySlug: string;
  tabSlug: string;
}) {
  return (
    <TabPageTemplate
      entityType={entityType}
      entityId={entityId}
      entityPartitionId={entityPartitionId}
      entitySlug={entitySlug}
      tabSlug={tabSlug}
      isDrawerMode={false}
      isFullscreenMode={true}
    />
  );
}

interface SpaceShellProps {
  shellKey: string;
  configSignal: any;
  useEntitiesHook: any;
  createMode?: boolean;
  initialSelectedEntityId?: string;
  initialSelectedPartitionId?: string;
  initialSelectedPartitionField?: string;
  initialSelectedSlug?: string;
  children?: React.ReactNode;
}

function SpaceShell({
  shellKey,
  configSignal,
  useEntitiesHook,
  createMode = false,
  initialSelectedEntityId,
  initialSelectedPartitionId,
  initialSelectedPartitionField,
  initialSelectedSlug,
  children,
}: SpaceShellProps) {
  return (
    <SpaceComponent
      key={shellKey}
      configSignal={configSignal}
      useEntitiesHook={useEntitiesHook}
      createMode={createMode}
      initialSelectedEntityId={initialSelectedEntityId}
      initialSelectedPartitionId={initialSelectedPartitionId}
      initialSelectedPartitionField={initialSelectedPartitionField}
      initialSelectedSlug={initialSelectedSlug}
    >
      {children}
    </SpaceComponent>
  );
}

interface SelectedEntityContentProps {
  DetailComponent: React.ComponentType<any>;
  spaceConfigSignal: any;
  entityType: string;
  selectedEntityId: string;
  selectedPartitionId?: string;
  selectedSlug?: string;
  tabSlug?: string;
  editMode?: boolean;
}

function SelectedEntityContent({
  DetailComponent,
  spaceConfigSignal,
  entityType,
  selectedEntityId,
  selectedPartitionId,
  selectedSlug,
  tabSlug,
  editMode = false,
}: SelectedEntityContentProps) {
  if (editMode) {
    return (
      <EditPageTemplate
        spaceConfigSignal={spaceConfigSignal}
        entityType={entityType}
      />
    );
  }

  if (tabSlug && selectedSlug) {
    return (
      <TabDetailWrapper
        entityType={entityType}
        entityId={selectedEntityId}
        entityPartitionId={selectedPartitionId}
        entitySlug={selectedSlug}
        tabSlug={tabSlug}
      />
    );
  }

  return (
    <DetailComponent
      isDrawerMode={false}
      isFullscreenMode={true}
      spaceConfigSignal={spaceConfigSignal}
      entityType={entityType}
    />
  );
}

interface SpacePageProps {
  entityType: string; // 'breed', 'pet', 'kennel', etc.
  selectedEntityId?: string; // Pre-selected entity ID (from SlugResolver)
  selectedPartitionId?: string; // Partition key value for partitioned tables (e.g., breed_id value for pet)
  selectedPartitionField?: string; // Partition key column name (e.g., 'breed_id') - fallback for cold load
  selectedSlug?: string; // Pretty URL slug (from SlugResolver) - for URL display
  tabSlug?: string; // Tab slug for tab fullscreen mode (from TabPageResolver)
  editMode?: boolean; // Edit mode - renders EditPageTemplate (from EditPageResolver)
  createMode?: boolean; // Create mode - renders EditPageTemplate without entity (from CreatePageResolver)
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
export function SpacePage({ entityType, selectedEntityId, selectedPartitionId, selectedPartitionField, selectedSlug, tabSlug, editMode, createMode }: SpacePageProps) {
  useSignals();

  // Get hook from registry
  const useEntitiesHook = getEntityHook(entityType);

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

  const selectedEntityShellProps = useMemo(
    () => ({
      initialSelectedEntityId: selectedEntityId,
      initialSelectedPartitionId: selectedPartitionId,
      initialSelectedPartitionField: selectedPartitionField,
      initialSelectedSlug: selectedSlug,
    }),
    [selectedEntityId, selectedPartitionId, selectedPartitionField, selectedSlug]
  );

  // Early returns AFTER all hooks are called (React rules of hooks)
  if (!useEntitiesHook) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">
          Hook not found for entity type: {entityType}
        </p>
        <p className="text-sm text-slate-500 mt-2">
          Add hook to hookRegistry.ts
        </p>
      </div>
    );
  }

  // Config should be pre-generated and always available
  if (!spaceConfigSignal.value) {
    return null;
  }

  // Create mode: fullscreen edit form without entity (from CreatePageResolver)
  if (createMode) {
    return (
      <SpaceShell
        shellKey={`${entityType}-create`}
        configSignal={spaceConfigSignal}
        useEntitiesHook={useEntitiesHook}
        createMode={true}
      >
        <EditPageTemplate
          spaceConfigSignal={spaceConfigSignal}
          entityType={entityType}
          isCreateMode={true}
        />
      </SpaceShell>
    );
  }

  // When selectedEntityId is provided (from SlugResolver/TabPageResolver/EditPageResolver), render with pre-selected entity
  // This is used for pretty URLs like /affenpinscher or /affenpinscher/patrons or /affenpinscher/edit
  if (selectedEntityId) {
    return (
      <SpaceShell
        shellKey={entityType}
        configSignal={spaceConfigSignal}
        useEntitiesHook={useEntitiesHook}
        {...selectedEntityShellProps}
      >
        <SelectedEntityContent
          DetailComponent={DetailComponent}
          spaceConfigSignal={spaceConfigSignal}
          entityType={entityType}
          selectedEntityId={selectedEntityId}
          selectedPartitionId={selectedPartitionId}
          selectedSlug={selectedSlug}
          tabSlug={tabSlug}
          editMode={editMode}
        />
      </SpaceShell>
    );
  }

  return (
    <Routes>
      {/* List view with drawer outlet */}
      <Route
        path="/"
        element={
          <SpaceShell
            shellKey={entityType}
            configSignal={spaceConfigSignal}
            useEntitiesHook={useEntitiesHook}
          />
        }
      >
        {/* Index route - render PublicPageTemplate in drawer even without entity selected
            This shows proper skeletons instead of white screen during space transitions */}
        <Route
          index
          element={
            <DetailComponent
              key={entityType}
              isDrawerMode={true}
              spaceConfigSignal={spaceConfigSignal}
              entityType={entityType}
            />
          }
        />

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

      </Route>

      {/* Edit page - fullscreen, outside drawer layout */}
      <Route
        path=":id/edit"
        element={
          <SpaceShell
            shellKey={`${entityType}-edit`}
            configSignal={spaceConfigSignal}
            useEntitiesHook={useEntitiesHook}
          >
            <EditPageTemplate
              spaceConfigSignal={spaceConfigSignal}
              entityType={entityType}
            />
          </SpaceShell>
        }
      />
    </Routes>
  );
}
