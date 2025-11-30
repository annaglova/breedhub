import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { routeStore } from '@breedhub/rxdb-store';

/**
 * Entity type to URL path mapping
 */
const ENTITY_PATHS: Record<string, string> = {
  breed: 'breeds',
  pet: 'pets',
  kennel: 'kennels',
  contact: 'contacts',
  event: 'events',
  litter: 'litters',
  account: 'accounts'
};

/**
 * SlugResolver - Resolves pretty URLs and redirects to internal routes
 *
 * Handles URLs like /affenpinscher by:
 * 1. Resolving slug via RouteStore
 * 2. Redirecting to /breeds/:id with fullscreen state
 *
 * The actual page rendering happens in SpacePage/Drawer (existing code).
 * This component only handles the resolution and redirect.
 *
 * Flow:
 * /affenpinscher#achievements
 *   ↓
 * RouteStore.resolveRoute('affenpinscher')
 *   ↓
 * { entity: 'breed', entity_id: 'uuid', model: 'breed' }
 *   ↓
 * navigate('/breeds/uuid#achievements', { state: { fullscreen: true }, replace: true })
 */
export function SlugResolver() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError('No slug provided');
      return;
    }

    resolveSlug(slug);
  }, [slug]);

  async function resolveSlug(slugToResolve: string) {
    try {
      // Ensure RouteStore is initialized
      if (!routeStore.initialized.value) {
        await routeStore.initialize();
      }

      // Resolve slug to entity info
      const route = await routeStore.resolveRoute(slugToResolve);

      if (!route) {
        setError(`Page not found: /${slugToResolve}`);
        return;
      }

      // Get path for entity type
      const entityPath = ENTITY_PATHS[route.entity];
      if (!entityPath) {
        setError(`Unknown entity type: ${route.entity}`);
        return;
      }

      // Build redirect URL with hash preserved
      const hash = location.hash || '';
      const redirectUrl = `/${entityPath}/${route.entity_id}${hash}`;

      // Redirect with fullscreen state
      navigate(redirectUrl, {
        replace: true,
        state: { fullscreen: true, fromSlug: slugToResolve }
      });

    } catch (err) {
      console.error('[SlugResolver] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to resolve URL');
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
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">Resolving...</p>
      </div>
    </div>
  );
}
