import { useSpaceBrowseState } from "@/hooks/space/useSpaceBrowseState";
import { useSpaceLayoutState } from "@/hooks/space/useSpaceLayoutState";
import { useTotalCountCache } from "@/hooks/space/useTotalCountCache";
import { useEntitySelection } from "@/hooks/space/useEntitySelection";
import { useFilterManagement } from "@/hooks/space/useFilterManagement";
import {
  spaceStore,
  getDatabase,
} from "@breedhub/rxdb-store";
import { getLabelForValue, normalizeForUrl } from "@/components/space/utils/filter-url-helpers";
import { Signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { Button } from "@ui/components/button";
import { SearchInput } from "@ui/components/form-inputs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib/utils";
import { Plus } from "lucide-react";
import { useCallback, useMemo } from "react";
import {
  Outlet,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { EntitiesCounter } from "./EntitiesCounter";
import { FiltersSection } from "./filters";
import { SpaceView } from "./SpaceView";
import { ViewChanger } from "./ViewChanger";

interface SpaceComponentProps<T> {
  configSignal: Signal<any>; // TODO: Define proper SpaceConfig type from DB structure
  useEntitiesHook: (params: {
    recordsCount: number;
    from: number;
    filters?: Record<string, any>;
    orderBy?: {
      field: string;
      direction: "asc" | "desc";
      parameter?: string;
      tieBreaker?: {
        field: string;
        direction: string;
        parameter?: string;
      };
    };
  }) => {
    data: { entities: T[]; total: number } | undefined;
    isLoading: boolean;
    error: Error | null;
    isFetching: boolean;
    hasMore?: boolean;
    isLoadingMore?: boolean;
    loadMore?: () => Promise<void>;
  };
  // Pre-selected entity ID (from SlugResolver for pretty URLs)
  initialSelectedEntityId?: string;
  // Pre-selected partition ID (for partitioned tables like pet - used for partition pruning)
  initialSelectedPartitionId?: string;
  // Pre-selected partition field name (e.g., 'breed_id') - fallback for cold load when entitySchemas not ready
  initialSelectedPartitionField?: string;
  // Pre-selected entity slug (from SlugResolver for pretty URLs - for display/navigation)
  initialSelectedSlug?: string;
  // Children to render in drawer (when initialSelectedEntityId is provided)
  children?: React.ReactNode;
  // Create mode - fullscreen without entity (from CreatePageResolver)
  createMode?: boolean;
}

export function SpaceComponent<T extends { id: string }>({
  configSignal,
  useEntitiesHook,
  initialSelectedEntityId,
  initialSelectedPartitionId,
  initialSelectedPartitionField,
  initialSelectedSlug,
  children,
  createMode,
}: SpaceComponentProps<T>) {
  useSignals();


  // Use the reactive config value from signal
  const config = configSignal.value;

  // For convenience, use same variable name throughout component
  const finalConfig = config;

  // Navigation and routing
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    currentViewConfig,
    debouncedSearchValue,
    filterFields,
    filtersStorageKey,
    handleSortChange,
    handleViewChange,
    isGridView,
    mainFilterField,
    mainFilterFields,
    orderBy,
    recordsCount,
    searchUrlSlug,
    searchValue,
    selectedSortOption,
    setSearchValue,
    sortOptions,
    viewMode,
  } = useSpaceBrowseState({
    config,
    createMode,
    initialSelectedEntityId,
    searchParams,
    setSearchParams,
  });

  // Filter management: build from URL, persistence, apply/remove
  const {
    filters,
    activeFilters,
    currentFilterValues,
    handleFiltersApply,
    handleFilterRemove,
  } = useFilterManagement({
    searchParams,
    setSearchParams,
    filterFields,
    mainFilterField,
    mainFilterFields,
    searchUrlSlug,
    filtersStorageKey,
    initialSelectedEntityId,
    createMode,
  });

  // 🆕 ID-First: useEntities with orderBy + filters enables ID-First pagination
  const {
    data,
    isLoading,
    error,
    isFetching,
    hasMore = false,
    isLoadingMore = false,
    loadMore,
  } = useEntitiesHook({
    recordsCount: recordsCount,
    from: 0,
    filters,
    orderBy,
  });

  // Get all entities directly from data (no accumulation needed)
  const allEntities = data?.entities || [];

  // Check if fullscreen mode is active (from store - set by SlugResolver or expand button)
  const isFullscreen = spaceStore.isFullscreen.value;
  const { drawerMode, isMoreThan2XL, isMoreThanLG, needCardClass } =
    useSpaceLayoutState({
      isFullscreen,
    });

  // Entity selection: URL↔Store sync, drawer, entity click
  const {
    selectedEntityId,
    isDrawerOpen,
    setIsDrawerOpen,
    handleEntityClick,
    handleBackdropClick,
  } = useEntitySelection({
    config,
    allEntities,
    isLoading,
    isGridView,
    isMoreThan2XL,
    initialSelectedEntityId,
    initialSelectedSlug,
    initialSelectedPartitionId,
    initialSelectedPartitionField,
    createMode,
  });


  // Cache totalCount to localStorage with TTL
  const { totalCount, isInitialLoad } = useTotalCountCache({
    data,
    isLoading,
    searchParams,
    entitySchemaName: config.entitySchemaName,
    totalFilterKey: config.totalFilterKey,
    filters,
  });

  // View change is handled by RxDB replication automatically
  // No need to reset state here


  // 🆕 ID-First: Use loadMore from hook (with cursor pagination)
  const handleLoadMore = useCallback(async () => {
    if (loadMore) {
      await loadMore();
    }
  }, [loadMore]);


  const handleCreateNew = useCallback(async () => {
    const params = new URLSearchParams({ entity: config.entitySchemaName });

    // Build slug-based URL params (e.g., breed=chihuahua instead of breed_id=UUID)
    if (filters) {
      try {
        const rxdb = await getDatabase();
        for (const [fieldId, value] of Object.entries(filters)) {
          if (!value) continue;
          const fieldConfig = filterFields.find((f: any) => f.id === fieldId);
          const urlKey = fieldConfig?.slug || fieldId.replace(/^[^_]+_field_/, '');
          const label = await getLabelForValue(fieldConfig, String(value), rxdb as any);
          params.set(urlKey, normalizeForUrl(label));
        }
      } catch {
        // Fallback: use raw IDs if resolution fails
        for (const [fieldId, value] of Object.entries(filters)) {
          if (value) {
            const dbName = fieldId.replace(/^[^_]+_field_/, '');
            params.set(dbName, String(value));
          }
        }
      }
    }

    navigate(`/new?${params.toString()}`);
  }, [config.entitySchemaName, filters, filterFields, navigate]);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">
          Error loading{" "}
          {config?.naming?.plural?.other || config?.label || "entities"}. Please
          try again later.
        </p>
      </div>
    );
  }

  // Fullscreen mode flag - used to control drawer size and hide space list
  const showFullscreen = (isFullscreen && initialSelectedEntityId) || createMode;

  // Show loading state only on initial load
  // SKIP loading state when initialSelectedEntityId is provided (pretty URL mode)
  // In this case, entity is fetched separately via fetchAndSelectEntity
  // and we render children (fullscreen content) directly
  if (isInitialLoad && isLoading && !initialSelectedEntityId && !createMode) {
    return (
      <div className="relative h-full overflow-hidden">
        <div
          className={cn(
            "flex flex-col cursor-default h-full overflow-hidden",
            needCardClass ? "fake-card" : "card-surface",
            // For side-transparent mode (xxl+): reserve space for drawer (only for list views)
            !isGridView && drawerMode === "side-transparent" && "mr-[46.25rem]",
          )}
        >
          <div
            className="z-20 flex flex-col justify-between border-b border-surface-border space-padding"
          >
            <div className="w-full">
              <div className="flex w-full justify-between">
                <h1 className="text-3xl sm:text-4xl">{finalConfig.title}</h1>
                <ViewChanger
                  views={finalConfig.viewTypes || []}
                  viewConfigs={finalConfig.viewConfigs?.map((v: any) => ({
                    id: v.viewType,
                    icon: v.icon,
                    tooltip: v.tooltip,
                  }))}
                  onViewChange={handleViewChange}
                />
              </div>
              <EntitiesCounter
                entitiesCount={0}
                total={0}
                entityType={config.entitySchemaName}
                initialCount={recordsCount}
                totalFilterKey={config.totalFilterKey}
                totalFilterValue={
                  config.totalFilterKey && filters
                    ? filters[config.totalFilterKey]
                    : null
                }
              />
            </div>

            {/* Search + Add button */}
            <div className="mt-4 flex items-center space-x-3">
              <SearchInput
                value=""
                placeholder={
                  config?.naming?.searchPlaceholder ||
                  `Search ${config?.label || "entities"}...`
                }
                pill
                disabled
                showClearButton={false}
                className="w-full"
              />

              {finalConfig.canAdd && (
                <Button
                  className={cn(
                    "rounded-full font-bold flex-shrink-0",
                    needCardClass
                      ? "h-[2.25rem] px-4"
                      : "h-[2.25rem] w-[2.25rem] flex items-center justify-center",
                  )}
                >
                  <Plus className="h-4 w-4 flex-shrink-0" />
                  {needCardClass && (
                    <span className="text-base font-semibold">Add</span>
                  )}
                </Button>
              )}
            </div>

            {/* Filters */}
            <FiltersSection
              className="mt-4"
              sortOptions={sortOptions}
              defaultSortOption={selectedSortOption}
              onSortChange={() => {}}
              filterFields={filterFields}
              filters={[]}
              onFilterRemove={() => {}}
              onFiltersApply={() => {}}
              currentFilterValues={{}}
            />
          </div>

          {/* SpaceView with skeletons */}
          <div className="relative flex-1 overflow-hidden">
              <SpaceView
                viewConfig={{
                  viewType: viewMode,
                  component: currentViewConfig?.component || "GenericListCard",
                  itemHeight: currentViewConfig?.itemHeight || 68,
                  dividers: currentViewConfig?.dividers ?? true,
                  overscan: currentViewConfig?.overscan || 3,
                  skeletonCount: Math.ceil(recordsCount / 2),
                }}
              entities={[]}
              isLoading={true}
            />
            <div
              className="bg-card-ground w-full absolute bottom-0"
              style={{ height: "var(--content-padding)" }}
            />
          </div>
        </div>

        {/* Drawer for side-transparent mode - always visible on xxl+ (only for list views) */}
        {!isGridView && drawerMode === "side-transparent" && (
          <div
            className={cn(
              "absolute top-0 right-0 h-full z-40",
              "w-[45rem]",
              needCardClass ? "fake-card" : "card-surface",
              "rounded-l-xl overflow-hidden",
            )}
          >
            {/* PublicPageTemplate handles its own loading skeletons via outlets */}
            {children || <Outlet />}
          </div>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "relative h-full overflow-hidden",
          needCardClass && "rounded-xl",
        )}
      >
        {/* Main Content - hidden when fullscreen */}
        {!showFullscreen && (
          <div
            className={cn(
              "relative flex flex-col cursor-default h-full overflow-hidden",
              needCardClass ? "fake-card" : "card-surface",
              "transition-all duration-300 ease-out",
              // For side-transparent mode (xxl+): reserve space for drawer (only for list views)
              // Grid views don't have side drawer - they go directly to fullscreen
              !isGridView &&
                drawerMode === "side-transparent" &&
                "mr-[46.25rem]", // 45rem + 1.25rem gap
            )}
          >
            {/* Header */}
            <div
              className="z-20 flex flex-col justify-between border-b border-surface-border space-padding"
            >
              <div className="w-full">
                <div className="flex w-full justify-between">
                  <h1 className="text-3xl sm:text-4xl">{finalConfig.title}</h1>
                  <ViewChanger
                    views={finalConfig.viewTypes || []}
                  viewConfigs={finalConfig.viewConfigs?.map((v: any) => ({
                      id: v.viewType,
                      icon: v.icon,
                      tooltip: v.tooltip,
                    }))}
                    onViewChange={handleViewChange}
                  />
                </div>
                {spaceStore.configReady.value && (
                  <EntitiesCounter
                    entitiesCount={allEntities.length}
                    total={totalCount}
                    entityType={config.entitySchemaName}
                    initialCount={recordsCount}
                    totalFilterKey={config.totalFilterKey}
                    totalFilterValue={
                      config.totalFilterKey && filters
                        ? filters[config.totalFilterKey]
                        : null
                    }
                  />
                )}
              </div>

              {/* Main actions */}
              <div className="mt-4 flex items-center space-x-3">
                {/* Search */}
                <SearchInput
                  value={searchValue}
                  onValueChange={setSearchValue}
                  placeholder={
                    config?.naming?.searchPlaceholder ||
                    `Search ${config?.label || "entities"}...`
                  }
                  pill
                  className="w-full"
                />

                {/* Add button */}
                {finalConfig.canAdd && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleCreateNew}
                        className={cn(
                          "rounded-full font-bold flex-shrink-0",
                          needCardClass
                            ? "h-[2.25rem] px-4"
                            : "h-[2.25rem] w-[2.25rem] flex items-center justify-center",
                        )}
                      >
                        <Plus className="h-4 w-4 flex-shrink-0" />
                        {needCardClass && (
                          <span className="text-base font-semibold">Add</span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Add new record</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Filters */}
              <FiltersSection
                className="mt-4"
                sortOptions={sortOptions}
                defaultSortOption={selectedSortOption}
                onSortChange={handleSortChange}
                filterFields={filterFields}
                filters={activeFilters}
                onFilterRemove={handleFilterRemove}
                onFiltersApply={handleFiltersApply}
                currentFilterValues={currentFilterValues}
              />
            </div>

            {/* Content Scroller */}
            <div className="relative flex-1 overflow-hidden">
              <SpaceView
                viewConfig={{
                  viewType: viewMode,
                  component: currentViewConfig?.component || "GenericListCard",
                  itemHeight: currentViewConfig?.itemHeight || 68,
                  dividers: currentViewConfig?.dividers ?? true,
                  overscan: currentViewConfig?.overscan || 3,
                  skeletonCount: Math.ceil(recordsCount / 2),
                }}
                entities={allEntities}
                selectedId={isGridView ? undefined : (selectedEntityId ?? undefined)}
                onEntityClick={handleEntityClick}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                isLoading={isLoading}
                searchQuery={debouncedSearchValue}
              />
              {/* Bottom spacer like in Angular - hidden on mobile where footer nav is visible */}
              <div
                className="hidden sm:block bg-card-ground w-full absolute bottom-0"
                style={{ height: "var(--content-padding)" }}
              />
            </div>

            {/* Backdrop for drawer (only for side/over modes inside content, not in grid view) */}
            {!isGridView &&
              (drawerMode === "side" || drawerMode === "over") && (
                <div
                  className={cn(
                    "absolute inset-0 z-30 transition-opacity duration-300",
                    isMoreThanLG && "rounded-xl",
                    isDrawerOpen
                      ? "bg-black/40 opacity-100"
                      : "opacity-0 pointer-events-none",
                  )}
                  onClick={handleBackdropClick}
                />
              )}
          </div>
        )}

        {/* Unified Drawer - single element for all modes with smooth transitions */}
        {/* For grid view: only render when fullscreen. For list view: normal drawer behavior */}
        {(isGridView
          ? showFullscreen
          : showFullscreen ||
            isDrawerOpen ||
            drawerMode === "side-transparent") && (
          <div
            className={cn(
              "absolute top-0 bottom-0 right-0 z-40",
              "transition-all duration-300 ease-out",
              // Width based on mode and fullscreen state - use percentages for smooth transition
              (showFullscreen || drawerMode === "over") && "w-full",
              !showFullscreen && drawerMode === "side" && "w-[70%] xl:w-[60%]",
              !showFullscreen &&
                drawerMode === "side-transparent" &&
                "w-[45rem]",
              // Background
              showFullscreen
                ? needCardClass
                  ? "fake-card"
                  : "card-surface"
                : drawerMode === "side-transparent"
                  ? needCardClass
                    ? "fake-card"
                    : "card-surface"
                  : "bg-white",
              // Rounded corners
              showFullscreen && "md:rounded-xl overflow-hidden",
              !showFullscreen &&
                drawerMode !== "over" &&
                (needCardClass
                  ? "rounded-xl overflow-hidden"
                  : "rounded-l-xl overflow-hidden"),
              // Shadow for side mode only
              !showFullscreen && drawerMode === "side" && "shadow-xl",
              // Show/hide animation (always visible in fullscreen or side-transparent for list views)
              showFullscreen || drawerMode === "side-transparent"
                ? "opacity-100"
                : isDrawerOpen
                  ? "opacity-100"
                  : "translate-x-full opacity-0 pointer-events-none",
            )}
          >
            <div className="h-full overflow-auto">{children || <Outlet />}</div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
