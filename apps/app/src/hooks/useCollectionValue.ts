import { spaceStore } from "@breedhub/rxdb-store";
import { useEffect, useState } from "react";

/**
 * Hook to get a record from a collection by ID
 * Uses spaceStore which reads from RxDB for local-first access
 *
 * @param collection - Collection name (e.g., 'breed', 'pet')
 * @param id - The UUID to lookup
 * @param options - Optional: field to return, partition key for partitioned tables
 * @returns The record/field value or null while loading
 *
 * @example
 * const breed = useCollectionValue('breed', entity.breed_id);
 * // Returns { id, name, slug, ... } or null
 *
 * @example
 * const breedName = useCollectionValue('breed', entity.breed_id, { field: 'name' });
 * // Returns "German Shepherd" or null
 *
 * @example
 * // For partitioned tables (e.g., pet partitioned by breed_id)
 * const pet = useCollectionValue('pet', entity.father_id, {
 *   partitionKey: { field: 'breed_id', value: entity.father_breed_id }
 * });
 */
export function useCollectionValue<T = Record<string, unknown>>(
  collection: string | undefined,
  id: string | undefined | null,
  options?: string | {
    field?: string;
    partitionKey?: { field: string; value: string | undefined | null };
  }
): T | null {
  const [value, setValue] = useState<T | null>(null);

  // Normalize options - support legacy string format for field
  const normalizedOptions = typeof options === 'string'
    ? { field: options }
    : options;

  const field = normalizedOptions?.field;
  const partitionKey = normalizedOptions?.partitionKey;

  useEffect(() => {
    if (!collection || !id) {
      setValue(null);
      return;
    }

    let isMounted = true;

    const loadValue = async () => {
      try {
        // Build partition key if provided and has value
        const pk = partitionKey?.field && partitionKey?.value
          ? { field: partitionKey.field, value: partitionKey.value }
          : undefined;

        const record = await spaceStore.getRecordById(collection, id, pk);
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
  }, [collection, id, field, partitionKey?.field, partitionKey?.value]);

  return value;
}
