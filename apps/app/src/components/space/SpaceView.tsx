import React, { Suspense } from 'react';
import { SpaceConfig, ViewMode } from '@/core/space/types';
import { cn } from '@ui/lib/utils';

interface SpaceViewProps<T> {
  config: SpaceConfig<T>;
  entities: T[];
  viewMode: ViewMode;
  selectedId?: string;
  onEntityClick?: (entity: T) => void;
  scrollHeight?: number;
}

export function SpaceView<T extends { Id: string }>({ 
  config, 
  entities, 
  viewMode,
  selectedId,
  onEntityClick,
  scrollHeight 
}: SpaceViewProps<T>) {
  const viewConfig = config.viewConfig.find(v => v.id === viewMode);
  
  if (!viewConfig) {
    return <div className="p-4">View mode "{viewMode}" not configured</div>;
  }

  const CardComponent = React.lazy(viewConfig.component);

  return (
    <div 
      className={cn(
        "space-view",
        viewMode === 'grid' && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4",
        viewMode === 'list' && "divide-y divide-gray-200"
      )}
      style={{ height: scrollHeight, overflowY: 'auto' }}
    >
      <Suspense fallback={<div className="p-4">Loading...</div>}>
        {entities.map((entity, index) => (
          <div 
            key={entity.Id} 
            onClick={() => onEntityClick?.(entity)}
          >
            <CardComponent
              entity={entity}
              selected={selectedId === entity.Id}
              index={index}
            />
          </div>
        ))}
      </Suspense>
    </div>
  );
}