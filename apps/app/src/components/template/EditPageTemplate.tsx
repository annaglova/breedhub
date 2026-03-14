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
  const pendingNavigationRef = useRef<string | null>(null);

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
      window.history.back();
      sentinelPushedRef.current = false;
    }
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handler = () => {
      if (!hasUnsavedRef.current) return;

      window.history.pushState({ __unsavedGuard: true }, '');
      setShowLeaveDialog(true);
    };

    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // Intercept all internal link clicks when there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#')) return;

      // Internal link — prevent default and show dialog
      e.preventDefault();
      e.stopPropagation();
      pendingNavigationRef.current = href;
      setPendingNavigationUrl(href);
      setShowLeaveDialog(true);
    };

    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [hasUnsavedChanges]);

  /** Navigate to pending URL or go back (browser back button case) */
  const proceedNavigation = useCallback(() => {
    const url = pendingNavigationRef.current;
    if (url) {
      pendingNavigationRef.current = null;
      setPendingNavigationUrl(null);
      if (sentinelPushedRef.current) {
        window.history.back();
        sentinelPushedRef.current = false;
      }
      navigate(url);
    } else {
      sentinelPushedRef.current = false;
      window.history.go(-2);
    }
  }, [navigate]);

  const handleLeaveDiscard = useCallback(() => {
    setShowLeaveDialog(false);
    hasUnsavedRef.current = false;
    setHasUnsavedChanges(false);
    // Let the useEffect clean up sentinel, then navigate on next tick
    const url = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    setPendingNavigationUrl(null);
    if (url) {
      setTimeout(() => navigate(url), 0);
    } else {
      // Browser back — remove sentinel and go back
      sentinelPushedRef.current = false;
      window.history.go(-2);
    }
  }, [navigate]);

  const handleLeaveSave = useCallback(async () => {
    setShowLeaveDialog(false);
    // Capture navigation target before save clears state
    const url = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    setPendingNavigationUrl(null);
    // Prevent useEffect from doing history.back() when hasUnsavedChanges becomes false
    hasUnsavedRef.current = false;
    if (sentinelPushedRef.current) {
      sentinelPushedRef.current = false;
    }
    try {
      await saveHandlerRef.current?.();
    } catch {
      return;
    }
    setHasUnsavedChanges(false);
    if (url) {
      navigate(url);
    } else {
      window.history.back();
    }
  }, [navigate]);

  const handleLeaveCancel = useCallback(() => {
    setShowLeaveDialog(false);
    pendingNavigationRef.current = null;
    setPendingNavigationUrl(null);
  }, []);

  // Name link — intercept navigation when there are unsaved changes
  const handleNavigateAway = useCallback((url: string) => {
    if (hasUnsavedRef.current) {
      pendingNavigationRef.current = url;
      setPendingNavigationUrl(url);
      setShowLeaveDialog(true);
    } else {
      navigate(url);
    }
  }, [navigate]);

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
