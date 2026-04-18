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

export function getPathEntitySegment(pathname: string): string | null {
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
}: ResolveEntityRouteSelectionOptions<T>): ResolvedEntityRouteSelection {
  const urlSegment = getPathEntitySegment(pathname);

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

  if (entities.length === 0 || isLoading) {
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
