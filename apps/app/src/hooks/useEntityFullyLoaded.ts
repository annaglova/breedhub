import { useCollectionValue } from "@/hooks/useCollectionValue";
import { useDictionaryValue } from "@/hooks/useDictionaryValue";

/**
 * Hook to check if entity and all its critical related data is fully loaded
 * Used to prevent "dribbling" effect where parts of UI appear at different times
 *
 * @param entityType - Type of entity ('pet', 'breed', 'litter', etc.)
 * @param entity - The entity object
 * @returns true when all critical data is loaded
 */
export function useEntityFullyLoaded(
  entityType: string | undefined,
  entity: any
): boolean {
  // --- Pet ---
  const breed = useCollectionValue<{ name?: string }>(
    "breed",
    entityType === "pet" ? entity?.breed_id : undefined
  );
  const petStatus = useDictionaryValue(
    "pet_status",
    entityType === "pet" ? entity?.pet_status_id : undefined
  );
  const sexCode = useDictionaryValue(
    "sex",
    entityType === "pet" ? entity?.sex_id : undefined,
    "code"
  );

  // --- Kennel / Contact / Event: country ---
  const country = useDictionaryValue(
    "country",
    entityType === "kennel" || entityType === "contact" || entityType === "event"
      ? entity?.country_id
      : undefined
  );

  // --- Litter ---
  const litterStatus = useDictionaryValue(
    "litter_status",
    entityType === "litter" ? entity?.status_id : undefined
  );
  const fatherBreed = useCollectionValue<{ name?: string }>(
    "breed",
    entityType === "litter" ? entity?.father_breed_id : undefined
  );
  const motherBreed = useCollectionValue<{ name?: string }>(
    "breed",
    entityType === "litter" && entity?.mother_breed_id !== entity?.father_breed_id
      ? entity?.mother_breed_id
      : undefined
  );
  const litterKennel = useCollectionValue<{ name?: string }>(
    "account",
    entityType === "litter" ? entity?.kennel_id : undefined
  );

  // --- Event ---
  const programStatus = useDictionaryValue(
    "program_status",
    entityType === "event" ? entity?.status_id : undefined
  );
  const programType = useDictionaryValue(
    "program_type",
    entityType === "event" ? entity?.type_id : undefined
  );

  // No entity yet - not loaded
  if (!entity) {
    return false;
  }

  // Check based on entity type
  switch (entityType) {
    case "pet": {
      if (entity.breed_id && !breed?.name && !entity.breed?.name && !entity.breed_name) {
        return false;
      }
      if (entity.pet_status_id && !petStatus) {
        return false;
      }
      if (entity.sex_id && !sexCode) {
        return false;
      }
      return true;
    }

    case "breed":
      return true;

    case "kennel": {
      if (entity.country_id && !country) return false;
      return true;
    }

    case "contact": {
      if (entity.country_id && !country) return false;
      return true;
    }

    case "litter": {
      if (entity.status_id && !litterStatus) return false;
      if (entity.father_breed_id && !fatherBreed?.name) return false;
      if (entity.father_breed_id !== entity.mother_breed_id && entity.mother_breed_id && !motherBreed?.name) return false;
      if (entity.kennel_id && !litterKennel?.name && !entity.kennel?.name && !entity.kennel_name) return false;
      return true;
    }

    case "event": {
      if (entity.status_id && !programStatus) return false;
      if (entity.country_id && !country) return false;
      if (entity.type_id && !programType) return false;
      return true;
    }

    default:
      return true;
  }
}
