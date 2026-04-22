import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { SearchInput } from "@ui/components/form-inputs/search-input";
import { Plus } from "lucide-react";
import { TabsContainer, Tab } from "../tabs/TabsContainer";
import { TabActionsHeader } from "../tabs/TabActionsHeader";
import { PageMenu } from "../tabs/PageMenu";
import { useTabNavigation } from "@/hooks/useTabNavigation";
import {
  getDefaultTabFragment,
  getTabFragment,
  getTabLabel,
  type TabConfig,
} from "@/utils/tab-config";

/**
 * Dynamic tab component registry using Vite's glob imports
 *
 * Automatically imports all tab components from:
 * - ../breed/tabs/**Tab.tsx
 * - ../kennel/tabs/**Tab.tsx
 * - ../pet/tabs/**Tab.tsx
 * - ../litter/tabs/**Tab.tsx
 *
 * This allows adding new tabs without modifying this file.
 * Just create MyNewTab.tsx and reference "MyNewTab" in config.
 */
// Shared tab component registry (auto-discovers all *Tab.tsx components)
import { TAB_COMPONENT_REGISTRY } from '../shared/tab-registry';

interface TabOutletRendererProps {
  tabsConfig: Record<string, TabConfig>;
  pageMenuTop: number;
  tabHeaderTop: number;
  onPageMenuRef?: (ref: HTMLDivElement | null) => void;
  entityId?: string; // Entity ID - when changed, reset to default tab
  entitySlug?: string; // Entity slug for generating fullscreen URLs (e.g., "affenpinscher")
  tabMode?: "scroll" | "tabs"; // scroll = all tabs rendered (public), tabs = only active shown (edit)
  // Edit page save orchestration (merged into each tab's tabProps)
  onSaveReady?: (handler: () => Promise<void>) => void;
  entityType?: string;
  onDirtyChange?: (dirty: boolean) => void;
  onBeforeTabChange?: (targetFragment: string) => Promise<boolean | void>;
  onDefaultTabChange?: (isDefault: boolean) => void;
  isCreateMode?: boolean;
  onCreateNameChange?: (name: string) => void;
  isLoading?: boolean;
}

// Extended tab with internal ordering fields
interface ExtendedTab extends Tab {
  _order: number;
  _isDefault?: boolean;
  badge?: string;
  fullscreenButton?: boolean;
  expandAlways?: boolean;
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
    const label = getTabLabel(config.component, config.label);
    const fragment = getTabFragment(tabId, config);

    // Build extra tabProps for edit tabs
    const tabProps: Record<string, any> = {};
    if (config.fields) tabProps.fields = config.fields;
    if (config.label) tabProps.label = config.label;
    if (config.protectedWhen) tabProps.protectedWhen = config.protectedWhen;
    if (config.readFrom) tabProps.readFrom = config.readFrom;
    if ((config as any).rowActions) tabProps.rowActions = (config as any).rowActions;

    // Build searchPlaceholder from searchable fields
    if (config.actionTypes?.includes("search") && config.fields) {
      const searchFieldNames = Object.values(config.fields)
        .filter((f: any) => f.searchable)
        .map((f: any) => f.displayName);
      tabProps.searchPlaceholder = searchFieldNames.length > 0
        ? `Search ${config.label || "records"} by ${searchFieldNames.join(", ")}...`
        : `Search ${config.label || "records"}...`;
    }

    tabs.push({
      id: tabId,
      fragment,
      label,
      icon: config.icon || { name: 'Circle', source: 'lucide' },
      component: Component,
      // New config options
      badge: config.badge,
      fullscreenButton: config.fullscreenButton,
      expandAlways: config.expandAlways,
      dataSource: config.dataSource,
      focusMode: config.focusMode,
      actionTypes: config.actionTypes,
      // Pass edit-specific config as tabProps
      ...(Object.keys(tabProps).length > 0 ? { tabProps } : {}),
      // Internal fields
      _order: config.order,
      _isDefault: config.isDefault,
    });
  }

  return tabs.sort((a, b) => a._order - b._order);
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
  tabMode = "scroll",
  onSaveReady,
  entityType,
  onDirtyChange,
  onBeforeTabChange,
  isLoading: pageLoading,
  onDefaultTabChange,
  isCreateMode,
  onCreateNameChange,
}: TabOutletRendererProps) {
  const pageMenuRef = useRef<HTMLDivElement>(null);
  const [pageMenuHeight, setPageMenuHeight] = useState(0);

  // Convert config to tabs array, merging edit-specific props into tabProps
  const tabs = useMemo(() => {
    const baseTabs = convertTabConfigToTabs(tabsConfig);
    if (!onSaveReady && !entityType && !onDirtyChange && !isCreateMode) return baseTabs;
    const extraProps: Record<string, any> = {};
    if (onSaveReady) extraProps.onSaveReady = onSaveReady;
    if (entityType) extraProps.entityType = entityType;
    if (onDirtyChange) extraProps.onDirtyChange = onDirtyChange;
    if (isCreateMode) extraProps.isCreateMode = isCreateMode;
    if (onCreateNameChange) extraProps.onCreateNameChange = onCreateNameChange;
    return baseTabs.map(tab => ({
      ...tab,
      tabProps: { ...tab.tabProps, ...extraProps },
    }));
  }, [tabsConfig, onSaveReady, entityType, onDirtyChange, isCreateMode, onCreateNameChange]);

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
    mode: tabMode,
    defaultTab,
    entityId,
  });

  // Search filter for tabs with actionType "search" (reset on tab change)
  const [searchFilter, setSearchFilter] = useState("");
  useEffect(() => { setSearchFilter(""); }, [activeTab]);

  // Add dialog state for child table tabs (reset on tab change)
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  useEffect(() => { setAddDialogOpen(false); }, [activeTab]);

  // Active tab data for rendering TabActionsHeader
  const activeTabData = tabs.find(t => t.fragment === activeTab);

  // Report whether the active tab is the default/first tab
  useEffect(() => {
    onDefaultTabChange?.(activeTab === defaultTab);
  }, [activeTab, defaultTab, onDefaultTabChange]);

  // Wrap tab change to auto-save before switching (edit mode)
  // In create mode, onBeforeTabChange returns false to block switch (validation failed
  // OR navigated away to edit page after successful save)
  const wrappedHandleTabChange = useCallback(async (fragment: string) => {
    if (onBeforeTabChange) {
      try {
        const canSwitch = await onBeforeTabChange(fragment);
        if (canSwitch === false) return;
      } catch { /* save failed, still switch in edit mode */ }
    }
    handleTabChange(fragment);
  }, [handleTabChange, onBeforeTabChange]);

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
          onTabChange={wrappedHandleTabChange}
          mode={tabMode}
        />
        {/* TabActionsHeader inside sticky wrapper (like fullscreen mode) */}
        {activeTabData?.actionTypes?.length && (
          <TabActionsHeader
            left={
              activeTabData.actionTypes.includes("search") ? (
                <SearchInput
                  variant="tabSearch"
                  placeholder={activeTabData.tabProps?.searchPlaceholder || "Search..."}
                  value={searchFilter}
                  onValueChange={setSearchFilter}
                  className="max-w-md"
                />
              ) : undefined
            }
            right={
              activeTabData.actionTypes.includes("add") ? (
                <button
                  type="button"
                  className="flex items-center text-lg font-semibold text-sub-header-color hover:text-foreground/70 transition-colors focus:outline-none focus-visible:outline-none"
                  onClick={() => setAddDialogOpen(true)}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add
                </button>
              ) : undefined
            }
          />
        )}
      </div>

      {/* Tabs Section */}
      <TabsContainer
        tabs={tabs}
        mode={tabMode}
        activeTab={activeTab}
        onTabChange={wrappedHandleTabChange}
        onVisibilityChange={handleVisibilityChange}
        tabHeaderTop={actualTabHeaderTop}
        entitySlug={entitySlug}
        entityId={entityId}
        searchFilter={activeTabData?.actionTypes?.includes("search") ? searchFilter : undefined}
        addDialogOpen={activeTabData?.actionTypes?.includes("add") ? addDialogOpen : undefined}
        onAddDialogClose={() => setAddDialogOpen(false)}
      />
    </>
  );
}
