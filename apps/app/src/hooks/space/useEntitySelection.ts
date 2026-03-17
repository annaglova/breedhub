/**
 * useEntitySelection - Manages entity selection sync between URL, EntityStore, and drawer.
 *
 * - Initializes selection from SlugResolver (pretty URLs)
 * - Syncs URL ↔ EntityStore bidirectionally
 * - Handles entity click (select + navigate)
 * - Handles backdrop click (close drawer + navigate to list)
 * - Auto-selects first entity on xxl+ screens
 *
 * Extracted from SpaceComponent.
 */
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { routeStore, spaceStore } from "@breedhub/rxdb-store";
import { normalizeForUrl } from "@/components/space/utils/filter-url-helpers";

interface EntitySelectionConfig {
  entitySchemaName: string;
  entitySchemaModel?: string;
}

interface UseEntitySelectionOptions {
  config: EntitySelectionConfig;
  allEntities: any[];
  isLoading: boolean;
  isGridView: boolean;
  isMoreThan2XL: boolean;
  initialSelectedEntityId?: string;
  initialSelectedSlug?: string;
  initialSelectedPartitionId?: string;
  initialSelectedPartitionField?: string;
  createMode?: boolean;
}

export function useEntitySelection({
  config,
  allEntities,
  isLoading,
  isGridView,
  isMoreThan2XL,
  initialSelectedEntityId,
  initialSelectedSlug,
  initialSelectedPartitionId,
  initialSelectedPartitionField,
  createMode,
}: UseEntitySelectionOptions) {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedEntityId = spaceStore.getSelectedIdSignal(
    config.entitySchemaName,
  )?.value;

  const [isDrawerOpen, setIsDrawerOpen] = useState(!!initialSelectedEntityId);

  // Auto-select first entity for xxl+ screens on initial load
  useEffect(() => {
    if (initialSelectedEntityId || createMode) return;

    if (allEntities.length > 0 && !isLoading && isMoreThan2XL) {
      if (!selectedEntityId) {
        const pathSegments = location.pathname.split("/");
        const hasEntityId =
          pathSegments.length > 2 && pathSegments[2] !== "new";
        if (!hasEntityId) {
          const entity = allEntities[0];
          const slug = entity.slug || normalizeForUrl(entity.name || entity.id);

          routeStore.saveRoute({
            slug,
            entity: config.entitySchemaName,
            entity_id: entity.id,
            model: config.entitySchemaModel || config.entitySchemaName,
          });

          navigate(`${slug}${location.search}#overview`);
        }
      }
    }
  }, [
    allEntities,
    isLoading,
    isMoreThan2XL,
    selectedEntityId,
    navigate,
    location.pathname,
    location.search,
    config.entitySchemaName,
    config.entitySchemaModel,
    initialSelectedEntityId,
  ]);

  // Initialize selection from SlugResolver (pretty URLs)
  useEffect(() => {
    if (initialSelectedEntityId) {
      spaceStore.fetchAndSelectEntity(
        config.entitySchemaName,
        initialSelectedEntityId,
        initialSelectedPartitionId,
        initialSelectedPartitionField,
      );

      if (initialSelectedSlug) {
        routeStore.saveRoute({
          slug: initialSelectedSlug,
          entity: config.entitySchemaName,
          entity_id: initialSelectedEntityId,
          model: config.entitySchemaModel || config.entitySchemaName,
        });
      }
    }
  }, []); // Run only once on mount

  // Sync URL ↔ EntityStore (bidirectional)
  useEffect(() => {
    if (initialSelectedEntityId) {
      setIsDrawerOpen(true);
      return;
    }

    const pathSegments = location.pathname.split("/");
    const hasEntitySegment =
      pathSegments.length > 2 && pathSegments[2] !== "new";
    setIsDrawerOpen(hasEntitySegment);

    if (spaceStore.isFullscreen.value) {
      spaceStore.clearFullscreen();
    }

    if (hasEntitySegment) {
      const urlSegment = pathSegments[2];
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          urlSegment,
        );

      let entityId: string | undefined;

      if (isUUID) {
        entityId = urlSegment;
      } else {
        const matchingEntity = allEntities.find(
          (entity) =>
            normalizeForUrl(entity.name) === urlSegment ||
            entity.slug === urlSegment,
        );

        if (matchingEntity) {
          entityId = matchingEntity.id;
        } else if (allEntities.length > 0 && !isLoading) {
          const currentSelectedId = spaceStore.getSelectedId(
            config.entitySchemaName,
          );
          const currentEntityStillInList =
            currentSelectedId &&
            allEntities.some((e) => e.id === currentSelectedId);

          if (currentEntityStillInList) {
            const currentEntity = allEntities.find(
              (e) => e.id === currentSelectedId,
            );
            if (currentEntity) {
              const correctSlug =
                currentEntity.slug ||
                normalizeForUrl(currentEntity.name || currentEntity.id);
              navigate(`${correctSlug}${location.search}${location.hash}`, {
                replace: true,
              });
              entityId = currentSelectedId;
            }
          } else {
            const firstEntity = allEntities[0];
            entityId = firstEntity.id;
            const newSlug =
              firstEntity.slug ||
              normalizeForUrl(firstEntity.name || firstEntity.id);
            navigate(`${newSlug}${location.search}${location.hash}`, {
              replace: true,
            });
          }
        }
      }

      if (entityId) {
        const currentSelectedId = spaceStore.getSelectedId(
          config.entitySchemaName,
        );
        if (currentSelectedId !== entityId) {
          spaceStore.selectEntity(config.entitySchemaName, entityId);
        }

        let slugToSave = urlSegment;
        if (isUUID) {
          const entity = allEntities.find((e) => e.id === entityId);
          if (entity) {
            slugToSave =
              entity.slug || normalizeForUrl(entity.name || entity.id);
          }
        }

        routeStore.saveRoute({
          slug: slugToSave,
          entity: config.entitySchemaName,
          entity_id: entityId,
          model: config.entitySchemaModel || config.entitySchemaName,
        });
      }
    } else {
      spaceStore.clearSelection(config.entitySchemaName);
      spaceStore.clearFullscreen();
    }
  }, [
    location.pathname,
    config.entitySchemaName,
    config.entitySchemaModel,
    allEntities,
    initialSelectedEntityId,
  ]);

  // Handle entity click
  const handleEntityClick = useCallback(
    (entity: any) => {
      spaceStore.selectEntity(config.entitySchemaName, entity.id);

      const slug = entity.slug || normalizeForUrl(entity.name || entity.id);

      routeStore.saveRoute({
        slug,
        entity: config.entitySchemaName,
        entity_id: entity.id,
        model: config.entitySchemaModel || config.entitySchemaName,
      });

      if (isGridView) {
        spaceStore.setFullscreen(true);
      }

      navigate(`${slug}${location.search}#overview`);
    },
    [
      navigate,
      config.entitySchemaName,
      config.entitySchemaModel,
      location.search,
      isGridView,
    ],
  );

  // Handle backdrop click (close drawer)
  const handleBackdropClick = useCallback(() => {
    setIsDrawerOpen(false);
    spaceStore.clearFullscreen();

    if (initialSelectedEntityId || createMode) {
      const entityPath =
        config.entitySchemaName === "breed"
          ? "/breeds"
          : config.entitySchemaName === "pet"
            ? "/pets"
            : config.entitySchemaName === "kennel"
              ? "/kennels"
              : config.entitySchemaName === "contact"
                ? "/contacts"
                : config.entitySchemaName === "event"
                  ? "/events"
                  : config.entitySchemaName === "litter"
                    ? "/litters"
                    : config.entitySchemaName === "account"
                      ? "/accounts"
                      : "/";
      navigate(entityPath);
    } else {
      const basePath = location.pathname.split("/").slice(0, 2).join("/");
      navigate(basePath);
    }
  }, [navigate, location.pathname, initialSelectedEntityId, createMode, config.entitySchemaName]);

  return {
    selectedEntityId,
    isDrawerOpen,
    setIsDrawerOpen,
    handleEntityClick,
    handleBackdropClick,
  };
}
