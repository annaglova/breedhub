import React from 'react';
import { SpaceListCardProps } from '@/core/space/types';
import { cn } from '@ui/lib/utils';

export function GenericListCard<T extends { id?: string; name?: string }>({ 
  entity, 
  selected, 
  onClick 
}: SpaceListCardProps<T>) {
  return (
    <div
      className={cn(
        "p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors",
        selected && "bg-blue-50 border-blue-300"
      )}
      onClick={onClick}
    >
      <div className="font-medium">
        {entity.name || entity.id || 'Unnamed'}
      </div>
      <div className="text-sm text-gray-500 mt-1">
        ID: {entity.id || 'N/A'}
      </div>
    </div>
  );
}