import { mediaQueries } from "@/config/breakpoints";
import { SpaceConfig } from "@/core/space/types";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { spaceStore, getDatabase } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib/utils";
import { Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { EntitiesCounter } from "./EntitiesCounter";
import { FiltersSection } from "./filters";
import { SpaceView } from "./SpaceView";
import { ViewChanger } from "./ViewChanger";
import { getLabelForValue, normalizeForUrl, getValueForLabel } from "./utils/filter-url-helpers";

interface SpaceComponentProps<T> {
  config: SpaceConfig<T>;
  useEntitiesHook: (params: { rows: number; from: number }) => {
    data: { entities: T[]; total: number } | undefined;
    isLoading: boolean;
    error: Error | null;
    isFetching: boolean;
  };
}

export function SpaceComponent<T extends { Id: string }>({
  config,
  useEntitiesHook,
}: SpaceComponentProps<T>) {
  useSignals();

  // Data loading state
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchValue, setSearchValue] = useState("");

  // Get reactive config signal from spaceStore
  const configSignal = useMemo(
    () => spaceStore.getSpaceConfigSignal(config.entitySchemaName),
    [config.entitySchemaName]
  );

  // Use the reactive config value
  const dynamicConfig = configSignal.value;

  // Fallback to static config if store not ready
  const finalConfig = dynamicConfig || {
    title: config.naming.title,
    canAdd: config.canAdd,
    canEdit: config.canEdit,
    canDelete: config.canDelete,
    viewTypes: undefined,
    viewConfigs: undefined,
  };

  // Navigation and routing
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = searchParams.get("view") || config.viewConfig[0].id;

  // Get rows from view config (динамічно!)
  const rowsPerPage = useMemo(() => {
    if (!spaceStore.configReady.value) {
      return 60; // Use 60 as default for breed/list instead of 50
    }
    const rows = spaceStore.getViewRows(config.entitySchemaName, viewMode);
    return rows;
  }, [config.entitySchemaName, viewMode, spaceStore.configReady.value]);

  // Get sort options from view config
  const sortOptions = useMemo(() => {
    if (!spaceStore.configReady.value) {
      return [];
    }
    return spaceStore.getSortOptions(config.entitySchemaName, viewMode);
  }, [config.entitySchemaName, viewMode, spaceStore.configReady.value]);

  // Get filter fields from view config
  const filterFields = useMemo(() => {
    if (!spaceStore.configReady.value) {
      return [];
    }
    return spaceStore.getFilterFields(config.entitySchemaName, viewMode);
  }, [config.entitySchemaName, viewMode, spaceStore.configReady.value]);

  // Find default sort option
  const defaultSortOption = useMemo(() => {
    return sortOptions.find(option => option.isDefault) || sortOptions[0];
  }, [sortOptions]);

  // 🆕 Read sort ID from URL or use default
  const sortId = searchParams.get('sort');

  const selectedSortOption = useMemo(() => {
    // If URL param exists, find matching sort option by ID
    if (sortId) {
      const found = sortOptions.find(option => option.id === sortId);
      if (found) return found;
    }
    // Otherwise use default
    return defaultSortOption;
  }, [sortId, sortOptions, defaultSortOption]);

  // 🧹 Cleanup legacy URL params on mount
  useEffect(() => {
    const hasLegacyParams = searchParams.has('sortBy') ||
                           searchParams.has('sortDir') ||
                           searchParams.has('sortParam');

    if (hasLegacyParams) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('sortBy');
      newParams.delete('sortDir');
      newParams.delete('sortParam');
      setSearchParams(newParams, { replace: true }); // replace to not add history entry
    }
  }, [searchParams, setSearchParams]);

  // 🎯 Set default sort in URL if no sort param exists
  useEffect(() => {
    const hasSortParam = searchParams.has('sort');

    // If no sort param and we have a default sort option, add it to URL
    if (!hasSortParam && defaultSortOption?.id) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('sort', defaultSortOption.id);
      setSearchParams(newParams, { replace: true }); // replace to not add history entry
    }
  }, [searchParams, setSearchParams, defaultSortOption]);

  // 🆕 Memoize orderBy to prevent infinite loop (new object on each render)
  const orderBy = useMemo(() => {
    if (!selectedSortOption?.field) {
      return { field: 'name', direction: 'asc' as const }; // Fallback to name if no sort config
    }

    return {
      field: selectedSortOption.field,
      direction: selectedSortOption.direction as 'asc' | 'desc',
      ...(selectedSortOption.parameter && { parameter: selectedSortOption.parameter })
    };
  }, [selectedSortOption]);

  // 🆕 Build filters object from URL params (excluding system params)
  // Slug (type) in URL → normalized field name (pet_type_id) for queries
  // Label (dogs) in URL → ID (uuid) for queries
  // Same pattern as orderBy: slug for URL, normalized field name for queries
  const [filters, setFilters] = useState<Record<string, any> | undefined>(undefined);

  useEffect(() => {
    const buildFilters = async () => {
      // If filterFields not loaded yet, don't build filters (wait for config to load)
      // This prevents using URL slugs directly before field configs are available
      if (filterFields.length === 0) {
        console.log('[SpaceComponent] filterFields not loaded yet, skipping filter build');
        setFilters(undefined);
        return;
      }

      console.log('[SpaceComponent] Building filters from URL params:', Array.from(searchParams.entries()));

      const filterObj: Record<string, any> = {};
      const reservedParams = ['sort', 'view', 'sortBy', 'sortDir', 'sortParam'];

      try {
        const rxdb = await getDatabase();

        // Process all URL params
        const promises: Promise<void>[] = [];
        searchParams.forEach((urlValue, urlKey) => {
          if (!reservedParams.includes(urlKey) && urlValue) {
            promises.push(
              (async () => {
                console.log('[SpaceComponent] Processing URL param:', urlKey, '=', urlValue);

                // Try to find field by slug first (e.g., "type"), then by field ID
                let fieldConfig = filterFields.find(f => f.slug === urlKey);
                if (!fieldConfig) {
                  fieldConfig = filterFields.find(f => f.id === urlKey);
                }

                console.log('[SpaceComponent] Field config found:', fieldConfig?.id, fieldConfig);

                if (fieldConfig) {
                  // Try to convert label → ID (e.g., "dogs" → uuid)
                  const valueId = await getValueForLabel(fieldConfig, urlValue, rxdb);

                  if (valueId) {
                    // Found ID by label - use it
                    filterObj[fieldConfig.id] = valueId;
                    console.log('[SpaceComponent] ✅ Filter:', urlKey, '→', fieldConfig.id, '=', valueId, `(from label: ${urlValue})`);
                  } else {
                    // Couldn't find by label - maybe it's already an ID, use as-is
                    filterObj[fieldConfig.id] = urlValue;
                    console.log('[SpaceComponent] ⚠️ Filter (fallback):', urlKey, '→', fieldConfig.id, '=', urlValue);
                  }
                } else {
                  console.warn('[SpaceComponent] ❌ Unknown filter param:', urlKey, '- skipping');
                }
              })()
            );
          }
        });

        await Promise.all(promises);

        console.log('[SpaceComponent] Final filterObj:', filterObj);
        const finalFilters = Object.keys(filterObj).length > 0 ? filterObj : undefined;
        console.log('[SpaceComponent] Setting filters:', finalFilters);
        setFilters(finalFilters);
      } catch (error) {
        console.error('[SpaceComponent] Error building filters:', error);
        setFilters(undefined);
      }
    };

    buildFilters();
  }, [searchParams, filterFields]);

  // 🆕 ID-First: useEntities with orderBy + filters enables ID-First pagination
  const { data, isLoading, error, isFetching, hasMore, isLoadingMore, loadMore } = useEntitiesHook({
    rows: rowsPerPage,
    from: 0,
    filters,
    orderBy
  });

  // UI state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);

  // Responsive - using custom breakpoints from Angular project
  const isMoreThanSM = useMediaQuery(mediaQueries.sm); // 600px
  const isMoreThanMD = useMediaQuery(mediaQueries.md); // 960px
  const isMoreThanLG = useMediaQuery(mediaQueries.lg); // 1280px
  const isMoreThanXL = useMediaQuery(mediaQueries.xl); // 1440px
  const isMoreThan2XL = useMediaQuery(mediaQueries.xxl); // 1536px
  const needCardClass = isMoreThanLG;

  // Get all entities directly from data (no accumulation needed)
  const allEntities = data?.entities || [];

  // Update total count and handle initial load
  useEffect(() => {
    if (data?.entities && !isLoading) {
      setIsInitialLoad(false);

      // Auto-select first entity for xxl+ screens on initial load
      if (isMoreThan2XL && data.entities.length > 0 && !selectedEntityId) {
        const pathSegments = location.pathname.split("/");
        const hasEntityId =
          pathSegments.length > 2 && pathSegments[2] !== "new";
        if (!hasEntityId) {
          navigate(`${data.entities[0].Id}#overview`);
        }
      }

      if (data.total) {
        setTotalCount(data.total);
      }
    }
  }, [
    data,
    isLoading,
    isMoreThan2XL,
    selectedEntityId,
    navigate,
    location.pathname,
  ]);

  // Check if drawer should be open based on route
  useEffect(() => {
    const pathSegments = location.pathname.split("/");
    const hasEntityId = pathSegments.length > 2 && pathSegments[2] !== "new";
    setIsDrawerOpen(hasEntityId);

    // Update selected entity ID from URL
    if (hasEntityId) {
      setSelectedEntityId(pathSegments[2]);
    }
  }, [location.pathname]);

  // Measure header height
  useEffect(() => {
    if (headerRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setHeaderHeight(entry.contentRect.height);
        }
      });
      observer.observe(headerRef.current);
      return () => observer.disconnect();
    }
  }, []);

  // View change is handled by RxDB replication automatically
  // No need to reset state here

  const handleEntityClick = useCallback(
    (entity: T) => {
      setSelectedEntityId(entity.Id);
      // Always navigate to overview tab by default when opening drawer
      navigate(`${entity.Id}#overview`);
    },
    [navigate]
  );

  // 🆕 ID-First: Use loadMore from hook (with cursor pagination)
  const handleLoadMore = useCallback(async () => {
    if (loadMore) {
      await loadMore();
    }
  }, [loadMore]);

  // 🆕 Handle sort change - update URL with sort ID
  const handleSortChange = useCallback((option: any) => {
    const newParams = new URLSearchParams(searchParams);

    // Remove old sort params (cleanup legacy format)
    newParams.delete('sortBy');
    newParams.delete('sortDir');
    newParams.delete('sortParam');

    // Set new slug-based sort
    newParams.set('sort', option.id);

    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // 🆕 Handle filters apply - update URL with filter params (using slugs)
  // Convert ID values to readable labels for URL
  const handleFiltersApply = useCallback(async (filterValues: Record<string, any>) => {
    const newParams = new URLSearchParams(searchParams);

    try {
      const rxdb = await getDatabase();

      // Process all filter values (convert ID → label for URL)
      for (const [fieldId, value] of Object.entries(filterValues)) {
        if (value !== undefined && value !== null && value !== '') {
          // Find field config to get slug
          const fieldConfig = filterFields.find(f => f.id === fieldId);
          const urlKey = fieldConfig?.slug || fieldId; // Use slug if available

          // Get readable label for value (ID → label)
          const label = await getLabelForValue(fieldConfig, value, rxdb);
          const normalizedLabel = normalizeForUrl(label);

          console.log('[handleFiltersApply]', fieldId, ':', value, '→', normalizedLabel);
          newParams.set(urlKey, normalizedLabel);
        } else {
          // When clearing, need to remove both slug and field ID
          const fieldConfig = filterFields.find(f => f.id === fieldId);
          if (fieldConfig?.slug) {
            newParams.delete(fieldConfig.slug);
          }
          newParams.delete(fieldId);
        }
      }

      setSearchParams(newParams);
    } catch (error) {
      console.error('[handleFiltersApply] Error converting IDs to labels:', error);
      // Fallback: use original values if conversion fails
      Object.entries(filterValues).forEach(([fieldId, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          const fieldConfig = filterFields.find(f => f.id === fieldId);
          const urlKey = fieldConfig?.slug || fieldId;
          newParams.set(urlKey, String(value));
        }
      });
      setSearchParams(newParams);
    }
  }, [searchParams, setSearchParams, filterFields]);

  // 🆕 Handle filter remove - remove specific filter from URL
  const handleFilterRemove = useCallback((filter: { id: string }) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(filter.id);
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // 🆕 Read active filters from URL (excluding 'sort' and 'view')
  const activeFilters = useMemo(() => {
    const filters: Array<{ id: string; label: string; isRequired: boolean }> = [];
    const reservedParams = ['sort', 'view', 'sortBy', 'sortDir', 'sortParam']; // Exclude system params

    searchParams.forEach((value, key) => {
      if (!reservedParams.includes(key) && value) {
        // Find field config by slug or field ID
        let fieldConfig = filterFields.find(f => f.slug === key);
        if (!fieldConfig) {
          fieldConfig = filterFields.find(f => f.id === key);
        }

        filters.push({
          id: key, // Use URL key (slug or field ID) for removal
          label: fieldConfig ? `${fieldConfig.displayName}: ${value}` : `${key}: ${value}`,
          isRequired: false
        });
      }
    });

    return filters;
  }, [searchParams, filterFields]);

  // 🆕 Get current filter values for initializing FiltersDialog form
  const currentFilterValues = useMemo(() => {
    const values: Record<string, any> = {};
    const reservedParams = ['sort', 'view', 'sortBy', 'sortDir', 'sortParam'];

    searchParams.forEach((value, key) => {
      if (!reservedParams.includes(key) && value) {
        // Find field config by slug or field ID
        let fieldConfig = filterFields.find(f => f.slug === key);
        if (!fieldConfig) {
          fieldConfig = filterFields.find(f => f.id === key);
        }

        // Map URL key (slug or field ID) to field ID for form initialization
        if (fieldConfig) {
          values[fieldConfig.id] = value;
        }
      }
    });

    return values;
  }, [searchParams, filterFields]);

  const handleCreateNew = () => {
    navigate(`${location.pathname}/new`);
  };

  const handleBackdropClick = () => {
    setIsDrawerOpen(false);
    // Navigate back to breeds list without specific breed
    navigate("/breeds");
  };

  // Drawer mode depends on screen size (using custom breakpoints)
  const getDrawerMode = () => {
    if (isMoreThan2XL) return "side-transparent"; // 2xl+ (1536px+) - transparent background, gap between cards
    if (isMoreThanMD) return "side"; // md (768px+) - side drawer with backdrop
    return "over"; // < md (less than 768px) - fullscreen overlay
  };
  const drawerMode = getDrawerMode();
  const scrollHeight = `calc(100vh - ${headerHeight}px - 3px)`;

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">
          Error loading {config.naming.plural.other}. Please try again later.
        </p>
      </div>
    );
  }

  // Show loading state only on initial load
  if (isInitialLoad && isLoading) {
    return (
      <div className="relative h-full overflow-hidden">
        <div
          className={cn(
            "flex flex-col cursor-default h-full overflow-hidden",
            needCardClass ? "fake-card" : "card-surface"
          )}
        >
          <div
            ref={headerRef}
            className="z-20 flex flex-col justify-between border-b border-surface-border p-4 sm:p-7"
          >
            <div className="w-full">
              <div className="flex w-full justify-between">
                <span className="text-4xl font-extrabold">
                  {finalConfig.title}
                </span>
                <ViewChanger
                  views={
                    finalConfig.viewTypes || config.viewConfig.map((v) => v.id)
                  }
                  viewConfigs={finalConfig.viewConfigs?.map((v) => ({
                    id: v.viewType,
                    icon: v.icon,
                    tooltip: v.tooltip,
                  }))}
                />
              </div>
              {spaceStore.configReady.value && (
                <EntitiesCounter
                  entitiesCount={0}
                  isLoading={true}
                  total={0}
                  entityType={config.entitySchemaName}
                  initialCount={rowsPerPage}
                />
              )}
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-500">
              Loading {config.naming.plural.other}...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="relative h-full overflow-hidden">
        {/* Main Content */}
        <div
          className={cn(
            "relative flex flex-col cursor-default h-full overflow-hidden",
            needCardClass ? "fake-card" : "card-surface",
            "transition-all duration-300 ease-out",
            // Only shrink the list for side-transparent mode (xxl+)
            isDrawerOpen && drawerMode === "side-transparent" && "mr-[46.25rem]" // 45rem + 1.25rem gap
          )}
        >
          {/* Header */}
          <div
            ref={headerRef}
            className="z-20 flex flex-col justify-between border-b border-surface-border p-4 sm:p-7"
          >
            <div className="w-full">
              <div className="flex w-full justify-between">
                <span className="text-4xl font-extrabold">
                  {finalConfig.title}
                </span>
                <ViewChanger
                  views={
                    finalConfig.viewTypes || config.viewConfig.map((v) => v.id)
                  }
                  viewConfigs={finalConfig.viewConfigs?.map((v) => ({
                    id: v.viewType,
                    icon: v.icon,
                    tooltip: v.tooltip,
                  }))}
                />
              </div>
              {spaceStore.configReady.value && (
                <EntitiesCounter
                  entitiesCount={allEntities.length}
                  isLoading={false}
                  total={totalCount}
                  entityType={config.entitySchemaName}
                  initialCount={rowsPerPage}
                />
              )}
            </div>

            {/* Main actions */}
            <div className="mt-4 flex items-center space-x-3">
              {/* Search */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={config.naming.searchPlaceholder}
                  className="pl-10 rounded-full w-full cursor-auto"
                />
              </div>

              {/* Add button */}
              {finalConfig.canAdd && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleCreateNew}
                      className={cn(
                        "rounded-full font-bold flex-shrink-0",
                        needCardClass
                          ? "h-10 px-4"
                          : "!w-[2.6rem] !h-[2.6rem] flex items-center justify-center"
                      )}
                    >
                      <Plus className="h-5 w-5 flex-shrink-0" />
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
                component:
                  viewMode === "grid" ? "BreedGridCard" : "BreedListCard",
                itemHeight:
                  config.viewConfig.find((v) => v.id === viewMode)
                    ?.itemHeight || (viewMode === "grid" ? 280 : 68),
                dividers: viewMode === "list" || viewMode === "rows",
                overscan: 3,
              }}
              entities={allEntities}
              selectedId={selectedEntityId}
              onEntityClick={handleEntityClick}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
            />
            {/* Bottom spacer like in Angular */}
            <div className="sm:h-6 bg-card-ground w-full absolute bottom-0" />
          </div>

          {/* Backdrop inside main content for side mode */}
          <div
            className={cn(
              "absolute inset-0 z-30",
              isMoreThanLG && "rounded-xl",
              "transition-opacity duration-300",
              drawerMode === "side" && isDrawerOpen
                ? "bg-black/40 opacity-100"
                : "opacity-0 pointer-events-none"
            )}
            onClick={handleBackdropClick}
          />

          {/* Drawer inside main content for side mode */}
          <div
            className={cn(
              "absolute top-0 right-0 h-full bg-white shadow-xl z-40 overflow-hidden",
              "w-[40rem]",
              // Add rounded corners for drawer: always on sm+, but only when overlaying the list
              isMoreThanSM && "rounded-l-xl",
              "transform transition-transform duration-300 ease-out",
              drawerMode === "side" && isDrawerOpen
                ? "translate-x-0"
                : "translate-x-full"
            )}
          >
            {drawerMode === "side" && isDrawerOpen && (
              <div className="h-full overflow-auto">
                <Outlet />
              </div>
            )}
          </div>

          {/* Fullscreen overlay for small screens - inside main content */}
          <div
            className={cn(
              "absolute inset-0 z-30 transition-opacity duration-300",
              drawerMode === "over" && isDrawerOpen
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            )}
          >
            <div
              className="absolute inset-0 bg-black/50"
              onClick={handleBackdropClick}
            />
          </div>
          <div
            className={cn(
              "absolute inset-0 z-40 bg-white overflow-hidden",
              "transform transition-transform duration-300 ease-out",
              drawerMode === "over" && isDrawerOpen
                ? "translate-x-0"
                : "translate-x-full"
            )}
          >
            <div className="h-full overflow-auto">
              <Outlet />
            </div>
          </div>
        </div>

        {/* Drawer for side-transparent mode (outside main content) */}
        <div
          className={cn(
            "absolute top-0 right-0 h-full z-40 overflow-hidden",
            "w-[45rem]",
            needCardClass ? "fake-card" : "card-surface",
            "transform transition-all duration-300 ease-out",
            drawerMode === "side-transparent" && isDrawerOpen
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0 pointer-events-none"
          )}
        >
          <div className="h-full overflow-auto">
            <Outlet />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
