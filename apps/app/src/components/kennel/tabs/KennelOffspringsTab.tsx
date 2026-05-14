import { InfinitePetGridTab } from "@/components/shared/InfinitePetGridTab";
import type { Pet } from "@/components/shared/PetCard";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { enrichPetsWithParents } from "@/utils/pet-enrichment";
import {
  spaceStore,
  dictionaryStore,
  getPartitionFieldForEntity,
  useInfiniteTabData,
  useTabData,
} from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { useEffect, useState } from "react";

interface KennelOffspringsTabProps {
  onLoadedCount?: (count: number) => void;
  mode?: "scroll" | "fullscreen";
  dataSource?: DataSourceConfig[];
}

/**
 * KennelOffspringsTab — pets born in this kennel (account).
 *
 * Data flow (ID-First):
 * 1. Junction rows from `offspring_in_account` via useTabData / useInfiniteTabData
 * 2. Full pet rows via spaceStore.loadEntitiesByPartitionRefs (partition-pruned)
 * 3. Enriched via dictionaryStore (sex/breed/status/country)
 */
export function KennelOffspringsTab({
  onLoadedCount,
  mode,
  dataSource,
}: KennelOffspringsTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const accountId = selectedEntity?.id;
  const isFullscreen = spaceStore.isFullscreen.value || mode === "fullscreen";

  const [pets, setPets] = useState<Pet[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);

  const drawerData = useTabData({
    parentId: accountId,
    dataSource: dataSource?.[0]!,
    enabled: !!dataSource?.[0] && !!accountId && !isFullscreen,
  });

  const infiniteData = useInfiniteTabData({
    parentId: accountId,
    dataSource: dataSource?.[0]!,
    enabled: !!dataSource?.[0] && !!accountId && isFullscreen,
    pageSize: 30,
  });

  const junctionRecords = isFullscreen ? infiniteData.data : drawerData.data;
  const isLoadingJunction = isFullscreen
    ? infiniteData.isLoading
    : drawerData.isLoading;

  useEffect(() => {
    if (isLoadingJunction || !junctionRecords || junctionRecords.length === 0) {
      setPets([]);
      return;
    }

    let cancelled = false;

    async function loadAndEnrich() {
      setIsEnriching(true);

      try {
        if (!dictionaryStore.initialized.value) {
          await dictionaryStore.initialize();
        }

        const petRefs = (junctionRecords ?? []).map((record: any) => ({
          petId: record.additional?.pet_id || record.pet_id,
          breedId:
            record.partitionId ||
            record.additional?.pet_breed_id ||
            record.pet_breed_id,
        }));

        const partitionField = getPartitionFieldForEntity("pet");
        if (!partitionField) {
          console.warn(
            "[KennelOffspringsTab] no partition field configured for pet; skipping load",
          );
          if (!cancelled) setPets([]);
          return;
        }

        const allPets = await spaceStore.loadEntitiesByPartitionRefs(
          "pet",
          petRefs
            .filter(
              (ref): ref is { petId: string; breedId: string } =>
                !!ref.petId && !!ref.breedId,
            )
            .map((ref) => ({ id: ref.petId, partitionId: ref.breedId })),
          { partitionField },
        );

        const enriched = await enrichPetsWithParents(allPets, partitionField);
        if (!cancelled) setPets(enriched);
      } catch (err) {
        console.error("[KennelOffspringsTab] Failed to load pets:", err);
        if (!cancelled) setPets([]);
      } finally {
        if (!cancelled) setIsEnriching(false);
      }
    }

    loadAndEnrich();
    return () => {
      cancelled = true;
    };
  }, [junctionRecords, isLoadingJunction]);

  useEffect(() => {
    if (onLoadedCount) onLoadedCount(pets.length);
  }, [onLoadedCount, pets.length]);

  const isLoading = isLoadingJunction || isEnriching;
  const { hasMore, isLoadingMore, loadMore } = infiniteData;

  return (
    <InfinitePetGridTab
      pets={pets}
      isLoading={isLoading}
      isFullscreen={isFullscreen}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      onLoadMore={loadMore}
      emptyMessage="No offspring data available"
      allLoadedMessage={`All ${pets.length} offspring loaded`}
      className="mt-3"
    />
  );
}
