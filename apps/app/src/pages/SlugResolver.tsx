import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { routeStore, spaceStore, navigationHistoryStore, getDatabase } from '@breedhub/rxdb-store';
import { SpacePage } from './SpacePage';

/**
 * Route info resolved from slug
 */
interface ResolvedRoute {
  entity: string;      // 'breed', 'pet', etc.
  entity_id: string;   // UUID of the entity
  entity_partition_id?: string; // Partition key for partitioned tables (e.g., breed_id for pet)
  model: string;       // model name for API
}

/**
 * SlugResolver - Resolves pretty URLs and renders SpacePage directly
 *
 * Handles URLs like /affenpinscher by:
 * 1. Resolving slug via RouteStore to get entity type and ID
 * 2. Setting fullscreen mode in store
 * 3. Rendering SpacePage with pre-selected entity (NO redirect!)
 *
 * URL stays pretty: /affenpinscher#achievements
 *
 * Flow:
 * /affenpinscher#achievements
 *   ↓
 * RouteStore.resolveRoute('affenpinscher')
 *   ↓
 * { entity: 'breed', entity_id: 'uuid', model: 'breed' }
 *   ↓
 * spaceStore.setFullscreen(true)
 *   ↓
 * <SpacePage entityType="breed" selectedEntityId="uuid" selectedSlug="affenpinscher" />
 */
// Cache for resolved routes to avoid re-resolving on navigation
const resolvedRoutesCache = new Map<string, ResolvedRoute>();

export function SlugResolver() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [resolvedRoute, setResolvedRoute] = useState<ResolvedRoute | null>(() => {
    // Check cache on initial render for instant display
    return slug ? resolvedRoutesCache.get(slug) || null : null;
  });
  const [isResolving, setIsResolving] = useState(() => {
    // If cached, no need to resolve
    return slug ? !resolvedRoutesCache.has(slug) : false;
  });

  useEffect(() => {
    if (!slug) {
      setError('No slug provided');
      setIsResolving(false);
      return;
    }

    // Check cache first - instant render
    const cached = resolvedRoutesCache.get(slug);
    if (cached) {
      setResolvedRoute(cached);
      setIsResolving(false);
      spaceStore.setFullscreen(true);
      return;
    }

    resolveSlug(slug);
  }, [slug]);

  async function resolveSlug(slugToResolve: string) {
    console.log('[SlugResolver] Resolving slug:', slugToResolve);
    setIsResolving(true);

    try {
      // Ensure RouteStore is initialized
      if (!routeStore.initialized.value) {
        await routeStore.initialize();
      }

      // Resolve slug to entity info
      const route = await routeStore.resolveRoute(slugToResolve);
      console.log('[SlugResolver] Resolved route:', route);

      if (!route) {
        setError(`Page not found: /${slugToResolve}`);
        setIsResolving(false);
        return;
      }

      // Cache the resolved route
      resolvedRoutesCache.set(slugToResolve, route);

      // Set fullscreen mode in store (persists across navigation)
      spaceStore.setFullscreen(true);

      // Add to navigation history with entity NAME (not slug)
      // Get name from RxDB - entity should be cached there
      let entityName = slugToResolve; // fallback to slug
      try {
        const db = await getDatabase();
        const collection = db.collections[route.entity];
        if (collection) {
          const entity = await collection.findOne(route.entity_id).exec();
          if (entity?.name) {
            entityName = entity.name;
          }
        }
      } catch (e) {
        console.warn('[SlugResolver] Could not get entity name from RxDB:', e);
      }
      navigationHistoryStore.addEntry(`/${slugToResolve}`, entityName, route.entity);

      // Store resolved route and render SpacePage
      setResolvedRoute(route);
      setIsResolving(false);

    } catch (err) {
      console.error('[SlugResolver] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to resolve URL');
      setIsResolving(false);
    }
  }

  // Error state - 404 page
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-8xl mb-4 text-slate-300">404</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Page Not Found</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Loading state while resolving - return null for instant transition
  // (resolution is fast, spinner would just flash annoyingly)
  if (isResolving || !resolvedRoute) {
    return null;
  }

  // Render SpacePage directly with pre-selected entity
  // URL stays as /{slug}#{tab} - no redirect!
  return (
    <SpacePage
      entityType={resolvedRoute.entity}
      selectedEntityId={resolvedRoute.entity_id}
      selectedPartitionId={resolvedRoute.entity_partition_id}
      selectedSlug={slug}
    />
  );
}
