import { SpaceConfig, ViewMode } from "@/core/space/types";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { cn } from "@ui/lib/utils";
import { Plus, Search } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { EntitiesCounter } from "./EntitiesCounter";
import { SpaceFilters } from "./SpaceFilters";
import { ViewChanger } from "./ViewChanger";
import { VirtualSpaceView } from "./VirtualSpaceView";
import { mediaQueries } from "@/config/breakpoints";

interface SpaceComponentProps<T> {
  config: SpaceConfig<T>;
  useEntitiesHook: (params: { rows: number; from: number }) => {
    data: { entities: T[]; total: number } | undefined;
    isLoading: boolean;
    error: Error | null;
    isFetching: boolean;
  };
  filters?: React.ReactNode;
}

export function SpaceComponent<T extends { Id: string }>({
  config,
  useEntitiesHook,
  filters,
}: SpaceComponentProps<T>) {
  // Data loading state
  const [page, setPage] = useState(0);
  const [allEntities, setAllEntities] = useState<T[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchValue, setSearchValue] = useState("");

  const { data, isLoading, error, isFetching } = useEntitiesHook({
    rows: 50,
    from: page * 50,
  });

  // Navigation and routing
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const viewMode = searchParams.get("view") || config.viewConfig[0].id;

  // UI state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);

  // Responsive - using custom breakpoints from Angular project
  const isMoreThanSM = useMediaQuery(mediaQueries.sm);  // 600px
  const isMoreThanMD = useMediaQuery(mediaQueries.md);  // 960px
  const isMoreThanLG = useMediaQuery(mediaQueries.lg);  // 1280px
  const isMoreThanXL = useMediaQuery(mediaQueries.xl);  // 1440px
  const isMoreThan2XL = useMediaQuery(mediaQueries.xxl); // 1536px
  const needCardClass = isMoreThanMD;

  // Accumulate entities as we load more
  useEffect(() => {
    if (data?.entities && !isLoading) {
      if (page === 0) {
        setAllEntities(data.entities);
        setIsInitialLoad(false);
        
        // Auto-select first entity for xxl+ screens on initial load
        if (isMoreThan2XL && data.entities.length > 0 && !selectedEntityId) {
          const pathSegments = location.pathname.split("/");
          const hasEntityId = pathSegments.length > 2 && pathSegments[2] !== "new";
          if (!hasEntityId) {
            navigate(`${data.entities[0].Id}#overview`);
          }
        }
      } else {
        setAllEntities((prev) => [...prev, ...data.entities]);
      }
      if (data.total) {
        setTotalCount(data.total);
      }
    }
  }, [data, page, isLoading, isMoreThan2XL, selectedEntityId, navigate, location.pathname]);

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

  const handleEntityClick = useCallback(
    (entity: T) => {
      setSelectedEntityId(entity.Id);
      // Always navigate to overview tab by default when opening drawer
      navigate(`${entity.Id}#overview`);
    },
    [navigate]
  );

  const handleLoadMore = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

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
    if (isMoreThanMD) return "side";              // md (768px+) - side drawer with backdrop
    return "over";                                 // < md (less than 768px) - fullscreen overlay
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
                  {config.naming.title}
                </span>
                <ViewChanger
                  views={config.viewConfig.map((v) => v.id) as ViewMode[]}
                />
              </div>
              <EntitiesCounter entitiesCount={0} isLoading={true} total={0} />
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
                {config.naming.title}
              </span>
              <ViewChanger
                views={config.viewConfig.map((v) => v.id) as ViewMode[]}
              />
            </div>
            <EntitiesCounter
              entitiesCount={allEntities.length}
              isLoading={false}
              total={totalCount}
            />
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
            {config.canAdd && (
              <Button
                onClick={handleCreateNew}
                className={cn(
                  "rounded-full font-bold bp-small-button",
                  !needCardClass && "size-[2.6rem]"
                )}
                title="Add new record"
              >
                <Plus className="h-4 w-4" />
                {needCardClass && <span className="ml-2">Add</span>}
              </Button>
            )}
          </div>

          {/* Filters */}
          {filters && <SpaceFilters>{filters}</SpaceFilters>}
        </div>

        {/* Content Scroller */}
        <div className="relative flex-1 overflow-hidden">
          <VirtualSpaceView
            config={config}
            entities={allEntities}
            viewMode={viewMode}
            selectedId={selectedEntityId}
            onEntityClick={handleEntityClick}
            onLoadMore={handleLoadMore}
            hasMore={allEntities.length < totalCount}
            isLoadingMore={isFetching}
          />
          {/* Bottom spacer like in Angular */}
          <div className="sm:h-6 bg-card-ground w-full absolute bottom-0" />
        </div>
        
        {/* Backdrop inside main content for side mode */}
        <div
          className={cn(
            "absolute inset-0 z-30",
            needCardClass && "rounded-xl",
            "transition-opacity duration-300",
            drawerMode === "side" && isDrawerOpen ? "bg-black/40 opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={handleBackdropClick}
        />
        
        {/* Drawer inside main content for side mode */}
        <div
          className={cn(
            "absolute top-0 right-0 h-full bg-white shadow-xl z-40 overflow-hidden",
            "w-[40rem]",
            // Only add rounded corners on lg+ screens
            isMoreThanLG && needCardClass && "rounded-l-xl",
            "transform transition-transform duration-300 ease-out",
            drawerMode === "side" && isDrawerOpen ? "translate-x-0" : "translate-x-full"
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
            drawerMode === "over" && isDrawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
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
            drawerMode === "over" && isDrawerOpen ? "translate-x-0" : "translate-x-full"
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
          drawerMode === "side-transparent" && isDrawerOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
        )}
      >
          <div className="h-full overflow-auto">
            <Outlet />
          </div>
        </div>
    </div>
  );
}
