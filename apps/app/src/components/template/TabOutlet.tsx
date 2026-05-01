import { TabOutletRenderer } from "@/components/blocks/TabOutletRenderer";
import { TabBodySkeleton } from "@/components/shared/TabBodySkeleton";
import { useAboveFoldBlockIf } from "@/contexts/AboveFoldLoadingContext";
import type { PageConfig } from "@/types/page-config.types";
import type { SpacePermissions } from "@/types/page-menu.types";
import type { TabConfig } from "@/utils/tab-config";
import { useCallback, useMemo, useState } from "react";

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
  tabMode?: "scroll" | "tabs"; // scroll = all tabs rendered (public), tabs = only active shown (edit)

  // Edit page save orchestration (passed through to tab components via tabProps)
  onSaveReady?: (handler: () => Promise<void>) => void;
  entityType?: string;
  onDirtyChange?: (dirty: boolean) => void;
  onBeforeTabChange?: () => Promise<void>;
  onDefaultTabChange?: (isDefault: boolean) => void;
  isCreateMode?: boolean;
  onCreateNameChange?: (name: string) => void;

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
  tabMode = "scroll",
  onSaveReady,
  entityType,
  onDirtyChange,
  onBeforeTabChange,
  onDefaultTabChange,
  isCreateMode,
  onCreateNameChange,
  children,
}: TabOutletProps) {
  // Above-fold gating — TabOutlet registers a single "first-tab-area" block
  // with AboveFoldLoadingContext, satisfied as soon as ANY of the top 2
  // visible tabs reports its data ready. Following Anna's "якщо загрузився
  // перший можна відображати все" — we don't need every above-fold tab
  // ready, just the first one to land unblocks the atomic transition.
  //
  // Why register here (not in TabOutletRenderer): TabOutletRenderer mounts
  // only after isLoading flips false. If registration happened there, the
  // initial render would see allBlocksReady=true (0/0) and top blocks
  // would flip to real before slots ever registered. TabOutlet stays
  // mounted across the loading/loaded branches, so its registration is
  // stable and gates from the first commit.
  const isScrollMode = tabMode === "scroll";
  const tabCountInConfig = tabs ? Object.keys(tabs).length : 0;
  const slotEnabled = isScrollMode && tabCountInConfig > 0;

  const [slot0Ready, setSlot0ReadyState] = useState(false);
  const [slot1Ready, setSlot1ReadyState] = useState(false);
  const setSlot0Ready = useCallback((ready: boolean) => setSlot0ReadyState(ready), []);
  const setSlot1Ready = useCallback((ready: boolean) => setSlot1ReadyState(ready), []);
  const aboveFoldReadyCallbacks = useMemo<[(r: boolean) => void, (r: boolean) => void]>(
    () => [setSlot0Ready, setSlot1Ready],
    [setSlot0Ready, setSlot1Ready],
  );

  // Aggregate: ANY of the top-2 reporting ready unblocks the gate.
  // Uses any-semantics so a missing/un-wired second tab can't keep the
  // page in skeleton forever; the wired first tab carries the gate.
  const aggregateReady = slot0Ready || slot1Ready;
  useAboveFoldBlockIf("above-fold-first-tab", aggregateReady, slotEnabled);

  // Filter out tabs with hideWhenEmpty: true that have no data
  // This allows tabs to be hidden when entity lacks relevant data.
  // Computed before any early return so hook order stays stable.
  const visibleTabs = useMemo(() => {
    if (!tabs) return {} as Record<string, TabConfig>;
    const filtered: Record<string, TabConfig> = {};

    for (const [tabId, tabConfig] of Object.entries(tabs)) {
      if (!tabConfig.hideWhenEmpty) {
        filtered[tabId] = tabConfig;
        continue;
      }

      let hasData = true;

      if (tabConfig.component === "PetServicesTab" || tabConfig.component === "LitterServicesTab" || tabConfig.component === "KennelServicesTab") {
        const servicesJsonb = entity?.services as Record<string, string> | undefined;
        hasData = !!(servicesJsonb && Object.keys(servicesJsonb).length > 0);
      }

      if (tabConfig.component === "ContactBreederTab") {
        const contactRoles = entity?.contact_roles as Record<string, any> | undefined;
        hasData = !!(contactRoles?.breeder);
      }

      if (tabConfig.component === "ContactJudgeTab") {
        const contactRoles = entity?.contact_roles as Record<string, any> | undefined;
        hasData = !!(contactRoles?.judge);
      }

      if (hasData) {
        filtered[tabId] = tabConfig;
      }
    }

    return filtered;
  }, [tabs, entity?.services, entity?.contact_roles]);

  // Validate tabs config
  if (!tabs) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[TabOutlet] No tabs config provided");
    }
    return null;
  }

  // If all tabs were filtered out, don't render anything
  if (Object.keys(visibleTabs).length === 0) {
    return null;
  }

  // Skeleton element — same shape as before, used in both edit-mode loading
  // and scroll-mode loading.
  //
  // Pill row uses the full tab count so the menu skeleton matches the eventual
  // PageMenu width. In scroll mode we cap section skeletons at 2: the renderer
  // sits with display:none during loading so it doesn't drive page height,
  // and 2 above-the-fold sections are enough to cover the viewport before the
  // real per-tab skeletons mount and take over.
  const SCROLL_MODE_SECTION_CAP = 2;
  const renderSkeleton = () => {
    const allTabCount = tabs ? Object.keys(tabs).length : 4;
    const visibleSectionCount = Object.keys(visibleTabs).length || allTabCount;
    const sectionCount = Math.min(visibleSectionCount, SCROLL_MODE_SECTION_CAP);
    const PILL_WIDTHS = [72, 96, 80, 64, 88, 76];

    return (
      <div className={`${tabMode === "tabs" ? "mt-4" : "mt-9"} ${className}`}>
        <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
          {Array.from({ length: allTabCount }).map((_, i) => (
            <div
              key={i}
              className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"
              style={{ width: `${PILL_WIDTHS[i % PILL_WIDTHS.length]}px` }}
            />
          ))}
        </div>
        {tabMode !== "tabs" &&
          Array.from({ length: sectionCount }).map((_, i) => (
            <div key={`section-${i}`} className={i === 0 ? "mt-6" : "mt-12"}>
              <div className="mb-6 h-12 w-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <TabBodySkeleton />
            </div>
          ))}
      </div>
    );
  };

  // In edit mode: only render skeleton when loading (one-tab-at-a-time, no
  // above-fold coordination; the skeleton fills the area).
  if (isLoading && tabMode === "tabs") {
    return renderSkeleton();
  }

  // Scroll mode: render skeleton + TabOutletRenderer in the same parent
  // so the renderer stays mounted across the loading→loaded flip (no
  // unmount/remount that would lose tab fetch state and re-fire chunk
  // downloads). Skeleton shown when isLoading; renderer takes over
  // visually once isLoading flips false.
  //
  // We use display:none (not visibility:hidden + grid overlay) on the
  // renderer while loading so its full vertical extent (~5000px for a
  // pet with 8 tabs) doesn't push the page height during cold-load —
  // skeleton alone defines the loading-state height. display:none keeps
  // the React subtree mounted, so tab data fetches and chunk downloads
  // already in flight survive the flip.

  const showSkeletonOverlay = isScrollMode && isLoading;

  return (
    <div className={className}>
      {showSkeletonOverlay && renderSkeleton()}
      <div
        style={showSkeletonOverlay ? { display: "none" } : undefined}
        aria-hidden={showSkeletonOverlay || undefined}
      >
        <TabOutletRenderer
          tabsConfig={visibleTabs}
          pageMenuTop={pageMenuTop}
          tabHeaderTop={tabHeaderTop}
          entityId={entity?.id}
          entitySlug={entity?.slug}
          tabMode={tabMode}
          onSaveReady={onSaveReady}
          entityType={entityType}
          onDirtyChange={onDirtyChange}
          onBeforeTabChange={onBeforeTabChange}
          onDefaultTabChange={onDefaultTabChange}
          isCreateMode={isCreateMode}
          onCreateNameChange={onCreateNameChange}
          aboveFoldReadyCallbacks={isScrollMode ? aboveFoldReadyCallbacks : undefined}
        />
      </div>
    </div>
  );
}
