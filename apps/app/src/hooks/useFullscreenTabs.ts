import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { spaceStore, tabDataService } from "@breedhub/rxdb-store";
import type { Tab } from "@/components/tabs/TabsContainer";
import { TAB_COMPONENT_REGISTRY } from "@/components/shared/tab-registry";
import {
  getTabFragment,
  getTabLabel,
  type TabConfig,
} from "@/utils/tab-config";

export interface FullscreenTab extends Tab {
  _order: number;
}

function shouldShowInFullscreenMenu(
  fullscreenButton: boolean | undefined,
  expandAlways: boolean | undefined,
  loadedCount: number | undefined,
): boolean {
  if (!fullscreenButton) return false;
  if (expandAlways) return true;
  return (loadedCount ?? 0) > 0;
}

function convertFullscreenTabsToArray(
  tabsConfig: Record<string, TabConfig>,
  loadedCounts: Record<string, number>,
): FullscreenTab[] {
  const tabs: FullscreenTab[] = [];

  for (const [tabId, config] of Object.entries(tabsConfig)) {
    const shouldShow = shouldShowInFullscreenMenu(
      config.fullscreenButton,
      config.expandAlways,
      loadedCounts[tabId],
    );
    if (!shouldShow) continue;

    const Component = TAB_COMPONENT_REGISTRY[config.component];
    if (!Component) {
      console.warn(
        `[TabPageTemplate] Component "${config.component}" not found in registry`,
      );
      continue;
    }

    tabs.push({
      id: tabId,
      fragment: getTabFragment(tabId, config),
      label: getTabLabel(config.component, config.label),
      icon: config.icon || { name: "Circle", source: "lucide" },
      component: Component,
      badge: config.badge,
      fullscreenButton: config.fullscreenButton,
      expandAlways: config.expandAlways,
      dataSource: config.dataSource,
      actionTypes: config.actionTypes,
      focusMode: config.focusMode,
      zoomControl: config.zoomControl,
      _order: config.order,
    });
  }

  return tabs.sort((a, b) => a._order - b._order);
}

interface UseFullscreenTabsOptions {
  entityId: string;
  entitySlug: string;
  tabSlug: string;
  tabsConfig: Record<string, TabConfig>;
}

export function useFullscreenTabs({
  entityId,
  entitySlug,
  tabSlug,
  tabsConfig,
}: UseFullscreenTabsOptions) {
  const navigate = useNavigate();
  const [loadedCounts, setLoadedCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState(true);
  const [activeTabSlug, setActiveTabSlug] = useState(tabSlug);

  useEffect(() => {
    const loadTabCounts = async () => {
      if (!entityId || Object.keys(tabsConfig).length === 0) {
        setCountsLoading(false);
        return;
      }

      const storedCounts = spaceStore.getTabLoadedCounts(entityId);
      const hasNonZero = Object.values(storedCounts).some((n) => n > 0);
      if (Object.keys(storedCounts).length > 0 && hasNonZero) {
        // Stored counts only short-circuit if at least one is non-zero. An
        // all-zero map usually means a previous partial load fired before the
        // entity / partition was fully resolved (partition_id blank, queries
        // returned 0 records); without this check the bad cache sticks for
        // the whole session and pills never appear.
        setLoadedCounts(storedCounts);
        setCountsLoading(false);
        return;
      }

      const counts: Record<string, number> = {};

      for (const [tabId, config] of Object.entries(
        tabsConfig,
      ) as Array<[string, TabConfig]>) {
        // dataSource is an array (DataSourceConfig[]) on tab configs; tabs
        // themselves consume `dataSource[0]`. Mirror that here, otherwise
        // tabDataService.loadTabData receives an array and short-circuits
        // with "dataSource with type is required" → every tab gets cached
        // as count 0 and pills never appear.
        const ds = Array.isArray(config.dataSource)
          ? config.dataSource[0]
          : config.dataSource;
        if (!config.fullscreenButton || !ds) continue;

        try {
          const records = await tabDataService.loadTabData(entityId, ds);
          counts[tabId] = records.length;
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

  useEffect(() => {
    if (tabSlug !== activeTabSlug) {
      setActiveTabSlug(tabSlug);
    }
  }, [activeTabSlug, tabSlug]);

  const fullscreenTabs = useMemo(
    () => convertFullscreenTabsToArray(tabsConfig, loadedCounts),
    [loadedCounts, tabsConfig],
  );

  // Resolve the active tab from `tabsConfig` (config-level, every fullscreen-eligible
  // tab regardless of loadedCount), not from `fullscreenTabs` (filtered for PageMenu
  // pills via `loadedCount > 0`). On direct navigation to /{slug}/{tabSlug} with no
  // stored counts, `loadedCounts` is `{}` while `loadTabCounts` runs — the filter
  // would drop the requested tab and TabPageTemplate would render a 404, even though
  // the tab definitely exists. PageMenu still uses `fullscreenTabs` so empty tabs
  // stay hidden from the menu, but the URL-requested tab always renders.
  const currentTab = useMemo<FullscreenTab | undefined>(() => {
    for (const [tabId, config] of Object.entries(tabsConfig)) {
      if (!config.fullscreenButton) continue;
      if (getTabFragment(tabId, config) !== activeTabSlug) continue;

      const Component = TAB_COMPONENT_REGISTRY[config.component];
      if (!Component) {
        console.warn(
          `[TabPageTemplate] Component "${config.component}" not found in registry`,
        );
        return undefined;
      }

      return {
        id: tabId,
        fragment: getTabFragment(tabId, config),
        label: getTabLabel(config.component, config.label),
        icon: config.icon || { name: "Circle", source: "lucide" },
        component: Component,
        badge: config.badge,
        fullscreenButton: config.fullscreenButton,
        expandAlways: config.expandAlways,
        dataSource: config.dataSource,
        actionTypes: config.actionTypes,
        focusMode: config.focusMode,
        zoomControl: config.zoomControl,
        _order: config.order,
      };
    }
    return undefined;
  }, [activeTabSlug, tabsConfig]);

  const handleTabChange = useCallback(
    (fragment: string) => {
      // Use react-router navigate so useParams updates and TabPageResolver
      // re-resolves the new tabSlug. Plain history.replaceState mutated the
      // URL but left useParams.tabSlug stale, so the sync useEffect below
      // would flip activeTabSlug back to the old value and the rendered
      // tab never changed.
      navigate(`/${entitySlug}/${fragment}`, { replace: true });
      setActiveTabSlug(fragment);
    },
    [entitySlug, navigate],
  );

  return {
    activeTabSlug,
    countsLoading,
    currentTab,
    fullscreenTabs,
    handleTabChange,
  };
}
