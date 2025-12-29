import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { SpaceProvider } from "@/contexts/SpaceContext";
import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
import { getPageConfig } from "@/utils/getPageConfig";
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

// Dynamic tab component registry (same as TabOutletRenderer)
const breedTabModules = import.meta.glob('../breed/tabs/*Tab.tsx', { eager: true });
const kennelTabModules = import.meta.glob('../kennel/tabs/*Tab.tsx', { eager: true });
const petTabModules = import.meta.glob('../pet/tabs/*Tab.tsx', { eager: true });

const TAB_COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {};

function registerModules(modules: Record<string, any>) {
  for (const [path, module] of Object.entries(modules)) {
    const match = path.match(/\/([^/]+)Tab\.tsx$/);
    if (match) {
      const componentName = match[1] + 'Tab';
      const Component = (module as any)[componentName] || (module as any).default;
      if (Component) {
        TAB_COMPONENT_REGISTRY[componentName] = Component;
      }
    }
  }
}

registerModules(breedTabModules);
registerModules(kennelTabModules);
registerModules(petTabModules);

// Tab config from database
interface TabConfig {
  isDefault?: boolean; // Fallback default tab
  preferDefault?: boolean; // Preferred default if tab has data/is visible
  order: number;
  component: string;
  label?: string;
  icon?: { name: string; source: string };
  slug?: string;
  badge?: string;
  fullscreenButton?: boolean;
  recordsCount?: number;
  dataSource?: any; // Config-driven data loading
  actionType?: "pedigreeGenerations" | "edit"; // Fullscreen mode action type
}

interface TabPageTemplateProps {
  entityType: string;
  entityId: string;
  entitySlug: string;
  tabSlug: string;
  className?: string;
  isDrawerMode?: boolean;
  isFullscreenMode?: boolean;
}

/**
 * Determine if tab should be shown in fullscreen PageMenu
 * Same logic as shouldShowFullscreen in TabsContainer
 */
function shouldShowInFullscreenMenu(
  fullscreenButton: boolean | undefined,
  recordsCount: number | undefined,
  loadedCount: number | undefined
): boolean {
  if (!fullscreenButton) return false;
  if (recordsCount === undefined) return true; // No limit configured, always show
  if (loadedCount === undefined) return true; // Data not loaded yet, show by default
  return loadedCount >= recordsCount; // Show only if there might be more records
}

/**
 * Convert tab config object to Tab[] array
 * Only includes tabs that should be shown in fullscreen mode
 * (fullscreenButton: true AND loadedCount >= recordsCount)
 */
function convertFullscreenTabsToArray(
  tabsConfig: Record<string, TabConfig>,
  loadedCounts: Record<string, number>
): Tab[] {
  const tabs: Tab[] = [];

  for (const [tabId, config] of Object.entries(tabsConfig)) {
    // Check if tab should be shown (fullscreenButton + records count check)
    const shouldShow = shouldShowInFullscreenMenu(
      config.fullscreenButton,
      config.recordsCount,
      loadedCounts[tabId]
    );
    if (!shouldShow) continue;

    const Component = TAB_COMPONENT_REGISTRY[config.component];
    if (!Component) {
      console.warn(`[TabPageTemplate] Component "${config.component}" not found in registry`);
      continue;
    }

    const label = config.label ||
      config.component
        .replace(/Tab$/, '')
        .replace(/([A-Z])/g, ' $1')
        .trim();

    const fragment = config.slug || tabId;

    tabs.push({
      id: tabId,
      fragment,
      label,
      icon: config.icon || { name: 'Circle', source: 'lucide' },
      component: Component,
      badge: config.badge,
      fullscreenButton: config.fullscreenButton,
      recordsCount: config.recordsCount,
      dataSource: config.dataSource,
      actionType: config.actionType,
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
  const nameContainerRef = useRef<HTMLDivElement>(null);

  // Track if name container is stuck to top
  const [nameOnTop, setNameOnTop] = useState(false);
  const [nameBlockHeight, setNameBlockHeight] = useState(0);

  // Pedigree generations state (for pedigree-generations action type)
  const [pedigreeGenerations, setPedigreeGenerations] = useState<GenerationCount>(4);

  // Get spaceConfig signal
  const spaceConfigSignal = useMemo(
    () => spaceStore.getSpaceConfigSignal(entityType),
    [entityType]
  );
  const spaceConfig = spaceConfigSignal?.value;

  // Get page config
  const pageConfig = getPageConfig(spaceConfig);

  // Get selected entity signal
  const selectedEntitySignal = spaceStore.getSelectedEntity(entityType);
  const selectedEntity = selectedEntitySignal?.value;

  // Ensure correct entity is selected based on URL entityId
  // If selectedEntity is different from entityId, fetch and select the correct one
  useEffect(() => {
    if (entityId && selectedEntity?.id !== entityId) {
      console.log('[TabPageTemplate] Entity mismatch, fetching correct entity:', {
        currentId: selectedEntity?.id,
        expectedId: entityId
      });
      spaceStore.fetchAndSelectEntity(entityType, entityId);
    }
  }, [entityType, entityId, selectedEntity?.id]);

  // Get tabs config from page config
  const tabsConfig = useMemo(() => {
    if (!pageConfig?.blocks) return {};
    const tabOutletBlock = Object.values(pageConfig.blocks).find(
      (block: any) => block.outlet === 'TabOutlet' && block.tabs
    ) as any;
    return tabOutletBlock?.tabs || {};
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

      for (const [tabId, config] of Object.entries(tabsConfig)) {
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

  // Space permissions
  const spacePermissions = {
    canEdit: true,
    canDelete: false,
    canAdd: false,
  };

  // Sticky detection - check if name container is stuck
  useEffect(() => {
    if (!nameContainerRef.current || !scrollContainerRef.current) return;

    const scrollContainer = scrollContainerRef.current;

    const checkSticky = () => {
      if (!nameContainerRef.current) return;

      const containerTop = scrollContainer.getBoundingClientRect().top;
      const elementTop = nameContainerRef.current.getBoundingClientRect().top;

      // When element top equals container top, it's stuck
      const isStuck = Math.abs(containerTop - elementTop) <= 1;
      setNameOnTop(isStuck);
    };

    // Check on scroll
    scrollContainer.addEventListener("scroll", checkSticky);
    // Check initially
    checkSticky();

    return () => {
      scrollContainer.removeEventListener("scroll", checkSticky);
    };
  }, [pageConfig, selectedEntity]);

  // Track name container height for PageMenu positioning
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
  }, [pageConfig, selectedEntity]);

  // PageMenu top position (under Name when sticky)
  const PAGE_MENU_TOP = nameBlockHeight > 0 ? nameBlockHeight : 0;

  // Loading state
  if (!spaceConfig || !pageConfig) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading configuration...</p>
        </div>
      </div>
    );
  }

  // Entity not loaded or wrong entity selected (wait for correct entity from URL)
  if (!selectedEntity || selectedEntity.id !== entityId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading entity...</p>
        </div>
      </div>
    );
  }

  // Tab not found
  if (!currentTab) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-4 text-gray-300">404</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Tab Not Found</h1>
          <p className="text-gray-600 mb-6">
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
            className="w-full max-w-3xl lg:max-w-4xl xxl:max-w-5xl"
          >
            {/* Name Block - Sticky at top */}
            {nameBlockConfig && (
              <div
                ref={nameContainerRef}
                className="sticky top-0 z-30"
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

            {/* PageMenu - Sticky under Name */}
            <div
              className="sticky z-20 -mt-px"
              style={{ top: `${PAGE_MENU_TOP}px` }}
            >
              {countsLoading ? (
                <PageMenuSkeleton tabCount={3} />
              ) : (
                <PageMenu
                  tabs={fullscreenTabs}
                  activeTab={activeTabSlug}
                  onTabChange={handleTabChange}
                  mode="tabs"
                />
              )}
            </div>

            {/* TabActionsHeader - Renders actions based on tab's actionType */}
            <TabActionsHeader>
              {currentTab.actionType === "pedigreeGenerations" && (
                <PedigreeGenerationSelector
                  generations={pedigreeGenerations}
                  onGenerationsChange={setPedigreeGenerations}
                />
              )}
              {currentTab.actionType === "edit" && spaceConfig?.canEdit && (
                <button className="text-sm font-medium text-primary hover:underline">
                  Edit
                </button>
              )}
            </TabActionsHeader>

            {/* Tab Content */}
            <div className="pt-6 pb-8">
              <TabComponent
                entity={selectedEntity}
                mode="fullscreen"
                recordsCount={currentTab.recordsCount}
                dataSource={currentTab.dataSource}
                pedigreeGenerations={pedigreeGenerations}
                onPedigreeGenerationsChange={setPedigreeGenerations}
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
