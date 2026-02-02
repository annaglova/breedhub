import { PetCard, type Pet } from "@/components/shared/PetCard";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore, dictionaryStore, supabase } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface LitterChildrenTabProps {
  onLoadedCount?: (count: number) => void;
  mode?: "scroll" | "fullscreen";
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

/**
 * LitterChildrenTab - Litter's children (puppies/kittens)
 *
 * Loads real children data from database:
 * 1. Fetch pets where litter_id = entity.id via spaceStore
 * 2. Enrich each pet with sex, breed, status via dictionaryStore
 *
 * Displays in grid format using PetCard (litter mode).
 */
export function LitterChildrenTab({
  onLoadedCount,
  mode,
}: LitterChildrenTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value || mode === "fullscreen";

  // State for children data
  const [children, setChildren] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load children when entity changes
  useEffect(() => {
    if (!selectedEntity?.id) {
      setChildren([]);
      setIsLoading(false);
      return;
    }

    async function loadChildren() {
      setIsLoading(true);

      try {
        // Ensure dictionaryStore is initialized
        if (!dictionaryStore.initialized.value) {
          await dictionaryStore.initialize();
        }

        // ID-First: Load pets where litter_id = entity.id
        // 1. Check RxDB first
        let rawPets: any[] = [];
        const db = spaceStore.db;
        const collection = db?.collections?.["pet"];

        if (collection) {
          const cachedDocs = await collection
            .find({ selector: { litter_id: selectedEntity.id, _deleted: false } })
            .exec();
          rawPets = cachedDocs.map((doc: any) => doc.toJSON());
          console.log(`[LitterChildrenTab] RxDB cache: ${rawPets.length} children`);
        }

        // 2. If not in RxDB, fetch from Supabase and cache
        if (rawPets.length === 0) {
          // Get breed_id(s) from parents for partition pruning
          const fatherBreedId = selectedEntity.father_breed_id;
          const motherBreedId = selectedEntity.mother_breed_id;

          // Collect unique parent breed IDs
          const parentBreedIds = [...new Set([fatherBreedId, motherBreedId].filter(Boolean))];

          if (parentBreedIds.length === 0) {
            console.warn("[LitterChildrenTab] No breed_id available from parents");
            setChildren([]);
            return;
          }

          // Get related breeds (children can be different breed than parents, e.g., mini dachshund → rabbit dachshund)
          const { data: relatedBreeds } = await supabase
            .from("related_breed")
            .select("connected_breed_id")
            .in("breed_id", parentBreedIds);

          const relatedBreedIds = (relatedBreeds || [])
            .map((r) => r.connected_breed_id)
            .filter(Boolean);

          // Combine parent breeds + related breeds
          const allBreedIds = [...new Set([...parentBreedIds, ...relatedBreedIds])];

          console.log("[LitterChildrenTab] Fetching from Supabase, litter_id:", selectedEntity.id, "breed_ids:", allBreedIds);

          const { data, error } = await supabase
            .from("pet")
            .select("*")
            .eq("litter_id", selectedEntity.id)
            .in("breed_id", allBreedIds)
            .or("deleted.is.null,deleted.eq.false")
            .order("name", { ascending: true })
            .limit(50);

          if (error) {
            console.error("[LitterChildrenTab] Supabase error:", error.message, error.code, error.details, error.hint);
            setChildren([]);
            return;
          }

          rawPets = data || [];

          // Cache in RxDB for future requests
          if (rawPets.length > 0 && collection) {
            const mapped = rawPets.map((pet) => ({
              ...pet,
              _deleted: false,
              updated_at: pet.updated_at || new Date().toISOString(),
            }));
            await collection.bulkUpsert(mapped);
            console.log(`[LitterChildrenTab] Cached ${rawPets.length} children in RxDB`);
          }
        }

        // Enrich each pet with lookups
        const enrichedPets = await Promise.all(
          rawPets.map((pet: any) => enrichPetForCard(pet))
        );

        setChildren(enrichedPets);
      } catch (error) {
        console.error("[LitterChildrenTab] Failed to load children:", error);
        setChildren([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadChildren();
  }, [selectedEntity?.id]);

  // Report loaded count to parent
  useEffect(() => {
    if (!isLoading && onLoadedCount) {
      onLoadedCount(children.length);
    }
  }, [isLoading, children.length, onLoadedCount]);

  // Loading state
  if (isLoading) {
    return (
      <div className="py-4 px-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-secondary">Loading...</span>
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
