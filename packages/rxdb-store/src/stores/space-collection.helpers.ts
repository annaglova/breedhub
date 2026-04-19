export interface CountableCollectionLike {
  name: string;
  count(): {
    exec(): Promise<unknown>;
  };
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
