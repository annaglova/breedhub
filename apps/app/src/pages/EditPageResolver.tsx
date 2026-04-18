import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { spaceStore } from '@breedhub/rxdb-store';
import { SpacePage } from './SpacePage';
import { RouteResolutionError } from './RouteResolutionError';
import { useResolvedRoute } from './route-resolution';

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
  const { resolvedRoute, error, isResolving } = useResolvedRoute(slug);

  useEffect(() => {
    if (!slug || !resolvedRoute) {
      return;
    }

    spaceStore.setFullscreen(true);
  }, [slug, resolvedRoute]);

  if (error) {
    return <RouteResolutionError error={error} />;
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
