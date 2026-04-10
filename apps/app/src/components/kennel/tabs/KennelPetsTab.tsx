import { PetCard, type Pet } from "@/components/shared/PetCard";
import type { SexCode } from "@/components/shared/PetSexMark";
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

function mapToPet(item: any): Pet {
  return {
    id: item.pet_id,
    name: item.pet_name,
    url: item.pet_slug ? `/${item.pet_slug}` : "",
    avatarUrl: item.pet_avatar_url || "",
    sex: item.sex_name?.toLowerCase() as SexCode,
    dateOfBirth: item.date_of_birth,
    countryOfBirth: item.country_of_birth_name,
    breed: item.breed_name
      ? {
          id: item.breed_id,
          name: item.breed_name,
          url: `/${item.breed_slug}`,
        }
      : undefined,
    father: item.father_name
      ? {
          id: item.father_id,
          name: item.father_name,
          url: item.father_slug ? `/${item.father_slug}` : "",
        }
      : undefined,
    mother: item.mother_name
      ? {
          id: item.mother_id,
          name: item.mother_name,
          url: item.mother_slug ? `/${item.mother_slug}` : "",
        }
      : undefined,
  };
}

interface KennelPetsTabProps {
  onLoadedCount?: (count: number) => void;
  mode?: "scroll" | "fullscreen";
  dataSource?: DataSourceConfig[];
}

/**
 * KennelPetsTab - Kennel's own pets
 *
 * Data source: dataSource[0] → kennel_pet_with_details (owner_kennel_id → account)
 */
export function KennelPetsTab({
  onLoadedCount,
  mode,
  dataSource,
}: KennelPetsTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const accountId = selectedEntity?.id;
  const isFullscreen = spaceStore.isFullscreen.value || mode === "fullscreen";

  // Drawer: load limited set
  const drawerData = useTabData({
    parentId: accountId,
    dataSource: dataSource?.[0]!,
    0
  });

  // Fullscreen: infinite scroll
  const infiniteData = useInfiniteTabData({
    parentId: accountId,
    dataSource: dataSource?.[0]!,
    enabled: !!dataSource?.[0] && !!accountId && isTabFullscreen,
    pageSize: 30,
  });

  const rawData = isFullscreen ? infiniteData.data : drawerData.data;
  const isLoading = isFullscreen ? infiniteData.isLoading : drawerData.isLoading;

  const pets = useMemo<Pet[]>(
    () =>
      (rawData || []).map((r: any) => mapToPet({ ...r, ...r.additional })),
    [rawData]
  );

  // Report loaded count
  useEffect(() => {
    if (onLoadedCount) {
      onLoadedCount(pets.length);
    }
  }, [onLoadedCount, pets.length]);

  // Infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { hasMore, isLoadingMore, loadMore } = infiniteData;

  const handleLoadMore = useCallback(() => {
    if (isTabFullscreen && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [isTabFullscreen, hasMore, isLoadingMore, loadMore]);

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
  }, [isTabFullscreen, handleLoadMore, hasMore, isLoadingMore, pets.length]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (pets.length === 0) {
    return (
      <span className="text-secondary p-8 text-center block">
        No pets data available
      </span>
    );
  }

  return (
    <div className="mt-3">
      <div
        className={cn(
          "grid gap-3 sm:grid-cols-2",
          isFullscreen && "lg:grid-cols-3 xxl:grid-cols-4"
        )}
      >
        {pets.map((pet) => (
          <PetCard key={pet.id} pet={pet} mode="default" />
        ))}
      </div>

        <div ref={loadMoreRef} className="py-4 flex justify-center">
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more...</span>
            </div>
          )}
          {!hasMore && pets.length > 0 && (
            <span className="text-muted-foreground text-sm">
              All {pets.length} pets loaded
            </span>
          )}
        </div>
      )}
    </div>
  );
}
