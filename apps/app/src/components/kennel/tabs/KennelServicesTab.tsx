import { SalePetCard, type SalePet } from "@/components/shared/SalePetCard";
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

/** Service ID → display name mapping */
const SERVICE_NAMES: Record<string, string> = {
  "3370ee61-86de-49ae-a8ec-5cef5f213ecd": "Children for sale",
  "28655f5b-06d8-4308-ba0d-de2f5b9ef9bf": "Frozen sperm",
  "ea48e37d-8f65-4122-bc00-d012848d78ae": "Mating",
  "e922b16d-c0c0-46c6-af83-855ddad013f6": "Pre reservation",
  "8a97a5df-a169-4b6e-b72b-7512106fdcf8": "Rent",
  "ddc59ace-c622-4d6b-b473-19e9a313ed21": "Sale",
};

/** Resolve service IDs to names */
function resolveServiceNames(services: any): string[] {
  if (!services) return [];
  // services can be array of IDs or object {"1": "id", "2": "id"}
  const ids: string[] = Array.isArray(services)
    ? services
    : Object.values(services);
  return ids.map((id) => SERVICE_NAMES[id] || id).filter(Boolean);
}

function mapToSalePet(item: any): SalePet {
  return {
    id: item.pet_id || item.id,
    name: item.pet_name || "",
    slug: item.pet_slug ? `pets/${item.pet_slug}` : undefined,
    avatarUrl: item.pet_avatar_url || undefined,
    breed: item.breed_name
      ? { name: item.breed_name, slug: item.breed_slug ? `breeds/${item.breed_slug}` : undefined }
      : undefined,
    sex: item.sex_name
      ? { code: item.sex_name.toLowerCase(), name: item.sex_name }
      : undefined,
    dateOfBirth: item.date_of_birth,
    countryOfBirth: item.country_of_birth_name
      ? { code: item.country_of_birth_name, name: item.country_of_birth_name }
      : undefined,
    father: item.father_name
      ? { name: item.father_name, slug: item.father_slug ? `pets/${item.father_slug}` : undefined }
      : undefined,
    mother: item.mother_name
      ? { name: item.mother_name, slug: item.mother_slug ? `pets/${item.mother_slug}` : undefined }
      : undefined,
    serviceFeatures: resolveServiceNames(item.services),
  };
}

interface KennelServicesTabProps {
  onLoadedCount?: (count: number) => void;
  mode?: "scroll" | "fullscreen";
  dataSource?: DataSourceConfig[];
}

/**
 * KennelServicesTab - Kennel's pets/offspring for sale (offers)
 *
 * Data source: dataSource[0] -> kennel_offer_with_details (kennel_account_id -> account)
 * Shows pets that have services (for sale, mating, rent, etc.)
 * Uses SalePetCard with service feature badges and parent avatars.
 */
export function KennelServicesTab({
  onLoadedCount,
  mode,
  dataSource,
}: KennelServicesTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const accountId = selectedEntity?.id;
  const isFullscreen = spaceStore.isFullscreen.value || mode === "fullscreen";

  // Drawer: load limited set
  const drawerData = useTabData({
    parentId: accountId,
    dataSource: dataSource?.[0]!,
    enabled: !!dataSource?.[0] && !!accountId && !isFullscreen,
  });

  // Fullscreen: infinite scroll
  const infiniteData = useInfiniteTabData({
    parentId: accountId,
    dataSource: dataSource?.[0]!,
    enabled: !!dataSource?.[0] && !!accountId && isFullscreen,
    pageSize: 30,
  });

  const rawData = isFullscreen ? infiniteData.data : drawerData.data;
  const isLoading = isFullscreen ? infiniteData.isLoading : drawerData.isLoading;

  const pets = useMemo<SalePet[]>(
    () =>
      (rawData || []).map((r: any) => mapToSalePet({ ...r, ...r.additional })),
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
    if (isFullscreen && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [isFullscreen, hasMore, isLoadingMore, loadMore]);

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
  }, [isFullscreen, handleLoadMore, hasMore, isLoadingMore, pets.length]);

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
        No services data available
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
          <SalePetCard key={pet.id} pet={pet} />
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
              All {pets.length} offers loaded
            </span>
          )}
        </div>
      )}
    </div>
  );
}
