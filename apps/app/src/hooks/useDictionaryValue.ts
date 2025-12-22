import { dictionaryStore } from "@breedhub/rxdb-store";
import { useEffect, useState } from "react";

/**
 * Hook to resolve a dictionary ID to its display name
 * Uses dictionaryStore which caches values in RxDB for local-first access
 *
 * @param table - Dictionary table name (e.g., 'pet_status')
 * @param id - The UUID to resolve
 * @returns The resolved name or null while loading
 *
 * @example
 * const statusName = useDictionaryValue('pet_status', entity.pet_status_id);
 * // Returns "Retired", "Active producer", etc.
 */
export function useDictionaryValue(
  table: string | undefined,
  id: string | undefined | null
): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!table || !id) {
      setName(null);
      return;
    }

    let isMounted = true;

    const loadValue = async () => {
      try {
        const record = await dictionaryStore.getRecordById(table, id);
        if (isMounted && record) {
          setName(record.name as string);
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
  }, [table, id]);

  return name;
}
