import {
  cacheRecords,
  docMapToRecordMap,
  type BulkUpsertCollection,
} from "./space-id-cache.helpers";

export interface MappingRow {
  id: string;
  [key: string]: any;
}

export interface MappingSplitResult<TRecord> {
  cached: TRecord[];
  missing: MappingRow[];
}

export interface LoadEntitiesViaMappingCollection<TCachedRecord = any>
  extends BulkUpsertCollection<TCachedRecord> {
  findByIds(ids: string[]): {
    exec(): Promise<Map<string, { toJSON(): unknown }>>;
  };
  find(): {
    exec(): Promise<Array<{ toJSON(): unknown }>>;
  };
}

export interface LoadEntitiesViaMappingOptions<
  TRecord extends { id: string; cachedAt?: number },
  TCachedRecord = TRecord,
> {
  entityTable: string;
  mappingTable: string;
  parentField: string;
  parentId: string;
  partitionField?: string;
  cacheKey: string;
  staleMs: number;
  mappingCache: Map<string, MappingRow[]>;
  collection?: LoadEntitiesViaMappingCollection<TCachedRecord>;
  isOffline: boolean;
  loadMappingRows: () => Promise<MappingRow[] | null | undefined>;
  fetchRecords: (rows: MappingRow[]) => Promise<TRecord[]>;
  mapRecordForCache?: (record: TRecord) => TCachedRecord;
  offlineScanPredicate: (record: TRecord) => boolean;
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

export async function fetchRecordsByMappingRows<TRecord>(
  rows: MappingRow[],
  options: {
    partitionField?: string;
    fetchAll: (ids: string[]) => Promise<TRecord[]>;
    fetchPartition: (partitionValue: string, ids: string[]) => Promise<TRecord[]>;
  },
): Promise<TRecord[]> {
  if (!options.partitionField) {
    return options.fetchAll(rows.map((row) => row.id));
  }

  const groups = groupMappingRowsByPartition(rows, options.partitionField);
  const results: TRecord[] = [];

  for (const [partitionValue, ids] of groups) {
    const partitionRecords = await options.fetchPartition(partitionValue, ids);
    results.push(...partitionRecords);
  }

  return results;
}

export async function loadEntitiesViaMappingFlow<
  TRecord extends { id: string; cachedAt?: number },
  TCachedRecord = TRecord,
>(
  options: LoadEntitiesViaMappingOptions<TRecord, TCachedRecord>,
): Promise<TRecord[]> {
  const cachedMapping = options.mappingCache.get(options.cacheKey);
  if (cachedMapping && cachedMapping.length > 0 && options.collection) {
    const ids = cachedMapping.map((row) => row.id);
    const docs = await options.collection.findByIds(ids).exec();

    if (docs.size > 0) {
      const cachedMap = docMapToRecordMap<TRecord>(docs);
      const results = orderMappedRecordsByIds<TRecord>(ids, cachedMap);

      if (!options.isOffline && hasStaleMappedRecords(results, options.staleMs)) {
        void refreshMappingCache({
          loadMappingRows: options.loadMappingRows,
          cacheKey: options.cacheKey,
          mappingCache: options.mappingCache,
          fetchRecords: options.fetchRecords,
          collection: options.collection,
          mapRecordForCache: options.mapRecordForCache,
        });
      }

      return results;
    }
  }

  if (options.isOffline) {
    if (!options.collection) {
      return [];
    }

    const allDocs = await options.collection.find().exec();
    return allDocs
      .map((doc) => doc.toJSON() as TRecord)
      .filter(options.offlineScanPredicate);
  }

  const mappingRows = await options.loadMappingRows();
  if (!mappingRows?.length) {
    return [];
  }

  const safeMappingRows = mappingRows as MappingRow[];
  options.mappingCache.set(options.cacheKey, safeMappingRows);

  if (!options.collection) {
    return options.fetchRecords(safeMappingRows);
  }

  const cachedDocs = await options.collection
    .findByIds(safeMappingRows.map((row) => row.id))
    .exec();
  const cachedMap = docMapToRecordMap<TRecord>(cachedDocs);
  const { cached, missing } = splitCachedAndMissingMappingRows(
    safeMappingRows,
    cachedMap,
    options.staleMs,
  );

  if (missing.length === 0) {
    return cached;
  }

  try {
    const fresh = await options.fetchRecords(missing);
    await cacheRecords(fresh, {
      collection: options.collection,
      mapRecordForCache: options.mapRecordForCache,
    });

    const allIds = safeMappingRows.map((row) => row.id);
    const allDocs = await options.collection.findByIds(allIds).exec();
    return orderMappedRecordsByIds<TRecord>(allIds, docMapToRecordMap<TRecord>(allDocs));
  } catch {
    return cached;
  }
}

export async function refreshMappingCache<TRecord, TCachedRecord = TRecord>(
  options: {
    loadMappingRows: () => Promise<MappingRow[] | null | undefined>;
    cacheKey: string;
    mappingCache: Map<string, MappingRow[]>;
    fetchRecords: (rows: MappingRow[]) => Promise<TRecord[]>;
    collection?: BulkUpsertCollection<TCachedRecord>;
    mapRecordForCache?: (record: TRecord) => TCachedRecord;
  },
): Promise<void> {
  try {
    const mappingRows = await options.loadMappingRows();
    if (!mappingRows?.length) {
      return;
    }

    options.mappingCache.set(options.cacheKey, mappingRows);
    const freshRecords = await options.fetchRecords(mappingRows);

    await cacheRecords(freshRecords, {
      collection: options.collection,
      mapRecordForCache: options.mapRecordForCache,
    });
  } catch {
    // Silent background refresh — don't break UI
  }
}
