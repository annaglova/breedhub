import { useSelectedEntity } from "@/contexts/SpaceContext";
import {
  spaceStore,
  useInfiniteTabData,
  useTabData,
} from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { ExternalLink, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * Show result entry (UI format)
 */
interface ShowResult {
  id: string;
  date: string;
  project?: {
    countryCode?: string;
    cityName?: string;
    category?: string;
  };
  result: string;
  judge?: {
    name?: string;
  };
  webLink?: string;
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

interface PetShowResultsTabProps {
  onLoadedCount?: (count: number) => void;
  dataSource?: DataSourceConfig;
}

/**
 * PetShowResultsTab - Pet show results
 *
 * Displays a table with:
 * - Date
 * - Show (country, city, category) - visible in fullscreen
 * - Result
 * - Judge - visible in fullscreen
 * - Details (external link)
 *
 * Based on Angular: pet-show-results.component.ts
 */
export function PetShowResultsTab({
  onLoadedCount,
  dataSource,
}: PetShowResultsTabProps) {
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
  const results = useMemo<ShowResult[]>(() => {
    if (!resultsRaw || resultsRaw.length === 0) return [];

    return resultsRaw.map((item: any) => ({
      id: item.id,
      date: item.date || item.additional?.date || "",
      project: {
        countryCode: item.country_code || item.additional?.country_code,
        cityName: item.city_name || item.additional?.city_name,
        category: item.category_name || item.additional?.category_name,
      },
      result: item.result || item.additional?.result || "",
      judge: {
        name: item.judge_name || item.additional?.judge_name,
      },
      webLink: item.web_link || item.additional?.web_link,
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
        <span className="ml-2 text-secondary">Loading show results...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-4 px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">Failed to load show results</p>
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
                "grid gap-3 border-b border-border px-6 py-3 font-bold text-secondary md:px-8",
                isFullscreen
                  ? "grid-cols-[132px_auto_44px] lg:grid-cols-[132px_226px_auto_176px_44px]"
                  : "grid-cols-[132px_auto_44px]"
              )}
            >
              <span>Date</span>
              <span className={cn("hidden", isFullscreen && "lg:block")}>
                Show
              </span>
              <span>Result</span>
              <span className={cn("hidden", isFullscreen && "lg:block")}>
                Judge
              </span>
              <span>Details</span>
            </div>

            {/* Rows */}
            {results.map((showResult, index) => (
              <div
                key={showResult.id}
                className={cn(
                  "grid items-center gap-3 rounded-md px-6 py-2 md:px-8",
                  isFullscreen
                    ? "grid-cols-[132px_auto_44px] lg:grid-cols-[132px_226px_auto_176px_44px]"
                    : "grid-cols-[132px_auto_44px]",
                  index % 2 === 0 ? "bg-card-ground" : "bg-even-card-ground"
                )}
              >
                {/* Date */}
                <span>{formatDate(showResult.date)}</span>

                {/* Show */}
                <span
                  className={cn("hidden truncate", isFullscreen && "lg:block")}
                >
                  {[
                    showResult.project?.countryCode,
                    showResult.project?.cityName,
                    showResult.project?.category,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </span>

                {/* Result */}
                <span className="truncate">{showResult.result}</span>

                {/* Judge */}
                <span
                  className={cn("hidden truncate", isFullscreen && "lg:block")}
                >
                  {showResult.judge?.name}
                </span>

                {/* Details link */}
                <div>
                  {showResult.webLink && (
                    <a
                      href={showResult.webLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-secondary p-8 text-center ">
            There are no show results!
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
              All {results.length} show results loaded
            </span>
          )}
        </div>
      )}
    </>
  );
}
