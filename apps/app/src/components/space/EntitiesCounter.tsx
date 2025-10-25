import React, { useEffect, useState } from 'react';

interface EntitiesCounterProps {
  entitiesCount: number;
  total: number;
  entityType?: string;
  initialCount?: number;
}

/**
 * Format number with thousand separators
 * e.g., 1234567 → "1,234,567"
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export function EntitiesCounter({
  entitiesCount,
  total,
  entityType = 'entity',
  initialCount = 0
}: EntitiesCounterProps) {
  // Read cached total from localStorage (read-only, never writes)
  const getCachedTotal = () => {
    try {
      const cached = localStorage.getItem(`totalCount_${entityType}`);
      if (cached) {
        const count = parseInt(cached, 10);
        if (!isNaN(count) && count > 0) {
          return count;
        }
      }
    } catch (e) {
      console.warn('Failed to load totalCount from cache:', e);
    }
    return 0;
  };

  const cachedTotal = getCachedTotal();

  // Determine what total to show:
  // 1. If we have cache → use cache (static, never changes)
  // 2. If no cache → use total from server ONLY if it's > entitiesCount (real total, not partial)
  const isRealTotal = total > entitiesCount;
  const displayTotal = cachedTotal > 0 ? cachedTotal : (isRealTotal ? total : 0);

  // Use initialCount as fallback for entitiesCount when it's 0
  const displayEntitiesCount = entitiesCount > 0 ? entitiesCount : initialCount;

  // Waiting for total (no cache, no server total yet)
  if (displayTotal === 0) {
    return (
      <div className="text-sm text-muted-foreground mt-2">
        Showing {formatNumber(displayEntitiesCount)} of <span className="inline-block animate-pulse">...</span>
      </div>
    );
  }

  // If we have all items loaded
  if (entitiesCount > 0 && entitiesCount >= displayTotal) {
    return (
      <div className="text-sm text-muted-foreground mt-2">
        Showing all {formatNumber(displayTotal)} items
      </div>
    );
  }

  // Default: show current count vs total
  return (
    <div className="text-sm text-muted-foreground mt-2">
      Showing {formatNumber(displayEntitiesCount)} of {formatNumber(displayTotal)} items
    </div>
  );
}