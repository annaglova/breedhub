import { useCallback, useEffect, useMemo } from "react";
import type { SetURLSearchParams } from "react-router-dom";
import { extractFieldName, spaceStore } from "@breedhub/rxdb-store";
import { useSpaceSearch } from "@/hooks/space/useSpaceSearch";
import { useSortSelection } from "@/hooks/space/useSortSelection";

interface UseSpaceBrowseStateOptions {
  config: any;
  createMode?: boolean;
  initialSelectedEntityId?: string;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
}

export function useSpaceBrowseState({
  config,
  createMode,
  initialSelectedEntityId,
  searchParams,
  setSearchParams,
}: UseSpaceBrowseStateOptions) {
  const defaultView = useMemo(() => {
    if (!spaceStore.configReady.value || !config) {
      return "list";
    }
    return spaceStore.getDefaultView(config.entitySchemaName);
  }, [config, config?.entitySchemaName, spaceStore.configReady.value]);

  const viewStorageKey = `breedhub:view:${config.entitySchemaName}`;
  const sortStorageKey = `breedhub:sort:${config.entitySchemaName}`;
  const filtersStorageKey = `breedhub:filters:${config.entitySchemaName}`;

  const viewMode = useMemo(() => {
    const urlView = searchParams.get("view");
    if (urlView) return urlView;

    try {
      const savedView = localStorage.getItem(viewStorageKey);
      if (savedView) return savedView;
    } catch {
      // Ignore localStorage access errors and fall back to config default.
    }

    return defaultView;
  }, [defaultView, searchParams, viewStorageKey]);

  const isGridView = useMemo(() => {
    const gridTypes = ["grid", "cards", "tiles", "masonry", "tab"];
    return gridTypes.includes(viewMode.toLowerCase());
  }, [viewMode]);

  const recordsCount = useMemo(() => {
    if (!spaceStore.configReady.value) {
      return 30;
    }
    return spaceStore.getViewRecordsCount(config.entitySchemaName, viewMode);
  }, [config.entitySchemaName, viewMode, spaceStore.configReady.value]);

  const sortOptions = useMemo(() => {
    if (!spaceStore.configReady.value) {
      return [];
    }
    return spaceStore.getSortOptions(config.entitySchemaName, viewMode);
  }, [config.entitySchemaName, viewMode, spaceStore.configReady.value]);

  const filterFields = useMemo(() => {
    if (!spaceStore.configReady.value) {
      return [];
    }
    return spaceStore.getFilterFields(config.entitySchemaName, viewMode);
  }, [config.entitySchemaName, viewMode, spaceStore.configReady.value]);

  const mainFilterField = useMemo(() => {
    if (!spaceStore.configReady.value) {
      return null;
    }
    return spaceStore.getMainFilterField(config.entitySchemaName);
  }, [config.entitySchemaName, spaceStore.configReady.value]);

  const mainFilterFieldsResult = useMemo(() => {
    if (!spaceStore.configReady.value) {
      return { fields: [], searchSlug: undefined };
    }
    return spaceStore.getMainFilterFields(config.entitySchemaName);
  }, [config.entitySchemaName, spaceStore.configReady.value]);

  const mainFilterFields = mainFilterFieldsResult.fields;

  const searchUrlSlug = useMemo(() => {
    if (mainFilterFieldsResult.searchSlug) {
      return mainFilterFieldsResult.searchSlug;
    }
    if (mainFilterField) {
      return mainFilterField.slug || extractFieldName(mainFilterField.id);
    }
    return null;
  }, [mainFilterField, mainFilterFieldsResult.searchSlug]);

  const { searchValue, setSearchValue, debouncedSearchValue } = useSpaceSearch(
    searchUrlSlug,
    searchParams,
    setSearchParams,
  );

  const { selectedSortOption, handleSortChange } = useSortSelection(
    searchParams,
    setSearchParams,
    sortOptions,
    sortStorageKey,
  );

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
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (initialSelectedEntityId || createMode) return;

    if (!searchParams.has("view") && viewMode) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("view", viewMode);
      setSearchParams(newParams, { replace: true });
    }
  }, [
    createMode,
    initialSelectedEntityId,
    searchParams,
    setSearchParams,
    viewMode,
  ]);

  useEffect(() => {
    if (initialSelectedEntityId || createMode) return;

    if (!searchParams.has("sort") && selectedSortOption?.id) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("sort", selectedSortOption.id);
      setSearchParams(newParams, { replace: true });
    }
  }, [
    createMode,
    initialSelectedEntityId,
    searchParams,
    selectedSortOption,
    setSearchParams,
  ]);

  const orderBy = useMemo(() => {
    if (!selectedSortOption?.field) {
      return {
        field: "name",
        direction: "asc" as const,
        tieBreaker: {
          field: "id",
          direction: "asc" as const,
        },
      };
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

  const handleViewChange = useCallback(
    (view: string) => {
      try {
        localStorage.setItem(viewStorageKey, view);
      } catch {
        // Ignore localStorage access errors and keep runtime behavior intact.
      }
    },
    [viewStorageKey],
  );

  const currentViewConfig = useMemo(
    () => config.viewConfigs?.find((v: any) => v.viewType === viewMode),
    [config.viewConfigs, viewMode],
  );

  return {
    currentViewConfig,
    debouncedSearchValue,
    filterFields,
    filtersStorageKey,
    handleSortChange,
    handleViewChange,
    isGridView,
    mainFilterField,
    mainFilterFields,
    orderBy,
    recordsCount,
    searchUrlSlug,
    searchValue,
    selectedSortOption,
    setSearchValue,
    sortOptions,
    viewMode,
  };
}
