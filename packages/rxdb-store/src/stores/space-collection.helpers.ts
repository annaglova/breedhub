export interface CountableCollectionLike {
  name: string;
  count(): {
    exec(): Promise<unknown>;
  };
}

export interface CollectionViewConfigLike {
  rows?: number;
}

export interface CollectionSpaceConfigLike {
  views?: Record<string, CollectionViewConfigLike>;
  rows?: number;
}

export type CollectionReuseStatus = 'ready' | 'recreate';

export function buildEntityCollectionConfig<TSchema>(schema: TSchema): {
  schema: TSchema;
  migrationStrategies: {
    1: (oldDoc: any) => any;
    2: (oldDoc: any) => any;
  };
} {
  return {
    schema,
    migrationStrategies: {
      // Version 0→1: Add cachedAt field for TTL cleanup
      1: (oldDoc: any) => ({
        ...oldDoc,
        cachedAt: Date.now(),
      }),
      // Version 1→2: Add VIEW extra fields (pass through, fields added on next fetch)
      2: (oldDoc: any) => oldDoc,
    },
  };
}

export async function getCollectionReuseStatus(
  entityType: string,
  collection?: CountableCollectionLike,
): Promise<CollectionReuseStatus> {
  if (!collection || collection.name !== entityType) {
    return 'recreate';
  }

  try {
    await collection.count().exec();
    return 'ready';
  } catch {
    return 'recreate';
  }
}

export function isCollectionSchemaMismatchError(error: unknown): boolean {
  return (error as { code?: string } | null | undefined)?.code === 'DB6';
}

export function getExpectedCollectionBatchSize(
  spaceConfig?: CollectionSpaceConfigLike | null,
  fallback = 50,
): number {
  if (spaceConfig?.views) {
    for (const viewConfig of Object.values(spaceConfig.views)) {
      if (viewConfig.rows) {
        return viewConfig.rows;
      }
    }

    return fallback;
  }

  if (spaceConfig?.rows) {
    return spaceConfig.rows;
  }

  return fallback;
}

export interface BufferedEntityStoreLike<TRecord extends { id: string }> {
  addMany(records: TRecord[]): void;
  upsertOne(record: TRecord): void;
  removeOne(id: string): void;
}

export interface CollectionChangeEventLike<TRecord extends { id: string }> {
  operation?: string;
  documentData?: TRecord | null;
  documentId?: string;
}

export function createBufferedEntityChangeHandler<TRecord extends { id: string }>(
  entityStore: BufferedEntityStoreLike<TRecord>,
  expectedBatchSize: number,
  options: {
    delayMs?: number;
    setTimeoutFn?: typeof setTimeout;
    clearTimeoutFn?: typeof clearTimeout;
  } = {},
): (changeEvent: CollectionChangeEventLike<TRecord>) => void {
  const delayMs = options.delayMs ?? 100;
  const setTimeoutFn = options.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout;

  let insertBuffer: TRecord[] = [];
  let insertTimeout: ReturnType<typeof setTimeout> | null = null;

  const flushInserts = () => {
    if (insertBuffer.length > 0) {
      entityStore.addMany(insertBuffer);
      insertBuffer = [];
    }

    if (insertTimeout) {
      clearTimeoutFn(insertTimeout);
      insertTimeout = null;
    }
  };

  return (changeEvent: CollectionChangeEventLike<TRecord>) => {
    if (changeEvent.operation === 'INSERT') {
      const data = changeEvent.documentData;
      if (!data?.id) {
        return;
      }

      insertBuffer.push(data);

      if (insertBuffer.length >= expectedBatchSize) {
        flushInserts();
        return;
      }

      if (insertTimeout) {
        clearTimeoutFn(insertTimeout);
      }
      insertTimeout = setTimeoutFn(flushInserts, delayMs);
      return;
    }

    if (changeEvent.operation === 'UPDATE') {
      const data = changeEvent.documentData;
      if (data?.id) {
        entityStore.upsertOne(data);
      }
      return;
    }

    if (changeEvent.operation === 'DELETE') {
      const deleteId = changeEvent.documentId || changeEvent.documentData?.id;
      if (deleteId) {
        entityStore.removeOne(deleteId);
      }
    }
  };
}

export interface DeleteDatabaseRequestLike {
  onsuccess: ((...args: any[]) => void) | null;
  onerror: ((...args: any[]) => void) | null;
  onblocked: ((...args: any[]) => void) | null;
}

export interface IndexedDbLike {
  deleteDatabase(name: string): DeleteDatabaseRequestLike;
}

export interface WindowLikeWithReload {
  location: {
    reload(): void;
  };
  __rxdbClearing?: boolean;
}

export async function recoverCollectionSchemaMismatch(options: {
  db?: {
    remove(): Promise<unknown>;
  } | null;
  indexedDb: IndexedDbLike;
  localStorage: {
    removeItem(key: string): void;
  };
  window: WindowLikeWithReload;
  schemaHashKey?: string;
  databaseNames?: string[];
}): Promise<boolean> {
  if (options.window.__rxdbClearing) {
    return false;
  }

  options.window.__rxdbClearing = true;
  options.localStorage.removeItem(options.schemaHashKey ?? 'breedhub_schema_hash');

  try {
    await options.db?.remove();
  } catch {
    // Best effort — manual IndexedDB delete below is the fallback.
  }

  const databaseNames = options.databaseNames ?? ['rxdb-dexie-breedhub', 'breedhub'];

  try {
    await new Promise<void>((resolve) => {
      if (databaseNames.length === 0) {
        resolve();
        return;
      }

      let pending = databaseNames.length;
      const done = () => {
        pending -= 1;
        if (pending <= 0) {
          resolve();
        }
      };

      for (const databaseName of databaseNames) {
        const request = options.indexedDb.deleteDatabase(databaseName);
        request.onsuccess = done;
        request.onerror = done;
        request.onblocked = done;
      }
    });
  } catch {
    // Best effort — reload anyway after cleanup attempt.
  }

  options.window.location.reload();
  return true;
}
