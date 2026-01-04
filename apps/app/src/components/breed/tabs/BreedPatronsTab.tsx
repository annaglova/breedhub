import { AvatarCard, AvatarEntity } from "@/components/shared/AvatarCard";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import {
  spaceStore,
  useInfiniteTabData,
  useTabData,
} from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * Raw patron data from VIEW (top_patron_in_breed_with_contact)
 */
interface PatronViewRecord {
  id: string;
  breed_id: string;
  contact_id: string;
  placement: number;
  rating?: number;
  period_start: string;
  period_end: string;
  contact?: {
    id: string;
    name: string;
    slug: string;
    avatar_url?: string;
  };
}

interface BreedPatronsTabProps {
  recordsCount?: number;
  dataSource?: DataSourceConfig;
  onLoadedCount?: (count: number) => void; // Report loaded count for conditional fullscreen
}

/**
 * BreedPatronsTab - Top patrons grid
 *
 * Displays breed patrons in a grid with placement badges.
 *
 * Data flow (Config-Driven, Local-First):
 * 1. dataSource config defines VIEW to load
 * 2. useTabData → TabDataService → SpaceStore → RxDB
 * 3. VIEW pre-joins contact data as JSONB
 * 4. Component transforms to AvatarEntity format
 *
 * Loading modes:
 * - Drawer: useTabData (load all at once, limited to ~20)
 * - Fullscreen: useInfiniteTabData (infinite scroll with ID-First pagination)
 *
 * Grid columns:
 * - Default (drawer): 2 cols → sm:3 cols
 * - Fullscreen: 2 cols → sm:3 cols → lg:4 cols → xxl:5 cols
 *
 * @see docs/TAB_DATA_SERVICE_ARCHITECTURE.md
 */
export function BreedPatronsTab({
  dataSource,
  onLoadedCount,
}: BreedPatronsTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const breedId = selectedEntity?.id;
  const isFullscreen = spaceStore.isFullscreen.value;

  // Drawer mode: load all at once (limited)
  const drawerResult = useTabData<PatronViewRecord>({
    parentId: breedId,
    dataSource: dataSource!,
    enabled: !!dataSource && !!breedId && !isFullscreen,
  });

  // Fullscreen mode: infinite scroll with ID-First pagination
  const infiniteResult = useInfiniteTabData<PatronViewRecord>({
    parentId: breedId,
    dataSource: dataSource!,
    enabled: !!dataSource && !!breedId && isFullscreen,
    pageSize: 30,
  });

  // Use appropriate data based on mode
  const data = isFullscreen ? infiniteResult.data : drawerResult.data;
  const isLoading = isFullscreen
    ? infiniteResult.isLoading
    : drawerResult.isLoading;
  const error = isFullscreen ? infiniteResult.error : drawerResult.error;

  // Transform VIEW data to AvatarEntity format (must be before useEffect that uses patrons.length)
  const patrons = useMemo<AvatarEntity[]>(() => {
    if (!data || data.length === 0) return [];

    return data.map((record) => {
      // Contact data is embedded as JSONB in VIEW
      // For child records, data is in `additional` field
      const contact = record.contact || (record as any).additional?.contact;
      const placement =
        record.placement ?? (record as any).additional?.placement;

      return {
        id: contact?.id || record.contact_id || record.id,
        name: contact?.name || "Unknown",
        avatarUrl: contact?.avatar_url || "",
        place: placement,
        url: contact?.slug
          ? `/${contact.slug}`
          : `/contact/${contact?.id || record.contact_id}`,
      };
    });
  }, [data]);

  // Infinite scroll refs and handlers (must be before any returns!)
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { hasMore, isLoadingMore, loadMore } = infiniteResult;

  const handleLoadMore = useCallback(() => {
    if (isFullscreen && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [isFullscreen, hasMore, isLoadingMore, loadMore]);

  // Report loaded count for conditional fullscreen button
  useEffect(() => {
    if (!isLoading && data && onLoadedCount) {
      onLoadedCount(data.length);
    }
  }, [data, isLoading, onLoadedCount]);

  // IntersectionObserver for infinite scroll
  // Dependencies include `patrons.length` to re-run when data loads and ref becomes available
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
  }, [isFullscreen, handleLoadMore, hasMore, isLoadingMore, patrons.length]);

  // No dataSource config - show warning
  if (!dataSource) {
    return (
      <div className="py-4 px-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700 font-semibold">
            Missing dataSource configuration
          </p>
          <p className="text-yellow-600 text-sm mt-1">
            Add dataSource to tab config to enable data loading
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="py-4 px-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-secondary">Loading patrons...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-4 px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">Failed to load patrons</p>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (patrons.length === 0) {
    return (
      <div className="card card-rounded mt-5 flex flex-auto flex-col p-6 lg:px-8">
        <span className="text-muted-foreground p-8 text-center ">
          There are no patrons in Breed!
        </span>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "mt-3 grid grid-cols-2 gap-y-6 sm:grid-cols-3 px-6",
          // In fullscreen mode, show more columns on larger screens
          isFullscreen && "lg:grid-cols-4 xxl:grid-cols-5"
        )}
      >
        {patrons.map((patron) => (
          <AvatarCard key={patron.id} entity={patron} model="contact" />
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
          {!hasMore && patrons.length > 0 && (
            <span className="text-muted-foreground text-sm">
              All {patrons.length} patrons loaded
            </span>
          )}
        </div>
      )}
    </>
  );
}
