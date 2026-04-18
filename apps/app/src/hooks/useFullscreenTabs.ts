import { useCallback, useEffect, useMemo, useState } from "react";
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
      if (Object.keys(storedCounts).length > 0) {
        setLoadedCounts(storedCounts);
        setCountsLoading(false);
        return;
      }

      const counts: Record<string, number> = {};

      for (const [tabId, config] of Object.entries(
        tabsConfig,
      ) as Array<[string, TabConfig]>) {
        if (!config.fullscreenButton || !config.dataSource) continue;

        try {
          const records = await tabDataService.loadTabData(entityId, config.dataSource);
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

  const currentTab = useMemo(
    () => fullscreenTabs.find((tab) => tab.fragment === activeTabSlug),
    [activeTabSlug, fullscreenTabs],
  );

  const handleTabChange = useCallback(
    (fragment: string) => {
      setActiveTabSlug(fragment);
      window.history.replaceState(null, "", `/${entitySlug}/${fragment}`);
    },
    [entitySlug],
  );

  return {
    activeTabSlug,
    countsLoading,
    currentTab,
    fullscreenTabs,
    handleTabChange,
  };
}
