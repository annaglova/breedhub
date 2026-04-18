import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { navigationHistoryStore, spaceStore } from '@breedhub/rxdb-store';
import { SpacePage } from './SpacePage';
import { RouteResolutionError } from './RouteResolutionError';
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
      selectedPartitionField={resolvedRoute.partition_field}
      selectedSlug={slug}
    />
  );
}
