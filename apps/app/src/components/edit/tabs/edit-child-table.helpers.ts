import { getChildField } from "@breedhub/rxdb-store";
import type { EditFieldConfig } from "@/types/field-config";

export type EditChildTableFieldConfig = EditFieldConfig;

export interface ForeignKeyField {
  fieldName: string;
  referencedTable: string;
  referencedFieldName: string;
}

/** Extract field name from config key: "title_in_pet_field_date" -> "date" */
export function extractFieldName(configKey: string): string {
  const match = configKey.match(/_field_(.+)$/);
  return match ? match[1] : configKey;
}

export function getForeignKeyFields(
  fields: Record<string, EditChildTableFieldConfig> | undefined,
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

export function buildEnrichmentSignature(
  records: Array<Record<string, unknown>>,
  fkFields: ForeignKeyField[],
): string {
  const signatureFkFields = fkFields
    .map(
      (field) =>
        `${field.fieldName}:${field.referencedTable}:${field.referencedFieldName}`,
    )
    .join("|");
  const signatureValues = records
    .map((record) => {
      const id = record.id ?? "";
      const fkVals = fkFields
        .map((field) => String(getChildField(record, field.fieldName) ?? ""))
        .join(",");
      return `${id}=${fkVals}`;
    })
    .join("|");
  return `${signatureFkFields}::${signatureValues}`;
}

export const ENRICHMENT_CACHE_LIMIT = 32;

export function rememberEnrichment<TValue>(
  cache: Map<string, TValue>,
  key: string,
  result: TValue,
  limit = ENRICHMENT_CACHE_LIMIT,
): void {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, result);
  while (cache.size > limit) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}
