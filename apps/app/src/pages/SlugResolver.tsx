import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { routeStore, spaceStore, navigationHistoryStore } from '@breedhub/rxdb-store';
import { SpacePage } from './SpacePage';

/**
 * Route info resolved from slug
 */
interface ResolvedRoute {
  entity: string;      // 'breed', 'pet', etc.
  entity_id: string;   // UUID of the entity
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

      // Add to navigation history with human-readable title
      // Use slug as title (formatted) - entity name will be loaded later
      const formattedTitle = slugToResolve
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      navigationHistoryStore.addEntry(`/${slugToResolve}`, formattedTitle, route.entity);

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
          <div className="text-8xl mb-4 text-gray-300">404</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
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

  // Loading state while resolving
  if (isResolving || !resolvedRoute) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Resolving...</p>
        </div>
      </div>
    );
  }

  // Render SpacePage directly with pre-selected entity
  // URL stays as /{slug}#{tab} - no redirect!
  return (
    <SpacePage
      entityType={resolvedRoute.entity}
      selectedEntityId={resolvedRoute.entity_id}
      selectedSlug={slug}
    />
  );
}
