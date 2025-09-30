import React from 'react';

interface EntitiesCounterProps {
  entitiesCount: number;
  isLoading: boolean;
  total: number;
  rowsPerPage?: number; // NEW: how many rows are displayed per page
}

/**
 * Format number with thousand separators
 * e.g., 1234567 → "1,234,567"
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export function EntitiesCounter({ entitiesCount, isLoading, total, rowsPerPage }: EntitiesCounterProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground mt-2">
        <span className="inline-block animate-pulse">Loading count...</span>
      </div>
    );
  }

  // Waiting for server total (if total equals local cache count, likely not synced yet)
  // We show spinner if rowsPerPage is defined but total seems wrong
  if (total === 0) {
    return (
      <div className="text-sm text-muted-foreground mt-2">
        <span className="inline-block animate-pulse">Loading count...</span>
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

  // Default: showing X of Y
  // X = rows from view config (what SpaceStore tells us to show)
  // Y = total from server (will be implemented in Phase 3)
  // If rowsPerPage not provided, something is wrong - show 0
  const visibleCount = rowsPerPage ?? 0;

  return (
    <div className="text-sm text-muted-foreground mt-2">
      Showing {formatNumber(visibleCount)} of {formatNumber(total)} items
    </div>
  );
}