/**
 * Hook for sorting and grouping form fields by order and group.
 * Used by EditFormTab and EditChildRecordDialog.
 */
import { useMemo } from "react";

interface GroupableField {
  order?: number;
  sortOrder?: number;
  group?: string;
  groupLayout?: "horizontal" | "vertical";
}

export interface FieldGroup<F extends GroupableField> {
  label: string | null;
  layout: "horizontal" | "vertical";
  fields: Array<[string, F]>;
}

export function useFormFieldGrouping<F extends GroupableField>(
  fields: Record<string, F> | null | undefined
): FieldGroup<F>[] {
  return useMemo(() => {
    if (!fields) return [];

    const entries = Object.entries(fields);
    if (entries.length === 0) return [];

    const sorted = entries.sort(
      ([, a], [, b]) => (a.order ?? a.sortOrder ?? 0) - (b.order ?? b.sortOrder ?? 0)
    );

    const groups: FieldGroup<F>[] = [];
    const groupMap = new Map<string | null, FieldGroup<F>>();

    for (const entry of sorted) {
      const groupKey = entry[1].group || null;
      if (!groupMap.has(groupKey)) {
        const group: FieldGroup<F> = {
          label: groupKey,
          layout: (entry[1].groupLayout || "vertical") as "horizontal" | "vertical",
          fields: [],
        };
        groupMap.set(groupKey, group);
        groups.push(group);
      }
      groupMap.get(groupKey)!.fields.push(entry);
    }

    return groups;
  }, [fields]);
}
