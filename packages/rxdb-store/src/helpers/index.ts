/**
 * Store Helpers
 *
 * Shared utilities for RxDB stores.
 * Re-exports all helpers for convenient importing.
 */

// TTL and cleanup
export {
  DEFAULT_TTL,
  type CacheableDocument,
  cleanupExpiredDocuments,
  cleanupMultipleCollections
} from './ttl-cleanup.helper';

// Cleanup scheduling
export {
  CLEANUP_INTERVAL,
  schedulePeriodicCleanup,
  runInitialCleanup
} from './cleanup-scheduler.helper';

// Network utilities
export {
  isOnline,
  isOffline,
  isNetworkError
} from './network-helpers';

// Collection factory
export { getOrCreateCollection } from './collection-factory.helper';
