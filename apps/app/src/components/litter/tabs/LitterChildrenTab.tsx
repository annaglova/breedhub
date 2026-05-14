import { PetCard, type Pet } from "@/components/shared/PetCard";
import { LitterChildrenTabSkeleton } from "./LitterChildrenTabSkeleton";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { useSkeletonWithDelay } from "@/contexts/AboveFoldLoadingContext";
import { spaceStore, dictionaryStore, useTabData, getPartitionFieldForEntity } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { enrichPetForCard } from "@/utils/pet-enrichment";
import { useSignals } from "@preact/signals-react/runtime";
import { useEffect, useState } from "react";

interface LitterChildrenTabProps {
  onLoadedCount?: (count: number) => void;
  mode?: "scroll" | "fullscreen";
  dataSource?: DataSourceConfig[];
}

/**
 * LitterChildrenTab - Litter's children (puppies/kittens)
 *
 * Data flow:
 * 1. Load pet_in_litter records via useTabData (cached in litter_children)
 * 2. Load full pet data via SpaceStore using pet_id + partitionId (local-first)
 * 3. Enrich with dictionaries (sex, breed, status, country)
 *
 * Displays in grid format using PetCard (litter mode).
 */
export function LitterChildrenTab({
  onLoadedCount,
  mode,
  dataSource,
}: LitterChildrenTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const litterId = selectedEntity?.id;
  const isFullscreen = spaceStore.isFullscreen.value || mode === "fullscreen";

  // State for enriched children
  const [children, setChildren] = useState<Pet[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);

  // 1. Load junction records from pet_in_litter via useTabData
  const {
    data: junctionRecords,
    isLoading: isLoadingJunction,
    error,
  } = useTabData({
    parentId: litterId,
    dataSource: dataSource?.[0]!,
    enabled: !!dataSource?.[0] && !!litterId,
  });

  // 2. Load and enrich pet data when junction records change
  useEffect(() => {
    if (isLoadingJunction || !junctionRecords || junctionRecords.length === 0) {
      setChildren([]);
      return;
    }

    async function loadAndEnrichPets() {
      setIsEnriching(true);

      try {
        // Ensure dictionaryStore is initialized
        if (!dictionaryStore.initialized.value) {
          await dictionaryStore.initialize();
        }

        // Extract pet_id and pet_breed_id from junction records
        // NOTE: child cache transform (space-child.helpers.ts::mapChildRowsToCacheRecords)
        // stores partition field as top-level `partitionId`, not in `additional`.
        const petRefs = junctionRecords.map((record: any) => ({
          petId: record.additional?.pet_id || record.pet_id,
          breedId: record.partitionId || record.additional?.pet_breed_id || record.pet_breed_id,
        }));

        const partitionField = getPartitionFieldForEntity("pet");
        if (!partitionField) {
          console.warn("[LitterChildrenTab] no partition field configured for pet; skipping load");
          setChildren([]);
          return;
        }
        const allPets = await spaceStore.loadEntitiesByPartitionRefs("pet", petRefs
          .filter(
            (ref): ref is { petId: string; breedId: string } =>
              !!ref.petId && !!ref.breedId,
          )
          .map((ref) => ({
            id: ref.petId,
            partitionId: ref.breedId,
          })), {
          partitionField,
        });

        // Enrich each pet with dictionaries
        const enrichedPets = await Promise.all(
          allPets.map((pet) => enrichPetForCard(pet))
        );

        setChildren(enrichedPets);
      } catch (err) {
        console.error("[LitterChildrenTab] Failed to load pets:", err);
        setChildren([]);
      } finally {
        setIsEnriching(false);
      }
    }

    loadAndEnrichPets();
  }, [junctionRecords, isLoadingJunction]);

  // Report loaded count to parent
  useEffect(() => {
    const isLoading = isLoadingJunction || isEnriching;
    if (!isLoading && onLoadedCount) {
      onLoadedCount(children.length);
    }
  }, [isLoadingJunction, isEnriching, children.length, onLoadedCount]);

  // Native column-aware skeleton with shared anti-flash window.
  const showSkeleton = useSkeletonWithDelay(isLoadingJunction || isEnriching);
  if (showSkeleton) {
    return <LitterChildrenTabSkeleton isFullscreen={isFullscreen} />;
  }

  // Error state
  if (error) {
    return (
      <div className="py-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">Failed to load children</p>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  // Check if we have children data
  const hasChildren = children.length > 0;

  return (
    <div className="mt-3">
      {hasChildren ? (
        <div
          className={`grid gap-3 sm:grid-cols-2 ${
            isFullscreen ? "lg:grid-cols-3 xxl:grid-cols-4" : ""
          }`}
        >
          {children.map((pet) => (
            <PetCard key={pet.id} pet={pet} mode="litter" />
          ))}
        </div>
      ) : (
        <span className="text-secondary p-8 text-center block">
          No children data available
        </span>
      )}
    </div>
  );
}
