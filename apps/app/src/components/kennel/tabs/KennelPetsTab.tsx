import { InfinitePetGridTab } from "@/components/shared/InfinitePetGridTab";
import type { Pet } from "@/components/shared/PetCard";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { mapKennelPetRecordToPet } from "@/utils/pet-card.mappers";
import {
  spaceStore,
  useInfiniteTabData,
  useTabData,
} from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { useEffect, useMemo } from "react";

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

  const pets = useMemo<Pet[]>(
    () =>
      (rawData || []).map((r: any) =>
        mapKennelPetRecordToPet({ ...r, ...r.additional }),
      ),
    [rawData]
  );

  // Report loaded count
  useEffect(() => {
    if (onLoadedCount) {
      onLoadedCount(pets.length);
    }
  }, [onLoadedCount, pets.length]);

  const { hasMore, isLoadingMore, loadMore } = infiniteData;

  return (
    <InfinitePetGridTab
      pets={pets}
      isLoading={isLoading}
      isFullscreen={isFullscreen}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      onLoadMore={loadMore}
      emptyMessage="No pets data available"
      className="mt-3"
    />
  );
}
