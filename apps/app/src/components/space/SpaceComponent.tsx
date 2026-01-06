import { mediaQueries } from "@/config/breakpoints";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  extractFieldName,
  getDatabase,
  routeStore,
  spaceStore,
} from "@breedhub/rxdb-store";
import { Signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { Button } from "@ui/components/button";
import { SearchInput } from "@ui/components/form-inputs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib/utils";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { EntitiesCounter } from "./EntitiesCounter";
import { FiltersSection } from "./filters";
import { SpaceView } from "./SpaceView";
import {
  getLabelForValue,
  getValueForLabel,
  normalizeForUrl,
} from "./utils/filter-url-helpers";
import { ViewChanger } from "./ViewChanger";

interface SpaceComponentProps<T> {
  configSignal: Signal<any>; // TODO: Define proper SpaceConfig type from DB structure
  useEntitiesHook: (params: { recordsCount: number; from: number }) => {
    data: { entities: T[]; total: number } | undefined;
    isLoading: boolean;
    error: Error | null;
    isFetching: boolean;
  };
  // Pre-selected entity ID (from SlugResolver for pretty URLs)
  initialSelectedEntityId?: string;
  // Pre-selected entity slug (from SlugResolver for pretty URLs - for display/navigation)
  initialSelectedSlug?: string;
  // Children to render in drawer (when initialSelectedEntityId is provided)
  children?: React.ReactNode;
}

export function SpaceComponent<T extends { id: string }>({
  configSignal,
  useEntitiesHook,
  initialSelectedEntityId,
  initialSelectedSlug,
  children,
}: SpaceComponentProps<T>) {
  useSignals();

  // Data loading state
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  // Use the reactive config value from signal
  const config = configSignal.value;

  // For convenience, use same variable name throughout component
  const finalConfig = config;

  // Navigation and routing
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get default view from app_config (isDefault: true)
  const defaultView = useMemo(() => {
    if (!spaceStore.configReady.value || !config) {
      return "list"; // Default fallback
    }
    return spaceStore.getDefaultView(config.entitySchemaName);
  }, [config, config?.entitySchemaName, spaceStore.configReady.value]);

  // 🆕 localStorage key for persisting view preference per entity type
  const viewStorageKey = `breedhub:view:${config.entitySchemaName}`;

  // 🆕 Read view from URL, localStorage, or use default (same pattern as sort)
  const viewMode = useMemo(() => {
    // 1. URL param has highest priority (for sharing links)
    const urlView = searchParams.get("view");
    if (urlView) return urlView;

    // 2. Try to read from localStorage (persisted preference)
    try {
      const savedView = localStorage.getItem(viewStorageKey);
      if (savedView) return savedView;
    } catch (e) {
      // localStorage not available, continue to default
    }

    // 3. Otherwise use default from config
    return defaultView;
  }, [searchParams, viewStorageKey, defaultView]);

  // Check if current view is a grid-like view (tab, grid, cards, etc.)
  // Grid views don't have selection/drawer - clicking goes directly to fullscreen
  const isGridView = useMemo(() => {
    const gridTypes = ["grid", "cards", "tiles", "masonry", "tab"];
    return gridTypes.includes(viewMode.toLowerCase());
  }, [viewMode]);

  // Get selected entity ID from EntityStore as reactive signal
  // Using .value makes the component re-render when selection changes
  const selectedEntityId = spaceStore.getSelectedIdSignal(
    config.entitySchemaName
  ).value;

  // Get records count from view config (динамічно!)
  const recordsCount = useMemo(() => {
    if (!spaceStore.configReady.value) {
      return 30; // Simple fallback - won't cause loading because useEntities waits for configReady
    }
    return spaceStore.getViewRecordsCount(config.entitySchemaName, viewMode);
  }, [config.entitySchemaName, viewMode, spaceStore.configReady.value]);

  // Get sort options from view config
  const sortOptions = useMemo(() => {
    if (!spaceStore.configReady.value) {
      return []; // Simple fallback - won't cause loading because useEntities waits for configReady
    }
    return spaceStore.getSortOptions(config.entitySchemaName, viewMode);
  }, [config.entitySchemaName, viewMode, spaceStore.configReady.value]);

  // Get filter fields from view config (already excludes mainFilterField)
  const filterFields = useMemo(() => {
    if (!spaceStore.configReady.value) {
      return []; // Simple fallback - won't cause loading because useEntities waits for configReady
    }
    return spaceStore.getFilterFields(config.entitySchemaName, viewMode);
  }, [config.entitySchemaName, viewMode, spaceStore.configReady.value]);

  // Get the main filter field for search (from SpaceStore)
  const mainFilterField = useMemo(() => {
    if (!spaceStore.configReady.value) {
      return null; // Simple fallback - won't cause loading because useEntities waits for configReady
    }
    return spaceStore.getMainFilterField(config.entitySchemaName);
  }, [config.entitySchemaName, spaceStore.configReady.value]);

  // Generate URL-friendly slug from field ID
  // If slug exists in config - use it, otherwise extract from field ID
  const getFieldSlug = (field: { id: string; slug?: string }): string => {
    return field.slug || extractFieldName(field.id);
  };

  // Read search value from URL on initial mount only
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (!mainFilterField || !isInitialMount.current) return;

    // Use slug to read from URL
    const slug = getFieldSlug(mainFilterField);
    const urlValue = searchParams.get(slug);

    if (urlValue) {
      setSearchValue(urlValue);
      setDebouncedSearchValue(urlValue);
    }

    isInitialMount.current = false;
  }, [mainFilterField, searchParams]);

  // Debounce search value (faster on delete, slower on typing)
  useEffect(() => {
    // Check if user is deleting (length decreased)
    const isDeleting = searchValue.length < debouncedSearchValue.length;
    // Shorter delay for deleting (500ms), longer for typing (700ms)
    const delay = isDeleting ? 500 : 700;

    const timer = setTimeout(() => {
      // Only search if 2+ characters or empty (for clearing)
      if (searchValue.length === 0 || searchValue.length >= 2) {
        setDebouncedSearchValue(searchValue);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [searchValue, debouncedSearchValue.length]);

  // Update URL when debounced search value changes
  useEffect(() => {
    if (!mainFilterField) {
      return;
    }

    // Use slug for URL (e.g., "name" instead of "breed_field_name")
    const slug = getFieldSlug(mainFilterField);
    const currentValue = searchParams.get(slug);
    const newValue = debouncedSearchValue.trim() || null;

    if (currentValue !== newValue) {
      const newParams = new URLSearchParams(searchParams);

      if (debouncedSearchValue.trim()) {
        newParams.set(slug, debouncedSearchValue.trim());
      } else {
        newParams.delete(slug);
      }

      setSearchParams(newParams, { replace: true });
    }
  }, [debouncedSearchValue, mainFilterField, searchParams, setSearchParams]);

  // Find default sort option
  const defaultSortOption = useMemo(() => {
    return sortOptions.find((option) => option.isDefault) || sortOptions[0];
  }, [sortOptions]);

  // 🆕 localStorage key for persisting sort preference per entity type
  const sortStorageKey = `breedhub:sort:${config.entitySchemaName}`;

  // 🆕 localStorage key for persisting filter preferences per entity type
  const filtersStorageKey = `breedhub:filters:${config.entitySchemaName}`;

  // 🆕 Read sort ID from URL, localStorage, or use default
  const sortId = searchParams.get("sort");

  const selectedSortOption = useMemo(() => {
    // 1. If URL param exists, find matching sort option by ID (highest priority - for sharing links)
    if (sortId) {
      const found = sortOptions.find((option) => option.id === sortId);
      if (found) return found;
    }

    // 2. Try to read from localStorage (persisted preference)
    try {
      const savedSortId = localStorage.getItem(sortStorageKey);
      if (savedSortId) {
        const found = sortOptions.find((option) => option.id === savedSortId);
        if (found) return found;
      }
    } catch (e) {
      // localStorage not available, continue to default
    }

    // 3. Otherwise use default
    return defaultSortOption;
  }, [sortId, sortOptions, defaultSortOption, sortStorageKey]);

  // 🧹 Cleanup legacy URL params on mount
  useEffect(() => {
    const hasLegacyParams =
      searchParams.has("sortBy") ||
      searchParams.has("sortDir") ||
      searchParams.has("sortParam");

    if (hasLegacyParams) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("sortBy");
      newParams.delete("sortDir");
      newParams.delete("sortParam");
      setSearchParams(newParams, { replace: true }); // replace to not add history entry
    }
  }, [searchParams, setSearchParams]);

  // 🎯 Set view in URL if no view param exists (uses localStorage preference or default)
  // Skip in fullscreen/pretty URL mode - we don't need query params there
  useEffect(() => {
    // Skip URL modification in fullscreen mode (pretty URL like /affenpinscher#overview)
    if (initialSelectedEntityId) return;

    const hasViewParam = searchParams.has("view");

    // If no view param, add viewMode (which already considers localStorage preference)
    if (!hasViewParam && viewMode) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("view", viewMode);
      setSearchParams(newParams, { replace: true }); // replace to not add history entry
    }
  }, [searchParams, setSearchParams, viewMode, initialSelectedEntityId]);

  // 🎯 Set sort in URL if no sort param exists (uses localStorage preference or default)
  // Skip in fullscreen/pretty URL mode - we don't need query params there
  useEffect(() => {
    // Skip URL modification in fullscreen mode (pretty URL like /affenpinscher#overview)
    if (initialSelectedEntityId) return;

    const hasSortParam = searchParams.has("sort");

    // If no sort param, add selectedSortOption (which already considers localStorage preference)
    if (!hasSortParam && selectedSortOption?.id) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("sort", selectedSortOption.id);
      setSearchParams(newParams, { replace: true }); // replace to not add history entry
    }
  }, [
    searchParams,
    setSearchParams,
    selectedSortOption,
    initialSelectedEntityId,
  ]);

  // 🆕 Apply saved filters from localStorage on initial load (if no filters in URL)
  const hasAppliedSavedFilters = useRef(false);
  useEffect(() => {
    // Skip if already applied or in fullscreen mode
    if (hasAppliedSavedFilters.current || initialSelectedEntityId) return;
    // Wait for filterFields to be loaded
    if (filterFields.length === 0) return;

    const reservedParams = ["sort", "view", "sortBy", "sortDir", "sortParam"];

    // Check if URL already has any filter params
    let hasFilterParams = false;
    searchParams.forEach((_, key) => {
      if (!reservedParams.includes(key)) {
        hasFilterParams = true;
      }
    });

    // If URL already has filters, don't override with localStorage
    if (hasFilterParams) {
      hasAppliedSavedFilters.current = true;
      return;
    }

    // Try to read saved filters from localStorage
    try {
      const savedFilters = localStorage.getItem(filtersStorageKey);
      if (savedFilters) {
        const parsedFilters = JSON.parse(savedFilters) as Record<
          string,
          string
        >;

        // Apply saved filters to URL (convert IDs to labels)
        const applyFilters = async () => {
          const newParams = new URLSearchParams(searchParams);
          const rxdb = await getDatabase();

          for (const [fieldId, value] of Object.entries(parsedFilters)) {
            if (value) {
              const fieldConfig = filterFields.find((f) => f.id === fieldId);
              const urlKey = fieldConfig?.slug || fieldId;

              // Convert ID to label for URL
              const label = await getLabelForValue(fieldConfig, value, rxdb);
              const normalizedLabel = normalizeForUrl(label);

              console.log(
                "[SpaceComponent] Applying saved filter:",
                fieldId,
                "→",
                normalizedLabel
              );
              newParams.set(urlKey, normalizedLabel);
            }
          }

          setSearchParams(newParams, { replace: true });
        };

        applyFilters();
      }
    } catch (e) {
      // localStorage not available or parse error
      console.warn("[SpaceComponent] Could not load saved filters:", e);
    }

    hasAppliedSavedFilters.current = true;
  }, [
    searchParams,
    setSearchParams,
    filterFields,
    filtersStorageKey,
    initialSelectedEntityId,
  ]);

  // 🆕 Memoize orderBy to prevent infinite loop (new object on each render)
  const orderBy = useMemo(() => {
    if (!selectedSortOption?.field) {
      return {
        field: "name",
        direction: "asc" as const,
        tieBreaker: {
          field: "id",
          direction: "asc" as const,
        },
      }; // Fallback to name with id tie-breaker
    }

    return {
      field: selectedSortOption.field,
      direction: selectedSortOption.direction as "asc" | "desc",
      ...(selectedSortOption.parameter && {
        parameter: selectedSortOption.parameter,
      }),
      ...(selectedSortOption.tieBreaker && {
        tieBreaker: selectedSortOption.tieBreaker,
      }),
    };
  }, [selectedSortOption]);

  // 🆕 Build filters object from URL params (excluding system params)
  // Slug (type) in URL → normalized field name (pet_type_id) for queries
  // Label (dogs) in URL → ID (uuid) for queries
  // Same pattern as orderBy: slug for URL, normalized field name for queries
  const [filters, setFilters] = useState<Record<string, any> | undefined>(
    undefined
  );

  useEffect(() => {
    const buildFilters = async () => {
      // If filterFields not loaded yet, don't build filters (wait for config to load)
      // This prevents using URL slugs directly before field configs are available
      if (filterFields.length === 0) {
        setFilters(undefined);
        return;
      }

      const filterObj: Record<string, any> = {};
      const reservedParams = ["sort", "view", "sortBy", "sortDir", "sortParam"];

      try {
        const rxdb = await getDatabase();

        // Wait for dictionaries collection to be ready
        // This is critical for label → ID conversion to work
        let retries = 20;
        while (!rxdb.collections["dictionaries"] && retries > 0) {
          console.log(
            "[SpaceComponent] Waiting for dictionaries collection..."
          );
          await new Promise((resolve) => setTimeout(resolve, 100));
          retries--;
        }

        if (!rxdb.collections["dictionaries"]) {
          console.warn(
            "[SpaceComponent] Dictionaries collection not ready after retries, filters may not work correctly"
          );
        }

        // Process all URL params
        const promises: Promise<void>[] = [];
        searchParams.forEach((urlValue, urlKey) => {
          if (!reservedParams.includes(urlKey) && urlValue) {
            promises.push(
              (async () => {
                // Try to find field by slug first (e.g., "type"), then by field ID
                let fieldConfig = filterFields.find((f) => f.slug === urlKey);
                if (!fieldConfig) {
                  fieldConfig = filterFields.find((f) => f.id === urlKey);
                }

                // If not found in filterFields, check if it's the mainFilterField
                if (!fieldConfig && mainFilterField) {
                  const mainFieldSlug = getFieldSlug(mainFilterField);
                  if (mainFieldSlug === urlKey) {
                    // Add mainFilterField to filters (for search)
                    // Hybrid search will be automatically triggered by space-store
                    console.log(
                      "[SpaceComponent] 🔍 Adding search filter:",
                      mainFilterField.id,
                      "=",
                      urlValue
                    );
                    filterObj[mainFilterField.id] = urlValue;
                    return;
                  }
                }

                if (fieldConfig) {
                  // Try to convert label → ID (e.g., "dogs" → uuid)
                  const valueId = await getValueForLabel(
                    fieldConfig,
                    urlValue,
                    rxdb
                  );

                  if (valueId) {
                    // Found ID by label - use it
                    filterObj[fieldConfig.id] = valueId;
                  } else {
                    // Couldn't find by label - maybe it's already an ID, use as-is
                    filterObj[fieldConfig.id] = urlValue;
                  }
                }
              })()
            );
          }
        });

        await Promise.all(promises);

        const finalFilters =
          Object.keys(filterObj).length > 0 ? filterObj : undefined;
        setFilters(finalFilters);
      } catch (error) {
        console.error("[SpaceComponent] Error building filters:", error);
        setFilters(undefined);
      }
    };

    buildFilters();
  }, [searchParams, filterFields, mainFilterField, config.entitySchemaName]);

  // 🆕 ID-First: useEntities with orderBy + filters enables ID-First pagination
  const {
    data,
    isLoading,
    error,
    isFetching,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useEntitiesHook({
    recordsCount: recordsCount,
    from: 0,
    filters,
    orderBy,
  });

  // UI state
  // When initialSelectedEntityId is provided (from SlugResolver), drawer should be open
  const [isDrawerOpen, setIsDrawerOpen] = useState(!!initialSelectedEntityId);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);

  // Responsive - using custom breakpoints from Angular project
  const isMoreThanSM = useMediaQuery(mediaQueries.sm); // 600px
  const isMoreThanMD = useMediaQuery(mediaQueries.md); // 960px
  const isMoreThanLG = useMediaQuery(mediaQueries.lg); // 1280px
  const isMoreThanXL = useMediaQuery(mediaQueries.xl); // 1440px
  const isMoreThan2XL = useMediaQuery(mediaQueries["2xl"]); // 1536px
  const needCardClass = isMoreThanLG;

  // Get all entities directly from data (no accumulation needed)
  const allEntities = data?.entities || [];

  // Auto-select first entity for xxl+ screens on initial load
  // Skip when initialSelectedEntityId is provided (pretty URL mode from SlugResolver)
  useEffect(() => {
    // Don't auto-select in pretty URL mode - entity is already selected by SlugResolver
    if (initialSelectedEntityId) return;

    if (data?.entities && !isLoading && isMoreThan2XL) {
      if (data.entities.length > 0 && !selectedEntityId) {
        const pathSegments = location.pathname.split("/");
        const hasEntityId =
          pathSegments.length > 2 && pathSegments[2] !== "new";
        if (!hasEntityId) {
          // Use slug from DB if available, otherwise generate from name
          const entity = data.entities[0];
          const slug = entity.slug || normalizeForUrl(entity.name || entity.id);

          // Save route for offline access (same as handleEntityClick)
          routeStore.saveRoute({
            slug,
            entity: config.entitySchemaName,
            entity_id: entity.id,
            model: config.entitySchemaModel || config.entitySchemaName,
          });

          // Preserve query params (sort, filters, etc.) when auto-selecting
          navigate(`${slug}${location.search}#overview`);
        }
      }
    }
  }, [
    data,
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

  // Cache totalCount to localStorage (separate from auto-select)
  useEffect(() => {
    if (data?.entities && !isLoading) {
      setIsInitialLoad(false);

      if (data.total) {
        setTotalCount(data.total);

        // Save totalCount to localStorage ONLY on FIRST load (not during pagination)
        // For spaces with totalFilterKey, save with filter-specific key
        const reservedParams = [
          "sort",
          "view",
          "sortBy",
          "sortDir",
          "sortParam",
          "type",
        ];
        const totalFilterKey = config.totalFilterKey;
        // Use filters object (has normalized field names and actual IDs) instead of searchParams
        const totalFilterValue =
          totalFilterKey && filters ? filters[totalFilterKey] : null;

        // Exclude totalFilterKey from "hasFilters" check
        const filterParams = totalFilterKey
          ? [...reservedParams, totalFilterKey]
          : reservedParams;
        const hasOtherFilters = Array.from(searchParams.keys()).some(
          (key) => !filterParams.includes(key)
        );

        // For spaces with totalFilterKey: allow caching when only that filter is applied
        // For spaces without: only cache when no filters
        const canCache = totalFilterKey
          ? totalFilterValue && !hasOtherFilters // Must have totalFilterKey filter, no other filters
          : !hasOtherFilters; // No filters at all

        if (canCache) {
          try {
            // Build cache key - include filter value if totalFilterKey is set
            const cacheKey =
              totalFilterKey && totalFilterValue
                ? `totalCount_${config.entitySchemaName}_${totalFilterKey}_${totalFilterValue}`
                : `totalCount_${config.entitySchemaName}`;
            const cached = localStorage.getItem(cacheKey);
            const TOTAL_COUNT_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

            let cachedTotal = 0;
            let cacheExpired = false;

            if (cached) {
              // Try JSON format first (new format with TTL)
              try {
                const parsed = JSON.parse(cached);
                if (
                  typeof parsed === "object" &&
                  parsed.value &&
                  parsed.timestamp
                ) {
                  const age = Date.now() - parsed.timestamp;
                  if (age < TOTAL_COUNT_TTL_MS && parsed.value > 0) {
                    cachedTotal = parsed.value;
                  } else {
                    cacheExpired = true;
                  }
                }
              } catch {
                // Legacy format - treat as expired to force refresh
                cacheExpired = true;
              }
            }

            // Save when: no cache OR cache expired, and total is valid
            const isRealTotal = data.total > data.entities.length;
            const shouldSave =
              (cachedTotal === 0 || cacheExpired) && isRealTotal;

            if (shouldSave) {
              const cacheData = { value: data.total, timestamp: Date.now() };
              localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            }
          } catch (e) {
            console.warn("Failed to cache totalCount:", e);
          }
        }
      }
    }
  }, [
    data,
    isLoading,
    searchParams,
    config.entitySchemaName,
    config.totalFilterKey,
    filters,
    isInitialLoad,
  ]);

  // Initialize selection from props (for pretty URLs via SlugResolver)
  // This runs ONCE on mount when initialSelectedEntityId is provided
  useEffect(() => {
    if (initialSelectedEntityId) {
      console.log("[SpaceComponent] Initializing from SlugResolver:", {
        entityId: initialSelectedEntityId,
        slug: initialSelectedSlug,
      });

      // Fetch and select entity - it may not be in the paginated list yet
      // This ensures the entity is loaded even if it's not in the first N items
      spaceStore.fetchAndSelectEntity(
        config.entitySchemaName,
        initialSelectedEntityId
      );

      // Save route for offline access
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

  // Check if drawer should be open based on route OR initialSelectedEntityId
  // Sync EntityStore selection with URL (bidirectional)
  useEffect(() => {
    // If we have initialSelectedEntityId, drawer should be open (pretty URL mode)
    // Skip URL-based logic in this case
    if (initialSelectedEntityId) {
      setIsDrawerOpen(true);
      return;
    }

    const pathSegments = location.pathname.split("/");
    const hasEntitySegment =
      pathSegments.length > 2 && pathSegments[2] !== "new";
    setIsDrawerOpen(hasEntitySegment);

    // Clear fullscreen mode when NOT in pretty URL mode (drawer mode)
    // This handles the case when navigating back from fullscreen to drawer
    if (spaceStore.isFullscreen.value) {
      spaceStore.clearFullscreen();
    }

    // Sync URL → EntityStore (URL is source of truth on route change)
    if (hasEntitySegment) {
      const urlSegment = pathSegments[2];

      // Check if it's a UUID (contains hyphens and is 36 chars) or a friendly slug
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          urlSegment
        );

      let entityId: string | undefined;

      if (isUUID) {
        // Direct UUID - use as is
        entityId = urlSegment;
      } else {
        // Friendly slug - find entity by normalized name or slug field
        const matchingEntity = allEntities.find(
          (entity) =>
            normalizeForUrl(entity.name) === urlSegment ||
            (entity as any).slug === urlSegment
        );

        if (matchingEntity) {
          entityId = matchingEntity.id;
        } else if (allEntities.length > 0 && !isLoading) {
          // Entity not found in current filtered list
          // Check if current selection is still valid in the new list
          const currentSelectedId = spaceStore.getSelectedId(
            config.entitySchemaName
          );
          const currentEntityStillInList =
            currentSelectedId &&
            allEntities.some((e) => e.id === currentSelectedId);

          if (currentEntityStillInList) {
            // Current selection is still valid - keep it, just update URL to match
            const currentEntity = allEntities.find(
              (e) => e.id === currentSelectedId
            );
            if (currentEntity) {
              const correctSlug =
                (currentEntity as any).slug ||
                normalizeForUrl(
                  (currentEntity as any).name || currentEntity.id
                );
              navigate(`${correctSlug}${location.search}${location.hash}`, {
                replace: true,
              });
              entityId = currentSelectedId;
            }
          } else {
            // Current entity not in list anymore (filter changed) - fallback to first
            const firstEntity = allEntities[0];
            entityId = firstEntity.id;
            const newSlug =
              (firstEntity as any).slug ||
              normalizeForUrl((firstEntity as any).name || firstEntity.id);

            // Update URL to match the actually selected entity
            navigate(`${newSlug}${location.search}${location.hash}`, {
              replace: true,
            });
          }
        }
      }

      // Update selection if we found an ID and it's different
      if (entityId) {
        const currentSelectedId = spaceStore.getSelectedId(
          config.entitySchemaName
        );
        if (currentSelectedId !== entityId) {
          spaceStore.selectEntity(config.entitySchemaName, entityId);
        }

        // Save route for offline access (when URL is restored or navigated directly)
        // If urlSegment is UUID, find entity and get proper slug from it
        let slugToSave = urlSegment;
        if (isUUID) {
          const entity = allEntities.find((e) => e.id === entityId);
          if (entity) {
            slugToSave =
              (entity as any).slug ||
              normalizeForUrl((entity as any).name || entity.id);
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
      // Clear selection if no entity in URL
      spaceStore.clearSelection(config.entitySchemaName);
      // Clear fullscreen mode when no entity in URL (drawer closed)
      spaceStore.clearFullscreen();
    }
  }, [
    location.pathname,
    config.entitySchemaName,
    config.entitySchemaModel,
    allEntities,
    initialSelectedEntityId,
  ]);

  // Measure header height
  useEffect(() => {
    if (headerRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setHeaderHeight(entry.contentRect.height);
        }
      });
      observer.observe(headerRef.current);
      return () => observer.disconnect();
    }
  }, []);

  // View change is handled by RxDB replication automatically
  // No need to reset state here

  const handleEntityClick = useCallback(
    (entity: T) => {
      // Update selection in EntityStore
      spaceStore.selectEntity(config.entitySchemaName, entity.id);

      // Navigate using friendly slug, preserving current query params (sort, filters, etc.)
      // Use slug from DB if available, otherwise generate from name
      const slug = entity.slug || normalizeForUrl(entity.name || entity.id);

      // Save route to local cache for offline access to pretty URLs
      routeStore.saveRoute({
        slug,
        entity: config.entitySchemaName,
        entity_id: entity.id,
        model: config.entitySchemaModel || config.entitySchemaName,
      });

      // For grid views (tab, grid, etc.) - go directly to fullscreen
      // No intermediate drawer state
      if (isGridView) {
        spaceStore.setFullscreen(true);
      }

      // Note: Navigation history is only saved for fullscreen pages (in SlugResolver)
      // Drawer mode clicks are quick previews, not "full visits"

      navigate(`${slug}${location.search}#overview`);
    },
    [
      navigate,
      config.entitySchemaName,
      config.entitySchemaModel,
      location.search,
      isGridView,
    ]
  );

  // 🆕 ID-First: Use loadMore from hook (with cursor pagination)
  const handleLoadMore = useCallback(async () => {
    if (loadMore) {
      await loadMore();
    }
  }, [loadMore]);

  // 🆕 Handle sort change - update URL with sort ID and persist to localStorage
  const handleSortChange = useCallback(
    (option: any) => {
      const newParams = new URLSearchParams(searchParams);

      // Remove old sort params (cleanup legacy format)
      newParams.delete("sortBy");
      newParams.delete("sortDir");
      newParams.delete("sortParam");

      // Set new slug-based sort
      newParams.set("sort", option.id);

      // 🆕 Persist sort preference to localStorage
      try {
        localStorage.setItem(sortStorageKey, option.id);
      } catch (e) {
        // localStorage not available, continue without persisting
      }

      setSearchParams(newParams);
    },
    [searchParams, setSearchParams, sortStorageKey]
  );

  // 🆕 Handle view change - persist to localStorage (URL is updated by ViewChanger)
  const handleViewChange = useCallback(
    (view: string) => {
      try {
        localStorage.setItem(viewStorageKey, view);
      } catch (e) {
        // localStorage not available, continue without persisting
      }
    },
    [viewStorageKey]
  );

  // 🆕 Handle filters apply - update URL with filter params (using slugs)
  // Convert ID values to readable labels for URL
  const handleFiltersApply = useCallback(
    async (filterValues: Record<string, any>) => {
      const newParams = new URLSearchParams(searchParams);

      try {
        const rxdb = await getDatabase();

        // Process all filter values (convert ID → label for URL)
        for (const [fieldId, value] of Object.entries(filterValues)) {
          if (value !== undefined && value !== null && value !== "") {
            // Find field config to get slug
            const fieldConfig = filterFields.find((f) => f.id === fieldId);
            const urlKey = fieldConfig?.slug || fieldId; // Use slug if available

            // Get readable label for value (ID → label)
            const label = await getLabelForValue(fieldConfig, value, rxdb);
            const normalizedLabel = normalizeForUrl(label);

            console.log(
              "[handleFiltersApply]",
              fieldId,
              ":",
              value,
              "→",
              normalizedLabel
            );
            newParams.set(urlKey, normalizedLabel);
          } else {
            // When clearing, need to remove both slug and field ID
            const fieldConfig = filterFields.find((f) => f.id === fieldId);
            if (fieldConfig?.slug) {
              newParams.delete(fieldConfig.slug);
            }
            newParams.delete(fieldId);
          }
        }

        // 🆕 Persist filter preferences to localStorage (store IDs, not labels)
        try {
          const filtersToStore: Record<string, string> = {};
          for (const [fieldId, value] of Object.entries(filterValues)) {
            if (value !== undefined && value !== null && value !== "") {
              filtersToStore[fieldId] = String(value);
            }
          }
          if (Object.keys(filtersToStore).length > 0) {
            localStorage.setItem(
              filtersStorageKey,
              JSON.stringify(filtersToStore)
            );
          } else {
            localStorage.removeItem(filtersStorageKey);
          }
        } catch (e) {
          // localStorage not available, continue without persisting
        }

        setSearchParams(newParams);
      } catch (error) {
        console.error(
          "[handleFiltersApply] Error converting IDs to labels:",
          error
        );
        // Fallback: use original values if conversion fails
        Object.entries(filterValues).forEach(([fieldId, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            const fieldConfig = filterFields.find((f) => f.id === fieldId);
            const urlKey = fieldConfig?.slug || fieldId;
            newParams.set(urlKey, String(value));
          }
        });
        setSearchParams(newParams);
      }
    },
    [searchParams, setSearchParams, filterFields, filtersStorageKey]
  );

  // 🆕 Handle filter remove - remove specific filter from URL and update localStorage
  const handleFilterRemove = useCallback(
    (filter: { id: string }) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete(filter.id);

      // 🆕 Update localStorage - remove this filter from saved preferences
      try {
        const savedFilters = localStorage.getItem(filtersStorageKey);
        if (savedFilters) {
          const parsedFilters = JSON.parse(savedFilters) as Record<
            string,
            string
          >;
          // Find the field ID from the slug (filter.id could be slug)
          const fieldConfig = filterFields.find(
            (f) => f.slug === filter.id || f.id === filter.id
          );
          const fieldId = fieldConfig?.id || filter.id;

          delete parsedFilters[fieldId];

          if (Object.keys(parsedFilters).length > 0) {
            localStorage.setItem(
              filtersStorageKey,
              JSON.stringify(parsedFilters)
            );
          } else {
            localStorage.removeItem(filtersStorageKey);
          }
        }
      } catch (e) {
        // localStorage not available
      }

      setSearchParams(newParams);
    },
    [searchParams, setSearchParams, filtersStorageKey, filterFields]
  );

  // Helper to convert "Pet Type" → "Pet type" (sentence case)
  const toSentenceCase = (text: string): string => {
    const words = text.split(" ");
    if (words.length === 0) return text;

    // First word keeps first letter uppercase, rest lowercase
    const firstWord =
      words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
    // Other words all lowercase
    const otherWords = words.slice(1).map((w) => w.toLowerCase());

    return [firstWord, ...otherWords].join(" ");
  };

  // 🆕 Read active filters from URL (excluding 'sort' and 'view')
  // Convert normalized labels back to display labels
  const [activeFilters, setActiveFilters] = useState<
    Array<{ id: string; label: string; isRequired: boolean; order: number }>
  >([]);

  useEffect(() => {
    const loadActiveFilters = async () => {
      const filters: Array<{
        id: string;
        label: string;
        isRequired: boolean;
        order: number;
      }> = [];
      const reservedParams = ["sort", "view", "sortBy", "sortDir", "sortParam"];

      const rxdb = await getDatabase();

      // Wait for dictionaries collection to be available (same as buildFormValues)
      let retries = 20;
      while (!rxdb.collections["dictionaries"] && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        retries--;
      }

      for (const [key, urlValue] of searchParams.entries()) {
        if (!reservedParams.includes(key) && urlValue) {
          // Skip mainFilterField - it's used for search, not displayed as filter chip
          if (mainFilterField) {
            const mainFieldSlug = getFieldSlug(mainFilterField);
            if (mainFieldSlug === key) {
              continue;
            }
          }

          // Find field config by slug or field ID
          let fieldConfig = filterFields.find((f) => f.slug === key);
          if (!fieldConfig) {
            fieldConfig = filterFields.find((f) => f.id === key);
          }

          const displayName = fieldConfig
            ? toSentenceCase(fieldConfig.displayName)
            : key;

          // Convert URL label → Display label (cat → Cat)
          let displayValue = urlValue;
          if (fieldConfig?.referencedTable) {
            // Get UUID from URL label
            const valueId = await getValueForLabel(fieldConfig, urlValue, rxdb);
            if (valueId) {
              // Get display label from UUID
              const label = await getLabelForValue(fieldConfig, valueId, rxdb);
              displayValue = label;
            }
          }

          filters.push({
            id: key,
            label: `${displayName}: ${displayValue}`,
            isRequired: fieldConfig?.required ?? false,
            order: fieldConfig?.order ?? 999,
          });
        }
      }

      // Sort by order from config
      filters.sort((a, b) => a.order - b.order);

      setActiveFilters(filters);
    };

    if (filterFields.length > 0) {
      loadActiveFilters();
    } else {
      setActiveFilters([]);
    }
  }, [searchParams, filterFields, mainFilterField]);

  // 🆕 Get current filter values for initializing FiltersDialog form
  // Need to convert label → ID (same as filters logic)
  const [currentFilterValues, setCurrentFilterValues] = useState<
    Record<string, any>
  >({});

  useEffect(() => {
    const buildFormValues = async () => {
      if (filterFields.length === 0) {
        setCurrentFilterValues({});
        return;
      }

      const values: Record<string, any> = {};
      const reservedParams = ["sort", "view", "sortBy", "sortDir", "sortParam"];

      try {
        const rxdb = await getDatabase();

        // Wait for dictionaries collection (same as filters logic)
        let retries = 20;
        while (!rxdb.collections["dictionaries"] && retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          retries--;
        }

        // Process all URL params and convert label → ID
        const promises: Promise<void>[] = [];
        searchParams.forEach((urlValue, urlKey) => {
          if (!reservedParams.includes(urlKey) && urlValue) {
            promises.push(
              (async () => {
                // Skip mainFilterField - it's used for search, not in FiltersDialog
                if (mainFilterField) {
                  const mainFieldSlug = getFieldSlug(mainFilterField);
                  if (mainFieldSlug === urlKey) {
                    return;
                  }
                }

                // Find field config by slug or field ID
                let fieldConfig = filterFields.find((f) => f.slug === urlKey);
                if (!fieldConfig) {
                  fieldConfig = filterFields.find((f) => f.id === urlKey);
                }

                if (fieldConfig) {
                  // Try to convert label → ID (e.g., "cat" → uuid)
                  const valueId = await getValueForLabel(
                    fieldConfig,
                    urlValue,
                    rxdb
                  );

                  if (valueId) {
                    // Found ID by label - use it for form
                    values[fieldConfig.id] = valueId;
                  } else {
                    // Couldn't find by label - maybe it's already an ID, use as-is
                    values[fieldConfig.id] = urlValue;
                  }
                }
              })()
            );
          }
        });

        await Promise.all(promises);
        setCurrentFilterValues(values);
      } catch (error) {
        console.error(
          "[currentFilterValues] Error building form values:",
          error
        );
        setCurrentFilterValues({});
      }
    };

    buildFormValues();
  }, [searchParams, filterFields, mainFilterField]);

  const handleCreateNew = () => {
    navigate(`${location.pathname}/new`);
  };

  const handleBackdropClick = () => {
    setIsDrawerOpen(false);
    // Clear fullscreen mode when closing drawer
    spaceStore.clearFullscreen();

    // Navigate back to list
    // If we're in pretty URL mode (initialSelectedEntityId provided), go to entity list
    // Otherwise, get base path from current URL (e.g., /breeds/uuid → /breeds)
    if (initialSelectedEntityId) {
      // Pretty URL mode - navigate to entity list (e.g., /breeds)
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
      // Normal mode - get base path from URL
      const basePath = location.pathname.split("/").slice(0, 2).join("/");
      navigate(basePath);
    }
  };

  // Check if fullscreen mode is active (from store - set by SlugResolver or expand button)
  const isFullscreen = spaceStore.isFullscreen.value;

  // Drawer mode depends on screen size (using custom breakpoints)
  // When fullscreen mode is active, always use "over" mode
  const getDrawerMode = () => {
    if (isFullscreen) return "over"; // Force fullscreen from store
    if (isMoreThan2XL) return "side-transparent"; // 2xl+ (1536px+) - transparent background, gap between cards
    if (isMoreThanMD) return "side"; // md (768px+) - side drawer with backdrop
    return "over"; // < md (less than 768px) - fullscreen overlay
  };
  const drawerMode = getDrawerMode();
  const scrollHeight = `calc(100vh - ${headerHeight}px - 3px)`;

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">
          Error loading{" "}
          {config?.naming?.plural?.other || config?.label || "entities"}. Please
          try again later.
        </p>
      </div>
    );
  }

  // Fullscreen mode flag - used to control drawer size and hide space list
  const showFullscreen = isFullscreen && initialSelectedEntityId;

  // Show loading state only on initial load
  // SKIP loading state when initialSelectedEntityId is provided (pretty URL mode)
  // In this case, entity is fetched separately via fetchAndSelectEntity
  // and we render children (fullscreen content) directly
  if (isInitialLoad && isLoading && !initialSelectedEntityId) {
    return (
      <div className="relative h-full overflow-hidden">
        <div
          className={cn(
            "flex flex-col cursor-default h-full overflow-hidden",
            needCardClass ? "fake-card" : "card-surface",
            // For side-transparent mode (xxl+): reserve space for drawer (only for list views)
            !isGridView && drawerMode === "side-transparent" && "mr-[46.25rem]"
          )}
        >
          <div
            ref={headerRef}
            className="z-20 flex flex-col justify-between border-b border-surface-border space-padding"
          >
            <div className="w-full">
              <div className="flex w-full justify-between">
                <h1 className="text-4xl">{finalConfig.title}</h1>
                <ViewChanger
                  views={finalConfig.viewTypes || []}
                  viewConfigs={finalConfig.viewConfigs?.map((v) => ({
                    id: v.viewType,
                    icon: v.icon,
                    tooltip: v.tooltip,
                  }))}
                  onViewChange={handleViewChange}
                />
              </div>
              <EntitiesCounter
                entitiesCount={0}
                total={0}
                entityType={config.entitySchemaName}
                initialCount={recordsCount}
                totalFilterKey={config.totalFilterKey}
                totalFilterValue={
                  config.totalFilterKey && filters
                    ? filters[config.totalFilterKey]
                    : null
                }
              />
            </div>

            {/* Search + Add button */}
            <div className="mt-4 flex items-center space-x-3">
              <SearchInput
                value=""
                placeholder={
                  config?.naming?.searchPlaceholder ||
                  `Search ${config?.label || "entities"}...`
                }
                pill
                disabled
                showClearButton={false}
                className="w-full"
              />

              {finalConfig.canAdd && (
                <Button
                  className={cn(
                    "rounded-full font-bold flex-shrink-0",
                    needCardClass
                      ? "h-[2.25rem] px-4"
                      : "h-[2.25rem] w-[2.25rem] flex items-center justify-center"
                  )}
                >
                  <Plus className="h-4 w-4 flex-shrink-0" />
                  {needCardClass && (
                    <span className="text-base font-semibold">Add</span>
                  )}
                </Button>
              )}
            </div>

            {/* Filters */}
            <FiltersSection
              className="mt-4"
              sortOptions={sortOptions}
              defaultSortOption={selectedSortOption}
              onSortChange={() => {}}
              filterFields={filterFields}
              filters={[]}
              onFilterRemove={() => {}}
              onFiltersApply={() => {}}
              currentFilterValues={{}}
            />
          </div>

          {/* SpaceView with skeletons */}
          <div className="relative flex-1 overflow-hidden">
            <SpaceView
              viewConfig={{
                viewType: viewMode,
                component:
                  finalConfig.viewConfigs?.find((v) => v.viewType === viewMode)
                    ?.component || "GenericListCard",
                itemHeight:
                  finalConfig.viewConfigs?.find((v) => v.viewType === viewMode)
                    ?.itemHeight || 68,
                dividers:
                  finalConfig.viewConfigs?.find((v) => v.viewType === viewMode)
                    ?.dividers ?? true,
                overscan:
                  finalConfig.viewConfigs?.find((v) => v.viewType === viewMode)
                    ?.overscan || 3,
                skeletonCount: Math.ceil(recordsCount / 2),
              }}
              entities={[]}
              isLoading={true}
            />
            <div
              className="bg-card-ground w-full absolute bottom-0"
              style={{ height: "var(--content-padding)" }}
            />
          </div>
        </div>

        {/* Drawer for side-transparent mode - always visible on xxl+ (only for list views) */}
        {!isGridView && drawerMode === "side-transparent" && (
          <div
            className={cn(
              "absolute top-0 right-0 h-full z-40",
              "w-[45rem]",
              needCardClass ? "fake-card" : "card-surface",
              "rounded-l-xl overflow-hidden"
            )}
          >
            {/* PublicPageTemplate handles its own loading skeletons via outlets */}
            {children || <Outlet />}
          </div>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="relative h-full overflow-hidden">
        {/* Main Content - hidden when fullscreen */}
        {!showFullscreen && (
          <div
            className={cn(
              "relative flex flex-col cursor-default h-full overflow-hidden",
              needCardClass ? "fake-card" : "card-surface",
              "transition-all duration-300 ease-out",
              // For side-transparent mode (xxl+): reserve space for drawer (only for list views)
              // Grid views don't have side drawer - they go directly to fullscreen
              !isGridView &&
                drawerMode === "side-transparent" &&
                "mr-[46.25rem]" // 45rem + 1.25rem gap
            )}
          >
            {/* Header */}
            <div
              ref={headerRef}
              className="z-20 flex flex-col justify-between border-b border-surface-border space-padding"
            >
              <div className="w-full">
                <div className="flex w-full justify-between">
                  <h1 className="text-4xl">{finalConfig.title}</h1>
                  <ViewChanger
                    views={finalConfig.viewTypes || []}
                    viewConfigs={finalConfig.viewConfigs?.map((v) => ({
                      id: v.viewType,
                      icon: v.icon,
                      tooltip: v.tooltip,
                    }))}
                    onViewChange={handleViewChange}
                  />
                </div>
                {spaceStore.configReady.value && (
                  <EntitiesCounter
                    entitiesCount={allEntities.length}
                    total={totalCount}
                    entityType={config.entitySchemaName}
                    initialCount={recordsCount}
                    totalFilterKey={config.totalFilterKey}
                    totalFilterValue={
                      config.totalFilterKey && filters
                        ? filters[config.totalFilterKey]
                        : null
                    }
                  />
                )}
              </div>

              {/* Main actions */}
              <div className="mt-4 flex items-center space-x-3">
                {/* Search */}
                <SearchInput
                  value={searchValue}
                  onValueChange={setSearchValue}
                  placeholder={
                    config?.naming?.searchPlaceholder ||
                    `Search ${config?.label || "entities"}...`
                  }
                  pill
                  className="w-full"
                />

                {/* Add button */}
                {finalConfig.canAdd && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleCreateNew}
                        className={cn(
                          "rounded-full font-bold flex-shrink-0",
                          needCardClass
                            ? "h-[2.25rem] px-4"
                            : "h-[2.25rem] w-[2.25rem] flex items-center justify-center"
                        )}
                      >
                        <Plus className="h-4 w-4 flex-shrink-0" />
                        {needCardClass && (
                          <span className="text-base font-semibold">Add</span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Add new record</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Filters */}
              <FiltersSection
                className="mt-4"
                sortOptions={sortOptions}
                defaultSortOption={selectedSortOption}
                onSortChange={handleSortChange}
                filterFields={filterFields}
                filters={activeFilters}
                onFilterRemove={handleFilterRemove}
                onFiltersApply={handleFiltersApply}
                currentFilterValues={currentFilterValues}
              />
            </div>

            {/* Content Scroller */}
            <div className="relative flex-1 overflow-hidden">
              <SpaceView
                viewConfig={{
                  viewType: viewMode,
                  component:
                    finalConfig.viewConfigs?.find(
                      (v) => v.viewType === viewMode
                    )?.component || "GenericListCard",
                  itemHeight:
                    finalConfig.viewConfigs?.find(
                      (v) => v.viewType === viewMode
                    )?.itemHeight || 68,
                  dividers:
                    finalConfig.viewConfigs?.find(
                      (v) => v.viewType === viewMode
                    )?.dividers ?? true,
                  overscan:
                    finalConfig.viewConfigs?.find(
                      (v) => v.viewType === viewMode
                    )?.overscan || 3,
                  skeletonCount: Math.ceil(recordsCount / 2),
                }}
                entities={allEntities}
                selectedId={isGridView ? undefined : selectedEntityId}
                onEntityClick={handleEntityClick}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                isLoading={isLoading}
                searchQuery={debouncedSearchValue}
              />
              {/* Bottom spacer like in Angular */}
              <div
                className="bg-card-ground w-full absolute bottom-0"
                style={{ height: "var(--content-padding)" }}
              />
            </div>

            {/* Backdrop for drawer (only for side/over modes inside content, not in grid view) */}
            {!isGridView &&
              (drawerMode === "side" || drawerMode === "over") && (
                <div
                  className={cn(
                    "absolute inset-0 z-30 transition-opacity duration-300",
                    isMoreThanLG && "rounded-xl",
                    isDrawerOpen
                      ? "bg-black/40 opacity-100"
                      : "opacity-0 pointer-events-none"
                  )}
                  onClick={handleBackdropClick}
                />
              )}
          </div>
        )}

        {/* Unified Drawer - single element for all modes with smooth transitions */}
        {/* For grid view: only render when fullscreen. For list view: normal drawer behavior */}
        {(isGridView
          ? showFullscreen
          : showFullscreen ||
            isDrawerOpen ||
            drawerMode === "side-transparent") && (
          <div
            className={cn(
              "absolute top-0 bottom-0 right-0 z-40",
              "transition-all duration-300 ease-out",
              // Width based on mode and fullscreen state - use percentages for smooth transition
              (showFullscreen || drawerMode === "over") && "w-full",
              !showFullscreen && drawerMode === "side" && "w-[60%]",
              !showFullscreen &&
                drawerMode === "side-transparent" &&
                "w-[45rem]",
              // Background
              showFullscreen
                ? needCardClass
                  ? "fake-card"
                  : "card-surface"
                : drawerMode === "side-transparent"
                ? needCardClass
                  ? "fake-card"
                  : "card-surface"
                : "bg-white",
              // Rounded corners (not for fullscreen or over mode)
              !showFullscreen &&
                drawerMode !== "over" &&
                "rounded-l-xl overflow-hidden",
              // Shadow for side mode only
              !showFullscreen && drawerMode === "side" && "shadow-xl",
              // Show/hide animation (always visible in fullscreen or side-transparent for list views)
              showFullscreen || drawerMode === "side-transparent"
                ? "opacity-100"
                : isDrawerOpen
                ? "opacity-100"
                : "translate-x-full opacity-0 pointer-events-none"
            )}
          >
            <div className="h-full overflow-auto">{children || <Outlet />}</div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
