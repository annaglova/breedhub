
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

// TTL for cached total counts - 14 days
const TOTAL_COUNT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export function EntitiesCounter({
  entitiesCount,
  total,
  entityType = 'entity',
  initialCount = 0
}: EntitiesCounterProps) {
  // Read cached total from localStorage with TTL check
  const getCachedTotal = (): number => {
    try {
      const cached = localStorage.getItem(`totalCount_${entityType}`);
      if (!cached) return 0;

      // Try JSON format first (new format with TTL)
      try {
        const parsed = JSON.parse(cached);
        if (typeof parsed === 'object' && parsed.value && parsed.timestamp) {
          const age = Date.now() - parsed.timestamp;
          if (age < TOTAL_COUNT_TTL_MS && parsed.value > 0) {
            return parsed.value;
          }
          // Cache expired - remove it
          localStorage.removeItem(`totalCount_${entityType}`);
          return 0;
        }
      } catch {
        // Not JSON - try legacy format (plain number string)
        const count = parseInt(cached, 10);
        if (!isNaN(count) && count > 0) {
          // Migrate to new format with current timestamp
          const cacheData = { value: count, timestamp: Date.now() };
          localStorage.setItem(`totalCount_${entityType}`, JSON.stringify(cacheData));
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
  // BUT: Don't show "all" if total === entitiesCount (likely means server hasn't sent real total yet)
  const isConfirmedTotal = total > entitiesCount || cachedTotal > 0;
  if (entitiesCount > 0 && entitiesCount >= displayTotal && isConfirmedTotal) {
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