import type { IconConfig, ReadFromConfig } from "@breedhub/rxdb-store";
import type { PageConfig } from "@/types/page-config.types";

export interface TabConfig {
  isDefault?: boolean;
  preferDefault?: boolean;
  hideWhenEmpty?: boolean;
  order: number;
  component: string;
  label?: string;
  icon?: IconConfig;
  slug?: string;
  badge?: string;
  fullscreenButton?: boolean;
  expandAlways?: boolean;
  focusMode?: boolean;
  zoomControl?: boolean;
  dataSource?: any;
  readFrom?: ReadFromConfig;
  fields?: Record<string, any>;
  actionTypes?: string[];
  protectedWhen?: { field: string; value: unknown };
  [key: string]: any;
}

type DefaultableTabConfig = Pick<
  TabConfig,
  "order" | "slug" | "isDefault" | "preferDefault"
>;

export function sortTabConfigEntries<T extends Pick<TabConfig, "order">>(
  tabsConfig: Record<string, T>,
): Array<[string, T]> {
  return Object.entries(tabsConfig).sort(
    ([, a], [, b]) => (a.order || 0) - (b.order || 0),
  );
}

export function getTabFragment<T extends Pick<TabConfig, "slug">>(
  tabId: string,
  config: T,
): string {
  if (!config.slug) {
    // Tabs without slug fall back to tabId — surfaces in URL hash. Config should define slug.
    console.warn(
      `[tab-config] Tab "${tabId}" has no slug in app_config; using tabId as URL fragment. Define \`slug\` in config.`,
    );
  }
  return config.slug || tabId;
}

export function getTabLabel(
  componentName: string,
  explicitLabel?: string,
): string {
  return (
    explicitLabel ||
    componentName.replace(/Tab$/, "").replace(/([A-Z])/g, " $1").trim()
  );
}

export function getTabsConfigFromPage(
  pageConfig?: PageConfig | null,
): Record<string, TabConfig> {
  if (!pageConfig?.blocks) {
    return {};
  }

  const tabOutletBlock = Object.values(pageConfig.blocks).find(
    (block) => block.outlet === "TabOutlet" && block.tabs,
  );

  return (tabOutletBlock?.tabs || {}) as Record<string, TabConfig>;
}

export function getDefaultTabFragment<T extends DefaultableTabConfig>(
  tabsConfig: Record<string, T>,
): string | undefined {
  const sortedEntries = sortTabConfigEntries(tabsConfig);

  const preferDefaultEntry = sortedEntries.find(
    ([, config]) => config.preferDefault === true,
  );
  if (preferDefaultEntry) {
    const [tabId, config] = preferDefaultEntry;
    return getTabFragment(tabId, config);
  }

  const defaultEntry = sortedEntries.find(([, config]) => config.isDefault === true);
  if (defaultEntry) {
    const [tabId, config] = defaultEntry;
    return getTabFragment(tabId, config);
  }

  if (sortedEntries.length > 0) {
    const [tabId, config] = sortedEntries[0];
    return getTabFragment(tabId, config);
  }

  return undefined;
}

export function isPreferredDefaultTabFragment<T extends DefaultableTabConfig>(
  tabsConfig: Record<string, T>,
  fragment?: string | null,
): boolean {
  if (!fragment) {
    return true;
  }

  const matchingEntry = sortTabConfigEntries(tabsConfig).find(([tabId, config]) => {
    return getTabFragment(tabId, config) === fragment;
  });

  if (!matchingEntry) {
    return true;
  }

  const [, config] = matchingEntry;
  return config.preferDefault === true || config.isDefault === true;
}
