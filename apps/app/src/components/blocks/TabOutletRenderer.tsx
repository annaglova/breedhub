import { useRef, useState, useEffect, useMemo } from "react";
import { TabsContainer, Tab } from "../tabs/TabsContainer";
import { PageMenu } from "../tabs/PageMenu";
import { useTabNavigation } from "@/hooks/useTabNavigation";
import { BreedAchievementsTab } from "../breed/tabs/BreedAchievementsTab";

// Component registry - maps component names from config to actual components
const TAB_COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  BreedAchievementsTab,
};

// Tab config from database
interface TabConfig {
  isDefault?: boolean;
  order: number;
  component: string;
  label?: string;
  icon?: { name: string; source: string };
}

interface TabOutletRendererProps {
  tabsConfig: Record<string, TabConfig>;
  pageMenuTop: number;
  tabHeaderTop: number;
  onPageMenuRef?: (ref: HTMLDivElement | null) => void;
}

// Extended tab with internal ordering fields
interface ExtendedTab extends Tab {
  _order: number;
  _isDefault?: boolean;
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

    tabs.push({
      id: tabId,
      fragment: tabId,
      label,
      icon: config.icon || { name: 'Circle', source: 'lucide' },
      component: Component,
      _order: config.order,
      _isDefault: config.isDefault,
    });
  }

  return tabs.sort((a, b) => a._order - b._order);
}

/**
 * Get default tab fragment from tabs config
 */
function getDefaultTabFragment(tabsConfig: Record<string, TabConfig>): string | undefined {
  const defaultEntry = Object.entries(tabsConfig).find(([, config]) => config.isDefault);
  return defaultEntry ? defaultEntry[0] : Object.keys(tabsConfig)[0];
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
}: TabOutletRendererProps) {
  const pageMenuRef = useRef<HTMLDivElement>(null);

  // Convert config to tabs array
  const tabs = useMemo(() => convertTabConfigToTabs(tabsConfig), [tabsConfig]);

  // Get default tab from config (respects isDefault: true)
  const defaultTab = useMemo(() => getDefaultTabFragment(tabsConfig), [tabsConfig]);

  // Tab navigation hook with default tab from config (respects isDefault: true)
  const { activeTab, handleTabChange, handleVisibilityChange } = useTabNavigation({
    tabs,
    mode: "scroll",
    defaultTab,
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

  if (process.env.NODE_ENV === 'development') {
    console.log('[TabOutletRenderer] Rendering tabs:', {
      tabsCount: tabs.length,
      tabs: tabs.map(t => ({ id: t.id, label: t.label })),
      activeTab,
      defaultTab,
    });
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
        tabHeaderTop={tabHeaderTop}
      />
    </>
  );
}
