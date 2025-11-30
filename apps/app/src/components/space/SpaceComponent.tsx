import { mediaQueries } from "@/config/breakpoints";
import { SpaceConfig } from "@/core/space/types";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { getDatabase, spaceStore, routeStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { Signal } from "@preact/signals-react";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib/utils";
import { Plus, Search } from "lucide-react";
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
  useEntitiesHook: (params: { rows: number; from: number }) => {
    data: { entities: T[]; total: number } | undefined;
    isLoading: boolean;
    error: Error | null;
    isFetching: boolean;
  };
}

export function SpaceComponent<T extends { id: string }>({
  configSignal,
  useEntitiesHook,
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
      return 'list'; // Default fallback
    }
    return spaceStore.getDefaultView(config.entitySchemaName);
  }, [config, config?.entitySchemaName, spaceStore.configReady.value]);

  const viewMode = searchParams.get("view") || defaultView;

  // Get selected entity ID from EntityStore as reactive signal
  // Using .value makes the component re-render when selection changes
  const selectedEntityId = spaceStore.getSelectedIdSignal(config.entitySchemaName).value;

  // Get rows from view config (динамічно!)
  const rowsPerPage = useMemo(() => {
    if (!spaceStore.configReady.value) {
      return 30; // Simple fallback - won't cause loading because useEntities waits for configReady
    }
    const rows = spaceStore.getViewRows(config.entitySchemaName, viewMode);
    return rows;
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
    if (field.slug) {
      return field.slug;
    }

    // Extract field name from ID: "breed_field_name" → "name"
    const parts = field.id.split('_field_');
    return parts.length > 1 ? parts[1] : field.id;
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

  // 🆕 Read sort ID from URL or use default
  const sortId = searchParams.get("sort");

  const selectedSortOption = useMemo(() => {
    // If URL param exists, find matching sort option by ID
    if (sortId) {
      const found = sortOptions.find((option) => option.id === sortId);
      if (found) return found;
    }
    // Otherwise use default
    return defaultSortOption;
  }, [sortId, sortOptions, defaultSortOption]);

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

  // 🎯 Set default view in URL if no view param exists
  useEffect(() => {
    const hasViewParam = searchParams.has("view");

    // If no view param and we have a default view, add it to URL
    if (!hasViewParam && defaultView) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("view", defaultView);
      setSearchParams(newParams, { replace: true }); // replace to not add history entry
    }
  }, [searchParams, setSearchParams, defaultView]);

  // 🎯 Set default sort in URL if no sort param exists
  useEffect(() => {
    const hasSortParam = searchParams.has("sort");

    // If no sort param and we have a default sort option, add it to URL
    if (!hasSortParam && defaultSortOption?.id) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("sort", defaultSortOption.id);
      setSearchParams(newParams, { replace: true }); // replace to not add history entry
    }
  }, [searchParams, setSearchParams, defaultSortOption]);

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
                    console.log('[SpaceComponent] 🔍 Adding search filter:', mainFilterField.id, '=', urlValue);
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
    rows: rowsPerPage,
    from: 0,
    filters,
    orderBy,
  });

  // UI state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);

  // Responsive - using custom breakpoints from Angular project
  const isMoreThanSM = useMediaQuery(mediaQueries.sm); // 600px
  const isMoreThanMD = useMediaQuery(mediaQueries.md); // 960px
  const isMoreThanLG = useMediaQuery(mediaQueries.lg); // 1280px
  const isMoreThanXL = useMediaQuery(mediaQueries.xl); // 1440px
  const isMoreThan2XL = useMediaQuery(mediaQueries.xxl); // 1536px
  const needCardClass = isMoreThanLG;

  // Get all entities directly from data (no accumulation needed)
  const allEntities = data?.entities || [];

  // Auto-select first entity for xxl+ screens on initial load
  useEffect(() => {
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
            model: config.entitySchemaModel || config.entitySchemaName
          });

          // Preserve query params (sort, filters, etc.) when auto-selecting
          navigate(`${slug}${location.search}#overview`);
        }
      }
    }
  }, [data, isLoading, isMoreThan2XL, selectedEntityId, navigate, location.pathname, location.search, config.entitySchemaName, config.entitySchemaModel]);

  // Cache totalCount to localStorage (separate from auto-select)
  useEffect(() => {
    if (data?.entities && !isLoading) {
      setIsInitialLoad(false);

      if (data.total) {
        setTotalCount(data.total);

        // Save totalCount to localStorage ONLY on FIRST load (not during pagination)
        // This prevents the count from growing during infinite scroll
        const reservedParams = ["sort", "view", "sortBy", "sortDir", "sortParam"];
        const hasFilters = Array.from(searchParams.keys()).some(
          key => !reservedParams.includes(key)
        );

        if (!hasFilters) {
          try {
            const cached = localStorage.getItem(`totalCount_${config.entitySchemaName}`);
            const cachedTotal = cached ? parseInt(cached, 10) : 0;

            // Only save on FIRST load when:
            // 1. No cache exists (cachedTotal === 0)
            // 2. Total is valid and REAL (greater than current loaded entities)
            // Don't save if total === entitiesCount (means server hasn't sent real total yet)
            const isRealTotal = data.total > data.entities.length;
            const isFirstLoad = cachedTotal === 0;
            const shouldSave = isFirstLoad && isRealTotal;

            if (shouldSave) {
              localStorage.setItem(`totalCount_${config.entitySchemaName}`, data.total.toString());
            }
          } catch (e) {
            console.warn('Failed to cache totalCount:', e);
          }
        }
      }
    }
  }, [
    data,
    isLoading,
    searchParams,
    config.entitySchemaName,
    isInitialLoad
  ]);

  // Check if drawer should be open based on route
  // Sync EntityStore selection with URL (bidirectional)
  useEffect(() => {
    const pathSegments = location.pathname.split("/");
    const hasEntitySegment = pathSegments.length > 2 && pathSegments[2] !== "new";
    setIsDrawerOpen(hasEntitySegment);

    // Sync URL → EntityStore (URL is source of truth on route change)
    if (hasEntitySegment) {
      const urlSegment = pathSegments[2];

      // Check if it's a UUID (contains hyphens and is 36 chars) or a friendly slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(urlSegment);

      let entityId: string | undefined;

      if (isUUID) {
        // Direct UUID - use as is
        entityId = urlSegment;
        console.log('[SpaceComponent] URL segment is UUID:', entityId);
      } else {
        // Friendly slug - find entity by normalized name
        console.log('[SpaceComponent] URL segment is slug:', urlSegment);
        const matchingEntity = allEntities.find(entity =>
          normalizeForUrl(entity.name) === urlSegment
        );

        if (matchingEntity) {
          entityId = matchingEntity.id;
          console.log('[SpaceComponent] Found entity by slug:', matchingEntity.name, '→', entityId);
        } else {
          console.warn('[SpaceComponent] No entity found for slug:', urlSegment);
        }
      }

      // Update selection if we found an ID and it's different
      if (entityId) {
        const currentSelectedId = spaceStore.getSelectedId(config.entitySchemaName);
        if (currentSelectedId !== entityId) {
          spaceStore.selectEntity(config.entitySchemaName, entityId);
        }

        // Save route for offline access (when URL is restored or navigated directly)
        // Use urlSegment as slug (it's already the friendly slug from URL)
        routeStore.saveRoute({
          slug: urlSegment,
          entity: config.entitySchemaName,
          entity_id: entityId,
          model: config.entitySchemaModel || config.entitySchemaName
        });
      }
    } else {
      // Clear selection if no entity in URL
      spaceStore.clearSelection(config.entitySchemaName);
    }
  }, [location.pathname, config.entitySchemaName, config.entitySchemaModel, allEntities]);

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
        model: config.entitySchemaModel || config.entitySchemaName
      });

      navigate(`${slug}${location.search}#overview`);
    },
    [navigate, config.entitySchemaName, config.entitySchemaModel, location.search]
  );

  // 🆕 ID-First: Use loadMore from hook (with cursor pagination)
  const handleLoadMore = useCallback(async () => {
    if (loadMore) {
      await loadMore();
    }
  }, [loadMore]);

  // 🆕 Handle sort change - update URL with sort ID
  const handleSortChange = useCallback(
    (option: any) => {
      const newParams = new URLSearchParams(searchParams);

      // Remove old sort params (cleanup legacy format)
      newParams.delete("sortBy");
      newParams.delete("sortDir");
      newParams.delete("sortParam");

      // Set new slug-based sort
      newParams.set("sort", option.id);

      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
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
    [searchParams, setSearchParams, filterFields]
  );

  // 🆕 Handle filter remove - remove specific filter from URL
  const handleFilterRemove = useCallback(
    (filter: { id: string }) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete(filter.id);
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
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
    Array<{ id: string; label: string; isRequired: boolean }>
  >([]);

  useEffect(() => {
    const loadActiveFilters = async () => {
      const filters: Array<{ id: string; label: string; isRequired: boolean }> =
        [];
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
            isRequired: false,
          });
        }
      }

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
    // Navigate back to list without specific entity
    // Get the base path from current pathname (e.g., /breeds/uuid → /breeds)
    const basePath = location.pathname.split('/').slice(0, 2).join('/');
    navigate(basePath);
  };

  // Check if opened from pretty URL (fullscreen mode)
  const locationState = location.state as { fullscreen?: boolean; fromSlug?: string } | null;
  const isFullscreenFromSlug = locationState?.fullscreen === true;

  // Drawer mode depends on screen size (using custom breakpoints)
  // When opened from pretty URL (fullscreen mode), always use "over" mode
  const getDrawerMode = () => {
    if (isFullscreenFromSlug) return "over"; // Force fullscreen when from pretty URL
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
          Error loading {config?.naming?.plural?.other || config?.label || 'entities'}. Please try again later.
        </p>
      </div>
    );
  }

  // Show loading state only on initial load
  if (isInitialLoad && isLoading) {
    return (
      <div className="relative h-full overflow-hidden">
        <div
          className={cn(
            "flex flex-col cursor-default h-full overflow-hidden",
            needCardClass ? "fake-card" : "card-surface"
          )}
        >
          <div
            ref={headerRef}
            className="z-20 flex flex-col justify-between border-b border-surface-border content-padding"
          >
            <div className="w-full">
              <div className="flex w-full justify-between">
                <h1 className="text-4xl">
                  {finalConfig.title}
                </h1>
                <ViewChanger
                  views={
                    finalConfig.viewTypes || []
                  }
                  viewConfigs={finalConfig.viewConfigs?.map((v) => ({
                    id: v.viewType,
                    icon: v.icon,
                    tooltip: v.tooltip,
                  }))}
                />
              </div>
              {spaceStore.configReady.value && (
                <EntitiesCounter
                  entitiesCount={0}
                  total={0}
                  entityType={config.entitySchemaName}
                  initialCount={rowsPerPage}
                />
              )}
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-500">
              Loading {config?.naming?.plural?.other || config?.label || 'entities'}...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="relative h-full overflow-hidden">
        {/* Main Content */}
        <div
          className={cn(
            "relative flex flex-col cursor-default h-full overflow-hidden",
            needCardClass ? "fake-card" : "card-surface",
            "transition-all duration-300 ease-out",
            // Only shrink the list for side-transparent mode (xxl+)
            isDrawerOpen && drawerMode === "side-transparent" && "mr-[46.25rem]" // 45rem + 1.25rem gap
          )}
        >
          {/* Header */}
          <div
            ref={headerRef}
            className="z-20 flex flex-col justify-between border-b border-surface-border content-padding"
          >
            <div className="w-full">
              <div className="flex w-full justify-between">
                <h1 className="text-4xl">
                  {finalConfig.title}
                </h1>
                <ViewChanger
                  views={
                    finalConfig.viewTypes || []
                  }
                  viewConfigs={finalConfig.viewConfigs?.map((v) => ({
                    id: v.viewType,
                    icon: v.icon,
                    tooltip: v.tooltip,
                  }))}
                />
              </div>
              {spaceStore.configReady.value && (
                <EntitiesCounter
                  entitiesCount={allEntities.length}
                  total={totalCount}
                  entityType={config.entitySchemaName}
                  initialCount={rowsPerPage}
                />
              )}
            </div>

            {/* Main actions */}
            <div className="mt-4 flex items-center space-x-3">
              {/* Search */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={config?.naming?.searchPlaceholder || `Search ${config?.label || 'entities'}...`}
                  className="pl-10 rounded-full w-full cursor-auto"
                />
              </div>

              {/* Add button */}
              {finalConfig.canAdd && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleCreateNew}
                      className={cn(
                        "rounded-full font-bold flex-shrink-0",
                        needCardClass
                          ? "h-10 px-4"
                          : "w-10 h-10 flex items-center justify-center"
                      )}
                    >
                      <Plus className="h-5 w-5 flex-shrink-0" />
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
                  finalConfig.viewConfigs?.find(v => v.viewType === viewMode)?.component ||
                  "GenericListCard",
                itemHeight: viewMode === "grid" ? 280 : 68,
                dividers: viewMode === "list" || viewMode === "rows",
                overscan: 3,
              }}
              entities={allEntities}
              selectedId={selectedEntityId}
              onEntityClick={handleEntityClick}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
            />
            {/* Bottom spacer like in Angular */}
            <div
              className="bg-card-ground w-full absolute bottom-0"
              style={{ height: 'var(--content-padding, 1rem)' }}
            />
          </div>

          {/* Backdrop for drawer (only for side/over modes inside content) */}
          {(drawerMode === "side" || drawerMode === "over") && (
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

          {/* Drawer for side/over modes (inside main content) */}
          {(drawerMode === "side" || drawerMode === "over") && (
            <div
              className={cn(
                "absolute top-0 right-0 h-full z-40",
                "transform transition-all duration-300 ease-out",
                // Width based on mode
                drawerMode === "over" && "inset-0",
                drawerMode === "side" && "w-[40rem]",
                // Background
                "bg-white",
                // Rounded corners for side mode on larger screens
                drawerMode === "side" && isMoreThanSM && "rounded-l-xl overflow-hidden",
                // Shadow for side mode
                drawerMode === "side" && "shadow-xl",
                // Show/hide animation
                isDrawerOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
              )}
            >
              {isDrawerOpen && <Outlet />}
            </div>
          )}
        </div>

        {/* Drawer for side-transparent mode (outside main content) */}
        {drawerMode === "side-transparent" && (
          <div
            className={cn(
              "absolute top-0 right-0 h-full z-40",
              "w-[45rem]",
              needCardClass ? "fake-card" : "card-surface",
              "rounded-l-xl overflow-hidden",
              "transform transition-all duration-300 ease-out",
              // Show/hide animation
              isDrawerOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
            )}
          >
            {isDrawerOpen && <Outlet />}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
