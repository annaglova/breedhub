import { signal } from '@preact/signals-react';
import type { RxCollection } from 'rxdb';
import { getDatabase } from '../services/database.service';
import type { AppDatabase } from '../services/database.service';
import { routesSchema, type RouteDocument } from '../collections/routes.schema';
import { supabase } from '../supabase/client';

// Helpers
import {
  DEFAULT_TTL,
  cleanupExpiredDocuments,
  getOrCreateCollection,
  schedulePeriodicCleanup,
  runInitialCleanup,
  isNetworkError,
  isOffline
} from '../helpers';

// Collection type
export type RouteCollection = RxCollection<RouteDocument>;

/**
 * Route resolution result
 */
export interface ResolvedRoute {
  slug: string;
  entity: string;
  entity_id: string;
  entity_partition_id?: string; // Partition key value for partitioned tables (e.g., breed_id value for pet)
  partition_field?: string;     // Partition key column name in entity table (e.g., 'breed_id' for pet)
  model: string;
}

/**
 * RouteStore
 *
 * Resolves URL slugs to entity information for fullscreen pages.
 *
 * Features:
 * - Local-first: RxDB cache → Supabase fallback → cache result
 * - Lazy loading: routes fetched on-demand when URL is accessed
 * - TTL cleanup: routes expire after 14 days
 * - Uses shared helpers for common functionality
 *
 * Usage:
 * ```typescript
 * await routeStore.initialize();
 * const route = await routeStore.resolveRoute('affenpinscher');
 * // { entity: 'breed', entity_id: 'uuid', model: 'breed' }
 * ```
 */
class RouteStore {
  private static instance: RouteStore;

  // State
  initialized = signal<boolean>(false);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Database
  private db: AppDatabase | null = null;
  private collection: RouteCollection | null = null;

  // Cleanup interval reference
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {}

  static getInstance(): RouteStore {
    if (!RouteStore.instance) {
      RouteStore.instance = new RouteStore();
    }
    return RouteStore.instance;
  }

  /**
   * Initialize route store and create collection
   */
  async initialize(): Promise<void> {
    if (this.initialized.value) {
      return;
    }

    this.loading.value = true;
    this.error.value = null;

    try {
      const db = await getDatabase();
      this.db = db;

      // Use helper for collection creation
      // Migration strategy for v0 → v1: add optional entity_partition_id field
      this.collection = await getOrCreateCollection<RouteDocument>(
        db as any,
        'routes',
        routesSchema,
        {
          1: (oldDoc: any) => oldDoc, // v0 → v1: entity_partition_id is optional, no data migration needed
          2: (oldDoc: any) => oldDoc  // v1 → v2: partition_field is optional, no data migration needed
        }
      );

      this.initialized.value = true;

      // Run initial cleanup using helper
      runInitialCleanup(
        () => this.cleanupExpired(),
        '[RouteStore]'
      );

      // Schedule periodic cleanup using helper
      this.cleanupInterval = schedulePeriodicCleanup(
        () => this.cleanupExpired(),
        '[RouteStore]'
      );

    } catch (error) {
      console.error('[RouteStore] Initialization failed:', error);
      this.error.value = error instanceof Error ? error.message : 'Initialization failed';
      throw error;
    } finally {
      this.loading.value = false;
    }
  }

  /**
   * Resolve URL slug to entity information
   *
   * Local-first flow:
   * 1. Check RxDB cache
   * 2. If not found or expired, fetch from Supabase
   * 3. Cache result in RxDB
   * 4. Return resolved route or null
   */
  async resolveRoute(slug: string): Promise<ResolvedRoute | null> {
    // console.debug('[RouteStore] resolveRoute:', slug);

    if (!this.collection) {
      console.warn('[RouteStore] Not initialized, initializing now...');
      await this.initialize();
    }

    if (!this.collection) {
      throw new Error('[RouteStore] Failed to initialize');
    }

    // 1. Check RxDB cache first (exact match by primary key)
    const cached = await this.collection.findOne(slug).exec();
    // Cache lookup is silent — only log on hit

    if (cached) {
      // Verify exact slug match (paranoid check)
      if (cached.slug !== slug) {
        console.warn('[RouteStore] Cache returned wrong slug!', { expected: slug, got: cached.slug });
        await cached.remove();
      } else {
        // Check if not expired
        const isExpired = Date.now() - cached.cachedAt > DEFAULT_TTL;

        if (!isExpired) {
          // console.debug('[RouteStore] Cache hit:', cached.slug);
          return {
            slug: cached.slug,
            entity: cached.entity,
            entity_id: cached.entity_id,
            entity_partition_id: cached.entity_partition_id,
            partition_field: cached.partition_field,
            model: cached.model
          };
        }

        // Expired - remove from cache
        // console.debug('[RouteStore] Cache expired:', cached.slug);
        await cached.remove();
      }
    }

    // 2. Fetch from Supabase (if online)
    if (isOffline()) {
      console.log('[RouteStore] Offline, cannot fetch from Supabase');
      return null;
    }

    try {
      const route = await this.fetchRouteFromSupabase(slug);

      if (route) {
        // 3. Cache in RxDB
        // console.debug('[RouteStore] Caching:', route.slug);
        await this.collection.upsert({
          slug: route.slug,
          entity: route.entity,
          entity_id: route.entity_id,
          entity_partition_id: route.entity_partition_id || '',
          partition_field: route.partition_field || '',
          model: route.model,
          cachedAt: Date.now()
        });

        return route;
      }

      // console.debug('[RouteStore] Not found:', slug);
      return null;

    } catch (error) {
      if (isNetworkError(error)) {
        // Network error - return null (offline mode)
        // Network error — silent
        return null;
      }
      throw error;
    }
  }

  /**
   * Fetch route from Supabase
   */
  private async fetchRouteFromSupabase(slug: string): Promise<ResolvedRoute | null> {
    // console.debug('[RouteStore] Supabase fetch:', slug);

    const { data, error } = await supabase
      .from('routes')
      .select('slug, entity, entity_id, entity_partition_id, partition_field, model')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      // 42P01 = table does not exist
      if (error.code === '42P01') {
        return null;
      }
      console.error('[RouteStore] Supabase error:', error);
      throw error;
    }

    if (!data) {
      // console.debug('[RouteStore] No data:', slug);
      return null;
    }

    // console.debug('[RouteStore] Found:', data.slug);
    return {
      slug: data.slug,
      entity: data.entity,
      entity_id: data.entity_id,
      entity_partition_id: data.entity_partition_id,
      partition_field: data.partition_field,
      model: data.model
    };
  }

  /**
   * Save route to local cache
   *
   * Called when user opens an entity (expand/click).
   * This enables offline access to pretty URLs for previously viewed entities.
   *
   * @param route Route information to cache
   */
  async saveRoute(route: ResolvedRoute): Promise<void> {
    if (!this.collection) {
      await this.initialize();
    }

    if (!this.collection) {
      console.warn('[RouteStore] Cannot save route - not initialized');
      return;
    }

    // Skip if slug is empty - primary key is required
    if (!route.slug) {
      console.warn('[RouteStore] Cannot save route - slug is empty');
      return;
    }

    try {
      await this.collection.upsert({
        slug: route.slug,
        entity: route.entity,
        entity_id: route.entity_id,
        entity_partition_id: route.entity_partition_id || '',
        partition_field: route.partition_field || '',
        model: route.model,
        cachedAt: Date.now()
      });
    } catch (error) {
      // Non-critical - just log
      console.warn('[RouteStore] Failed to save route:', error);
    }
  }

  /**
   * Clear cached route (e.g., when entity is updated/deleted)
   */
  async invalidateRoute(slug: string): Promise<void> {
    if (!this.collection) return;

    const doc = await this.collection.findOne(slug).exec();
    if (doc) {
      await doc.remove();
    }
  }

  /**
   * Clear all cached routes for an entity
   */
  async invalidateEntityRoutes(entity: string, entityId: string): Promise<void> {
    if (!this.collection) return;

    const docs = await this.collection
      .find({
        selector: {
          entity,
          entity_id: entityId
        }
      })
      .exec();

    for (const doc of docs) {
      await doc.remove();
    }
  }

  /**
   * Cleanup expired routes using helper
   */
  private async cleanupExpired(): Promise<void> {
    if (!this.collection) return;

    await cleanupExpiredDocuments(
      this.collection,
      DEFAULT_TTL,
      '[RouteStore]'
    );
  }

  /**
   * Destroy store (cleanup intervals, etc.)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.initialized.value = false;
  }
}

// Export singleton instance
export const routeStore = RouteStore.getInstance();
