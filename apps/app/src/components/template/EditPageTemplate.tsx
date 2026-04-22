import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import {
  AboveFoldLoadingProvider,
  useAllAboveFoldReady,
  useSkeletonWithDelay,
} from "@/contexts/AboveFoldLoadingContext";
import { SpaceProvider } from "@/contexts/SpaceContext";
import { useEntityFullyLoaded } from "@/hooks/useEntityFullyLoaded";
import { type SaveResult, useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useSpaceTemplateContext } from "@/hooks/useSpaceTemplateContext";
import {
  getTabsConfigFromPage,
  isPreferredDefaultTabFragment,
} from "@/utils/tab-config";
import { generateSlug } from "@breedhub/rxdb-store";
import { Signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { Button } from "@ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@ui/components/dialog";
import { cn } from "@ui/lib/utils";
import { useStickyName } from "@/hooks/useStickyName";
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EditNameOutlet } from "./EditNameOutlet";
import type { BlockConfig, PageConfig } from "@/types/page-config.types";

interface EditPageTemplateProps {
  className?: string;
  spaceConfigSignal?: Signal<any>;
  entityType?: string;
  isCreateMode?: boolean;
}

/**
 * Props for EditBlocks inner component
 */
interface EditBlocksProps {
  pageConfig: PageConfig;
  selectedEntity: any;
  spacePermissions: any;
  entityType?: string;
  isEntityFullyLoaded: boolean;
  isCreateMode?: boolean;
}

/**
 * EditBlocks - Renders edit page blocks (Cover + Avatar) with coordinated loading
 */
function EditBlocks({
  pageConfig,
  selectedEntity,
  spacePermissions,
  entityType,
  isEntityFullyLoaded,
  isCreateMode,
}: EditBlocksProps) {
  const allBlocksReady = useAllAboveFoldReady();
  const isAboveFoldLoading = !isCreateMode && (!isEntityFullyLoaded || !allBlocksReady);
  const shouldShowSkeleton = useSkeletonWithDelay(isAboveFoldLoading);
  const isBlocksLoading = isCreateMode ? false : (!selectedEntity || shouldShowSkeleton);

  // Compact mode: hide Cover/Avatar when non-default tab is active
  // On mount: check URL hash to determine initial state (avoids page skeleton flash for non-default tabs)
  const [isDefaultTabActive, setIsDefaultTabActive] = useState(() => {
    const hash = window.location.hash.slice(1);
    return isPreferredDefaultTabFragment(getTabsConfigFromPage(pageConfig), hash);
  });

  // Create mode: track name from form for header display
  const [createModeName, setCreateModeName] = useState("");

  // Sticky name bar
  const { nameContainerRef, nameOnTop, nameBlockHeight } = useStickyName({
    deps: [pageConfig, selectedEntity, isDefaultTabActive],
  });
  const PAGE_MENU_TOP = nameBlockHeight > 0 ? nameBlockHeight : 0;

  const navigate = useNavigate();

  // Save orchestration: active tab registers its save handler.
  // Returns: false (validation failed) | true (saved) | { created: entity } (create succeeded)
  const saveHandlerRef = useRef<(() => Promise<SaveResult | void>) | null>(null);

  const onSaveReady = useCallback((handler: () => Promise<SaveResult | void>) => {
    saveHandlerRef.current = handler;
  }, []);

  // Save button click — navigates to public page after create
  const handleSave = useCallback(async () => {
    const result = await saveHandlerRef.current?.();
    if (result && typeof result === 'object' && result.created) {
      const entity = result.created;
      const slug = entity.slug || (entity.name && entity.id ? generateSlug(entity.name, entity.id) : '');
      if (slug) {
        navigate(`/${slug}`, { replace: true });
      }
    }
  }, [navigate]);
  const {
    handleBeforeTabChange,
    handleLeaveCancel,
    handleLeaveDiscard,
    handleLeaveSave,
    handleNavigateAway,
    hasUnsavedChanges,
    onDirtyChange,
    setShowLeaveDialog,
    showLeaveDialog,
  } = useUnsavedChangesGuard({
    isCreateMode,
    navigate,
    saveHandlerRef,
  });


  // Sort blocks by order
  const sortedBlocks = Object.entries(pageConfig.blocks).sort(
    ([, a], [, b]) => (a.order || 0) - (b.order || 0)
  );

  return (
    <>
      {sortedBlocks.map(([blockId, blockConfig]: [string, BlockConfig]) => {
        if (blockConfig.outlet === "CoverOutlet") {
          if (!isDefaultTabActive || isCreateMode) return null;
          return (
            <BlockRenderer
              key={blockId}
              blockConfig={{
                ...blockConfig,
                isDrawerMode: false,
                entityType,
              }}
              entity={selectedEntity}
              pageConfig={pageConfig}
              spacePermissions={spacePermissions}
              isLoading={isBlocksLoading}
            />
          );
        }

        if (blockConfig.outlet === "AvatarOutlet") {
          if (!isDefaultTabActive || isCreateMode) return null;
          return (
            <BlockRenderer
              key={blockId}
              blockConfig={{
                ...blockConfig,
                isFullscreenMode: true,
                entityType,
                onSave: handleSave,
              }}
              entity={selectedEntity}
              pageConfig={pageConfig}
              spacePermissions={spacePermissions}
              isLoading={isBlocksLoading}
            />
          );
        }

        if (blockConfig.outlet === "NameOutlet") {
          return (
            <div
              key={blockId}
              ref={nameContainerRef}
              className="sticky top-0 z-30"
            >
              <EditNameOutlet
                entity={selectedEntity}
                onTop={nameOnTop || !isDefaultTabActive}
                isLoading={isBlocksLoading}
                onSave={handleSave}
                hasUnsavedChanges={hasUnsavedChanges}
                pageConfig={pageConfig}
                spacePermissions={spacePermissions}
                entityType={entityType}
                onNavigateAway={handleNavigateAway}
                showActionButtons={isDefaultTabActive}
                isCreateMode={isCreateMode}
                createModeName={createModeName}
              />
            </div>
          );
        }

        if (blockConfig.outlet === "TabOutlet") {
          return (
            <BlockRenderer
              key={blockId}
              blockConfig={{
                ...blockConfig,
                tabMode: "tabs",
                pageMenuTop: PAGE_MENU_TOP,
                onSaveReady,
                entityType,
                onDirtyChange,
                onBeforeTabChange: handleBeforeTabChange,
                onDefaultTabChange: setIsDefaultTabActive,
                isCreateMode,
                onCreateNameChange: isCreateMode ? setCreateModeName : undefined,
              }}
              entity={selectedEntity}
              pageConfig={pageConfig}
              spacePermissions={spacePermissions}
              isLoading={isBlocksLoading}
            />
          );
        }

        return null;
      })}

      {/* Unsaved changes confirmation dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
          </DialogHeader>

          <div>
            <div className="modal-card">
              <p className="text-base">
                You have unsaved changes. What would you like to do?
              </p>
            </div>

            <div className="modal-actions grid-cols-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleLeaveCancel}
              className="small-button bg-secondary-100 hover:bg-secondary-200 focus-visible:bg-secondary-200 text-slate-800 dark:text-zinc-900 dark:bg-surface-400 dark:hover:bg-surface-300"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleLeaveDiscard}
              className="small-button bg-red-100 hover:bg-red-200 focus-visible:bg-red-300 text-red-700 dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-200"
            >
              Discard
            </Button>
            <Button
              type="button"
              onClick={handleLeaveSave}
              className="small-button bg-primary-50 dark:bg-primary-300 hover:bg-primary-100 focus-visible:bg-primary-200 dark:hover:bg-primary-300 dark:focus-visible:bg-primary-200 text-primary dark:text-zinc-900"
            >
              Save
            </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * EditPageTemplate - Edit page with Cover + Avatar outlets
 *
 * Fullscreen-only (no drawer mode).
 * Uses pageType: 'edit' from space config to get edit-specific page config.
 */
export function EditPageTemplate({
  className,
  spaceConfigSignal,
  entityType,
  isCreateMode,
}: EditPageTemplateProps) {
  useSignals();

  const {
    pageConfig,
    selectedEntity,
    selectedEntitySignal,
    spacePermissions,
  } = useSpaceTemplateContext({
    spaceConfigSignal,
    entityType,
    pageType: "edit",
  });

  const isEntityFullyLoaded = useEntityFullyLoaded(entityType, selectedEntity);

  return spaceConfigSignal ? (
    <SpaceProvider
      spaceConfigSignal={spaceConfigSignal}
      selectedEntitySignal={selectedEntitySignal}
    >
      <div
        className={cn(
          "size-full flex flex-col content-padding-sm",
          "bg-white dark:bg-slate-900",
          className
        )}
      >
        <div className="flex flex-auto flex-col items-center overflow-auto">
          <div className="w-full max-w-3xl lg:max-w-4xl xxl:max-w-5xl">
            {!pageConfig && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                <p className="text-red-700 font-semibold">
                  Edit page configuration not found
                </p>
                <p className="text-red-600 text-sm mt-1">
                  No edit page configured for this space (pageType: &quot;edit&quot;)
                </p>
              </div>
            )}

            {pageConfig && pageConfig.blocks && (
              <AboveFoldLoadingProvider>
                <EditBlocks
                  pageConfig={pageConfig}
                  selectedEntity={selectedEntity}
                  spacePermissions={spacePermissions}
                  entityType={entityType}
                  isEntityFullyLoaded={isEntityFullyLoaded}
                  isCreateMode={isCreateMode}
                />
              </AboveFoldLoadingProvider>
            )}
          </div>
        </div>
      </div>
    </SpaceProvider>
  ) : (
    <div className="p-8 text-center">
      <p className="text-red-600">Space configuration signal is required</p>
    </div>
  );
}
