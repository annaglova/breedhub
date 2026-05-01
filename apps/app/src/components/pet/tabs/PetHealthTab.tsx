import { useSelectedEntity } from "@/contexts/SpaceContext";
import { useDisplayLimit } from "@/hooks/useDisplayLimit";
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

  // Drawer mode: load limited data
  const drawerResult = useTabData({
    parentId: petId,
    dataSource: dataSource?.[0]!,
    enabled: !!dataSource?.[0] && !!petId && !isFullscreen,
  });

  // Fullscreen mode: infinite scroll with pagination
  const infiniteResult = useInfiniteTabData({
    parentId: petId,
    dataSource: dataSource?.[0]!,
    enabled: !!dataSource?.[0] && !!petId && isFullscreen,
    pageSize: 30,
  });

  // Use appropriate data based on mode
  const resultsRaw = isFullscreen ? infiniteResult.data : drawerResult.data;
  const isLoading = isFullscreen
    ? infiniteResult.isLoading
    : drawerResult.isLoading;
  const error = isFullscreen ? infiniteResult.error : drawerResult.error;

  const displayRaw = useDisplayLimit(resultsRaw, dataSource);

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
    if (isFullscreen && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [isFullscreen, hasMore, isLoadingMore, loadMore]);

  // Report count after data loads
  useEffect(() => {
    if (!isLoading && onLoadedCount) {
      onLoadedCount(results.length);
    }
  }, [isLoading, onLoadedCount, results.length]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!isFullscreen || !loadMoreRef.current) return;

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
  }, [isFullscreen, handleLoadMore, hasMore, isLoadingMore, results.length]);

  // Don't render if no dataSource configured
  if (!dataSource?.[0]) {
    return null;
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

  // Same grid template for header / rows / skeleton — keeps cold-load and
  // real table column-aligned (no jump from generic placeholder to grid).
  const gridCols = isFullscreen
    ? "grid-cols-[132px_184px_auto] lg:grid-cols-[132px_284px_auto]"
    : "grid-cols-[132px_auto] sm:grid-cols-[184px_auto] md:grid-cols-[86px_184px_auto]";
  const dateCellVisibility = isFullscreen ? "block" : "hidden md:block";
  const skeletonRowCount = isFullscreen ? 12 : 5;

  return (
    <>
      <div className="card card-rounded flex flex-auto flex-col p-6 lg:px-8 cursor-default">
        {isLoading ? (
          <div className="grid" aria-busy="true" aria-live="polite">
            <div
              className={cn(
                "grid gap-3 border-b border-border px-6 py-3 font-bold text-secondary lg:px-8",
                gridCols
              )}
            >
              <div className={dateCellVisibility}>Date</div>
              <div>Object</div>
              <div>Result</div>
            </div>
            {Array.from({ length: skeletonRowCount }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className={cn(
                  "grid items-center gap-3 px-6 py-2 lg:px-8",
                  gridCols,
                  index % 2 === 0 ? "bg-card-ground" : "bg-even-card-ground"
                )}
              >
                {/* h-[21px] flex wrappers keep skeleton row total = real row
                    total (text-base content height = 21px on this row). */}
                <div className={cn("h-[21px] flex items-center", dateCellVisibility)}>
                  <div className="h-3.5 w-20 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                </div>
                <div className="h-[21px] flex items-center">
                  <div className="h-3.5 w-28 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                </div>
                <div className="h-[21px] flex items-center">
                  <div className="h-3.5 w-40 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid">
            {/* Header */}
            <div
              className={cn(
                "grid gap-3 border-b border-border px-6 py-3 font-bold text-secondary lg:px-8",
                gridCols
              )}
            >
              <div className={dateCellVisibility}>Date</div>
              <div>Object</div>
              <div>Result</div>
            </div>

            {/* Rows */}
            {results.map((healthExam, index) => (
              <div
                key={healthExam.id}
                className={cn(
                  "grid items-center gap-3 px-6 py-2 lg:px-8",
                  gridCols,
                  index % 2 === 0 ? "bg-card-ground" : "bg-even-card-ground"
                )}
              >
                {/* Date */}
                <div className={dateCellVisibility}>
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
      {isFullscreen && (
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
