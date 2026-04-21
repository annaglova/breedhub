import {
  cacheRecords,
  docMapToRecordMap,
  type BulkUpsertCollection,
} from "./space-id-cache.helpers";
import type { PartitionConfig } from "./space-config.helpers";
import { isNetworkError } from "../helpers";

export interface PartitionedEntityRef {
  id: string;
  partitionId?: string | null;
}

export interface PartitionedRefGroups {
  partitionedIds: Map<string, string[]>;
  unpartitionedIds: string[];
}

export type ParentPartitionLookupSource = "memory" | "RxDB" | null;

export interface LoadPartitionedEntitiesCollection<TCachedRecord = any>
  extends BulkUpsertCollection<TCachedRecord> {
  findByIds(ids: string[]): {
    exec(): Promise<Map<string, { toJSON(): unknown }>>;
  };
}

export interface LoadPartitionedEntitiesByRefsOptions<
  TRecord extends Record<string, any> & { id: string },
  TCachedRecord = TRecord,
> {
  entityType: string;
  refs: PartitionedEntityRef[];
  partitionField?: string;
  collection?: LoadPartitionedEntitiesCollection<TCachedRecord>;
  isOffline: boolean;
  fetchMissing: (missingRefs: PartitionedEntityRef[]) => Promise<TRecord[]>;
  mapRecordForCache?: (record: TRecord) => TCachedRecord;
}

export function normalizePartitionedEntityRefs(
  refs: PartitionedEntityRef[],
): PartitionedEntityRef[] {
  const normalized: PartitionedEntityRef[] = [];
  const seen = new Set<string>();

  for (const ref of refs) {
    if (!ref.id) {
      continue;
    }

    const partitionId = ref.partitionId ?? null;
    const key = `${partitionId ?? ""}:${ref.id}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push({ id: ref.id, partitionId });
  }

  return normalized;
}

export function recordMatchesPartition<TRecord extends Record<string, any>>(
  record: TRecord | undefined,
  partitionField?: string,
  partitionId?: string | null,
): record is TRecord {
  if (!record) {
    return false;
  }

  if (!partitionField || !partitionId) {
    return true;
  }

  return record[partitionField] === partitionId;
}

export function splitCachedAndMissingPartitionRefs<TRecord extends Record<string, any>>(
  refs: PartitionedEntityRef[],
  cachedMap: Map<string, TRecord>,
  partitionField?: string,
): {
  cached: TRecord[];
  missing: PartitionedEntityRef[];
} {
  const cached: TRecord[] = [];
  const missing: PartitionedEntityRef[] = [];

  for (const ref of refs) {
    const record = cachedMap.get(ref.id);

    if (recordMatchesPartition(record, partitionField, ref.partitionId)) {
      cached.push(record);
    } else {
      missing.push(ref);
    }
  }

  return { cached, missing };
}

export function groupPartitionedEntityRefs(
  refs: PartitionedEntityRef[],
): PartitionedRefGroups {
  const partitionedIds = new Map<string, string[]>();
  const unpartitionedIds: string[] = [];

  for (const ref of refs) {
    if (!ref.partitionId) {
      unpartitionedIds.push(ref.id);
      continue;
    }

    if (!partitionedIds.has(ref.partitionId)) {
      partitionedIds.set(ref.partitionId, []);
    }

    partitionedIds.get(ref.partitionId)!.push(ref.id);
  }

  return { partitionedIds, unpartitionedIds };
}

export function orderRecordsByPartitionRefs<TRecord extends { id: string }>(
  refs: PartitionedEntityRef[],
  records: TRecord[],
  partitionField?: string,
): TRecord[] {
  const recordsById = new Map<string, TRecord[]>();

  for (const record of records) {
    if (!recordsById.has(record.id)) {
      recordsById.set(record.id, []);
    }

    recordsById.get(record.id)!.push(record);
  }

  const ordered: TRecord[] = [];

  for (const ref of refs) {
    const candidates = recordsById.get(ref.id) || [];
    const matching = candidates.find((record) =>
      recordMatchesPartition(
        record as unknown as Record<string, any>,
        partitionField,
        ref.partitionId,
      ),
    );

    if (matching) {
      ordered.push(matching);
    }
  }

  return ordered;
}

export async function cacheAndOrderRecordsByPartitionRefs<
  TRecord extends { id: string },
  TCachedRecord = TRecord,
>(
  refs: PartitionedEntityRef[],
  cachedRecords: TRecord[],
  freshRecords: TRecord[],
  options: {
    partitionField?: string;
    collection: BulkUpsertCollection<TCachedRecord>;
    mapFreshRecordForCache?: (record: TRecord) => TCachedRecord;
  },
): Promise<{
  orderedRecords: TRecord[];
  cachedRecordsCount: number;
}> {
  const { cachedRecordsCount } = await cacheRecords(freshRecords, {
    collection: options.collection,
    mapRecordForCache: options.mapFreshRecordForCache,
  });

  return {
    orderedRecords: orderRecordsByPartitionRefs(
      refs,
      [...cachedRecords, ...freshRecords],
      options.partitionField,
    ),
    cachedRecordsCount,
  };
}

export async function loadPartitionedEntitiesByRefs<
  TRecord extends Record<string, any> & { id: string },
  TCachedRecord = TRecord,
>(
  options: LoadPartitionedEntitiesByRefsOptions<TRecord, TCachedRecord>,
): Promise<TRecord[]> {
  if (options.collection) {
    const cachedDocs = await options.collection
      .findByIds(options.refs.map((ref) => ref.id))
      .exec();
    const cachedMap = docMapToRecordMap<TRecord>(cachedDocs);
    const split = splitCachedAndMissingPartitionRefs(
      options.refs,
      cachedMap,
      options.partitionField,
    );

    if (split.missing.length === 0 || options.isOffline) {
      return orderRecordsByPartitionRefs(
        options.refs,
        split.cached,
        options.partitionField,
      );
    }

    try {
      const freshRecords = await options.fetchMissing(split.missing);
      const hydrationResult = await cacheAndOrderRecordsByPartitionRefs(
        options.refs,
        split.cached,
        freshRecords,
        {
          partitionField: options.partitionField,
          collection: options.collection,
          mapFreshRecordForCache: options.mapRecordForCache,
        },
      );

      return hydrationResult.orderedRecords;
    } catch (error) {
      if (!isNetworkError(error)) {
        console.error(
          `[SpaceStore] Failed to load partition refs for ${options.entityType}:`,
          error,
        );
      }

      return orderRecordsByPartitionRefs(
        options.refs,
        split.cached,
        options.partitionField,
      );
    }
  }

  if (options.isOffline) {
    return [];
  }

  try {
    const freshRecords = await options.fetchMissing(options.refs);

    return orderRecordsByPartitionRefs(
      options.refs,
      freshRecords,
      options.partitionField,
    );
  } catch (error) {
    if (!isNetworkError(error)) {
      console.error(
        `[SpaceStore] Failed to load partition refs for ${options.entityType}:`,
        error,
      );
    }

    return [];
  }
}

export async function loadParentEntityForPartition<TRecord>(options: {
  entityType: string;
  parentId: string;
  loadFromMemory: (
    entityType: string,
    parentId: string,
  ) => Promise<TRecord | undefined>;
  loadFromCache: (
    entityType: string,
    parentId: string,
  ) => Promise<TRecord | null>;
}): Promise<{
  parentEntity: TRecord | null;
  source: ParentPartitionLookupSource;
}> {
  const parentEntityFromMemory = await options.loadFromMemory(
    options.entityType,
    options.parentId,
  );
  if (parentEntityFromMemory) {
    return { parentEntity: parentEntityFromMemory, source: "memory" };
  }

  const parentEntityFromCache = await options.loadFromCache(
    options.entityType,
    options.parentId,
  );
  if (parentEntityFromCache) {
    return { parentEntity: parentEntityFromCache, source: "RxDB" };
  }

  return { parentEntity: null, source: null };
}

export async function resolveChildPartitionContext(options: {
  entitySchemas: ReadonlyMap<string, { partition?: PartitionConfig }>;
  entityType: string;
  parentId: string;
  loadFromMemory: (
    entityType: string,
    parentId: string,
  ) => Promise<Record<string, any> | undefined>;
  loadFromCache: (
    entityType: string,
    parentId: string,
  ) => Promise<Record<string, any> | null>;
  contextLabel?: string;
  targetLabel?: string;
  logResolved?: boolean;
  warnIfMissing?: boolean;
}): Promise<{ partitionConfig?: PartitionConfig; partitionValue?: string }> {
  const partitionConfig = options.entitySchemas.get(options.entityType)?.partition;
  if (!partitionConfig) {
    return {};
  }

  const { parentEntity, source } = await loadParentEntityForPartition({
    entityType: options.entityType,
    parentId: options.parentId,
    loadFromMemory: options.loadFromMemory,
    loadFromCache: options.loadFromCache,
  });

  if (!parentEntity) {
    if (options.warnIfMissing !== false) {
      console.warn(
        `[SpaceStore] Could not find parent entity for partition key. ${
          options.targetLabel || `Entity: ${options.entityType}`
        }, parentId: ${options.parentId}`,
      );
    }
    return { partitionConfig };
  }

  const partitionValue = parentEntity[partitionConfig.keyField];

  if (options.logResolved !== false) {
    const label = options.contextLabel ? `${options.contextLabel} ` : "";
    console.log(
      `[SpaceStore] ${label}partition filter: ${partitionConfig.childFilterField}=${partitionValue} (from ${source})`,
    );
  }

  return { partitionConfig, partitionValue };
}
