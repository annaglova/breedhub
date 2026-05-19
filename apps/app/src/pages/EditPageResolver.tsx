import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { spaceStore } from '@breedhub/rxdb-store';
import { SpacePage } from './SpacePage';
import { RouteResolutionError } from './RouteResolutionError';
import { ResolverShell } from './ResolverShell';
import { useResolvedRoute } from './route-resolution';

/**
 * EditPageResolver - Resolves /:slug/edit URLs for edit mode
 *
 * Handles URLs like /my-pet-name/edit by:
 * 1. Resolving :slug via RouteStore to get entity type and ID
 * 2. Reading `?from=<workspaceId>` to pick the right space (so a private
 *    /my/pets edit lands on the private edit form, not the public trimmed
 *    one). Missing/unknown `from` falls through to entityType-only lookup.
 * 3. Setting fullscreen mode in store
 * 4. Rendering SpacePage with editMode=true
 */
export function EditPageResolver() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
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
    return <ResolverShell />;
  }

  const fromWorkspace = searchParams.get('from');
  const spaceMatch = fromWorkspace
    ? spaceStore.getSpaceByWorkspaceAndEntity(fromWorkspace, resolvedRoute.entity)
    : null;

  return (
    <SpacePage
      entityType={resolvedRoute.entity}
      spaceId={spaceMatch?.id}
      selectedEntityId={resolvedRoute.entity_id}
      selectedPartitionId={resolvedRoute.entity_partition_id}
      selectedPartitionField={resolvedRoute.partition_field}
      selectedSlug={slug}
      editMode={true}
    />
  );
}
