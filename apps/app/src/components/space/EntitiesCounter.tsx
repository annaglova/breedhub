import React from 'react';

interface EntitiesCounterProps {
  entitiesCount: number;
  isLoading: boolean;
  total: number;
}

/**
 * Format number with thousand separators
 * e.g., 1234567 → "1,234,567"
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export function EntitiesCounter({ entitiesCount, isLoading, total }: EntitiesCounterProps) {
  // Waiting for totalFromServer (show spinner only on number)
  if (total === 0) {
    return (
      <div className="text-sm text-muted-foreground mt-2">
        Showing {formatNumber(entitiesCount)} of <span className="inline-block animate-pulse">...</span>
      </div>
    );
  }

  // If we have all items loaded
  if (entitiesCount === total) {
    return (
      <div className="text-sm text-muted-foreground mt-2">
        Showing all {formatNumber(total)} items
      </div>
    );
  }

  // Default: showing X of Y (with real server total)
  return (
    <div className="text-sm text-muted-foreground mt-2">
      Showing {formatNumber(entitiesCount)} of {formatNumber(total)} items
    </div>
  );
}