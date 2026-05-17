interface EntitiesCounterProps {
  entitiesCount: number;
  total: number;
  entityType?: string;
  initialCount?: number;
  totalFilterKey?: string;
  totalFilterValue?: string | null;
  /**
   * False once data has been fetched at least once. When data resolves with
   * 0 results, this lets the counter render an authoritative "Showing 0"
   * instead of being overridden by a stale localStorage `cachedTotal` from
   * a prior unfiltered load (counter would otherwise show "1 of 1" etc.).
   */
  isInitialLoad?: boolean;
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
  initialCount = 0,
  totalFilterKey,
  totalFilterValue,
  isInitialLoad = false,
}: EntitiesCounterProps) {
  // If totalFilterKey is required but not selected, show "..." (waiting for filter)
  if (totalFilterKey && !totalFilterValue) {
    const displayEntitiesCount = entitiesCount > 0 ? entitiesCount : initialCount;
    return (
      <div className="text-sm text-muted-foreground mt-1">
        Showing {formatNumber(displayEntitiesCount)} of <span className="inline-block animate-pulse">...</span>
      </div>
    );
  }

  // Build cache key - include filter value if totalFilterKey is set
  const cacheKey = totalFilterKey && totalFilterValue
    ? `totalCount_${entityType}_${totalFilterKey}_${totalFilterValue}`
    : `totalCount_${entityType}`;

  // Read cached total from localStorage with TTL check
  const getCachedTotal = (): number => {
    try {
      const cached = localStorage.getItem(cacheKey);
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
          localStorage.removeItem(cacheKey);
          return 0;
        }
      } catch {
        // Not JSON - try legacy format (plain number string)
        const count = parseInt(cached, 10);
        if (!isNaN(count) && count > 0) {
          // Migrate to new format with current timestamp
          const cacheData = { value: count, timestamp: Date.now() };
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          return count;
        }
      }
    } catch (e) {
      console.warn('Failed to load totalCount from cache:', e);
    }
    return 0;
  };

  const cachedTotal = getCachedTotal();

  // Pick whichever number is authoritative for the FULL set, not the
  // current page slice. applyFilters returns total = page size, so for
  // paginated public spaces that's smaller than the cached server total.
  // For non-paginated (private) spaces, total === entitiesCount and cache
  // is the snapshot of the server count after Stage 4 refresh.
  // Math.max trades both ways for free: page slice loses to cached server,
  // and a stale cache loses to a freshly-resolved larger total.
  const displayTotal = Math.max(cachedTotal, total);

  // Use initialCount as a placeholder for entitiesCount only when the real
  // total is known to be > 0. Cap by displayTotal so the placeholder can't
  // exceed the actual set size — otherwise a small set (e.g. user has 1
  // note) flashes through the view's recordsCount (36) before settling.
  const displayEntitiesCount =
    entitiesCount > 0
      ? entitiesCount
      : displayTotal > 0
        ? Math.min(initialCount, displayTotal)
        : 0;

  // Confirmed empty result — client list resolved to 0 entities after data
  // fetch. The local count beats both `total` (which for spaces without
  // `totalFilterKey` is the unfiltered server total, not the filtered
  // count) and `cachedTotal` (stale snapshot of the same unfiltered total).
  // Without this, switching to a zero-results filter would render
  // "Showing 1 of 1" because the server "vanity" total still says 1.
  if (!isInitialLoad && entitiesCount === 0) {
    return (
      <div className="text-sm text-muted-foreground mt-1">
        Showing 0
      </div>
    );
  }

  // Waiting for total. Suppress the leading number entirely when we have
  // no real data yet — flashing "Showing 30" before total resolves is a
  // lie when the actual count turns out to be 0 or much smaller.
  if (displayTotal === 0) {
    return (
      <div className="text-sm text-muted-foreground mt-1">
        Showing <span className="inline-block animate-pulse">...</span>
      </div>
    );
  }

  // Single, stable shape: "Showing X of Y". Avoids the "X of Y" → "all Y"
  // transition that flashed during the skeleton-to-loaded handoff. The page
  // slice and full set are still clearly distinguishable when X < Y, and
  // when they're equal the meaning is identical to the old "all N".
  return (
    <div className="text-sm text-muted-foreground mt-1">
      Showing {formatNumber(displayEntitiesCount)} of {formatNumber(displayTotal)}
    </div>
  );
}
