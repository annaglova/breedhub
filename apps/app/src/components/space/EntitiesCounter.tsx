import React, { useEffect, useState } from 'react';

interface EntitiesCounterProps {
  entitiesCount: number;
  isLoading: boolean;
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
  isLoading,
  total,
  entityType = 'entity',
  initialCount = 0
}: EntitiesCounterProps) {
  // Get cached count from localStorage on mount
  const getCachedCount = () => {
    try {
      const cached = localStorage.getItem(`entitiesCount_${entityType}`);
      if (cached) {
        const count = parseInt(cached, 10);
        if (!isNaN(count) && count > 0) {
          return count;
        }
      }
    } catch (e) {
      console.warn('Failed to load entitiesCount from cache:', e);
    }
    // If no cache, use initialCount from config
    return initialCount;
  };

  const [displayCount, setDisplayCount] = useState(getCachedCount);

  useEffect(() => {
    // Update displayCount when entitiesCount changes and is > 0
    if (entitiesCount > 0) {
      setDisplayCount(entitiesCount);
      // Cache to localStorage
      try {
        localStorage.setItem(`entitiesCount_${entityType}`, entitiesCount.toString());
      } catch (e) {
        console.warn('Failed to cache entitiesCount:', e);
      }
    }
  }, [entitiesCount, entityType]);

  // Waiting for totalFromServer (show spinner only on number)
  if (total === 0) {
    return (
      <div className="text-sm text-muted-foreground mt-2">
        Showing {formatNumber(displayCount)} of <span className="inline-block animate-pulse">...</span>
      </div>
    );
  }

  // If we have all items loaded
  if (displayCount === total) {
    return (
      <div className="text-sm text-muted-foreground mt-2">
        Showing all {formatNumber(total)} items
      </div>
    );
  }

  // Default: showing X of Y (with real server total)
  return (
    <div className="text-sm text-muted-foreground mt-2">
      Showing {formatNumber(displayCount)} of {formatNumber(total)} items
    </div>
  );
}