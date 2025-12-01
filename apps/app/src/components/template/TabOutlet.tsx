import { TabOutletRenderer } from "@/components/blocks/TabOutletRenderer";
import type { PageConfig } from "@/types/page-config.types";
import type { SpacePermissions } from "@/types/page-menu.types";

/**
 * Tab config from database
 */
interface TabConfig {
  isDefault?: boolean;
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
  tabs,
  pageMenuTop = 0,
  tabHeaderTop = 0,
  children,
}: TabOutletProps) {
  // Validate tabs config
  if (!tabs) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[TabOutlet] No tabs config provided");
    }
    return null;
  }

  // TabOutlet uses TabOutletRenderer for actual rendering
  // This provides consistent outlet interface while keeping tab logic centralized
  return (
    <div className={className}>
      <TabOutletRenderer
        tabsConfig={tabs}
        pageMenuTop={pageMenuTop}
        tabHeaderTop={tabHeaderTop}
        entityId={entity?.id}
        entitySlug={entity?.slug}
      />
    </div>
  );
}
