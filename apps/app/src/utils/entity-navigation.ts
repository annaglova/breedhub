import { routeStore, spaceStore } from "@breedhub/rxdb-store";
import { normalizeForUrl } from "@/components/space/utils/filter-url-helpers";

export interface EntityNavigationConfig {
  entitySchemaName: string;
  entitySchemaModel?: string;
}

export interface EntityNavigationRecord {
  id: string;
  name?: string | null;
  slug?: string | null;
}

interface ResolveEntityRouteSelectionOptions<T extends EntityNavigationRecord> {
  pathname: string;
  search: string;
  hash: string;
  entities: T[];
  isLoading: boolean;
  currentSelectedId?: string | null;
  /**
   * Space base path (e.g. "/pets" or "/my/pets"). When provided, the entity
   * segment is the part of `pathname` after this prefix. Without it, falls
   * back to the legacy `segments[2]` heuristic that misreads workspace
   * slugs as entity slugs on nested paths like "/my/pets".
   */
  basePath?: string;
}

export interface ResolvedEntityRouteSelection {
  entityId?: string;
  redirectPath?: string;
  routeSlug?: string;
  urlSegment: string | null;
}

export function getEntitySlug(entity: EntityNavigationRecord): string {
  return entity.slug || normalizeForUrl(entity.name || entity.id);
}

export function saveEntityRoute(
  config: EntityNavigationConfig,
  entity: Pick<EntityNavigationRecord, "id">,
  slug: string,
) {
  routeStore.saveRoute({
    slug,
    entity: config.entitySchemaName,
    entity_id: entity.id,
    model: config.entitySchemaModel || config.entitySchemaName,
  });
}

export function getSpaceListPath(entityType: string): string | null {
  const spaceConfig = spaceStore.getSpaceConfig(entityType);
  return spaceConfig?.slug ? `/${spaceConfig.slug}` : null;
}

/**
 * Return the entity segment from a URL pathname, relative to a space base
 * path. For a root-mounted space (`/pets`) the base path is "/pets" and the
 * entity is the next segment (e.g. "/pets/foo" → "foo"). For a workspace-
 * mounted space (`/my/pets`) the base path is "/my/pets" and the entity
 * follows it (e.g. "/my/pets/foo" → "foo", "/my/pets" → null).
 *
 * Legacy fallback: when no `basePath` is provided, return `segments[2]`,
 * which matches the historical "/space/entity" assumption used by call
 * sites that haven't been migrated yet.
 */
export function getPathEntitySegment(
  pathname: string,
  basePath?: string,
): string | null {
  if (basePath) {
    const normalizedBase = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
    if (pathname === normalizedBase) return null;
    const prefix = `${normalizedBase}/`;
    if (!pathname.startsWith(prefix)) return null;
    const tail = pathname.slice(prefix.length).split("/")[0];
    return tail && tail !== "new" ? tail : null;
  }
  const segment = pathname.split("/")[2];
  return segment && segment !== "new" ? segment : null;
}

export function isUuidRouteSegment(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    segment,
  );
}

export function findEntityByRouteSegment<T extends EntityNavigationRecord>(
  entities: T[],
  routeSegment: string,
): T | undefined {
  return entities.find(
    (entity) =>
      normalizeForUrl(entity.name || "") === routeSegment ||
      entity.slug === routeSegment,
  );
}

export function resolveEntityRouteSelection<T extends EntityNavigationRecord>({
  pathname,
  search,
  hash,
  entities,
  isLoading,
  currentSelectedId,
  basePath,
}: ResolveEntityRouteSelectionOptions<T>): ResolvedEntityRouteSelection {
  const urlSegment = getPathEntitySegment(pathname, basePath);

  if (!urlSegment) {
    return { urlSegment: null };
  }

  if (isUuidRouteSegment(urlSegment)) {
    const entity = entities.find((item) => item.id === urlSegment);
    return {
      entityId: urlSegment,
      routeSlug: entity ? getEntitySlug(entity) : urlSegment,
      urlSegment,
    };
  }

  const matchingEntity = findEntityByRouteSegment(entities, urlSegment);
  if (matchingEntity) {
    return {
      entityId: matchingEntity.id,
      routeSlug: urlSegment,
      urlSegment,
    };
  }

  if (isLoading) {
    return { urlSegment };
  }

  // Filter resolved to zero results AND we had a real selection before —
  // drop the stale slug so the drawer closes instead of pinning to the
  // previously selected record. Gate on `currentSelectedId` so we don't
  // misfire on list URLs (e.g. /my/pets) where `urlSegment` is actually
  // the space slug due to nested workspace paths.
  if (entities.length === 0 && currentSelectedId) {
    return { urlSegment: null };
  }

  if (entities.length === 0) {
    return { urlSegment };
  }

  const currentEntity =
    currentSelectedId &&
    entities.find((entity) => entity.id === currentSelectedId);

  if (currentEntity) {
    const currentSlug = getEntitySlug(currentEntity);
    return {
      entityId: currentEntity.id,
      redirectPath: `${currentSlug}${search}${hash}`,
      routeSlug: currentSlug,
      urlSegment,
    };
  }

  const firstEntity = entities[0];
  const firstSlug = getEntitySlug(firstEntity);
  return {
    entityId: firstEntity.id,
    redirectPath: `${firstSlug}${search}${hash}`,
    routeSlug: firstSlug,
    urlSegment,
  };
}
