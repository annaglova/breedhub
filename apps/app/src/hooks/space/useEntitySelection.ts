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
import { spaceStore } from "@breedhub/rxdb-store";
import {
  EntityNavigationRecord,
  findEntityByRouteSegment,
  getEntitySlug,
  getPathEntitySegment,
  getSpaceListPath,
  resolveEntityRouteSelection,
  saveEntityRoute,
} from "@/utils/entity-navigation";

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
  const entities = allEntities as EntityNavigationRecord[];

  const selectedEntityId = spaceStore.getSelectedIdSignal(
    config.entitySchemaName,
  )?.value;

  const [isDrawerOpen, setIsDrawerOpen] = useState(!!initialSelectedEntityId);

  // Auto-select first entity for xxl+ screens on initial load (list view only)
  useEffect(() => {
    if (initialSelectedEntityId || createMode || isGridView) return;

    if (allEntities.length > 0 && !isLoading && isMoreThan2XL) {
      if (!selectedEntityId) {
        if (!getPathEntitySegment(location.pathname)) {
          const entity = entities[0];
          const slug = getEntitySlug(entity);
          saveEntityRoute(config, entity, slug);
          navigate(`${slug}${location.search}#overview`);
        }
      }
    }
  }, [
    allEntities,
    entities,
    isLoading,
    isGridView,
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
        saveEntityRoute(
          config,
          { id: initialSelectedEntityId },
          initialSelectedSlug,
        );
      }
    }
  }, []); // Run only once on mount

  // Sync URL ↔ EntityStore (bidirectional)
  useEffect(() => {
    if (initialSelectedEntityId) {
      setIsDrawerOpen(true);
      return;
    }

    const routeSelection = resolveEntityRouteSelection({
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      entities,
      isLoading,
      currentSelectedId: spaceStore.getSelectedId(config.entitySchemaName),
    });
    const hasEntitySegment = !!routeSelection.urlSegment;

    setIsDrawerOpen(hasEntitySegment);

    if (spaceStore.isFullscreen.value) {
      spaceStore.clearFullscreen();
    }

    if (hasEntitySegment) {
      if (routeSelection.redirectPath) {
        navigate(routeSelection.redirectPath, { replace: true });
      }

      const entityId = routeSelection.entityId;
      if (entityId) {
        const currentSelectedId = spaceStore.getSelectedId(
          config.entitySchemaName,
        );
        if (currentSelectedId !== entityId) {
          spaceStore.selectEntity(config.entitySchemaName, entityId);
        }

        const matchedEntity = findEntityByRouteSegment(
          entities,
          routeSelection.routeSlug || routeSelection.urlSegment || "",
        );

        saveEntityRoute(
          config,
          matchedEntity || { id: entityId },
          routeSelection.routeSlug || routeSelection.urlSegment || entityId,
        );
      }
    } else {
      spaceStore.clearSelection(config.entitySchemaName);
      spaceStore.clearFullscreen();
    }
  }, [
    location.pathname,
    location.search,
    location.hash,
    config.entitySchemaName,
    config.entitySchemaModel,
    allEntities,
    entities,
    isLoading,
    initialSelectedEntityId,
    navigate,
  ]);

  // Handle entity click
  const handleEntityClick = useCallback(
    (entity: EntityNavigationRecord) => {
      const slug = getEntitySlug(entity);
      saveEntityRoute(config, entity, slug);

      if (isGridView) {
        // Tab/grid view: navigate to standalone page (no drawer)
        navigate(`/${slug}`);
      } else {
        // List view: open drawer within space
        spaceStore.selectEntity(config.entitySchemaName, entity.id);
        navigate(`${slug}${location.search}#overview`);
      }
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
      navigate(getSpaceListPath(config.entitySchemaName) || "/");
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
