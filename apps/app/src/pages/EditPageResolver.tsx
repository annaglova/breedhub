import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { routeStore, spaceStore } from '@breedhub/rxdb-store';
import { SpacePage } from './SpacePage';

interface ResolvedRoute {
  entity: string;
  entity_id: string;
  entity_partition_id?: string;
  partition_field?: string;
  model: string;
}

// Shared cache with SlugResolver/TabPageResolver pattern
const resolvedRoutesCache = new Map<string, ResolvedRoute>();

/**
 * EditPageResolver - Resolves /:slug/edit URLs for edit mode
 *
 * Handles URLs like /my-pet-name/edit by:
 * 1. Resolving :slug via RouteStore to get entity type and ID
 * 2. Setting fullscreen mode in store
 * 3. Rendering SpacePage with editMode=true
 */
export function EditPageResolver() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [resolvedRoute, setResolvedRoute] = useState<ResolvedRoute | null>(() => {
    return slug ? resolvedRoutesCache.get(slug) || null : null;
  });
  const [isResolving, setIsResolving] = useState(() => {
    return slug ? !resolvedRoutesCache.has(slug) : false;
  });

  useEffect(() => {
    if (!slug) {
      setError('No slug provided');
      setIsResolving(false);
      return;
    }

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
    console.log('[EditPageResolver] Resolving slug:', slugToResolve);
    setIsResolving(true);

    try {
      if (!routeStore.initialized.value) {
        await routeStore.initialize();
      }

      const route = await routeStore.resolveRoute(slugToResolve);

      if (!route) {
        setError(`Page not found: /${slugToResolve}`);
        setIsResolving(false);
        return;
      }

      resolvedRoutesCache.set(slugToResolve, route);
      spaceStore.setFullscreen(true);

      setResolvedRoute(route);
      setIsResolving(false);
    } catch (err) {
      console.error('[EditPageResolver] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to resolve URL');
      setIsResolving(false);
    }
  }

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

  if (isResolving || !resolvedRoute) {
    return null;
  }

  return (
    <SpacePage
      entityType={resolvedRoute.entity}
      selectedEntityId={resolvedRoute.entity_id}
      selectedPartitionId={resolvedRoute.entity_partition_id}
      selectedPartitionField={resolvedRoute.partition_field}
      selectedSlug={slug}
      editMode={true}
    />
  );
}
