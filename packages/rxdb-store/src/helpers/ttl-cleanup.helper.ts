import type { RxCollection } from 'rxdb';

/**
 * TTL Cleanup Helper
 *
 * Shared logic for cleaning up expired cached documents across all stores.
 * Used by: DictionaryStore, SpaceStore, RouteStore
 */

// Default TTL: 14 days (same across all stores)
export const DEFAULT_TTL = 14 * 24 * 60 * 60 * 1000;

// Interface for documents with cachedAt timestamp
export interface CacheableDocument {
  cachedAt: number;
}

/**
 * Cleanup expired documents from a single collection
 *
 * @param collection - RxDB collection to cleanup
 * @param ttl - Time to live in milliseconds (default: 14 days)
 * @param logPrefix - Prefix for console logs (e.g., '[DictionaryStore]')
 * @returns Number of documents removed
 */
export async function cleanupExpiredDocuments<T extends CacheableDocument>(
  collection: RxCollection<T>,
  ttl: number = DEFAULT_TTL,
  logPrefix: string = '[Cleanup]'
): Promise<number> {
  const expiryTime = Date.now() - ttl;

  const expiredDocs = await collection
    .find({
      selector: {
        cachedAt: {
          $lt: expiryTime
        }
      } as any // RxDB selector type is too strict for dynamic queries
    })
    .exec();

  if (expiredDocs.length > 0) {
    for (const doc of expiredDocs) {
      await doc.remove();
    }
  }

  return expiredDocs.length;
}

/**
 * Cleanup expired documents from multiple collections
 *
 * @param collections - Array of collections with names
 * @param ttl - Time to live in milliseconds (default: 14 days)
 * @param logPrefix - Prefix for console logs
 * @returns Total number of documents removed
 */
export async function cleanupMultipleCollections(
  collections: Array<{ collection: RxCollection<any>; name: string }>,
  ttl: number = DEFAULT_TTL,
  logPrefix: string = '[Cleanup]'
): Promise<number> {
  let totalCleaned = 0;

  for (const { collection, name } of collections) {
    if (!collection) continue;

    const cleaned = await cleanupExpiredDocuments(
      collection,
      ttl,
      `${logPrefix} ${name}`
    );
    totalCleaned += cleaned;
  }

  return totalCleaned;
}
