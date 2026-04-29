export interface DictionaryDedupeOptions {
  idField?: string;
  nameField?: string;
  search?: string;
  limit?: number;
  cursor?: string | null;
  additionalFields?: string[];
  filterByIds?: string[];
  junctionFilter?: {
    junctionTable: string;
    junctionFilterField: string;
    filterValue: string;
  };
  defaultFilters?: Record<string, unknown>;
}

function stableObjectKey(value: Record<string, unknown> | undefined): string {
  if (!value) return "";
  return JSON.stringify(
    Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = value[key];
        return acc;
      }, {}),
  );
}

export function buildDictionaryDedupeKey(
  tableName: string,
  options: DictionaryDedupeOptions = {},
): string {
  const ids = options.filterByIds ? [...options.filterByIds].sort().join(",") : "";
  const fields = options.additionalFields
    ? [...options.additionalFields].sort().join(",")
    : "";
  const filters = stableObjectKey(options.defaultFilters);
  const junction = options.junctionFilter
    ? [
        options.junctionFilter.junctionTable,
        options.junctionFilter.junctionFilterField,
        options.junctionFilter.filterValue,
      ].join("|")
    : "";

  return [
    tableName,
    options.idField ?? "id",
    options.nameField ?? "name",
    options.search ?? "",
    options.limit ?? 30,
    options.cursor ?? "",
    fields,
    ids,
    junction,
    filters,
  ].join("::");
}
