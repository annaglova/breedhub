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

// Cache for resolved routes to avoid re-resolving on navigation
const resolvedRoutesCache = new Map<string, ResolvedRoute>();

/**
 * TabPageResolver - Resolves /slug/tabSlug URLs for tab fullscreen mode
 *
 * Handles URLs like /affenpinscher/achievements by:
 * 1. Resolving :slug via RouteStore to get entity type and ID
 * 2. Validating :tabSlug exists in page config
 * 3. Rendering TabPageTemplate with single tab content
 *
 * URL: /affenpinscher/achievements
 *
 * Flow:
 * /affenpinscher/achievements
 *   ↓
 * RouteStore.resolveRoute('affenpinscher')
 *   ↓
 * { entity: 'breed', entity_id: 'uuid', model: 'breed' }
 *   ↓
 * Validate 'achievements' tab exists in page config
 *   ↓
 * <TabPageTemplate entityType="breed" entityId="uuid" tabSlug="achievements" />
 */
export function TabPageResolver() {
  const { slug, tabSlug } = useParams<{ slug: string; tabSlug: string }>();
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

    if (!tabSlug) {
      // No tab slug - redirect to main page
      navigate(`/${slug}`, { replace: true });
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
  }, [slug, tabSlug]);

  async function resolveSlug(slugToResolve: string) {
    console.log('[TabPageResolver] Resolving slug:', slugToResolve, 'tab:', tabSlug);
    setIsResolving(true);

    try {
      // Ensure RouteStore is initialized
      if (!routeStore.initialized.value) {
        await routeStore.initialize();
      }

      // Resolve slug to entity info
      const route = await routeStore.resolveRoute(slugToResolve);
      console.log('[TabPageResolver] Resolved route:', route);

      if (!route) {
        setError(`Page not found: /${slugToResolve}`);
        setIsResolving(false);
        return;
      }

      // Cache the resolved route
      resolvedRoutesCache.set(slugToResolve, route);

      // Set fullscreen mode in store (tab pages are always fullscreen)
      spaceStore.setFullscreen(true);

      // Add to navigation history - save MAIN entity link (not tab link)
      // So user can quickly return to this entity from recent pages
      navigationHistoryStore.addEntry(`/${slugToResolve}`, slugToResolve, route.entity);

      // Store resolved route and render TabPageTemplate
      setResolvedRoute(route);
      setIsResolving(false);

    } catch (err) {
      console.error('[TabPageResolver] Error:', err);
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

  // Render SpacePage with tabSlug - SpacePage handles store initialization
  // and renders TabPageTemplate when tabSlug is provided
  return (
    <SpacePage
      entityType={resolvedRoute.entity}
      selectedEntityId={resolvedRoute.entity_id}
      selectedSlug={slug}
      tabSlug={tabSlug}
    />
  );
}
