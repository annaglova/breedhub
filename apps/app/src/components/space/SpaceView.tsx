import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
import type { GenericTableFieldConfig } from "@/components/shared/generic-table.helpers";
import { mediaQueries } from "@/config/breakpoints";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@ui/lib/utils";
import { useCallback, useEffect, useRef } from "react";
import { FallbackComponent, getComponent } from "./componentRegistry";
import { ListCardSkeletonList } from "./EntityListCardWrapper";
import type { FilterField } from "./filters/FiltersSection";
import { GridCardSkeleton } from "./GridCardSkeleton";
import { SpaceEmptyState } from "./SpaceEmptyState";
import { SpaceTableView } from "./SpaceTableView";

// View configuration interface that matches our config structure
export interface ViewConfig {
  viewType: string;
  component: string;
  itemHeight: number;
  dividers: boolean;
  overscan: number;
  skeletonCount?: number;
  columns?:
    | number
    | {
        default: number;
        sm?: number;
        md?: number;
        lg?: number;
        xl?: number;
      };
  /**
   * What happens when a card is clicked. Defaults to "navigate" (open the
   * record's slug page). Set to "edit" for entities that don't have a
   * standalone page (e.g. note) — the space wires it to the entity's
   * edit dialog. "none" disables the click.
   */
  cardClickAction?: "navigate" | "edit" | "none";
  /**
   * Column definitions for table-style views. Each entry becomes one column —
   * presence in the object means "show", no extra flag needed.
   */
  fields?: Record<string, GenericTableFieldConfig>;
}

type LayoutKind = "list" | "grid" | "table";

function getLayoutKind(viewType: string): LayoutKind {
  const v = viewType.toLowerCase();
  if (v === "table") return "table";
  if (["grid", "cards", "tiles", "masonry", "tab"].includes(v)) return "grid";
  return "list";
}

interface SpaceViewProps<T> {
  viewConfig: ViewConfig;
  entities: T[];
  selectedId?: string;
  onEntityClick?: (entity: T) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  isLoading?: boolean; // Initial loading state
  searchQuery?: string; // Current search query for empty state
  activeFilters?: FilterField[];
  onFilterRemove?: (filter: FilterField) => void;
  onClearAllFilters?: () => void;
  entityLabelPlural?: string;
}

// Get CSS classes for different view types
function getViewClasses(layout: LayoutKind, dividers: boolean, columns: number) {
  const isGrid = layout === "grid";

  // Map column count to Tailwind classes
  const gridColsClass = `grid-cols-${columns}`;

  return {
    container: cn(
      "virtual-space-view h-full overflow-auto",
      dividers && !isGrid && "divide-y divide-slate-200"
    ),
    gridRow: isGrid ? cn("grid px-4 py-3", gridColsClass) : "",
    listItem: !isGrid ? "" : "",
  };
}

// Default number of skeleton items to show while loading
const DEFAULT_SKELETON_COUNT = 8;

/**
 * Dispatcher — routes to the right body component based on layout kind.
 * Keeps the parent renderless (no hooks) so swapping layout doesn't violate
 * rules of hooks: each body component owns its own consistent hook order.
 */
export function SpaceView<T extends { id: string }>(props: SpaceViewProps<T>) {
  const layout = getLayoutKind(props.viewConfig.viewType);

  if (layout === "table") {
    return (
      <SpaceTableView
        fields={props.viewConfig.fields ?? {}}
        entities={props.entities}
        selectedId={props.selectedId}
        onEntityClick={props.onEntityClick}
        onLoadMore={props.onLoadMore}
        hasMore={props.hasMore}
        isLoadingMore={props.isLoadingMore}
        isLoading={props.isLoading}
        itemHeight={props.viewConfig.itemHeight}
        overscan={props.viewConfig.overscan}
        skeletonCount={props.viewConfig.skeletonCount}
        searchQuery={props.searchQuery}
        activeFilters={props.activeFilters}
        onFilterRemove={props.onFilterRemove}
        onClearAllFilters={props.onClearAllFilters}
        entityLabelPlural={props.entityLabelPlural}
      />
    );
  }

  return <SpaceListGridView {...props} layout={layout} />;
}

interface SpaceListGridViewProps<T> extends SpaceViewProps<T> {
  layout: LayoutKind;
}

function SpaceListGridView<T extends { id: string }>({
  viewConfig,
  entities,
  selectedId,
  onEntityClick,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  isLoading = false,
  searchQuery = "",
  activeFilters,
  onFilterRemove,
  onClearAllFilters,
  entityLabelPlural,
  layout,
}: SpaceListGridViewProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Get the component dynamically from registry
  const CardComponent = getComponent(viewConfig.component) || FallbackComponent;

  const isGrid = layout === "grid";

  // Responsive columns based on screen size (matching old Angular project)
  // lg+ (1280px): 4 cols, md+ (768px): 3 cols, sm+ (640px): 2 cols, <sm: 1 col
  const isMoreThanSM = useMediaQuery(mediaQueries.sm);
  const isMoreThanMD = useMediaQuery(mediaQueries.md);
  const isMoreThanLG = useMediaQuery(mediaQueries.lg);
  const columns = isMoreThanLG ? 4 : isMoreThanMD ? 3 : isMoreThanSM ? 2 : 1;

  const classes = getViewClasses(layout, viewConfig.dividers, columns);

  // Calculate rows for virtualization
  const totalRows = isGrid
    ? Math.ceil(entities.length / columns)
    : entities.length;

  // Initialize virtualizer with config values
  const virtualizer = useVirtualizer({
    count: hasMore ? totalRows + 1 : totalRows, // Add one for loading indicator
    getScrollElement: () => parentRef.current,
    estimateSize: () => viewConfig.itemHeight,
    overscan: viewConfig.overscan,
  });

  // Handle infinite scroll
  const handleScroll = useCallback(() => {
    if (!parentRef.current || isLoadingMore) return;

    const scrollElement = parentRef.current;
    const scrollBottom =
      scrollElement.scrollHeight -
      scrollElement.scrollTop -
      scrollElement.clientHeight;

    // Trigger when we're within 100px of the bottom
    if (scrollBottom < 100) {
      onLoadMore?.();
    }
  }, [isLoadingMore, onLoadMore]);

  useEffect(() => {
    const scrollElement = parentRef.current;
    // Only subscribe to scroll events if we have more data to load
    if (!scrollElement || !hasMore || !onLoadMore) return;

    scrollElement.addEventListener("scroll", handleScroll);
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [handleScroll, hasMore, onLoadMore]);

  // Render a single virtual item
  const renderVirtualItem = useCallback(
    (virtualRow: any) => {
      // Check if this is the loading row
      const isLoadingRow = hasMore && virtualRow.index >= totalRows;

      if (isLoadingRow) {
        return (
          <div
            key="loader"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`,
              height: `${virtualRow.size}px`,
            }}
            className="flex items-center justify-center"
          >
            <div className="text-slate-500">Loading more...</div>
          </div>
        );
      }

      // Render based on layout type
      if (isGrid) {
        // Grid layout - render multiple items per row
        const startIdx = virtualRow.index * columns;
        const endIdx = Math.min(startIdx + columns, entities.length);
        const rowEntities = entities.slice(startIdx, endIdx);

        if (rowEntities.length === 0) return null;

        return (
          <div
            key={virtualRow.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`,
              height: `${virtualRow.size}px`,
            }}
            className={classes.gridRow}
          >
            {rowEntities.map((entity) => (
              <div key={entity.id}>
                <CardComponent
                  entity={entity}
                  selected={selectedId === entity.id}
                  index={entities.indexOf(entity)}
                  onClick={() => onEntityClick?.(entity)}
                />
              </div>
            ))}
          </div>
        );
      } else {
        // List layout - render single item per row
        const entity = entities[virtualRow.index];
        if (!entity) return null;

        return (
          <div
            key={virtualRow.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`,
              height: `${virtualRow.size}px`,
            }}
            className={classes.listItem}
          >
            <CardComponent
              entity={entity}
              selected={selectedId === entity.id}
              index={virtualRow.index}
              onClick={() => onEntityClick?.(entity)}
            />
          </div>
        );
      }
    },
    [
      entities,
      columns,
      isGrid,
      selectedId,
      onEntityClick,
      CardComponent,
      hasMore,
      totalRows,
      classes,
    ]
  );

  // Show skeleton loading state when loading and no entities yet
  if (isLoading && entities.length === 0) {
    const skeletonCount = viewConfig.skeletonCount || DEFAULT_SKELETON_COUNT;

    // Check if component has custom skeleton
    const CustomSkeleton = (CardComponent as any).Skeleton;

    return (
      <div
        ref={parentRef}
        className={classes.container}
        style={{
          paddingBottom: "var(--content-padding)",
        }}
      >
        {isGrid ? (
          // Grid skeleton
          <div className={classes.gridRow}>
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <GridCardSkeleton key={i} itemHeight={viewConfig.itemHeight} />
            ))}
          </div>
        ) : CustomSkeleton ? (
          // Custom skeleton from component
          <div>
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <CustomSkeleton key={i} />
            ))}
          </div>
        ) : (
          // Default list skeleton
          <ListCardSkeletonList
            count={skeletonCount}
            itemHeight={viewConfig.itemHeight}
            dividers={viewConfig.dividers}
          />
        )}
      </div>
    );
  }

  // Show empty state when not loading and no entities
  if (!isLoading && entities.length === 0) {
    const hasFilters = !!activeFilters && activeFilters.length > 0;
    const useStructuredEmpty =
      (hasFilters || !!searchQuery) && !!onFilterRemove && !!onClearAllFilters;

    return (
      <div
        ref={parentRef}
        className={cn(classes.container, "flex items-center justify-center")}
        style={{
          paddingBottom: "var(--content-padding)",
        }}
      >
        {useStructuredEmpty ? (
          <SpaceEmptyState
            filters={activeFilters ?? []}
            onFilterRemove={onFilterRemove!}
            onClearAll={onClearAllFilters!}
            searchQuery={searchQuery}
            entityLabelPlural={entityLabelPlural?.toLowerCase()}
          />
        ) : (
          <div className="text-center text-slate-500">
            <p>No items found</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        ref={parentRef}
        className={classes.container}
        style={{
          paddingBottom: "var(--content-padding)", // Match header padding for consistency
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map(renderVirtualItem)}
        </div>
      </div>
      <ScrollToTopButton
        scrollContainer={parentRef.current}
        positioning="absolute"
      />
    </div>
  );
}
