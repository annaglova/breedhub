import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { TabsContainer, Tab } from "../tabs/TabsContainer";
import { PageMenu } from "../tabs/PageMenu";
import { useTabNavigation } from "@/hooks/useTabNavigation";

/**
 * Dynamic tab component registry using Vite's glob imports
 *
 * Automatically imports all tab components from:
 * - ../breed/tabs/**Tab.tsx
 * - ../kennel/tabs/**Tab.tsx
 * - ../pet/tabs/**Tab.tsx
 *
 * This allows adding new tabs without modifying this file.
 * Just create MyNewTab.tsx and reference "MyNewTab" in config.
 */
const breedTabModules = import.meta.glob('../breed/tabs/*Tab.tsx', { eager: true });
const kennelTabModules = import.meta.glob('../kennel/tabs/*Tab.tsx', { eager: true });
const petTabModules = import.meta.glob('../pet/tabs/*Tab.tsx', { eager: true });

// Combine all tab modules into single registry
const TAB_COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {};

// Helper to extract component name from path and register it
function registerModules(modules: Record<string, any>) {
  for (const [path, module] of Object.entries(modules)) {
    // Extract component name from path: "../breed/tabs/BreedAchievementsTab.tsx" -> "BreedAchievementsTab"
    const match = path.match(/\/([^/]+)Tab\.tsx$/);
    if (match) {
      const componentName = match[1] + 'Tab';
      // Module might export as default or named export
      const Component = (module as any)[componentName] || (module as any).default;
      if (Component) {
        TAB_COMPONENT_REGISTRY[componentName] = Component;
      }
    }
  }
}

// Register all tab components
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
  slug?: string; // URL-friendly identifier for the tab (e.g., "achievements", "patrons")
  // New config options
  badge?: string; // "Coming soon", "New", "Beta", etc.
  fullscreenButton?: boolean; // Show fullscreen button
  recordsCount?: number; // Number of records to fetch for this tab
  dataSource?: any; // Config-driven data loading (see TAB_DATA_SERVICE_ARCHITECTURE.md)
}

interface TabOutletRendererProps {
  tabsConfig: Record<string, TabConfig>;
  pageMenuTop: number;
  tabHeaderTop: number;
  onPageMenuRef?: (ref: HTMLDivElement | null) => void;
  entityId?: string; // Entity ID - when changed, reset to default tab
  entitySlug?: string; // Entity slug for generating fullscreen URLs (e.g., "affenpinscher")
}

// Extended tab with internal ordering fields
interface ExtendedTab extends Tab {
  _order: number;
  _isDefault?: boolean;
  badge?: string;
  fullscreenButton?: boolean;
  recordsCount?: number;
  dataSource?: any;
}

/**
 * Convert tab config object to Tab[] array for TabsContainer
 */
function convertTabConfigToTabs(tabsConfig: Record<string, TabConfig>): Tab[] {
  const tabs: ExtendedTab[] = [];

  for (const [tabId, config] of Object.entries(tabsConfig)) {
    const Component = TAB_COMPONENT_REGISTRY[config.component];
    if (!Component) {
      console.warn(`[TabOutlet] Component "${config.component}" not found in registry`);
      continue;
    }

    // Generate label from component name if not provided
    // "BreedAchievementsTab" -> "Breed Achievements"
    const label = config.label ||
      config.component
        .replace(/Tab$/, '')
        .replace(/([A-Z])/g, ' $1')
        .trim();

    // Use slug from config for URL fragment, fallback to tabId
    const fragment = config.slug || tabId;

    tabs.push({
      id: tabId,
      fragment,
      label,
      icon: config.icon || { name: 'Circle', source: 'lucide' },
      component: Component,
      // New config options
      badge: config.badge,
      fullscreenButton: config.fullscreenButton,
      recordsCount: config.recordsCount,
      dataSource: config.dataSource,
      // Internal fields
      _order: config.order,
      _isDefault: config.isDefault,
    });
  }

  return tabs.sort((a, b) => a._order - b._order);
}

/**
 * Get default tab fragment (slug) from tabs config
 */
function getDefaultTabFragment(tabsConfig: Record<string, TabConfig>): string | undefined {
  const defaultEntry = Object.entries(tabsConfig).find(([, config]) => config.isDefault);
  if (defaultEntry) {
    const [tabId, config] = defaultEntry;
    return config.slug || tabId;
  }
  // Fallback to first tab
  const firstEntry = Object.entries(tabsConfig)[0];
  if (firstEntry) {
    const [tabId, config] = firstEntry;
    return config.slug || tabId;
  }
  return undefined;
}

/**
 * TabOutletRenderer - Renders PageMenu and TabsContainer from config
 *
 * This component handles:
 * - Converting tab config to Tab[] format
 * - Managing active tab state via useTabNavigation
 * - Rendering PageMenu (sticky tab bar)
 * - Rendering TabsContainer (tab content)
 */
export function TabOutletRenderer({
  tabsConfig,
  pageMenuTop,
  tabHeaderTop,
  onPageMenuRef,
  entityId,
  entitySlug,
}: TabOutletRendererProps) {
  const pageMenuRef = useRef<HTMLDivElement>(null);
  const [pageMenuHeight, setPageMenuHeight] = useState(0);

  // Convert config to tabs array
  const tabs = useMemo(() => convertTabConfigToTabs(tabsConfig), [tabsConfig]);

  // Track PageMenu height for TabHeader positioning
  useEffect(() => {
    if (!pageMenuRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setPageMenuHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(pageMenuRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Calculate actual TabHeader top position (under PageMenu)
  const actualTabHeaderTop = pageMenuTop + pageMenuHeight;

  // Get default tab from config (respects isDefault: true)
  const defaultTab = useMemo(() => getDefaultTabFragment(tabsConfig), [tabsConfig]);

  // Tab navigation hook with default tab from config (respects isDefault: true)
  // Pass entityId to reset tab when entity changes in drawer mode
  const { activeTab, handleTabChange, handleVisibilityChange } = useTabNavigation({
    tabs,
    mode: "scroll",
    defaultTab,
    entityId,
  });

  // Pass ref to parent if needed
  useEffect(() => {
    if (onPageMenuRef && pageMenuRef.current) {
      onPageMenuRef(pageMenuRef.current);
    }
  }, [onPageMenuRef]);

  if (tabs.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
        <p className="text-yellow-700 font-semibold">No tabs configured</p>
        <p className="text-yellow-600 text-sm mt-1">
          Add tab components to the TabOutlet configuration
        </p>
      </div>
    );
  }

  return (
    <>
      {/* PageMenu - Sticky horizontal tab bar */}
      <div
        ref={pageMenuRef}
        className="sticky z-30 mb-6 -mt-px"
        style={{ top: `${pageMenuTop}px` }}
      >
        <PageMenu
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          mode="scroll"
        />
      </div>

      {/* Tabs Section - Scroll mode with all tabs rendered */}
      <TabsContainer
        tabs={tabs}
        mode="scroll"
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onVisibilityChange={handleVisibilityChange}
        tabHeaderTop={actualTabHeaderTop}
        entitySlug={entitySlug}
        entityId={entityId}
      />
    </>
  );
}
