import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { navigationHistoryStore, spaceStore } from '@breedhub/rxdb-store';
import { SpacePage } from './SpacePage';
import { RouteResolutionError } from './RouteResolutionError';
import { ResolverShell } from './ResolverShell';
import { getResolvedEntityName, useResolvedRoute } from './route-resolution';

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
export function SlugResolver() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { resolvedRoute, error, isResolving } = useResolvedRoute(slug);

  useEffect(() => {
    if (!slug || !resolvedRoute) {
      return;
    }

    spaceStore.setFullscreen(true);
  }, [slug, resolvedRoute]);

  useEffect(() => {
    if (!slug || !resolvedRoute) {
      return;
    }

    let cancelled = false;

    void getResolvedEntityName(resolvedRoute, slug).then((entityName) => {
      if (cancelled) {
        return;
      }

      navigationHistoryStore.addEntry(`/${slug}`, entityName, resolvedRoute.entity);
    });

    return () => {
      cancelled = true;
    };
  }, [slug, resolvedRoute]);

  // Error state - 404 page
  if (error) {
    return <RouteResolutionError error={error} />;
  }

  // Loading state while resolving — render a neutral shell instead of blank
  // (per SKELETON_LOADING_ARCHITECTURE §P5: no `return null` mid-route)
  if (isResolving || !resolvedRoute) {
    return <ResolverShell />;
  }

  // Render SpacePage directly with pre-selected entity.
  // Read `?from=<workspaceId>` to keep the user inside their original
  // workspace (matters for menu visibility + edit form binding). Without
  // `from`, SpaceStore falls back to entityType-only lookup (public space).
  const fromWorkspace = searchParams.get('from');
  const spaceMatch = fromWorkspace
    ? spaceStore.getSpaceByWorkspaceAndEntity(fromWorkspace, resolvedRoute.entity)
    : null;

  // URL stays as /{slug}#{tab} — no redirect!
  return (
    <SpacePage
      entityType={resolvedRoute.entity}
      spaceId={spaceMatch?.id}
      selectedEntityId={resolvedRoute.entity_id}
      selectedPartitionId={resolvedRoute.entity_partition_id}
      selectedPartitionField={resolvedRoute.partition_field}
      selectedSlug={slug}
    />
  );
}
