import type { RxDatabase, RxCollection, RxJsonSchema } from 'rxdb';

/**
 * Collection Factory Helper
 *
 * Shared logic for creating RxDB collections.
 * Used by: DictionaryStore, SpaceStore, RouteStore
 */

/**
 * Get existing collection or create new one
 *
 * @param db - RxDB database instance
 * @param name - Collection name
 * @param schema - RxDB JSON schema for the collection
 * @param migrationStrategies - Optional migration strategies for schema versions
 * @returns RxDB collection
 */
export async function getOrCreateCollection<T>(
  db: RxDatabase,
  name: string,
  schema: RxJsonSchema<T>,
  migrationStrategies?: Record<number, (doc: any) => any>
): Promise<RxCollection<T>> {
  // Check if collection already exists
  if (db.collections[name]) {
    return db.collections[name] as RxCollection<T>;
  }

  // Create new collection
  await db.addCollections({
    [name]: {
      schema,
      migrationStrategies: migrationStrategies || {}
    }
  });

  return db.collections[name] as RxCollection<T>;
}
