import React, { useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@ui/lib/utils';
import { getComponent, FallbackComponent } from './componentRegistry';
import { ListCardSkeletonList } from './EntityListCardWrapper';
import { GridCardSkeleton } from './GridCardSkeleton';
import { ScrollToTopButton } from '@/components/shared/ScrollToTopButton';

// View configuration interface that matches our config structure
interface ViewConfig {
  viewType: string;
  component: string;
  itemHeight: number;
  dividers: boolean;
  overscan: number;
  skeletonCount?: number;
  columns?: number | {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
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
}

// Helper to determine if view should render as grid
function isGridLayout(viewType: string): boolean {
  // Grid-like layouts need special handling
  const gridTypes = ['grid', 'cards', 'tiles', 'masonry', 'tab'];
  return gridTypes.includes(viewType.toLowerCase());
}

// Helper to get columns count
function getColumnsCount(viewConfig: ViewConfig): number {
  // Single column layouts
  if (!isGridLayout(viewConfig.viewType)) {
    return 1;
  }

  // Grid layouts with columns config
  if (viewConfig.columns) {
    if (typeof viewConfig.columns === 'number') {
      return viewConfig.columns;
    }
    // TODO: In production, this should check actual screen size
    // For now, use default or fallback to 3
    return viewConfig.columns.default || 3;
  }

  // Default for grid without columns config
  return 3;
}

// Get CSS classes for different view types
function getViewClasses(viewType: string, dividers: boolean) {
  const isGrid = isGridLayout(viewType);

  return {
    container: cn(
      "virtual-space-view h-full overflow-auto",
      dividers && !isGrid && "divide-y divide-gray-200"
    ),
    gridRow: isGrid ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4" : "",
    listItem: !isGrid ? "" : ""
  };
}

// Default number of skeleton items to show while loading
const DEFAULT_SKELETON_COUNT = 8;

export function SpaceView<T extends { id: string }>({
  viewConfig,
  entities,
  selectedId,
  onEntityClick,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  isLoading = false,
  searchQuery = ""
}: SpaceViewProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Get the component dynamically from registry
  const CardComponent = getComponent(viewConfig.component) || FallbackComponent;

  // Calculate layout parameters
  const isGrid = isGridLayout(viewConfig.viewType);
  const columns = getColumnsCount(viewConfig);
  const classes = getViewClasses(viewConfig.viewType, viewConfig.dividers);

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
    const scrollBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;

    // Trigger when we're within 100px of the bottom
    if (scrollBottom < 100) {
      onLoadMore?.();
    }
  }, [isLoadingMore, onLoadMore]);

  useEffect(() => {
    const scrollElement = parentRef.current;
    // Only subscribe to scroll events if we have more data to load
    if (!scrollElement || !hasMore || !onLoadMore) return;

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [handleScroll, hasMore, onLoadMore]);

  // Render a single virtual item
  const renderVirtualItem = useCallback((virtualRow: any) => {
    // Check if this is the loading row
    const isLoadingRow = hasMore && virtualRow.index >= totalRows;

    if (isLoadingRow) {
      return (
        <div
          key="loader"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualRow.start}px)`,
            height: `${virtualRow.size}px`,
          }}
          className="flex items-center justify-center"
        >
          <div className="text-gray-500">Loading more...</div>
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
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
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
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
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
  }, [
    entities,
    columns,
    isGrid,
    selectedId,
    onEntityClick,
    CardComponent,
    hasMore,
    totalRows,
    classes
  ]);

  // Show skeleton loading state when loading and no entities yet
  if (isLoading && entities.length === 0) {
    const skeletonCount = viewConfig.skeletonCount || DEFAULT_SKELETON_COUNT;

    return (
      <div
        ref={parentRef}
        className={classes.container}
        style={{
          paddingBottom: 'var(--content-padding, 1rem)'
        }}
      >
        {isGrid ? (
          // Grid skeleton
          <div className={classes.gridRow}>
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <GridCardSkeleton key={i} itemHeight={viewConfig.itemHeight} />
            ))}
          </div>
        ) : (
          // List skeleton - count, height, dividers from config
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
    return (
      <div
        ref={parentRef}
        className={cn(classes.container, "flex items-center justify-center")}
        style={{
          paddingBottom: 'var(--content-padding, 1rem)'
        }}
      >
        <div className="text-center text-gray-500">
          {searchQuery ? (
            <p>No results for "{searchQuery}"</p>
          ) : (
            <p>No items found</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        ref={parentRef}
        className={classes.container}
        style={{
          paddingBottom: 'var(--content-padding, 1rem)' // Match header padding for consistency
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map(renderVirtualItem)}
        </div>
      </div>
      <ScrollToTopButton scrollContainer={parentRef.current} positioning="absolute" />
    </div>
  );
}