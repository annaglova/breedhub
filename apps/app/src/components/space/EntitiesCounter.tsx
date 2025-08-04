import React from 'react';

interface EntitiesCounterProps {
  entitiesCount: number;
  isLoading: boolean;
  total: number;
}

export function EntitiesCounter({ entitiesCount, isLoading, total }: EntitiesCounterProps) {
  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground mt-2">
        Loading...
      </div>
    );
  }

  return (
    <div className="text-sm text-muted-foreground mt-2">
      Showing {entitiesCount} of {total} items
    </div>
  );
}