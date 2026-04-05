import type { RxCollection, RxDatabase } from 'rxdb';
import { signal } from '@preact/signals-react';
import { supabase } from '../supabase/client';
import { runPostSaveHooks } from '../utils/entity-hooks';
import type {
  EntitySyncQueueDocument,
  ChildSyncQueueDocument,
} from '../collections/sync-queue.schema';

const BATCH_SIZE = 10;
const MAX_RETRIES = 10;
const MAX_CONSECUTIVE_FAILURES = 5;
const CIRCUIT_BREAKER_RESET_MS = 60_000;

/**
 * Queue-based push sync service (Replication V3).
 * Replaces replicateRxCollection with explicit enqueue on CRUD.
 * Background processor drains queue to Supabase.
 */
class SyncQueueService {
  private entityQueue: RxCollection<EntitySyncQueueDocument> | null = null;
  private childQueue: RxCollection<ChildSyncQueueDocument> | null = null;
  private processingInterval: ReturnType<typeof setInterval> | null = null;
  private consecutiveFailures = 0;
  private circuitBreakerOpen = false;
  private circuitBreakerTimer: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;
  private processing = false;
  private lastErrorMessage = '';
  private onReconnectCallback: (() => void) | null = null;

  // UI-observable signals
  pendingCount = signal<number>(0);
  failedCount = signal<number>(0);

  async initialize(db: RxDatabase): Promise<void> {
    if (this.initialized) return;

    this.entityQueue = db.collections['entity_sync_queue'] as RxCollection<EntitySyncQueueDocument>;
    this.childQueue = db.collections['child_sync_queue'] as RxCollection<ChildSyncQueueDocument>;

    if (!this.entityQueue || !this.childQueue) {
      console.error('[SyncQueue] Queue collections not found in database');
      return;
    }

    this.initialized = true;
    this.startProcessing();
    this.updateCounts();

    // Process immediately when coming back online + trigger pull refresh
    window.addEventListener('online', () => {
      console.log('[SyncQueue] Back online — processing queue + refreshing data');
      this.processAll();
      this.onReconnectCallback?.();
    });

    console.log('[SyncQueue] Initialized');
  }

  /** Register callback to run on reconnect (used by SpaceStore for pull refresh) */
  onReconnect(callback: () => void): void {
    this.onReconnectCallback = callback;
  }

  // --- Enqueue methods ---

  async enqueueEntity(
    entityType: string,
    entityId: string,
    operation: 'upsert' | 'delete',
    payload: Record<string, any>,
    onConflict: string
  ): Promise<void> {
    if (!this.entityQueue) return;

    try {
      // Dedup: remove existing pending item for same entityId
      const existing = await this.entityQueue
        .findOne({ selector: { entityId } })
        .exec();
      if (existing) {
        await existing.remove();
      }

      await this.entityQueue.insert({
        id: crypto.randomUUID(),
        entityType,
        entityId,
        operation,
        payload,
        onConflict,
        retries: 0,
        createdAt: Date.now(),
      });
      this.updateCounts();
    } catch (error) {
      console.error('[SyncQueue] Failed to enqueue entity:', error);
    }
  }

  async enqueueChild(
    entityType: string,
    tableType: string,
    recordId: string,
    operation: 'upsert' | 'delete',
    payload: Record<string, any>,
    onConflict: string
  ): Promise<void> {
    if (!this.childQueue) return;

    try {
      // Dedup: remove existing pending item for same recordId
      const existing = await this.childQueue
        .findOne({ selector: { recordId } })
        .exec();
      if (existing) {
        await existing.remove();
      }

      await this.childQueue.insert({
        id: crypto.randomUUID(),
        entityType,
        tableType,
        recordId,
        operation,
        payload,
        onConflict,
        retries: 0,
        createdAt: Date.now(),
      });
      this.updateCounts();
    } catch (error) {
      console.error('[SyncQueue] Failed to enqueue child:', error);
    }
  }

  // --- Background processing ---

  startProcessing(intervalMs = 5000): void {
    if (this.processingInterval) return;
    this.processingInterval = setInterval(() => this.processAll(), intervalMs);
    console.log(`[SyncQueue] Processing started (every ${intervalMs}ms)`);
  }

  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /** Force process all queues now (used before schema migration clear) */
  async processNow(): Promise<void> {
    return this.processAll();
  }

  private async processAll(): Promise<void> {
    if (!this.initialized || this.processing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (this.circuitBreakerOpen) return;

    this.processing = true;
    try {
      await this.processEntityQueue();
      await this.processChildQueue();
      this.updateCounts();
    } finally {
      this.processing = false;
    }
  }

  private async processEntityQueue(): Promise<void> {
    if (!this.entityQueue) return;

    const items = await this.entityQueue
      .find({
        selector: { status: { $ne: 'failed' } },
        sort: [{ createdAt: 'asc' }],
        limit: BATCH_SIZE,
      })
      .exec();

    if (items.length === 0) return;

    // Group by entityType for batch upsert
    const groups = new Map<string, typeof items>();
    for (const item of items) {
      const type = item.entityType;
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type)!.push(item);
    }

    for (const [entityType, groupItems] of groups) {
      const upsertItems = groupItems.filter(i => i.operation === 'upsert');
      const deleteItems = groupItems.filter(i => i.operation === 'delete');

      // Batch upsert
      if (upsertItems.length > 0) {
        const batch = upsertItems.map(i => i.payload);
        const onConflict = upsertItems[0].onConflict;

        const { error } = await supabase
          .from(entityType)
          .upsert(batch, { onConflict });

        if (!error) {
          await this.bulkRemoveItems(this.entityQueue, upsertItems.map(i => i.id));
          this.onSuccess();
          // Post-push hooks (fire-and-forget) — entity now exists in Supabase
          for (const item of upsertItems) {
            runPostSaveHooks(entityType, item.entityId, item.payload);
          }
        } else {
          this.lastErrorMessage = error.message;
          console.error(`[SyncQueue] Entity upsert error (${entityType}):`, error.message);
          await this.incrementRetries(this.entityQueue, upsertItems);
          this.onFailure();
        }
      }

      // Deletes: upsert with deleted=true
      if (deleteItems.length > 0) {
        const batch = deleteItems.map(i => ({ ...i.payload, deleted: true }));
        const onConflict = deleteItems[0].onConflict;

        const { error } = await supabase
          .from(entityType)
          .upsert(batch, { onConflict });

        if (!error) {
          await this.bulkRemoveItems(this.entityQueue, deleteItems.map(i => i.id));
          this.onSuccess();
        } else {
          this.lastErrorMessage = error.message;
          console.error(`[SyncQueue] Entity delete error (${entityType}):`, error.message);
          await this.incrementRetries(this.entityQueue, deleteItems);
          this.onFailure();
        }
      }
    }
  }

  private async processChildQueue(): Promise<void> {
    if (!this.childQueue) return;

    const items = await this.childQueue
      .find({
        selector: { status: { $ne: 'failed' } },
        sort: [{ createdAt: 'asc' }],
        limit: BATCH_SIZE,
      })
      .exec();

    if (items.length === 0) return;

    // Group by tableType
    const groups = new Map<string, typeof items>();
    for (const item of items) {
      const type = item.tableType;
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type)!.push(item);
    }

    for (const [tableType, groupItems] of groups) {
      const upsertItems = groupItems.filter(i => i.operation === 'upsert');
      const deleteItems = groupItems.filter(i => i.operation === 'delete');

      // Batch upsert
      if (upsertItems.length > 0) {
        const batch = upsertItems.map(i => i.payload);

        const { error } = await supabase
          .from(tableType)
          .upsert(batch, { onConflict: 'id' });

        if (!error) {
          await this.bulkRemoveItems(this.childQueue, upsertItems.map(i => i.id));
          this.onSuccess();
        } else {
          // Skip schema-cache errors silently (old VIEW records)
          if (error.message.includes('schema cache') || error.message.includes('not found')) {
            await this.bulkRemoveItems(this.childQueue, upsertItems.map(i => i.id));
          } else {
            this.lastErrorMessage = error.message;
            console.error(`[SyncQueue] Child upsert error (${tableType}):`, error.message);
            await this.incrementRetries(this.childQueue, upsertItems);
            this.onFailure();
          }
        }
      }

      // Deletes: soft-delete with fallback to hard delete
      for (const item of deleteItems) {
        try {
          const { error } = await supabase
            .from(tableType)
            .update({ deleted: true, updated_at: new Date().toISOString() })
            .eq('id', item.payload.id);

          if (!error) {
            await item.remove();
            this.onSuccess();
          } else if (error.message.includes('column')) {
            // No 'deleted' column — hard delete
            await supabase.from(tableType).delete().eq('id', item.payload.id);
            await item.remove();
            this.onSuccess();
          } else {
            this.lastErrorMessage = error.message;
            console.error(`[SyncQueue] Child delete error (${tableType}):`, error.message);
            await this.incrementRetry(this.childQueue, item);
            this.onFailure();
          }
        } catch {
          await this.incrementRetry(this.childQueue, item);
          this.onFailure();
        }
      }
    }
  }

  // --- Helpers ---

  private async bulkRemoveItems(collection: RxCollection<any>, ids: string[]): Promise<void> {
    await collection.bulkRemove(ids);
  }

  private async incrementRetries(collection: RxCollection<any>, items: any[]): Promise<void> {
    for (const item of items) {
      await this.incrementRetry(collection, item);
    }
  }

  private async incrementRetry(collection: RxCollection<any>, item: any): Promise<void> {
    const newRetries = (item.retries || 0) + 1;
    if (newRetries > MAX_RETRIES) {
      // Mark as failed — keep in queue for diagnostics, stop retrying
      console.warn(`[SyncQueue] Max retries exceeded, marking as failed: ${item.id}`);
      await item.patch({
        retries: newRetries,
        status: 'failed',
        error: this.lastErrorMessage || 'Max retries exceeded',
      });
    } else {
      await item.patch({ retries: newRetries });
    }
  }

  /** Update pending/failed count signals for UI */
  private async updateCounts(): Promise<void> {
    if (!this.entityQueue || !this.childQueue) return;
    try {
      const entityPending = await this.entityQueue.count({ selector: { status: { $ne: 'failed' } } }).exec();
      const childPending = await this.childQueue.count({ selector: { status: { $ne: 'failed' } } }).exec();
      this.pendingCount.value = entityPending + childPending;

      const entityFailed = await this.entityQueue.count({ selector: { status: 'failed' } }).exec();
      const childFailed = await this.childQueue.count({ selector: { status: 'failed' } }).exec();
      this.failedCount.value = entityFailed + childFailed;
    } catch {
      // Ignore count errors
    }
  }

  // --- Circuit breaker ---

  private onSuccess(): void {
    this.consecutiveFailures = 0;
  }

  private onFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      this.openCircuitBreaker();
    }
  }

  private openCircuitBreaker(): void {
    this.circuitBreakerOpen = true;
    console.warn(`[SyncQueue] Circuit breaker open after ${this.consecutiveFailures} failures. Pausing for ${CIRCUIT_BREAKER_RESET_MS / 1000}s.`);
    this.circuitBreakerTimer = setTimeout(() => {
      this.circuitBreakerOpen = false;
      this.consecutiveFailures = 0;
      console.log('[SyncQueue] Circuit breaker reset');
    }, CIRCUIT_BREAKER_RESET_MS);
  }

  destroy(): void {
    this.stopProcessing();
    if (this.circuitBreakerTimer) {
      clearTimeout(this.circuitBreakerTimer);
    }
    this.initialized = false;
  }
}

// Singleton export
export const syncQueueService = new SyncQueueService();
