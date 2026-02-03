import { TabOutletRenderer } from "@/components/blocks/TabOutletRenderer";
import type { PageConfig } from "@/types/page-config.types";
import type { SpacePermissions } from "@/types/page-menu.types";
import { useMemo } from "react";

/**
 * Tab config from database
 */
interface TabConfig {
  isDefault?: boolean; // Fallback default tab
  preferDefault?: boolean; // Preferred default if tab has data/is visible
  order: number;
  component: string;
  label?: string;
  icon?: { name: string; source: string };
}

interface TabOutletProps {
  entity?: any;
  component: string;
  className?: string;

  // Menu configuration (from page config)
  pageConfig?: PageConfig | null;
  spacePermissions?: SpacePermissions;

  // Loading state - shows skeleton when true
  isLoading?: boolean;

  // Tab-specific props from block config
  tabs?: Record<string, TabConfig>;
  pageMenuTop?: number;
  tabHeaderTop?: number;

  // Component to render inside the outlet (not used - tabs have special handling)
  children?: React.ReactNode;
}

/**
 * TabOutlet - Universal tab outlet
 *
 * Renders PageMenu and TabsContainer using TabOutletRenderer.
 * Provides consistent interface with other outlets (CoverOutlet, NameOutlet, etc.)
 *
 * Config example:
 * {
 *   "type": "tab",
 *   "outlet": "TabOutlet",
 *   "order": 5,
 *   "component": "PageMenu",
 *   "tabs": {
 *     "config_tab_1": { "order": 1, "component": "BreedAchievementsTab", "isDefault": true },
 *     "config_tab_2": { "order": 2, "component": "BreedPatronsTab" }
 *   }
 * }
 */
export function TabOutlet({
  entity,
  component,
  className = "",
  pageConfig,
  spacePermissions,
  isLoading = false,
  tabs,
  pageMenuTop = 0,
  tabHeaderTop = 0,
  children,
}: TabOutletProps) {
  // Show skeleton when loading - uses tabs config to show correct number of tab headers
  if (isLoading) {
    const tabCount = tabs ? Object.keys(tabs).length : 4;

    return (
      <div className={`mt-9 ${className}`}>
        {/* Tab headers skeleton */}
        <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
          {Array.from({ length: tabCount }).map((_, i) => (
            <div
              key={i}
              className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"
              style={{ width: `${60 + Math.random() * 40}px` }}
            />
          ))}
        </div>

        {/* Tab content skeleton */}
        <div className="mt-6 space-y-5">
          <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          <div className="space-y-5 px-5">
            <div className="h-32 w-full bg-slate-200 dark:bg-slate-700 rounded-lg mt-6 animate-pulse" />
            <div className="h-32 w-full bg-slate-200 dark:bg-slate-700 rounded-lg mt-6 animate-pulse" />
            <div className="h-32 w-full bg-slate-200 dark:bg-slate-700 rounded-lg mt-6 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Validate tabs config
  if (!tabs) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[TabOutlet] No tabs config provided");
    }
    return null;
  }

  // Filter out tabs with preferDefault: true that have no data
  // This allows tabs to be hidden when they're empty (e.g., services/offers tab)
  const visibleTabs = useMemo(() => {
    const filtered: Record<string, TabConfig> = {};

    for (const [tabId, tabConfig] of Object.entries(tabs)) {
      // Tabs without preferDefault are always visible
      if (!tabConfig.preferDefault) {
        filtered[tabId] = tabConfig;
        continue;
      }

      // For preferDefault tabs, check if they have data based on component
      // Supported: PetServicesTab, LitterServicesTab (check entity.services JSONB)
      let hasData = true;

      if (tabConfig.component === "PetServicesTab" || tabConfig.component === "LitterServicesTab") {
        const servicesJsonb = entity?.services as Record<string, string> | undefined;
        hasData = !!(servicesJsonb && Object.keys(servicesJsonb).length > 0);
      }

      // Only include tab if it has data
      if (hasData) {
        filtered[tabId] = tabConfig;
      }
    }

    return filtered;
  }, [tabs, entity?.services]);

  // If all tabs were filtered out, don't render anything
  if (Object.keys(visibleTabs).length === 0) {
    return null;
  }

  // TabOutlet uses TabOutletRenderer for actual rendering
  // This provides consistent outlet interface while keeping tab logic centralized
  return (
    <div className={className}>
      <TabOutletRenderer
        tabsConfig={visibleTabs}
        pageMenuTop={pageMenuTop}
        tabHeaderTop={tabHeaderTop}
        entityId={entity?.id}
        entitySlug={entity?.slug}
      />
    </div>
  );
}
