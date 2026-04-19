export function mapDocsToRecordMap<TRecord>(
  docs: Array<{ id: string; toJSON(): unknown }>,
): Map<string, TRecord> {
  return new Map(
    docs.map((doc): [string, TRecord] => [doc.id, doc.toJSON() as TRecord]),
  );
}

export function docMapToRecordMap<TRecord>(
  docMap: Map<string, { toJSON(): unknown }>,
): Map<string, TRecord> {
  const result = new Map<string, TRecord>();
  for (const [id, doc] of docMap) {
    result.set(id, doc.toJSON() as TRecord);
  }
  return result;
}

export function buildRecordMapById<TRecord extends { id: string }>(
  records: TRecord[],
): Map<string, TRecord> {
  return new Map(records.map((record) => [record.id, record]));
}

export function getMissingIds<TRecord>(
  ids: string[],
  cachedMap: Map<string, TRecord>,
): string[] {
  return ids.filter((id) => !cachedMap.has(id));
}

export function getStaleIdsByUpdatedAt<TRecord extends { updated_at?: string }>(
  ids: string[],
  cachedMap: Map<string, TRecord>,
  serverUpdatedAtMap: Map<string, string | undefined>,
): string[] {
  const staleIds: string[] = [];

  for (const id of ids) {
    const cachedRecord = cachedMap.get(id);
    if (!cachedRecord) {
      continue;
    }

    const serverUpdatedAt = serverUpdatedAtMap.get(id);
    if (
      serverUpdatedAt &&
      cachedRecord.updated_at &&
      serverUpdatedAt > cachedRecord.updated_at
    ) {
      staleIds.push(id);
    }
  }

  return staleIds;
}

export function analyzeCachedIdsByUpdatedAt<
  TCachedRecord extends { updated_at?: string },
  TServerRecord extends { id: string; updated_at?: string },
>(
  ids: string[],
  cachedMap: Map<string, TCachedRecord>,
  serverRecords: TServerRecord[],
): {
  missingIds: string[];
  staleIds: string[];
  toFetchIds: string[];
} {
  const serverUpdatedAtMap = new Map<string, string | undefined>(
    serverRecords.map((record) => [record.id, record.updated_at]),
  );
  const missingIds = getMissingIds(ids, cachedMap);
  const staleIds = getStaleIdsByUpdatedAt(ids, cachedMap, serverUpdatedAtMap);

  return {
    missingIds,
    staleIds,
    toFetchIds: [...missingIds, ...staleIds],
  };
}

export function mergeOrderedRecordsByIds<TRecord extends { id: string }>(
  ids: string[],
  cachedMap: Map<string, TRecord>,
  freshRecords: TRecord[],
): TRecord[] {
  const merged = new Map(cachedMap);
  for (const record of freshRecords) {
    merged.set(record.id, record);
  }

  return ids
    .map((id) => merged.get(id))
    .filter(Boolean) as TRecord[];
}
