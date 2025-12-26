import { spaceStore } from "@breedhub/rxdb-store";
import { useEffect, useState } from "react";

/**
 * Hook to get a record from a collection by ID
 * Uses spaceStore which reads from RxDB for local-first access
 *
 * @param collection - Collection name (e.g., 'breed', 'pet')
 * @param id - The UUID to lookup
 * @param field - Optional: return only this field (default: full record)
 * @returns The record/field value or null while loading
 *
 * @example
 * const breed = useCollectionValue('breed', entity.breed_id);
 * // Returns { id, name, slug, ... } or null
 *
 * @example
 * const breedName = useCollectionValue('breed', entity.breed_id, 'name');
 * // Returns "German Shepherd" or null
 */
export function useCollectionValue<T = Record<string, unknown>>(
  collection: string | undefined,
  id: string | undefined | null,
  field?: string
): T | null {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    if (!collection || !id) {
      setValue(null);
      return;
    }

    let isMounted = true;

    const loadValue = async () => {
      try {
        const record = await spaceStore.getRecordById(collection, id);
        if (isMounted && record) {
          if (field) {
            setValue(record[field] as T);
          } else {
            setValue(record as T);
          }
        }
      } catch (error) {
        console.warn(
          `[useCollectionValue] Failed to load ${collection}/${id}:`,
          error
        );
      }
    };

    loadValue();

    return () => {
      isMounted = false;
    };
  }, [collection, id, field]);

  return value;
}
