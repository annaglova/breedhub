import {
  cacheRecords,
  type BulkUpsertCollection,
} from "./space-id-cache.helpers";

export interface PartitionedEntityRef {
  id: string;
  partitionId?: string | null;
}

export interface PartitionedRefGroups {
  partitionedIds: Map<string, string[]>;
  unpartitionedIds: string[];
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
