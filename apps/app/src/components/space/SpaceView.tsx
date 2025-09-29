import React, { useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@ui/lib/utils';
import { getComponent, FallbackComponent } from './componentRegistry';

// View configuration interface that matches our config structure
interface ViewConfig {
  viewType: string;
  component: string;
  itemHeight: number;
  dividers: boolean;
  overscan: number;
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
}

// Helper to determine if view should render as grid
function isGridLayout(viewType: string): boolean {
  // Grid-like layouts need special handling
  const gridTypes = ['grid', 'cards', 'tiles', 'masonry'];
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

export function SpaceView<T extends { Id: string }>({
  viewConfig,
  entities,
  selectedId,
  onEntityClick,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false
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
    if (!parentRef.current || isLoadingMore || !hasMore) return;

    const scrollElement = parentRef.current;
    const scrollBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;

    // Trigger when we're within 100px of the bottom
    if (scrollBottom < 100 && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const scrollElement = parentRef.current;
    if (!scrollElement) return;

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

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
            <div key={entity.Id}>
              <CardComponent
                entity={entity}
                selected={selectedId === entity.Id}
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
            selected={selectedId === entity.Id}
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

  return (
    <div
      ref={parentRef}
      className={classes.container}
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
  );
}