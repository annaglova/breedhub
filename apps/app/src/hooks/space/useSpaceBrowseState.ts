import { useCallback, useEffect, useMemo } from "react";
import type { SetURLSearchParams } from "react-router-dom";
import { extractFieldName, spaceStore } from "@breedhub/rxdb-store";
import {
  getSpaceStorageKeys,
  readStorageValue,
  removeLegacySortQueryParams,
  writeStorageValue,
} from "@/hooks/space/space-query.utils";
import { useSpaceSearch } from "@/hooks/space/useSpaceSearch";
import { useSortSelection } from "@/hooks/space/useSortSelection";
import {
  mergeDefaultSortParam,
  mergeDefaultViewParam,
} from "@/hooks/space/url-merge.utils";

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
    return spaceStore.getDefaultView(config.id);
  }, [config, config?.entitySchemaName, spaceStore.configReady.value]);

  const { viewStorageKey, sortStorageKey, filtersStorageKey } =
    getSpaceStorageKeys(config.id);

  const viewMode = useMemo(() => {
    const urlView = searchParams.get("view");
    if (urlView) return urlView;

    const savedView = readStorageValue(viewStorageKey);
    if (savedView) {
      return savedView;
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
    return spaceStore.getViewRecordsCount(config.id, viewMode);
  }, [config.entitySchemaName, viewMode, spaceStore.configReady.value]);

  const sortOptions = useMemo(() => {
    if (!spaceStore.configReady.value) {
      return [];
    }
    return spaceStore.getSortOptions(config.id, viewMode);
  }, [config.entitySchemaName, viewMode, spaceStore.configReady.value]);

  const filterFields = useMemo(() => {
    if (!spaceStore.configReady.value) {
      return [];
    }
    return spaceStore.getFilterFields(config.id, viewMode);
  }, [config.entitySchemaName, viewMode, spaceStore.configReady.value]);

  const mainFilterField = useMemo(() => {
    if (!spaceStore.configReady.value) {
      return null;
    }
    return spaceStore.getMainFilterField(config.id);
  }, [config.entitySchemaName, spaceStore.configReady.value]);

  const mainFilterFieldsResult = useMemo(() => {
    if (!spaceStore.configReady.value) {
      return { fields: [], searchSlug: undefined };
    }
    return spaceStore.getMainFilterFields(config.id);
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
    const sanitizedParams = removeLegacySortQueryParams(searchParams);
    if (sanitizedParams) {
      setSearchParams(sanitizedParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Each defaulter merges into the LIVE browser URL (not stale closure)
  // so concurrent writes from useFilterManagement's async saved-filter
  // restore aren't clobbered. Without this, going /my/notes → /my/pets
  // would drop the persisted pet_type_id because each setSearchParams
  // here would REPLACE the entire query string with view/sort only.
  useEffect(() => {
    if (initialSelectedEntityId || createMode) return;
    const nextParams = mergeDefaultViewParam(window.location.search, viewMode);
    if (!nextParams) return;
    setSearchParams(nextParams, { replace: true });
  }, [
    createMode,
    initialSelectedEntityId,
    searchParams,
    setSearchParams,
    viewMode,
  ]);

  useEffect(() => {
    if (initialSelectedEntityId || createMode) return;
    const nextParams = mergeDefaultSortParam(
      window.location.search,
      selectedSortOption?.id,
    );
    if (!nextParams) return;
    setSearchParams(nextParams, { replace: true });
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
      writeStorageValue(viewStorageKey, view);
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
