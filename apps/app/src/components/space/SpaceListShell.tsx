import type { ComponentProps } from "react";
import { cn } from "@ui/lib/utils";
import { SpaceHeader } from "./SpaceHeader";
import { SpaceView, type ViewConfig } from "./SpaceView";

interface SpaceListShellProps<T extends { id: string }> {
  className?: string;
  headerProps: ComponentProps<typeof SpaceHeader>;
  viewConfig: ViewConfig;
  entities: T[];
  selectedId?: string;
  onEntityClick?: (entity: T) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  isLoading?: boolean;
  searchQuery?: string;
  bottomSpacerClassName?: string;
  showBackdrop?: boolean;
  isBackdropVisible?: boolean;
  backdropRounded?: boolean;
  onBackdropClick?: () => void;
}

export function SpaceListShell<T extends { id: string }>({
  className,
  headerProps,
  viewConfig,
  entities,
  selectedId,
  onEntityClick,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  isLoading = false,
  searchQuery = "",
  bottomSpacerClassName,
  showBackdrop = false,
  isBackdropVisible = false,
  backdropRounded = false,
  onBackdropClick,
}: SpaceListShellProps<T>) {
  return (
    <div className={className}>
      <SpaceHeader {...headerProps} />

      <div className="relative flex-1 overflow-hidden">
        <SpaceView
          viewConfig={viewConfig}
          entities={entities}
          selectedId={selectedId}
          onEntityClick={onEntityClick}
          onLoadMore={onLoadMore}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          isLoading={isLoading}
          searchQuery={searchQuery}
        />
        <div
          className={cn(
            "bg-card-ground w-full absolute bottom-0",
            bottomSpacerClassName,
          )}
          style={{ height: "var(--content-padding)" }}
        />
      </div>

      {showBackdrop && (
        <div
          className={cn(
            "absolute inset-0 z-30 transition-opacity duration-300",
            backdropRounded && "rounded-xl",
            isBackdropVisible
              ? "bg-black/40 opacity-100"
              : "opacity-0 pointer-events-none",
          )}
          onClick={onBackdropClick}
        />
      )}
    </div>
  );
}
