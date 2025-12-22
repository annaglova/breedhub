import { dictionaryStore } from "@breedhub/rxdb-store";
import { useEffect, useState } from "react";

/**
 * Hook to resolve a dictionary ID to a field value
 * Uses dictionaryStore which caches values in RxDB for local-first access
 *
 * @param table - Dictionary table name (e.g., 'pet_status', 'sex')
 * @param id - The UUID to resolve
 * @param field - The field to return (default: 'name')
 * @returns The resolved field value or null while loading
 *
 * @example
 * const statusName = useDictionaryValue('pet_status', entity.pet_status_id);
 * // Returns "Retired", "Active producer", etc.
 *
 * @example
 * const sexCode = useDictionaryValue('sex', entity.sex_id, 'code');
 * // Returns "male", "female", etc.
 */
export function useDictionaryValue(
  table: string | undefined,
  id: string | undefined | null,
  field: string = 'name'
): string | null {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    if (!table || !id) {
      setValue(null);
      return;
    }

    let isMounted = true;

    const loadValue = async () => {
      try {
        const record = await dictionaryStore.getRecordById(table, id);
        if (isMounted && record) {
          setValue(record[field] as string);
        }
      } catch (error) {
        console.error(
          `[useDictionaryValue] Failed to load ${table}/${id}:`,
          error
        );
      }
    };

    loadValue();

    return () => {
      isMounted = false;
    };
  }, [table, id, field]);

  return value;
}
