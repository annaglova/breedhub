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
import { Link } from "react-router-dom";

/**
 * Competitor entry (UI format)
 */
interface Competitor {
  id: string;
  pet: {
    name: string;
    slug?: string;
  };
  class?: {
    name?: string;
  };
  number?: string;
  result?: string;
  judge?: {
    name?: string;
    slug?: string;
  };
  webLink?: string;
}

/**
 * Breed with competitors (grouped)
 */
interface BreedResults {
  name: string;
  slug?: string;
  competitors: Competitor[];
}

/**
 * Group competitors by breed
 */
function groupByBreed(items: any[]): BreedResults[] {
  const grouped = new Map<string, BreedResults>();

  for (const item of items) {
    const breedName = item.breed_name || "Unknown Breed";
    const breedSlug = item.breed_slug;

    if (!grouped.has(breedName)) {
      grouped.set(breedName, {
        name: breedName,
        slug: breedSlug,
        competitors: [],
      });
    }

    grouped.get(breedName)!.competitors.push({
      id: item.id,
      pet: {
        name: item.pet_name || "Unknown",
        slug: item.pet_slug,
      },
      class: {
        name: item.class_name,
      },
      number: item.number ? String(Math.floor(Number(item.number))) : undefined,
      result: item.result,
      judge: {
        name: item.judge_name,
        slug: item.judge_slug,
      },
      webLink: item.web_link,
    });
  }

  // Sort breeds alphabetically
  return Array.from(grouped.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/**
 * EntityLink - Link to entity with role-based styling
 */
function EntityLink({
  entity,
  entityRole,
}: {
  entity?: { name?: string; slug?: string };
  entityRole: "pet" | "judge";
}) {
  if (!entity?.name) return <span className="text-muted-foreground">—</span>;

  if (entity.slug) {
    return (
      <Link
        to={`/${entity.slug}`}
        className={cn(
          "hover:underline",
          entityRole === "pet" && "text-pet",
          entityRole === "judge" && "text-contact"
        )}
      >
        {entity.name}
      </Link>
    );
  }

  return <span>{entity.name}</span>;
}

/**
 * ExternalLinkButton - External link with icon
 */
function ExternalLinkButton({ url }: { url?: string }) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-primary transition-colors"
    >
      <ExternalLink size={16} />
    </a>
  );
}

interface EventResultsTabProps {
  onLoadedCount?: (count: number) => void;
  dataSource?: DataSourceConfig;
}

/**
 * EventResultsTab - Event competition results
 *
 * Displays results grouped by breed, showing:
 * - Pet name (link)
 * - Class name (fullscreen only)
 * - Number (fullscreen only)
 * - Result
 * - Judge (fullscreen only)
 * - External link
 *
 * Data source: program_result_with_details VIEW
 */
export function EventResultsTab({
  onLoadedCount,
  dataSource,
}: EventResultsTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const programId = selectedEntity?.id;
  const isFullscreen = spaceStore.isFullscreen.value;

  // Drawer mode: load limited data
  const drawerResult = useTabData({
    parentId: programId,
    dataSource: dataSource!,
    enabled: !!dataSource && !!programId && !isFullscreen,
  });

  // Fullscreen mode: infinite scroll with pagination
  const infiniteResult = useInfiniteTabData({
    parentId: programId,
    dataSource: dataSource!,
    enabled: !!dataSource && !!programId && isFullscreen,
    pageSize: 50,
  });

  // Use appropriate data based on mode
  const rawData = isFullscreen ? infiniteResult.data : drawerResult.data;
  const isLoading = isFullscreen
    ? infiniteResult.isLoading
    : drawerResult.isLoading;
  const error = isFullscreen ? infiniteResult.error : drawerResult.error;

  // Group by breed
  const breeds = useMemo<BreedResults[]>(() => {
    if (!rawData || rawData.length === 0) return [];
    return groupByBreed(rawData);
  }, [rawData]);

  // Count total competitors
  const totalCompetitors = useMemo(
    () => breeds.reduce((sum, breed) => sum + breed.competitors.length, 0),
    [breeds]
  );

  // Infinite scroll refs and handlers
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { hasMore, isLoadingMore, loadMore } = infiniteResult;

  const handleLoadMore = useCallback(() => {
    if (isFullscreen && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [isFullscreen, hasMore, isLoadingMore, loadMore]);

  // Report loaded count
  useEffect(() => {
    if (!isLoading && onLoadedCount) {
      onLoadedCount(totalCompetitors);
    }
  }, [isLoading, onLoadedCount, totalCompetitors]);

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
  }, [isFullscreen, handleLoadMore, hasMore, isLoadingMore, totalCompetitors]);

  // Don't render if no dataSource configured
  if (!dataSource) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="py-4 px-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-secondary">Loading results...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-4 px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">Failed to load results</p>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  if (breeds.length === 0) {
    return (
      <div className="text-secondary p-8 text-center">
        No results available
      </div>
    );
  }

  return (
    <>
      <div className="px-6 cursor-default">
        {breeds.map((breed) => (
          <div key={breed.name} className="mt-3">
            {/* Breed header */}
            <div className="bg-secondary-100 w-full rounded-full px-4 py-2.5">
              {breed.slug ? (
                <Link to={`/${breed.slug}`} className="hover:underline">
                  {breed.name}
                </Link>
              ) : (
                breed.name
              )}
            </div>

            {/* Competitors */}
            {breed.competitors.map((competitor) => (
              <div
                key={competitor.id}
                className={cn(
                  "mt-4 grid w-full items-center gap-3 px-4 pb-2",
                  isFullscreen
                    ? "grid-cols-[1fr_84px_24px] lg:grid-cols-[1fr_100px_60px_120px_100px_24px]"
                    : "grid-cols-[1fr_84px_24px] sm:grid-cols-[1fr_204px_24px] md:grid-cols-[1fr_124px_24px]"
                )}
              >
                {/* Pet name */}
                <div className="flex min-h-10 items-center">
                  <EntityLink entity={competitor.pet} entityRole="pet" />
                </div>

                {/* Class - fullscreen lg+ only */}
                {isFullscreen && (
                  <span className="hidden lg:block">
                    {competitor.class?.name}
                  </span>
                )}

                {/* Number - fullscreen lg+ only */}
                {isFullscreen && (
                  <span className="hidden lg:block">{competitor.number}</span>
                )}

                {/* Result */}
                <div className="flex items-center">
                  <span>{competitor.result}</span>
                </div>

                {/* Judge - fullscreen lg+ only */}
                {isFullscreen && (
                  <div className="hidden lg:flex items-center">
                    <EntityLink entity={competitor.judge} entityRole="judge" />
                  </div>
                )}

                {/* External link */}
                <ExternalLinkButton url={competitor.webLink} />
              </div>
            ))}
          </div>
        ))}
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
          {!hasMore && totalCompetitors > 0 && (
            <span className="text-muted-foreground text-sm">
              All {totalCompetitors} results loaded
            </span>
          )}
        </div>
      )}
    </>
  );
}
