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
  /** Column in mapping row holding the target entity id (e.g., 'pet_id') */
  entityIdField: string;
  /** Column in mapping row holding the target entity partition (e.g., 'pet_breed_id') */
  entityPartitionField?: string;
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

export interface DependencyCheckTuple {
  table: string;
  fkColumn: string;
  label: string;
}

export interface ProbeDependentRecordsOptions {
  entityType: string;
  id: string;
  checks: DependencyCheckTuple[];
  childCollections?: Record<
    string,
    {
      find(options: {
        selector: Record<string, any>;
      }): {
        exec(): Promise<Array<{ id: string }>>;
      };
    }
  >;
  mappingCache: Map<string, any[]>;
  supabase: any;
}

export function buildMappingCacheKey(
  mappingTable: string,
  parentField: string,
  parentId: string,
): string {
  return `${mappingTable}:${parentField}:${parentId}`;
}

export function getMappingSelectFields(
  entityIdField: string,
  entityPartitionField?: string,
): string {
  return entityPartitionField
    ? `${entityIdField}, ${entityPartitionField}`
    : entityIdField;
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
  entityIdField: string,
  now = Date.now(),
): MappingSplitResult<TRecord> {
  const cached: TRecord[] = [];
  const missing: MappingRow[] = [];

  for (const row of mappingRows) {
    const entityId = row[entityIdField];
    const record = entityId ? cachedMap.get(entityId) : undefined;

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
  entityIdField: string,
  entityPartitionField?: string,
): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  if (!entityPartitionField) {
    return groups;
  }

  for (const row of rows) {
    const partitionValue = row[entityPartitionField];
    const entityId = row[entityIdField];
    if (!partitionValue || !entityId) continue;

    if (!groups.has(partitionValue)) {
      groups.set(partitionValue, []);
    }

    groups.get(partitionValue)!.push(entityId);
  }

  return groups;
}

export async function fetchRecordsByMappingRows<TRecord>(
  rows: MappingRow[],
  options: {
    entityIdField: string;
    entityPartitionField?: string;
    fetchAll: (ids: string[]) => Promise<TRecord[]>;
    fetchPartition: (partitionValue: string, ids: string[]) => Promise<TRecord[]>;
  },
): Promise<TRecord[]> {
  if (!options.entityPartitionField) {
    return options.fetchAll(
      rows.map((row) => row[options.entityIdField]).filter(Boolean) as string[],
    );
  }

  const groups = groupMappingRowsByPartition(
    rows,
    options.entityIdField,
    options.entityPartitionField,
  );
  const results: TRecord[] = [];

  for (const [partitionValue, ids] of groups) {
    const partitionRecords = await options.fetchPartition(partitionValue, ids);
    results.push(...partitionRecords);
  }

  return results;
}

export async function probeDependentRecords(
  options: ProbeDependentRecordsOptions,
): Promise<Array<{ label: string; count: number }>> {
  const dependencies: Array<{ label: string; count: number }> = [];

  await Promise.all(
    options.checks.map(async ({ table, fkColumn, label }) => {
      try {
        let found = false;

        if (options.childCollections) {
          const childCollectionName = `${options.entityType}_children`;
          const childCollection = options.childCollections[childCollectionName];

          if (childCollection) {
            const docs = await childCollection
              .find({
                selector: { parentId: options.id, tableType: table },
              })
              .exec();

            if (docs.length > 0) {
              found = true;
            }
          }

          if (!found && table === "pet_child") {
            const cached = options.mappingCache.get(
              buildMappingCacheKey(table, "parent_id", options.id),
            );

            if (cached && cached.length > 0) {
              found = true;
            }
          }
        }

        if (!found) {
          const { count, error } = await options.supabase
            .from(table)
            .select("id", { count: "exact", head: true })
            .eq(fkColumn, options.id)
            .eq("deleted", false);

          if (!error && count && count > 0) {
            found = true;
          }
        }

        if (found) {
          dependencies.push({ label, count: 1 });
        }
      } catch {
        // Silent — fail-open for local-first UX
      }
    }),
  );

  return dependencies;
}

export async function loadEntitiesViaMappingFlow<
  TRecord extends { id: string; cachedAt?: number },
  TCachedRecord = TRecord,
>(
  options: LoadEntitiesViaMappingOptions<TRecord, TCachedRecord>,
): Promise<TRecord[]> {
  const entityIdField = options.entityIdField;
  const extractIds = (rows: MappingRow[]): string[] =>
    rows.map((row) => row[entityIdField]).filter(Boolean) as string[];

  const cachedMapping = options.mappingCache.get(options.cacheKey);
  if (cachedMapping && cachedMapping.length > 0 && options.collection) {
    const ids = extractIds(cachedMapping);
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
    .findByIds(extractIds(safeMappingRows))
    .exec();
  const cachedMap = docMapToRecordMap<TRecord>(cachedDocs);
  const { cached, missing } = splitCachedAndMissingMappingRows(
    safeMappingRows,
    cachedMap,
    options.staleMs,
    entityIdField,
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

    const allIds = extractIds(safeMappingRows);
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
