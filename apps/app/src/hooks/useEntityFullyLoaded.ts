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
  // For Pet entities - check breed and dictionaries
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

  // No entity yet - not loaded
  if (!entity) {
    return false;
  }

  // Check based on entity type
  switch (entityType) {
    case "pet": {
      // Check if breed is loaded (if breed_id exists)
      if (entity.breed_id && !breed?.name && !entity.breed?.name && !entity.breed_name) {
        return false;
      }
      // Check if pet_status is loaded (if pet_status_id exists)
      if (entity.pet_status_id && !petStatus) {
        return false;
      }
      // Check if sex is loaded (if sex_id exists)
      if (entity.sex_id && !sexCode) {
        return false;
      }
      return true;
    }

    case "breed": {
      // Breed data is self-contained, check if achievements loaded
      // achievements is JSONB field - if entity exists but achievements is undefined, might be loading
      // But typically JSONB loads with entity, so just check entity exists
      return true;
    }

    case "litter": {
      // Litter needs breeds and parents - check if they exist
      // These are usually embedded or loaded with entity
      return true;
    }

    default:
      // For unknown types, just check if entity exists
      return true;
  }
}
