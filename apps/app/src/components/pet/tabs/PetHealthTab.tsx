import { useSelectedEntity } from "@/contexts/SpaceContext";
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

/**
 * Format date to locale string
 */
function formatDate(dateString?: string): string {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

interface PetHealthTabProps {
  onLoadedCount?: (count: number) => void;
  dataSource?: DataSourceConfig;
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
    dataSource: dataSource!,
    enabled: !!dataSource && !!petId && !isFullscreen,
  });

  // Fullscreen mode: infinite scroll with pagination
  const infiniteResult = useInfiniteTabData({
    parentId: petId,
    dataSource: dataSource!,
    enabled: !!dataSource && !!petId && isFullscreen,
    pageSize: 30,
  });

  // Use appropriate data based on mode
  const resultsRaw = isFullscreen ? infiniteResult.data : drawerResult.data;
  const isLoading = isFullscreen
    ? infiniteResult.isLoading
    : drawerResult.isLoading;
  const error = isFullscreen ? infiniteResult.error : drawerResult.error;

  // Transform raw data to UI format
  const results = useMemo<HealthExam[]>(() => {
    if (!resultsRaw || resultsRaw.length === 0) return [];

    return resultsRaw.map((item: any) => ({
      id: item.id,
      date: item.date || item.additional?.date || "",
      healthExamObject: {
        name: item.object_name || item.additional?.object_name,
      },
      healthExamResult: {
        name: item.result_name || item.additional?.result_name,
      },
    }));
  }, [resultsRaw]);

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
  if (!dataSource) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="py-4 px-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-secondary">Loading health results...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-4 px-6">
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
                isFullscreen
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
                  isFullscreen
                    ? "grid-cols-[132px_184px_auto] lg:grid-cols-[132px_284px_auto]"
                    : "grid-cols-[132px_auto] sm:grid-cols-[184px_auto] md:grid-cols-[86px_184px_auto]",
                  index % 2 === 0 ? "bg-card-ground" : "bg-even-card-ground"
                )}
              >
                {/* Date */}
                <div
                  className={cn("hidden", isFullscreen ? "block" : "md:block")}
                >
                  {formatDate(healthExam.date)}
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
          <span className="text-secondary p-8 text-center ">
            There are no health results!
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
