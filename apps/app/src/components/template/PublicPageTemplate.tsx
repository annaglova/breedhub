import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
import {
  AboveFoldLoadingProvider,
  useAllAboveFoldReady,
  useSkeletonWithDelay,
} from "@/contexts/AboveFoldLoadingContext";
import { SpaceProvider } from "@/contexts/SpaceContext";
import { useEntityFullyLoaded } from "@/hooks/useEntityFullyLoaded";
import { useSpaceTemplateContext } from "@/hooks/useSpaceTemplateContext";
import { getDefaultTabFragment, getTabsConfigFromPage } from "@/utils/tab-config";
import { Signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { useStickyName } from "@/hooks/useStickyName";
import { cn } from "@ui/lib/utils";
import { useRef } from "react";
import type { BlockConfig, PageConfig } from "@/types/page-config.types";

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
  pageConfig: PageConfig;
  defaultTabFragment?: string;
  selectedEntity: any;
  spacePermissions: any;
  isDrawerMode: boolean;
  isFullscreenMode: boolean;
  entityType?: string;
  nameContainerRef: React.RefObject<HTMLDivElement | null>;
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
  defaultTabFragment,
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
    ([, a], [, b]) => (a.order || 0) - (b.order || 0)
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
      {sortedBlocks.map(([blockId, blockConfig]: [string, BlockConfig]) => {
        // CoverOutlet calculates its own dimensions + needs defaultTab for expand
        if (blockConfig.outlet === "CoverOutlet") {
          return (
            <BlockRenderer
              key={blockId}
              blockConfig={{
                ...blockConfig,
                isDrawerMode,
                defaultTab: defaultTabFragment,
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

  const {
    pageConfig,
    selectedEntity,
    selectedEntitySignal,
    spacePermissions,
  } = useSpaceTemplateContext({
    spaceConfigSignal,
    entityType,
  });
  const tabsConfig = getTabsConfigFromPage(pageConfig);
  const defaultTabFragment = getDefaultTabFragment(tabsConfig);

  // Check if entity and all critical related data is fully loaded
  // This prevents "dribbling" effect where UI parts appear at different times
  const isEntityFullyLoaded = useEntityFullyLoaded(entityType, selectedEntity);

  // Refs for scroll behavior
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Sticky name bar
  const { nameContainerRef, nameOnTop, nameBlockHeight } = useStickyName({
    deps: [pageConfig, selectedEntity],
  });
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
          isFullscreenMode && "bg-white dark:bg-slate-900",
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
                  defaultTabFragment={defaultTabFragment}
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
