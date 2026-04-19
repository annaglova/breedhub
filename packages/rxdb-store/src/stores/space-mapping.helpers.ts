export interface MappingRow {
  id: string;
  [key: string]: any;
}

export interface MappingSplitResult<TRecord> {
  cached: TRecord[];
  missing: MappingRow[];
}

export function buildMappingCacheKey(
  mappingTable: string,
  parentField: string,
  parentId: string,
): string {
  return `${mappingTable}:${parentField}:${parentId}`;
}

export function getMappingSelectFields(partitionField?: string): string {
  return partitionField ? `id, ${partitionField}` : "id";
}

export function hasStaleMappedRecords(
  records: Array<{ cachedAt?: number }>,
  staleMs: number,
  now = Date.now(),
): boolean {
  if (records.length === 0) {
    return false;
  }

  const oldest = Math.min(...records.map((record) => record.cachedAt || 0));
  return now - oldest > staleMs;
}

export function splitCachedAndMissingMappingRows<TRecord extends { cachedAt?: number }>(
  mappingRows: MappingRow[],
  cachedMap: Map<string, TRecord>,
  staleMs: number,
  now = Date.now(),
): MappingSplitResult<TRecord> {
  const cached: TRecord[] = [];
  const missing: MappingRow[] = [];

  for (const row of mappingRows) {
    const record = cachedMap.get(row.id);

    if (record && now - (record.cachedAt || 0) < staleMs) {
      cached.push(record);
    } else {
      missing.push(row);
    }
  }

  return { cached, missing };
}

export function orderMappedRecordsByIds<TRecord extends { id: string }>(
  ids: string[],
  cachedMap: Map<string, TRecord>,
): TRecord[] {
  return ids
    .map((id) => cachedMap.get(id))
    .filter(Boolean) as TRecord[];
}

export function groupMappingRowsByPartition(
  rows: MappingRow[],
  partitionField?: string,
): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  if (!partitionField) {
    return groups;
  }

  for (const row of rows) {
    const partitionValue = row[partitionField];
    if (!partitionValue) continue;

    if (!groups.has(partitionValue)) {
      groups.set(partitionValue, []);
    }

    groups.get(partitionValue)!.push(row.id);
  }

  return groups;
}
