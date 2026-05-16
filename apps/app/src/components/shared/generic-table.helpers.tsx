import type { EditFieldConfig } from "@/types/field-config";
import { dictionaryStore, extractFieldName, getChildField } from "@breedhub/rxdb-store";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@ui/components/data-table";

export type GenericTableFieldConfig = EditFieldConfig;

export interface ForeignKeyField {
  fieldName: string;
  referencedTable: string;
  referencedFieldName: string;
}

export function getForeignKeyFields(
  fields: Record<string, GenericTableFieldConfig> | undefined,
): ForeignKeyField[] {
  if (!fields) return [];
  return Object.entries(fields)
    .filter(([, config]) => config.isForeignKey)
    .map(([key, config]) => ({
      fieldName: extractFieldName(key),
      referencedTable: config.referencedTable as string,
      referencedFieldName: (config.referencedFieldName || "name") as string,
    }));
}

export function formatCellValue(value: unknown, fieldType?: string): string {
  if (value == null || value === "") return "";

  if (fieldType === "boolean" || typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (fieldType === "date" || fieldType === "datetime") {
    const date = new Date(value as string);
    if (!isNaN(date.getTime())) {
      return fieldType === "datetime"
        ? date.toLocaleString()
        : date.toLocaleDateString();
    }
  }

  return String(value);
}

export interface BuildColumnsOptions {
  /**
   * When true, only fields with `showInTable: true` become columns.
   * Used by EditChildTableTab where `fields` is the full editable schema.
   * When false (default), every field in the object becomes a column —
   * used by space-level table views where `fields` IS the column list.
   */
  showInTableOnly?: boolean;
}

export function buildColumns(
  fields: Record<string, GenericTableFieldConfig>,
  options: BuildColumnsOptions = {},
): ColumnDef<any>[] {
  const { showInTableOnly = false } = options;
  return Object.entries(fields)
    .filter(([, config]) => (showInTableOnly ? !!config.showInTable : true))
    .sort(
      (a, b) =>
        (a[1].order ?? a[1].sortOrder ?? 0) -
        (b[1].order ?? b[1].sortOrder ?? 0),
    )
    .map(([key, config]) => {
      const fieldName = extractFieldName(key);
      return {
        id: fieldName,
        accessorFn: (row: any) =>
          getChildField(row, fieldName) ?? row?.[fieldName] ?? "",
        enableGlobalFilter: !!config.searchable,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={config.displayName} />
        ),
        cell: ({ getValue }) => formatCellValue(getValue(), config.fieldType),
      };
    });
}

/** Resolve FK UUIDs to display names — batch lookup via dictionary store. */
export async function enrichRecords(
  records: any[],
  fields: Record<string, GenericTableFieldConfig>,
): Promise<any[]> {
  const fkFields = getForeignKeyFields(fields);

  if (fkFields.length === 0) return records;

  const lookups = new Map<string, Map<string, string>>();
  await Promise.all(
    fkFields.map(async (fk) => {
      const ids = new Set<string>();
      for (const r of records) {
        const val =
          getChildField<string>(r, fk.fieldName) ??
          (r?.[fk.fieldName] as string | undefined);
        if (val) ids.add(val);
      }
      if (ids.size === 0) {
        lookups.set(fk.fieldName, new Map());
        return;
      }
      // Batch fetch via getDictionary's filterByIds path — one `.in(id, [...])`
      // query instead of N single-row `.eq(id, X).single()` calls. Single-row
      // fan-out previously exhausted PostgREST's max_locks_per_transaction on
      // large child lists (53200 "out of shared memory" errors).
      const { records: fetched } = await dictionaryStore.getDictionary(
        fk.referencedTable,
        {
          nameField: fk.referencedFieldName,
          filterByIds: [...ids],
          limit: ids.size,
        },
      );
      const resolved = new Map<string, string>();
      for (const rec of fetched) {
        const label =
          (rec as unknown as Record<string, unknown>)[fk.referencedFieldName] ??
          rec.name ??
          "";
        resolved.set(rec.id, String(label));
      }
      lookups.set(fk.fieldName, resolved);
    }),
  );

  return records.map((record) => {
    const enriched = { ...record };
    if (record.additional) enriched.additional = { ...record.additional };
    for (const fk of fkFields) {
      const resolved = lookups.get(fk.fieldName);
      if (!resolved) continue;
      if (enriched[fk.fieldName] && resolved.has(enriched[fk.fieldName])) {
        enriched[fk.fieldName] = resolved.get(enriched[fk.fieldName]);
      } else if (
        enriched.additional?.[fk.fieldName] &&
        resolved.has(enriched.additional[fk.fieldName])
      ) {
        enriched.additional[fk.fieldName] = resolved.get(
          enriched.additional[fk.fieldName],
        );
      }
    }
    return enriched;
  });
}
