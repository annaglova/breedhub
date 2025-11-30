import { signal } from '@preact/signals-react';
import type { RxCollection } from 'rxdb';
import { getDatabase } from '../services/database.service';
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
  private db: any = null;  // RxDatabase type is too strict
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
      this.db = await getDatabase();

      // Use helper for collection creation
      this.collection = await getOrCreateCollection<RouteDocument>(
        this.db,
        'routes',
        routesSchema
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
    if (!this.collection) {
      console.warn('[RouteStore] Not initialized, initializing now...');
      await this.initialize();
    }

    if (!this.collection) {
      throw new Error('[RouteStore] Failed to initialize');
    }

    // 1. Check RxDB cache first
    const cached = await this.collection.findOne(slug).exec();

    if (cached) {
      // Check if not expired
      const isExpired = Date.now() - cached.cachedAt > DEFAULT_TTL;

      if (!isExpired) {
        return {
          slug: cached.slug,
          entity: cached.entity,
          entity_id: cached.entity_id,
          model: cached.model
        };
      }

      // Expired - remove from cache
      await cached.remove();
    }

    // 2. Fetch from Supabase (if online)
    if (isOffline()) {
      return null;
    }

    try {
      const route = await this.fetchRouteFromSupabase(slug);

      if (route) {
        // 3. Cache in RxDB
        await this.collection.upsert({
          slug: route.slug,
          entity: route.entity,
          entity_id: route.entity_id,
          model: route.model,
          cachedAt: Date.now()
        });

        return route;
      }

      return null;

    } catch (error) {
      if (isNetworkError(error)) {
        // Network error - return null (offline mode)
        return null;
      }
      throw error;
    }
  }

  /**
   * Fetch route from Supabase
   */
  private async fetchRouteFromSupabase(slug: string): Promise<ResolvedRoute | null> {
    const { data, error } = await supabase
      .from('routes')
      .select('slug, entity, entity_id, model')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - route not found
        return null;
      }
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      slug: data.slug,
      entity: data.entity,
      entity_id: data.entity_id,
      model: data.model
    };
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
