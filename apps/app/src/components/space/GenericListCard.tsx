import React from 'react';
import { cn } from '@ui/lib/utils';

interface GenericListCardProps<T = any> {
  entity: T;
  selected?: boolean;
  index?: number;
  onClick?: () => void;
}

export function GenericListCard<T extends { Id?: string; id?: string; Name?: string; name?: string }>({
  entity,
  selected,
  onClick
}: GenericListCardProps<T>) {
  return (
    <div
      className={cn(
        "p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors",
        selected && "bg-blue-50 border-blue-300"
      )}
      onClick={onClick}
    >
      <div className="font-medium">
        {entity.Name || entity.name || entity.Id || entity.id || 'Unnamed'}
      </div>
      <div className="text-sm text-gray-500 mt-1">
        ID: {entity.Id || entity.id || 'N/A'}
      </div>
    </div>
  );
}