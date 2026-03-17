import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { SearchInput } from "@ui/components/form-inputs/search-input";
import { Plus } from "lucide-react";
import { TabsContainer, Tab } from "../tabs/TabsContainer";
import { TabActionsHeader } from "../tabs/TabActionsHeader";
import { PageMenu } from "../tabs/PageMenu";
import { useTabNavigation } from "@/hooks/useTabNavigation";

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

// Tab config from database
interface TabConfig {
  isDefault?: boolean; // Fallback default tab (used if no preferDefault tabs are visible)
  preferDefault?: boolean; // Preferred default tab (highest priority for initial tab selection)
  hideWhenEmpty?: boolean; // Hide tab when entity has no relevant data
  order: number;
  component: string;
  label?: string;
  icon?: { name: string; source: string };
  slug?: string; // URL-friendly identifier for the tab (e.g., "achievements", "patrons")
  // New config options
  badge?: string; // "Coming soon", "New", "Beta", etc.
  fullscreenButton?: boolean; // Show fullscreen button
  expandAlways?: boolean; // Always show expand button (e.g., Pedigree tab)
  focusMode?: boolean; // Allow collapsing header/tabs to maximize content area
  dataSource?: any; // Config-driven data loading (see TAB_DATA_SERVICE_ARCHITECTURE.md)
  // Edit tab config
  fields?: Record<string, any>; // Fields config (EditFormTab, EditChildTableTab)
  actionTypes?: string[]; // Tab action types: ["search", "addRecord", ...]
}

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
  onBeforeTabChange?: () => Promise<void>;
  onDefaultTabChange?: (isDefault: boolean) => void;
  isCreateMode?: boolean;
  onCreateNameChange?: (name: string) => void;
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
    const label = config.label ||
      config.component
        .replace(/Tab$/, '')
        .replace(/([A-Z])/g, ' $1')
        .trim();

    // Use slug from config for URL fragment, fallback to tabId
    const fragment = config.slug || tabId;

    // Build extra tabProps for edit tabs
    const tabProps: Record<string, any> = {};
    if (config.fields) tabProps.fields = config.fields;
    if (config.label) tabProps.label = config.label;

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
 * Get default tab fragment (slug) from tabs config
 *
 * Priority:
 * 1. First tab with preferDefault: true (sorted by order) - for tabs that should be default when they have data
 * 2. Tab with isDefault: true - fallback default
 * 3. First tab by order - ultimate fallback
 *
 * Note: In future, preferDefault tabs will only be selected if they have data.
 * For now, preferDefault is treated same as highest priority default.
 */
function getDefaultTabFragment(tabsConfig: Record<string, TabConfig>): string | undefined {
  // Sort all tabs by order for consistent processing
  const sortedEntries = Object.entries(tabsConfig).sort(
    ([, a], [, b]) => (a.order || 0) - (b.order || 0)
  );

  // 1. Find first tab with preferDefault: true (by order)
  // TODO: In future, also check if tab has data/is visible
  const preferDefaultEntry = sortedEntries.find(([, config]) => config.preferDefault);
  if (preferDefaultEntry) {
    const [tabId, config] = preferDefaultEntry;
    return config.slug || tabId;
  }

  // 2. Find tab with isDefault: true
  const defaultEntry = sortedEntries.find(([, config]) => config.isDefault);
  if (defaultEntry) {
    const [tabId, config] = defaultEntry;
    return config.slug || tabId;
  }

  // 3. Fallback to first tab by order
  if (sortedEntries.length > 0) {
    const [tabId, config] = sortedEntries[0];
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
  tabMode = "scroll",
  onSaveReady,
  entityType,
  onDirtyChange,
  onBeforeTabChange,
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
  const wrappedHandleTabChange = useCallback(async (fragment: string) => {
    if (onBeforeTabChange) {
      try { await onBeforeTabChange(); } catch { /* save failed, still switch */ }
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
