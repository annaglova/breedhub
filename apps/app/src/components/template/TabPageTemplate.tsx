import { useMemo, useRef, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Pencil, Minimize2, Maximize2, Minus, Plus } from "lucide-react";
import { TabErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { NavigationButtons } from "@/components/template/cover/NavigationButtons";
import { NavigationButtonsSkeleton } from "@/components/template/cover/NavigationButtonsSkeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { Switch } from "@ui/components/switch";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { type FullscreenTab, useFullscreenTabs } from "@/hooks/useFullscreenTabs";
import { usePedigreeFullscreenControls } from "@/hooks/usePedigreeFullscreenControls";
import { SpaceProvider } from "@/contexts/SpaceContext";
import {
  AboveFoldLoadingProvider,
  useAllAboveFoldReady,
  useSkeletonWithDelay,
} from "@/contexts/AboveFoldLoadingContext";
import { useSpaceTemplateContext } from "@/hooks/useSpaceTemplateContext";
import { useStickyName } from "@/hooks/useStickyName";
import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
import { getTabsConfigFromPage } from "@/utils/tab-config";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { PageMenu, PageMenuSkeleton } from "@/components/tabs/PageMenu";
import { TabActionsHeader } from "@/components/tabs/TabActionsHeader";
import {
  PedigreeGenerationSelector,
} from "@/components/shared/pedigree";

/**
 * Renders children with a coordinated `isBlocksLoading` flag derived from
 * AboveFoldLoadingContext. Lets us read the context without restructuring
 * TabPageTemplate's existing hook ordering — used as a render-prop wrapper
 * inside <AboveFoldLoadingProvider>.
 *
 * The above-fold gate ONLY applies during the cold-load for a given entity
 * (first time blocks register and report ready). Once we've seen the gate
 * flip ready for this entity, further re-registrations from tab swaps
 * mustn't drag the header back into skeleton — the user has already seen
 * real content, so we keep `isBlocksLoading` at false until the entity id
 * actually changes (tracked via `entityId` reset key).
 */
function CoordinatedLoadingState({
  entityId,
  isEntityLoading,
  children,
}: {
  entityId: string;
  isEntityLoading: boolean;
  children: (isBlocksLoading: boolean) => React.ReactNode;
}) {
  const allBlocksReady = useAllAboveFoldReady();
  const isAboveFoldLoading = isEntityLoading || !allBlocksReady;
  const shouldShowSkeleton = useSkeletonWithDelay(isAboveFoldLoading);

  // Sticky "we've seen real content for this entity" flag. Resets only when
  // entityId changes so a new entity does its own cold-load coordination,
  // but tab swaps within the same entity don't re-skeleton the header.
  const [hasSeenReady, setHasSeenReady] = useState(false);
  useEffect(() => {
    setHasSeenReady(false);
  }, [entityId]);
  useEffect(() => {
    if (!isAboveFoldLoading && !isEntityLoading) {
      setHasSeenReady(true);
    }
  }, [isAboveFoldLoading, isEntityLoading]);

  const isBlocksLoading = isEntityLoading || (!hasSeenReady && shouldShowSkeleton);
  return <>{children(isBlocksLoading)}</>;
}

interface TabPageTemplateProps {
  entityType: string;
  entityId: string;
  entityPartitionId?: string; // Partition key for partitioned tables (e.g., breed_id for pet)
  entitySlug: string;
  tabSlug: string;
  className?: string;
  isDrawerMode?: boolean;
  isFullscreenMode?: boolean;
}

/**
 * TabPageTemplate - Single tab page with infinite scroll
 *
 * Used for URLs like /affenpinscher/achievements
 * Shows: Name header (sticky) + PageMenu (only fullscreen tabs) + Single tab content
 *
 * Layout:
 * ┌─────────────────────────────────────────────┐
 * │ ← Back    Affenpinscher                     │  ← Name (sticky)
 * ├─────────────────────────────────────────────┤
 * │ [Achievements] [Top Pets] [Top Kennels]     │  ← PageMenu
 * ├─────────────────────────────────────────────┤
 * │   Tab Content (single tab, infinite scroll) │
 * └─────────────────────────────────────────────┘
 */
export function TabPageTemplate({
  entityType,
  entityId,
  entityPartitionId,
  entitySlug,
  tabSlug,
  className,
  isDrawerMode = false,
  isFullscreenMode = true,
}: TabPageTemplateProps) {
  useSignals();
  const navigate = useNavigate();

  // Refs for sticky behavior and scroll button positioning
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Get spaceConfig signal
  const spaceConfigSignal = useMemo(
    () => spaceStore.getSpaceConfigSignal(entityType),
    [entityType]
  );
  const {
    pageConfig,
    selectedEntity,
    selectedEntitySignal,
    spaceConfig,
    spacePermissions,
  } = useSpaceTemplateContext({
    spaceConfigSignal,
    entityType,
  });

  // Ensure correct entity is selected based on URL entityId
  // If selectedEntity is different from entityId, fetch and select the correct one
  useEffect(() => {
    if (entityId && selectedEntity?.id !== entityId) {
      console.log('[TabPageTemplate] Entity mismatch, fetching correct entity:', {
        currentId: selectedEntity?.id,
        expectedId: entityId,
        partitionId: entityPartitionId
      });
      spaceStore.fetchAndSelectEntity(entityType, entityId, entityPartitionId);
    }
  }, [entityType, entityId, entityPartitionId, selectedEntity?.id]);

  // Get tabs config from page config
  const tabsConfig = useMemo(() => {
    return getTabsConfigFromPage(pageConfig);
  }, [pageConfig]);
  const {
    activeTabSlug,
    countsLoading,
    currentTab,
    fullscreenTabs,
    handleTabChange,
  } = useFullscreenTabs({
    entityId,
    entitySlug,
    tabSlug,
    tabsConfig,
  });
  const {
    canZoomIn,
    canZoomOut,
    handleGenerationsChange,
    handleLinkToPedigreeChange,
    handleZoomIn,
    handleZoomOut,
    isPedigreeCollapsed,
    isPedigreeFocusMode,
    linkToPedigree,
    pedigreeGenerations,
    pedigreeZoom,
    setIsPedigreeCollapsed,
  } = usePedigreeFullscreenControls({
    focusModeEnabled: currentTab?.focusMode,
  });
  const { nameContainerRef, nameOnTop, nameBlockHeight } = useStickyName({
    deps: [pageConfig, selectedEntity, currentTab],
    scrollContainerRef,
    threshold: 1,
  });

  // Handle back navigation
  const handleBack = () => {
    // Navigate to entity page with tab hash
    navigate(`/${entitySlug}#${tabSlug}`);
  };

  // PageMenu top position (under Name when sticky)
  // In collapsed mode: compact bar (40px), no PageMenu
  const COMPACT_BAR_HEIGHT = 45;
  const PAGE_MENU_TOP = isPedigreeFocusMode
    ? COMPACT_BAR_HEIGHT
    : (nameBlockHeight > 0 ? nameBlockHeight : 0);

  // Loading state - return null for instant transition (no spinner flash)
  if (!spaceConfig || !pageConfig) {
    return null;
  }

  // Entity may still be loading (cold cache, fresh device, slug→id resolution).
  // Render the page in skeleton state instead of blanking — matches how
  // EditPageTemplate behaves so cold-load looks identical between view and edit.
  const isEntityLoading = !selectedEntity || selectedEntity.id !== entityId;

  // Tab not found
  if (!currentTab) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-4 text-slate-300">404</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Tab Not Found</h1>
          <p className="text-slate-600 mb-6">
            Tab "{tabSlug}" doesn't exist or is not available in fullscreen mode.
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to {entitySlug}
          </button>
        </div>
      </div>
    );
  }

  // Get Name block config
  const nameBlockConfig = Object.values(pageConfig.blocks || {}).find(
    (block: any) => block.outlet === 'NameOutlet'
  ) as any;

  // Get tab component
  const TabComponent = currentTab.component as FullscreenTab["component"];

  return (
    <SpaceProvider
      spaceConfigSignal={spaceConfigSignal}
      selectedEntitySignal={selectedEntitySignal}
    >
     <AboveFoldLoadingProvider>
      <CoordinatedLoadingState entityId={entityId} isEntityLoading={isEntityLoading}>
       {(isBlocksLoading) => (
      <div
        className={cn(
          "size-full flex flex-col content-padding",
          className
        )}
      >
        {/* Scrollable content container */}
        <div
          ref={scrollContainerRef}
          className="flex flex-auto flex-col items-center overflow-auto"
        >
          <div
            ref={contentContainerRef}
            className="w-full"
          >
            {/* Compact name bar - shown when pedigree focus mode is active.
                During cold-load the name link is replaced by a single skel
                pulse so the compact header flips together with PageMenu /
                tab body (the regular sticky NameOutlet is hidden in this
                mode, so it can't act as the header skeleton). */}
            {isPedigreeFocusMode && (
              <div className="sticky top-0 z-30 relative bg-card-ground border-b border-surface-border pb-2">
                <div className="truncate text-2xl sm:text-3xl font-bold pr-24">
                  {isBlocksLoading ? (
                    /* Match the public NameOutlet name-row skeleton:
                       30px tall outer with `h-6 w-72 max-w-full` inner bar.
                       Keeps the sticky header height consistent across modes. */
                    <div
                      className="h-[30px] mb-1 flex items-center"
                      aria-hidden="true"
                    >
                      <div className="h-6 w-72 max-w-full bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                    </div>
                  ) : (
                    <Link
                      to={`/${entitySlug}`}
                      className="text-foreground hover:text-primary"
                    >
                      {selectedEntity?.name}
                    </Link>
                  )}
                </div>
                <div className="absolute right-0 top-0">
                  {isBlocksLoading ? (
                    <NavigationButtonsSkeleton mode="default" />
                  ) : (
                    <NavigationButtons mode="default" entityType={entityType} />
                  )}
                </div>
              </div>
            )}

            {/* Name Block - Sticky at top (hidden in pedigree focus mode) */}
            {nameBlockConfig && (
              <div
                ref={nameContainerRef}
                className={cn("sticky top-0 z-30", isPedigreeFocusMode && "hidden")}
              >
                <BlockRenderer
                  blockConfig={{
                    ...nameBlockConfig,
                    onTop: nameOnTop,
                    // In tab fullscreen mode, name links to page fullscreen (not self)
                    linkToFullscreen: true,
                    // Always show navigation buttons (no cover in tab fullscreen)
                    alwaysShowNavigation: true,
                    entityType,
                  }}
                  entity={selectedEntity}
                  pageConfig={pageConfig}
                  spacePermissions={spacePermissions}
                  isLoading={isBlocksLoading}
                />
              </div>
            )}

            {/* PageMenu + TabActionsHeader - Sticky under Name */}
            <div
              className="sticky z-20 -mt-px"
              style={{ top: `${PAGE_MENU_TOP}px` }}
            >
              {/* PageMenu - hidden in pedigree focus mode */}
              {!isPedigreeFocusMode && (
                (countsLoading || isBlocksLoading) ? (
                  <PageMenuSkeleton
                    tabCount={
                      // Match the eventual pill count by filtering tabsConfig
                      // for fullscreen-enabled tabs. Fall back to fullscreenTabs
                      // length if it's already populated, then to a sane 3.
                      fullscreenTabs.length ||
                      Object.values(tabsConfig).filter(
                        (t: any) => t?.fullscreenButton,
                      ).length ||
                      3
                    }
                  />
                ) : (
                  <PageMenu
                    tabs={fullscreenTabs}
                    activeTab={activeTabSlug}
                    onTabChange={handleTabChange}
                    mode="tabs"
                  />
                )
              )}

              {/* TabActionsHeader - Renders actions based on tab's actionType */}
              <TabActionsHeader
                left={
                  currentTab.actionTypes?.includes("pedigreeGenerations") ? (
                    <div className="flex items-center gap-4">
                      <PedigreeGenerationSelector
                        generations={pedigreeGenerations}
                        onGenerationsChange={handleGenerationsChange}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Switch variant="secondary-sm" checked={linkToPedigree} onCheckedChange={handleLinkToPedigreeChange} />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>{linkToPedigree ? "Navigate to pet" : "Navigate to pedigree"}</TooltipContent>
                      </Tooltip>
                    </div>
                  ) : undefined
                }
                right={
                  currentTab.actionTypes?.includes("edit") ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/${entitySlug}/edit#${activeTabSlug}`)}
                      className="flex items-center text-lg font-semibold text-sub-header-color hover:text-foreground/70 transition-colors focus:outline-none focus-visible:outline-none"
                    >
                      <Pencil className="mr-2 h-5 w-5" />
                      Edit
                    </button>
                  ) : (currentTab.zoomControl || currentTab.focusMode) ? (
                    <div className="flex items-center gap-0">
                      {/* Zoom controls */}
                      {currentTab.zoomControl && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={handleZoomOut}
                                disabled={!canZoomOut}
                                className="flex items-center justify-center h-8 w-8 text-sub-header-color hover:text-foreground/70 transition-colors focus:outline-none focus-visible:outline-none disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <Minus size={16} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Zoom out</TooltipContent>
                          </Tooltip>
                          <span className="text-[16px] font-semibold text-sub-header-color tabular-nums w-10 text-center select-none">
                            {pedigreeZoom}%
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={handleZoomIn}
                                disabled={!canZoomIn}
                                className="flex items-center justify-center h-8 w-8 text-sub-header-color hover:text-foreground/70 transition-colors focus:outline-none focus-visible:outline-none disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <Plus size={16} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Zoom in</TooltipContent>
                          </Tooltip>
                        </>
                      )}

                      {/* Collapse/expand button */}
                      {currentTab.focusMode && (
                        <>
                          {currentTab.zoomControl && <div className="ml-4" />}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => setIsPedigreeCollapsed(v => !v)}
                                className="flex items-center justify-center h-8 w-8 text-sub-header-color hover:text-foreground/70 transition-colors focus:outline-none focus-visible:outline-none"
                              >
                                {isPedigreeCollapsed ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              {isPedigreeCollapsed ? "Expand header" : "Collapse header"}
                            </TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  ) : undefined
                }
              />
            </div>

            {/* Tab Content */}
            <div
              className={cn(
                "pt-6 pb-8 mx-auto w-full",
                // Pedigree tab gets full width, others are constrained
                activeTabSlug !== "pedigree" && "max-w-5xl lg:max-w-6xl xxl:max-w-7xl"
              )}
            >
              <TabErrorBoundary
                contextLabel={currentTab.label}
                resetKeys={[entityId, activeTabSlug]}
              >
                <TabComponent
                  entity={selectedEntity}
                  mode="fullscreen"
                  dataSource={currentTab.dataSource}
                  pedigreeGenerations={pedigreeGenerations}
                  onPedigreeGenerationsChange={handleGenerationsChange}
                  pedigreeZoom={pedigreeZoom}
                  stickyScrollbarTop={isPedigreeFocusMode ? (COMPACT_BAR_HEIGHT + 52) : (PAGE_MENU_TOP + 102)}
                  linkToPedigree={linkToPedigree}
                  isLoading={isBlocksLoading}
                />
              </TabErrorBoundary>
            </div>
          </div>
        </div>

        {/* Scroll to top button */}
        <ScrollToTopButton
          scrollContainer={scrollContainerRef.current}
          contentContainer={contentContainerRef.current}
        />
      </div>
       )}
      </CoordinatedLoadingState>
     </AboveFoldLoadingProvider>
    </SpaceProvider>
  );
}
