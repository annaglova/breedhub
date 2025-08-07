import React, { useRef, useCallback, useMemo, useEffect, useState, Suspense } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SpaceConfig, ViewMode } from '@/core/space/types';
import { cn } from '@ui/lib/utils';

interface VirtualSpaceViewProps<T> {
  config: SpaceConfig<T>;
  entities: T[];
  viewMode: ViewMode;
  selectedId?: string;
  onEntityClick?: (entity: T) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export function VirtualSpaceView<T extends { Id: string }>({ 
  config, 
  entities, 
  viewMode,
  selectedId,
  onEntityClick,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false
}: VirtualSpaceViewProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewConfig = config.viewConfig.find(v => v.id === viewMode);
  
  if (!viewConfig) {
    return <div className="p-4">View mode "{viewMode}" not configured</div>;
  }

  // Dynamically load component based on view mode
  const [CardComponent, setCardComponent] = useState<React.ComponentType<any> | null>(null);
  
  useEffect(() => {
    viewConfig.component().then(module => {
      setCardComponent(() => module.default);
    });
  }, [viewConfig]);
  
  if (!CardComponent) {
    return <div className="p-4 text-gray-500">Loading view...</div>;
  }
  
  // Get item height based on view mode
  const itemHeight = viewConfig.itemHeight || 68;
  const isGridView = viewMode === 'grid';
  const columns = isGridView ? (viewConfig.columns || 3) : 1;
  
  // Calculate rows for grid view
  const rows = isGridView 
    ? Math.ceil(entities.length / columns)
    : entities.length;

  const virtualizer = useVirtualizer({
    count: hasMore ? rows + 1 : rows, // Add one for loading indicator
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 3, // Render 3 items outside of view for smoother scrolling
  });

  // Handle scroll events
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

  // Get virtual items
  const items = virtualizer.getVirtualItems();

  const renderItem = useCallback((virtualRow: any) => {
    const isLoadingRow = hasMore && virtualRow.index >= entities.length;
    
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

    if (isGridView) {
      // Render a row of grid items
      const startIdx = virtualRow.index * columns;
      const endIdx = Math.min(startIdx + columns, entities.length);
      const rowEntities = entities.slice(startIdx, endIdx);

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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4"
        >
          {rowEntities.map((entity) => (
            <div
              key={entity.Id}
              onClick={() => onEntityClick?.(entity)}
            >
              <CardComponent
                entity={entity}
                selected={selectedId === entity.Id}
                index={entities.indexOf(entity)}
              />
            </div>
          ))}
        </div>
      );
    } else {
      // List view - render single item
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
          onClick={() => onEntityClick?.(entity)}
        >
          <CardComponent
            entity={entity}
            selected={selectedId === entity.Id}
            index={virtualRow.index}
          />
        </div>
      );
    }
  }, [entities, columns, isGridView, selectedId, onEntityClick, CardComponent, hasMore, rows]);

  return (
    <div 
      ref={parentRef}
      className={cn(
        "virtual-space-view h-full overflow-auto",
        viewMode === 'list' && "divide-y divide-gray-200"
      )}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(renderItem)}
      </div>
    </div>
  );
}