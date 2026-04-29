/**
 * Child-collection LRU policy.
 *
 * `pet_children`, `breed_children`, …  grow monotonically as the user
 * navigates the app (each new pet a user clicks adds its measurements,
 * health entries etc. to RxDB). Without an upper bound IndexedDB query
 * plans degrade in long sessions and PWA storage quotas eventually
 * kick in.
 *
 * The policy is coarse on purpose — we evict by the
 * `(entityType, parentId, tableType)` group, not per record. That
 * matches the way the app actually reads the cache (a tab loads ALL of
 * one parent's children for one table at a time) and keeps the
 * accounting cheap.
 *
 * Eviction safeguards:
 *   - "active" groups touched within the protect window
 *     (`CHILD_COLLECTION_EVICT_PROTECT_MS`) are shielded;
 *   - records whose id is still pending in the sync queue are
 *     shielded — evicting them would silently drop user-authored data
 *     that hasn't reached Supabase yet.
 */

import type { ChildCacheRecord } from "./space-child.helpers";
import {
  CHILD_COLLECTION_EVICT_PROTECT_MS,
  CHILD_COLLECTION_EVICT_TARGET_RATIO,
  CHILD_COLLECTION_RECORD_LIMIT,
} from "../cache/cache-policies";

interface CollectionLike<T extends ChildCacheRecord> {
  find(options: {
    selector?: Record<string, unknown>;
    limit?: number;
  }): {
    exec(): Promise<Array<{ toJSON(): T; primary?: string }>>;
  };
  bulkRemove(ids: string[]): Promise<unknown>;
}

interface PendingQueueLookup {
  /** Returns the set of recordIds currently queued for sync. */
  getPendingChildRecordIds(): Promise<Set<string>>;
}

interface MaybeEvictOptions {
  entityType: string;
  collection: CollectionLike<ChildCacheRecord>;
  pendingQueue: PendingQueueLookup;
  /** Override defaults for tests. */
  recordLimit?: number;
  evictTargetRatio?: number;
  protectMs?: number;
}

interface EvictionStats {
  evictedRecords: number;
  evictedGroups: number;
  beforeSize: number;
  afterSize: number;
}

export class ChildLruPolicy {
  /** key: `${entityType}:${parentId}:${tableType}`  →  last-touched ms */
  private accessTimes = new Map<string, number>();
  private readonly protectMs: number;
  private readonly recordLimit: number;
  private readonly targetRatio: number;
  /** in-flight eviction promise per entityType so concurrent calls coalesce */
  private inflight = new Map<string, Promise<EvictionStats>>();

  constructor(options: { protectMs?: number; recordLimit?: number; targetRatio?: number } = {}) {
    this.protectMs = options.protectMs ?? CHILD_COLLECTION_EVICT_PROTECT_MS;
    this.recordLimit = options.recordLimit ?? CHILD_COLLECTION_RECORD_LIMIT;
    this.targetRatio = options.targetRatio ?? CHILD_COLLECTION_EVICT_TARGET_RATIO;
  }

  /** Mark a `(entityType, parentId, tableType)` group as freshly read. */
  touch(entityType: string, parentId: string | undefined, tableType: string): void {
    if (!parentId) return;
    this.accessTimes.set(this.keyOf(entityType, parentId, tableType), Date.now());
  }

  /** Manually drop the access record (used after explicit deletes). */
  forget(entityType: string, parentId: string | undefined, tableType: string): void {
    if (!parentId) return;
    this.accessTimes.delete(this.keyOf(entityType, parentId, tableType));
  }

  /** Reset state — primarily for tests. */
  reset(): void {
    this.accessTimes.clear();
    this.inflight.clear();
  }

  /**
   * If the collection is over `recordLimit`, evict the oldest cold groups
   * (sorted by access time, oldest first) until the size dips below
   * `recordLimit * targetRatio`. Records pending sync are skipped, and a
   * group whose every record is pending is left alone in this pass.
   *
   * Concurrent calls on the same entityType coalesce to one in-flight
   * eviction so we don't issue parallel bulk-removes.
   */
  async maybeEvict(options: MaybeEvictOptions): Promise<EvictionStats> {
    const limit = options.recordLimit ?? this.recordLimit;
    const ratio = options.evictTargetRatio ?? this.targetRatio;
    const protectMs = options.protectMs ?? this.protectMs;

    const inflight = this.inflight.get(options.entityType);
    if (inflight) return inflight;

    const promise = (async (): Promise<EvictionStats> => {
      try {
        const all = await options.collection.find({}).exec();
        const beforeSize = all.length;
        const baseline: EvictionStats = {
          evictedRecords: 0,
          evictedGroups: 0,
          beforeSize,
          afterSize: beforeSize,
        };
        if (beforeSize <= limit) return baseline;

        const targetSize = Math.floor(limit * ratio);
        const cutoff = Date.now() - protectMs;
        const pending = await options.pendingQueue.getPendingChildRecordIds();

        // Group records by `(parentId, tableType)` and tally counts.
        type Group = {
          key: string;
          parentId: string;
          tableType: string;
          recordIds: string[];
        };
        const groups = new Map<string, Group>();
        for (const doc of all) {
          const json = doc.toJSON();
          const parentId = json.parentId;
          const tableType = json.tableType;
          if (!parentId || !tableType) continue;
          const key = this.keyOf(options.entityType, parentId, tableType);
          let group = groups.get(key);
          if (!group) {
            group = { key, parentId, tableType, recordIds: [] };
            groups.set(key, group);
          }
          group.recordIds.push(json.id);
        }

        // Sort by access time (oldest first); groups with no recorded
        // access fall to epoch=0 so they are evicted before warm groups.
        const ordered = [...groups.values()].sort((a, b) => {
          return (this.accessTimes.get(a.key) ?? 0) - (this.accessTimes.get(b.key) ?? 0);
        });

        let evictedRecords = 0;
        let evictedGroups = 0;
        let projected = beforeSize;

        for (const group of ordered) {
          if (projected <= targetSize) break;
          const lastAccess = this.accessTimes.get(group.key) ?? 0;
          if (lastAccess > cutoff) continue;

          const evictableIds = group.recordIds.filter((id) => !pending.has(id));
          if (evictableIds.length === 0) continue;

          await options.collection.bulkRemove(evictableIds);
          this.accessTimes.delete(group.key);
          evictedRecords += evictableIds.length;
          evictedGroups += 1;
          projected -= evictableIds.length;
        }

        return {
          evictedRecords,
          evictedGroups,
          beforeSize,
          afterSize: beforeSize - evictedRecords,
        };
      } finally {
        this.inflight.delete(options.entityType);
      }
    })();

    this.inflight.set(options.entityType, promise);
    return promise;
  }

  private keyOf(entityType: string, parentId: string, tableType: string): string {
    return `${entityType}:${parentId}:${tableType}`;
  }
}
