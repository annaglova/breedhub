import { PetCard, type Pet } from "@/components/shared/PetCard";
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
 * Raw pet data from VIEW (top_pet_in_breed_with_pet)
 */
interface TopPetViewRecord {
  id: string;
  breed_id: string;
  pet_id: string;
  placement: number;
  rating?: number;
  period_start: string;
  period_end: string;
  pet?: {
    id: string;
    name: string;
    slug: string;
    avatar_url?: string;
    sex?: string;
    country_of_birth?: string;
    date_of_birth?: string;
    titles?: string;
    father?: {
      id?: string;
      name: string;
      slug: string;
    };
    mother?: {
      id?: string;
      name: string;
      slug: string;
    };
  };
}

interface BreedTopPetsTabProps {
  dataSource?: DataSourceConfig;
  onLoadedCount?: (count: number) => void;
}

/**
 * BreedTopPetsTab - Top pets grid
 *
 * Displays top pets in the breed with detailed cards.
 *
 * Data flow (Config-Driven, Local-First):
 * 1. dataSource config defines VIEW to load
 * 2. useTabData → TabDataService → SpaceStore → RxDB
 * 3. VIEW pre-joins pet data with parents, sex, country as JSONB
 * 4. Component transforms to Pet format for PetCard
 *
 * Loading modes:
 * - Drawer: useTabData (load all at once, limited to ~20)
 * - Fullscreen: useInfiniteTabData (infinite scroll with ID-First pagination)
 *
 * Grid columns:
 * - Default (drawer): 1 col → sm:2 cols
 * - Fullscreen: 1 col → sm:2 cols → lg:3 cols → xxl:4 cols
 *
 * @see docs/TAB_DATA_SERVICE_ARCHITECTURE.md
 */
export function BreedTopPetsTab({
  dataSource,
  onLoadedCount,
}: BreedTopPetsTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const breedId = selectedEntity?.id;
  const isFullscreen = spaceStore.isFullscreen.value;

  console.log("[BreedTopPetsTab] render:", {
    breedId,
    isFullscreen,
    selectedEntity: selectedEntity?.name,
  });

  // Drawer mode: load all at once (limited)
  const drawerResult = useTabData<TopPetViewRecord>({
    parentId: breedId,
    dataSource: dataSource!,
    enabled: !!dataSource && !!breedId && !isFullscreen,
  });

  // Fullscreen mode: infinite scroll with ID-First pagination
  const infiniteResult = useInfiniteTabData<TopPetViewRecord>({
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

  // Transform VIEW data to Pet format (must be before useEffect that uses pets.length)
  const pets = useMemo<Pet[]>(() => {
    if (!data || data.length === 0) return [];

    return data.map((record) => {
      // Pet data is embedded as JSONB in VIEW
      // For child records, data is in `additional` field
      const pet = record.pet || (record as any).additional?.pet;

      return {
        id: pet?.id || record.pet_id || record.id,
        name: pet?.name || "Unknown",
        avatarUrl: pet?.avatar_url || "",
        url: pet?.slug ? `/${pet.slug}` : `/pet/${pet?.id || record.pet_id}`,
        sex: pet?.sex as Pet["sex"],
        countryOfBirth: pet?.country_of_birth,
        dateOfBirth: pet?.date_of_birth,
        titles: pet?.titles,
        father: pet?.father
          ? {
              id: pet.father.id,
              name: pet.father.name,
              url: pet.father.slug ? `/${pet.father.slug}` : "#",
            }
          : undefined,
        mother: pet?.mother
          ? {
              id: pet.mother.id,
              name: pet.mother.name,
              url: pet.mother.slug ? `/${pet.mother.slug}` : "#",
            }
          : undefined,
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
  // Dependencies include `pets.length` to re-run when data loads and ref becomes available
  useEffect(() => {
    console.log("[BreedTopPetsTab] IntersectionObserver effect:", {
      isFullscreen,
      hasRef: !!loadMoreRef.current,
      petsLength: pets.length,
    });
    if (!isFullscreen || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        console.log("[BreedTopPetsTab] IntersectionObserver fired:", {
          isIntersecting: entries[0]?.isIntersecting,
          hasMore,
          isLoadingMore,
        });
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [isFullscreen, handleLoadMore, hasMore, isLoadingMore, pets.length]);

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
        <span className="ml-2 text-secondary">Loading pets...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-4 px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">Failed to load pets</p>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (pets.length === 0) {
    return (
      <div className="card card-rounded mt-5 flex flex-auto flex-col p-6 lg:px-8">
        <span className="text-muted-foreground p-8 text-center ">
          There are no pets in the Breed!
        </span>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "grid gap-3 sm:grid-cols-2 px-6",
          // In fullscreen mode, show more columns on larger screens
          isFullscreen && "lg:grid-cols-3 xxl:grid-cols-4"
        )}
      >
        {pets.map((pet) => (
          <PetCard key={pet.id} pet={pet} mode="default" />
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
          {!hasMore && pets.length > 0 && (
            <span className="text-muted-foreground text-sm">
              All {pets.length} pets loaded
            </span>
          )}
        </div>
      )}
    </>
  );
}
