import { useCallback } from "react";
import { getDatabase } from "@breedhub/rxdb-store";
import {
  getLabelForValue,
  normalizeForUrl,
} from "@/components/space/utils/filter-url-helpers";

interface UseCreateEntityNavigationOptions {
  entitySchemaName: string;
  filterFields: Array<{ id: string; slug?: string }>;
  filters?: Record<string, any>;
  navigate: (to: string) => void;
}

export function useCreateEntityNavigation({
  entitySchemaName,
  filterFields,
  filters,
  navigate,
}: UseCreateEntityNavigationOptions) {
  return useCallback(async () => {
    const params = new URLSearchParams({ entity: entitySchemaName });

    if (filters) {
      try {
        const rxdb = await getDatabase();
        for (const [fieldId, value] of Object.entries(filters)) {
          if (!value) continue;

          const fieldConfig = filterFields.find((field) => field.id === fieldId);
          const urlKey =
            fieldConfig?.slug || fieldId.replace(/^[^_]+_field_/, "");
          const label = await getLabelForValue(
            fieldConfig as any,
            String(value),
            rxdb as any,
          );

          params.set(urlKey, normalizeForUrl(label));
        }
      } catch {
        for (const [fieldId, value] of Object.entries(filters)) {
          if (value) {
            const dbName = fieldId.replace(/^[^_]+_field_/, "");
            params.set(dbName, String(value));
          }
        }
      }
    }

    navigate(`/new?${params.toString()}`);
  }, [entitySchemaName, filterFields, filters, navigate]);
}
