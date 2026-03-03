import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import {
  AboveFoldLoadingProvider,
  useAllAboveFoldReady,
  useSkeletonWithDelay,
} from "@/contexts/AboveFoldLoadingContext";
import { SpaceProvider } from "@/contexts/SpaceContext";
import { useEntityFullyLoaded } from "@/hooks/useEntityFullyLoaded";
import { getPageConfig } from "@/utils/getPageConfig";
import { spaceStore } from "@breedhub/rxdb-store";
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
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EditNameOutlet } from "./EditNameOutlet";

interface EditPageTemplateProps {
  className?: string;
  spaceConfigSignal?: Signal<any>;
  entityType?: string;
}

/**
 * Props for EditBlocks inner component
 */
interface EditBlocksProps {
  pageConfig: any;
  selectedEntity: any;
  spacePermissions: any;
  entityType?: string;
  isEntityFullyLoaded: boolean;
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
}: EditBlocksProps) {
  const allBlocksReady = useAllAboveFoldReady();
  const isAboveFoldLoading = !isEntityFullyLoaded || !allBlocksReady;
  const shouldShowSkeleton = useSkeletonWithDelay(isAboveFoldLoading);
  const isBlocksLoading = !selectedEntity || shouldShowSkeleton;

  // Compact mode: hide Cover/Avatar when non-default tab is active
  const [isDefaultTabActive, setIsDefaultTabActive] = useState(true);

  // Sticky name bar state
  const nameContainerRef = useRef<HTMLDivElement>(null);
  const [nameOnTop, setNameOnTop] = useState(false);
  const [nameBlockHeight, setNameBlockHeight] = useState(0);

  const PAGE_MENU_TOP = nameBlockHeight > 0 ? nameBlockHeight : 0;

  // Scroll listener for sticky detection
  useEffect(() => {
    if (!nameContainerRef.current) return;

    let scrollContainer: HTMLElement | null =
      nameContainerRef.current.parentElement;
    while (scrollContainer) {
      const overflowY = window.getComputedStyle(scrollContainer).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") {
        break;
      }
      scrollContainer = scrollContainer.parentElement;
    }

    if (!scrollContainer) return;

    const checkSticky = () => {
      if (!nameContainerRef.current) return;

      const containerTop = scrollContainer!.getBoundingClientRect().top;
      const elementTop = nameContainerRef.current.getBoundingClientRect().top;

      const isStuck = Math.abs(containerTop - elementTop) === 0;
      setNameOnTop(isStuck);
    };

    scrollContainer.addEventListener("scroll", checkSticky);
    // Use RAF to ensure DOM layout is settled after cover/avatar appear/disappear
    requestAnimationFrame(checkSticky);

    return () => {
      scrollContainer?.removeEventListener("scroll", checkSticky);
    };
  }, [pageConfig, selectedEntity, isDefaultTabActive]);

  // ResizeObserver for name bar height tracking
  useEffect(() => {
    if (!nameContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setNameBlockHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(nameContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Save orchestration: active tab registers its save handler
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);

  const onSaveReady = useCallback((handler: () => Promise<void>) => {
    saveHandlerRef.current = handler;
  }, []);

  const handleSave = useCallback(() => {
    saveHandlerRef.current?.();
  }, []);

  const navigate = useNavigate();

  // --- Unsaved changes guard ---
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const hasUnsavedRef = useRef(false);
  const sentinelPushedRef = useRef(false);
  const [pendingNavigationUrl, setPendingNavigationUrl] = useState<string | null>(null);

  const onDirtyChange = useCallback((dirty: boolean) => {
    setHasUnsavedChanges(dirty);
    hasUnsavedRef.current = dirty;
  }, []);

  // beforeunload — browser close/refresh
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  // popstate + pushState sentinel — browser back/forward
  useEffect(() => {
    if (hasUnsavedChanges && !sentinelPushedRef.current) {
      window.history.pushState({ __unsavedGuard: true }, '');
      sentinelPushedRef.current = true;
    }

    if (!hasUnsavedChanges && sentinelPushedRef.current) {
      // Changes were saved/discarded — remove sentinel
      window.history.back();
      sentinelPushedRef.current = false;
    }
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      if (!hasUnsavedRef.current) return;

      // User pressed back — push sentinel back and show dialog
      window.history.pushState({ __unsavedGuard: true }, '');
      setShowLeaveDialog(true);
    };

    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const handleLeaveDiscard = useCallback(() => {
    setShowLeaveDialog(false);
    hasUnsavedRef.current = false;

    if (pendingNavigationUrl) {
      // Name link navigation — remove sentinel and navigate
      if (sentinelPushedRef.current) {
        window.history.back();
        sentinelPushedRef.current = false;
      }
      const url = pendingNavigationUrl;
      setPendingNavigationUrl(null);
      navigate(url);
    } else {
      // Back button navigation
      sentinelPushedRef.current = false;
      window.history.go(-2);
    }
  }, [pendingNavigationUrl, navigate]);

  const handleLeaveSave = useCallback(async () => {
    setShowLeaveDialog(false);
    try {
      await saveHandlerRef.current?.();
    } catch {
      // Save failed — stay on page
      setPendingNavigationUrl(null);
      return;
    }
    hasUnsavedRef.current = false;

    if (pendingNavigationUrl) {
      // Name link navigation — remove sentinel and navigate
      if (sentinelPushedRef.current) {
        window.history.back();
        sentinelPushedRef.current = false;
      }
      const url = pendingNavigationUrl;
      setPendingNavigationUrl(null);
      navigate(url);
    } else {
      // Back button navigation
      sentinelPushedRef.current = false;
      window.history.go(-2);
    }
  }, [pendingNavigationUrl, navigate]);

  const handleLeaveCancel = useCallback(() => {
    setShowLeaveDialog(false);
    setPendingNavigationUrl(null);
  }, []);

  // Name link — intercept navigation when there are unsaved changes
  const handleNavigateAway = useCallback((url: string) => {
    setPendingNavigationUrl(url);
    setShowLeaveDialog(true);
  }, []);

  // Tab switch — auto-save before changing tab
  const handleBeforeTabChange = useCallback(async () => {
    if (hasUnsavedRef.current && saveHandlerRef.current) {
      await saveHandlerRef.current();
    }
  }, []);


  // Sort blocks by order
  const sortedBlocks = Object.entries(pageConfig.blocks).sort(
    ([, a]: [string, any], [, b]: [string, any]) => (a.order || 0) - (b.order || 0)
  );

  return (
    <>
      {sortedBlocks.map(([blockId, blockConfig]: [string, any]) => {
        if (blockConfig.outlet === "CoverOutlet") {
          if (!isDefaultTabActive) return null;
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
          if (!isDefaultTabActive) return null;
          return (
            <BlockRenderer
              key={blockId}
              blockConfig={{
                ...blockConfig,
                isFullscreenMode: true,
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
              className="small-button bg-pink-50 hover:bg-pink-100 focus-visible:bg-pink-200 dark:bg-pink-300 dark:hover:bg-pink-200 dark:focus-visible:bg-pink-100 text-pink-600 dark:text-zinc-900"
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
}: EditPageTemplateProps) {
  useSignals();

  const spaceConfig = spaceConfigSignal?.value;

  // Get edit page config specifically
  const pageConfig = getPageConfig(spaceConfig, { pageType: 'edit' });

  const spacePermissions = {
    canEdit: spaceConfig?.canEdit ?? false,
    canDelete: spaceConfig?.canDelete ?? false,
    canAdd: spaceConfig?.canAdd ?? false,
  };

  const selectedEntitySignal = entityType
    ? spaceStore.getSelectedEntity(entityType)
    : null;
  const selectedEntity = selectedEntitySignal?.value;

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
