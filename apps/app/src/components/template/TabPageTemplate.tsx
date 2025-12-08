import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { SpaceProvider } from "@/contexts/SpaceContext";
import { getPageConfig } from "@/utils/getPageConfig";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { Tab } from "@/components/tabs/TabsContainer";
import { PageMenu } from "@/components/tabs/PageMenu";

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
  isDefault?: boolean;
  order: number;
  component: string;
  label?: string;
  icon?: { name: string; source: string };
  slug?: string;
  badge?: string;
  fullscreenButton?: boolean;
  recordsCount?: number;
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
 * Convert tab config object to Tab[] array
 * Only includes tabs with fullscreenButton: true
 */
function convertFullscreenTabsToArray(tabsConfig: Record<string, TabConfig>): Tab[] {
  const tabs: Tab[] = [];

  for (const [tabId, config] of Object.entries(tabsConfig)) {
    // Only include tabs with fullscreenButton enabled
    if (!config.fullscreenButton) continue;

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

  // Refs for sticky behavior
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const nameContainerRef = useRef<HTMLDivElement>(null);

  // Track if name container is stuck to top
  const [nameOnTop, setNameOnTop] = useState(false);
  const [nameBlockHeight, setNameBlockHeight] = useState(0);

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

  // Ensure entity is loaded - SpaceComponent may not have finished loading yet
  useEffect(() => {
    if (!selectedEntity && entityId) {
      console.log('[TabPageTemplate] Entity not in store, fetching:', entityId);
      spaceStore.fetchAndSelectEntity(entityType, entityId);
    }
  }, [entityType, entityId, selectedEntity]);

  // Get tabs config from page config
  const tabsConfig = useMemo(() => {
    if (!pageConfig?.blocks) return {};
    const tabOutletBlock = Object.values(pageConfig.blocks).find(
      (block: any) => block.outlet === 'TabOutlet' && block.tabs
    ) as any;
    return tabOutletBlock?.tabs || {};
  }, [pageConfig]);

  // Get only fullscreen-enabled tabs
  const fullscreenTabs = useMemo(
    () => convertFullscreenTabsToArray(tabsConfig),
    [tabsConfig]
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
  }, []);

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

  // Entity not found
  if (!selectedEntity) {
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
          <div className="w-full max-w-3xl lg:max-w-4xl xxl:max-w-5xl">
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
              className="sticky z-20 -mt-px bg-card-ground"
              style={{ top: `${PAGE_MENU_TOP}px` }}
            >
              <div className="border-b border-surface-border">
                <PageMenu
                  tabs={fullscreenTabs}
                  activeTab={activeTabSlug}
                  onTabChange={handleTabChange}
                  mode="tabs"
                />
              </div>
            </div>

            {/* Tab Content */}
            <div className="pt-6 pb-8">
              <TabComponent
                entity={selectedEntity}
                mode="fullscreen"
              />
            </div>
          </div>
        </div>
      </div>
    </SpaceProvider>
  );
}
