import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { cn } from "@ui/lib/utils";
import { Plus, Search } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { EntitiesCounter } from "./EntitiesCounter";
import { SpaceFilters } from "./SpaceFilters";
import { SpaceScroller } from "./SpaceScroller";
import { ViewChanger } from "./ViewChanger";
import { ViewMode } from "@/core/space/types";

interface SpaceConfig {
  title: string;
  searchPlaceholder: string;
  canAdd?: boolean;
  model: string;
  views?: string[];
}

interface SpaceContainerProps {
  config: SpaceConfig;
  entitiesCount: number;
  isLoading: boolean;
  total: number;
  filters?: React.ReactNode;
  children?: React.ReactNode;
  onSearch?: (query: string) => void;
  onViewModeChange?: (mode: string) => void;
  currentView?: string;
}

export function SpaceContainer({
  config,
  entitiesCount,
  isLoading,
  total,
  filters,
  children,
}: SpaceContainerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [headerHeight, setHeaderHeight] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // Media queries matching Angular breakpoints
  const isMoreThanMD = useMediaQuery("(min-width: 768px)");
  const isMoreThanXL = useMediaQuery("(min-width: 1280px)");
  const needCardClass = isMoreThanMD;

  // Check if drawer should be open based on route
  useEffect(() => {
    const pathSegments = location.pathname.split("/");
    // If we have an ID in the path, drawer should be open
    setIsDrawerOpen(pathSegments.length > 2 && pathSegments[2] !== "new");
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

  const handleCreateNew = () => {
    navigate(`${location.pathname}/new`);
  };

  const handleBackdropClick = () => {
    setIsDrawerOpen(false);
    // Navigate back to list
    const pathSegments = location.pathname.split("/");
    navigate(`/${pathSegments[1]}`);
  };

  const drawerMode = isMoreThanXL ? "side" : "over";
  const scrollHeight = `calc(100vh - ${headerHeight}px - 3px)`;

  return (
    <div className="relative h-full overflow-hidden">
      {/* Main Content */}
      <div
        className={cn(
          "flex flex-col cursor-default h-full overflow-hidden",
          needCardClass ? "fake-card" : "card-surface",
          isDrawerOpen && "xl:mr-[40rem] 2xl:mr-[45rem]"
        )}
      >
        {/* Header */}
        <div
          ref={headerRef}
          className="z-20 flex flex-col justify-between border-b border-surface-border p-4 sm:p-7"
        >
          <div className="w-full">
            <div className="flex w-full justify-between">
              <span className="text-4xl font-extrabold">{config.title}</span>
              <ViewChanger views={config.views as ViewMode[]} />
            </div>
            <EntitiesCounter
              entitiesCount={entitiesCount}
              isLoading={isLoading}
              total={total}
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
                placeholder={config.searchPlaceholder}
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
          <SpaceScroller scrollHeight={scrollHeight}>{children}</SpaceScroller>
          <div className="sm:h-6 bg-card-ground w-full absolute bottom-0" />
        </div>
      </div>

      {/* Drawer */}
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className={cn(
              "fixed inset-0 bg-black/40 z-30",
              isMoreThanXL && "rounded-xl"
            )}
            onClick={handleBackdropClick}
          />

          {/* Drawer content */}
          <div
            className={cn(
              "fixed right-0 top-0 h-full bg-white z-40",
              "w-full md:w-[40rem] 2xl:w-[45rem]",
              "shadow-2xl"
            )}
          >
            <Outlet />
          </div>
        </>
      )}
    </div>
  );
}
