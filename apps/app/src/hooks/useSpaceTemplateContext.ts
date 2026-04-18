import { useMemo } from "react";
import type { Signal } from "@preact/signals-react";
import { spaceStore } from "@breedhub/rxdb-store";
import type { PageType } from "@/types/page-config.types";
import type { SpacePermissions } from "@/types/page-menu.types";
import { getPageConfig } from "@/utils/getPageConfig";

interface UseSpaceTemplateContextOptions {
  spaceConfigSignal?: Signal<any>;
  entityType?: string;
  pageType?: PageType;
}

export function useSpaceTemplateContext({
  spaceConfigSignal,
  entityType,
  pageType,
}: UseSpaceTemplateContextOptions) {
  const spaceConfig = spaceConfigSignal?.value;

  const pageConfig = useMemo(() => {
    return getPageConfig(
      spaceConfig,
      pageType ? { pageType } : undefined,
    );
  }, [pageType, spaceConfig]);

  const selectedEntitySignal = useMemo(() => {
    return entityType ? spaceStore.getSelectedEntity(entityType) : null;
  }, [entityType]);

  const selectedEntity = selectedEntitySignal?.value;

  const spacePermissions = useMemo<SpacePermissions>(
    () => ({
      canEdit: spaceConfig?.canEdit ?? false,
      canDelete: spaceConfig?.canDelete ?? false,
      canAdd: spaceConfig?.canAdd ?? false,
    }),
    [spaceConfig?.canAdd, spaceConfig?.canDelete, spaceConfig?.canEdit],
  );

  return {
    pageConfig,
    selectedEntity,
    selectedEntitySignal,
    spaceConfig,
    spacePermissions,
  };
}
