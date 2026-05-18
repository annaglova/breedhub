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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { getInitialDrawerHash } from "@/utils/getInitialDrawerHash";
import { computeSpaceBasePath } from "./space-base-path";

interface EntitySelectionConfig {
  entitySchemaName: string;
  entitySchemaModel?: string;
  // Optional `pages` map from the full SpaceConfig — used to compute the
  // initial drawer hash so URL has the right tab fragment from the very
  // first frame (avoids a "no hash → hash" flicker between navigate() and
  // useTabNavigation's reactive sync).
  pages?: Record<string, any>;
  /**
   * Space slug (e.g. "pets"). Combined with `location.pathname` to derive
   * the space base path at runtime: `/<workspace>/<slug>` or `/<slug>`.
   * Without it, `getPathEntitySegment` misreads workspace slugs as entity
   * slugs on nested paths (e.g. "/my/pets/test-pet" → "pets" instead of
   * "test-pet").
   */
  slug?: string;
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

  // Initial drawer hash from the same page SpacePage picks (view → default → first).
  // Embedded directly in navigate() so URL is correct from first render; the
  // reactive useTabNavigation hook still owns ongoing hash sync on tab clicks.
  const defaultDrawerHash = useMemo(() => getInitialDrawerHash(config), [config]);

  // Auto-select first entity for xxl+ screens on initial load (list view only)
  useEffect(() => {
    if (initialSelectedEntityId || createMode || isGridView) return;

    if (allEntities.length > 0 && !isLoading && isMoreThan2XL) {
      if (!selectedEntityId) {
        if (!getPathEntitySegment(location.pathname, computeSpaceBasePath(location.pathname, config.slug))) {
          const entity = entities[0];
          const slug = getEntitySlug(entity);
          saveEntityRoute(config, entity, slug);
          navigate(`${slug}${location.search}${defaultDrawerHash}`);
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
    defaultDrawerHash,
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

    // Read search/hash from the LIVE browser URL — concurrent writes from
    // useSpaceBrowseState (view/sort) and useFilterManagement (saved filter
    // restore) may have already mutated it within this render. Using the
    // stale closure values would build a `redirectPath` without those
    // params, leaving /my/pets/test-pet bare on a notes→pets transition.
    const basePath = computeSpaceBasePath(location.pathname, config.slug);
    const routeSelection = resolveEntityRouteSelection({
      pathname: location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      entities,
      isLoading,
      currentSelectedId: spaceStore.getSelectedId(config.entitySchemaName),
      basePath,
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

      // If the URL still carries a slug that no longer maps to any entity
      // (filter narrowed to zero), strip back to the space base. Skip the
      // strip when pathname already IS the space base (no trailing entity
      // slug to remove) — otherwise we'd navigate away from the list view
      // (e.g. /my/pets → /my, breaking the page).
      if (basePath && location.pathname !== basePath) {
        navigate(`${basePath}${location.search}${location.hash}`, {
          replace: true,
        });
      }
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

  // On quick-filter scope change, redirect to the first entity in the new
  // scope's list. Without this, `resolveEntityRouteSelection` keeps the
  // current URL slug whenever it happens to also exist in the new list —
  // which hides the scope switch from the user. Two-phase: detect change
  // → arm pending flag; once data has refiltered (isLoading goes false),
  // navigate to entities[0]. window.location.search is the live URL so
  // the redirect preserves concurrent view/sort/filter writes.
  const prevScopeRef = useRef<string | null | undefined>(undefined);
  const pendingScopeRedirectRef = useRef(false);
  // Entities reference at the moment the scope changed. We hold the redirect
  // until useEntities returns a NEW reference, which signals the refilter is
  // done — keying on isLoading would miss cache hits where loading doesn't
  // flip, and using `entities[0]` would race the wrong (stale) list.
  const entitiesAtScopeChangeRef = useRef<any[] | null>(null);
  useEffect(() => {
    const currentScope = new URLSearchParams(window.location.search).get("scope");
    const prevScope = prevScopeRef.current;

    if (prevScope === undefined) {
      prevScopeRef.current = currentScope;
      return;
    }

    const scopeJustChanged = prevScope !== currentScope;
    if (scopeJustChanged) {
      prevScopeRef.current = currentScope;
      pendingScopeRedirectRef.current = true;
      entitiesAtScopeChangeRef.current = entities;
    }

    if (!pendingScopeRedirectRef.current) return;
    if (isGridView || createMode || initialSelectedEntityId) {
      pendingScopeRedirectRef.current = false;
      entitiesAtScopeChangeRef.current = null;
      return;
    }

    // Wait for useEntities to return a NEW entities reference (refilter
    // settled for the new scope). Keying on isLoading would miss cache
    // hits where loading never flips true; comparing references catches
    // every refetch — same-content arrays would reuse the same reference.
    if (entities === entitiesAtScopeChangeRef.current) return;
    if (isLoading) return;
    if (entities.length === 0) return;

    pendingScopeRedirectRef.current = false;
    entitiesAtScopeChangeRef.current = null;

    const basePath = computeSpaceBasePath(location.pathname, config.slug);
    if (!basePath) return;

    const firstSlug = getEntitySlug(entities[0]);
    const liveSearch = window.location.search;
    const liveHash = window.location.hash;
    const target = `${basePath}/${firstSlug}${liveSearch}${liveHash}`;
    const current = `${location.pathname}${liveSearch}${liveHash}`;
    if (target !== current) {
      navigate(target, { replace: true });
    }
  }, [
    location.search,
    location.pathname,
    entities,
    isLoading,
    isGridView,
    createMode,
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
        navigate(`${slug}${location.search}${defaultDrawerHash}`);
      }
    },
    [
      navigate,
      config.entitySchemaName,
      config.entitySchemaModel,
      location.search,
      isGridView,
      defaultDrawerHash,
    ],
  );

  // Handle backdrop click (close drawer)
  const handleBackdropClick = useCallback(() => {
    setIsDrawerOpen(false);
    spaceStore.clearFullscreen();

    if (initialSelectedEntityId || createMode) {
      navigate(getSpaceListPath(config.entitySchemaName) || "/");
    } else {
      // Strip the entity slug back to the space base. Previously this
      // used `pathname.split('/').slice(0, 2)`, which on nested
      // workspace paths (/my/pets/test-pet) lopped off everything after
      // /my — landing the user on the dashboard instead of the list.
      const basePath =
        computeSpaceBasePath(location.pathname, config.slug) ?? "/";
      navigate(basePath);
    }
  }, [navigate, location.pathname, initialSelectedEntityId, createMode, config.entitySchemaName, config.slug]);

  return {
    selectedEntityId,
    isDrawerOpen,
    setIsDrawerOpen,
    handleEntityClick,
    handleBackdropClick,
  };
}
