import type { Pet } from "@/components/shared/PetCard";
import { normalizeSexCode } from "@/components/shared/pedigree/types";
import { loadLookupById } from "@/utils/lookup";
import { spaceStore } from "@breedhub/rxdb-store";

/**
 * Transforms a raw pet row (current `pet` table shape) into the Pet card shape,
 * resolving sex/breed/status/country via the dictionary store.
 *
 * Use after loading pets through `spaceStore.loadEntitiesByPartitionRefs("pet", …)`
 * — the row has IDs (`sex_id`, `breed_id`, `pet_status_id`, `country_of_birth_id`)
 * but no joined display strings.
 */
export async function enrichPetForCard(rawPet: any): Promise<Pet> {
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
    sex: normalizeSexCode((sex?.code as string) || undefined),
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
 * Batch-enriches a list of raw pet rows with sex/breed/status/country AND
 * resolves each pet's father/mother via one extra partition-pruned pet lookup.
 *
 * Use for kennel/contact pet grids where parent names must appear on the card.
 * Litter children should use `enrichPetForCard` directly (parents are uniform
 * across the litter, shown at litter level).
 */
export async function enrichPetsWithParents(
  rawPets: any[],
  partitionField: string,
): Promise<Pet[]> {
  // Collect unique parent (id, breed_id) refs.
  const parentRefSet = new Map<string, { id: string; partitionId: string }>();
  for (const p of rawPets) {
    if (p.father_id && p.father_breed_id) {
      const key = `${p.father_id}|${p.father_breed_id}`;
      if (!parentRefSet.has(key)) {
        parentRefSet.set(key, {
          id: p.father_id,
          partitionId: p.father_breed_id,
        });
      }
    }
    if (p.mother_id && p.mother_breed_id) {
      const key = `${p.mother_id}|${p.mother_breed_id}`;
      if (!parentRefSet.has(key)) {
        parentRefSet.set(key, {
          id: p.mother_id,
          partitionId: p.mother_breed_id,
        });
      }
    }
  }

  // Single partition-pruned lookup for all unique parents.
  const parentRefs = Array.from(parentRefSet.values());
  const parents = parentRefs.length
    ? await spaceStore.loadEntitiesByPartitionRefs("pet", parentRefs, {
        partitionField,
      })
    : [];

  const parentByKey = new Map<string, { name: string; slug?: string }>();
  for (const parent of parents) {
    parentByKey.set(`${parent.id}|${parent.breed_id}`, {
      name: parent.name || "Unknown",
      slug: parent.slug as string | undefined,
    });
  }

  // Enrich each pet (sex/breed/status/country) and attach parents from the map.
  return Promise.all(
    rawPets.map(async (p) => {
      const base = await enrichPetForCard(p);
      const fatherKey =
        p.father_id && p.father_breed_id
          ? `${p.father_id}|${p.father_breed_id}`
          : null;
      const motherKey =
        p.mother_id && p.mother_breed_id
          ? `${p.mother_id}|${p.mother_breed_id}`
          : null;
      const fatherInfo = fatherKey ? parentByKey.get(fatherKey) : undefined;
      const motherInfo = motherKey ? parentByKey.get(motherKey) : undefined;

      return {
        ...base,
        father: fatherInfo
          ? {
              id: p.father_id,
              name: fatherInfo.name,
              url: fatherInfo.slug ? `/${fatherInfo.slug}` : "",
            }
          : undefined,
        mother: motherInfo
          ? {
              id: p.mother_id,
              name: motherInfo.name,
              url: motherInfo.slug ? `/${motherInfo.slug}` : "",
            }
          : undefined,
      };
    }),
  );
}
