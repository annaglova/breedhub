import { useNotedEntityIds } from "@/hooks/useNotedEntityIds";
import { noteEditDialogStore } from "@/stores/note-edit-dialog.store";
import { useSpaceBrowseState } from "@/hooks/space/useSpaceBrowseState";
import { useCreateEntityNavigation } from "@/hooks/space/useCreateEntityNavigation";
import { useSpaceLayoutState } from "@/hooks/space/useSpaceLayoutState";
import { useTotalCountCache } from "@/hooks/space/useTotalCountCache";
import { useEntitySelection } from "@/hooks/space/useEntitySelection";
import { useFilterManagement } from "@/hooks/space/useFilterManagement";
import type { ResolvedReadFromConfig } from "@/hooks/space/use-entities.read-from";
import { useQuickFilterReadFrom } from "@/hooks/space/use-quick-filter-read-from";
import { spaceStore } from "@breedhub/rxdb-store";
import { Signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { TooltipProvider } from "@ui/components/tooltip";
import { cn } from "@ui/lib/utils";
import { useCallback, useMemo } from "react";
import {
  Outlet,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { getComponent } from "./componentRegistry";
import { SpaceDrawer } from "./SpaceDrawer";
import { SpaceListShell } from "./SpaceListShell";

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
    readFrom?: ResolvedReadFromConfig;
    spaceId?: string;
    activeScope?: string | null;
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

  // Preload "my notes" entity ids for this space so list cards can show
  // a bookmark indicator without each card running its own query.
  useNotedEntityIds(config?.entitySchemaName ?? "");

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
    handleClearAllFilters,
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

  // Active quick-filter scope (e.g. "owned") from URL ?scope=. Resolver picks
  // the mode whose slug matches, or the mode with isDefault:true if no scope
  // is in the URL. The resolved readFrom is passed alongside filters/orderBy
  // to useEntitiesHook → spaceStore.applyFilters, which knows to source IDs
  // from the mapping table instead of scanning pet directly.
  const activeScope = searchParams.get("scope");
  const readFrom = useQuickFilterReadFrom(config?.quickFilters, activeScope);

  // 🆕 ID-First: useEntities with orderBy + filters enables ID-First pagination
  const {
    data,
    isLoading,
    error,
    hasMore = false,
    isLoadingMore = false,
    loadMore,
  } = useEntitiesHook({
    recordsCount: recordsCount,
    from: 0,
    filters,
    orderBy,
    readFrom,
    spaceId: config?.id,
    activeScope,
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

  const handleCreateNew = useCreateEntityNavigation({
    entitySchemaName: config.entitySchemaName,
    filterFields,
    filters,
    navigate,
  });
  // List-empty signal for the drawer Outlet: true when the space finished
  // loading and the filtered result set is zero. Lets the right-pane template
  // swap its "loading" skeleton for an "idle / nothing to show" affordance.
  //
  // We key on `allEntities.length`, NOT `totalCount`: for spaces without a
  // `totalFilterKey` (e.g. /breeds), `totalCount` reflects the unfiltered
  // server-side count and stays >0 even when an applied URL filter narrows
  // the local result set to zero — leaving the drawer stuck on a skeleton.
  const drawerOutletContext = useMemo(
    () => ({
      listIsEmpty: !isInitialLoad && allEntities.length === 0 && !isLoading,
    }),
    [isInitialLoad, allEntities.length, isLoading],
  );
  const drawerContent = children || <Outlet context={drawerOutletContext} />;

  // Quick-filter strip — render the registered component (e.g. PetOwnerBreederFilter)
  // with the space's quickFilters config. Component decides its own UI; the
  // chip → URL ?scope= flow is its responsibility. SpaceHeader just hosts the slot.
  const quickFiltersSlot = useMemo(() => {
    const qf = config?.quickFilters;
    if (!qf?.component) return undefined;
    const QuickFilterComponent = getComponent(qf.component);
    if (!QuickFilterComponent) {
      console.warn(`[SpaceComponent] quickFilters.component "${qf.component}" not in registry`);
      return undefined;
    }
    return <QuickFilterComponent config={qf} />;
  }, [config?.quickFilters]);

  const viewChangerConfigs = useMemo(
    () =>
      finalConfig.viewConfigs?.map((viewConfig: {
        viewType: string;
        icon?: string;
        tooltip?: string;
      }) => ({
        id: viewConfig.viewType,
        icon: viewConfig.icon,
        tooltip: viewConfig.tooltip,
      })) || [],
    [finalConfig.viewConfigs],
  );
  const spaceViewConfig = useMemo(
    () => ({
      viewType: viewMode,
      component: currentViewConfig?.component || "GenericListCard",
      itemHeight: currentViewConfig?.itemHeight || 68,
      dividers: currentViewConfig?.dividers ?? true,
      overscan: currentViewConfig?.overscan || 3,
      skeletonCount: Math.ceil(recordsCount / 2),
      cardClickAction: currentViewConfig?.cardClickAction,
      fields: currentViewConfig?.fields,
    }),
    [currentViewConfig, recordsCount, viewMode],
  );

  const cardClickAction = currentViewConfig?.cardClickAction;
  const handleEntityClickConfigured = useCallback(
    (entity: T) => {
      if (cardClickAction === "none") return;
      if (cardClickAction === "edit") {
        if (config?.entitySchemaName === "note") {
          noteEditDialogStore.openFor({
            noteId: (entity as any).id,
            initialText: (entity as any).text ?? "",
          });
          return;
        }
      }
      handleEntityClick(entity as any);
    },
    [cardClickAction, config?.entitySchemaName, handleEntityClick],
  );
  const listShellClassName = cn(
    "relative flex flex-col cursor-default h-full min-w-0 overflow-hidden",
    needCardClass ? "fake-card" : "card-surface",
    "transition-all duration-300 ease-out",
    !isGridView && drawerMode === "side-transparent" && "mr-[46.25rem]",
  );
  const totalFilterValue =
    config.totalFilterKey && filters ? filters[config.totalFilterKey] : null;
  const searchPlaceholder =
    config?.naming?.searchPlaceholder ||
    `Search ${config?.label || "entities"}...`;
  const showDrawerBackdrop =
    !isGridView && (drawerMode === "side" || drawerMode === "over");

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
  const showFullscreen = Boolean(
    (isFullscreen && initialSelectedEntityId) || createMode,
  );

  // Show loading state only on initial load
  // SKIP loading state when initialSelectedEntityId is provided (pretty URL mode)
  // In this case, entity is fetched separately via fetchAndSelectEntity
  // and we render children (fullscreen content) directly
  if (isInitialLoad && isLoading && !initialSelectedEntityId && !createMode) {
    return (
      <div className="relative h-full overflow-hidden">
        <SpaceListShell
          className={cn(listShellClassName, "transition-none")}
          headerProps={{
            title: finalConfig.title,
            viewTypes: finalConfig.viewTypes || [],
            viewConfigs: viewChangerConfigs,
            onViewChange: handleViewChange,
            entitySchemaName: config.entitySchemaName,
            entitiesCount: 0,
            total: 0,
            recordsCount,
            totalFilterKey: config.totalFilterKey,
            totalFilterValue,
            loading: true,
            searchPlaceholder,
            searchValue: "",
            canAdd: finalConfig.canAdd,
            needCardClass,
            sortOptions,
            defaultSortOption: selectedSortOption,
            filterFields,
            filters: [],
            currentFilterValues: {},
            spaceSlug: config.slug,
            search: config.search !== false,
            quickFiltersSlot,
          }}
          viewConfig={spaceViewConfig}
          entities={[]}
          isLoading={true}
        />

        <SpaceDrawer
          drawerMode={drawerMode}
          isDrawerOpen={false}
          isGridView={isGridView}
          needCardClass={needCardClass}
          showFullscreen={false}
        >
          {drawerContent}
        </SpaceDrawer>
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
          <SpaceListShell
            className={listShellClassName}
            headerProps={{
              title: finalConfig.title,
              viewTypes: finalConfig.viewTypes || [],
              viewConfigs: viewChangerConfigs,
              onViewChange: handleViewChange,
              entitySchemaName: config.entitySchemaName,
              entitiesCount: spaceStore.configReady.value ? allEntities.length : 0,
              total: spaceStore.configReady.value ? totalCount : 0,
              recordsCount,
              totalFilterKey: config.totalFilterKey,
              totalFilterValue,
              isInitialLoad,
              searchPlaceholder,
              searchValue,
              onSearchChange: setSearchValue,
              canAdd: finalConfig.canAdd,
              onCreateNew: handleCreateNew,
              needCardClass,
              sortOptions,
              defaultSortOption: selectedSortOption,
              onSortChange: handleSortChange,
              filterFields,
              filters: activeFilters,
              onFilterRemove: handleFilterRemove,
              onFiltersApply: handleFiltersApply,
              currentFilterValues,
              showCounter: spaceStore.configReady.value,
              spaceSlug: config.slug,
              search: config.search !== false,
              quickFiltersSlot,
            }}
            viewConfig={spaceViewConfig}
            entities={allEntities}
            selectedId={isGridView ? undefined : (selectedEntityId ?? undefined)}
            onEntityClick={handleEntityClickConfigured}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            isLoading={isLoading}
            searchQuery={debouncedSearchValue}
            activeFilters={activeFilters}
            onFilterRemove={handleFilterRemove}
            onClearAllFilters={handleClearAllFilters}
            entityLabelPlural={finalConfig.title}
            bottomSpacerClassName="hidden sm:block"
            showBackdrop={showDrawerBackdrop}
            isBackdropVisible={isDrawerOpen}
            backdropRounded={isMoreThanLG}
            onBackdropClick={handleBackdropClick}
          />
        )}

        <SpaceDrawer
          drawerMode={drawerMode}
          isDrawerOpen={isDrawerOpen}
          isGridView={isGridView}
          needCardClass={needCardClass}
          showFullscreen={showFullscreen}
        >
          {drawerContent}
        </SpaceDrawer>
      </div>
    </TooltipProvider>
  );
}
