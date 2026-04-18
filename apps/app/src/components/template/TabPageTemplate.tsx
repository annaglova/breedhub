import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Pencil, Minimize2, Maximize2, Minus, Plus } from "lucide-react";
import { NavigationButtons } from "@/components/template/cover/NavigationButtons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { Switch } from "@ui/components/switch";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { SpaceProvider } from "@/contexts/SpaceContext";
import { useSpaceTemplateContext } from "@/hooks/useSpaceTemplateContext";
import { useStickyName } from "@/hooks/useStickyName";
import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
import {
  getTabFragment,
  getTabLabel,
  getTabsConfigFromPage,
  type TabConfig,
} from "@/utils/tab-config";
import { spaceStore, tabDataService } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { Tab } from "@/components/tabs/TabsContainer";
import { PageMenu, PageMenuSkeleton } from "@/components/tabs/PageMenu";
import { TabActionsHeader } from "@/components/tabs/TabActionsHeader";
import {
  PedigreeGenerationSelector,
  type GenerationCount,
} from "@/components/shared/pedigree";
import { mediaQueries } from "@/config/breakpoints";

// Shared tab component registry (auto-discovers all *Tab.tsx components)
import { TAB_COMPONENT_REGISTRY } from '../shared/tab-registry';

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
 * Determine if tab should be shown in fullscreen PageMenu
 * Simple local-first logic:
 * - expandAlways: true → always show (e.g., Pedigree tab)
 * - Otherwise → show if RxDB has any data (loadedCount > 0)
 */
function shouldShowInFullscreenMenu(
  fullscreenButton: boolean | undefined,
  expandAlways: boolean | undefined,
  loadedCount: number | undefined
): boolean {
  if (!fullscreenButton) return false;
  if (expandAlways) return true;
  return (loadedCount ?? 0) > 0;
}

/**
 * Convert tab config object to Tab[] array
 * Only includes tabs that should be shown in fullscreen mode
 * (expandAlways: true OR loadedCount > 0)
 */
function convertFullscreenTabsToArray(
  tabsConfig: Record<string, TabConfig>,
  loadedCounts: Record<string, number>
): Tab[] {
  const tabs: Tab[] = [];

  for (const [tabId, config] of Object.entries(tabsConfig)) {
    // Check if tab should be shown (expandAlways OR has data)
    const shouldShow = shouldShowInFullscreenMenu(
      config.fullscreenButton,
      config.expandAlways,
      loadedCounts[tabId]
    );
    if (!shouldShow) continue;

    const Component = TAB_COMPONENT_REGISTRY[config.component];
    if (!Component) {
      console.warn(`[TabPageTemplate] Component "${config.component}" not found in registry`);
      continue;
    }

    const label = getTabLabel(config.component, config.label);
    const fragment = getTabFragment(tabId, config);

    tabs.push({
      id: tabId,
      fragment,
      label,
      icon: config.icon || { name: 'Circle', source: 'lucide' },
      component: Component,
      badge: config.badge,
      fullscreenButton: config.fullscreenButton,
      expandAlways: config.expandAlways,
      dataSource: config.dataSource,
      actionTypes: config.actionTypes,
      focusMode: config.focusMode,
      zoomControl: config.zoomControl,
      _order: config.order,
    } as Tab & { _order: number });
  }

  return tabs.sort((a: any, b: any) => a._order - b._order);
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

  // Pedigree generations state - persisted in sessionStorage for navigation
  const PEDIGREE_GENERATIONS_KEY = "pedigree-generations";
  const [pedigreeGenerations, setPedigreeGenerations] = useState<GenerationCount>(() => {
    const saved = sessionStorage.getItem(PEDIGREE_GENERATIONS_KEY);
    if (saved) return Number(saved) as GenerationCount;
    return window.matchMedia(mediaQueries['2xl']).matches ? 5 : 4;
  });
  const handleGenerationsChange = useCallback((count: GenerationCount) => {
    setPedigreeGenerations(count);
    sessionStorage.setItem(PEDIGREE_GENERATIONS_KEY, String(count));
  }, []);

  // Pedigree focus mode - collapse header and tabs to maximize tree space
  const [isPedigreeCollapsed, setIsPedigreeCollapsed] = useState(true);

  // Pedigree navigation mode - when ON, pet links go to /pet-slug/pedigree
  // Persisted in sessionStorage so it survives navigation between pedigrees
  const LINK_TO_PEDIGREE_KEY = "pedigree-link-mode";
  const [linkToPedigree, setLinkToPedigree] = useState(
    () => sessionStorage.getItem(LINK_TO_PEDIGREE_KEY) === "1"
  );
  const handleLinkToPedigreeChange = useCallback((checked: boolean) => {
    setLinkToPedigree(checked);
    if (checked) {
      sessionStorage.setItem(LINK_TO_PEDIGREE_KEY, "1");
    } else {
      sessionStorage.removeItem(LINK_TO_PEDIGREE_KEY);
    }
  }, []);

  // Pedigree zoom control - persisted in sessionStorage for navigation
  const PEDIGREE_ZOOM_KEY = "pedigree-zoom";
  const ZOOM_PRESETS = [80, 90, 100] as const;
  const [pedigreeZoom, setPedigreeZoom] = useState(() => {
    const saved = sessionStorage.getItem(PEDIGREE_ZOOM_KEY);
    if (saved) return Number(saved);
    return 100;
  });
  const zoomIndex = ZOOM_PRESETS.indexOf(pedigreeZoom as typeof ZOOM_PRESETS[number]);
  const canZoomOut = zoomIndex > 0;
  const canZoomIn = zoomIndex < ZOOM_PRESETS.length - 1;
  const handleZoomOut = () => { if (canZoomOut) { const z = ZOOM_PRESETS[zoomIndex - 1]; setPedigreeZoom(z); sessionStorage.setItem(PEDIGREE_ZOOM_KEY, String(z)); } };
  const handleZoomIn = () => { if (canZoomIn) { const z = ZOOM_PRESETS[zoomIndex + 1]; setPedigreeZoom(z); sessionStorage.setItem(PEDIGREE_ZOOM_KEY, String(z)); } };

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

  // State for loaded counts - fetched directly for fullscreen page
  const [loadedCounts, setLoadedCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState(true);

  // Load counts for all fullscreen-enabled tabs
  // This runs on direct fullscreen URL navigation (no sessionStorage data)
  useEffect(() => {
    const loadTabCounts = async () => {
      if (!entityId || !tabsConfig || Object.keys(tabsConfig).length === 0) {
        setCountsLoading(false);
        return;
      }

      // First try to get from spaceStore (if coming from main page)
      const storedCounts = spaceStore.getTabLoadedCounts(entityId);
      if (Object.keys(storedCounts).length > 0) {
        setLoadedCounts(storedCounts);
        setCountsLoading(false);
        return;
      }

      // Otherwise, load data for each fullscreen-enabled tab
      const counts: Record<string, number> = {};

      for (const [tabId, config] of Object.entries(tabsConfig) as Array<[string, TabConfig]>) {
        if (!config.fullscreenButton || !config.dataSource) continue;

        try {
          const records = await tabDataService.loadTabData(entityId, config.dataSource);
          counts[tabId] = records.length;
          // Also save to spaceStore for consistency
          spaceStore.setTabLoadedCount(entityId, tabId, records.length);
        } catch (error) {
          console.error(`[TabPageTemplate] Error loading tab ${tabId}:`, error);
          counts[tabId] = 0;
        }
      }

      setLoadedCounts(counts);
      setCountsLoading(false);
    };

    loadTabCounts();
  }, [entityId, tabsConfig]);

  // Get only fullscreen-enabled tabs with sufficient records
  const fullscreenTabs = useMemo(
    () => convertFullscreenTabsToArray(tabsConfig, loadedCounts),
    [tabsConfig, loadedCounts]
  );

  // Local state for active tab to prevent flickering on tab change
  const [activeTabSlug, setActiveTabSlug] = useState(tabSlug);

  // Sync with URL when tabSlug prop changes (e.g., direct URL navigation)
  useEffect(() => {
    if (tabSlug !== activeTabSlug) {
      setActiveTabSlug(tabSlug);
    }
  }, [tabSlug]);

  // Find current tab using local state
  const currentTab = useMemo(
    () => fullscreenTabs.find(tab => tab.fragment === activeTabSlug),
    [fullscreenTabs, activeTabSlug]
  );

  // Only allow collapse on pedigree tab
  const isPedigreeFocusMode = isPedigreeCollapsed && currentTab?.focusMode;
  const { nameContainerRef, nameOnTop, nameBlockHeight } = useStickyName({
    deps: [pageConfig, selectedEntity, currentTab],
    scrollContainerRef,
    threshold: 1,
  });

  // Handle tab change - update local state immediately, then update URL
  const handleTabChange = (fragment: string) => {
    // Update local state immediately (no flickering)
    setActiveTabSlug(fragment);
    // Update URL without triggering React Router re-render
    // Using history.replaceState to update URL without navigation
    window.history.replaceState(null, '', `/${entitySlug}/${fragment}`);
  };

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

  // Entity not loaded or wrong entity selected - return null for instant transition
  if (!selectedEntity || selectedEntity.id !== entityId) {
    return null;
  }

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
  const TabComponent = currentTab.component;

  return (
    <SpaceProvider
      spaceConfigSignal={spaceConfigSignal}
      selectedEntitySignal={selectedEntitySignal}
    >
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
            {/* Compact name bar - shown when pedigree focus mode is active */}
            {isPedigreeFocusMode && (
              <div className="sticky top-0 z-30 relative bg-card-ground border-b border-surface-border pb-2">
                <div className="truncate text-2xl sm:text-3xl font-bold pr-24">
                  <Link
                    to={`/${entitySlug}`}
                    className="text-foreground hover:text-primary"
                  >
                    {selectedEntity?.name}
                  </Link>
                </div>
                <div className="absolute right-0 top-0">
                  <NavigationButtons mode="default" entityType={entityType} />
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
                countsLoading ? (
                  <PageMenuSkeleton tabCount={3} />
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
              <TabComponent
                entity={selectedEntity}
                mode="fullscreen"
                dataSource={currentTab.dataSource}
                pedigreeGenerations={pedigreeGenerations}
                onPedigreeGenerationsChange={handleGenerationsChange}
                pedigreeZoom={pedigreeZoom}
                stickyScrollbarTop={isPedigreeFocusMode ? (COMPACT_BAR_HEIGHT + 52) : (PAGE_MENU_TOP + 102)}
                linkToPedigree={linkToPedigree}
              />
            </div>
          </div>
        </div>

        {/* Scroll to top button */}
        <ScrollToTopButton
          scrollContainer={scrollContainerRef.current}
          contentContainer={contentContainerRef.current}
        />
      </div>
    </SpaceProvider>
  );
}
