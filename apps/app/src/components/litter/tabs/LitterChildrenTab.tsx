import { PetCard, type Pet } from "@/components/shared/PetCard";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore, dictionaryStore, useTabData, supabase } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useMemo } from "react";

interface LitterChildrenTabProps {
  onLoadedCount?: (count: number) => void;
  mode?: "scroll" | "fullscreen";
  dataSource?: DataSourceConfig;
}

/**
 * Load lookup data by ID using dictionaryStore
 */
async function loadLookupById(
  table: string,
  id: string | null | undefined
): Promise<Record<string, unknown> | null> {
  if (!id) return null;
  return dictionaryStore.getRecordById(table, id);
}

/**
 * Transform raw pet record to PetCard format with enrichment
 */
async function enrichPetForCard(rawPet: any): Promise<Pet> {
  // Load lookups in parallel
  const [sex, breed, petStatus, country] = await Promise.all([
    loadLookupById("sex", rawPet.sex_id),
    loadLookupById("breed", rawPet.breed_id),
    loadLookupById("pet_status", rawPet.pet_status_id),
    loadLookupById("country", rawPet.country_of_birth_id),
  ]);

  return {
    id: rawPet.id,
    name: rawPet.name || "Unknown",
    avatarUrl: rawPet.avatar_url || "",
    url: rawPet.slug ? `/${rawPet.slug}` : `/pet/${rawPet.id}`,
    sex: (sex?.code as string) || undefined,
    countryOfBirth: (country?.code as string) || undefined,
    dateOfBirth: rawPet.date_of_birth,
    titles: rawPet.titles,
    breed: breed
      ? {
          id: rawPet.breed_id,
          name: String(breed.name || ""),
          url: breed.slug ? `/${breed.slug}` : "",
        }
      : undefined,
    status: (petStatus?.name as string) || undefined,
  };
}

// Default dataSource for pet_in_litter
const defaultDataSource: DataSourceConfig = {
  type: "child",
  childTable: {
    table: "pet_in_litter",
    parentField: "litter_id",
  },
};

/**
 * LitterChildrenTab - Litter's children (puppies/kittens)
 *
 * Data flow:
 * 1. Load pet_in_litter records via useTabData (cached in litter_children)
 * 2. Fetch full pet data using pet_id + pet_breed_id (partition pruning)
 * 3. Enrich with dictionaries (sex, breed, status, country)
 *
 * Displays in grid format using PetCard (litter mode).
 */
export function LitterChildrenTab({
  onLoadedCount,
  mode,
  dataSource = defaultDataSource,
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
    dataSource,
    enabled: !!litterId,
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
        const petRefs = junctionRecords.map((record: any) => ({
          petId: record.additional?.pet_id || record.pet_id,
          breedId: record.additional?.pet_breed_id || record.pet_breed_id,
        }));

        // Group by breed for batch queries (partition pruning)
        const byBreed = new Map<string, string[]>();
        for (const ref of petRefs) {
          if (!ref.petId || !ref.breedId) continue;
          if (!byBreed.has(ref.breedId)) {
            byBreed.set(ref.breedId, []);
          }
          byBreed.get(ref.breedId)!.push(ref.petId);
        }

        // Fetch pets from each breed partition
        const allPets: any[] = [];
        for (const [breedId, petIds] of byBreed.entries()) {
          const { data, error } = await supabase
            .from("pet")
            .select("*")
            .eq("breed_id", breedId)
            .in("id", petIds)
            .or("deleted.is.null,deleted.eq.false");

          if (!error && data) {
            allPets.push(...data);
          }
        }

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

  // Loading state
  if (isLoadingJunction || isEnriching) {
    return (
      <div className="py-4 px-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-secondary">Loading...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-4 px-6">
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
