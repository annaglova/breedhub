import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { navigationHistoryStore, spaceStore } from '@breedhub/rxdb-store';
import { SpacePage } from './SpacePage';
import { RouteResolutionError } from './RouteResolutionError';
import { getResolvedEntityName, useResolvedRoute } from './route-resolution';

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
  const { resolvedRoute, error, isResolving } = useResolvedRoute(slug);

  useEffect(() => {
    if (!slug || !tabSlug) {
      return;
    }

    spaceStore.setTabFullscreen(true);
  }, [slug, tabSlug, resolvedRoute]);

  useEffect(() => {
    if (!slug) {
      return;
    }

    if (!tabSlug) {
      navigate(`/${slug}`, { replace: true });
    }
  }, [slug, tabSlug, navigate]);

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

  // Render SpacePage with tabSlug - SpacePage handles store initialization
  // and renders TabPageTemplate when tabSlug is provided
  return (
    <SpacePage
      entityType={resolvedRoute.entity}
      selectedEntityId={resolvedRoute.entity_id}
      selectedPartitionId={resolvedRoute.entity_partition_id}
      selectedSlug={slug}
      tabSlug={tabSlug}
    />
  );
}
