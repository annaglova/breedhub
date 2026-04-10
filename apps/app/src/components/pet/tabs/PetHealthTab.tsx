import { useSelectedEntity } from "@/contexts/SpaceContext";
import { formatDate } from "@/utils/format";
import {
  spaceStore,
  useInfiniteTabData,
  useTabData,
} from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * Health exam entry (UI format)
 */
interface HealthExam {
  id: string;
  date: string;
  healthExamObject?: {
    name?: string;
  };
  healthExamResult?: {
    name?: string;
  };
}

interface PetHealthTabProps {
  onLoadedCount?: (count: number) => void;
  dataSource?: DataSourceConfig[];
}

/**
 * PetHealthTab - Pet health exam results
 *
 * Displays a table with:
 * - Date (hidden on mobile)
 * - Object (exam type)
 * - Result
 *
 * Based on Angular: pet-health.component.ts
 */
export function PetHealthTab({
  onLoadedCount,
  dataSource,
}: PetHealthTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const petId = selectedEntity?.id;
  const isFullscreen = spaceStore.isFullscreen.value;
  const isTabFullscreen = spaceStore.isTabFullscreen.value;

  // Drawer mode: load limited data
  const drawerResult = useTabData({
    parentId: petId,
    dataSource: dataSource?.[0]!,
    enabled: !!dataSource?.[0] && !!petId && !isTabFullscreen,
  });

  // Fullscreen mode: infinite scroll with pagination
  const infiniteResult = useInfiniteTabData({
    parentId: petId,
    dataSource: dataSource?.[0]!,
    enabled: !!dataSource?.[0] && !!petId && isTabFullscreen,
    pageSize: 30,
  });

  // Use appropriate data based on mode
  const resultsRaw = isTabFullscreen ? infiniteResult.data : drawerResult.data;
  const isLoading = isTabFullscreen
    ? infiniteResult.isLoading
    : drawerResult.isLoading;
  const error = isTabFullscreen ? infiniteResult.error : drawerResult.error;

  // Apply config limit when not in tab fullscreen (drawer + page fullscreen).
  // RxDB cache may hold more records than config.limit (loaded by previous infinite scroll).
  const displayRaw = useMemo(() => {
    if (isTabFullscreen || !resultsRaw) return resultsRaw;
    const configLimit = dataSource?.[0]?.childTable?.limit;
    if (configLimit && resultsRaw.length > configLimit) {
      return resultsRaw.slice(0, configLimit);
    }
    return resultsRaw;
  }, [resultsRaw, isTabFullscreen, dataSource]);

  // Transform raw data to UI format
  const results = useMemo<HealthExam[]>(() => {
    if (!displayRaw || displayRaw.length === 0) return [];

    return displayRaw.map((item: any) => ({
      id: item.id,
      date: item.date || item.additional?.date || "",
      healthExamObject: {
        name: item.object_name || item.additional?.object_name,
      },
      healthExamResult: {
        name: item.result_name || item.additional?.result_name,
      },
    }));
  }, [displayRaw]);

  // Infinite scroll refs and handlers
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { hasMore, isLoadingMore, loadMore } = infiniteResult;

  const handleLoadMore = useCallback(() => {
    if (isTabFullscreen && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [isTabFullscreen, hasMore, isLoadingMore, loadMore]);

  // Report count after data loads
  useEffect(() => {
    if (!isLoading && onLoadedCount) {
      onLoadedCount(results.length);
    }
  }, [isLoading, onLoadedCount, results.length]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!isTabFullscreen || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [isTabFullscreen, handleLoadMore, hasMore, isLoadingMore, results.length]);

  // Don't render if no dataSource configured
  if (!dataSource?.[0]) {
    return null;
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="card card-rounded flex flex-auto flex-col p-6 lg:px-8 animate-pulse">
        <div className="grid grid-cols-3 gap-3 border-b border-border px-6 py-3 lg:px-8">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-12" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-16" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-14" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="grid grid-cols-3 gap-3 px-6 py-3 lg:px-8">
            <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full w-20" />
            <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full w-24" />
            <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full w-16" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">Failed to load health results</p>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card card-rounded flex flex-auto flex-col p-6 lg:px-8 cursor-default">
        {results.length > 0 ? (
          <div className="grid">
            {/* Header */}
            <div
              className={cn(
                "grid gap-3 border-b border-border px-6 py-3 font-bold text-secondary lg:px-8",
                isTabFullscreen
                  ? "grid-cols-[132px_184px_auto] lg:grid-cols-[132px_284px_auto]"
                  : "grid-cols-[132px_auto] sm:grid-cols-[184px_auto] md:grid-cols-[86px_184px_auto]"
              )}
            >
              <div className={cn("hidden", isFullscreen ? "block" : "md:block")}>
                Date
              </div>
              <div>Object</div>
              <div>Result</div>
            </div>

            {/* Rows */}
            {results.map((healthExam, index) => (
              <div
                key={healthExam.id}
                className={cn(
                  "grid items-center gap-3 px-6 py-2 lg:px-8",
                  isTabFullscreen
                    ? "grid-cols-[132px_184px_auto] lg:grid-cols-[132px_284px_auto]"
                    : "grid-cols-[132px_auto] sm:grid-cols-[184px_auto] md:grid-cols-[86px_184px_auto]",
                  index % 2 === 0 ? "bg-card-ground" : "bg-even-card-ground"
                )}
              >
                {/* Date */}
                <div
                  className={cn("hidden", isFullscreen ? "block" : "md:block")}
                >
                  {formatDate(healthExam.date, "short")}
                </div>

                {/* Object */}
                <div className="truncate">
                  {healthExam.healthExamObject?.name}
                </div>

                {/* Result */}
                <div className="truncate">
                  {healthExam.healthExamResult?.name}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-secondary p-8 text-center block">
            No health results data available
          </span>
        )}
      </div>

      {/* Infinite scroll trigger & loading indicator */}
      {isTabFullscreen && (
        <div ref={loadMoreRef} className="py-4 flex justify-center">
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more...</span>
            </div>
          )}
          {!hasMore && results.length > 0 && (
            <span className="text-muted-foreground text-sm">
              All {results.length} health results loaded
            </span>
          )}
        </div>
      )}
    </>
  );
}
