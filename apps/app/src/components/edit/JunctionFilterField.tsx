/**
 * JunctionFilterField — wrapper for fields with many-to-many junction table filtering.
 *
 * React hooks can't be called in loops, so this wrapper component
 * calls useJunctionFilterIds for each field that needs junction filtering.
 *
 * Used by: EditFormTab, EditChildRecordDialog, FiltersDialog.
 * Single source of truth — don't copy this into other components.
 */
import { useJunctionFilterIds } from "@breedhub/rxdb-store";
import type { BaseFieldConfig } from "@/types/field-config";

interface JunctionFilterFieldProps {
  field: BaseFieldConfig;
  Component: React.ComponentType<any>;
  parentFieldValue?: string;
  [key: string]: any;
}

export function JunctionFilterField({
  field,
  Component,
  parentFieldValue,
  ...componentProps
}: JunctionFilterFieldProps) {
  const { filterByIds, junctionFilter } = useJunctionFilterIds({
    junctionTable: field.junctionTable!,
    junctionField: field.junctionField!,
    junctionFilterField: field.junctionFilterField!,
    filterValue: parentFieldValue,
  });

  return (
    <Component
      {...componentProps}
      filterByIds={filterByIds}
      junctionFilter={junctionFilter}
    />
  );
}
