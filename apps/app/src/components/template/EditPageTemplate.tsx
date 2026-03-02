import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import {
  AboveFoldLoadingProvider,
  useAllAboveFoldReady,
  useSkeletonWithDelay,
} from "@/contexts/AboveFoldLoadingContext";
import { SpaceProvider } from "@/contexts/SpaceContext";
import { useEntityFullyLoaded } from "@/hooks/useEntityFullyLoaded";
import { getPageConfig } from "@/utils/getPageConfig";
import { spaceStore } from "@breedhub/rxdb-store";
import { Signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { useCallback, useRef } from "react";

interface EditPageTemplateProps {
  className?: string;
  spaceConfigSignal?: Signal<any>;
  entityType?: string;
}

/**
 * Props for EditBlocks inner component
 */
interface EditBlocksProps {
  pageConfig: any;
  selectedEntity: any;
  spacePermissions: any;
  entityType?: string;
  isEntityFullyLoaded: boolean;
}

/**
 * EditBlocks - Renders edit page blocks (Cover + Avatar) with coordinated loading
 */
function EditBlocks({
  pageConfig,
  selectedEntity,
  spacePermissions,
  entityType,
  isEntityFullyLoaded,
}: EditBlocksProps) {
  const allBlocksReady = useAllAboveFoldReady();
  const isAboveFoldLoading = !isEntityFullyLoaded || !allBlocksReady;
  const shouldShowSkeleton = useSkeletonWithDelay(isAboveFoldLoading);
  const isBlocksLoading = !selectedEntity || shouldShowSkeleton;

  // Save orchestration: active tab registers its save handler
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);

  const onSaveReady = useCallback((handler: () => Promise<void>) => {
    saveHandlerRef.current = handler;
  }, []);

  const handleSave = useCallback(() => {
    saveHandlerRef.current?.();
  }, []);

  // Sort blocks by order
  const sortedBlocks = Object.entries(pageConfig.blocks).sort(
    ([, a]: [string, any], [, b]: [string, any]) => (a.order || 0) - (b.order || 0)
  );

  return (
    <>
      {sortedBlocks.map(([blockId, blockConfig]: [string, any]) => {
        if (blockConfig.outlet === "CoverOutlet") {
          return (
            <BlockRenderer
              key={blockId}
              blockConfig={{
                ...blockConfig,
                isDrawerMode: false,
                entityType,
              }}
              entity={selectedEntity}
              pageConfig={pageConfig}
              spacePermissions={spacePermissions}
              isLoading={isBlocksLoading}
            />
          );
        }

        if (blockConfig.outlet === "AvatarOutlet") {
          return (
            <BlockRenderer
              key={blockId}
              blockConfig={{
                ...blockConfig,
                isFullscreenMode: true,
                onSave: handleSave,
              }}
              entity={selectedEntity}
              pageConfig={pageConfig}
              spacePermissions={spacePermissions}
              isLoading={isBlocksLoading}
            />
          );
        }

        if (blockConfig.outlet === "TabOutlet") {
          return (
            <BlockRenderer
              key={blockId}
              blockConfig={{
                ...blockConfig,
                tabMode: "tabs",
                onSaveReady,
                entityType,
              }}
              entity={selectedEntity}
              pageConfig={pageConfig}
              spacePermissions={spacePermissions}
              isLoading={isBlocksLoading}
            />
          );
        }

        // Skip other outlet types for now (NameOutlet)
        return null;
      })}
    </>
  );
}

/**
 * EditPageTemplate - Edit page with Cover + Avatar outlets
 *
 * Fullscreen-only (no drawer mode).
 * Uses pageType: 'edit' from space config to get edit-specific page config.
 */
export function EditPageTemplate({
  className,
  spaceConfigSignal,
  entityType,
}: EditPageTemplateProps) {
  useSignals();

  const spaceConfig = spaceConfigSignal?.value;

  // Get edit page config specifically
  const pageConfig = getPageConfig(spaceConfig, { pageType: 'edit' });

  const spacePermissions = {
    canEdit: spaceConfig?.canEdit ?? false,
    canDelete: spaceConfig?.canDelete ?? false,
    canAdd: spaceConfig?.canAdd ?? false,
  };

  const selectedEntitySignal = entityType
    ? spaceStore.getSelectedEntity(entityType)
    : null;
  const selectedEntity = selectedEntitySignal?.value;

  const isEntityFullyLoaded = useEntityFullyLoaded(entityType, selectedEntity);

  return spaceConfigSignal ? (
    <SpaceProvider
      spaceConfigSignal={spaceConfigSignal}
      selectedEntitySignal={selectedEntitySignal}
    >
      <div
        className={cn(
          "size-full flex flex-col content-padding-sm",
          "min-h-screen bg-white dark:bg-slate-900",
          className
        )}
      >
        <div className="flex flex-auto flex-col items-center overflow-auto">
          <div className="w-full max-w-3xl lg:max-w-4xl xxl:max-w-5xl">
            {!pageConfig && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                <p className="text-red-700 font-semibold">
                  Edit page configuration not found
                </p>
                <p className="text-red-600 text-sm mt-1">
                  No edit page configured for this space (pageType: &quot;edit&quot;)
                </p>
              </div>
            )}

            {pageConfig && pageConfig.blocks && (
              <AboveFoldLoadingProvider>
                <EditBlocks
                  pageConfig={pageConfig}
                  selectedEntity={selectedEntity}
                  spacePermissions={spacePermissions}
                  entityType={entityType}
                  isEntityFullyLoaded={isEntityFullyLoaded}
                />
              </AboveFoldLoadingProvider>
            )}
          </div>
        </div>
      </div>
    </SpaceProvider>
  ) : (
    <div className="p-8 text-center">
      <p className="text-red-600">Space configuration signal is required</p>
    </div>
  );
}
