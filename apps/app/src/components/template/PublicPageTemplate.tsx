import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
import {
  AboveFoldLoadingProvider,
  useAllAboveFoldReady,
  useSkeletonWithDelay,
} from "@/contexts/AboveFoldLoadingContext";
import { SpaceProvider } from "@/contexts/SpaceContext";
import { useEntityFullyLoaded } from "@/hooks/useEntityFullyLoaded";
import { getPageConfig } from "@/utils/getPageConfig";
import { spaceStore } from "@breedhub/rxdb-store";
import { Signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { useStickyName } from "@/hooks/useStickyName";
import { cn } from "@ui/lib/utils";
import { useRef } from "react";

/**
 * Get default tab fragment from page config
 * Looks for TabOutlet block and finds default tab
 *
 * Priority:
 * 1. First tab with preferDefault: true (by order) - for tabs that should be default when they have data
 * 2. Tab with isDefault: true - fallback default
 * 3. First tab by order - ultimate fallback
 *
 * Note: In future, preferDefault tabs will only be selected if they have data.
 */
function getDefaultTabFragment(pageConfig: any): string | undefined {
  if (!pageConfig?.blocks) {
    return undefined;
  }

  // Find TabOutlet block which contains tabs config
  const tabOutletBlock = Object.values(pageConfig.blocks).find(
    (block: any) => block.outlet === "TabOutlet" && block.tabs
  ) as any;

  if (!tabOutletBlock?.tabs) {
    return undefined;
  }

  const tabsConfig = tabOutletBlock.tabs;

  // Sort all tabs by order for consistent processing
  const sortedTabs = Object.entries(tabsConfig).sort(
    ([, a]: [string, any], [, b]: [string, any]) =>
      (a.order || 0) - (b.order || 0)
  );

  // 1. Find first tab with preferDefault: true (by order)
  // TODO: In future, also check if tab has data/is visible
  const preferDefaultEntry = sortedTabs.find(
    ([, config]: [string, any]) => config.preferDefault === true
  );

  if (preferDefaultEntry) {
    const [tabId, config] = preferDefaultEntry as [string, any];
    return config.slug || tabId;
  }

  // 2. Find tab with isDefault: true
  const defaultEntry = sortedTabs.find(
    ([, config]: [string, any]) => config.isDefault === true
  );

  if (defaultEntry) {
    const [tabId, config] = defaultEntry as [string, any];
    return config.slug || tabId;
  }

  // 3. Fallback to first tab by order
  if (sortedTabs.length > 0) {
    const [tabId, config] = sortedTabs[0] as [string, any];
    return config.slug || tabId;
  }

  return undefined;
}

interface PublicPageTemplateProps {
  className?: string;
  isDrawerMode?: boolean;
  isFullscreenMode?: boolean; // When true, renders as fullscreen page (from pretty URL)
  spaceConfigSignal?: Signal<any>; // TODO: Define proper SpaceConfig type from DB structure
  entityType?: string; // Required to get selectedEntity from store
}

/**
 * Props for AboveFoldBlocks inner component
 */
interface AboveFoldBlocksProps {
  pageConfig: any;
  selectedEntity: any;
  spacePermissions: any;
  isDrawerMode: boolean;
  isFullscreenMode: boolean;
  entityType?: string;
  nameContainerRef: React.RefObject<HTMLDivElement>;
  nameOnTop: boolean;
  PAGE_MENU_TOP: number;
  TAB_HEADER_TOP: number;
  isEntityFullyLoaded: boolean;
}

/**
 * AboveFoldBlocks - Renders above-fold blocks with coordinated loading
 *
 * This component uses AboveFoldLoadingContext to coordinate loading:
 * - Blocks are always rendered (invisible when loading)
 * - Components register their loading state via useAboveFoldBlock
 * - When ALL blocks are ready, content becomes visible together
 */
function AboveFoldBlocks({
  pageConfig,
  selectedEntity,
  spacePermissions,
  isDrawerMode,
  isFullscreenMode,
  entityType,
  nameContainerRef,
  nameOnTop,
  PAGE_MENU_TOP,
  TAB_HEADER_TOP,
  isEntityFullyLoaded,
}: AboveFoldBlocksProps) {
  // Check if all above-fold blocks are ready (from context)
  const allBlocksReady = useAllAboveFoldReady();

  // Combined loading state: entity must be loaded AND all blocks must be ready
  const isAboveFoldLoading = !isEntityFullyLoaded || !allBlocksReady;

  // Delayed skeleton: only show skeleton if loading takes > 100ms
  // This prevents skeleton flicker for cached data that loads quickly
  const shouldShowSkeleton = useSkeletonWithDelay(isAboveFoldLoading);

  // Blocks should be invisible when no entity data at all OR skeleton is showing
  // !selectedEntity prevents "Unknown" flash on cold load (entity not fetched yet)
  // shouldShowSkeleton handles partial loading (entity exists but related data loading)
  const isBlocksLoading = !selectedEntity || shouldShowSkeleton;

  // Sort blocks by order
  const sortedBlocks = Object.entries(pageConfig.blocks).sort(
    ([, a]: [string, any], [, b]: [string, any]) => (a.order || 0) - (b.order || 0)
  );

  if (process.env.NODE_ENV === "development") {
    console.log("[AboveFoldBlocks] Rendering:", {
      isEntityFullyLoaded,
      allBlocksReady,
      isAboveFoldLoading,
      shouldShowSkeleton,
      blocksCount: sortedBlocks.length,
    });
  }

  return (
    <>
      {sortedBlocks.map(([blockId, blockConfig]: [string, any]) => {
        // CoverOutlet calculates its own dimensions + needs defaultTab for expand
        if (blockConfig.outlet === "CoverOutlet") {
          return (
            <BlockRenderer
              key={blockId}
              blockConfig={{
                ...blockConfig,
                isDrawerMode,
                defaultTab: getDefaultTabFragment(pageConfig),
                entityType,
              }}
              entity={selectedEntity}
              pageConfig={pageConfig}
              spacePermissions={spacePermissions}
              isLoading={isBlocksLoading}
            />
          );
        }

        // AvatarOutlet renders without wrapper
        if (blockConfig.outlet === "AvatarOutlet") {
          return (
            <BlockRenderer
              key={blockId}
              blockConfig={{
                ...blockConfig,
                isFullscreenMode,
                entityType,
              }}
              entity={selectedEntity}
              pageConfig={pageConfig}
              spacePermissions={spacePermissions}
              isLoading={isBlocksLoading}
            />
          );
        }

        // NameOutlet needs sticky wrapper and onTop state
        if (blockConfig.outlet === "NameOutlet") {
          return (
            <div
              key={blockId}
              ref={nameContainerRef}
              className="sticky top-0 z-30"
            >
              <BlockRenderer
                blockConfig={{
                  ...blockConfig,
                  onTop: nameOnTop,
                  linkToFullscreen: !isFullscreenMode,
                  entityType,
                }}
                entity={selectedEntity}
                pageConfig={pageConfig}
                spacePermissions={spacePermissions}
                isLoading={isBlocksLoading}
              />
            </div>
          );
        }

        // TabOutlet - Dynamic tabs from config
        if (blockConfig.outlet === "TabOutlet") {
          return (
            <BlockRenderer
              key={blockId}
              blockConfig={{
                ...blockConfig,
                pageMenuTop: PAGE_MENU_TOP,
                tabHeaderTop: TAB_HEADER_TOP,
              }}
              entity={selectedEntity}
              pageConfig={pageConfig}
              spacePermissions={spacePermissions}
              isLoading={isBlocksLoading}
            />
          );
        }

        // Default blocks (like achievements)
        return (
          <BlockRenderer
            key={blockId}
            blockConfig={blockConfig}
            entity={selectedEntity}
            className="mb-4"
            pageConfig={pageConfig}
            spacePermissions={spacePermissions}
            isLoading={isBlocksLoading}
          />
        );
      })}
    </>
  );
}

/**
 * PublicPageTemplate - Cover template demo
 *
 * Демонстрація каверу з динамічними пропорціями
 * Supports drawer and fullscreen modes
 */
export function PublicPageTemplate({
  className,
  isDrawerMode = false,
  isFullscreenMode = false,
  spaceConfigSignal,
  entityType,
}: PublicPageTemplateProps) {
  useSignals();

  // Use spaceConfig from signal
  const spaceConfig = spaceConfigSignal?.value;

  // Get page config without specifying pageType - will use isDefault or first page
  // pageType is defined IN the page config itself, not passed as prop
  const pageConfig = getPageConfig(spaceConfig);

  const spacePermissions = {
    canEdit: spaceConfig?.canEdit ?? false,
    canDelete: spaceConfig?.canDelete ?? false,
    canAdd: spaceConfig?.canAdd ?? false,
  };

  // Get selectedEntity signal from store using entityType
  // This is called INSIDE the component, after entity store is created
  const selectedEntitySignal = entityType
    ? spaceStore.getSelectedEntity(entityType)
    : null;
  const selectedEntity = selectedEntitySignal?.value;

  // Check if entity and all critical related data is fully loaded
  // This prevents "dribbling" effect where UI parts appear at different times
  const isEntityFullyLoaded = useEntityFullyLoaded(entityType, selectedEntity);

  // Refs for scroll behavior
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Sticky name bar
  const { nameContainerRef, nameOnTop, nameBlockHeight } = useStickyName(
    [pageConfig, selectedEntity]
  );
  const PAGE_MENU_TOP = nameBlockHeight > 0 ? nameBlockHeight : 0;
  const TAB_HEADER_TOP = nameOnTop ? nameBlockHeight : 0;

  return spaceConfigSignal ? (
    <SpaceProvider
      spaceConfigSignal={spaceConfigSignal}
      selectedEntitySignal={selectedEntitySignal}
    >
      <div
        className={cn(
          "size-full flex flex-col content-padding-sm",
          isDrawerMode && "bg-white dark:bg-slate-900",
          isFullscreenMode && "min-h-screen bg-white dark:bg-slate-900",
          className
        )}
      >
        <div
          ref={scrollContainerRef}
          className="flex flex-auto flex-col items-center overflow-auto"
        >
          <div
            ref={contentContainerRef}
            className="w-full max-w-3xl lg:max-w-4xl xxl:max-w-5xl"
          >
            {/* Dynamic Blocks Section */}
            {!pageConfig && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                <p className="text-red-700 font-semibold">
                  Page configuration not found
                </p>
                <p className="text-red-600 text-sm mt-1">
                  No pages configured for this space
                </p>
              </div>
            )}

            {/* Render blocks with coordinated loading via AboveFoldLoadingProvider */}
            {pageConfig && pageConfig.blocks && (
              <AboveFoldLoadingProvider>
                <AboveFoldBlocks
                  pageConfig={pageConfig}
                  selectedEntity={selectedEntity}
                  spacePermissions={spacePermissions}
                  isDrawerMode={isDrawerMode}
                  isFullscreenMode={isFullscreenMode}
                  entityType={entityType}
                  nameContainerRef={nameContainerRef}
                  nameOnTop={nameOnTop}
                  PAGE_MENU_TOP={PAGE_MENU_TOP}
                  TAB_HEADER_TOP={TAB_HEADER_TOP}
                  isEntityFullyLoaded={isEntityFullyLoaded}
                />
              </AboveFoldLoadingProvider>
            )}
          </div>
        </div>

        {/* Scroll to top button */}
        <ScrollToTopButton
          scrollContainer={scrollContainerRef.current}
          contentContainer={contentContainerRef.current}
        />
      </div>
    </SpaceProvider>
  ) : (
    <div className="p-8 text-center">
      <p className="text-red-600">Space configuration signal is required</p>
      <p className="text-sm text-slate-500 mt-2">
        Make sure spaceConfigSignal is passed to PublicPageTemplate
      </p>
    </div>
  );
}
